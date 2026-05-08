// /api/sheet.js
console.log("▶ Running sheet.js from:", __filename);

export default async function handler(req, res) {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send("Missing url");
  }

  try {
    const response = await fetch(url);
    const csv = await response.text();

    // CORS headers so WebViews, TinyMCE, Squarespace, etc. can load it
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "text/csv");

    return res.status(200).send(csv);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).send("Failed to fetch CSV");
  }
}
