// deno-lint-ignore-file
import {
  AccessTokenErrorResponseOptions,
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

const codeCache: Map<string, OAuth2ClientOptions> = new Map();

//var codeCache: string[] = [];
const requestCache: { ident: string; url: string }[] = [];

const clients: OAuth2ClientOptions[] = [{
  clientId: env.DENO_CLIENT_ID,
  clientSecret: env.DENO_CLIENT_SECRET,
  clientRedirectURIs: ["http://localhost:3000/callback", "btest"],
  scope: "foo bar",
  state: "N/A",
  codeVerifier: "N/A",
  codeChallenge: "N/A",
}];

router.get("/authorize", (ctx) => {
  console.log(`-> GET /authorize`);
  const reqClientId = ctx.request.url.searchParams.get("client_id");
  const client = clients.find((c) => c["clientId"] === reqClientId);
  console.log(client);

  // Check callback against client registered info
  const reqCallbackUrl = ctx.request.url.searchParams.get("redirect_uri");
  const callbackMatch = clients.map(({ clientRedirectURIs }) =>
    clientRedirectURIs.some((uri) => uri === reqCallbackUrl)
  ); // @TODO: FEIL!!! Hent client først
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
    if (reqCallbackUrl === null || !client?.clientRedirectURIs.includes(reqCallbackUrl)) {
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

    const validScopes = parseValidScopes(ctx, client); //@todo
    const code: string = cryptoRandomString({ length: 12, type: "url-safe" });

    const state = ctx.request.url.searchParams.get("state") || undefined;
    const responseOptions: AuthorizationResponseOptions = { code: code, state: state };
    const UrlAuthorize = URLAuthorizeResponse(reqCallbackUrl, responseOptions);
    client.state = state;
    client.codeChallenge = ctx.request.url.searchParams.get("code_challenge") || "N/A";
    codeCache.set(code, client);

    console.log(`-> REDIRECT to client GET ${UrlAuthorize}`);
    ctx.response.redirect(UrlAuthorize);
  }
});

router.post("/token", async (ctx) => {
  const clientAuthenticated = await processClientAuthentication(ctx, clients);
  if (!clientAuthenticated || !ctx.request.hasBody) return;

  const requestOptions = await processAccessTokenRequest(ctx);
  const sha256Hash = createHash("sha256");
  // Check redirectURI, ownership of code, and verify PKCE code_challenge
  if (
    requestOptions &&
    codeCache.get(requestOptions.code) &&
    (codeCache.get(requestOptions.code)?.clientId === clientAuthenticated.clientId) &&
    clientAuthenticated.clientRedirectURIs.includes(requestOptions.redirectURI) &&
    sha256Hash.update(requestOptions.codeVerifier).toString("base64") === clientAuthenticated.codeChallenge
  ) {
    requestOptions ? codeCache.delete(requestOptions.code) : {}; // burn code

    // Issue token
    const accessToken: AccessTokenResponseOptions = {
      access_token: cryptoRandomString({ length: 24, type: "alphanumeric" }),
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: cryptoRandomString({ length: 24, type: "alphanumeric" }),
    };

    ctx.response.status = 200;
    ctx.response.headers.append("Content-Type", "application/json");
    ctx.response.body = accessToken;
  } else {
    ctx.response.status = 400;
    ctx.response.headers.append("Content-Type", "application/json");
    ctx.response.body = { error: "invalid_request" };
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
