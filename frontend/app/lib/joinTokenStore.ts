const JOIN_TOKEN_PREFIX = "secure_shuttle:join_token:";

function keyFor(publicId: string): string {
  return `${JOIN_TOKEN_PREFIX}${publicId.trim()}`;
}

export function saveJoinToken(publicId: string, joinToken: string): void {
  if (typeof window === "undefined") return;
  const id = publicId.trim();
  const token = joinToken.trim();
  if (!id || !token) return;
  window.sessionStorage.setItem(keyFor(id), token);
}

export function loadJoinToken(publicId: string): string {
  if (typeof window === "undefined") return "";
  const id = publicId.trim();
  if (!id) return "";
  return window.sessionStorage.getItem(keyFor(id))?.trim() ?? "";
}

export function clearJoinToken(publicId: string): void {
  if (typeof window === "undefined") return;
  const id = publicId.trim();
  if (!id) return;
  window.sessionStorage.removeItem(keyFor(id));
}
