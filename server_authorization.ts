import {
  AccessTokenErrorResponseOptions,
  AccessTokenResponseOptions,
  AuthorizationErrorResponseOptions,
  AuthorizationRequestOptions,
  AuthorizationResponseOptions,
  OAuth2ClientOptions,
} from "./src/oauth2.types.ts";
import { URLAuthorizeResponse } from "./src/oauth2.ts";
import { parseValidScopes, processAccessTokenRequest, processClientAuthentication } from "./src/dance.server.ts";
import { Application, Context, createHash, cryptoRandomString, dotEnvConfig, Router } from "./deps.ts";

// @todo: /revoke
// @todo: /introspect
// @todo: /refreshtoken

const router = new Router();
const env = dotEnvConfig();
console.log(dotEnvConfig({}));

const codeCache: Map<string, AuthorizationRequestOptions> = new Map();
const requestCache: { ident: string; req: AuthorizationRequestOptions }[] = [];

const clients: OAuth2ClientOptions[] = [{
  clientId: env.DENO_CLIENT_ID,
  clientSecret: env.DENO_CLIENT_SECRET,
  clientRedirectURIs: ["http://localhost:3000/callback", "btest"],
  scope: "foo bar",
  state: "N/A",
  codeVerifier: "N/A",
  codeChallenge: "N/A",
}];

const informResourceOwner = (ctx: Context, error: AuthorizationErrorResponseOptions) => {
  ctx.response.status = 400;
  ctx.response.headers.append("Content-Type", "application/json");
  ctx.response.body = error;
};

const informClient = (ctx: Context, error: AccessTokenErrorResponseOptions) => {
  ctx.response.status = 400;
  ctx.response.headers.append("Content-Type", "application/json");
  ctx.response.body = error;
};

router.get("/authorize", (ctx) => {
  console.log(`-> GET /authorize`);
  let error: AuthorizationErrorResponseOptions | undefined;
  const reqClientId = ctx.request.url.searchParams.get("client_id");
  const client = clients.find((c) => c["clientId"] === reqClientId);
  if (!reqClientId || !client) {
    informResourceOwner(ctx, { error: "invalid_client" });
    return;
  }
  const reqCallbackUrl = ctx.request.url.searchParams.get("redirect_uri") || "N/A";
  const isCallbackOk = client?.clientRedirectURIs.includes(reqCallbackUrl);
  if (!reqCallbackUrl || !isCallbackOk) {
    error = { error: "invalid_request", error_description: "Invalid callback" };
    informResourceOwner(ctx, error);
    return;
  }

  const reqState = ctx.request.url.searchParams.get("state");
  if (!reqState) {
    error = { error: "invalid_request", error_description: "Missing state parameter" };
    informResourceOwner(ctx, error);
    return;
  }

  const reqChallenge = ctx.request.url.searchParams.get("code_challenge");
  const reqChallengeMethod = ctx.request.url.searchParams.get("code_challenge_method");
  if (!reqChallenge || !reqChallengeMethod) {
    error = { error: "invalid_request", error_description: "Missing PKCE parameters" };
    informResourceOwner(ctx, error);
    return;
  }

  const validScopes = parseValidScopes(ctx, client);
  const authorizeRequest: AuthorizationRequestOptions = {
    clientId: reqClientId,
    state: reqState,
    scope: validScopes,
    codeChallenge: reqChallenge,
    responseType: "code",
    redirectURI: reqCallbackUrl,
    codeChallengeMethod: "S256",
  };

  // Store request until approval decision or TTL
  const requestIdentifier: string = cryptoRandomString({ length: 12, type: "alphanumeric" });
  requestCache.push({ ident: requestIdentifier, req: authorizeRequest });

  //const html = await serveFile(req, "index.html"); @TODO

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

router.post("/approve", async (ctx) => {
  console.log(`-> GET /token`);
  if (!ctx.request.hasBody || ctx.request.body().type !== "form") {
    return;
  } else {
    const body = ctx.request.body();
    const params: URLSearchParams = await body.value;

    const query = requestCache.find((n) => n.ident === params.get("reqid")); // @TODO use this (!)

    if (query) {
      const code: string = cryptoRandomString({ length: 12, type: "url-safe" });
      const state = query.req.state;
      const responseOptions: AuthorizationResponseOptions = { code: code, state: state };
      const UrlAuthorize = URLAuthorizeResponse(query.req.redirectURI, responseOptions);

      codeCache.set(code, query.req);

      console.log(`-> GET REDIRECT to client ${UrlAuthorize}`);
      ctx.response.redirect(UrlAuthorize);
    }
  }
});

router.post("/token", async (ctx) => {
  const clientAuthenticated = await processClientAuthentication(ctx, clients);
  if (!clientAuthenticated || !ctx.request.hasBody) return;

  const requestOptions = await processAccessTokenRequest(ctx);

  // @todo: Check for double error checking in processAccessTokenRequest
  const grantType = requestOptions?.grantType;
  if (grantType !== "authorization_code") {
    informClient(ctx, { error: "unsupported_grant_type" });
    return;
  }
  const clientCode = requestOptions?.code;
  const clientCodeRequest = clientCode ? codeCache.get(clientCode) : null;
  if (!clientCode || !clientCodeRequest) {
    informClient(ctx, { error: "invalid_grant" });
    return;
  }

  const sha256Hash = createHash("sha256");
  // Check redirectURI, ownership of code, and verify PKCE code_challenge
  if (
    requestOptions && requestOptions.codeVerifier &&
    codeCache.get(requestOptions.code) &&
    (codeCache.get(requestOptions.code)?.clientId === clientAuthenticated.clientId) &&
    clientAuthenticated.clientRedirectURIs.includes(requestOptions.redirectURI) &&
    sha256Hash.update(requestOptions.codeVerifier).toString("base64") === clientCodeRequest.codeChallenge
  ) {
    requestOptions ? codeCache.delete(requestOptions.code) : {}; // 🔥 burn code

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
