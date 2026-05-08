// /api/starting-eleven-snapshot-image.js
const satori = require("satori");
const { Resvg } = require("@resvg/resvg-js");
const fs = require("fs");
const path = require("path");

const fontPath = path.join(process.cwd(), "public/fonts/MLSTifoStandard-Medium.otf");
const fontData = fs.readFileSync(fontPath);

module.exports = async function handler(req, res) {
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

    // Load local font
    const fontPath = path.join(process.cwd(), "public/fonts/Inter-Regular.ttf");
    const fontData = fs.readFileSync(fontPath);

    const svg = await satori(
      Snapshot({ starters, subs }),
      {
        width: 800,
        height: 600,
        fonts: [
          {
            name: "MLS Tifo",
            data: fontData,
            weight: 700,
            style: "normal",
          },
        ],
      }
    );

    const png = new Resvg(svg).render().asPng();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.status(200).send(png);

  } catch (err) {
    console.error("Snapshot PNG generation failed:", err);
    res.status(500).json({ ok: false, error: err.toString() });
  }
};

// JSX-like function for Satori
function Snapshot({ starters, subs }) {
  return {
    type: "div",
    props: {
      style: { fontFamily: "MLS Tifo", padding: 32 },
      children: [
        { type: "h3", props: { children: "Starting XI" } },
        ...starters.map(p => ({
          type: "div",
          props: {
            children: `#${p.jersey} ${p.roster}${p.captain ? " (C)" : ""}`
          }
        })),
        { type: "h3", props: { style: { marginTop: 24 }, children: "Subs" } },
        ...subs.map(p => ({
          type: "div",
          props: { children: `#${p.jersey} ${p.roster}` }
        })),
      ]
    }
  };
}

function parseCsv(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines.shift().split(",").map(h => h.trim());

  return lines.map(line => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] || "").trim()));

    obj.jerseyNum = parseInt(obj.jersey, 10) || 0;
    obj.starting = obj.starting === true || obj.starting === "true";
    obj.captain = obj.captain === true || obj.captain === "true";

    return obj;
  });
}
