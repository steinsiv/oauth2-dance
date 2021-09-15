// deno-lint-ignore-file
import { Application, Router } from "https://deno.land/x/oak@v6.5.0/mod.ts";
import {
  AccessTokenRequestOptions,
  AuthorizationRequestOptions,
} from "./protocol.ts";
import { processAuthorization } from "./utils.ts";
import { requestToken, URLAuthorizeRequest } from "./oauth2.ts";

import { dotEnvConfig } from "./deps.ts";
import { sha256 } from "https://deno.land/x/sha256@v1.0.2/mod.ts";

const router = new Router();
const env = dotEnvConfig();
console.log(Deno.env.get("DENO_CLIENT_ID"));
console.log(dotEnvConfig({}));
console.log(Deno.env.get("DENO_CLIENT_ID"));

const app = new Application();
const port = 3000;

const client = {
  authorizationURL: env.DENO_AUTHORIZE_URL,
  tokenURL: env.DENO_TOKEN_URL,
  clientId: env.DENO_CLIENT_ID,
  clientSecret: env.DENO_CLIENT_SECRET,
  redirectURL: env.DENO_CLIENT_REDIRECT_URL,
  scope: "foo bar",
  state: "123",
  code_verifier: "012345678900123456789001234567890012",
};

const authorizeOptions: AuthorizationRequestOptions = {
  response_type: "code",
  client_id: client.clientId,
  redirect_uri: client.redirectURL,
  state: client.state,
  scope: client.scope,
  code_challenge: sha256(client.code_verifier, "utf-8", "base64").toString(),
  code_challenge_method: "S256",
};
console.log(client);
router.get("/authme", (context) => {
  const UrlAuthorize = URLAuthorizeRequest(
    client.authorizationURL,
    authorizeOptions,
  );
  console.log(`-> GET /authme ${UrlAuthorize}`);
  context.response.redirect(UrlAuthorize);
});

router.get("/callback", async (ctx) => {
  // @TODO: Returns NULL on error after processing. refactor.
  const response = processAuthorization(ctx.request.url, client.state);
  console.log(
    `-> GET /callback, code : ${response?.code}, state: ${response?.state}`,
  );

  if (response) {
    const accessTokenOptions: AccessTokenRequestOptions = {
      grant_type: "authorization_code",
      code: response.code,
      redirect_uri: client.redirectURL,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      code_verifier: client.code_verifier,
    };
    const tokenResponse = await requestToken(
      client.tokenURL,
      accessTokenOptions,
    );
    if (tokenResponse) {
      console.log("Token: ", tokenResponse);
    }
  }
  ctx.response.redirect("/");
});

app.use(router.routes());
app.use(router.allowedMethods());

console.info(`AUTHSERVER Listening on :${port}`);
app.listen({ port: port });
