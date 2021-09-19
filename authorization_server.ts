// deno-lint-ignore-file
import {
  AccessTokenResponseOptions,
  AuthorizationErrorResponseOptions,
  AuthorizationResponseOptions,
  OAuth2ClientOptions,
} from "./src/oauth2.types.ts";
import { URLAuthorizeResponse } from "./src/oauth2.ts";
import { parseValidScopes, processAccessTokenRequest, processClientAuthentication } from "./src/dance.server.ts";
import { Application, createHash, cryptoRandomString, dotEnvConfig, Router } from "./deps.ts";

const router = new Router();
const env = dotEnvConfig();
console.log(dotEnvConfig({}));

const sha256Hash = createHash("sha256");

var codeCache: string[] = [];
const requestCache: { ident: string; url: string }[] = [];

const clients: OAuth2ClientOptions[] = [{
  clientId: env.DENO_CLIENT_ID,
  clientSecret: env.DENO_CLIENT_SECRET,
  redirectURIs: ["http://localhost:3000/callback", "btest"],
  scope: "foo bar",
  state: "N/A",
  code_verifier: "N/A",
}];

router.get("/authorize", (ctx) => {
  console.log(`-> GET /authorize`);
  const reqClientId = ctx.request.url.searchParams.get("client_id");
  const client = clients.find((c) => c["clientId"] === reqClientId);
  console.log(client);

  // Check callback against client registered info
  const reqCallbackUrl = ctx.request.url.searchParams.get("redirect_uri");
  const callbackMatch = clients.map(({ redirectURIs }) => redirectURIs.some((uri) => uri === reqCallbackUrl)); // @TODO: FEIL!!! Hent client først
  console.log(callbackMatch);

  // Store request until approval decision or TTL
  const requestIdentifier: string = cryptoRandomString({ length: 12, type: "alphanumeric" });
  requestCache.push({ ident: requestIdentifier, url: ctx.request.url.toString() });

  //const html = await serveFile(req, "index.html"); @TODO

  const writeout = `
    <html>
      <body>
        <h1>Authorize this?</h1>
        <form  method="post" action="${ctx.request.url.toString().replace("authorize", "approve")}">
        <input type="hidden" name="reqid" value="${requestIdentifier}">
        <p>${ctx.request.url.toString()}</p>
        <input type="submit" target="top" value="Sure!"></input>
        </form>
      </body>
    </html>`;

  ctx.response.body = writeout;
});

router.post("/approve", async (ctx) => {
  console.log(`-> GET /token`);
  if (!ctx.request.hasBody || ctx.request.body().type !== "form") {
    //Failfast
    return;
  } else {
    const body = ctx.request.body();
    const params: URLSearchParams = await body.value;

    const query = requestCache.find((n) => n.ident === params.get("reqid")); // @TODO use this (!)

    const requestClientId = ctx.request.url.searchParams.get("client_id");
    const client = clients.find((c) => c.clientId === requestClientId);

    const reqCallbackUrl = ctx.request.url.searchParams.get("redirect_uri"); // @TODO encapsulate this
    if (reqCallbackUrl === null || !client?.redirectURIs.includes(reqCallbackUrl)) {
      const err = !client ? "invalid_client" : "invalid_request";
      ctx.response.status = 400;
      const response: AuthorizationErrorResponseOptions = {
        error: err,
        error_description: "Invalid redirect URI or client_id",
        error_uri: "https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1",
      };
      ctx.response.body = response;
      return;
    }

    const validScopes = parseValidScopes(ctx, client);
    const code: string = cryptoRandomString({ length: 8, type: "url-safe" });
    codeCache.push(code);
    const state = ctx.request.url.searchParams.get("state") || undefined;
    const responseOptions: AuthorizationResponseOptions = { code: code, state: state };
    const UrlAuthorize = URLAuthorizeResponse(reqCallbackUrl, responseOptions);
    console.log(`-> REDIRECT to client GET ${UrlAuthorize}`);
    ctx.response.redirect(UrlAuthorize);
  }
});

router.post("/token", async (ctx) => {
  const clientAuthenticated = processClientAuthentication(ctx, clients);
  if (!clientAuthenticated || !ctx.request.hasBody) return;

  const accessTokenOptions = await processAccessTokenRequest(ctx);
  if (accessTokenOptions) {
    // Burn code
    //@todo: Check CODE match
    //@todo: Check client redirect_uri match

    // @todo: Check code_verifier against code_challenge match
    // https://datatracker.ietf.org/doc/html/rfc7636#section-4.6
    // CREATE new token
    const accessToken: AccessTokenResponseOptions = {
      access_token: cryptoRandomString({ length: 24, type: "alphanumeric" }),
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: cryptoRandomString({ length: 24, type: "alphanumeric" }),
    };

    ctx.response.status = 200;
    ctx.response.headers.append("Content-Type", "application/json");
    ctx.response.body = accessToken;
  }
});

const app = new Application();
app.use(async (ctx, next) => {
  await next();
  console.log(`${ctx.request.method} ${ctx.request.url}`);
});

const port = 9001;
app.use(router.routes());
app.use(router.allowedMethods());

console.info(`AUTHORIZATION SERVER Listening on :${port}`);
app.listen({ port: port });
