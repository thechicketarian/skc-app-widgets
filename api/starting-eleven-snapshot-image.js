// /api/starting-eleven-snapshot-image.js
const { default: satori } = require("satori");
const { Resvg } = require("@resvg/resvg-js");
const fs = require("fs");
const path = require("path");

const fontPath = path.join(
  process.cwd(),
  "public/fonts/MLSTifoStandard-Medium.otf"
);
const fontData = fs.readFileSync(fontPath);

module.exports = async function handler(req, res) {
  try {
    const RAW_CSV_URL =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbFkjDDJ7pKV0Hi4HFx5t5hPQFzbZ3v0XDdD8W981RQ01bbFhhvP5-Q6AmJ8Q2Qdg75SwgM4yQnFsx/pub?output=csv";

    const CSV_URL =
      "https://skc-app-widgets.vercel.app/api/sheet?url=" +
      encodeURIComponent(RAW_CSV_URL);

    const csv = await fetch(CSV_URL).then((r) => r.text());
    const players = parseCsv(csv);

    const starters = players.filter((p) => p.starting);
    const subs = players.filter((p) => !p.starting);

    starters.sort((a, b) => a.jerseyNum - b.jerseyNum);
    subs.sort((a, b) => (a.roster || "").localeCompare(b.roster || ""));

    const svg = await satori(Snapshot({ starters, subs }), {
      width: 800,
      height: 600,
      fonts: [
        {
          name: "MLS Tifo",
          data: fontData,
          weight: 500, // Medium
          style: "normal",
        },
      ],
    });

    const png = new Resvg(svg).render().asPng();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.status(200).send(png);
  } catch (err) {
    console.error("Snapshot PNG generation failed:", err);
    res.status(500).json({ ok: false, error: err.toString() });
  }
};

function Snapshot({ starters, subs }) {
  return {
    type: "div",
    props: {
      style: {
        fontFamily: "MLS Tifo",
        padding: 32,
        fontSize: 20,
        background: "transparent",
        color: "#0c2340",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%"
      },
      children: [
        // STARTERS HEADER
        {
          type: "div",
          props: {
            style: {
              fontSize: 32,
              fontWeight: 500,
              marginBottom: 16
            },
            children: "Starting XI"
          }
        },

        // STARTERS LIST (vertical)
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 4
            },
            children: starters.map((p) => ({
              type: "div",
              props: {
                children: `#${p.jersey} ${p.roster}${p.captain ? " (C)" : ""}`
              }
            }))
          }
        },

        // SUBS HEADER
        {
          type: "div",
          props: {
            style: {
              fontSize: 32,
              fontWeight: 500,
              marginTop: 32,
              marginBottom: 8
            },
            children: "Subs"
          }
        },

        // SUBS WRAPPING GRID
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: 8
            },
            children: subs.map((p) => ({
              type: "div",
              props: {
                style: {
                  paddingRight: 12
                },
                children: `#${p.jersey} ${p.roster}`
              }
            }))
          }
        }
      ]
    }
  };
}


function parseCsv(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines.shift().split(",").map((h) => h.trim());

  return lines.map((line) => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] || "").trim()));

    obj.jerseyNum = parseInt(obj.jersey, 10) || 0;

    const normalize = (v) => v.toString().trim().toLowerCase();

    obj.starting = normalize(obj.starting) === "true";
    obj.captain  = normalize(obj.captain) === "true";

    return obj;
  });
}
