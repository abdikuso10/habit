// Casual privacy, not real security: this hashes the password client-side with
// SHA-256 and stores only the hash in localStorage so it isn't sitting there in
// plain text. Anyone with access to this device's browser storage or devtools
// can still bypass this screen entirely. It exists to keep this journal from
// being read at a glance, not to protect against a determined attacker.
export async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
