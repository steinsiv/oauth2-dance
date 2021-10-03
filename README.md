# oauth2_dance

Implementation of OAuth2 Authorization Code Grant w/PKCE 

[https://datatracker.ietf.org/doc/html/rfc6749#section-4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)
[https://datatracker.ietf.org/doc/html/rfc7636](https://datatracker.ietf.org/doc/html/rfc7636)

This module is trying to link and identify code with rfc6749 and could hopefully suit as an entrypoint when learning about OAuth2.

...and since we are learning TS Deno and OAuth2 as we go, expect the code to change frequently

## client.js

#### dev

```sh
deno run --allow-read  --allow-net --allow-env --location=http://localhost ./client.ts
```

#### compiled executable

```sh
deno compile --allow-read --allow-net --allow-env --location=http://localhost ./client.ts
./client
```
