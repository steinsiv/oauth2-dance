# oauth2_acg_pkce

### client.js

#### dev

```sh
deno run --allow-read  --allow-net --allow-env --location=http://localhost ./client.ts
```

#### bundled

To create self contained bundle:

```sh
deno bundle ./client.ts ./client.bundle.js
deno run --allow-read  --allow-net --allow-env --location=http://localhost ./client.bundle.js
```
