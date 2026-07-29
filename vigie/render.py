"""Génération du site statique (dashboard HTML autonome, sans dépendance externe).

Direction artistique (héritée de la maquette produit Vigie v2) :
rigueur typographique suisse, interface « encre sur papier » quasi monochrome,
la couleur est réservée à la sémantique du risque, aucun arrondi ni ombre.
"""

import json
from datetime import datetime, timezone

from . import config

TEMPLATE = r"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vigie — Veille réglementaire assistée par IA</title>
<meta name="description" content="Publications des régulateurs (FINMA, BNS, BRI, BCE, EBA, ESMA) analysées automatiquement par IA du point de vue d'un Risk Manager : impact par profil d'établissement, actions recommandées.">
<style>
:root{
  --paper:#F2F4F6;
  --surface:#FFFFFF;
  --surface-2:#FAFBFC;
  --ink:#152435;
  --ink-2:#3C4C5E;
  --ink-3:#5A6B7E;
  --ink-4:#96A3B5;
  --hairline:#DCE2EA;
  --hairline-2:#EEF1F5;

  /* Couleur = sémantique du risque uniquement, toujours accompagnée d'un libellé */
  --eleve:#C0303F;
  --moyen:#C77F0F;
  --faible:#3B72C0;
  --informatif:#96A3B5;
  --attente:#C5CDD8;

  --font-ui:"Segoe UI","Helvetica Neue",Helvetica,Arial,sans-serif;
  --font-mono:"Cascadia Code","Cascadia Mono",Consolas,Menlo,ui-monospace,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{background:var(--paper);color:var(--ink);font-family:var(--font-ui);font-size:15px;line-height:1.55}
a{color:inherit}
button{font:inherit;color:inherit;background:none;border:none;cursor:pointer;border-radius:0}
:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.wrap{max-width:1100px;margin:0 auto;padding:0 24px}

/* ── En-tête ── */
.masthead{position:sticky;top:0;z-index:20;background:rgba(242,244,246,.94);backdrop-filter:blur(4px);border-bottom:1px solid var(--hairline)}
.masthead .wrap{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 18px;padding-top:14px;padding-bottom:12px}
.brand{font-size:17px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.brand-sub{font-size:13.5px;color:var(--ink-3);letter-spacing:0;text-transform:none;font-weight:400}
.masthead .meta{margin-left:auto;font-family:var(--font-mono);font-size:11.5px;color:var(--ink-4);text-align:right}

/* ── Bandeau d'intro ── */
.intro{background:var(--surface);border-bottom:1px solid var(--hairline);padding:30px 0 26px}
.intro h1{font-size:clamp(22px,3.4vw,30px);font-weight:700;letter-spacing:-.015em;line-height:1.15;max-width:24ch}
.intro p{margin-top:8px;color:var(--ink-2);max-width:68ch;font-size:14.5px}
.intro .regulateurs{margin-top:14px;padding-top:12px;border-top:1px solid var(--hairline-2);font-family:var(--font-mono);font-size:11.5px;color:var(--ink-4);letter-spacing:.02em}

/* ── Sélecteur de profil ── */
.profils{padding:24px 0 4px}
.profils .titre{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin-bottom:10px}
.profils h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.profils .note{font-size:12.5px;color:var(--ink-4)}
.profils .grille{display:flex;flex-wrap:wrap;gap:8px}
.profil-btn{padding:8px 13px;border:1px solid var(--hairline);background:var(--surface);font-size:13.5px;font-weight:600;color:var(--ink-2)}
.profil-btn:hover{border-color:var(--ink)}
.profil-btn[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}

/* ── Baromètre ── */
.barometre{padding:22px 0 4px}
.baro-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;margin-bottom:12px}
.baro-head h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.baro-head .periode{font-family:var(--font-mono);font-size:11.5px;color:var(--ink-4)}
.baro-bar{display:flex;gap:2px;height:30px}
.baro-seg{display:block;height:100%;min-width:8px;padding:0;position:relative;transition:opacity .15s ease}
.baro-seg[aria-pressed="true"]::after{content:"";position:absolute;inset:0;border:2px solid var(--ink)}
.baro-bar.filtered .baro-seg[aria-pressed="false"]{opacity:.3}
.baro-legend{display:flex;flex-wrap:wrap;gap:4px 18px;margin-top:10px}
.baro-legend button{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--ink-2);padding:3px 2px}
.baro-legend button[aria-pressed="true"]{color:var(--ink);font-weight:700}
.baro-legend .pastille{width:10px;height:10px;flex:none}
.baro-legend .n{font-family:var(--font-mono);font-size:11.5px;color:var(--ink-4)}

