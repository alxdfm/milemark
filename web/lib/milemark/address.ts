/** Hex address helpers. No wagmi / viem — domain stays pure. */

export type Address = `0x${string}`;

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const satisfies Address;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isHexAddress(value: string): value is Address {
  return ADDRESS_RE.test(value.trim());
}

export function parseAddress(value: string): Address | null {
  const trimmed = value.trim();
  return isHexAddress(trimmed) ? trimmed : null;
}

export function sameAddress(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function isZeroAddress(value: string | null | undefined): boolean {
  return sameAddress(value, ZERO_ADDRESS);
}

export function shortAddress(address: string | null | undefined): string {
  if (!address || address.length < 12) return address || "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
