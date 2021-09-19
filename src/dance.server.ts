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
export const processClientAuthentication = async (
  ctx: Context,
  clients: OAuth2ClientOptions[],
): Promise<OAuth2ClientOptions | null> => {
  const httpAuthentication = ctx.request.headers.get("Authorization");
  const scheme = httpAuthentication ? httpAuthentication.split(" ")[0] : null;
  const creds = httpAuthentication ? atob(httpAuthentication.split(" ")[1]).split(":") : null;
  if (httpAuthentication && scheme && creds) {
    const client = clients.find((c) => c.clientId === creds[0]);
    const credsOk = client && client.clientSecret === creds[1] || false;
    if (client && credsOk) {
      return client;
    } else {
      processClientAuthenticationError(ctx, scheme);
    }
  } else {
    // Not recommended, see: https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1
    const body = ctx.request.body();
    if (body.type === "form") {
      const params: URLSearchParams = await body.value;
      const client = clients.find((c) => c.clientId === params.get("client_id"));
      const credsOk = client && client.clientSecret === params.get("client_secret") || false;
      if (client && credsOk) {
        return client;
      } else {
        processClientAuthenticationError(ctx, null);
      }
    }
  }
  return null;
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
    if (grantType !== "authorization_code" || !authorizationCode || !redirect || !clientId || !codeVerifier) {
      processAccessTokenRequestError(ctx, grantType);
    } else {
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
  return null;
};

const processAccessTokenRequestError = (ctx: Context, grantType: string | null) => {
  const error = grantType === "authorization_code" ? "invalid_request" : "unsupported_grant_type";
  const errorOptions: AccessTokenErrorResponseOptions = {
    error: error,
    error_uri: "https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3",
  };
  ctx.response.status = 400;
  ctx.response.headers.append("Content-Type", "application/json");
  ctx.response.body = errorOptions;
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
