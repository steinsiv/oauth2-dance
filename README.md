# oauth2_dance

Implementation of OAuth2 Authorization Code Grant w/PKCE using Deno

[RFC 6749 - OAuth2 Authorization Code Grant ch. 4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)<br/>[RFC 7636 - PKCE Code Challenge](https://datatracker.ietf.org/doc/html/rfc7636)

This module is a WIP of rfc6749 and rfc 7636 and will hopefully suit as an entrypoint when learning about OAuth2.

...and since we are learning `TS` `Deno` and `OAuth2` as we go, expect the code to change frequently!

## example `.env` file
```conf
DENO_AUTHORIZE_URL=http://localhost:9001/authorize
DENO_TOKEN_URL=http://localhost:9001/token
DENO_CLIENT_ID=client1
DENO_CLIENT_SECRET=clientsecret1
DENO_CLIENT_REDIRECT_URL="http://localhost:3000/callback"
```

### client

`deno run --allow-read  --allow-net --allow-env --location=http://localhost ./client.ts`

### authorization-server

`deno run --allow-read  --allow-net --allow-env --location=http://localhost ./server_authorization.ts`

