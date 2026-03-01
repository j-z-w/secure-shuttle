export function assertInternalKey(providedKey: string): void {
  const expectedKey = process.env.CONVEX_INTERNAL_API_KEY;
  if (!expectedKey || providedKey !== expectedKey) {
    throw new Error("Unauthorized");
  }
}
