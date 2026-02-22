// convex/http.ts
// Source: https://docs.convex.dev/functions/http-actions
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(process.env.JWKS, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=15",
      },
    });
  }),
});

export default http;
