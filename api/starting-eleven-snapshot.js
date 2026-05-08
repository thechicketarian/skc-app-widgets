import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    const RAW_CSV_URL =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbFkjDDJ7pKV0Hi4HFx5t5hPQFzbZ3v0XDdD8W981RQ01bbFhhvP5-Q6AmJ8Q2Qdg75SwgM4yQnFsx/pub?output=csv";

    const CSV_URL =
      "https://skc-app-widgets.vercel.app/api/sheet?url=" +
      encodeURIComponent(RAW_CSV_URL);

    const csv = await fetch(CSV_URL).then(r => r.text());
    const players = parseCsv(csv);

    const starters = players.filter(p => p.starting);
    const subs = players.filter(p => !p.starting);

    starters.sort((a, b) => a.jerseyNum - b.jerseyNum);
    subs.sort((a, b) => (a.roster || "").localeCompare(b.roster || ""));

    // ⭐ FULL HTML DOCUMENT — THIS IS WHAT YOU WERE MISSING
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Starting XI Snapshot</title>
<style>
  body { margin: 0; padding: 0; font-family: sans-serif; }
  .starting-eleven-widget { padding: 1rem; }
  .player { margin-bottom: 8px; }
  .player-info { display: flex; gap: .25rem; }
  .captain-badge {
    display: inline-block;
    background: #0057b8;
    color: white;
    font-size: 0.7rem;
    font-weight: bold;
    padding: 2px 5px;
    border-radius: 4px;
    margin-left: 6px;
  }
  .subs { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 12px; }
</style>
</head>
<body>
  <div class="starting-eleven-widget">
    <h3>Starting XI</h3>
    <div class="starters">
      ${starters.map(renderStarter).join("")}
    </div>

    <h3>Subs</h3>
    <div class="subs">
      ${subs.map(renderSub).join("")}
    </div>
  </div>
</body>
</html>
    `.trim();

    const filePath = path.join(
      process.cwd(),
      "public",
      "starting-eleven",
      "snapshot.html"
    );

    fs.writeFileSync(filePath, html, "utf8");

    res.status(200).json({
      ok: true,
      message: "Snapshot updated",
      file: "/starting-eleven/snapshot.html"
    });
  } catch (err) {
    console.error("Snapshot generation failed:", err);
    res.status(500).json({ ok: false, error: err.toString() });
  }
}

function parseCsv(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines.shift().split(",").map(h => h.trim());

  return lines.map(line => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] || "").trim()));

    obj.jerseyNum = parseInt(obj.jersey, 10) || 0;
    obj.starting = obj.starting === "true";
    obj.captain = obj.captain === "true";

    return obj;
  });
}

function renderStarter(p) {
  return `
    <div class="player">
      <div class="player-info">
        <div>#${p.jersey}</div>
        <div>${p.roster}${p.captain ? `<span class="captain-badge">C</span>` : ""}</div>
      </div>
    </div>
  `;
}

function renderSub(p) {
  const parts = p.roster.split(" ");
  const short = parts.length > 1 ? parts.slice(1).join(" ") : p.roster;

  return `
    <div class="player">
      <div class="player-info">
        <div>#${p.jersey}</div>
        <div>${short}</div>
      </div>
    </div>
  `;
}
