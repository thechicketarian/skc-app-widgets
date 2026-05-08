import { put } from "@vercel/blob";
import { parseCsvToJson } from "./utils/sheet.js";

export default async function handler(req, res) {
  try {
    const RAW_CSV_URL =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbFkjDDJ7pKV0Hi4HFx5t5hPQFzbZ3v0XDdD8W981RQ01bbFhhvP5-Q6AmJ8Q2Qdg75SwgM4yQnFsx/pub?output=csv";

    const CSV_URL =
      "https://skc-app-widgets.vercel.app/api/sheet?url=" +
      encodeURIComponent(RAW_CSV_URL);

    const csv = await fetch(CSV_URL).then(r => r.text());
    const players = parseCsvToJson(csv);

    // Normalize fields exactly like the client
    players.forEach(p => {
      p.jerseyNum = parseInt(p.jersey, 10) || 0;
      p.starting = p.starting === true || p.starting === "true";
      p.captain = p.captain === true || p.captain === "true";
    });

    const starters = players.filter(p => p.starting === true);
    const subs = players.filter(p => p.starting !== true);

    starters.sort((a, b) => a.jerseyNum - b.jerseyNum);
    subs.sort((a, b) => (a.roster || "").localeCompare(b.roster || ""));

    const getSubName = full => {
      if (!full) return "";
      const parts = full.trim().split(" ");
      if (parts.length === 1) return parts[0];
      return parts.slice(1).join(" ");
    };

    const renderStarter = p => {
      const captainBadge = p.captain
        ? `<span class="captain-badge">C</span>`
        : "";
      return `
        <div class="player">
          <div class="player-info">
            <div class="player-position">#${p.jersey}</div>
            <div class="player-name">${p.roster} ${captainBadge}</div>
          </div>
        </div>
      `;
    };

    const renderSub = p => {
      const subName = getSubName(p.roster);
      return `
        <div class="player">
          <div class="player-info">
            <div class="player-position">#${p.jersey}</div>
            <div class="player-name">${subName}</div>
          </div>
        </div>
      `;
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Starting XI Snapshot</title>
<style>
  body { margin: 0; padding: 0; font-family: sans-serif; }
  .starting-eleven-widget { padding: 1rem; }
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
  .player-info { display: flex; gap: .25rem; }
  .player { margin-bottom: 8px; }
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

    const { url } = await put("starting-eleven/snapshot.html", html, {
      access: "public",
      contentType: "text/html; charset=utf-8",
      cacheControl: "public, max-age=0, must-revalidate",
      token: process.env.skc_app_widgets_READ_WRITE_TOKEN,
    });

    res.status(200).json({
      ok: true,
      message: "Snapshot updated",
      snapshotUrl: url,
    });
  } catch (err) {
    console.error("Snapshot generation failed:", err);
    res.status(500).json({ ok: false, error: err.toString() });
  }
}
