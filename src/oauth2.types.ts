type OAuth2Options = {
  grantType: "authorization_code";
  responseType: "code";
  authorizationEndpoint: string;
  tokenEndpoint: string;
  introSpectEndpoint: string;
  redirectURI: string;
  clientId: string;
  clientSecret?: string;
  clientRedirectURIs: string[];
  scope: string;
  state?: string; // reverse CSRF
  code: string;
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
};

export type AuthorizationServerOptions = Pick<
  OAuth2Options,
  "authorizationEndpoint" | "tokenEndpoint" | "introSpectEndpoint"
>;

// state and code_verifier (pkce) mandatory because why not
export type OAuth2ClientOptions = Pick<
  OAuth2Options,
  | "clientId"
  | "clientSecret"
  | "clientRedirectURIs"
  | "scope"
  | "state"
  | "codeChallenge"
  | "codeVerifier"
>;

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1
export type AuthorizationRequestOptions = Pick<
  OAuth2Options,
  | "responseType"
  | "clientId"
  | "redirectURI"
  | "scope"
  | "state"
  | "codeChallenge"
  | "codeChallengeMethod"
>;

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2
export type AuthorizationResponseOptions = Pick<
  OAuth2Options,
  "code" | "state"
>;

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
export type AccessTokenRequestOptions = Pick<
  OAuth2Options,
  | "grantType"
  | "code"
  | "redirectURI"
  | "clientId"
  | "clientSecret"
  | "codeVerifier"
>;

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.4
// https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
export type AccessTokenResponseOptions = {
  access_token: string;
  token_type: string | "Bearer";
  expires_in?: number;
  refresh_token?: string;
};

type ErrorType =
  | "invalid_request"
  | "invalid_scope"
  | "unauthorized_client";

// https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
export type TokenErrorType =
  | ErrorType
  | "invalid_client"
  | "invalid_grant"
  | "unsupported_grant_type";

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
export type AuthorizationErrorType =
  | ErrorType
  | "access_denied"
  | "unsupported_response_type"
  | "temporarily_unavailable"
  | "server_error";

// https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
export type ErrorResponseOptions = {
  error_description?: string;
  error_uri?: string;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
export type AuthorizationErrorResponseOptions = ErrorResponseOptions & {
  error: AuthorizationErrorType;
  state?: string;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
export type AccessTokenErrorResponseOptions = ErrorResponseOptions & {
  error: TokenErrorType;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-6
export type RefreshTokenRequestOptions = {
  client_authentication: string; // Basic b64:b64
  grant_type: "refresh_token";
  refresh_token: string;
  scope?: string;
};
