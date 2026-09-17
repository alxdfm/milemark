/** Make storage URIs clickable in a normal browser. */
export function publicHref(uri: string | undefined | null): string | undefined {
  if (!uri) return undefined;
  const u = uri.trim();
  if (!u) return undefined;
  if (u.startsWith("ipfs://")) {
    const path = u.slice("ipfs://".length).replace(/^ipfs\//, "");
    return `https://ipfs.io/ipfs/${path}`;
  }
  if (u.startsWith("ipns://")) {
    const path = u.slice("ipns://".length);
    return `https://ipfs.io/ipns/${path}`;
  }
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return undefined;
}

export function linkLabel(uri: string): string {
  if (uri.startsWith("ipfs://") || uri.startsWith("ipns://")) {
    return "Open evidence (IPFS gateway)";
  }
  if (uri.includes("cursor.com")) return "Open brief (may require login)";
  return "Open link";
}
