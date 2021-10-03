import {
  AccessTokenRequestOptions,
  AuthorizationRequestOptions,
  AuthorizationServerOptions,
  OAuth2ClientOptions,
  processAuthorizationResponse,
  requestToken,
  URLAuthorizeRequest,
} from "./mod.ts";
import { Application, createHash, cryptoRandomString, dotEnvConfig, Router } from "./deps.ts";

const env = dotEnvConfig();
console.log(dotEnvConfig({}));

const authorizationServer: AuthorizationServerOptions = {
  authorizationEndpoint: env.DENO_AUTHORIZE_URL,
  tokenEndpoint: env.DENO_TOKEN_URL,
};

const client: OAuth2ClientOptions = {
  clientId: env.DENO_CLIENT_ID,
  clientSecret: env.DENO_CLIENT_SECRET,
  clientRedirectURIs: [env.DENO_CLIENT_REDIRECT_URL],
  scope: "foo",
  state: cryptoRandomString({ length: 8, type: "url-safe" }),
  codeVerifier: "N/A",
  codeChallenge: "N/A",
};

client.codeVerifier = cryptoRandomString({ length: 64, type: "alphanumeric" });
//client.codeVerifier = "AuthorizationServerOptionsAuthorizationServerOptionsAuthorizationServerOptions";
client.codeChallenge = createHash("sha256").update(client.codeVerifier)
  .toString("base64");

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
  console.log(`-> GET /authme ${UrlAuthorize}`);
  context.response.redirect(UrlAuthorize);
});

router.get("/callback", async (ctx) => {
  const response = processAuthorizationResponse(ctx.request.url, client.state);
  console.log(
    `-> GET /callback, code : ${response?.code}, state: ${response?.state}`,
  );

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
    ctx.cookies.set("check", JSON.stringify(tokenResponse));
  }
  ctx.response.redirect(`/hooray`);
});

router.get("/hooray", (context) => {
  context.response.body = "You're in! Check your cookie";
});

const app = new Application();
const port = 3000;

app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: port });

console.info(`CLIENT Listening on :${port}`);