/* ── Filtres ── */
.filtres{position:sticky;top:47px;z-index:10;background:var(--paper);padding:14px 0 12px;border-bottom:1px solid var(--hairline)}
.filtres .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.recherche{flex:1 1 200px;max-width:320px;padding:8px 12px;border:1px solid var(--hairline);background:var(--surface);font:inherit;font-size:13.5px;color:var(--ink);border-radius:0}
.recherche::placeholder{color:var(--ink-4)}
.chip{padding:5px 11px;border:1px solid var(--hairline);background:var(--surface);font-size:12.5px;color:var(--ink-2);white-space:nowrap}
.chip[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.chip.src{font-family:var(--font-mono);font-size:11.5px}
.compteur{margin-left:auto;font-family:var(--font-mono);font-size:11.5px;color:var(--ink-4)}

/* ── Cartes ── */
.liste{padding:20px 0 10px;display:flex;flex-direction:column;gap:12px}
.carte{background:var(--surface);border:1px solid var(--hairline);border-left-width:3px;padding:16px 20px 14px}
.carte.i-eleve{border-left-color:var(--eleve)}
.carte.i-moyen{border-left-color:var(--moyen)}
.carte.i-faible{border-left-color:var(--faible)}
.carte.i-informatif{border-left-color:var(--informatif)}
.carte.i-attente{border-left-color:var(--attente);border-left-style:dashed}
.carte-tete{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-bottom:8px}
.carte-date{font-family:var(--font-mono);font-size:12px;color:var(--ink-3)}
.badge-src{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);border:1px solid var(--hairline);padding:2px 7px;white-space:nowrap}
.carte-cat{font-size:11.5px;color:var(--ink-4);text-transform:uppercase;letter-spacing:.06em}
.badge{margin-left:auto;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:3px 9px;border:1px solid;white-space:nowrap;flex-shrink:0;background:var(--surface)}
.badge.i-eleve{color:var(--eleve);border-color:var(--eleve)}
.badge.i-moyen{color:var(--moyen);border-color:var(--moyen)}
.badge.i-faible{color:var(--faible);border-color:var(--faible)}
.badge.i-informatif{color:var(--ink-3);border-color:var(--informatif)}
.badge.i-attente{color:var(--ink-4);border-color:var(--attente);border-style:dashed}
.carte h3{font-size:16px;font-weight:600;letter-spacing:-.01em;line-height:1.35;margin-bottom:7px}
.carte h3 a{text-decoration:none}
.carte h3 a:hover{text-decoration:underline;text-underline-offset:3px}
.carte .resume{color:var(--ink-2);font-size:14px;margin-bottom:10px}
.carte-pied{display:flex;flex-wrap:wrap;gap:5px 8px;align-items:center;font-size:12px;color:var(--ink-3);border-top:1px solid var(--hairline-2);padding-top:9px}
.tag{padding:2px 8px;border:1px solid var(--hairline);background:var(--paper)}
.concernes{margin-left:2px}
.echeance{font-family:var(--font-mono);font-size:11.5px;color:var(--moyen)}
.lien-source{margin-left:auto;font-weight:600;font-size:12.5px;color:var(--ink);text-decoration:none;white-space:nowrap}
.lien-source:hover{text-decoration:underline;text-underline-offset:3px}
details.actions{margin-top:10px;border-top:1px solid var(--hairline-2);padding-top:9px}
details.actions summary{cursor:pointer;font-size:12.5px;font-weight:600;color:var(--ink-2);list-style:none;display:flex;align-items:center;gap:7px}
details.actions summary::-webkit-details-marker{display:none}
details.actions summary::before{content:"▸";font-size:10px;transition:transform .15s ease}
details.actions[open] summary::before{transform:rotate(90deg)}
details.actions ul{margin:9px 0 2px 4px;padding-left:16px;color:var(--ink-2);font-size:13.5px}
details.actions li{margin-bottom:4px}
.vide{padding:52px 24px;text-align:center;color:var(--ink-3);border:1px dashed var(--hairline);background:var(--surface)}
.vide strong{display:block;color:var(--ink-2);margin-bottom:4px}

