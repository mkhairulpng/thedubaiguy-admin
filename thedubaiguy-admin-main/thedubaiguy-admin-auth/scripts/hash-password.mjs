// Generate a PBKDF2 hash for an admin password (run locally; never commit the plaintext).
//   node scripts/hash-password.mjs "YourStrongPassword"
import { webcrypto as crypto } from "node:crypto";
const pw = process.argv[2];
if (!pw) { console.error('Usage: node scripts/hash-password.mjs "password"'); process.exit(1); }
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256));
const hex = (b) => [...b].map(x => x.toString(16).padStart(2, "0")).join("");
console.log(`pbkdf2$100000$${hex(salt)}$${hex(bits)}`);
