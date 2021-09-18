import {
  AccessTokenErrorResponseOptions,
  AccessTokenResponseOptions,
  AuthorizationErrorResponseOptions,
  AuthorizationRequestOptions,
  AuthorizationResponseOptions,
} from "./protocol.ts";

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
