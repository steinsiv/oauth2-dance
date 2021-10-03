export type OAuth2Options = {
  grantType: "authorization_code";
  responseType: "code";
  authorizationEndpoint: string;
  tokenEndpoint: string;
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
  "authorizationEndpoint" | "tokenEndpoint"
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

export type errorType =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "unauthorized_client"
  | "unsupported_grant_type"
  | "invalid_scope";

// https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
export type ErrorResponseOptions = {
  error: errorType;
  error_description?: string;
  error_uri?: string;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
export type AuthorizationErrorResponseOptions = ErrorResponseOptions & {
  state?: string;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
export type AccessTokenErrorResponseOptions = ErrorResponseOptions;

// https://datatracker.ietf.org/doc/html/rfc6749#section-6
export type RefreshTokenRequestOptions = {
  client_authentication: string; // Basic b64:b64
  grant_type: "refresh_token";
  refresh_token: string;
  scope?: string;
};
