/**
 * Official Indian GST State / Union Territory Codes and Mapping Helpers
 * Maps state names to standardized 2-digit GST state codes (e.g., '33-Tamil Nadu', '32-Kerala').
 */

export interface GstStateInfo {
  code: string;
  name: string;
}

export const GST_STATE_MAP: Record<string, GstStateInfo> = {
  "jammu and kashmir": { code: "01", name: "Jammu and Kashmir" },
  "jammu & kashmir": { code: "01", name: "Jammu and Kashmir" },
  "j&k": { code: "01", name: "Jammu and Kashmir" },
  "himachal pradesh": { code: "02", name: "Himachal Pradesh" },
  "punjab": { code: "03", name: "Punjab" },
  "chandigarh": { code: "04", name: "Chandigarh" },
  "uttarakhand": { code: "05", name: "Uttarakhand" },
  "uttaranchal": { code: "05", name: "Uttarakhand" },
  "haryana": { code: "06", name: "Haryana" },
  "delhi": { code: "07", name: "Delhi" },
  "new delhi": { code: "07", name: "Delhi" },
  "rajasthan": { code: "08", name: "Rajasthan" },
  "uttar pradesh": { code: "09", name: "Uttar Pradesh" },
  "up": { code: "09", name: "Uttar Pradesh" },
  "bihar": { code: "10", name: "Bihar" },
  "sikkim": { code: "11", name: "Sikkim" },
  "arunachal pradesh": { code: "12", name: "Arunachal Pradesh" },
  "nagaland": { code: "13", name: "Nagaland" },
  "manipur": { code: "14", name: "Manipur" },
  "mizoram": { code: "15", name: "Mizoram" },
  "tripura": { code: "16", name: "Tripura" },
  "meghalaya": { code: "17", name: "Meghalaya" },
  "assam": { code: "18", name: "Assam" },
  "west bengal": { code: "19", name: "West Bengal" },
  "jharkhand": { code: "20", name: "Jharkhand" },
  "odisha": { code: "21", name: "Odisha" },
  "orissa": { code: "21", name: "Odisha" },
  "chhattisgarh": { code: "22", name: "Chhattisgarh" },
  "madhya pradesh": { code: "23", name: "Madhya Pradesh" },
  "mp": { code: "23", name: "Madhya Pradesh" },
  "gujarat": { code: "24", name: "Gujarat" },
  "dadra and nagar haveli and daman and diu": { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  "daman and diu": { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  "dadra and nagar haveli": { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  "maharashtra": { code: "27", name: "Maharashtra" },
  "andhra pradesh": { code: "37", name: "Andhra Pradesh" },
  "andhra": { code: "37", name: "Andhra Pradesh" },
  "ap": { code: "37", name: "Andhra Pradesh" },
  "karnataka": { code: "29", name: "Karnataka" },
  "goa": { code: "30", name: "Goa" },
  "lakshadweep": { code: "31", name: "Lakshadweep" },
  "kerala": { code: "32", name: "Kerala" },
  "tamil nadu": { code: "33", name: "Tamil Nadu" },
  "tamilnadu": { code: "33", name: "Tamil Nadu" },
  "tn": { code: "33", name: "Tamil Nadu" },
  "puducherry": { code: "34", name: "Puducherry" },
  "pondicherry": { code: "34", name: "Puducherry" },
  "andaman and nicobar islands": { code: "35", name: "Andaman and Nicobar Islands" },
  "andaman and nicobar": { code: "35", name: "Andaman and Nicobar Islands" },
  "telangana": { code: "36", name: "Telangana" },
  "ts": { code: "36", name: "Telangana" },
  "ladakh": { code: "38", name: "Ladakh" },
  "other territory": { code: "97", name: "Other Territory" },
};

export const GST_CODE_TO_STATE: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

/**
 * Parses and formats an Indian state with its official 2-digit GST state code.
 *
 * Examples:
 * - "Tamil Nadu" -> "33-Tamil Nadu"
 * - "33-Tamil Nadu" -> "33-Tamil Nadu" (prevents duplicate prefix "32-33-...")
 * - "32 - Kerala" -> "32-Kerala"
 * - "33" -> "33-Tamil Nadu"
 * - GSTIN: "33AALFL1802A1Z3" -> "33-Tamil Nadu"
 *
 * @param rawState Raw state string from user address
 * @param gstin Optional GSTIN / GST Number (where first 2 characters denote state code)
 * @returns Formatted state string like "33-Tamil Nadu" or "32-Kerala"
 */
export function formatGstState(rawState?: string | null, gstin?: string | null): string {
  const cleanState = (rawState || "").trim();
  const cleanGstin = (gstin || "").trim().toUpperCase();

  // 1. If already formatted like "32-Kerala" or "32 - Kerala" or "33: Tamil Nadu"
  const prefixMatch = cleanState.match(/^(\d{2})\s*[-:]\s*(.+)$/);
  if (prefixMatch) {
    const code = prefixMatch[1];
    let name = prefixMatch[2].trim();
    if (GST_CODE_TO_STATE[code]) {
      name = GST_CODE_TO_STATE[code];
    }
    return `${code}-${name}`;
  }

  // 2. If rawState is purely a 2-digit numeric code like "33"
  if (/^\d{2}$/.test(cleanState)) {
    const name = GST_CODE_TO_STATE[cleanState];
    if (name) {
      return `${cleanState}-${name}`;
    }
  }

  // 3. Look up state by normalized name
  if (cleanState) {
    const normalizedKey = cleanState.toLowerCase().replace(/[^a-z0-9&]/g, " ").replace(/\s+/g, " ").trim();
    const mapped = GST_STATE_MAP[normalizedKey];
    if (mapped) {
      return `${mapped.code}-${mapped.name}`;
    }
  }

  // 4. Extract state code from GSTIN if available
  if (cleanGstin.length >= 2 && /^\d{2}/.test(cleanGstin)) {
    const codeFromGstin = cleanGstin.substring(0, 2);
    const stateNameFromGstin = GST_CODE_TO_STATE[codeFromGstin];
    if (stateNameFromGstin) {
      return `${codeFromGstin}-${cleanState || stateNameFromGstin}`;
    }
  }

  // 5. If rawState is provided but unknown in dictionary, check if GSTIN can provide code
  if (cleanState) {
    // If it contains a state name somewhere inside
    for (const [key, val] of Object.entries(GST_STATE_MAP)) {
      if (cleanState.toLowerCase().includes(key)) {
        return `${val.code}-${val.name}`;
      }
    }
    return `32-${cleanState}`;
  }

  // 6. Default fallback for Litmus (HQ Kerala)
  return "32-Kerala";
}
