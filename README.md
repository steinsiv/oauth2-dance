# oauth2_dance

Implementation of OAuth2 Authorization Code Grant w/PKCE using Deno

[RFC 6749 - OAuth2 Authorization Code Grant ch. 4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)<br/>[RFC 7636 - PKCE Code Challenge](https://datatracker.ietf.org/doc/html/rfc7636)

This module is a WIP of rfc6749 and rfc 7636 and will hopefully suit as an entrypoint when learning about OAuth2.

...and since we are learning `TS` `Deno` and `OAuth2` as we go, expect the code to change frequently!

## example `.env` file
```conf
DENO_AUTHORIZE_URL=http://localhost:9001/authorize
DENO_TOKEN_URL=http://localhost:9001/token
DENO_INTROSPECT_URL=http://localhost:9001/introspect
DENO_CLIENT_ID=client1
DENO_CLIENT_SECRET=clientsecret1
DENO_CLIENT_REDIRECT_URL="http://localhost:3000/callback"
DENO_FILE_TOKENS_DB="tokens.db"
```

## Test

1. Create your `.env` file in root folder like the one above.

2. Start `client`, `server` and `resource` 

```sh
$ deno run --allow-all --location=http://localhost ./examples/oauth2_client.ts
$ deno run --allow-all --location=http://localhost ./examples/oauth2_server.ts
$ deno run --allow-all --location=http://localhost ./examples/oauth2_resource.ts
```

3. Visit [http://localhost:3000/authme](http://localhost:3000/authme)

4. Test the protected resource with issued token:
```sh
$ curl -H 'Authorization: Bearer <TOKEN>' http://localhost:7000/protected
```

## Docker

1. Your `.env` need to change the line `DENO_TOKEN_URL=http://server:9001/token` to use server instead of localhost.

2. Verify environment-var replacements with `docker compose config`

3. Build and run

```sh
$ ./build-docker.sh
$ docker compose up -d
```

Output Logged:
```yml
oa2client    | Client listening on :3000
oa2server    | Authorization server listening on :9001
oa2resource  | Protected resource listening on :7000
oa2client    | GET http://localhost:3000/authme
oa2server    | GET http://localhost:9001/authorize?response_type=code&client_id=oauth-client-1&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&state=X1GCu7df&scope=foo&code_challenge=%2FREQgseA8M5EMoMON6TfYQzQ%2FxxxSloFBYnNHAVnjS4%3D&code_challenge_method=S256
oa2server    | POST http://localhost:9001/approve
oa2server    | TOKENDB hcYb8Ew40vYaD20usTg87t8H, 2021-10-11 15:16:14
oa2server    | POST http://server:9001/token
oa2client    | TOKEN Take The Token: {"access_token":"hcYb8Ew40vYaD20usTg87t8H","token_type":"Bearer","expires_in":600}
oa2client    | GET http://localhost:3000/callback?code=ttdzwd3Bv4ik&state=X1GCu7df
oa2resource  | 0
oa2resource  | GET http://localhost:7000/protected

```

