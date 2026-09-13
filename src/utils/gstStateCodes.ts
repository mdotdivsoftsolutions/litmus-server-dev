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
 * - "33-Tamil Nadu" -> "33-Tamil Nadu"
 * - Pincode 600062 -> "33-Tamil Nadu"
 * - City "Chennai" -> "33-Tamil Nadu"
 * - GSTIN: "33AALFL1802A1Z3" -> "33-Tamil Nadu"
 *
 * @param rawState Raw state string from user address
 * @param gstin Optional GSTIN / GST Number (first 2 digits denote GST state code)
 * @param city Optional city name for geographic fallback
 * @param pincode Optional 6-digit Indian PIN code for geographic fallback
 * @returns Formatted state string like "33-Tamil Nadu" or "32-Kerala"
 */
export function formatGstState(
  rawState?: string | null,
  gstin?: string | null,
  city?: string | null,
  pincode?: string | null
): string {
  const cleanState = (rawState || "").trim();
  const cleanGstin = (gstin || "").trim().toUpperCase();
  const cleanCity = (city || "").trim().toLowerCase();
  const cleanPincode = (pincode || "").replace(/\D/g, "");

  // 1. Authoritative: Extract 2-digit state code from GSTIN if available
  if (cleanGstin.length >= 2 && /^\d{2}/.test(cleanGstin)) {
    const codeFromGstin = cleanGstin.substring(0, 2);
    const stateNameFromGstin = GST_CODE_TO_STATE[codeFromGstin];
    if (stateNameFromGstin) {
      return `${codeFromGstin}-${stateNameFromGstin}`;
    }
  }

  // 2. If already formatted like "32-Kerala" or "32 - Kerala" or "33: Tamil Nadu"
  const prefixMatch = cleanState.match(/^(\d{2})\s*[-:]\s*(.+)$/);
  if (prefixMatch) {
    const code = prefixMatch[1];
    let name = prefixMatch[2].trim();
    if (GST_CODE_TO_STATE[code]) {
      name = GST_CODE_TO_STATE[code];
    }
    return `${code}-${name}`;
  }

  // 3. If rawState is purely a 2-digit numeric code like "33"
  if (/^\d{2}$/.test(cleanState)) {
    const name = GST_CODE_TO_STATE[cleanState];
    if (name) {
      return `${cleanState}-${name}`;
    }
  }

  // 4. Look up state by normalized name
  if (cleanState) {
    const normalizedKey = cleanState.toLowerCase().replace(/[^a-z0-9&]/g, " ").replace(/\s+/g, " ").trim();
    const mapped = GST_STATE_MAP[normalizedKey];
    if (mapped) {
      return `${mapped.code}-${mapped.name}`;
    }
    // Check if contains state name somewhere inside
    for (const [key, val] of Object.entries(GST_STATE_MAP)) {
      if (cleanState.toLowerCase().includes(key)) {
        return `${val.code}-${val.name}`;
      }
    }
  }

  // 5. Deduce state from Indian Postal PIN Code (6 digits)
  if (cleanPincode.length >= 3) {
    const prefix3 = parseInt(cleanPincode.substring(0, 3), 10);
    const prefix2 = parseInt(cleanPincode.substring(0, 2), 10);

    // Puducherry vs Tamil Nadu
    if (prefix3 === 605) return "34-Puducherry";
    if (prefix2 >= 60 && prefix2 <= 64) return "33-Tamil Nadu";

    // Lakshadweep vs Kerala
    if (cleanPincode.startsWith("682555")) return "31-Lakshadweep";
    if (prefix2 >= 67 && prefix2 <= 69) return "32-Kerala";

    // Karnataka
    if (prefix2 >= 56 && prefix2 <= 59) return "29-Karnataka";

    // Telangana vs Andhra Pradesh
    if (prefix3 >= 500 && prefix3 <= 509) return "36-Telangana";
    if (prefix2 >= 51 && prefix2 <= 53) return "37-Andhra Pradesh";

    // Goa vs Maharashtra
    if (prefix3 === 403) return "30-Goa";
    if (prefix2 >= 40 && prefix2 <= 44) return "27-Maharashtra";

    // Gujarat
    if (prefix2 >= 36 && prefix2 <= 39) return "24-Gujarat";

    // Rajasthan
    if (prefix2 >= 30 && prefix2 <= 34) return "08-Rajasthan";

    // Delhi
    if (prefix2 === 11) return "07-Delhi";

    // Uttarakhand vs Uttar Pradesh
    if (prefix3 >= 240 && prefix3 <= 263) return "05-Uttarakhand";
    if ((prefix2 >= 20 && prefix2 <= 23) || (prefix2 >= 26 && prefix2 <= 28)) return "09-Uttar Pradesh";

    // Chandigarh vs Punjab vs Haryana vs Himachal
    if (prefix3 === 160) return "04-Chandigarh";
    if (prefix2 >= 14 && prefix2 <= 16) return "03-Punjab";
    if (prefix2 >= 12 && prefix2 <= 13) return "06-Haryana";
    if (prefix2 === 17) return "02-Himachal Pradesh";
    if (prefix2 >= 18 && prefix2 <= 19) return "01-Jammu and Kashmir";

    // West Bengal
    if (prefix2 >= 70 && prefix2 <= 74) return "19-West Bengal";

    // Odisha
    if (prefix2 >= 75 && prefix2 <= 77) return "21-Odisha";

    // Assam & North East
    if (prefix2 >= 78 && prefix2 <= 79) return "18-Assam";

    // Bihar & Jharkhand
    if (prefix2 >= 80 && prefix2 <= 85) return "10-Bihar";
    if (prefix2 >= 82 && prefix2 <= 83) return "20-Jharkhand";

    // Madhya Pradesh & Chhattisgarh
    if (prefix2 >= 45 && prefix2 <= 48) return "23-Madhya Pradesh";
    if (prefix2 === 49) return "22-Chhattisgarh";
  }

  // 6. Deduce state from City name
  if (cleanCity) {
    if (/(chennai|coimbatore|madurai|salem|trichy|tiruchirappalli|tiruppur|erode|vellore|thanjavur|dindigul|tirunelveli|thirumullaivoyal)/i.test(cleanCity)) {
      return "33-Tamil Nadu";
    }
    if (/(kochi|cochin|ernakulam|trivandrum|thiruvananthapuram|kozhikode|calicut|thrissur|trichur|kollam|palakkad|kottayam|kannur|alappuzha|malappuram)/i.test(cleanCity)) {
      return "32-Kerala";
    }
    if (/(bangalore|bengaluru|mysore|mysuru|mangalore|mangaluru|hubli|belgaum|belagavi)/i.test(cleanCity)) {
      return "29-Karnataka";
    }
    if (/(mumbai|pune|nagpur|nashik|thane|navi mumbai|aurangabad|solapur)/i.test(cleanCity)) {
      return "27-Maharashtra";
    }
    if (/(hyderabad|secunderabad|warangal|nizamabad)/i.test(cleanCity)) {
      return "36-Telangana";
    }
    if (/(visakhapatnam|vizag|vijayawada|guntur|tirupati|nellore|kakinada)/i.test(cleanCity)) {
      return "37-Andhra Pradesh";
    }
    if (/(delhi|new delhi)/i.test(cleanCity)) {
      return "07-Delhi";
    }
    if (/(ahmedabad|surat|vadodara|rajkot|bhavnagar|jamnagar)/i.test(cleanCity)) {
      return "24-Gujarat";
    }
    if (/(jaipur|jodhpur|udaipur|kota|bikaner|ajmer)/i.test(cleanCity)) {
      return "08-Rajasthan";
    }
    if (/(kolkata|howrah|durgapur|asansol|siliguri)/i.test(cleanCity)) {
      return "19-West Bengal";
    }
    if (/(lucknow|kanpur|varanasi|noida|greater noida|ghaziabad|agra|prayagraj|allahabad|meerut)/i.test(cleanCity)) {
      return "09-Uttar Pradesh";
    }
  }

  // 7. If rawState is provided but unrecognized
  if (cleanState) {
    return `32-${cleanState}`;
  }

  // 8. Default fallback for Litmus (HQ Kerala)
  return "32-Kerala";
}
