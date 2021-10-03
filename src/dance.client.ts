import {
  AccessTokenErrorResponseOptions,
  AccessTokenRequestOptions,
  AccessTokenResponseOptions,
  AuthorizationErrorResponseOptions,
  AuthorizationErrorType,
  AuthorizationRequestOptions,
  AuthorizationResponseOptions,
} from "./oauth2.types.ts";

export const processAuthorizationRequest = ():
  | AuthorizationRequestOptions
  | null => {
  return null;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1
// Confusing use by client backend. @todo
const processAuthorizeErrorResponse = (redirectionURI: URL) => {
  const parameters = redirectionURI.searchParams;
  const res: AuthorizationErrorResponseOptions = {
    error: parameters.get("error") as AuthorizationErrorType | "invalid_request",
    error_description: parameters.get("error_description") ?? undefined,
    error_uri: parameters.get("error_uri") ?? undefined,
  };
  console.error(`ERROR: Authorization Error Response`);
  console.error(`${res}`);
  // @TODO: return error response to client
  return null;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2
export const processAuthorizationResponse = (
  redirectionURI: URL,
  state?: string,
): AuthorizationResponseOptions | null => {
  const parameters = redirectionURI.searchParams;
  if (parameters.get("error") !== null) {
    return processAuthorizeErrorResponse(redirectionURI);
  }
  if (state && !parameters.has("state") && parameters.get("state") !== state) {
    console.error(
      `ERROR: state needs to be included in response and match ${state}.`,
    );
  }
  if (!parameters.has("code")) {
    console.error(`ERROR: code needs to be included in response`);
  }
  return {
    code: parameters.get("code") || "",
    state: parameters.get("state") || "",
  };
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
export const requestToken = async (
  url: string,
  options: AccessTokenRequestOptions,
): Promise<AccessTokenResponseOptions | null> => {
  const creds = options.clientId + ":" + options.clientSecret;
  const formData: string[] = [];
  formData.push(`grant_type=${options.grantType}`);
  formData.push(`code=${options.code}`);
  formData.push(`client_id=${options.clientId}`);
  formData.push(`redirect_uri=${options.redirectURI}`);
  formData.push(`code_verifier=${options.codeVerifier}`);

  const request = new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${btoa(creds)}`,
    },
    body: formData.join("&"),
  });

  const response = await fetch(request);
  if (response.status !== 200) {
    return processTokenErrorResponse(response);
  }
  return processTokenResponse(response);
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
const processTokenErrorResponse = async (response: Response) => {
  const json = await response.json();
  const res: AccessTokenErrorResponseOptions = {
    error: json.error,
    error_description: json.error_description,
    error_uri: json.error_uri,
  };
  console.log(`ERROR, Token Response: ${JSON.stringify(res)}`);
  return null;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.4
// https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
export const processTokenResponse = async (
  response: Response,
): Promise<AccessTokenResponseOptions | null> => {
  const json = await response.json();
  const res: AccessTokenResponseOptions = {
    access_token: json.access_token,
    token_type: json.token_type,
    expires_in: json.expires_in,
    refresh_token: json.refresh_token,
  };
  console.log(`Take The Token: ${JSON.stringify(res)}`);
  return res;
};
