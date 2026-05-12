// scripts/generate-keys.mjs
// One-time RSA key generation for Convex customJwt auth
// Run: node scripts/generate-keys.mjs
import { generateKeyPair, exportPKCS8, exportJWK } from "jose";

const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
const privateKeyPem = await exportPKCS8(privateKey);
const publicKeyJwk = await exportJWK(publicKey);

const jwks = JSON.stringify({
  keys: [{ ...publicKeyJwk, use: "sig", kid: "pisp-key-1" }],
});

// Output lines for copy-paste into .env.local
console.log("Add these to .env.local:\n");
console.log(`JWT_PRIVATE_KEY=${JSON.stringify(privateKeyPem)}`);
console.log(`JWKS=${jwks}`);
