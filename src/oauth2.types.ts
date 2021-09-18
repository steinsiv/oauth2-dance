// @todo: should be oauth2.types.ts ?

export type AuthorizationServerOptions = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
};

// state and code_verifier (pkce) mandatory because why not
export type OAuth2ClientOptions = {
  clientId: string;
  clientSecret: string;
  redirectURIs: string[];
  scope: string;
  state: string;
  code_verifier: string;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1
export type AuthorizationRequestOptions = {
  response_type: "code";
  client_id: string;
  redirect_uri: string;
  state?: string;
  scope: string;
  code_challenge: string;
  code_challenge_method: string;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2
export type AuthorizationResponseOptions = {
  code: string;
  state?: string;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
export type AccessTokenRequestOptions = {
  grant_type: "authorization_code";
  code: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
  code_verifier: string; //PKCE rfc7636
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.4
// https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
export type AccessTokenResponseOptions = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
export type ErrorResponseOptions = {
  error:
    | "invalid_request"
    | "invalid_client"
    | "invalid_grant"
    | "unauthorized_client"
    | "unsupported_grant_type"
    | "invalid_scope";
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
