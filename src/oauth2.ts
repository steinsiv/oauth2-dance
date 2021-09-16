import {
  AccessTokenRequestOptions,
  AccessTokenResponseOptions,
  AuthorizationRequestOptions,
  AuthorizationResponseOptions,
} from "./protocol.ts";
import { processTokenErrorResponse, processTokenResponse } from "./utils.ts";

// https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1
export const URLAuthorizeRequest = (url: string, options: AuthorizationRequestOptions): string => {
  const result = new URL(url);
  result.searchParams.append("response_type", options.response_type);
  result.searchParams.append("client_id", options.client_id);
  result.searchParams.append("redirect_uri", options.redirect_uri);
  if (options.state) {
    result.searchParams.append("state", options.state);
  }
  result.searchParams.append("scope", options.scope);
  result.searchParams.append("code_challenge", options.code_challenge);
  result.searchParams.append(
    "code_challenge_method",
    options.code_challenge_method,
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
  result.searchParams.append("grant_type", options.grant_type);
  result.searchParams.append("client_id", options.client_id);
  result.searchParams.append("redirect_uri", options.redirect_uri);
  result.searchParams.append("code", options.code);
  result.searchParams.append("code_verifier", options.code_verifier);
  return result.toString();
};

export const requestToken = async (
  url: string,
  options: AccessTokenRequestOptions,
): Promise<AccessTokenResponseOptions | null> => {
  const creds = options.client_id + ":" + options.client_secret;
  const formData: string[] = [];
  formData.push(`grant_type=${options.grant_type}`);
  formData.push(`code=${options.code}`);
  formData.push(`redirect_uri=${options.redirect_uri}`);
  formData.push(`code_verifier=${options.code_verifier}`);

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
