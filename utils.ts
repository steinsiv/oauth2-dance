import {
  AccessTokenErrorResponseOptions,
  AuthorizationErrorResponseOptions,
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

// https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
export const processTokenErrorResponse = async (response: Response) => {
  const json = await response.json();
  const res: AccessTokenErrorResponseOptions = {
    error: json.error,
    error_description: json.error_description,
    error_uri: json.error_uri,
  };
  console.log(`ERROR, Token Response: ${res}`);
  return null;
};

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2
export const processAuthorization = (
  redirectionURI: URL,
  state: string,
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
    console.error(
      `ERROR: code needs to be included in response`,
    );
  }
  return {
    code: parameters.get("code") || "",
    state: parameters.get("state") || "",
  };
};
