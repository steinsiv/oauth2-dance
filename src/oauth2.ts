import { Context } from "../deps.ts";
import {
  AccessTokenErrorResponseOptions,
  AccessTokenRequestOptions,
  AccessTokenResponseOptions,
  AuthorizationErrorResponseOptions,
  AuthorizationRequestOptions,
  AuthorizationResponseOptions,
  OAuth2ClientOptions,
} from "./oauth2.types.ts";

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
export const processAuthorizeErrorResponse = (redirectionURI: URL) => {
  const parameters = redirectionURI.searchParams;
  const res: AuthorizationErrorResponseOptions = {
    error: parameters.get("error") as any,
    error_description: parameters.get("error_description") ?? undefined,
    error_uri: parameters.get("error_uri") ?? undefined,
  };
  console.error(`ERROR: Authorization Error Response`);
  console.error(`${res}`);
  return null;
};

export const processAuthorizationRequest = (): AuthorizationRequestOptions | null => {
  return null;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2
export const processAuthorizationResponse = (
  redirectionURI: URL,
  state: string,
): AuthorizationResponseOptions | null => {
  const parameters = redirectionURI.searchParams;
  if (parameters.get("error") !== null) return processAuthorizeErrorResponse(redirectionURI);
  if (state && !parameters.has("state") && parameters.get("state") !== state) {
    console.error(`ERROR: state needs to be included in response and match ${state}.`);
  }
  if (!parameters.has("code")) {
    console.error(`ERROR: code needs to be included in response`);
  }
  return {
    code: parameters.get("code") || "",
    state: parameters.get("state") || "",
  };
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-2.3
// https://datatracker.ietf.org/doc/html/rfc6749#section-3.2.1
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

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.4
// https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
export const processTokenResponse = async (response: Response): Promise<AccessTokenResponseOptions | null> => {
  const json = await response.json();
  const res: AccessTokenResponseOptions = {
    access_token: json.access_token,
    token_type: json.token_type,
    expires_in: json.expires_in,
    refresh_token: json.refresh_token,
  };
  console.log(`Take my token: ${JSON.stringify(res)}`);
  return res;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
export const processTokenErrorResponse = async (response: Response) => {
  const json = await response.json();
  const res: AccessTokenErrorResponseOptions = {
    error: json.error,
    error_description: json.error_description,
    error_uri: json.error_uri,
  };
  console.log(`ERROR, Token Response: ${JSON.stringify(res)}`);
  return null;
};
