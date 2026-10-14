import { sealKey, openKey } from "./crypto.ts";
const secret = btoa(String.fromCharCode(...new Uint8Array(32).fill(17)));
Deno.test(
  "encrypted API key round trip is bound to the authenticated user",
  async () => {
    const record = await sealKey("fake-gemini-test-key", secret, "user-one");
    if (record.ciphertext.includes("fake-gemini-test-key"))
      throw new Error("Plaintext leak");
    if ((await openKey(record, secret, "user-one")) !== "fake-gemini-test-key")
      throw new Error("Round trip failed");
    let blocked = false;
    try {
      await openKey(record, secret, "user-two");
    } catch {
      blocked = true;
    }
    if (!blocked) throw new Error("Cross-user decryption permitted");
  },
);
Deno.test("unique IVs and ciphertext for every save", async () => {
  const a = await sealKey("same-key", secret, "user-one"),
    b = await sealKey("same-key", secret, "user-one");
  if (a.iv === b.iv || a.ciphertext === b.ciphertext)
    throw new Error("Encryption reused an IV");
});
Deno.test("rejects invalid master secrets and altered ciphertext", async () => {
  let blocked = false;
  try {
    await sealKey("key", "invalid", "user-one");
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error("Invalid secret accepted");
  const r = await sealKey("key", secret, "user-one");
  const damaged = {
    ...r,
    ciphertext: (r.ciphertext[0] === "A" ? "B" : "A") + r.ciphertext.slice(1),
  };
  blocked = false;
  try {
    await openKey(damaged, secret, "user-one");
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error("Tampered ciphertext accepted");
});
