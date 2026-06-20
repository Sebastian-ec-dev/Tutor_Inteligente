export default function formateoTime(id: string) {
  const ms = Number(id);
  if (!Number.isFinite(ms) || ms < 1000000000000) return "";
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
