// deno-lint-ignore-file
import { AccessTokenRequestOptions, AuthorizationRequestOptions } from "./src/protocol.ts";
import { processAuthorization } from "./src/utils.ts";
import { requestToken, URLAuthorizeRequest } from "./src/oauth2.ts";
import { Application, createHash, cryptoRandomString, dotEnvConfig, Router } from "./deps.ts";

const router = new Router();
const env = dotEnvConfig();

console.log(dotEnvConfig({}));

const app = new Application();
const port = 3000;
const hash = createHash("sha256");

const client = {
  authorizationURL: env.DENO_AUTHORIZE_URL,
  tokenURL: env.DENO_TOKEN_URL,
  clientId: env.DENO_CLIENT_ID,
  clientSecret: env.DENO_CLIENT_SECRET,
  redirectURL: env.DENO_CLIENT_REDIRECT_URL,
  scope: "foo",
  state: cryptoRandomString({ length: 8, type: "url-safe" }),
  code_verifier: cryptoRandomString({ length: 32, type: "ascii-printable" }),
};

hash.update(client.code_verifier);

const authzeOptions: AuthorizationRequestOptions = {
  response_type: "code",
  client_id: client.clientId,
  redirect_uri: client.redirectURL,
  state: client.state,
  scope: client.scope,
  code_challenge: hash.toString("base64"),
  code_challenge_method: "S256",
};

console.log(client);
console.log(authzeOptions);

router.get("/authme", (context) => {
  const UrlAuthorize = URLAuthorizeRequest(client.authorizationURL, authzeOptions);
  console.log(`-> GET /authme ${UrlAuthorize}`);
  context.response.redirect(UrlAuthorize);
});

router.get("/callback", async (ctx) => {
  const response = processAuthorization(ctx.request.url, client.state);
  console.log(`-> GET /callback, code : ${response?.code}, state: ${response?.state}`);

  if (response) {
    const accessTokenOptions: AccessTokenRequestOptions = {
      grant_type: "authorization_code",
      code: response.code,
      redirect_uri: client.redirectURL,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      code_verifier: client.code_verifier,
    };
    const tokenResponse = await requestToken(client.tokenURL, accessTokenOptions);
    ctx.cookies.set("check", JSON.stringify(tokenResponse));
  }
  ctx.response.redirect(`/hooray`);
});

router.get("/hooray", (context) => {
  context.response.body = "You're in! Check your cookie";
});

app.use(router.routes());
app.use(router.allowedMethods());

console.info(`CLIENT Listening on :${port}`);
app.listen({ port: port });
