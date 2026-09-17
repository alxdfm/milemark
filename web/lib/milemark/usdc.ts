/** USDC is 6 decimals on Circle testnet and in MockERC20. */

export const USDC_DECIMALS = 6;

const AMOUNT_RE = /^\d+(\.\d+)?$/;

/** Parse a human USDC string ("40", "40.5") into base units. */
export function parseUsdc(raw: string): bigint | null {
  const trimmed = raw.trim();
  if (!trimmed || !AMOUNT_RE.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > USDC_DECIMALS) return null;
  const padded = (frac + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  try {
    return BigInt(whole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(padded);
  } catch {
    return null;
  }
}

export function formatUsdc(
  amount: bigint | number | null | undefined,
  digits = 2,
): string {
  if (amount === undefined || amount === null) return "—";
  try {
    const value = typeof amount === "bigint" ? amount : BigInt(amount);
    const negative = value < 0n;
    const abs = negative ? -value : value;
    const base = 10n ** BigInt(USDC_DECIMALS);
    const whole = abs / base;
    const frac = (abs % base).toString().padStart(USDC_DECIMALS, "0");
    const shown =
      digits === 0 ? whole.toString() : `${whole.toString()}.${frac.slice(0, digits)}`;
    return negative ? `-${shown}` : shown;
  } catch {
    return "—";
  }
}
