const APP_SCHEME = 'aulaia';

export function buildSubjectInviteLink(token: string) {
  return `${APP_SCHEME}://join?token=${encodeURIComponent(token)}`;
}

export function extractInviteToken(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const queryToken = trimmed.match(/[?&]token=([^&]+)/)?.[1];
  if (queryToken) return decodeURIComponent(queryToken);

  const pathToken = trimmed.match(/\/join\/([^/?#]+)/)?.[1];
  if (pathToken) return decodeURIComponent(pathToken);

  if (/^[a-zA-Z0-9_-]{12,}$/.test(trimmed)) return trimmed;

  return null;
}
