/** AES-256-GCM with per-write random IV and authenticated user identity. */
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const decode = (text: string) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
async function keyFromSecret(secret: string) {
  const raw = decode(secret);
  if (raw.length !== 32)
    throw new Error("Expected a 32-byte encryption secret.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function sealKey(value: string, secret: string, userId: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFromSecret(secret);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(userId) },
    key,
    new TextEncoder().encode(value),
  );
  return { iv: encode(iv), ciphertext: encode(new Uint8Array(encrypted)) };
}
export async function openKey(
  record: { iv: string; ciphertext: string },
  secret: string,
  userId: string,
) {
  const key = await keyFromSecret(secret);
  const value = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: decode(record.iv),
      additionalData: new TextEncoder().encode(userId),
    },
    key,
    decode(record.ciphertext),
  );
  return new TextDecoder().decode(value);
}
