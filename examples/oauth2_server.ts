import {
  AccessTokenResponseOptions,
  AuthorizationRequestOptions,
  AuthorizationResponseOptions,
  OAuth2ClientOptions,
  processAccessTokenRequest,
  processAuthorizeRequest,
  processClientAuthentication,
  URLAuthorizeResponse,
} from "../mod.ts";
import { Application, Context, cryptoRandomString, dotEnvConfig, Router } from "../deps.ts";
import { TokenStorage } from "./tokenstorage.ts";

const db = new TokenStorage("tokens.db");

// @todo: /revoke
// @todo: /introspect
// @todo: /refreshtoken

const router = new Router();
console.log(dotEnvConfig({ export: true }));

const codeCache: Map<string, AuthorizationRequestOptions> = new Map();
const requestCache: Map<string, AuthorizationRequestOptions> = new Map();

const clients: OAuth2ClientOptions[] = [{
  clientId: Deno.env.get("DENO_CLIENT_ID") || "",
  clientSecret: Deno.env.get("DENO_CLIENT_SECRET"),
  clientRedirectURIs: [Deno.env.get("DENO_CLIENT_REDIRECT_URL") || ""],
  scope: "foo bar",
  state: "N/A",
  codeVerifier: "N/A",
  codeChallenge: "N/A",
}];

router.get("/authorize", (ctx: Context) => {
  const authorizeRequest = processAuthorizeRequest(ctx, clients);
  if (!authorizeRequest) return;

  // Store parsed request until consent OR TTL expires (@todo TTL expiry)
  const requestIdentifier: string = cryptoRandomString({ length: 12, type: "alphanumeric" });
  requestCache.set(requestIdentifier, authorizeRequest);

  const writeout = `
    <html>
      <body>
        <h1>Authorize this?</h1>
        <form  method="post" action="${ctx.request.url.origin}/approve">
        <input type="hidden" name="reqid" value="${requestIdentifier}">
        <p>${ctx.request.url.search}</p>
        <input type="submit" target="top" value="Sure!"></input>
        </form>
      </body>
    </html>`;

  ctx.response.body = writeout;
});

router.post("/approve", async (ctx: Context) => {
  if (!ctx.request.hasBody || ctx.request.body().type !== "form") {
    return;
  } else {
    const body = ctx.request.body();
    const params: URLSearchParams = await body.value;
    const requestId = params.get("reqid") || "N/A";

    // Pull out original request
    const authRequest = requestCache.get(requestId);
    if (authRequest) {
      const code: string = cryptoRandomString({ length: 12, type: "url-safe" });
      const state = authRequest.state;
      const responseOptions: AuthorizationResponseOptions = { code: code, state: state };
      const UrlAuthorize = URLAuthorizeResponse(authRequest.redirectURI, responseOptions);

      codeCache.set(code, authRequest); // Store decision
      requestCache.delete(requestId); // 🔥 burn cached request

      //console.log(`-> REDIRECT to client ${UrlAuthorize}`);
      ctx.response.redirect(UrlAuthorize);
    } //@todo invalid requestId
  }
});

router.post("/token", async (ctx: Context) => {
  const clientAuthenticated = await processClientAuthentication(ctx, clients);
  if (!clientAuthenticated || !ctx.request.hasBody) return;

  const requestOptions = await processAccessTokenRequest(ctx, clientAuthenticated, codeCache);
  if (!requestOptions) return;

  requestOptions ? codeCache.delete(requestOptions.code) : {}; // 🔥 burn code

  // Issue tokens
  const accessToken: AccessTokenResponseOptions = {
    access_token: cryptoRandomString({ length: 24, type: "alphanumeric" }),
    token_type: "Bearer",
    expires_in: 600,
  };

  // @todo store token(s) for resource introspection queries, RFC7662
  db.insertToken(accessToken.access_token, "+10 minute");
  db.purgeExpiredTokens();
  db.dumpTokens();
  ctx.response.status = 200;
  ctx.response.headers.append("Content-Type", "application/json");
  ctx.response.body = accessToken;
});

const app = new Application();

app.use(async (ctx: Context, next) => {
  await next();
  console.log(`${ctx.request.method} ${ctx.request.url}`);
});

const port = 9001;
app.use(router.routes());
app.use(router.allowedMethods());
app.addEventListener("error", (err) => {
  console.log(err);
});
console.info(`Authorization server listening on :${port}`);
app.listen({ port: port });
