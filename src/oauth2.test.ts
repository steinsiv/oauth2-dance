import { URLAuthorizationErrorResponse, URLAuthorizeRequest, URLAuthorizeResponse, URLTokenRequest } from "./oauth2.ts";
import {
  AccessTokenRequestOptions,
  AuthorizationErrorResponseOptions,
  AuthorizationRequestOptions,
  AuthorizationResponseOptions,
} from "./oauth2.types.ts";
import { assertArrayContains, assertEquals } from "https://deno.land/std@0.71.0/testing/asserts.ts";

const pkcePattern = /^[A-Za-z\d\-._~]{43,128}$/;
const authorizationEndpoint = "http://authserver/authorize";
const tokenEndpoint = "http://authserver/token";
const codeVerifier = "sqKVI38Avyvmy09Kpbm3Nr3sc-T2zgqDANkSaUfoDel2d6T_oDXQ4GoExH";
const codeChallenge = "UzHjoHbHtqswOdm4MbTA1Q4c7kQArW2tSvtsI7UxY68";
const redirectURI = "http://client/callback";
const clientId = "78429362-3a2f-4342-ab75-77d9decc4173";
const clientSecret = "unguessable-secret-1";
const state = "defined-state";
const scope = "user.read";
const authorizationCode = "YXj5mSC3d9IS";

Deno.test("URLAuthorizeRequest with correct parameters", () => {
  const options: AuthorizationRequestOptions = {
    responseType: "code",
    clientId: clientId,
    redirectURI: redirectURI,
    scope: scope,
    state: state,
    codeChallenge: codeChallenge,
    codeChallengeMethod: "S256",
  };
  const url = URLAuthorizeRequest(authorizationEndpoint, options);
  console.log(url);
  const split = url.split("?");
  assertEquals(split.length, 2);
  assertEquals(split[0], authorizationEndpoint);

  const params = split[1].split("&");
  console.log(params);
  assertArrayContains(params, [
    "response_type=code",
    `client_id=${clientId}`,
    `redirect_uri=${encodeURIComponent(redirectURI)}`,
    `state=${state}`,
    `scope=${encodeURIComponent(scope)}`,
    `code_challenge=${codeChallenge}`,
    "code_challenge_method=S256",
  ]);
});

Deno.test("URLAuthorizeResponse with correct parameters", () => {
  const options: AuthorizationResponseOptions = {
    code: authorizationCode,
    state: state,
  };
  const url = URLAuthorizeResponse(redirectURI, options);

  const split = url.split("?");
  assertEquals(split.length, 2);
  assertEquals(split[0], redirectURI);

  const params = split[1].split("&");
  console.log(params);
  assertArrayContains(params, [
    `code=${authorizationCode}`,
    `state=${state}`,
  ]);
});

Deno.test("URLTokenRequest with correct parameters", () => {
  const options: AccessTokenRequestOptions = {
    grantType: "authorization_code",
    code: authorizationCode,
    redirectURI: redirectURI,
    clientId: clientId,
    clientSecret: clientSecret,
    codeVerifier: codeVerifier,
  };
  const url = URLTokenRequest(tokenEndpoint, options);

  const split = url.split("?");
  assertEquals(split.length, 2);
  assertEquals(split[0], tokenEndpoint);

  const params = split[1].split("&");
  console.log(params);
  assertArrayContains(params, [
    "grant_type=authorization_code",
    `code=${authorizationCode}`,
    `redirect_uri=${encodeURIComponent(redirectURI)}`,
    `code_verifier=${codeVerifier}`,
  ]);
});

Deno.test("URLAuthorizationErrorResponse with correct parameters", () => {
  const options: AuthorizationErrorResponseOptions = {
    error: "invalid_request",
    state: state,
  };
  const url = URLAuthorizationErrorResponse(redirectURI, options);

  const split = url.split("?");
  assertEquals(split.length, 2);
  assertEquals(split[0], redirectURI);

  const params = split[1].split("&");
  console.log(params);
  assertArrayContains(params, [
    `error=invalid_request`,
    `state=${state}`,
  ]);
});
