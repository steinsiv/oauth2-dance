import { Application, Context, Router } from "../deps.ts";
import { parseToken } from "../mod.ts";
import { TokenStorage } from "./tokenstorage.ts";

const router = new Router();
const db = new TokenStorage("tokens.db");

const protectedData = { data: "42" };

router.get("/protected", (ctx: Context) => {
  db.dumpTokens();
  ctx.response.headers.append("Content-Type", "application/json");
  const authorization = parseToken(ctx);
  if (authorization.scheme === "Bearer" && authorization.token && db.checkToken(authorization.token)) {
    ctx.response.status = 200;
    ctx.response.body = protectedData;
  } else {
    ctx.response.status = 401;
    ctx.response.body = { error: "unauthorized_client" };
  }
});

const app = new Application();
app.use(async (ctx, next) => {
  await next();
  console.log(`${ctx.request.method} ${ctx.request.url}`);
});

const port = 7000;
app.use(router.routes());
app.use(router.allowedMethods());
app.addEventListener("error", (err) => {
  console.log(err);
});
console.info(`Protected resource listening on :${port}`);
app.listen({ port: port });
