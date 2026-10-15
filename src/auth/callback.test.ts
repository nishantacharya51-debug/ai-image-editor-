import { describe, it, expect } from "vitest";
import { parseAuthCallback } from "./callback";
import { authErrorMessage } from "./errors";
const base = "https://nishantacharya51-debug.github.io/ai-image-editor-/";
describe("email callback parsing", () => {
  it("leaves ordinary routes untouched", () => {
    expect(parseAuthCallback(`${base}#/editor?preset=noir`)).toBeNull();
  });
  it("reads the query before a Pages hash", () => {
    expect(
      parseAuthCallback(`${base}?code=single-use#/auth/callback`)?.code,
    ).toBe("single-use");
  });
  it("reads callbacks inside hash routes and normal dev routes", () => {
    expect(
      parseAuthCallback(`${base}#/auth/callback?code=code&next=reset`)?.next,
    ).toBe("/reset-password");
    expect(
      parseAuthCallback(
        "http://localhost:5173/auth/callback?code=code&next=reset",
      )?.next,
    ).toBe("/reset-password");
  });
  it("recognizes the old recovery route", () => {
    expect(parseAuthCallback(`${base}?code=code#/reset-password`)?.next).toBe(
      "/reset-password",
    );
  });
  it("accepts token hashes only with explicitly supported verification types", () => {
    expect(
      parseAuthCallback(`${base}?token_hash=once&type=recovery`)?.type,
    ).toBe("recovery");
    expect(
      parseAuthCallback(`${base}?token_hash=once&type=admin`)?.type,
    ).toBeUndefined();
  });
  it("retains PKCE flow IDs for the SDK even after the browser URL is cleaned", () => {
    expect(
      parseAuthCallback(`${base}?code=code&sb_flow_id=abcdefgh12345678`)
        ?.flowId,
    ).toBe("abcdefgh12345678");
  });
  it("does not accept open redirect targets", () => {
    for (const next of [
      "https://evil.example",
      "//evil.example",
      "/editor",
      "javascript:alert(1)",
    ]) {
      expect(
        parseAuthCallback(`${base}?code=code&next=${encodeURIComponent(next)}`)
          ?.next,
      ).toBe("/account");
    }
  });
  it("captures expired-link errors but not raw provider descriptions", () => {
    const result = parseAuthCallback(
      `${base}?error=denied&error_code=otp_expired&error_description=sensitive#/account`,
    );
    expect(result?.error).toBe("otp_expired");
    expect(JSON.stringify(result)).not.toContain("sensitive");
  });
  it("rejects old implicit token links rather than placing tokens in the router", () => {
    const result = parseAuthCallback(
      `${base}#access_token=secret&refresh_token=secret&type=recovery`,
    );
    expect(result?.error).toBe("unsupported_link");
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
describe("safe account errors", () => {
  it("explains credentials, confirmation, email restrictions and verifier failures", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toContain(
      "incorrect",
    );
    expect(authErrorMessage({ code: "email_not_confirmed" })).toContain(
      "Confirm",
    );
    expect(
      authErrorMessage({ code: "email_address_not_authorized" }),
    ).toContain("site owner");
    expect(
      authErrorMessage({ code: "pkce_code_verifier_not_found" }),
    ).toContain("another browser");
  });
  it("never displays an arbitrary backend response or secret", () => {
    expect(authErrorMessage(new Error("private-key=secret"))).not.toContain(
      "secret",
    );
    expect(authErrorMessage(new TypeError("Failed to fetch"))).toContain(
      "connection",
    );
  });
});
