export function maskPhone(phone) {
  const s = String(phone ?? "");
  if (s.length < 6) return "****";
  return "****" + s.slice(-4);
}
