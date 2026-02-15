const COUNTRY_PREFIX = {
  FR: "+33",
  TR: "+90",
  MA: "+212",
  AF: "+93",
  PH: "+63",
  HT: "+509",
  MX: "+52",
  IN: "+91",
  SD: "+249"
};

export function normalizePhone(raw, countryCode) {
  if (!raw) throw new Error("PHONE_EMPTY");

  let phone = String(raw).replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (!phone.startsWith("+")) {
    const prefix = COUNTRY_PREFIX[countryCode];
    if (!prefix) throw new Error("COUNTRY_PREFIX_NOT_SUPPORTED");
    if (phone.startsWith("0")) phone = phone.slice(1);
    phone = prefix + phone;
  }

  if (phone.length < 8 || phone.length > 15) throw new Error("PHONE_INVALID_LENGTH");
  return phone;
}
