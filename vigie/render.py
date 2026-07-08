"""Génération du site statique (dashboard HTML autonome, sans dépendance externe)."""

import json
from datetime import datetime, timezone

from . import config

TEMPLATE = r"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vigie — Veille réglementaire suisse assistée par IA</title>
<meta name="description" content="Publications FINMA analysées automatiquement du point de vue d'un Risk Manager : impact, établissements concernés, actions recommandées.">
<style>
:root{
  --paper:#F2F4F6;
  --surface:#FFFFFF;
  --ink:#152435;
  --ink-2:#44556C;
  --ink-3:#7C8CA2;
  --hairline:#DCE2EA;
  --focus:#152435;

  /* Couleurs de statut : réservées à la sémantique du risque, jamais seules */
  --eleve-bar:#C0303F;   --eleve-text:#9C1E2C;   --eleve-bg:#F9E9EB;
  --moyen-bar:#C77F0F;   --moyen-text:#8A5200;   --moyen-bg:#F8EFDD;
  --faible-bar:#3B72C0;  --faible-text:#2458A6;  --faible-bg:#E8EFF9;
  --info-bar:#96A3B5;    --info-text:#5B6B7E;    --info-bg:#EDF0F4;
  --attente-bar:#D6DCE4; --attente-text:#7C8CA2; --attente-bg:#F0F2F5;

  --font-ui:"Segoe UI Variable Text","Segoe UI","Helvetica Neue",Helvetica,Arial,sans-serif;
  --font-display:"Segoe UI Variable Display","Segoe UI","Helvetica Neue",Helvetica,Arial,sans-serif;
  --font-mono:"Cascadia Mono",Consolas,ui-monospace,"SF Mono",monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{
  background:var(--paper);
  color:var(--ink);
  font-family:var(--font-ui);
  font-size:15.5px;
  line-height:1.55;
}
a{color:inherit}
button{font:inherit;color:inherit;background:none;border:none;cursor:pointer}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:3px}
.wrap{max-width:920px;margin:0 auto;padding:0 20px}

/* ── Masthead ─────────────────────────────────────── */
.masthead{border-bottom:1px solid var(--hairline);background:var(--surface)}
.masthead .wrap{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 24px;padding-top:26px;padding-bottom:22px}
.brand{font-family:var(--font-display);font-size:30px;font-weight:800;letter-spacing:-.03em}
.brand .dot{display:inline-block;width:11px;height:11px;border-radius:50%;background:var(--ink);margin-right:9px;vertical-align:6%}
.brand-sub{font-size:14.5px;font-weight:400;color:var(--ink-2);letter-spacing:0}
.masthead .meta{margin-left:auto;font-family:var(--font-mono);font-size:12px;color:var(--ink-3);text-align:right}

/* ── Baromètre d'impact (signature) ───────────────── */
.barometre{padding:30px 0 6px}
.baro-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;margin-bottom:14px}
.baro-head h2{font-family:var(--font-display);font-size:16px;font-weight:700;letter-spacing:-.01em}
.baro-head .periode{font-family:var(--font-mono);font-size:12px;color:var(--ink-3)}
.baro-bar{display:flex;gap:2px;height:34px;border-radius:5px;overflow:hidden}
.baro-seg{display:block;height:100%;min-width:8px;padding:0;transition:opacity .15s ease;position:relative}
.baro-seg[aria-pressed="true"]::after{content:"";position:absolute;inset:0;border:2px solid var(--ink);border-radius:2px}
.baro-bar.filtered .baro-seg[aria-pressed="false"]{opacity:.35}
.baro-legend{display:flex;flex-wrap:wrap;gap:4px 18px;margin-top:12px}
.baro-legend button{display:flex;align-items:center;gap:7px;font-size:13.5px;color:var(--ink-2);padding:3px 2px}
.baro-legend button[aria-pressed="true"]{color:var(--ink);font-weight:600}
.baro-legend .pastille{width:10px;height:10px;border-radius:3px;flex:none}
.baro-legend .n{font-family:var(--font-mono);font-size:12px;color:var(--ink-3)}

