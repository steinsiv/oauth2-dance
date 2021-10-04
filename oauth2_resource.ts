import { Application, Context, Router } from "./deps.ts";
import { AccessTokenErrorResponseOptions } from "./src/oauth2.types.ts";

const router = new Router();

router.get("/protected", (ctx: Context) => {
  console.log(`-> GET /authorize`);
  let tokenOk = false;
  const authorizationHeader = ctx.request.headers.get("Authorization");
  const scheme = authorizationHeader ? authorizationHeader.split(" ")[0] : null;
  const token = authorizationHeader ? atob(authorizationHeader.split(" ")[1]).split(":") : null;

  if (!scheme || !token) {
    const errorOptions: AccessTokenErrorResponseOptions = { error: "unauthorized_client" };
    ctx.response.status = 401;
    ctx.response.headers.append("Content-Type", "application/json");
    ctx.response.body = errorOptions;
  } else {
    tokenOk = true;
  }
  //@todo validate token and scope with the authorization server that issued it
  if (tokenOk) ctx.response.body = "42";
});

const app = new Application();
app.use(async (ctx, next) => {
  await next();
  console.log(`${ctx.request.method} ${ctx.request.url}`);
});

const port = 7000;
app.use(router.routes());
app.use(router.allowedMethods());

console.info(`AUTHORIZATION SERVER Listening on :${port}`);
app.listen({ port: port });