/* ── Méthodologie (bandeau encre) ── */
.methodo{background:var(--ink);color:var(--paper);margin-top:40px;padding:36px 0 40px}
.methodo h2{font-size:20px;font-weight:700;letter-spacing:-.01em;margin-bottom:10px}
.methodo p{color:#C7D0DB;font-size:14px;max-width:76ch;margin-bottom:8px}
.methodo .pipeline{display:flex;flex-wrap:wrap;gap:24px;margin:20px 0 4px;padding-top:18px;border-top:1px solid #2A3E54}
.methodo .etape{flex:1 1 200px;max-width:260px}
.methodo .etape .num{font-family:var(--font-mono);font-size:11.5px;color:#96A3B5}
.methodo .etape h3{font-size:14.5px;font-weight:600;margin:4px 0 4px;color:var(--paper)}
.methodo .etape p{font-size:13px;color:#C7D0DB}

/* ── Pied de page ── */
.pied{padding:22px 0 40px;font-family:var(--font-mono);font-size:11.5px;color:var(--ink-4)}
.pied .wrap{display:flex;flex-wrap:wrap;gap:6px 24px;justify-content:space-between}
.pied a{color:var(--ink-3)}

@media (max-width:640px){
  .masthead .meta{display:none}
  .badge{margin-left:0}
  .carte{padding:14px 14px 12px}
  .lien-source{margin-left:0}
  .filtres{top:44px}
}
@media (prefers-reduced-motion:reduce){
  *{transition:none!important;scroll-behavior:auto!important}
}
</style>
</head>
<body>

<header class="masthead">
  <div class="wrap">
    <span class="brand">Vigie</span>
    <span class="brand-sub">Veille réglementaire assistée par IA</span>
    <span class="meta">__NB_SOURCES__ sources officielles · mise à jour __UPDATED__</span>
  </div>
</header>

<section class="intro">
  <div class="wrap">
    <h1>Chaque texte réglementaire, traduit en actions pour votre établissement.</h1>
    <p>Vigie collecte chaque jour les publications officielles des régulateurs et banques centrales,
    puis chaque texte est analysé par IA selon une grille Risk Management : niveau d'impact par profil
    d'établissement, périmètres concernés et actions recommandées pour la seconde ligne de défense.</p>
    <div class="regulateurs">__SOURCES_MONO__</div>
  </div>
</section>

<section class="profils wrap" aria-labelledby="profils-titre">
  <div class="titre">
    <h2 id="profils-titre">Votre établissement</h2>
    <span class="note">Le flux et les niveaux d'impact se recomposent selon le profil choisi.</span>
  </div>
  <div class="grille" id="profils-grille" role="group" aria-label="Choisir un profil d'établissement"></div>
</section>

<section class="barometre wrap" aria-labelledby="baro-titre">
  <div class="baro-head">
    <h2 id="baro-titre">Niveau d'impact</h2>
    <span class="periode" id="baro-periode"></span>
  </div>
  <div class="baro-bar" id="baro-bar" role="group" aria-label="Filtrer par niveau d'impact"></div>
  <div class="baro-legend" id="baro-legend"></div>
</section>

<div class="filtres">
  <div class="wrap row">
    <input type="search" id="recherche" class="recherche" placeholder="Rechercher un titre, un thème…" aria-label="Rechercher dans les publications">
    <span id="chips-sources" style="display:contents"></span>
    <span id="chips-domaines" style="display:contents"></span>
    <span class="compteur" id="compteur" role="status"></span>
  </div>
</div>

<main class="liste wrap" id="liste" aria-live="polite"></main>

<section class="methodo" id="methodologie">
  <div class="wrap">
    <h2>Méthodologie et limites</h2>
    <div class="pipeline">
      <div class="etape"><span class="num">01</span><h3>Collecte multi-sources</h3>
        <p>Flux officiels FINMA, BNS, BRI / Comité de Bâle, BCE Supervision, EBA et ESMA, collectés automatiquement chaque jour.</p></div>
      <div class="etape"><span class="num">02</span><h3>Analyse d'impact par IA</h3>
        <p>Chaque publication est analysée par un modèle Claude (Anthropic) selon une grille Risk Management documentée et versionnée.</p></div>
      <div class="etape"><span class="num">03</span><h3>Priorisation par profil</h3>
        <p>Le niveau d'impact est attribué profil par profil : une même publication peut être critique pour une banque privée et absente pour une caisse de pension.</p></div>
      <div class="etape"><span class="num">04</span><h3>Actions recommandées</h3>
        <p>Pour chaque texte, des actions concrètes pour la seconde ligne de défense : cartographie des risques, SCI, gap analysis, information au management.</p></div>
    </div>
    <p style="margin-top:16px">Les analyses sont générées par IA et fournies à titre indicatif : elles ne remplacent ni la
    lecture des textes officiels, ni un avis juridique ou de conformité, ni l'appréciation des organes de l'établissement.</p>
  </div>
</section>

<footer class="pied">
  <div class="wrap">
    <span>VIGIE — VEILLE RÉGLEMENTAIRE · CH — projet indépendant RegTech de Cédric Savioz</span>
    <span>conçu et développé avec Claude Code · <a href="https://github.com/CedricSavioz/vigie" target="_blank" rel="noopener">code source</a></span>
  </div>
</footer>

<script id="vigie-data" type="application/json">__DATA_JSON__</script>
<script>
"use strict";
const DATA = JSON.parse(document.getElementById("vigie-data").textContent);
const ITEMS = DATA.items;
const PROFILS = DATA.profils;

const NIVEAUX = [
  {id:"eleve",      label:"Impact élevé",  poids:0, couleur:"var(--eleve)"},
  {id:"moyen",      label:"Impact moyen",  poids:1, couleur:"var(--moyen)"},
  {id:"faible",     label:"Impact faible", poids:2, couleur:"var(--faible)"},
  {id:"informatif", label:"Informatif",    poids:3, couleur:"var(--informatif)"},
  {id:"attente",    label:"En attente d'analyse", poids:4, couleur:"var(--attente)"}
];

const fmtDate = new Intl.DateTimeFormat("fr-CH",{day:"2-digit",month:"2-digit",year:"numeric"});
const fmtMois = new Intl.DateTimeFormat("fr-CH",{month:"short",year:"numeric"});

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ── État ── */
const etat = {profil:null, impact:null, source:null, domaine:null, q:""};

/* Niveau d'un item selon le profil actif.
   null = non pertinent pour ce profil (masqué). */
function niveauDe(item){
  if(!item.analyse) return "attente";
  if(!etat.profil) return item.analyse.niveau_impact;
  const impacts = item.analyse.impacts_par_profil;
  if(impacts === undefined) return item.analyse.niveau_impact; // analyse ancienne sans profils
  return impacts[etat.profil] ?? null;
}

function visibles(){
  const q = etat.q.trim().toLowerCase();
  return ITEMS.filter(i => {
    const n = niveauDe(i);
    if(n === null) return false;
    if(etat.impact && n !== etat.impact) return false;
    if(etat.source && i.source !== etat.source) return false;
    if(etat.domaine && !(i.analyse?.domaines || []).includes(etat.domaine)) return false;
    if(q){
      const corpus = [i.titre, i.description, i.analyse?.resume, ...(i.analyse?.domaines||[]), i.analyse?.etablissements_concernes, i.source]
        .filter(Boolean).join(" ").toLowerCase();
      if(!corpus.includes(q)) return false;
    }
    return true;
  });
}

/* ── Sélecteur de profil ── */
function renderProfils(){
  const zone = document.getElementById("profils-grille");
  zone.innerHTML = "";
  const tous = document.createElement("button");
  tous.className = "profil-btn";
  tous.textContent = "Tous les profils";
  tous.setAttribute("aria-pressed", String(etat.profil === null));
  tous.onclick = () => { etat.profil = null; etat.impact = null; renderAll(); };
  zone.appendChild(tous);
  PROFILS.forEach(p => {
    const b = document.createElement("button");
    b.className = "profil-btn";
    b.textContent = p.label;
    b.setAttribute("aria-pressed", String(etat.profil === p.id));
    b.onclick = () => {
      etat.profil = (etat.profil === p.id) ? null : p.id;
      etat.impact = null;
      renderAll();
    };
    zone.appendChild(b);
  });
}

/* ── Baromètre ── */
function renderBarometre(){
  // Comptes sur la population du profil actif (hors filtre impact)
  const impactSauve = etat.impact; etat.impact = null;
  const pop = visibles();
  etat.impact = impactSauve;

  const counts = Object.fromEntries(NIVEAUX.map(n => [n.id, 0]));
  pop.forEach(i => counts[niveauDe(i)]++);
  const total = pop.length || 1;

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
    seg.style.background = n.couleur;
    seg.setAttribute("aria-pressed", String(etat.impact === n.id));
    seg.setAttribute("aria-label", `${n.label} : ${counts[n.id]} publication(s). Filtrer.`);
    seg.title = `${n.label} — ${counts[n.id]}`;
    seg.onclick = () => { etat.impact = (etat.impact === n.id) ? null : n.id; renderAll(); };
    bar.appendChild(seg);

    const leg = document.createElement("button");
    leg.setAttribute("aria-pressed", String(etat.impact === n.id));
    leg.innerHTML = `<span class="pastille" style="background:${n.couleur}"></span>${esc(n.label)} <span class="n">${counts[n.id]}</span>`;
    leg.onclick = seg.onclick;
    legend.appendChild(leg);
  });

  const dates = pop.map(i => i.date).filter(Boolean).sort();
  const profilLabel = etat.profil ? (PROFILS.find(p => p.id === etat.profil)?.label ?? "") : "tous profils";
  document.getElementById("baro-periode").textContent = dates.length
    ? `${fmtMois.format(new Date(dates[0]))} → ${fmtMois.format(new Date(dates[dates.length-1]))} · ${pop.length} publication(s) · ${profilLabel}`
    : `aucune publication · ${profilLabel}`;
}

/* ── Chips sources et domaines ── */
function renderChips(){
  const zoneS = document.getElementById("chips-sources");
  zoneS.innerHTML = "";
  DATA.sources.forEach(s => {
    const c = document.createElement("button");
    c.className = "chip src";
    c.textContent = s;
    c.setAttribute("aria-pressed", String(etat.source === s));
    c.onclick = () => { etat.source = (etat.source === s) ? null : s; renderAll(); };
    zoneS.appendChild(c);
  });

  const freq = {};
  ITEMS.forEach(i => (i.analyse?.domaines || []).forEach(d => freq[d] = (freq[d]||0)+1));
  const tops = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]);
  const zoneD = document.getElementById("chips-domaines");
  zoneD.innerHTML = "";
  tops.forEach(d => {
    const c = document.createElement("button");
    c.className = "chip";
    c.textContent = d;
    c.setAttribute("aria-pressed", String(etat.domaine === d));
    c.onclick = () => { etat.domaine = (etat.domaine === d) ? null : d; renderAll(); };
    zoneD.appendChild(c);
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
      <span class="carte-date">${item.date ? esc(fmtDate.format(new Date(item.date))) : "—"}</span>
      <span class="badge-src">${esc(item.source)}</span>
      ${item.categorie ? `<span class="carte-cat">${esc(item.categorie)}</span>` : ""}
      <span class="badge i-${n}">${esc(niveau.label)}</span>
    </div>
    <h3><a href="${esc(item.lien)}" target="_blank" rel="noopener">${esc(item.titre)}</a></h3>
    <p class="resume">${esc(a ? a.resume : (item.description || "Publication en attente d'analyse."))}</p>
    <div class="carte-pied">
      ${domaines}
      ${a?.etablissements_concernes ? `<span class="concernes">Concerne : ${esc(a.etablissements_concernes)}</span>` : ""}
      ${a?.echeance ? `<span class="echeance">Échéance : ${esc(a.echeance)}</span>` : ""}
      <a class="lien-source" href="${esc(item.lien)}" target="_blank" rel="noopener">Lire le texte source →</a>
    </div>
    ${actions.length ? `
    <details class="actions">
      <summary>Actions recommandées pour le Risk Manager (${actions.length})</summary>
      <ul>${actions.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </details>` : ""}
  </article>`;
}

function renderListe(){
  const liste = document.getElementById("liste");
  const items = visibles();

  // Sans profil : journal anté-chronologique. Avec profil : tri par impact puis date.
  const poids = Object.fromEntries(NIVEAUX.map(n => [n.id, n.poids]));
  const tri = items.slice().sort((x, y) => {
    if(etat.profil){
      const dp = poids[niveauDe(x)] - poids[niveauDe(y)];
      if(dp) return dp;
    }
    return (y.date || "").localeCompare(x.date || "");
  });

  liste.innerHTML = tri.length
    ? tri.map(carteHTML).join("")
    : `<div class="vide"><strong>Aucune publication ne correspond aux filtres.</strong>Élargissez la recherche, changez de profil ou réinitialisez les filtres.</div>`;

  document.getElementById("compteur").textContent =
    tri.length === ITEMS.length ? `${ITEMS.length} publications` : `${tri.length} / ${ITEMS.length}`;
}

function renderAll(){
  renderProfils();
  renderBarometre();
  renderChips();
  renderListe();
}

document.getElementById("recherche").addEventListener("input", e => { etat.q = e.target.value; renderBarometre(); renderListe(); });
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
    sources = [s["nom"] for s in config.SOURCES]
    payload = json.dumps(
        {"items": data["items"], "profils": config.PROFILS, "sources": sources},
        ensure_ascii=False,
    )
    # Évite la fermeture prématurée du bloc <script type="application/json">
    payload = payload.replace("</", "<\\/")

    html_out = (
        TEMPLATE
        .replace("__DATA_JSON__", payload)
        .replace("__UPDATED__", _date_fr(data.get("updated_at")))
        .replace("__NB_SOURCES__", str(len(sources)))
        .replace("__SOURCES_MONO__", " · ".join(s.upper() for s in sources))
    )
    config.SITE_DIR.mkdir(parents=True, exist_ok=True)
    config.SITE_FILE.write_text(html_out, encoding="utf-8")
    return config.SITE_FILE
