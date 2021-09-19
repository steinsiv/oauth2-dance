import { Context } from "../deps.ts";
import { URLAuthorizationErrorResponse } from "./oauth2.ts";
import {
  AccessTokenErrorResponseOptions,
  AccessTokenRequestOptions,
  AuthorizationErrorResponseOptions,
  OAuth2ClientOptions,
} from "./oauth2.types.ts";

// https://datatracker.ietf.org/doc/html/rfc6749#section-2.3
// https://datatracker.ietf.org/doc/html/rfc6749#section-3.2.1
export const processClientAuthentication = (ctx: Context, clients: OAuth2ClientOptions[]): boolean => {
  let authenticated = false;
  const httpAuthentication = ctx.request.headers.get("Authorization");
  const scheme = httpAuthentication ? atob(httpAuthentication).split(" ")[0] : null;
  const creds = httpAuthentication ? atob(httpAuthentication).split(" ")[1] : null;
  if (httpAuthentication && creds !== null) {
    const client = clients.find((c) => c.clientId === creds[0]);
    authenticated = client && client.clientSecret !== creds[1] || false;
    if (!authenticated) {
      processClientAuthenticationError(ctx, scheme);
    }
  } else {
    // Check body for creds
  }
  return authenticated;
};

export const processAccessTokenRequest = async (ctx: Context): Promise<AccessTokenRequestOptions | null> => {
  const body = ctx.request.body();
  if (body.type === "form") {
    const params: URLSearchParams = await body.value;
    const grantType = params.get("grant_type");
    const authorizationCode = params.get("code");
    const redirect = params.get("redirect_uri");
    const clientId = params.get("client_id");
    const codeVerifier = params.get("code_verifier");
    if (grantType === "authorization_code" && authorizationCode && redirect && clientId && codeVerifier) {
      const accessTokenRequest: AccessTokenRequestOptions = {
        grant_type: grantType,
        code: authorizationCode,
        redirect_uri: redirect,
        client_id: clientId,
        code_verifier: codeVerifier,
      };
      return accessTokenRequest;
    }
  }
  // @todo process AccessTokenRequestError
  return null;
};

const processClientAuthenticationError = (ctx: Context, scheme: string | null) => {
  const errorOptions: AccessTokenErrorResponseOptions = {
    error: "invalid_client",
    error_description: "client authentication failed",
    error_uri: "https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3",
  };
  ctx.response.status = 401;
  ctx.response.headers.append("Content-Type", "application/json");
  if (scheme) {
    ctx.response.headers.append("WWW-Authenticate", scheme || "");
  }
  ctx.response.body = errorOptions;
};

// @todo: remove dependency to OAK
// https://datatracker.ietf.org/doc/html/rfc6749#section-3.3
export const parseValidScopes = (ctx: Context, client: OAuth2ClientOptions): string[] => {
  const requestScopes = ctx.request.url.searchParams.get("scope")?.split(" ");

  const clientScopes = client?.scope.split(" ");
  const validScopes = requestScopes?.filter((scope) => clientScopes?.includes(scope));

  if (validScopes?.length === 0 && client) {
    const res: AuthorizationErrorResponseOptions = {
      error: "invalid_scope",
      error_description: undefined,
      error_uri: "https://datatracker.ietf.org/doc/html/rfc6749#section-3.3",
    };
    const redirectError = URLAuthorizationErrorResponse(client.redirectURIs[0], res);
    ctx.response.redirect(redirectError);
    console.error(`${res}`);
  }
  return validScopes || [];
};
