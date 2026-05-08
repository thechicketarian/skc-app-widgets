// utils/sheet.js

/**
 * Convert CSV text into an array of objects.
 * Each row becomes { header1: value1, header2: value2, ... }
 */
export function parseCsvToJson(csvText) {
  if (!csvText) return [];

  const rows = csvText
    .split("\n")
    .map(r => r.trim())
    .filter(r => r.length > 0)
    .map(r => r.split(","));

  const headers = rows.shift().map(h => h.trim());

  return rows.map(row => {
    const obj = {};

    headers.forEach((header, i) => {
      let value = row[i] ? row[i].trim() : "";

      // Only normalize booleans if value is a string
      if (typeof value === "string") {
        const lower = value.toLowerCase();
        if (lower === "true") value = true;
        if (lower === "false") value = false;
      }

      obj[header] = value;
    });

    return obj;
  });
}
