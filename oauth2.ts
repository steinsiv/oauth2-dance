import {
  AccessTokenRequestOptions,
  AccessTokenResponseOptions,
  AuthorizationRequestOptions,
} from "./protocol.ts";
import { processTokenErrorResponse } from "./utils.ts";

export const URLAuthorizeRequest = (
  url: string,
  options: AuthorizationRequestOptions,
): string => {
  const result = new URL(url);
  result.searchParams.append("response_type", options.response_type);
  result.searchParams.append("client_id", options.client_id);
  result.searchParams.append("redirect_uri", options.redirect_uri);
  result.searchParams.append("state", options.state);
  result.searchParams.append("scope", options.scope);
  result.searchParams.append("code_challenge", options.code_challenge);
  result.searchParams.append(
    "code_challenge_method",
    options.code_challenge_method,
  );
  return result.toString();
};

export const URLTokenRequest = (
  url: string,
  options: AccessTokenRequestOptions,
): string => {
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
  const formdata = new FormData();
  const creds = options.client_id + ":" + options.client_secret;
  formdata.append("grant_type", options.grant_type);
  formdata.append("code", options.code);
  formdata.append("redirect_uri", options.redirect_uri);

  const request = new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${btoa(creds)}`,
    },
    body: formdata,
  });

  const response = await fetch(request);
  if (response.status == 400) {
    return processTokenErrorResponse(response);
  }
  return null;
  //return processTokenResponse(response);

  //const content = await response.json();
  //return content;
};
