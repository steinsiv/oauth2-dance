// deno-lint-ignore-file
import {
  AccessTokenErrorResponseOptions,
  AccessTokenRequestOptions,
  AuthorizationRequestOptions,
  AuthorizationResponseOptions,
} from "./src/protocol.ts";
import { processAuthorizationResponse } from "./src/dance.ts";
import { requestToken, URLAuthorizeRequest, URLAuthorizeResponse } from "./src/oauth2.ts";
import { Application, createHash, cryptoRandomString, dotEnvConfig, Router } from "./deps.ts";

const router = new Router();
const env = dotEnvConfig();
console.log(dotEnvConfig({}));

const app = new Application();
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});
const port = 9001;
const sha256Hash = createHash("sha256");

var codeCache: string[] = [];
const requestCache: { ident: string; url: string }[] = [];

var authServer = {
  authorizationEndpoint: "http://localhost:9001/authorize",
  tokenEndpoint: "http://localhost:9001/token",
};

const clients = [{
  clientId: env.DENO_CLIENT_ID,
  clientSecret: env.DENO_CLIENT_SECRET,
  redirectURIs: ["http://localhost:3000/callback", "btest"],
  scope: "foo bar",
}];

router.get("/authorize", (ctx) => {
  console.log(`-> GET /authorize`);
  const reqClientId = ctx.request.url.searchParams.get("client_id");
  const client = clients.find((c) => c["clientId"] === reqClientId);
  console.log(client);

  // Check callback against client registered info
  const reqCallbackUrl = ctx.request.url.searchParams.get("redirect_uri");
  const callbackMatch = clients.map(({ redirectURIs }) => redirectURIs.some((uri) => uri === reqCallbackUrl)); // @TODO FEIL!!! Hent client først
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

  if (ctx.request.hasBody) {
    const body = ctx.request.body();
    if (body.type === "form") {
      const params: URLSearchParams = await body.value;
      const query = requestCache.find((n) => n.ident === params.get("reqid")); // @TODO use this(!)

      // Check SCOPE https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
      const requestClientId = ctx.request.url.searchParams.get("client_id");
      const requestScopes = ctx.request.url.searchParams.get("scope")?.split(" ");
      const client = clients.find((c) => c.clientId === requestClientId);
      const clientScopes = client?.scope.split(" ");
      const validScopes = requestScopes?.filter((scope) => clientScopes?.includes(scope));

      if (validScopes?.length === 0) {
        ctx.response.body = "Err"; //@TODO
        throw Error("`ERR -> No valid scope`"); //@TODO
      }

      const code: string = cryptoRandomString({ length: 8, type: "url-safe" });
      const state = ctx.request.url.searchParams.get("state");
      const reqCallbackUrl = ctx.request.url.searchParams.get("redirect_uri");

      const responseOptions: AuthorizationResponseOptions = {
        code: code,
        state: state ?? undefined,
      };

      if (reqCallbackUrl) {
        const UrlAuthorize = URLAuthorizeResponse(reqCallbackUrl, responseOptions);
        console.log(`-> REDIRECT to client GET ${UrlAuthorize}`);
        ctx.response.redirect(UrlAuthorize);
      } else throw Error("`ERR -> No callback url`"); //@TODO
    }
  }
});

// POST /token HTTP/1.1
// Host: server.example.com
// Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
// Content-Type: application/x-www-form-urlencoded

// grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA
// &redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb

router.post("/token", async (ctx) => {
  console.log(`-> GET /token`);

  // Check Auth
  const httpAuthentication = ctx.request.headers.get("Authorization");
  const scheme = httpAuthentication ? atob(httpAuthentication).split(" ")[0] : null;
  const creds = httpAuthentication ? atob(httpAuthentication).split(" ")[1] : null;
  let authenticated = false;
  if (httpAuthentication && creds !== null) {
    const client = clients.find((c) => c.clientId === creds[0]);
    authenticated = client && client.clientSecret !== creds[1] || false;
    if (!authenticated) {
      const errorOptions: AccessTokenErrorResponseOptions = {
        error: "invalid_client",
        error_description: "client authentication failed",
        error_uri: "https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3",
      };
      ctx.response.status = 401;
      ctx.response.headers.append("Content-Type", "application/json");
      ctx.response.headers.append("WWW-Authenticate", scheme || "");
      ctx.response.body = errorOptions;
    }
  }

  if (ctx.request.hasBody) {
    const body = ctx.request.body();

    // IF not authenticated, check creds in body

    if (body.type === "form") {
      const params: URLSearchParams = await body.value;
      const grantType = requestCache.find((n) => n.ident === params.get("grant_type"));
      const code = requestCache.find((n) => n.ident === params.get("code"));
      const redirectUri = requestCache.find((n) => n.ident === params.get("redirect_uri"));
    }
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.info(`CLIENT Listening on :${port}`);
app.listen({ port: port });
