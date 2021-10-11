import {
  AccessTokenRequestOptions,
  AuthorizationRequestOptions,
  AuthorizationServerOptions,
  OAuth2ClientOptions,
  processAuthorizationResponse,
  requestToken,
  URLAuthorizeRequest,
} from "../mod.ts";
import { Application, createHash, cryptoRandomString, dotEnvConfig, Router } from "../deps.ts";

console.log(dotEnvConfig({ export: true }));

const authorizationServer: AuthorizationServerOptions = {
  authorizationEndpoint: Deno.env.get("DENO_AUTHORIZE_URL") || "",
  tokenEndpoint: Deno.env.get("DENO_TOKEN_URL") || "",
  introSpectEndpoint: Deno.env.get("DENO_INTROSPECT_URL") || "",
};

const client: OAuth2ClientOptions = {
  clientId: Deno.env.get("DENO_CLIENT_ID") || "",
  clientSecret: Deno.env.get("DENO_CLIENT_SECRET"),
  clientRedirectURIs: [Deno.env.get("DENO_CLIENT_REDIRECT_URL") || ""],
  scope: "foo",
  state: cryptoRandomString({ length: 8, type: "url-safe" }),
  codeVerifier: "N/A",
  codeChallenge: "N/A",
};

client.codeVerifier = cryptoRandomString({ length: 64, type: "alphanumeric" });
client.codeChallenge = createHash("sha256").update(client.codeVerifier).toString("base64");

const authorizeOptions: AuthorizationRequestOptions = {
  responseType: "code",
  clientId: client.clientId,
  redirectURI: client.clientRedirectURIs[0],
  state: client.state,
  scope: client.scope,
  codeChallenge: client.codeChallenge,
  codeChallengeMethod: "S256",
};

const router = new Router();

router.get("/authme", (context) => {
  const UrlAuthorize = URLAuthorizeRequest(
    authorizationServer.authorizationEndpoint,
    authorizeOptions,
  );
  context.response.redirect(UrlAuthorize);
});

router.get("/callback", async (ctx) => {
  const response = processAuthorizationResponse(ctx.request.url, client.state);
  if (response) {
    const accessTokenOptions: AccessTokenRequestOptions = {
      grantType: "authorization_code",
      code: response.code,
      redirectURI: client.clientRedirectURIs[0],
      clientId: client.clientId,
      clientSecret: client.clientSecret,
      codeVerifier: client.codeVerifier,
    };
    const tokenResponse = await requestToken(
      authorizationServer.tokenEndpoint,
      accessTokenOptions,
    );
    ctx.response.status = 200;
    ctx.response.type = "application/json";
    ctx.response.body = tokenResponse;
  }
});

const app = new Application();
app.use(async (ctx, next) => {
  await next();
  console.log(`${ctx.request.method} ${ctx.request.url}`);
});
const port = 3000;

app.use(router.routes());
app.use(router.allowedMethods());
app.addEventListener("error", (err) => {
  console.log(err);
});
app.listen({ port: port });
console.info(`Client listening on :${port}`);
