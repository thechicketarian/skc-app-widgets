import { parseCsvToJson } from "../utils/sheet.js";

const RAW_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbFkjDDJ7pKV0Hi4HFx5t5hPQFzbZ3v0XDdD8W981RQ01bbFhhvP5-Q6AmJ8Q2Qdg75SwgM4yQnFsx/pub?output=csv";

const CSV_URL = `https://skc-app-widgets.vercel.app/api/sheet?url=${encodeURIComponent(
  RAW_CSV_URL
)}`;

// ---- CACHE KEYS ----
const CACHE_HTML_KEY = "starting-eleven-html-v1";
const CACHE_HASH_KEY = "starting-eleven-hash-v1";

// ---- Tiny hash function ----
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

// ---- CSS ----
const style = document.createElement("style");
style.textContent = `
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

  .player-info {
    display: flex;
    gap: .25rem;
  }

  .starters, .subs {
    margin-bottom: 24px;
  }

  .starters h3, .subs h3 {
    margin: 0 0 10px 0;
    font-weight: bold;
    font-size: 1.1rem;
  }

  .player {
    margin-bottom: 8px;
  }

  .subs {
    display: flex;
    flex-wrap: wrap;
    grid-column-gap: 1rem;
    font-size: 12px;
  }
`;
document.head.appendChild(style);

// ---- MAIN LOADER ----
async function loadStartingEleven() {
  const container = document.getElementById("starting-eleven");
  if (!container) return;

  // 1. Load cached HTML instantly
  const cachedHtml = localStorage.getItem(CACHE_HTML_KEY);
  const cachedHash = localStorage.getItem(CACHE_HASH_KEY);

  if (cachedHtml) {
    container.innerHTML = cachedHtml;
  }

  // 2. Fetch fresh CSV in background
  try {
    const res = await fetch(CSV_URL);
    const csv = await res.text();

    // Compute hash of CSV content
    const newHash = hashString(csv);

    // If hash matches → stop (cached HTML already shown)
    if (newHash === cachedHash) {
      return;
    }

    // ---- PROCESS DATA ----
    const players = parseCsvToJson(csv);

    players.forEach(p => {
      p.jerseyNum = parseInt(p.jersey, 10) || 0;
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
      const captainBadge = p.captain ? `<span class="captain-badge">C</span>` : "";
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
      <div class="starting-eleven-widget">
        <div class="startersWrappers">
          <h3>Starting XI</h3>
          <div class="starters">
            ${starters.map(renderStarter).join("")}
          </div>
        </div>

        <div class="subsWrapper">
          <h3>Subs</h3>
          <div class="subs">
            ${subs.map(renderSub).join("")}
          </div>
        </div>
      </div>
    `;

    // 3. Render fresh HTML
    container.innerHTML = html;

    // 4. Update cache
    localStorage.setItem(CACHE_HTML_KEY, html);
    localStorage.setItem(CACHE_HASH_KEY, newHash);

  } catch (err) {
    console.error("Failed to load starting eleven:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadStartingEleven);
