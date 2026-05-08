export async function fetchSheetAsJson(sheetId, gid = "0") {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(url);
  const csv = await res.text();

  const rows = csv
    .split("\n")
    .map(r => r.trim())
    .filter(Boolean)
    .map(r => r.split(","));

  const headers = rows.shift().map(h => h.trim());

  return rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] || "").trim();
    });
    return obj;
  });
}
