// convex/auth.config.ts
// Source: https://docs.convex.dev/auth/advanced/custom-jwt
import { type AuthConfig } from "convex/server";

export default {
  providers: [
    {
      type: "customJwt",
      applicationID: "profit-is-profit",
      issuer: process.env.CONVEX_SITE_URL!,
      jwks: process.env.CONVEX_SITE_URL + "/.well-known/jwks.json",
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