/* ── Filtres ──────────────────────────────────────── */
.filtres{position:sticky;top:0;z-index:5;background:var(--paper);padding:16px 0 14px;border-bottom:1px solid var(--hairline)}
.filtres .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.recherche{flex:1 1 220px;max-width:340px;padding:8px 12px;border:1px solid var(--hairline);border-radius:6px;background:var(--surface);font:inherit;font-size:14px;color:var(--ink)}
.recherche::placeholder{color:var(--ink-3)}
.chip{padding:5px 12px;border:1px solid var(--hairline);border-radius:99px;background:var(--surface);font-size:13px;color:var(--ink-2);white-space:nowrap}
.chip[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.compteur{margin-left:auto;font-family:var(--font-mono);font-size:12px;color:var(--ink-3)}

/* ── Cartes ───────────────────────────────────────── */
.liste{padding:22px 0 10px;display:flex;flex-direction:column;gap:14px}
.carte{background:var(--surface);border:1px solid var(--hairline);border-left-width:3px;border-radius:6px;padding:18px 22px 16px}
.carte.i-eleve{border-left-color:var(--eleve-bar)}
.carte.i-moyen{border-left-color:var(--moyen-bar)}
.carte.i-faible{border-left-color:var(--faible-bar)}
.carte.i-informatif{border-left-color:var(--info-bar)}
.carte.i-attente{border-left-color:var(--attente-bar);border-left-style:dashed}
.carte-tete{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-bottom:8px}
.carte-date{font-family:var(--font-mono);font-size:12px;color:var(--ink-3)}
.carte-cat{font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em}
.badge{margin-left:auto;font-size:12px;font-weight:600;padding:3px 10px;border-radius:4px;white-space:nowrap}
.badge.i-eleve{color:var(--eleve-text);background:var(--eleve-bg)}
.badge.i-moyen{color:var(--moyen-text);background:var(--moyen-bg)}
.badge.i-faible{color:var(--faible-text);background:var(--faible-bg)}
.badge.i-informatif{color:var(--info-text);background:var(--info-bg)}
.badge.i-attente{color:var(--attente-text);background:var(--attente-bg)}
.carte h3{font-family:var(--font-display);font-size:17.5px;font-weight:700;letter-spacing:-.015em;line-height:1.35;margin-bottom:8px}
.carte h3 a{text-decoration:none}
.carte h3 a:hover{text-decoration:underline;text-underline-offset:3px}
.carte .resume{color:var(--ink-2);margin-bottom:12px}
.carte-pied{display:flex;flex-wrap:wrap;gap:5px 8px;align-items:center;font-size:12.5px;color:var(--ink-3)}
.tag{padding:2px 9px;border:1px solid var(--hairline);border-radius:99px;background:var(--paper)}
.concernes{margin-left:2px}
.echeance{font-family:var(--font-mono);font-size:12px;color:var(--moyen-text)}
details.actions{margin-top:12px;border-top:1px solid var(--hairline);padding-top:10px}
details.actions summary{cursor:pointer;font-size:13px;font-weight:600;color:var(--ink-2);list-style:none;display:flex;align-items:center;gap:7px}
details.actions summary::before{content:"▸";font-size:11px;transition:transform .15s ease}
details.actions[open] summary::before{transform:rotate(90deg)}
details.actions ul{margin:10px 0 2px 4px;padding-left:16px;color:var(--ink-2);font-size:14px}
details.actions li{margin-bottom:5px}
.vide{padding:60px 0;text-align:center;color:var(--ink-3)}
.vide strong{display:block;color:var(--ink-2);margin-bottom:4px}

/* ── Pied de page ─────────────────────────────────── */
.pied{border-top:1px solid var(--hairline);margin-top:36px;padding:26px 0 44px;font-size:13px;color:var(--ink-3)}
.pied p{max-width:640px;margin-bottom:8px}
.pied .mono{font-family:var(--font-mono);font-size:11.5px}

@media (max-width:640px){
  .masthead .meta{margin-left:0;text-align:left}
  .badge{margin-left:0}
  .carte{padding:15px 16px 13px}
}
@media (prefers-reduced-motion:reduce){
  *{transition:none!important}
}
</style>
</head>
<body>

<header class="masthead">
  <div class="wrap">
    <div class="brand"><span class="dot" aria-hidden="true"></span>VIGIE <span class="brand-sub">Veille réglementaire suisse · analyse assistée par IA</span></div>
    <div class="meta">Sources : __SOURCES__<br>Mise à jour : __UPDATED__</div>
  </div>
</header>

<section class="barometre wrap" aria-labelledby="baro-titre">
  <div class="baro-head">
    <h2 id="baro-titre">Niveau d'impact des publications</h2>
    <span class="periode" id="baro-periode"></span>
  </div>
  <div class="baro-bar" id="baro-bar" role="group" aria-label="Filtrer par niveau d'impact"></div>
  <div class="baro-legend" id="baro-legend"></div>
</section>

<div class="filtres">
  <div class="wrap row">
    <input type="search" id="recherche" class="recherche" placeholder="Rechercher un titre, un thème…" aria-label="Rechercher dans les publications">
    <span id="chips-domaines" style="display:contents"></span>
    <span class="compteur" id="compteur" role="status"></span>
  </div>
</div>

<main class="liste wrap" id="liste" aria-live="polite"></main>

<footer class="pied">
  <div class="wrap">
    <p><strong>Méthodologie.</strong> Vigie collecte automatiquement les publications officielles des régulateurs suisses (flux RSS FINMA), puis chaque publication est analysée par un modèle d'IA (Claude, Anthropic) selon une grille de lecture Risk Management : niveau d'impact, établissements concernés, actions recommandées pour la seconde ligne de défense.</p>
    <p>Les analyses sont générées par IA et fournies à titre indicatif : elles ne remplacent ni la lecture des textes officiels, ni un avis juridique ou de conformité.</p>
    <p class="mono">Vigie v1.0 — projet indépendant RegTech · Cédric Savioz · conception et développement avec Claude Code</p>
  </div>
</footer>

<script id="vigie-data" type="application/json">__DATA_JSON__</script>
<script>
"use strict";
const DATA = JSON.parse(document.getElementById("vigie-data").textContent);
const ITEMS = DATA.items;

const NIVEAUX = [
  {id:"eleve",       label:"Impact élevé",  bar:"var(--eleve-bar)"},
  {id:"moyen",       label:"Impact moyen",  bar:"var(--moyen-bar)"},
  {id:"faible",      label:"Impact faible", bar:"var(--faible-bar)"},
  {id:"informatif",  label:"Informatif",    bar:"var(--info-bar)"},
  {id:"attente",     label:"En attente d'analyse", bar:"var(--attente-bar)"}
];

const fmtDate = new Intl.DateTimeFormat("fr-CH",{day:"numeric",month:"long",year:"numeric"});
const fmtMois = new Intl.DateTimeFormat("fr-CH",{month:"short",year:"numeric"});

function niveauDe(item){
  return item.analyse ? item.analyse.niveau_impact : "attente";
}
function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ── État des filtres ── */
const etat = {impact:null, domaine:null, q:""};

/* ── Baromètre ── */
function renderBarometre(){
  const counts = Object.fromEntries(NIVEAUX.map(n => [n.id, 0]));
  ITEMS.forEach(i => counts[niveauDe(i)]++);
  const total = ITEMS.length;

  const bar = document.getElementById("baro-bar");
  const legend = document.getElementById("baro-legend");
  bar.innerHTML = ""; legend.innerHTML = "";
  bar.classList.toggle("filtered", etat.impact !== null);

  NIVEAUX.forEach(n => {
    if(!counts[n.id]) return;
    const pct = (100 * counts[n.id] / total).toFixed(2);
    const seg = document.createElement("button");
    seg.className = "baro-seg";
    seg.style.width = pct + "%";
    seg.style.background = n.bar;
    seg.setAttribute("aria-pressed", String(etat.impact === n.id));
    seg.setAttribute("aria-label", `${n.label} : ${counts[n.id]} publication(s). Filtrer.`);
    seg.title = `${n.label} — ${counts[n.id]}`;
    seg.onclick = () => { etat.impact = (etat.impact === n.id) ? null : n.id; renderAll(); };
    bar.appendChild(seg);

    const leg = document.createElement("button");
    leg.setAttribute("aria-pressed", String(etat.impact === n.id));
    leg.innerHTML = `<span class="pastille" style="background:${n.bar}"></span>${esc(n.label)} <span class="n">${counts[n.id]}</span>`;
    leg.onclick = seg.onclick;
    legend.appendChild(leg);
  });

  const dates = ITEMS.map(i => i.date).filter(Boolean).sort();
  if(dates.length){
    document.getElementById("baro-periode").textContent =
      `${fmtMois.format(new Date(dates[0]))} → ${fmtMois.format(new Date(dates[dates.length-1]))} · ${total} publications`;
  }
}

/* ── Chips domaines ── */
function renderChips(){
  const freq = {};
  ITEMS.forEach(i => (i.analyse?.domaines || []).forEach(d => freq[d] = (freq[d]||0)+1));
  const tops = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,6).map(e => e[0]);
  const zone = document.getElementById("chips-domaines");
  zone.innerHTML = "";
  tops.forEach(d => {
    const c = document.createElement("button");
    c.className = "chip";
    c.textContent = d;
    c.setAttribute("aria-pressed", String(etat.domaine === d));
    c.onclick = () => { etat.domaine = (etat.domaine === d) ? null : d; renderAll(); };
    zone.appendChild(c);
  });
}

