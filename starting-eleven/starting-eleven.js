// import { parseCsvToJson } from "../utils/sheet.js";

// const CSV_URL =
//   "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbFkjDDJ7pKV0Hi4HFx5t5hPQFzbZ3v0XDdD8W981RQ01bbFhhvP5-Q6AmJ8Q2Qdg75SwgM4yQnFsx/pub?output=csv";

// // Inject CSS so TinyMCE / WebView can't strip it
// const style = document.createElement("style");
// style.textContent = `

// .starting-eleven-widget {
// padding:1rem;
// }

//   .captain-badge {
//     display: inline-block;
//     background: #0057b8;
//     color: white;
//     font-size: 0.7rem;
//     font-weight: bold;
//     padding: 2px 5px;
//     border-radius: 4px;
//     margin-left: 6px;
//   }

//   .player-info {
//   display: flex;
//   gap: .25rem;
//   }

//   .starters, .subs {
//     margin-bottom: 24px;
//   }

//   .starters h3, .subs h3 {
//     margin: 0 0 10px 0;
//     font-weight: bold;
//     font-size: 1.1rem;
//   }

//   .player {
//     margin-bottom: 8px;
//   }
//     .subs {
//         display: flex;
//     flex-wrap: wrap;
//      grid-column-gap: 1rem;
//     font-size: 12px;
//     }
// `;
// document.head.appendChild(style);

// async function loadStartingEleven() {
//   try {
//     const res = await fetch(CSV_URL);
//     const csv = await res.text();
//     const players = parseCsvToJson(csv);

//     const container = document.getElementById("starting-eleven");
//     if (!container) return;

//     // Normalize jersey numbers
//     players.forEach(p => {
//       p.jerseyNum = parseInt(p.jersey, 10) || 0;
//     });

//     // Split into starters and subs
//     const starters = players.filter(p => p.starting === true);
//     const subs = players.filter(p => p.starting !== true);

//     // Sort starters by jersey number
//     starters.sort((a, b) => a.jerseyNum - b.jerseyNum);

//     // Sort subs alphabetically by roster name
//     subs.sort((a, b) => (a.roster || "").localeCompare(b.roster || ""));

//     // Helper: extract last name or multi-word surname
//     const getSubName = full => {
//       if (!full) return "";
//       const parts = full.trim().split(" ");

//       // If only one word, return it
//       if (parts.length === 1) return parts[0];

//       // If multiple words, drop the first (first name/initial)
//       return parts.slice(1).join(" ");
//     };

//     // Render starter (full name)
//     const renderStarter = p => {
//       const isCaptain = p.captain === true;
//       const captainBadge = isCaptain ? `<span class="captain-badge">C</span>` : "";

//       return `
//         <div class="player">
//           <div class="player-info">
//           <div class="player-position">#${p.jersey || ""}</div>
//             <div class="player-name">
//               ${p.roster || ""} ${captainBadge}
//             </div>
//           </div>
//         </div>
//       `;
//     };

//     // Render sub (last name or multi-word surname)
//     const renderSub = p => {
//       const subName = getSubName(p.roster);
//       const isCaptain = p.captain === true;
//       const captainBadge = isCaptain ? `<span class="captain-badge">C</span>` : "";

//       return `
//         <div class="player">
//           <div class="player-info player-info-subs">
//             <div class="player-position">#${p.jersey || ""}</div>
//             <div class="player-name">
//               ${subName}
//             </div>
//           </div>
//         </div>
//       `;
//     };

//     const startersHtml = starters.map(renderStarter).join("");
//     const subsHtml = subs.map(renderSub).join("");

//     container.innerHTML = `
//       <div class="starting-eleven-widget">
//         <div class="starters">
//           <h3>Starting XI</h3>
//           ${startersHtml}
//         </div>
//         <h3>Subs</h3>
//         <div class="subs">
//           ${subsHtml}
//         </div>
//       </div>
//     `;
//   } catch (err) {
//     console.error("Failed to load starting eleven:", err);
//   }
// }

// document.addEventListener("DOMContentLoaded", loadStartingEleven);
// starting-eleven/starting-eleven.js

import { parseCsvToJson } from "../utils/sheet.js";

const RAW_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbFkjDDJ7pKV0Hi4HFx5t5hPQFzbZ3v0XDdD8W981RQ01bbFhhvP5-Q6AmJ8Q2Qdg75SwgM4yQnFsx/pub?output=csv";

// Use Vercel proxy to bypass CORS
const CSV_URL = `https://skc-app-widgets.vercel.app/api/sheet?url=${encodeURIComponent(
  RAW_CSV_URL
)}`;

// Inject CSS
const style = document.createElement("style");
style.textContent = `
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

  .starting-eleven-widget {
  
  }


  .starters h3  {
    font-weight: bold;
    font-size: 1.1rem;
  }

  .subs h3 {
  }

.player-info {
display:flex;
gap:.25rem;
}

  .subs {
  display: flex;
  flex-wrap: wrap;
  grid-column-gap: 1rem;
  }

`;
document.head.appendChild(style);

async function loadStartingEleven() {
  try {
    const res = await fetch(CSV_URL);
    const csv = await res.text();
    const players = parseCsvToJson(csv);

    const container = document.getElementById("starting-eleven");
    if (!container) return;

    // Normalize jersey numbers
    players.forEach(p => {
      p.jerseyNum = parseInt(p.jersey, 10) || 0;
    });

    // Split into starters and subs
    const starters = players.filter(p => p.starting === true);
    const subs = players.filter(p => p.starting !== true);

    // Sort starters by jersey number
    starters.sort((a, b) => a.jerseyNum - b.jerseyNum);

    // Sort subs alphabetically
    subs.sort((a, b) => (a.roster || "").localeCompare(b.roster || ""));

    // Extract multi-word surname (drop first name)
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
            <div class="player-name">${p.roster} ${captainBadge}</div>
            <div class="player-position">#${p.jersey}</div>
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
             <div class="player-name">${p.roster}</div>
          </div>
        </div>
      `;
    };

    container.innerHTML = `
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
  } catch (err) {
    console.error("Failed to load starting eleven:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadStartingEleven);
