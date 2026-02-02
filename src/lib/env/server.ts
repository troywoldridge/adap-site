import "server-only";

/**
 * Runtime-only env access.
 * Safe for Cloudflare / Next build.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  const v = typeof value === "string" ? value.trim() : "";
  return v ? v : undefined;
}
