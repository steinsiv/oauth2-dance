import {
  AccessTokenRequestOptions,
  AuthorizationErrorResponseOptions,
  AuthorizationRequestOptions,
  AuthorizationResponseOptions,
} from "./oauth2.types.ts";

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1
export const URLAuthorizeRequest = (url: string, options: AuthorizationRequestOptions): string => {
  const result = new URL(url);
  result.searchParams.append("response_type", options.responseType);
  result.searchParams.append("client_id", options.clientId);
  result.searchParams.append("redirect_uri", options.redirectURI);
  if (options.state) {
    result.searchParams.append("state", options.state);
  }
  result.searchParams.append("scope", options.scope);
  result.searchParams.append("code_challenge", options.codeChallenge);
  result.searchParams.append(
    "code_challenge_method",
    options.codeChallengeMethod,
  );
  return result.toString();
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2
export const URLAuthorizeResponse = (url: string, options: AuthorizationResponseOptions): string => {
  const result = new URL(url);
  result.searchParams.append("code", options.code);
  if (options.state) {
    result.searchParams.append("state", options.state);
  }
  return result.toString();
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
export const URLTokenRequest = (url: string, options: AccessTokenRequestOptions): string => {
  const result = new URL(url);
  result.searchParams.append("grant_type", options.grantType);
  result.searchParams.append("client_id", options.clientId);
  result.searchParams.append("redirect_uri", options.redirectURI);
  result.searchParams.append("code", options.code);
  result.searchParams.append("code_verifier", options.codeVerifier);
  return result.toString();
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
// if the request fails for reasons other than a missing or invalid redirection URI -> return error through URI params
export const URLAuthorizationErrorResponse = (url: string, options: AuthorizationErrorResponseOptions): string => {
  const result = new URL(url);
  result.searchParams.append("error", options.error);
  options.error_description ? result.searchParams.append("error_description", options.error_description) : {};
  options.error_uri ? result.searchParams.append("error_uri", options.error_uri) : {};
  options.state ? result.searchParams.append("state", options.state) : {};
  return result.toString();
};