/* ── Cartes ── */
function carteHTML(item){
  const n = niveauDe(item);
  const niveau = NIVEAUX.find(x => x.id === n);
  const a = item.analyse;
  const domaines = (a?.domaines || []).map(d => `<span class="tag">${esc(d)}</span>`).join("");
  const actions = (a?.actions_risk_manager || []);
  return `
  <article class="carte i-${n}">
    <div class="carte-tete">
      <span class="carte-date">${esc(fmtDate.format(new Date(item.date)))}</span>
      <span class="carte-cat">${esc(item.categorie || item.source)}</span>
      <span class="badge i-${n}">${esc(niveau.label)}</span>
    </div>
    <h3><a href="${esc(item.lien)}" target="_blank" rel="noopener">${esc(item.titre)}</a></h3>
    <p class="resume">${esc(a ? a.resume : item.description)}</p>
    <div class="carte-pied">
      ${domaines}
      ${a?.etablissements_concernes ? `<span class="concernes">Concernés : ${esc(a.etablissements_concernes)}</span>` : ""}
      ${a?.echeance ? `<span class="echeance">Échéance : ${esc(a.echeance)}</span>` : ""}
    </div>
    ${actions.length ? `
    <details class="actions">
      <summary>Actions recommandées pour le Risk Manager (${actions.length})</summary>
      <ul>${actions.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </details>` : ""}
  </article>`;
}

function renderListe(){
  const q = etat.q.trim().toLowerCase();
  const visibles = ITEMS.filter(i => {
    if(etat.impact && niveauDe(i) !== etat.impact) return false;
    if(etat.domaine && !(i.analyse?.domaines || []).includes(etat.domaine)) return false;
    if(q){
      const corpus = [i.titre, i.description, i.analyse?.resume, ...(i.analyse?.domaines||[]), i.analyse?.etablissements_concernes]
        .filter(Boolean).join(" ").toLowerCase();
      if(!corpus.includes(q)) return false;
    }
    return true;
  });

  const liste = document.getElementById("liste");
  liste.innerHTML = visibles.length
    ? visibles.map(carteHTML).join("")
    : `<div class="vide"><strong>Aucune publication ne correspond aux filtres.</strong>Élargissez la recherche ou réinitialisez les filtres.</div>`;

  document.getElementById("compteur").textContent =
    visibles.length === ITEMS.length ? `${ITEMS.length} publications` : `${visibles.length} / ${ITEMS.length}`;
}

function renderAll(){
  renderBarometre();
  renderChips();
  renderListe();
}

document.getElementById("recherche").addEventListener("input", e => { etat.q = e.target.value; renderListe(); });
renderAll();
</script>
</body>
</html>
"""

MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin",
           "juillet", "août", "septembre", "octobre", "novembre", "décembre"]


def _date_fr(iso: str | None) -> str:
    if not iso:
        return "—"
    dt = datetime.fromisoformat(iso).astimezone(timezone.utc)
    return f"{dt.day} {MOIS_FR[dt.month - 1]} {dt.year}"


def render_site(data: dict):
    sources = " · ".join(sorted({i["source"] for i in data["items"]})) or "FINMA"
    payload = json.dumps({"items": data["items"]}, ensure_ascii=False)
    # Évite la fermeture prématurée du bloc <script type="application/json">
    payload = payload.replace("</", "<\\/")

    html_out = (
        TEMPLATE
        .replace("__DATA_JSON__", payload)
        .replace("__UPDATED__", _date_fr(data.get("updated_at")))
        .replace("__SOURCES__", sources)
    )
    config.SITE_DIR.mkdir(parents=True, exist_ok=True)
    config.SITE_FILE.write_text(html_out, encoding="utf-8")
    return config.SITE_FILE
