// deno-lint-ignore-file
import {
  AccessTokenRequestOptions,
  AuthorizationRequestOptions,
  AuthorizationServerOptions,
  OAuth2ClientOptions,
} from "./src/oauth2.types.ts";
import { Application, createHash, cryptoRandomString, dotEnvConfig, Router } from "./deps.ts";
import { requestToken, URLAuthorizeRequest } from "./src/dance.ts";
import { processAuthorizationResponse } from "./src/oauth2.ts";

const env = dotEnvConfig();
//console.log(dotEnvConfig({}));

const authorizationServer: AuthorizationServerOptions = {
  authorizationEndpoint: env.DENO_AUTHORIZE_URL,
  tokenEndpoint: env.DENO_TOKEN_URL,
};

const client: OAuth2ClientOptions = {
  clientId: env.DENO_CLIENT_ID,
  clientSecret: env.DENO_CLIENT_SECRET,
  redirectURIs: [env.DENO_CLIENT_REDIRECT_URL],
  scope: "foo",
  state: cryptoRandomString({ length: 8, type: "url-safe" }),
  code_verifier: cryptoRandomString({ length: 32, type: "ascii-printable" }),
};

const hash = createHash("sha256");
client.code_verifier ? hash.update(client.code_verifier) : {}; // @TODO: Make PKCE mandatory

const authorizeOptions: AuthorizationRequestOptions = {
  response_type: "code",
  client_id: client.clientId,
  redirect_uri: client.redirectURIs[0],
  state: client.state,
  scope: client.scope,
  code_challenge: hash.toString("base64"),
  code_challenge_method: "S256",
};

const router = new Router();

router.get("/authme", (context) => {
  const UrlAuthorize = URLAuthorizeRequest(authorizationServer.authorizationEndpoint, authorizeOptions);
  console.log(`-> GET /authme ${UrlAuthorize}`);
  context.response.redirect(UrlAuthorize);
});

router.get("/callback", async (ctx) => {
  const response = processAuthorizationResponse(ctx.request.url, client.state);
  console.log(`-> GET /callback, code : ${response?.code}, state: ${response?.state}`);

  if (response) {
    const accessTokenOptions: AccessTokenRequestOptions = {
      grant_type: "authorization_code",
      code: response.code,
      redirect_uri: client.redirectURIs[0],
      client_id: client.clientId,
      client_secret: client.clientSecret,
      code_verifier: client.code_verifier,
    };
    const tokenResponse = await requestToken(authorizationServer.tokenEndpoint, accessTokenOptions);
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
