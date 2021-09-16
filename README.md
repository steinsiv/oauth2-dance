# oauth2_acg_pkce

OAuth2 Authorization Code Grant w/PKCE only

[https://datatracker.ietf.org/doc/html/rfc6749#section-4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)
[https://datatracker.ietf.org/doc/html/rfc7636](https://datatracker.ietf.org/doc/html/rfc7636)

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
