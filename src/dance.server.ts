import { Context, createHash } from "../deps.ts";
import { URLAuthorizationErrorResponse } from "./oauth2.ts";
import {
  AccessTokenErrorResponseOptions,
  AccessTokenRequestOptions,
  AuthorizationErrorResponseOptions,
  AuthorizationRequestOptions,
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

export const processAccessTokenRequest = async (
  ctx: Context,
  clientAuthenticated: OAuth2ClientOptions,
  codeCache: Map<string, AuthorizationRequestOptions>,
): Promise<AccessTokenRequestOptions | null> => {
  const body = ctx.request.body();
  if (body.type === "form") {
    const params: URLSearchParams = await body.value;
    const grantType = params.get("grant_type");
    const authorizationCode = params.get("code");
    const redirect = params.get("redirect_uri");
    const clientId = params.get("client_id");
    const codeVerifier = params.get("code_verifier");

    const clientCodeRequest = authorizationCode ? codeCache.get(authorizationCode) : null;
    if (!authorizationCode || !clientCodeRequest) {
      informClient(ctx, { error: "invalid_grant" });
      return null;
    }

    if (grantType !== "authorization_code" || !redirect || !clientId || !codeVerifier) {
      processAccessTokenRequestError(ctx, grantType);
    } else {
      const accessTokenRequest: AccessTokenRequestOptions = {
        grantType: grantType,
        code: authorizationCode,
        redirectURI: redirect,
        clientId: clientId,
        codeVerifier: codeVerifier,
      };

      const sha256Hash = createHash("sha256").update(accessTokenRequest.codeVerifier).toString("base64");
      if (sha256Hash !== clientCodeRequest.codeChallenge) {
        informClient(ctx, { error: "invalid_request", error_description: "wrong code_verifier" });
        return null;
      }

      if (codeCache.get(accessTokenRequest.code)?.clientId !== clientAuthenticated.clientId) {
        informClient(ctx, {
          error: "invalid_grant",
          error_description: "authorization_code not valid for this client",
        });
        return null;
      }

      if (!clientAuthenticated.clientRedirectURIs.includes(accessTokenRequest.redirectURI)) {
        informClient(ctx, { error: "invalid_request", error_description: "invalid redirect_uri" });
        return null;
      }

      return accessTokenRequest;
    }
  }
  return null;
};

const processAccessTokenRequestError = (
  ctx: Context,
  grantType: string | null,
) => {
  const error = grantType === "authorization_code" ? "invalid_request" : "unsupported_grant_type";
  const errorOptions: AccessTokenErrorResponseOptions = {
    error: error,
    error_uri: "https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3",
  };
  ctx.response.status = 400;
  ctx.response.headers.append("Content-Type", "application/json");
  ctx.response.body = errorOptions;
};

const processClientAuthenticationError = (
  ctx: Context,
  scheme: string | null,
) => {
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

// https://datatracker.ietf.org/doc/html/rfc6749#section-3.3
export const parseValidScopes = (
  ctx: Context,
  client: OAuth2ClientOptions,
): string => {
  const requestScopes = ctx.request.url.searchParams.get("scope")?.split(" ");

  const clientScopes = client?.scope.split(" ");
  const validScopes = requestScopes?.filter((scope) => clientScopes?.includes(scope));

  if (validScopes?.length === 0 && client) {
    const res: AuthorizationErrorResponseOptions = {
      error: "invalid_scope",
      error_description: undefined,
    };
    const redirectError = URLAuthorizationErrorResponse(
      client.clientRedirectURIs[0],
      res,
    );
    ctx.response.redirect(redirectError);
    console.error(`${res}`);
  }
  return validScopes?.join(" ") || "";
};

export const informResourceOwner = (
  ctx: Context,
  error: AuthorizationErrorResponseOptions,
) => {
  ctx.response.status = 400;
  ctx.response.headers.append("Content-Type", "application/json");
  ctx.response.body = error;
};

export const informClient = (ctx: Context, error: AccessTokenErrorResponseOptions) => {
  ctx.response.status = 400;
  ctx.response.headers.append("Content-Type", "application/json");
  ctx.response.body = error;
};

export const processAuthorizeRequest = (
  ctx: Context,
  clients: OAuth2ClientOptions[],
): AuthorizationRequestOptions | null => {
  let authorizeRequest: AuthorizationRequestOptions;
  let error: AuthorizationErrorResponseOptions | undefined;
  const reqClientId = ctx.request.url.searchParams.get("client_id");
  const client = clients.find((c) => c["clientId"] === reqClientId);
  const reqCallbackUrl = ctx.request.url.searchParams.get("redirect_uri") || "N/A";
  const isCallbackOk = client?.clientRedirectURIs.includes(reqCallbackUrl);
  const reqState = ctx.request.url.searchParams.get("state");
  const reqRespType = ctx.request.url.searchParams.get("response_type");
  const reqChallenge = ctx.request.url.searchParams.get("code_challenge");
  const reqChallengeMethod = ctx.request.url.searchParams.get("code_challenge_method");

  if (!reqClientId || !client) {
    informResourceOwner(ctx, { error: "unauthorized_client" });
  } else if (!reqCallbackUrl || !isCallbackOk) {
    error = { error: "invalid_request", error_description: "Invalid redirect_uri" };
    informResourceOwner(ctx, error);
  } else if (!reqState) {
    error = {
      error: "invalid_request",
      error_description: "State parameter is required by this authorization-server",
    };
    informResourceOwner(ctx, error);
  } else if (!reqRespType || reqRespType !== "code") {
    error = {
      error: "unsupported_response_type",
      error_description: 'REQUIRED.  Value MUST be set to "code"',
    };
    informResourceOwner(ctx, error);
  } else if (!reqChallenge || !reqChallengeMethod) {
    error = {
      error: "invalid_request",
      error_description: "Missing PKCE parameters",
      state: reqState,
    };
    informResourceOwner(ctx, error);
  } else {
    const validScopes = parseValidScopes(ctx, client);
    authorizeRequest = {
      clientId: reqClientId,
      state: reqState,
      scope: validScopes,
      codeChallenge: reqChallenge,
      responseType: "code",
      redirectURI: reqCallbackUrl,
      codeChallengeMethod: "S256",
    };
    return authorizeRequest;
  }
  return null;
};
