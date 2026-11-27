/* Vídeo animado de revisão (SVG + JS): crescimento econômico, Caps. 8 e 9 do Mankiw.
   Personagens: Paulo (ciclista), Larissa (camisa rubro-negra do Flamengo) e Marcos (corredor).
   Narração: áudios pré-gerados em video/audio/ (durações em video/audio/manifest.js).
   Cada fala dura exatamente o tempo do seu áudio, então imagem e voz ficam sincronizadas.
   Campo "say": grafia usada só para a voz (pronúncia), quando difere da legenda. */
const SolowVideo = (() => {
  const W = 1280, H = 720;
  const AUDIO = typeof VIDEO_AUDIO !== "undefined" ? VIDEO_AUDIO : null;
  const AUDIO_BASE = "video/audio/";
  const PAD = 0.18; // respiro entre falas (s)
  const INK = "#1e293b";
  const CH = {
    paulo: { name: "Paulo", color: "#1d4ed8" },
    larissa: { name: "Larissa", color: "#c8102e" },
    marcos: { name: "Marcos", color: "#0e7490" },
    n: { name: "Narradora", color: "#334155" },
  };

  /* ================= utilidades ================= */
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, p) => a + (b - a) * p;
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const FONT = "Inter, 'Segoe UI', Roboto, Arial, sans-serif";
  const T = (x, y, s, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-size="${o.size || 22}" font-weight="${o.w || 600}" fill="${o.fill || INK}" text-anchor="${o.anchor || "middle"}" font-family="${FONT}"${o.op !== undefined ? ` opacity="${o.op}"` : ""}${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${esc(s)}</text>`;
  function wrap(text, max) {
    const words = text.split(" "), out = [];
    let cur = "";
    words.forEach((w) => { if ((cur + " " + w).trim().length > max) { out.push(cur.trim()); cur = w; } else cur += " " + w; });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  const seg = (ctx, li) => (ctx.li < li ? 0 : ctx.li > li ? 1 : ease(ctx.lp));
  const at = (ctx, li) => ctx.li >= li;
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  /* curva suave (Catmull-Rom → Bézier) */
  function smooth(pts) {
    if (pts.length < 2) return "";
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d;
  }
  /* membro afunilado (coxa, canela, braço) com pontas arredondadas */
  function limb(ax, ay, bx, by, wa, wb, fill) {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    return `<path d="M${f1(ax + nx * wa / 2)} ${f1(ay + ny * wa / 2)} L${f1(bx + nx * wb / 2)} ${f1(by + ny * wb / 2)} L${f1(bx - nx * wb / 2)} ${f1(by - ny * wb / 2)} L${f1(ax - nx * wa / 2)} ${f1(ay - ny * wa / 2)} Z" fill="${fill}"/><circle cx="${f1(ax)}" cy="${f1(ay)}" r="${f1(wa / 2)}" fill="${fill}"/><circle cx="${f1(bx)}" cy="${f1(by)}" r="${f1(wb / 2)}" fill="${fill}"/>`;
  }

  /* ================= definições (gradientes, sombras, textura) ================= */
  const grad = (id, stops, v = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${v ? 0 : 1}" y2="${v ? 1 : 0}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`).join("")}</linearGradient>`;
  const DEFS = `<defs>
    ${grad("gSky", [[0, "#5aa9e6"], [0.55, "#a9d6f5"], [1, "#e8f4fd"]])}
    ${grad("gSkyWarm", [[0, "#6fb0e6"], [0.6, "#f6d9b5"], [1, "#fbe3c4"]])}
    ${grad("gSkyStorm", [[0, "#232b38"], [0.6, "#465264"], [1, "#6b7686"]])}
    ${grad("gSkyNight", [[0, "#050d1e"], [1, "#16294a"]])}
    ${grad("gHillFar", [[0, "#a9c9b8"], [1, "#c7ddd0"]])}
    ${grad("gHillMid", [[0, "#7fb069"], [1, "#9cc584"]])}
    ${grad("gGrass", [[0, "#6fb35a"], [1, "#3f8a3a"]])}
    ${grad("gField", [[0, "#c9b458"], [1, "#a8913b"]])}
    ${grad("gWall", [[0, "#efe8de"], [1, "#d9cfc1"]])}
    ${grad("gWallCool", [[0, "#eef2f6"], [1, "#d9e1ea"]])}
    ${grad("gFloorWood", [[0, "#b98a5a"], [1, "#8a6038"]])}
    ${grad("gConcrete", [[0, "#d7d3cc"], [1, "#b9b3aa"]])}
    ${grad("gAsph", [[0, "#5d6372"], [1, "#363a45"]])}
    ${grad("gTrack", [[0, "#c95a3e"], [1, "#9b3a26"]])}
    ${grad("gPitch", [[0, "#3a9a45"], [1, "#25722f"]])}
    ${grad("gGlass", [[0, "#cfe8fa"], [0.5, "#9fcdee"], [1, "#7fb6de"]])}
    ${grad("gCard", [[0, "#ffffff"], [1, "#f4f7fb"]])}
    ${grad("gWater", [[0, "#7dd3fc"], [1, "#1d6fd8"]])}
    ${grad("gMetal", [[0, "#8592a3"], [0.35, "#eef2f6"], [0.6, "#c3ccd8"], [1, "#7b889a"]], false)}
    ${grad("gChrome", [[0, "#cbd5e1"], [0.5, "#ffffff"], [1, "#94a3b8"]])}
    ${grad("gSkin", [[0, "#d39a72"], [0.35, "#efc19c"], [0.65, "#efc19c"], [1, "#cf946b"]], false)}
    ${grad("gShade", [[0, "#000", 0.32], [0.3, "#000", 0], [0.7, "#000", 0], [1, "#000", 0.32]], false)}
    ${grad("gShadeV", [[0, "#fff", 0.18], [0.4, "#fff", 0], [1, "#000", 0.25]])}
    ${grad("gJeans", [[0, "#26446f"], [0.5, "#3a5d92"], [1, "#22406a"]], false)}
    ${grad("gHair", [[0, "#2a170c"], [0.5, "#4a2b17"], [1, "#24130a"]], false)}
    ${grad("gAreaBlue", [[0, "#3b82f6", 0.35], [1, "#3b82f6", 0]])}
    ${grad("gAreaGreen", [[0, "#16a34a", 0.32], [1, "#16a34a", 0]])}
    ${grad("gAreaOrange", [[0, "#ea580c", 0.32], [1, "#ea580c", 0]])}
    ${grad("gBarBlue", [[0, "#60a5fa"], [1, "#2563eb"]])}
    ${grad("gBarOrange", [[0, "#fdba74"], [1, "#ea580c"]])}
    ${grad("gBarGray", [[0, "#e2e8f0"], [1, "#94a3b8"]])}
    ${grad("gBarGreen", [[0, "#86efac"], [1, "#16a34a"]])}
    <radialGradient id="gSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe6"/><stop offset=".25" stop-color="#fff1b8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>
    <radialGradient id="gVignette" cx=".5" cy=".48" r=".78"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></radialGradient>
    <radialGradient id="gLamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7d6" stop-opacity=".9"/><stop offset="1" stop-color="#fff7d6" stop-opacity="0"/></radialGradient>
    <radialGradient id="gBlob" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <filter id="fShadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#0f172a" flood-opacity=".25"/></filter>
    <filter id="fSoft" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity=".22"/></filter>
    <filter id="fBlur"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="fGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .07 0"/></filter>
    <pattern id="pFla" width="40" height="13" patternUnits="userSpaceOnUse"><rect width="40" height="6.5" fill="#c8102e"/><rect y="6.5" width="40" height="6.5" fill="#141414"/></pattern>
    <pattern id="pBrick" width="44" height="22" patternUnits="userSpaceOnUse"><rect width="44" height="22" fill="#b5654a"/><path d="M0 0.5 H44 M0 11.5 H44 M11 0 V11 M33 11 V22" stroke="#a0533a" stroke-width="2"/></pattern>
    <pattern id="pTiles" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#d8d2c8"/><path d="M0 0.5 H60 M0.5 0 V60" stroke="#c4bdb2" stroke-width="2"/></pattern>
  </defs>`;

  /* ================= elementos de cenário ================= */
  const R = (x, y, w, h, fill, extra = "") => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${fill}" ${extra}/>`;
  const layer = (cam, depth, inner) => `<g transform="translate(${f1(-cam * depth)} 0)">${inner}</g>`;
  const sun = (x, y, r = 60) => `<circle cx="${x}" cy="${y}" r="${r * 2.6}" fill="url(#gSun)"/><circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="#fffdf0"/>`;
  function cloud(x, y, s, op = 1, dark = false) {
    const top = dark ? "#5b6575" : "#ffffff", bot = dark ? "#3c4554" : "#dbe7f2";
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${op}"><ellipse cx="0" cy="8" rx="92" ry="22" fill="${bot}"/><ellipse cx="-40" cy="-2" rx="46" ry="28" fill="${top}"/><ellipse cx="10" cy="-18" rx="52" ry="36" fill="${top}"/><ellipse cx="56" cy="-2" rx="40" ry="26" fill="${top}"/><ellipse cx="0" cy="6" rx="86" ry="16" fill="${top}"/></g>`;
  }
  function clouds(t, n = 3, y0 = 70, op = 0.95, dark = false) {
    let s = "";
    for (let i = 0; i < n; i++) s += cloud(((rnd(i) * 1600 + t * (5 + i * 2.5)) % 1760) - 240, y0 + rnd(i + 9) * 80, 0.6 + rnd(i + 3) * 0.6, op, dark);
    return s;
  }
  function hills(y, amp, fill, seed, w = W + 200) {
    let d = `M-100 ${H} L-100 ${y}`;
    for (let x = -100; x <= w; x += 60) d += ` L${x} ${f1(y - Math.sin(x / 210 + seed) * amp - Math.sin(x / 90 + seed * 2) * amp * 0.3)}`;
    return `<path d="${d} L${w} ${H} Z" fill="${fill}"/>`;
  }
  function tree(x, y, s = 1, c1 = "#3f8a3a", c2 = "#5cae4c") {
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="8" cy="2" rx="62" ry="12" fill="url(#gBlob)"/><path d="M-8 0 L-6 -80 Q0 -96 6 -80 L8 0Z" fill="#6b4529"/><path d="M-2 -60 L-26 -96 M2 -70 L24 -104" stroke="#6b4529" stroke-width="6" stroke-linecap="round"/>
      <circle cx="-30" cy="-104" r="34" fill="${c1}"/><circle cx="28" cy="-110" r="38" fill="${c1}"/><circle cx="0" cy="-138" r="40" fill="${c1}"/><circle cx="-8" cy="-96" r="30" fill="${c1}"/>
      <circle cx="-20" cy="-146" r="22" fill="${c2}" opacity=".9"/><circle cx="20" cy="-128" r="20" fill="${c2}" opacity=".8"/><circle cx="-36" cy="-112" r="14" fill="${c2}" opacity=".7"/></g>`;
  }
  /* prédio com face lateral (profundidade), janelas com reflexo */
  function building(x, y, w, h, c, o = {}) {
    const side = o.side === undefined ? 22 : o.side;
    let s = `<path d="M${x + w} ${y - h} l${side} ${-side * 0.5} v${h} l${-side} ${side * 0.5}z" fill="${c}"/><path d="M${x + w} ${y - h} l${side} ${-side * 0.5} v${h} l${-side} ${side * 0.5}z" fill="#000" opacity=".22"/>`;
    s += `<path d="M${x} ${y - h} l${side} ${-side * 0.5} h${w} l${-side} ${side * 0.5}z" fill="${c}"/><path d="M${x} ${y - h} l${side} ${-side * 0.5} h${w} l${-side} ${side * 0.5}z" fill="#fff" opacity=".25"/>`;
    s += R(x, y - h, w, h, c) + R(x, y - h, w, h, "url(#gShadeV)", 'opacity=".8"');
    const cols = Math.max(2, Math.floor(w / 30)), rows = Math.max(2, Math.floor(h / 38)), cw = (w - 16) / cols, rh = (h - 26) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const lit = rnd(x * 0.37 + i * 7 + j * 13) > (o.night ? 0.42 : 0.82);
      s += R(x + 9 + i * cw, y - h + 14 + j * rh, cw - 7, rh - 10, lit ? "#ffe9a8" : "url(#gGlass)", `rx="1.5" opacity="${lit ? 0.95 : 0.85}"`);
    }
    if (o.broken) s += `<path d="M${x - 2} ${y - h - 14} l${w * 0.25} ${h * 0.22} l${w * 0.2} ${-h * 0.08} l${w * 0.3} ${h * 0.28} L${x + w + side + 2} ${y - h - 14} Z" fill="${o.bg || "#3a4555"}"/>`;
    return s;
  }
  function lamp(x, y, on = false) {
    return `<rect x="${x - 3}" y="${y - 160}" width="6" height="160" fill="#334155"/><path d="M${x} ${y - 160} q24 -6 34 8" stroke="#334155" stroke-width="5" fill="none"/><rect x="${x + 26}" y="${y - 156}" width="18" height="8" rx="3" fill="#1f2937"/>${on ? `<circle cx="${x + 35}" cy="${y - 146}" r="40" fill="url(#gLamp)"/>` : ""}`;
  }
  function crowdBg(x0, x1, y, n, t, palette) {
    let s = "";
    for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * rnd(i * 3.1), yy = y + rnd(i * 5.7) * 8, c = palette[Math.floor(rnd(i * 1.7) * palette.length)]; s += `<g opacity=".55"><circle cx="${f1(x)}" cy="${f1(yy - 36 + Math.sin(t * 2 + i) * 0.8)}" r="7" fill="#c9a17e"/><rect x="${f1(x - 8)}" y="${f1(yy - 28)}" width="16" height="28" rx="6" fill="${c}"/></g>`; }
    return s;
  }
  function bicycle(x, y, s = 1, c = "#1d4ed8", spin = 0) {
    const r = 46;
    const wheel = (cx) => {
      let w = `<circle cx="${cx}" cy="${-r}" r="${r}" fill="none" stroke="#111827" stroke-width="8"/><circle cx="${cx}" cy="${-r}" r="${r - 5}" fill="none" stroke="url(#gChrome)" stroke-width="3"/>`;
      for (let k = 0; k < 12; k++) { const an = spin + (k * Math.PI) / 6; w += `<line x1="${cx}" y1="${-r}" x2="${f1(cx + Math.cos(an) * (r - 6))}" y2="${f1(-r + Math.sin(an) * (r - 6))}" stroke="#cbd5e1" stroke-width="1.2"/>`; }
      return w + `<circle cx="${cx}" cy="${-r}" r="6" fill="#475569"/>`;
    };
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="2" rx="120" ry="9" fill="url(#gBlob)"/>${wheel(-62)}${wheel(62)}
      <path d="M-62 ${-r} L-8 ${-r - 2} L28 ${-r - 60} L-20 ${-r - 62} Z M-8 ${-r - 2} L-26 ${-r - 80} M62 ${-r} L42 ${-r - 78} M28 ${-r - 60} L42 ${-r - 78}" stroke="${c}" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M-62 ${-r} L-8 ${-r - 2}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3 2"/>
      <circle cx="-8" cy="${-r - 2}" r="11" fill="none" stroke="#475569" stroke-width="4"/>
      <path d="M-42 ${-r - 84} q14 -6 30 0" stroke="#111827" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M36 ${-r - 82} h14 q12 0 12 12 q0 10 -10 10" stroke="#111827" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
  }
  function box(x, y, w, h, c = "#c69c6d") {
    return `<g><rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${c}"/><rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="url(#gShade)" opacity=".6"/><path d="M${x + w / 2 - 6} ${y - h} v${h}" stroke="#e8d3b5" stroke-width="10" opacity=".7"/><rect x="${x + 8}" y="${y - h + 10}" width="${w * 0.35}" height="10" fill="#fff" opacity=".7"/></g>`;
  }

  /* ================= ambientes (com camadas e paralaxe) ================= */
  const ENV = {
    campus(t, cam) {
      let s = R(0, 0, W, H, "url(#gSky)") + sun(1120, 100, 50) + clouds(t, 3, 60);
      s += layer(cam, 10, hills(330, 26, "url(#gHillFar)", 1));
      s += layer(cam, 25, `<g filter="url(#fSoft)">${R(250, 150, 780, 270, "#efe6d6")}${R(250, 150, 780, 270, "url(#gShadeV)", 'opacity=".5"')}<path d="M230 156 L640 60 L1050 156 Z" fill="#dccdb5"/><path d="M290 150 L640 72 L990 150 Z" fill="#e9dcc6"/>${R(250, 150, 780, 16, "#cdbfa6")}
        ${Array.from({ length: 10 }, (_, i) => R(282 + i * 74, 180, 26, 232, "#f8f3ea") + R(282 + i * 74, 180, 8, 232, "#fff", 'opacity=".5"') + R(278 + i * 74, 176, 34, 10, "#d6c8b0")).join("")}
        ${R(585, 300, 110, 120, "#6f4e32", 'rx="4"')}${R(590, 305, 48, 110, "#7f5a3a")}${R(642, 305, 48, 110, "#7f5a3a")}${T(640, 163, "UNIVERSIDADE", { size: 13, w: 800, fill: "#7a6a52", ls: 5 })}</g>`);
      s += layer(cam, 40, R(0, 410, W + 100, 310, "url(#gGrass)") + `<path d="M520 420 L760 420 L980 720 L300 720 Z" fill="url(#gConcrete)"/><path d="M0 560 L${W + 100} 535 L${W + 100} 600 L0 628 Z" fill="url(#gConcrete)"/>` + tree(130, 470, 1.25) + tree(1170, 470, 1.35) + tree(270, 440, 0.8, "#4a9643", "#68b95b") + tree(1020, 445, 0.85, "#4a9643", "#68b95b") + lamp(470, 560) + lamp(860, 545));
      return s;
    },
    delivery(t, cam) {
      let s = R(0, 0, W, H, "url(#gSkyWarm)") + clouds(t, 2, 50);
      s += layer(cam, 12, building(-20, 380, 160, 250, "#b9a593") + building(170, 380, 140, 200, "#c7b29c") + building(980, 380, 150, 230, "#a99889") + building(1150, 380, 160, 270, "#bfae9b"));
      s += layer(cam, 28, `<g filter="url(#fSoft)">${R(20, 150, 560, 310, "url(#pBrick)")}${R(20, 150, 560, 310, "url(#gShadeV)", 'opacity=".6"')}${R(0, 140, 600, 22, "#3f3f46")}${R(50, 184, 500, 58, "#16a34a", 'rx="6"')}${T(300, 224, "CENTRAL DE ENTREGAS", { size: 28, w: 900, fill: "#fff", ls: 2 })}${R(90, 286, 420, 174, "#2a2f38")}${Array.from({ length: 11 }, (_, i) => R(90, 292 + i * 15, 420, 3, "#4b5260")).join("")}</g>`);
      s += layer(cam, 45, R(0, 460, W + 120, 60, "url(#gConcrete)") + R(0, 518, W + 120, 202, "url(#gAsph)") + Array.from({ length: 12 }, (_, i) => R(i * 130 + 20, 610, 70, 8, "#e5e7eb", 'rx="3" opacity=".75"')).join("") + box(500, 470, 70, 56) + box(570, 470, 60, 44, "#b98b5c") + box(525, 414, 50, 40, "#d4ab7b"));
      return s;
    },
    market(t, cam) {
      let s = R(0, 0, W, H, "url(#gSkyWarm)") + clouds(t, 2, 50);
      s += layer(cam, 12, building(-30, 400, 230, 240, "#e2c3a1") + building(210, 400, 170, 190, "#d6ad97") + building(880, 400, 190, 220, "#cbb39e") + building(1080, 400, 230, 260, "#dfc8ae"));
      s += layer(cam, 40, R(-20, 400, W + 140, 320, "url(#pTiles)") + R(-20, 400, W + 140, 320, "url(#gShadeV)", 'opacity=".5"') +
        [[80, "#dc2626"], [470, "#16a34a"], [860, "#ea580c"]].map(([x, c], k) => {
          let st = `<g filter="url(#fSoft)">${R(x, 300, 320, 150, "#fdf6ea")}`;
          for (let i = 0; i < 8; i++) st += `<path d="M${x - 10 + i * 42.5} 248 h42.5 v46 q-21.25 16 -42.5 0 z" fill="${i % 2 ? "#fff" : c}"/>`;
          st += `${R(x - 16, 236, 352, 16, c, 'rx="5"')}${R(x + 4, 252, 9, 210, "#5b4330")}${R(x + 307, 252, 9, 210, "#5b4330")}${R(x + 16, 382, 288, 74, "#9c7349", 'rx="6"')}${R(x + 16, 382, 288, 74, "url(#gShadeV)", 'rx="6"')}`;
          for (let i = 0; i < 11; i++) { const cx = x + 38 + i * 25, cy = 372 - (i % 2) * 7, col = ["#ef4444", "#f97316", "#facc15", "#84cc16", "#a3e635"][(i + k) % 5]; st += `<circle cx="${cx}" cy="${cy}" r="12" fill="${col}"/><circle cx="${cx - 4}" cy="${cy - 4}" r="4" fill="#fff" opacity=".45"/>`; }
          return st + `</g>`;
        }).join(""));
      return s;
    },
    workshop(t, cam) {
      let s = R(0, 0, W, H, "url(#gWall)");
      s += layer(cam, 8, `${R(70, 80, 320, 200, "#cfe7f7")}${clouds(t, 2, 150, 0.85).replace(/<g /g, '<g clip-path="none" ')}${R(0, 0, 70, 300, "url(#gWall)")}${R(390, 0, 60, 300, "url(#gWall)")}${R(0, 0, 450, 80, "url(#gWall)")}${R(0, 280, 450, 20, "url(#gWall)")}<rect x="70" y="80" width="320" height="200" fill="none" stroke="#8a6d50" stroke-width="12"/><line x1="230" y1="80" x2="230" y2="280" stroke="#8a6d50" stroke-width="8"/><path d="M76 86 L160 86 L96 274 L76 274Z" fill="#fff" opacity=".18"/>`);
      s += layer(cam, 14, `${R(880, 80, 340, 220, "#c9a87c", 'rx="6"')}${Array.from({ length: 40 }, (_, k) => `<circle cx="${900 + (k % 8) * 42}" cy="${100 + Math.floor(k / 8) * 42}" r="3" fill="#a1835c"/>`).join("")}<path d="M930 130 v90" stroke="#475569" stroke-width="9" stroke-linecap="round"/><circle cx="930" cy="122" r="15" fill="none" stroke="#475569" stroke-width="7"/><path d="M1000 116 l34 96" stroke="#dc2626" stroke-width="11" stroke-linecap="round"/><rect x="1070" y="116" width="18" height="96" rx="7" fill="#f59e0b"/><circle cx="1160" cy="170" r="36" fill="none" stroke="#1f2937" stroke-width="9"/><circle cx="1160" cy="170" r="10" fill="#475569"/>`);
      s += layer(cam, 30, R(-20, 560, W + 100, 160, "url(#gFloorWood)") + Array.from({ length: 8 }, (_, i) => `<line x1="-20" y1="${582 + i * 18}" x2="${W + 80}" y2="${582 + i * 18}" stroke="#6e4a2b" stroke-width="1.5" opacity=".35"/>`).join("") + `<path d="M380 560 L900 560 L1000 720 L280 720Z" fill="#fff" opacity=".05"/>`);
      return s;
    },
    city(t, cam, o = {}) {
      const storm = o.storm;
      let s = R(0, 0, W, H, storm ? "url(#gSkyStorm)" : "url(#gSky)") + (storm ? clouds(t, 6, 30, 0.95, true) : sun(1120, 96, 48) + clouds(t, 3));
      s += layer(cam, 10, Array.from({ length: 14 }, (_, i) => R(i * 100 - 20, 280 - rnd(i) * 110, 86, 260 + rnd(i) * 110, storm ? "#3f4a5a" : "#a9bccf", 'opacity=".7"')).join(""));
      s += layer(cam, 26, [[10, 240, "#5f6f86"], [170, 310, "#8494aa"], [320, 220, "#6f7f96"], [460, 350, "#9aa9bc"], [610, 270, "#66768d"], [760, 330, "#8090a6"], [910, 250, "#5a6a81"], [1060, 310, "#93a2b6"], [1210, 260, "#6d7d94"]].map(([x, h, c], i) => building(x, 520, 128, h, c, { night: storm, broken: o.broken && i % 2 === 1, bg: "#323c4b" })).join(""));
      s += layer(cam, 45, R(-20, 512, W + 120, 14, "#a3a7ae") + R(-20, 524, W + 120, 196, "url(#gAsph)") + Array.from({ length: 12 }, (_, i) => R(i * 130 + 20, 615, 70, 8, "#e5e7eb", 'rx="3" opacity=".7"')).join("") + lamp(140, 524, storm) + lamp(1150, 524, storm));
      if (o.cranes) s += layer(cam, 26, [[330, 0], [900, 1]].map(([x, k]) => { const sw = Math.sin(t * 0.8 + k) * 20, hy = 250 + Math.sin(t * 1.2 + k) * 30; return `<g opacity="${o.cranes}"><path d="M${x} 520 V140 M${x + 14} 520 V140" stroke="#f59e0b" stroke-width="6"/>${Array.from({ length: 12 }, (_, j) => `<path d="M${x} ${150 + j * 31} l14 31" stroke="#f59e0b" stroke-width="3"/>`).join("")}<rect x="${x - 130}" y="134" width="290" height="12" fill="#f59e0b"/><rect x="${x - 130}" y="122" width="40" height="24" fill="#475569"/><line x1="${f1(x + 110 + sw)}" y1="146" x2="${f1(x + 110 + sw)}" y2="${f1(hy)}" stroke="#334155" stroke-width="2"/><rect x="${f1(x + 94 + sw)}" y="${f1(hy)}" width="32" height="20" fill="#64748b"/></g>`; }).join(""));
      if (storm) { let r = ""; for (let i = 0; i < 90; i++) { const x = ((rnd(i) * 1400 + t * 320) % 1400) - 60, y = ((rnd(i + 5) * 780 + t * 950) % 780) - 40; r += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x - 9)}" y2="${f1(y + 28)}" stroke="#cbd5e1" stroke-width="1.8" opacity=".55"/>`; } s += r + (Math.sin(t * 3.1) > 0.985 ? R(0, 0, W, H, "#fff", 'opacity=".35"') : ""); }
      return s;
    },
    farm(t, cam) {
      let s = R(0, 0, W, H, "url(#gSky)") + sun(1100, 100, 54) + clouds(t, 3);
      s += layer(cam, 8, hills(330, 30, "url(#gHillFar)", 2));
      s += layer(cam, 18, hills(380, 22, "url(#gHillMid)", 4) + `<g filter="url(#fSoft)">${R(880, 250, 230, 170, "#a51d1d")}${R(880, 250, 230, 170, "url(#gShadeV)")}<path d="M858 256 L995 168 L1132 256 Z" fill="#6f1717"/>${R(958, 330, 74, 90, "#f8fafc")}<path d="M958 330 l74 90 M1032 330 l-74 90" stroke="#a51d1d" stroke-width="6"/>${R(1130, 196, 72, 224, "#cbd5e1", 'rx="30"')}${R(1130, 196, 72, 224, "url(#gShade)", 'rx="30"')}<ellipse cx="1166" cy="198" rx="36" ry="16" fill="#94a3b8"/></g>`);
      s += layer(cam, 36, R(-20, 410, W + 120, 310, "url(#gField)") + Array.from({ length: 14 }, (_, i) => `<path d="M${-300 + i * 140} ${H} L${560 + i * 20} 412" stroke="#8f7a2d" stroke-width="14" opacity=".45"/>`).join("") + Array.from({ length: 13 }, (_, i) => R(i * 68, 428, 8, 44, "#7a5230")).join("") + R(0, 436, 860, 6, "#7a5230") + R(0, 455, 860, 6, "#7a5230"));
      return s;
    },
    room(t, cam) {
      let s = R(0, 0, W, H, "url(#gWallCool)");
      s += layer(cam, 10, `${R(560, 70, 240, 160, "#bfe3f8", 'rx="4"')}${clouds(t, 1, 130, 0.9)}${R(0, 0, 560, 240, "url(#gWallCool)")}${R(800, 0, 500, 240, "url(#gWallCool)")}${R(560, 0, 240, 70, "url(#gWallCool)")}<rect x="560" y="70" width="240" height="160" fill="none" stroke="#f8fafc" stroke-width="12"/><line x1="680" y1="70" x2="680" y2="230" stroke="#f8fafc" stroke-width="7"/>
        <g transform="rotate(-3 200 160)" filter="url(#fSoft)">${R(120, 80, 160, 200, "url(#pFla)")}${R(134, 94, 132, 70, "#fff", 'opacity=".94"')}${T(200, 138, "MENGÃO", { size: 26, w: 900, fill: "#c8102e" })}</g>
        <g filter="url(#fSoft)">${R(960, 90, 210, 140, "#fff", 'rx="6"')}${T(1065, 136, "Prova P3", { size: 23, w: 800, fill: "#b91c1c" })}${T(1065, 170, "Caps. 8 e 9", { size: 18, w: 600, fill: "#334155" })}${T(1065, 202, "foco: conceitos", { size: 16, w: 600, fill: "#64748b" })}</g>`);
      s += layer(cam, 30, R(-20, 560, W + 100, 160, "url(#gFloorWood)") + Array.from({ length: 8 }, (_, i) => `<line x1="${i * 180}" y1="560" x2="${i * 180 - 140}" y2="720" stroke="#6e4a2b" stroke-width="1.5" opacity=".35"/>`).join("") + `<ellipse cx="640" cy="640" rx="380" ry="50" fill="#9a3b3b" opacity=".35"/>`);
      return s;
    },
    office(t, cam) {
      let s = R(0, 0, W, H, "url(#gWallCool)") + R(0, 0, W, 54, "#dfe5ec");
      s += Array.from({ length: 6 }, (_, i) => R(60 + i * 210, 14, 150, 26, "#fff", 'rx="5" opacity=".95"')).join("");
      s += layer(cam, 12, `${R(50, 100, 400, 250, "url(#gSky)", 'rx="6"')}${building(70, 350, 80, 170, "#7f93ab", { side: 10 })}${building(180, 350, 90, 210, "#94a3b8", { side: 10 })}${building(300, 350, 70, 140, "#64748b", { side: 10 })}${building(380, 350, 50, 180, "#8291a7", { side: 8 })}<rect x="50" y="100" width="400" height="250" rx="6" fill="none" stroke="#e2e8f0" stroke-width="12"/><path d="M60 110 L170 110 L80 340 L60 340Z" fill="#fff" opacity=".2"/>`);
      s += layer(cam, 30, R(-20, 560, W + 100, 160, "#c7cfd9") + R(-20, 560, W + 100, 160, "url(#gShadeV)", 'opacity=".4"'));
      return s;
    },
    track(t, cam) {
      let s = R(0, 0, W, H, "url(#gSky)") + clouds(t, 2, 40);
      s += layer(cam, 12, `${R(-30, 120, W + 120, 220, "#525c6b")}${Array.from({ length: 7 }, (_, r) => Array.from({ length: 70 }, (_, i) => { const c = ["#ef4444", "#f8fafc", "#facc15", "#3b82f6", "#111827", "#22c55e"][Math.floor(rnd(i * 6 + r) * 6)]; const x = i * 20 + (r % 2) * 10 - 20, y = 140 + r * 28 + Math.sin(t * 5 + i + r) * 1.4; return `<circle cx="${x}" cy="${f1(y - 7)}" r="6" fill="#d9b08c"/><rect x="${x - 7}" y="${f1(y - 1)}" width="14" height="12" rx="4" fill="${c}"/>`; }).join("")).join("")}${R(-30, 330, W + 120, 18, "#e2e8f0")}`);
      s += layer(cam, 30, R(-30, 348, W + 140, 372, "url(#gTrack)") + Array.from({ length: 7 }, (_, i) => `<line x1="-30" y1="${380 + i * 50}" x2="${W + 110}" y2="${380 + i * 50}" stroke="#fff" stroke-width="3" opacity=".85"/>`).join("") + Array.from({ length: 12 }, (_, i) => R(1150 + (i % 2) * 14, 348 + Math.floor(i / 2) * 62, 14, 31, "#fff") + R(1150 + ((i + 1) % 2) * 14, 348 + Math.floor(i / 2) * 62, 14, 31, "#111")).join(""));
      return s;
    },
    plaza(t, cam) {
      let s = R(0, 0, W, H, "url(#gSky)") + sun(170, 100, 48) + clouds(t, 3);
      s += layer(cam, 22, `<g filter="url(#fSoft)">${R(280, 200, 720, 250, "#eef2f6")}${R(280, 200, 720, 250, "url(#gShadeV)", 'opacity=".5"')}${R(268, 184, 744, 22, "#cbd5e1")}${Array.from({ length: 11 }, (_, i) => R(300 + i * 64, 222, 22, 220, "#fff") + R(300 + i * 64, 222, 7, 220, "#e2e8f0")).join("")}<path d="M540 184 Q640 70 740 184 Z" fill="#dfe6ee"/><path d="M560 184 Q640 96 720 184 Z" fill="#cbd5e1" opacity=".5"/>${T(640, 176, "PREFEITURA", { size: 18, w: 800, fill: "#475569", ls: 4 })}${R(600, 340, 80, 110, "#5b4330")}</g>${R(1080, 150, 6, 300, "#94a3b8")}<path d="M1086 156 q40 ${f1(10 + Math.sin(t * 3) * 6)} 84 0 v54 q-40 ${f1(10 + Math.sin(t * 3 + 1) * 6)} -84 0 z" fill="#16a34a"/><path d="M1108 172 l20 -13 l20 13 l-20 13 z" fill="#facc15"/><circle cx="1128" cy="172" r="7" fill="#1e3a8a"/>`);
      s += layer(cam, 40, R(-20, 450, W + 120, 270, "url(#pTiles)") + R(-20, 450, W + 120, 270, "url(#gShadeV)", 'opacity=".45"') + tree(150, 480, 1) + tree(1190, 490, 1.1) + crowdBg(400, 900, 470, 10, t, ["#64748b", "#a855f7", "#f97316", "#0ea5e9"]));
      return s;
    },
    street(t, cam) {
      let s = R(0, 0, W, H, "url(#gSky)") + sun(1150, 86, 42) + clouds(t, 2);
      s += layer(cam, 24, [[30, "#f2dc9b", "BICICLETARIA"], [440, "#bcd5f2", ""], [850, "#f5c6c6", "CAFÉ"]].map(([x, c, n]) => `<g filter="url(#fSoft)">${R(x, 140, 400, 320, c)}${R(x, 140, 400, 320, "url(#gShadeV)", 'opacity=".55"')}${R(x - 8, 132, 416, 14, "#475569")}${R(x + 24, 260, 210, 160, "url(#gGlass)")}<rect x="${x + 24}" y="260" width="210" height="160" fill="none" stroke="#334155" stroke-width="6"/><path d="M${x + 34} 268 L${x + 90} 268 L${x + 50} 412 L${x + 34} 412Z" fill="#fff" opacity=".3"/>${R(x + 262, 280, 104, 180, "#5b3a1e")}<circle cx="${x + 350}" cy="372" r="5" fill="#facc15"/>${n ? R(x + 70, 168, 260, 46, "#fff", 'rx="6" opacity=".92"') + T(x + 200, 200, n, { size: 22, w: 900, fill: "#334155", ls: 2 }) : ""}</g>`).join(""));
      s += layer(cam, 42, R(-20, 460, W + 120, 54, "url(#gConcrete)") + R(-20, 512, W + 120, 208, "url(#gAsph)") + lamp(30, 512) + lamp(1250, 512));
      return s;
    },
    stadium(t, cam) {
      let s = R(0, 0, W, H, "url(#gSkyNight)");
      for (let i = 0; i < 50; i++) s += `<circle cx="${f1(rnd(i) * W)}" cy="${f1(rnd(i + 40) * 120)}" r="1.4" fill="#fff" opacity="${f1(0.4 + rnd(i + 7) * 0.5)}"/>`;
      s += [80, 1200].map((x) => `${R(x - 4, 40, 8, 170, "#94a3b8")}${R(x - 46, 24, 92, 34, "#e2e8f0", 'rx="4"')}${Array.from({ length: 8 }, (_, i) => `<circle cx="${x - 36 + (i % 4) * 24}" cy="${33 + Math.floor(i / 4) * 16}" r="6" fill="#fffbe6"/>`).join("")}<path d="M${x - 46} 58 L${x - 300} 540 L${x + 300} 540 L${x + 46} 58 Z" fill="#fffbe6" opacity=".06"/>`).join("");
      s += layer(cam, 12, `<path d="M-40 150 Q640 50 ${W + 40} 150 L${W + 40} 390 L-40 390 Z" fill="#141b26"/>${Array.from({ length: 9 }, (_, r) => Array.from({ length: 74 }, (_, i) => { const x = i * 18.5 + (r % 2) * 9 - 30, y = 160 + r * 25 - Math.sin(((x + 30) / (W + 60)) * Math.PI) * (42 - r * 3) + Math.sin(t * 6 + i + r) * 2; const red = rnd(i * 9 + r) > 0.48; return `<circle cx="${f1(x)}" cy="${f1(y - 6)}" r="5.5" fill="#d9a983"/><rect x="${f1(x - 7)}" y="${f1(y - 1)}" width="14" height="12" rx="4" fill="${red ? "#c8102e" : "#141414"}"/>`; }).join("")).join("")}`);
      s += layer(cam, 30, R(-30, 390, W + 140, 330, "url(#gPitch)") + Array.from({ length: 8 }, (_, i) => R(-30, 390 + i * 42, W + 140, 21, "#3ea94a", 'opacity=".35"')).join("") + `<ellipse cx="640" cy="565" rx="170" ry="52" fill="none" stroke="#fff" stroke-width="4" opacity=".8"/><line x1="640" y1="390" x2="640" y2="720" stroke="#fff" stroke-width="4" opacity=".8"/>`);
      return s;
    },
  };

  /* ================= personagens ================= */
  const SKIN = "url(#gSkin)", SKIN_FLAT = "#e8b892", SKIN_D = "#c98d66";
  /* cabeça realista: (cx, cy) = centro do rosto */
  function head(who, o) {
    const t = o.t || 0, talk = o.talk, k = o.flip ? -1 : 1;
    const mouthOpen = talk ? 1.2 + Math.abs(Math.sin(t * 15) * Math.cos(t * 4.3)) * 5.2 : 0;
    const blink = rnd(Math.floor(t * 2.6) + (o.seed || 0)) > 0.94;
    let back = "", front = "", hat = "";
    if (who === "larissa") {
      back = `<path d="M-24 -6 C-30 -34 -18 -48 0 -48 C20 -48 32 -34 26 -4 C30 22 26 46 16 60 L-18 60 C-28 42 -30 18 -24 -6Z" fill="url(#gHair)"/>`;
      front = `<path d="M-22 -12 C-22 -38 -6 -44 4 -44 C18 -44 26 -32 23 -12 C14 -28 -2 -34 -14 -22 C-17 -18 -19 -15 -22 -12Z" fill="url(#gHair)"/><path d="M-4 -40 C6 -42 16 -36 18 -28" stroke="#7a4a2a" stroke-width="2.5" fill="none" opacity=".7"/>`;
    } else if (who === "marcos") {
      front = `<path d="M-22 -14 C-24 -38 -8 -46 2 -46 C16 -46 25 -36 23 -14 C16 -24 6 -27 0 -27 C-8 -27 -16 -24 -22 -14Z" fill="#1d130c"/>${Array.from({ length: 9 }, (_, i) => `<circle cx="${-18 + i * 4.5}" cy="${-36 + Math.sin(i) * 3}" r="3.2" fill="#2b1d12"/>`).join("")}<path d="M-24 -20 C-8 -28 8 -28 24 -20 L24 -13 C8 -21 -8 -21 -24 -13Z" fill="#dc2626"/><path d="M-24 -17 C-8 -25 8 -25 24 -17" stroke="#fff" stroke-width="1.6" fill="none"/>`;
    } else {
      front = `<path d="M-21 -16 C-22 -30 -12 -36 0 -36 C14 -36 22 -30 21 -16 C12 -22 -12 -22 -21 -16Z" fill="#3a2516"/>`;
      hat = `<path d="M-28 -14 C-30 -46 -10 -56 4 -56 C22 -56 34 -42 30 -12 L22 -16 C12 -24 -12 -24 -22 -16Z" fill="#dc2626"/><path d="M-28 -14 C-30 -46 -10 -56 4 -56 C22 -56 34 -42 30 -12" fill="none" stroke="#7f1d1d" stroke-width="2"/><path d="M-14 -50 C-4 -54 10 -54 18 -48 M-20 -38 C-4 -46 14 -46 26 -38" stroke="#fff" stroke-width="3" fill="none" opacity=".85"/><path d="M-10 -52 l6 14 M6 -54 l2 14 M18 -48 l-2 12" stroke="#7f1d1d" stroke-width="3" opacity=".6"/><path d="M-20 -6 L-12 14 M20 -6 L12 14" stroke="#111827" stroke-width="2"/>`;
    }
    const eyes = o.shock
      ? `<ellipse cx="-8" cy="-5" rx="5.6" ry="5.4" fill="#fff"/><ellipse cx="9" cy="-5" rx="5.6" ry="5.4" fill="#fff"/><circle cx="-8" cy="-5" r="2" fill="#0b0b0b"/><circle cx="9" cy="-5" r="2" fill="#0b0b0b"/><path d="M-14 -7 Q-8 -12 -2.5 -7 M3.5 -7 Q9 -12 14.5 -7" stroke="#3b2a20" stroke-width="1.4" fill="none"/>`
      : blink
      ? `<path d="M-12 -4 h8 M5 -4 h8" stroke="#3b2a20" stroke-width="2.2" stroke-linecap="round"/>`
      : `<ellipse cx="-8" cy="-4" rx="4.6" ry="3.3" fill="#fff"/><ellipse cx="9" cy="-4" rx="4.6" ry="3.3" fill="#fff"/><circle cx="${-7.4 + k * 0.6}" cy="-3.8" r="2.6" fill="#5a3825"/><circle cx="${9.6 + k * 0.6}" cy="-3.8" r="2.6" fill="#5a3825"/><circle cx="${-7.4 + k * 0.6}" cy="-3.8" r="1.25" fill="#0b0b0b"/><circle cx="${9.6 + k * 0.6}" cy="-3.8" r="1.25" fill="#0b0b0b"/><circle cx="${-6.6 + k * 0.6}" cy="-4.8" r=".75" fill="#fff"/><circle cx="${10.4 + k * 0.6}" cy="-4.8" r=".75" fill="#fff"/><path d="M-13 -5.5 Q-8 -9 -3.4 -5.5 M4.4 -5.5 Q9 -9 13.6 -5.5" stroke="#3b2a20" stroke-width="1.6" fill="none"/>${who === "larissa" ? `<path d="M-13.5 -5.5 l-2 -1.5 M14 -5.5 l2 -1.5" stroke="#1f140d" stroke-width="1.4"/>` : ""}`;
    const glasses = who === "paulo" ? `<path d="M-15 -8 Q-8 -11 -2 -8 L-2 -1 Q-8 2 -15 -1Z M2 -8 Q9 -11 16 -8 L16 -1 Q9 2 2 -1Z" fill="#0f172a" opacity=".88"/><path d="M-2 -6 h4" stroke="#0f172a" stroke-width="2"/><path d="M-13 -7 l5 -1" stroke="#7dd3fc" stroke-width="1.5" opacity=".8"/>` : "";
    const brows = o.shock ? `<path d="M-14 -16 Q-8 -21 -3 -16.5 M4 -16.5 Q9 -21 15 -16" stroke="#24150c" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : `<path d="M-13 -11 Q-8 ${who === "larissa" ? -15 : -14} -3 -11.5 M4 -11.5 Q9 ${who === "larissa" ? -15 : -14} 14 -11" stroke="${who === "paulo" ? "#2a1a10" : "#24150c"}" stroke-width="${who === "larissa" ? 1.8 : 2.6}" fill="none" stroke-linecap="round"/>`;
    const mouth = o.shock
      ? `<ellipse cx="1" cy="15" rx="5.5" ry="${f1(7 + Math.sin(t * 9) * 0.8)}" fill="#5b1a1f"/><ellipse cx="1" cy="18" rx="3.5" ry="2.5" fill="#d9707a"/>`
      : o.sad
      ? `<path d="M-6 16 Q1 11 8 16" stroke="#8a3a3a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
      : talk
        ? `<path d="M-6.5 13 Q1 ${f1(12 - mouthOpen * 0.2)} 8 13 Q1 ${f1(14 + mouthOpen)} -6.5 13Z" fill="#6b1e24"/><path d="M-6.5 13 Q1 11 8 13" stroke="${who === "larissa" ? "#b84a55" : "#a05a50"}" stroke-width="2" fill="none"/>${mouthOpen > 3 ? `<path d="M-4 ${f1(13.6)} h9" stroke="#fff" stroke-width="1.6"/>` : ""}`
        : `<path d="M-6 13 Q1 18 8 13" stroke="${who === "larissa" ? "#b84a55" : "#9a5248"}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    const face = `<ellipse cx="-22" cy="0" rx="4" ry="7" fill="${SKIN_D}"/><ellipse cx="23" cy="0" rx="4" ry="7" fill="${SKIN_D}"/>
      <path d="M-22 -8 C-22 -34 22 -34 22 -8 C22 10 14 24 1 27 C-13 24 -22 10 -22 -8Z" fill="${SKIN}"/>
      <path d="M-22 -8 C-22 10 -13 24 1 27 C-8 22 -15 12 -16 -2Z" fill="#b97b55" opacity=".25"/>
      ${eyes}${glasses}${brows}
      <path d="M1 -2 C0 4 -2 7 -1 8 C1 9 3 9 4 8" stroke="#b77b56" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="-13" cy="7" r="4.5" fill="#f0907e" opacity=".22"/><circle cx="15" cy="7" r="4.5" fill="#f0907e" opacity=".22"/>${mouth}`;
    return `<g transform="translate(${f1(o.cx)} ${f1(o.cy)}) rotate(${o.rot || 0}) scale(${k} 1)">${back}${face}${front}${hat}</g>`;
  }

  /* corpo inteiro. opções: talk, walk, run, wave, cheer, point, sad, jump, flip, scale, op, shirt, bib */
  function person(who, x, y, o = {}) {
    if (o.op === 0) return "";
    const t = o.t || 0, sc = o.scale || 1, dir = o.flip ? -1 : 1;
    const run = !!o.run, walk = !!o.walk;
    const cyc = run ? Math.sin(t * 13) : walk ? Math.sin(t * 7.5) : 0;
    const breathe = Math.sin(t * 2.2 + x * 0.01) * 1.2;
    const bounce = run ? Math.abs(Math.cos(t * 13)) * 9 : walk ? Math.abs(Math.cos(t * 7.5)) * 3 : o.talk ? Math.abs(Math.sin(t * 5)) * 1.6 : 0;
    const jump = o.jump || o.cheer ? Math.abs(Math.sin(t * 5.5)) * 22 : 0;
    const lift = bounce + jump;
    const hipY = -128, shY = -214, neckY = -224, headY = -252;
    const legP = (side, ang, knee) => {
      const hx = side * 10, kx = hx + Math.sin(ang) * 60, ky = hipY + Math.cos(ang) * 60;
      return { hx, kx, ky, fx: kx + Math.sin(ang - knee) * 62, fy: ky + Math.cos(ang - knee) * 62 };
    };
    const L = legP(-1, run ? cyc * 0.8 : walk ? cyc * 0.42 : 0.05, run ? Math.max(0, -cyc) * 1.25 + 0.25 : walk ? Math.max(0, -cyc) * 0.45 : 0.02);
    const Rl = legP(1, run ? -cyc * 0.8 : walk ? -cyc * 0.42 : -0.05, run ? Math.max(0, cyc) * 1.25 + 0.25 : walk ? Math.max(0, cyc) * 0.45 : 0.02);
    const armP = (side, up, fo) => {
      const sx = side * 25, sy = shY + 6, ex = sx + Math.sin(up) * 44 * side, ey = sy + Math.cos(up) * 44;
      return { sx, sy, ex, ey, hx: ex + Math.sin(up + fo) * 40 * side, hy: ey + Math.cos(up + fo) * 40 };
    };
    let la = armP(-1, 0.1, 0.12), ra = armP(1, 0.1, 0.12);
    if (run) { la = armP(-1, cyc * 0.9, -1.6); ra = armP(1, -cyc * 0.9, -1.6); }
    else if (walk) { la = armP(-1, cyc * 0.42, -0.25); ra = armP(1, -cyc * 0.42, -0.25); }
    if (o.talk && !run) ra = armP(1, 0.6 + Math.sin(t * 4.2) * 0.22, -1.25 + Math.sin(t * 6.3) * 0.3);
    if (o.point) ra = armP(1, 1.85, 0.12);
    if (o.wave) ra = armP(1, 2.6, 0.35 + Math.sin(t * 9) * 0.5);
    if (o.cheer) { la = armP(-1, 2.75, 0.25 + Math.sin(t * 8) * 0.2); ra = armP(1, 2.75, 0.25 + Math.sin(t * 8 + 1) * 0.2); }

    // roupa
    const C = who === "larissa"
      ? { torso: "url(#pFla)", sleeve: "#c8102e", sleeveLen: 0.42, leg: "url(#gJeans)", legCover: 1, shoe: "#f8fafc", sole: "#d4d4d8", lace: "#cbd5e1", sock: null }
      : who === "marcos"
        ? { torso: o.shirt || "#0891b2", sleeve: null, leg: "#111827", legCover: 0.42, shoe: "#a3e635", sole: "#f8fafc", lace: "#14532d", sock: "#f8fafc" }
        : { torso: "#facc15", sleeve: "#1d4ed8", sleeveLen: 0.48, leg: "#111827", legCover: 0.82, shoe: "#f8fafc", sole: "#111827", lace: "#94a3b8", sock: "#f8fafc" };
    const legSVG = (G) => {
      let s = limb(G.hx, hipY, G.kx, G.ky, 24, 17, C.legCover === 1 ? C.leg : SKIN_FLAT) + limb(G.kx, G.ky, G.fx, G.fy - 4, 17, 11, C.legCover === 1 ? C.leg : SKIN_FLAT);
      if (C.legCover < 1) {
        const mx = G.hx + (G.kx - G.hx) * C.legCover * 1.0, my = hipY + (G.ky - hipY) * C.legCover;
        s += limb(G.hx, hipY, mx, my, 27, who === "paulo" ? 20 : 25, C.leg);
        if (who === "paulo") s += limb(mx - 0.5, my - 0.5, mx, my, 21, 21, "#1f2937");
      }
      if (C.sock) s += limb(G.fx, G.fy - 16, G.fx, G.fy - 6, 12, 12, C.sock);
      s += `<path d="M${f1(G.fx - 12)} ${f1(G.fy + 1)} C${f1(G.fx - 12)} ${f1(G.fy - 13)} ${f1(G.fx + 6)} ${f1(G.fy - 15)} ${f1(G.fx + 14)} ${f1(G.fy - 7)} C${f1(G.fx + 22)} ${f1(G.fy - 4)} ${f1(G.fx + 25)} ${f1(G.fy)} ${f1(G.fx + 24)} ${f1(G.fy + 1)}Z" fill="${C.shoe}"/>${R(G.fx - 13, G.fy, 38, 5, C.sole, 'rx="2.5"')}<path d="M${f1(G.fx - 3)} ${f1(G.fy - 10)} l7 -2 M${f1(G.fx)} ${f1(G.fy - 7)} l7 -2" stroke="${C.lace}" stroke-width="1.6"/>`;
      return s;
    };
    const armSVG = (A, front) => {
      let s = limb(A.sx, A.sy, A.ex, A.ey, 15, 12, SKIN_FLAT) + limb(A.ex, A.ey, A.hx, A.hy, 12, 9, SKIN_FLAT);
      if (C.sleeve) s += limb(A.sx, A.sy, A.sx + (A.ex - A.sx) * C.sleeveLen, A.sy + (A.ey - A.sy) * C.sleeveLen, 21, 18, C.sleeve);
      const gl = who === "paulo" ? "#111827" : SKIN_FLAT;
      s += `<ellipse cx="${f1(A.hx)}" cy="${f1(A.hy + 2)}" rx="6.5" ry="8" fill="${gl}"/><ellipse cx="${f1(A.hx + 4)}" cy="${f1(A.hy - 1)}" rx="2.6" ry="4" fill="${gl}" />`;
      if (who === "marcos" && !front) s += R(A.hx - 7, A.hy - 15, 14, 8, "#0f172a", 'rx="2"') + R(A.hx - 4, A.hy - 13.5, 8, 5, "#22d3ee", 'rx="1"');
      return s;
    };
    const torsoPath = `M-27 ${shY} C-32 -186 -24 -156 -21 -134 L21 -134 C24 -156 32 -186 27 ${shY} Q0 ${shY - 10} -27 ${shY}Z`;
    let torso = `<path d="${torsoPath}" fill="${C.torso}"/>`;
    if (who === "larissa") torso += `<path d="M-11 ${shY - 6} L0 ${shY + 8} L11 ${shY - 6}" stroke="#fff" stroke-width="3" fill="#141414"/><path d="M-14 -176 h7 v8 h-7z" fill="#facc15" opacity=".0"/>`;
    if (who === "marcos") torso += `<path d="M-26 ${shY + 4} C-30 -180 -24 -156 -21 -134 M26 ${shY + 4} C30 -180 24 -156 21 -134" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>${R(-17, -192, 34, 28, "#fff", 'rx="3"')}<g transform="scale(${dir} 1)"><text x="0" y="-171" font-size="15" font-weight="800" text-anchor="middle" fill="#111" font-family="${FONT}">${o.bib === undefined ? "42" : o.bib}</text></g>`;
    if (who === "paulo") torso += `<path d="M-24 -170 L24 -170 L22 -152 L-22 -152Z" fill="#1d4ed8"/><path d="M-27 ${shY} C-32 -186 -24 -156 -21 -134 L-14 -134 C-18 -160 -22 -186 -18 ${shY - 2}Z" fill="#1d4ed8"/><path d="M27 ${shY} C32 -186 24 -156 21 -134 L14 -134 C18 -160 22 -186 18 ${shY - 2}Z" fill="#1d4ed8"/><path d="M0 ${shY - 8} V-150" stroke="#475569" stroke-width="2"/>`;
    torso += `<path d="${torsoPath}" fill="url(#gShade)"/>`;
    const hips = `<path d="M-23 -140 h46 l2 18 h-50z" fill="${who === "larissa" ? "#22406a" : C.leg}"/>${who === "larissa" ? R(-23, -142, 46, 5, "#3b2a1a") : ""}`;
    const neck = `<path d="M-7 ${neckY - 6} h14 v14 q-7 4 -14 0z" fill="${SKIN_D}"/>`;
    const hd = head(who, { cx: 0, cy: headY + breathe * 0.3, t, talk: o.talk && !o.shock, sad: o.sad, shock: o.shock, flip: false, seed: x });
    const larHairBack = who === "larissa" ? `<path d="M-22 ${headY - 6} C-30 ${headY + 30} -26 ${headY + 56} -14 ${headY + 66} L16 ${headY + 66} C28 ${headY + 52} 30 ${headY + 26} 24 ${headY - 6}Z" fill="url(#gHair)"/>` : "";
    const body = `${legSVG(L)}${legSVG(Rl)}${armSVG(la, false)}${larHairBack}${hips}${torso}${neck}${hd}${armSVG(ra, true)}`;
    const glow = o.talk ? `<ellipse cx="0" cy="5" rx="60" ry="12" fill="${CH[who].color}" opacity=".28"/>` : "";
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${sc})" opacity="${o.op === undefined ? 1 : o.op}">${glow}<ellipse cx="0" cy="3" rx="${f1(46 - lift * 0.6)}" ry="9" fill="url(#gBlob)"/><g transform="translate(0 ${f1(-lift + (run || walk ? 0 : breathe * 0.4))}) scale(${dir} 1)">${body}</g></g>`;
  }

  /* Paulo pedalando */
  function cyclist(x, y, t, o = {}) {
    const sc = o.scale || 1, spin = t * (o.speed === undefined ? 10 : o.speed);
    const ped = (k) => [Math.cos(spin + k * Math.PI) * 18 - 8, Math.sin(spin + k * Math.PI) * 18 - 48];
    const hip = [-22, -150];
    const legC = (p, back) => {
      const [fx, fy] = p, dx = fx - hip[0], dy = fy - hip[1], d = Math.hypot(dx, dy), mx = (hip[0] + fx) / 2, my = (hip[1] + fy) / 2;
      const kk = Math.sqrt(Math.max(0, 58 * 58 - (d / 2) * (d / 2))), kx = mx + (dy / d) * kk, ky = my - (dx / d) * kk;
      const sk = back ? "#d9a57f" : SKIN_FLAT;
      return limb(hip[0], hip[1], kx, ky, 24, 17, sk) + limb(kx, ky, fx, fy - 2, 17, 11, sk) + limb(hip[0], hip[1], hip[0] + (kx - hip[0]) * 0.82, hip[1] + (ky - hip[1]) * 0.82, 27, 21, back ? "#0b1020" : "#111827") + limb(fx, fy - 14, fx, fy - 6, 12, 12, "#f1f5f9") + `<path d="M${f1(fx - 12)} ${f1(fy + 2)} q2 -12 18 -10 q12 2 14 10z" fill="#f8fafc"/>`;
    };
    let s = `<g transform="translate(${f1(x)} ${y}) scale(${sc})">${o.talk ? `<ellipse cx="0" cy="5" rx="130" ry="13" fill="${CH.paulo.color}" opacity=".28"/>` : ""}`;
    s += legC(ped(1), true) + bicycle(0, 0, 1, "#1d4ed8", spin);
    const torso = `M${hip[0] - 6} ${hip[1] + 6} C-34 -190 -6 -222 24 -226 L42 -208 C26 -190 4 -166 ${hip[0] + 24} ${hip[1] + 8} Z`;
    s += `<path d="${torso}" fill="#facc15"/><path d="M-26 -176 L32 -212" stroke="#1d4ed8" stroke-width="12"/><path d="${torso}" fill="url(#gShade)"/>`;
    s += limb(28, -214, 40, -172, 15, 12, SKIN_FLAT) + limb(40, -172, 44, -134, 12, 9, SKIN_FLAT) + limb(28, -214, 34, -196, 21, 18, "#1d4ed8") + `<ellipse cx="44" cy="-131" rx="7" ry="8" fill="#111827"/>`;
    s += legC(ped(0), false);
    s += head("paulo", { cx: 50, cy: -248, t, talk: o.talk, rot: 8, seed: 3 });
    return s + `</g>`;
  }
  function nameTag(who, x, y, label) {
    const c = CH[who], n = label || c.name, w = n.length * 9 + 28;
    return `<g transform="translate(${f1(x)} ${f1(y)})"><rect x="${-w / 2}" y="-13" width="${w}" height="25" rx="12.5" fill="#fff" opacity=".95" filter="url(#fSoft)"/><circle cx="${-w / 2 + 12}" cy="-0.5" r="4" fill="${c.color}"/>${T(5, 4.5, n, { size: 14, w: 800, fill: c.color })}</g>`;
  }
  function cast(ctx, list) {
    return list.map(([who, x, y, o = {}]) => {
      if (o.op === 0) return "";
      const talk = ctx.line && ctx.line.who === who, sc = o.scale || 1;
      const fig = o.bike ? cyclist(x, y, ctx.t, { ...o, talk }) : person(who, x, y, { t: ctx.t + x * 0.01, talk, ...o });
      return fig + (o.noTag ? "" : nameTag(who, x, y + 30 * sc));
    }).join("");
  }

  /* ================= gráficos e quadros ================= */
  function card(x, y, w, h, title, o = {}) {
    let s = `<g filter="url(#fShadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="url(#gCard)" opacity="${o.op || 0.97}"/></g><rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="20" fill="none" stroke="#e2e8f0"/>`;
    if (title) s += `<rect x="${x + 24}" y="${y + 22}" width="5" height="24" rx="2.5" fill="${o.accent || "#2563eb"}"/>${T(x + 40, y + 41, title, { size: 21, w: 800, anchor: "start" })}`;
    if (o.sub) s += T(x + 40, y + 64, o.sub, { size: 15, w: 600, fill: "#64748b", anchor: "start" });
    return s;
  }
  function plot(x, y, w, h, o = {}) {
    let s = "";
    for (let i = 0; i <= 4; i++) s += `<line x1="${x}" x2="${x + w}" y1="${f1(y + (h * i) / 4)}" y2="${f1(y + (h * i) / 4)}" stroke="#e2e8f0" stroke-width="1.5"${i < 4 ? ' stroke-dasharray="4 6"' : ""}/>`;
    s += `<path d="M${x} ${y - 8} L${x} ${y + h} L${x + w + 8} ${y + h}" stroke="#64748b" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M${x - 5} ${y - 4} L${x} ${y - 12} L${x + 5} ${y - 4}Z M${x + w + 4} ${y + h - 5} L${x + w + 12} ${y + h} L${x + w + 4} ${y + h + 5}Z" fill="#64748b"/>`;
    if (o.xl) s += T(x + w, y + h + 30, o.xl, { size: 15, w: 700, fill: "#64748b", anchor: "end" });
    if (o.yl) s += T(x + 10, y - 16, o.yl, { size: 15, w: 700, fill: "#64748b", anchor: "start" });
    return s;
  }
  const AREA = { "#2563eb": "url(#gAreaBlue)", "#16a34a": "url(#gAreaGreen)", "#ea580c": "url(#gAreaOrange)" };
  function curve(x, y, w, h, fn, p = 1, color = "#2563eb", o = {}) {
    const n = 60, m = Math.max(1, Math.round(n * clamp(p))), pts = [];
    for (let i = 0; i <= m; i++) { const u = (i / n); pts.push([x + u * w, y + h - clamp(fn(u), -0.1, 1.15) * h]); }
    const d = smooth(pts), end = pts[pts.length - 1];
    let s = "";
    if (o.area !== false && !o.dash && AREA[color]) s += `<path d="${d} L${f1(end[0])} ${y + h} L${f1(pts[0][0])} ${y + h}Z" fill="${AREA[color]}"/>`;
    if (!o.dash) s += `<path d="${d}" stroke="${color}" stroke-width="${(o.width || 5) + 6}" fill="none" stroke-linecap="round" opacity=".15"/>`;
    s += `<path d="${d}" stroke="${color}" stroke-width="${o.width || 5}" fill="none" stroke-linecap="round" stroke-linejoin="round"${o.dash ? ' stroke-dasharray="10 8" opacity=".7"' : ""}/>`;
    if (!o.dash && p > 0.02 && p < 0.999) s += `<circle cx="${f1(end[0])}" cy="${f1(end[1])}" r="13" fill="${color}" opacity=".2"/><circle cx="${f1(end[0])}" cy="${f1(end[1])}" r="7" fill="#fff" stroke="${color}" stroke-width="4"/>`;
    return s;
  }
  function pill(x, y, text, color = "#0f172a", op = 1, size = 20, light = false) {
    if (op <= 0) return "";
    const wd = text.length * size * 0.56 + 38, k = 0.86 + 0.14 * op;
    return `<g opacity="${op.toFixed(3)}" transform="translate(${f1(x)} ${f1(y)}) scale(${k.toFixed(3)}) translate(${f1(-x)} ${f1(-y)})" filter="url(#fSoft)"><rect x="${f1(x - wd / 2)}" y="${f1(y - size - 9)}" width="${f1(wd)}" height="${size + 26}" rx="${(size + 26) / 2}" fill="${light ? "#fff" : color}"/>${T(x, y + 3, text, { size, w: 800, fill: light ? color : "#fff" })}</g>`;
  }
  function bar(x, base, w, h, fill, label, val) {
    const hh = Math.max(0, h), r = Math.min(12, hh / 2);
    return `<path d="M${f1(x)} ${f1(base)} V${f1(base - hh + r)} Q${f1(x)} ${f1(base - hh)} ${f1(x + r)} ${f1(base - hh)} H${f1(x + w - r)} Q${f1(x + w)} ${f1(base - hh)} ${f1(x + w)} ${f1(base - hh + r)} V${f1(base)}Z" fill="${fill}"/><rect x="${f1(x + 6)}" y="${f1(base - hh + 4)}" width="${f1(w * 0.18)}" height="${f1(Math.max(0, hh - 8))}" rx="4" fill="#fff" opacity=".22"/>` +
      (label ? T(x + w / 2, base + 28, label, { size: 17, w: 700, fill: "#475569" }) : "") + (val ? pill(x + w / 2, base - hh - 14, val, "#0f172a", 1, 16, true) : "");
  }
  function bucket(x, y, level, o = {}) {
    const w = 210, h = 230, t = o.t || 0, lv = clamp(level), wy = y + h - lv * (h - 24), k = (wy - y) / h;
    let s = `<path d="M${x + 28} ${y - 108} h118 a12 12 0 0 1 12 12 v34" stroke="url(#gChrome)" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M${x + 28} ${y - 108} h118 a12 12 0 0 1 12 12 v34" stroke="#94a3b8" stroke-width="2" fill="none" transform="translate(0 -8)" opacity=".6"/><rect x="${x + 142}" y="${y - 66}" width="32" height="16" rx="5" fill="#64748b"/><rect x="${x + 60}" y="${y - 132}" width="14" height="20" fill="#64748b"/><ellipse cx="${x + 67}" cy="${y - 134}" rx="20" ry="7" fill="#dc2626"/>`;
    s += T(x + 20, y - 150, "investimento (a torneira)", { size: 17, w: 800, fill: "#2563eb", anchor: "start" });
    const fw = o.flow || 10;
    s += `<rect x="${f1(x + 158 - fw / 2)}" y="${y - 50}" width="${fw}" height="${f1(wy - (y - 50))}" fill="url(#gWater)" opacity=".9"/><rect x="${f1(x + 158 - fw / 2 + 2)}" y="${y - 50}" width="${f1(fw * 0.3)}" height="${f1(wy - (y - 50))}" fill="#fff" opacity=".4"/>`;
    s += `<path d="M${x - 12} ${y} L${x + w + 12} ${y} L${x + w - 14} ${y + h} L${x + 14} ${y + h} Z" fill="url(#gMetal)"/>`;
    s += `<path d="M${f1(x - 12 + 26 * k)} ${f1(wy)} L${f1(x + w + 12 - 26 * k)} ${f1(wy)} L${x + w - 14} ${y + h} L${x + 14} ${y + h} Z" fill="url(#gWater)" opacity=".88"/>`;
    s += `<path d="M${f1(x + 4 + 26 * k)} ${f1(wy)} q 20 ${f1(Math.sin(t * 5) * 4)} 40 0 t 40 0 t 40 0 t 40 0 t 40 0" stroke="#e0f2fe" stroke-width="3" fill="none" opacity=".9"/>`;
    s += `<path d="M${x - 12} ${y} L${x + w + 12} ${y} L${x + w - 14} ${y + h} L${x + 14} ${y + h} Z" fill="none" stroke="#64748b" stroke-width="3"/>${[0.3, 0.62].map((q) => `<path d="M${f1(x - 12 + 26 * q)} ${f1(y + h * q)} H${f1(x + w + 12 - 26 * q)}" stroke="#94a3b8" stroke-width="3" opacity=".7"/>`).join("")}<ellipse cx="${x + w / 2}" cy="${y}" rx="${w / 2 + 12}" ry="11" fill="none" stroke="#64748b" stroke-width="4"/><path d="M${x - 8} ${y} Q${x + w / 2} ${y - 120} ${x + w + 8} ${y}" stroke="#64748b" stroke-width="3" fill="none" opacity=".5"/>`;
    const lk = (o.leak === undefined ? 1 : o.leak) * lv;
    if (lk > 0.02) {
      s += `<path d="M${x + w / 2} ${y + h - 4} q ${f1(10 + lk * 30)} 30 ${f1(16 + lk * 60)} 84" stroke="url(#gWater)" stroke-width="${f1(3 + lk * 11)}" fill="none" stroke-linecap="round" opacity=".9"/>`;
      for (let i = 0; i < 4; i++) s += `<circle cx="${f1(x + w / 2 + 18 + lk * 60 + i * 5)}" cy="${f1(y + h + 88 + ((t * 90 + i * 22) % 36))}" r="3" fill="#60a5fa"/>`;
    }
    s += T(x + w / 2 + 64, y + h + 64, "depreciação (o furo)", { size: 17, w: 800, fill: "#ea580c", anchor: "start" });
    const line = (lev, col, label, op = 1) => { const ty = y + h - lev * (h - 24); return `<g opacity="${op}"><line x1="${x - 34}" x2="${x + w + 34}" y1="${f1(ty)}" y2="${f1(ty)}" stroke="${col}" stroke-width="3" stroke-dasharray="9 6"/>${label ? pill(x + w + 34 + label.length * 5.6 + 22, ty + 7, label, col, 1, 15) : ""}</g>`; };
    if (o.target !== undefined && (o.targetOp === undefined || o.targetOp > 0)) s += line(o.target, "#0f172a", o.targetLabel, o.targetOp === undefined ? 1 : o.targetOp);
    if (o.target2 !== undefined && (o.target2Op || 0) > 0) s += line(o.target2, "#16a34a", o.target2Label, o.target2Op);
    return s;
  }
  function gauge(x, y, val, label) {
    const v = clamp(val), a = Math.PI * (1 - v), nx = x + Math.cos(a) * 64, ny = y - Math.sin(a) * 64;
    let s = `<path d="M${x - 80} ${y} A80 80 0 0 1 ${x + 80} ${y}" stroke="#e2e8f0" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M${x - 80} ${y} A80 80 0 0 1 ${x + 80} ${y}" stroke="url(#gBarGreen)" stroke-width="18" fill="none" stroke-linecap="round" stroke-dasharray="${f1(251 * v)} 400"/>`;
    for (let i = 0; i <= 10; i++) { const an = Math.PI * (1 - i / 10); s += `<line x1="${f1(x + Math.cos(an) * 96)}" y1="${f1(y - Math.sin(an) * 96)}" x2="${f1(x + Math.cos(an) * 102)}" y2="${f1(y - Math.sin(an) * 102)}" stroke="#94a3b8" stroke-width="2"/>`; }
    return s + `<line x1="${x}" y1="${y}" x2="${f1(nx)}" y2="${f1(ny)}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="9" fill="${INK}"/>${T(x, y + 38, label, { size: 17, w: 800, fill: "#475569" })}`;
  }
  function icon(kind, x, y, s = 1) {
    const g = (inner) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${inner}</g>`;
    if (kind === "piggy") return g(`<ellipse cx="0" cy="0" rx="48" ry="36" fill="#f9a8d4"/><ellipse cx="-6" cy="-10" rx="30" ry="16" fill="#fff" opacity=".25"/><circle cx="38" cy="-6" r="16" fill="#f472b6"/><circle cx="34" cy="-8" r="2.4" fill="${INK}"/><circle cx="42" cy="-8" r="2.4" fill="${INK}"/><circle cx="22" cy="-16" r="3" fill="${INK}"/><rect x="-16" y="-42" width="30" height="8" rx="3" fill="#9d174d"/><rect x="-30" y="28" width="12" height="16" rx="4" fill="#f472b6"/><rect x="16" y="28" width="12" height="16" rx="4" fill="#f472b6"/>`);
    if (kind === "book") return g(`<path d="M0 -30 C-18 -38 -36 -36 -46 -30 V34 C-36 28 -18 28 0 36Z" fill="#4f46e5"/><path d="M0 -30 C18 -38 36 -36 46 -30 V34 C36 28 18 28 0 36Z" fill="#6366f1"/><path d="M-40 -22 C-28 -26 -14 -26 -6 -22 M-40 -10 C-28 -14 -14 -14 -6 -10 M6 -22 C14 -26 28 -26 40 -22 M6 -10 C14 -14 28 -14 40 -10" stroke="#c7d2fe" stroke-width="2.5" fill="none"/>`);
    if (kind === "scale") return g(`<line x1="0" y1="-44" x2="0" y2="34" stroke="${INK}" stroke-width="5"/><circle cx="0" cy="-46" r="5" fill="#facc15"/><line x1="-48" y1="-30" x2="48" y2="-30" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M-66 4 a18 10 0 0 0 36 0 z M30 4 a18 10 0 0 0 36 0 z" fill="#facc15"/><path d="M-48 -30 L-62 4 M-48 -30 L-34 4 M48 -30 L34 4 M48 -30 L62 4" stroke="${INK}" stroke-width="1.6"/><rect x="-26" y="32" width="52" height="9" rx="4" fill="${INK}"/>`);
    if (kind === "scroll") return g(`<rect x="-34" y="-40" width="68" height="80" rx="6" fill="#fef3c7" stroke="#b45309" stroke-width="3"/>${[-22, -10, 2].map((yy) => `<line x1="-20" y1="${yy}" x2="20" y2="${yy}" stroke="#d97706" stroke-width="3" stroke-linecap="round"/>`).join("")}<circle cx="14" cy="24" r="11" fill="#dc2626"/><path d="M8 32 l-4 14 l8 -5 l8 5 l-4 -14" fill="#dc2626"/>`);
    if (kind === "ship") return g(`<path d="M-60 6 L60 6 L44 34 L-44 34 Z" fill="#1e3a8a"/><path d="M-60 6 L60 6" stroke="#93c5fd" stroke-width="3"/>${[["#ef4444", -40], ["#f59e0b", -14], ["#22c55e", 12], ["#3b82f6", -27, -26]].map(([c, xx, yy = 0]) => R(xx, -24 + yy, 24, 28, c) + R(xx, -24 + yy, 24, 28, "url(#gShade)")).join("")}<path d="M-70 40 q20 8 40 0 t40 0 t40 0 t40 0" stroke="#60a5fa" stroke-width="3" fill="none"/>`);
    if (kind === "bulb") return g(`<circle cx="0" cy="-10" r="46" fill="#fde047" opacity=".22"/><path d="M-22 -14 a22 22 0 1 1 44 0 c0 12 -10 16 -12 26 h-20 c-2 -10 -12 -14 -12 -26z" fill="#fde047"/><rect x="-11" y="14" width="22" height="14" rx="4" fill="#94a3b8"/><path d="M-6 -8 l6 10 l6 -10" stroke="#ca8a04" stroke-width="2.5" fill="none"/>`);
    if (kind === "check") return g(`<circle r="19" fill="#16a34a"/><circle r="19" fill="url(#gShadeV)"/><path d="M-8 0 l6 6 l11 -12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    if (kind === "laptop") return g(`<rect x="-32" y="-26" width="64" height="40" rx="4" fill="#1e293b"/><rect x="-28" y="-22" width="56" height="32" rx="2" fill="url(#gGlass)"/><path d="M-40 16 h80 l-6 8 h-68z" fill="#94a3b8"/>`);
    if (kind === "coin") return g(`<circle r="17" fill="#facc15"/><circle r="17" fill="none" stroke="#ca8a04" stroke-width="3"/><circle r="12" fill="none" stroke="#fde68a" stroke-width="1.5"/><text y="5" font-size="13" font-weight="900" text-anchor="middle" fill="#a16207" font-family="${FONT}">R$</text>`);
    if (kind === "seed") return g(`<path d="M-32 28 q-6 -52 32 -60 q38 8 32 60 z" fill="#d6b88a"/><path d="M-32 28 q-6 -52 32 -60 q38 8 32 60 z" fill="url(#gShade)"/><path d="M-18 -14 q18 -8 36 0" stroke="#a37b4a" stroke-width="4" fill="none"/>${T(0, 16, "SEMENTE", { size: 11, w: 900, fill: "#7a5530" })}`);
    if (kind === "corn") return g(`<ellipse cx="0" cy="0" rx="14" ry="32" fill="#facc15"/>${Array.from({ length: 6 }, (_, i) => `<path d="M-12 ${-22 + i * 9} h24" stroke="#eab308" stroke-width="2"/>`).join("")}<path d="M-6 28 q-24 -22 -10 -54 M6 28 q24 -22 10 -54" stroke="#16a34a" stroke-width="8" fill="none" stroke-linecap="round"/>`);
    if (kind === "package") return g(box(-30, 22, 60, 44));
    return "";
  }
  function confetti(t, n = 70) {
    let s = "";
    for (let i = 0; i < n; i++) { const x = rnd(i) * W + Math.sin(t * 2 + i) * 30, y = ((rnd(i + 3) * H + t * (80 + rnd(i) * 120)) % (H + 40)) - 20; s += `<rect x="${f1(x)}" y="${f1(y)}" width="10" height="6" fill="${["#c8102e", "#111", "#facc15", "#22c55e", "#3b82f6"][i % 5]}" transform="rotate(${f1((t * 200 + i * 37) % 360)} ${f1(x)} ${f1(y)})"/>`; }
    return s;
  }

  /* ================= roteiro ================= */
  const SCENES = [
    {
      env: "Campus", title: "Bem-vindos à revisão",
      lines: [
        ["n", "Véspera da P3 de Economia. Paulo chega de bicicleta, Marcos chega correndo, e Larissa vem com a camisa do Flamengo, como sempre.", "Véspera da pê três de Economia. Paulo chega de bicicleta, Marcos chega correndo, e Larissa vem com a camisa do Flamengo, como sempre."],
        ["larissa", "Pergunta de prova: por que uns países são ricos e outros são pobres?"],
        ["paulo", "E por que a vida dos nossos avós era bem mais apertada que a nossa?"],
        ["marcos", "Eu só quero saber se dá pra passar sem decorar fórmula."],
        ["n", "Dá, sim. Hoje é só intuição, e o guia é o modelo de crescimento de Solow. Vamos visitar alguns lugares para entender.", "Dá, sim. Hoje é só intuição, e o guia é o modelo de crescimento de Sólou. Vamos visitar alguns lugares para entender."],
      ],
      draw(ctx) {
        let s = ENV.campus(ctx.t, ctx.cam);
        s += card(400, 26, 480, 104, "") + T(640, 78, "Crescimento Econômico", { size: 38, w: 900 }) + T(640, 110, "Revisão dos Caps. 8 e 9 · Mankiw", { size: 19, w: 600, fill: "#475569" });
        const k = (sp) => ease(clamp(ctx.li === 0 ? ctx.lp * sp : 1));
        const moving = ctx.li === 0 && ctx.lp < 0.8;
        s += cast(ctx, [
          ["paulo", lerp(-220, 320, k(1.5)), 630, { bike: true, scale: 0.92, speed: moving ? 12 : 0 }],
          ["larissa", lerp(-160, 640, k(1.15)), 630, { walk: moving, wave: !moving && ctx.li === 0 }],
          ["marcos", lerp(1500, 940, k(1.3)), 630, { run: moving, flip: true }],
        ]);
        return s;
      },
    },
    {
      env: "Central de entregas", title: "Capital e produto marginal decrescente",
      lines: [
        ["n", "Primeira parada: uma central de entregas. Aqui, o capital são as bicicletas, e o trabalho são os entregadores."],
        ["paulo", "A pé, eu faço só quatro entregas por dia."],
        ["n", "Com a primeira bicicleta, Paulo passa a fazer vinte entregas. Que salto!"],
        ["paulo", "Com uma segunda bicicleta de reserva, vinte e três. Com a terceira, vinte e quatro?"],
        ["larissa", "Claro, Paulo, você só pedala uma de cada vez! Cada bicicleta a mais ajuda menos que a anterior."],
        ["n", "Isso é o produto marginal decrescente do capital: a ideia mais importante do capítulo oito."],
      ],
      draw(ctx) {
        let s = ENV.delivery(ctx.t, ctx.cam);
        const bikes = ctx.li >= 3 ? (ctx.lp > 0.5 ? 3 : 2) : ctx.li >= 2 ? 1 : 0;
        for (let i = 1; i < bikes; i++) s += bicycle(60 + i * 95, 520, 0.55, ["#16a34a", "#f97316"][i - 1]);
        s += card(610, 70, 610, 440, "Entregas por dia × bicicletas", { sub: "cada bicicleta extra rende menos" });
        const bx = 680, by = 170, bw = 470, bh = 270;
        s += plot(bx, by, bw, bh, { xl: "bicicletas", yl: "entregas" });
        const pts = [[0, 4], [1, 20], [2, 23], [3, 24]];
        pts.forEach(([v, c], i) => {
          if (i > bikes) return;
          const x = bx + 55 + v * 125, hh = (c / 28) * bh;
          s += bar(x - 38, by + bh, 76, hh, i ? "url(#gBarBlue)" : "url(#gBarGray)", String(v), c + " entregas");
          if (i) s += pill(x, by + bh - hh + 46, "+" + (c - pts[i - 1][1]), i === 1 ? "#16a34a" : i === 2 ? "#65a30d" : "#ca8a04", 1, 17);
        });
        if (at(ctx, 5)) s += curve(bx + 55, by, 375, bh, (u) => 0.14 + 0.72 * (1 - Math.exp(-u * 3.2)) / (1 - Math.exp(-3.2)), seg(ctx, 5), "#0f172a", { area: false, width: 4 });
        s += cast(ctx, [["paulo", 320, 660, bikes ? { bike: true, scale: 0.85, speed: ctx.li === 2 ? 9 : 0 } : {}], ["larissa", 520, 660, { flip: true }]]);
        return s;
      },
    },
    {
      env: "Feira", title: "Poupança vira investimento",
      lines: [
        ["n", "Na feira, a barraca da Larissa fatura dez reais por hora. Uma parte vira consumo, e a outra é guardada para comprar equipamento."],
        ["larissa", "Eu sou a poupadora oficial: três de cada dez reais vão para equipamento novo. O resto a gente gasta."],
        ["paulo", "Então, poupar significa consumir menos hoje para produzir mais amanhã?"],
        ["n", "Exatamente. E tudo o que é poupado vira investimento, ou seja, capital novo."],
      ],
      draw(ctx) {
        let s = ENV.market(ctx.t, ctx.cam);
        s += card(300, 64, 680, 220, "");
        s += T(470, 106, "Consumo: gastar agora", { size: 22, w: 800, fill: "#16a34a" }) + T(820, 106, "Poupança → investimento", { size: 22, w: 800, fill: "#2563eb" }) + `<line x1="640" y1="86" x2="640" y2="266" stroke="#e2e8f0" stroke-width="2"/>`;
        const p = seg(ctx, 1);
        for (let i = 0; i < 10; i++) {
          const inv = i >= 7, sx = 505 + i * 30, sy = 185;
          const tx = inv ? 760 + (i - 7) * 60 : 360 + (i % 4) * 58, ty = inv ? 190 : 160 + Math.floor(i / 4) * 52;
          if (inv && at(ctx, 3)) continue;
          s += icon("coin", lerp(sx, tx, p), lerp(sy, ty, p) - Math.sin(p * Math.PI) * 50, 1);
        }
        if (at(ctx, 3)) { const q = seg(ctx, 3); s += `<g opacity="${q.toFixed(3)}" transform="translate(820 180)"><rect x="-70" y="-42" width="140" height="84" rx="12" fill="#e2e8f0"/><rect x="-56" y="-28" width="52" height="56" rx="8" fill="#94a3b8"/><rect x="-56" y="-28" width="52" height="56" rx="8" fill="url(#gShadeV)"/><circle cx="34" cy="0" r="24" fill="#cbd5e1" stroke="#64748b" stroke-width="5"/>${T(0, 70, "equipamento novo", { size: 16, w: 800, fill: "#2563eb" })}</g>` + pill(640, 330, "investimento = capital novo", "#2563eb", q, 20); }
        s += cast(ctx, [["larissa", 640, 660, { point: ctx.li === 1 }], ["paulo", 930, 660, { flip: true }], ["marcos", 350, 660, {}]]);
        return s;
      },
    },
    {
      env: "Oficina", title: "Depreciação e estado estacionário",
      lines: [
        ["n", "Na oficina do Paulo, as ferramentas e as bicicletas de aluguel se desgastam com o uso. Isso é a depreciação."],
        ["paulo", "Pensa num balde furado: a torneira representa o investimento, e o furo, a depreciação."],
        ["larissa", "E quanto mais água tem no balde, mais forte ela vaza pelo furo."],
        ["n", "Uma hora, o que entra fica igual ao que sai, e o nível para. Esse é o estado estacionário."],
        ["marcos", "Então, começando com pouca ou com muita água, o balde sempre vai para o mesmo nível?"],
        ["n", "Isso! Por isso o estado estacionário é o equilíbrio de longo prazo da economia."],
      ],
      draw(ctx) {
        let s = ENV.workshop(ctx.t, ctx.cam) + bicycle(1150, 570, 0.68, "#16a34a") + bicycle(140, 570, 0.6, "#ef4444");
        s += card(390, 60, 540, 490, "");
        let lvl = 0.05;
        if (ctx.li >= 1) lvl = 0.05 + 0.6 * (1 - Math.exp(-(ctx.li - 1 + ctx.lp) * 1.1));
        if (ctx.li >= 4) lvl = 0.65;
        s += bucket(525, 230, lvl, { t: ctx.t, flow: 12, leak: ctx.li >= 1 ? 1.4 : 0, target: 0.65, targetOp: seg(ctx, 3), targetLabel: "estado estacionário" });
        if (ctx.li >= 4) {
          const q = seg(ctx, 4);
          s += `<g transform="translate(415 330) scale(.34)">${bucket(0, 0, 0.95 - 0.3 * q, { t: ctx.t, flow: 12, target: 0.65 })}</g>${T(455, 450, "começa cheio", { size: 15, w: 800, fill: "#475569" })}`;
          s += `<g transform="translate(838 330) scale(.34)">${bucket(0, 0, 0.15 + 0.5 * q, { t: ctx.t, flow: 12, target: 0.65 })}</g>${T(878, 450, "começa vazio", { size: 15, w: 800, fill: "#475569" })}`;
        }
        s += cast(ctx, [["paulo", 240, 660, { point: ctx.li === 1 }], ["larissa", 1060, 660, { flip: true, op: ctx.li >= 4 ? 0 : 1 }], ["marcos", 1060, 660, { flip: true, op: ctx.li >= 4 ? 1 : 0 }]]);
        return s;
      },
    },
    {
      env: "Oficina", title: "Mais poupança: efeito de nível",
      lines: [
        ["larissa", "E se o Paulo poupar mais? Tipo quatro de cada dez reais em equipamento?"],
        ["n", "É como abrir mais a torneira. No primeiro instante, a oficina tem o mesmo capital, mas consome menos."],
        ["n", "Depois, o capital se acumula e a produção sobe, cada vez mais devagar, até um novo nível, mais alto."],
        ["paulo", "Mais alto, só que parado de novo?"],
        ["n", "Parado. A poupança tem efeito de nível: muda o nível da renda, mas não faz a economia crescer para sempre."],
        ["marcos", "Anotado: poupar mais não é crescer mais rápido para sempre. Pegadinha clássica!"],
      ],
      draw(ctx) {
        let s = ENV.workshop(ctx.t + 3, ctx.cam);
        s += card(320, 60, 740, 490, "");
        const prog = ctx.li >= 2 ? (ctx.li > 2 ? 1 : ctx.lp) : 0;
        const lvl = 0.5 + (0.3 * (1 - Math.exp(-prog * 3.2))) / (1 - Math.exp(-3.2));
        s += bucket(410, 230, lvl, { t: ctx.t, flow: at(ctx, 1) ? 24 : 12, leak: 1.4, target: 0.5, targetLabel: "antes", target2: 0.8, target2Op: seg(ctx, 2), target2Label: "novo nível" });
        s += gauge(930, 340, ctx.li === 2 ? Math.sin(ctx.lp * Math.PI) * 0.85 : 0, "ritmo de crescimento");
        s += pill(930, 460, "efeito de NÍVEL", "#0f172a", ctx.li >= 4 ? seg(ctx, 4) : 0, 22);
        s += cast(ctx, [["larissa", 170, 660, {}], ["paulo", 1170, 660, { flip: true, op: ctx.li >= 5 ? 0 : 1 }], ["marcos", 1170, 660, { flip: true, op: ctx.li >= 5 ? 1 : 0, point: true }]]);
        return s;
      },
    },
    {
      env: "Cidade", title: "Destruição e o “milagre” do pós-guerra",
      lines: [
        ["n", "Agora, uma cidade. Uma tempestade terrível destrói metade das fábricas e máquinas."],
        ["marcos", "Acabou tudo! Vamos voltar à idade da pedra!"],
        ["larissa", "Calma! Com pouco capital, cada máquina nova rende muito. E a cidade continua poupando."],
        ["n", "Resultado: a cidade cresce muito rápido até voltar ao mesmo estado estacionário de antes."],
        ["paulo", "Foi isso que aconteceu com o Japão e a Alemanha depois da Segunda Guerra!"],
        ["n", "Não foi milagre, foi transição. E ela acaba quando a economia volta ao equilíbrio."],
      ],
      draw(ctx) {
        let s = ENV.city(ctx.t, ctx.cam, { storm: ctx.li <= 1, broken: ctx.li <= 2, cranes: ctx.li >= 2 ? seg(ctx, 2) : 0 });
        s += card(500, 64, 640, 390, "Capital da cidade ao longo do tempo", { accent: "#ea580c" });
        const bx = 560, by = 130, bw = 520, bh = 260;
        s += plot(bx, by, bw, bh, { xl: "tempo", yl: "capital" });
        const fn = (u) => (u < 0.25 ? 0.8 : u < 0.27 ? 0.8 - (u - 0.25) * 20 : 0.8 - 0.4 * Math.exp(-(u - 0.27) * 9));
        const rev = ctx.li === 0 ? 0.28 * ctx.lp : ctx.li < 3 ? 0.28 : ctx.li === 3 ? 0.28 + 0.72 * ctx.lp : 1;
        s += `<line x1="${bx}" x2="${bx + bw}" y1="${by + bh - 0.8 * bh}" y2="${by + bh - 0.8 * bh}" stroke="#0f172a" stroke-dasharray="8 6" opacity=".35"/>${T(bx + bw - 4, by + bh - 0.8 * bh - 12, "estado estacionário", { size: 15, w: 800, anchor: "end", fill: "#475569" })}`;
        s += curve(bx, by, bw, bh, fn, rev, "#ea580c");
        s += pill(bx + 260, by + bh - 70, "crescimento rápido!", "#16a34a", ctx.li >= 3 ? seg(ctx, 3) : 0, 18);
        s += cast(ctx, [["marcos", 290, 670, { op: ctx.li === 1 ? 1 : 0, sad: true }], ["larissa", 290, 670, { op: ctx.li === 2 || ctx.li === 3 ? 1 : 0 }], ["paulo", 290, 670, { op: ctx.li >= 4 || ctx.li === 0 ? 1 : 0 }]]);
        return s;
      },
    },
    {
      env: "Fazenda", title: "A Regra de Ouro",
      lines: [
        ["paulo", "Já sei: vamos poupar tudo! Cem por cento da colheita vira semente!"],
        ["larissa", "E a gente come o quê, Paulo? Semente?"],
        ["n", "Poupar tudo deixa o capital no máximo, mas o consumo vai a zero. E o que importa é o quanto se pode consumir."],
        ["n", "Pouca poupança: pouco capital, pouca produção. Muita poupança: tanto capital para manter que sobra pouco para consumir."],
        ["n", "No meio existe o ponto que deixa o consumo no máximo, para sempre: a Regra de Ouro."],
        ["marcos", "A Regra de Ouro maximiza o consumo, não a produção. Já sublinhei."],
      ],
      draw(ctx) {
        let s = ENV.farm(ctx.t, ctx.cam);
        s += card(300, 60, 680, 440, "Taxa de poupança × consumo de longo prazo", { accent: "#16a34a" });
        const bx = 370, by = 130, bw = 540, bh = 270;
        s += plot(bx, by, bw, bh, { xl: "poupança: 0% → 100%" });
        const sv = ctx.li === 0 ? 0.2 + 0.8 * ctx.lp : ctx.li === 1 ? 1 : ctx.li === 2 ? 1 - 0.85 * ctx.lp : ctx.li === 3 ? 0.15 + 0.7 * ctx.lp : lerp(0.85, 0.42, ctx.li === 4 ? ctx.lp : 1);
        const cons = (u) => 2.2 * u * (1 - u) * (1 - u * 0.2), prod = (u) => Math.pow(u, 0.5) * 0.85;
        s += curve(bx, by, bw, bh, prod, 1, "#94a3b8", { dash: true, width: 4 }) + T(bx + bw - 10, by + bh - prod(1) * bh - 14, "produção", { size: 16, w: 700, fill: "#64748b", anchor: "end" });
        s += curve(bx, by, bw, bh, cons, 1, "#16a34a") + T(bx + 86, by + bh - cons(0.12) * bh - 20, "consumo", { size: 18, w: 800, fill: "#16a34a" });
        const cx = bx + sv * bw, cy = by + bh - cons(sv) * bh;
        s += `<line x1="${f1(cx)}" x2="${f1(cx)}" y1="${by + bh}" y2="${f1(cy)}" stroke="#0f172a" stroke-dasharray="5 5"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="16" fill="#0f172a" opacity=".15"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="9" fill="#fff" stroke="#0f172a" stroke-width="4"/>` + pill(cx, by + bh + 36, Math.round(sv * 100) + "%", "#0f172a", 1, 15);
        if (at(ctx, 4)) { const gx = bx + 0.42 * bw, gy = by + bh - cons(0.42) * bh; s += `<circle cx="${f1(gx)}" cy="${f1(gy)}" r="24" fill="#facc15" opacity="${(0.45 * seg(ctx, 4)).toFixed(2)}"/>` + pill(gx, gy - 44, "Regra de Ouro", "#b45309", seg(ctx, 4), 20); }
        s += `<g filter="url(#fSoft)"><rect x="70" y="250" width="160" height="120" rx="16" fill="#fff" opacity=".9"/><rect x="1060" y="250" width="160" height="120" rx="16" fill="#fff" opacity=".9"/></g>` + icon("seed", 150, 298, 0.9) + T(150, 356, "semente = poupança", { size: 14, w: 800, fill: "#3f3a1a" }) + icon("corn", 1140, 298, 1.0) + T(1140, 356, "colheita = consumo", { size: 14, w: 800, fill: "#3f3a1a" });
        s += cast(ctx, [["paulo", 170, 680, { cheer: ctx.li === 0 }], ["larissa", 1120, 680, { flip: true, op: ctx.li >= 5 ? 0 : 1 }], ["marcos", 1120, 680, { flip: true, op: ctx.li >= 5 ? 1 : 0 }]]);
        return s;
      },
    },
    {
      env: "Fazenda", title: "O dilema entre gerações",
      lines: [
        ["n", "Essa fazenda tem capital de menos. Para chegar à Regra de Ouro, precisa poupar mais."],
        ["larissa", "Ou seja: a gente consome menos agora."],
        ["paulo", "E os nossos netos consomem muito mais lá na frente."],
        ["n", "É o dilema entre gerações. Quem dá o mesmo peso a todas as gerações escolhe ir para a Regra de Ouro."],
        ["marcos", "E se a fazenda tivesse capital demais?"],
        ["n", "Aí é só festa: poupar menos aumenta o consumo de todo mundo, hoje e sempre."],
      ],
      draw(ctx) {
        let s = ENV.farm(ctx.t + 5, ctx.cam);
        const above = ctx.li >= 4;
        s += card(300, 60, 680, 440, above ? "Capital demais → poupar menos" : "Capital de menos → poupar mais", { accent: "#16a34a" });
        const bx = 370, by = 130, bw = 540, bh = 270, base = 0.5;
        s += plot(bx, by, bw, bh, { xl: "tempo", yl: "consumo" });
        s += `<line x1="${bx}" x2="${bx + bw}" y1="${by + bh - base * bh}" y2="${by + bh - base * bh}" stroke="#0f172a" stroke-dasharray="8 6" opacity=".35"/>${T(bx + 10, by + bh - base * bh - 10, "consumo inicial", { size: 14, w: 800, fill: "#64748b", anchor: "start" })}`;
        const fnB = (u) => (u < 0.15 ? base : u < 0.17 ? base - (u - 0.15) * 7.5 : 0.8 - 0.45 * Math.exp(-(u - 0.17) * 5.5));
        const fnA = (u) => (u < 0.15 ? base : u < 0.17 ? base + (u - 0.15) * 10 : 0.66 + 0.04 * Math.exp(-(u - 0.17) * 5));
        const rev = above ? (ctx.li === 4 ? 0.14 : ctx.li === 5 ? 0.14 + 0.86 * ctx.lp : 1) : (ctx.li === 0 ? 0.14 : ctx.li === 1 ? 0.14 + 0.2 * ctx.lp : ctx.li === 2 ? 0.34 + 0.66 * ctx.lp : 1);
        s += curve(bx, by, bw, bh, above ? fnA : fnB, rev, "#16a34a", { area: false });
        s += `<line x1="${bx + 0.15 * bw}" x2="${bx + 0.15 * bw}" y1="${by}" y2="${by + bh}" stroke="#94a3b8" stroke-dasharray="4 5"/>${T(bx + 0.15 * bw, by + bh + 28, "mudança", { size: 14, w: 800, fill: "#64748b" })}`;
        if (!above) s += pill(bx + 160, by + bh - 50, "hoje: consome menos", "#ea580c", ctx.li >= 1 ? seg(ctx, 1) : 0, 17) + pill(bx + 400, by + 40, "netos: consomem mais", "#16a34a", ctx.li >= 2 ? seg(ctx, 2) : 0, 17);
        else s += pill(bx + 360, by + 50, "todos ganham", "#16a34a", seg(ctx, 5), 18);
        if (!above && at(ctx, 2)) for (let i = 0; i < 3; i++) s += `<g opacity="${seg(ctx, 2).toFixed(3)}">${person(["larissa", "marcos", "paulo"][i], 1050 + i * 62, 680, { t: ctx.t + i, scale: 0.45, jump: true })}</g>`;
        s += cast(ctx, [["larissa", 170, 680, { op: above ? 0 : 1 }], ["marcos", 170, 680, { op: above ? 1 : 0 }], ["paulo", 1150, 680, { flip: true, op: !above && at(ctx, 2) ? 0 : 1 }]]);
        return s;
      },
    },
    {
      env: "República", title: "Crescimento populacional",
      lines: [
        ["n", "Na república do Marcos, chegam três primos para morar. E os notebooks continuam os mesmos três."],
        ["marcos", "Casa cheia, casa feliz!"],
        ["larissa", "Casa cheia, notebook dividido. O mesmo capital agora é repartido entre muito mais gente."],
        ["n", "A casa produz mais no total, mas cada pessoa tem menos capital e menos renda. É a diluição do capital."],
        ["paulo", "O Malthus diria que vai faltar comida para todo mundo.", "O Máltus diria que vai faltar comida para todo mundo."],
        ["larissa", "E o Kremer diria: mais cabeças, mais ideias!", "E o Crêmer diria: mais cabeças, mais ideias!"],
        ["n", "O Malthus errou: a tecnologia e o controle da natalidade mudaram o jogo.", "O Máltus errou: a tecnologia e o controle da natalidade mudaram o jogo."],
      ],
      draw(ctx) {
        let s = ENV.room(ctx.t, ctx.cam);
        s += `<rect x="410" y="450" width="320" height="16" rx="5" fill="#8b5a2b"/><rect x="410" y="450" width="320" height="16" rx="5" fill="url(#gShadeV)"/><rect x="430" y="466" width="12" height="104" fill="#6b4423"/><rect x="700" y="466" width="12" height="104" fill="#6b4423"/>`;
        for (let i = 0; i < 3; i++) s += icon("laptop", 480 + i * 92, 428, 1);
        const k = seg(ctx, 0), cols = ["#a855f7", "#f43f5e", "#22c55e"];
        for (let i = 0; i < 3; i++) { const px = lerp(-80, 100 + i * 100, k); s += `<g opacity="${k.toFixed(3)}">${person("marcos", px, 660, { t: ctx.t + i * 2, scale: 0.74, walk: ctx.li === 0 && ctx.lp < 0.9, shirt: cols[i], bib: "" })}${nameTag("marcos", px, 683, "Primo")}</g>`; }
        s += card(790, 250, 450, 300, "");
        const total = lerp(0.5, 0.85, seg(ctx, 3)), per = lerp(0.55, 0.3, seg(ctx, 3));
        s += bar(845, 505, 150, total * 190, "url(#gBarBlue)", "produção total", at(ctx, 3) ? "↑" : "") + bar(1040, 505, 150, per * 190, "url(#gBarOrange)", "por pessoa", at(ctx, 3) ? "↓" : "");
        s += pill(1015, 292, "diluição do capital", "#0f172a", ctx.li >= 2 ? seg(ctx, 2) : 0, 19);
        s += cast(ctx, [["marcos", 450, 660, { cheer: ctx.li === 1 }], ["larissa", 650, 660, { flip: true, op: ctx.li === 4 || ctx.li === 6 ? 0 : 1 }], ["paulo", 650, 660, { flip: true, op: ctx.li === 4 || ctx.li === 6 ? 1 : 0 }]]);
        return s;
      },
    },
    {
      env: "Escritório", title: "Progresso tecnológico",
      lines: [
        ["larissa", "Criei uma planilha automática: agora cada pessoa do escritório trabalha como se fossem duas!"],
        ["n", "Isso é progresso tecnológico: aumenta a eficiência do trabalho. Cada trabalhador passa a valer por mais de um."],
        ["paulo", "E, diferente da poupança, isso não para?"],
        ["n", "Se as ideias continuam surgindo, a renda por pessoa cresce para sempre, no ritmo da tecnologia."],
        ["n", "Mensagem central do modelo: só o progresso tecnológico explica o padrão de vida subindo década após década."],
        ["marcos", "Poupança: nível. Tecnologia: crescimento. Fechou!"],
      ],
      draw(ctx) {
        let s = ENV.office(ctx.t, ctx.cam);
        for (let i = 0; i < 2; i++) { const x = 70 + i * 260; s += `<rect x="${x}" y="520" width="230" height="14" rx="4" fill="#94a3b8"/><rect x="${x + 64}" y="436" width="104" height="74" rx="6" fill="#1e293b"/><rect x="${x + 70}" y="442" width="92" height="62" rx="3" fill="url(#gGlass)"/>${[0, 1, 2].map((k) => `<rect x="${x + 76}" y="${450 + k * 16}" width="${f1(30 + rnd(k + i) * 44)}" height="8" rx="2" fill="#fff" opacity=".85"/>`).join("")}<rect x="${x + 108}" y="510" width="16" height="12" fill="#334155"/>`; }
        if (ctx.li === 0) s += icon("bulb", 200, 330 - Math.sin(ctx.t * 4) * 6, 1);
        s += card(560, 66, 650, 440, "Renda por pessoa ao longo do tempo", { accent: "#16a34a" });
        const bx = 625, by = 160, bw = 520, bh = 270;
        s += plot(bx, by, bw, bh, { xl: "tempo", yl: "renda por pessoa" });
        if (at(ctx, 2)) s += curve(bx, by, bw, bh, (u) => 0.35 + 0.3 * (1 - Math.exp(-u * 6)), 1, "#94a3b8", { dash: true, width: 4 }) + T(bx + bw - 6, by + bh - 0.65 * bh + 28, "só poupança: estaciona", { size: 15, w: 700, fill: "#64748b", anchor: "end" });
        if (at(ctx, 3)) s += curve(bx, by, bw, bh, (u) => 0.3 + u * 0.62, ctx.li === 3 ? ctx.lp : 1, "#16a34a") + T(bx + bw - 30, by + 26, "com tecnologia: cresce sempre", { size: 16, w: 800, fill: "#16a34a", anchor: "end" });
        s += pill(bx + bw / 2, by + bh + 68, "só a tecnologia sustenta o crescimento", "#0f172a", ctx.li >= 4 ? seg(ctx, 4) : 0, 19);
        s += cast(ctx, [["larissa", 190, 670, { cheer: ctx.li === 0 }], ["paulo", 420, 670, { flip: true, op: ctx.li >= 5 ? 0 : 1 }], ["marcos", 420, 670, { flip: true, op: ctx.li >= 5 ? 1 : 0 }]]);
        return s;
      },
    },
    {
      env: "Pista de atletismo", title: "Convergência",
      lines: [
        ["n", "Na pista de atletismo, dois corredores representam dois países: um rico, que largou na frente, e um pobre, que largou atrás."],
        ["paulo", "O de trás vai alcançar o da frente um dia?"],
        ["n", "Se os dois tiverem o mesmo fôlego, ou seja, a mesma poupança, população e tecnologia, sim: quem está atrás corre mais rápido e alcança."],
        ["marcos", "Mas, se o de trás treina bem menos, ele vai no próprio ritmo e não alcança. Eu sei bem como é."],
        ["n", "Essa é a convergência condicional: cada país converge para o seu próprio estado estacionário."],
        ["larissa", "E a absoluta, com todo mundo chegando no mesmo lugar, não acontece no mundo real. Isso caiu na atividade!"],
      ],
      draw(ctx) {
        let s = ENV.track(ctx.t, ctx.cam);
        const diff = at(ctx, 3);
        const u = ctx.li < 2 ? 0.02 : ctx.li === 2 || ctx.li === 3 ? ctx.lp : 1;
        const rich = 360 + u * 690, poor = diff ? 180 + (1 - Math.exp(-u * 3)) * 480 : 180 + u * 840;
        s += person("marcos", rich, 478, { t: ctx.t * 1.05, run: true, scale: 0.6, shirt: "#2563eb", bib: "R" }) + nameTag("paulo", rich, 497, "país rico");
        s += person("marcos", poor, 578, { t: ctx.t * 1.05 + 1, run: true, scale: 0.6, shirt: "#ea580c", bib: "P" }) + nameTag("marcos", poor, 597, "país pobre");
        s += card(330, 76, 620, 108, "");
        s += T(640, 118, diff ? "O de trás treina menos" : "Mesmo fôlego: mesma poupança, população e tecnologia", { size: 20, w: 800 }) + T(640, 156, diff ? "cada um vai no seu ritmo → não alcança" : "quem está atrás corre mais rápido → alcança", { size: 18, w: 800, fill: diff ? "#c2410c" : "#15803d" });
        s += pill(640, 330, "convergência CONDICIONAL", "#0f172a", ctx.li >= 4 ? seg(ctx, 4) : 0, 20);
        s += cast(ctx, [["paulo", 96, 712, { scale: 0.85, op: ctx.li <= 2 ? 1 : 0 }], ["marcos", 96, 712, { scale: 0.85, op: ctx.li === 3 || ctx.li === 4 ? 1 : 0 }], ["larissa", 96, 712, { scale: 0.85, op: ctx.li >= 5 ? 1 : 0 }]]);
        return s;
      },
    },
    {
      env: "Prefeitura", title: "Políticas e instituições",
      lines: [
        ["n", "Como o governo pode ajudar a economia a crescer? Primeiro, poupando: déficit é poupança pública negativa."],
        ["paulo", "Também dá para investir em gente: educação e treinamento são capital humano."],
        ["larissa", "E ter regras justas! Se o prefeito pudesse tomar o que é dos outros, ninguém investiria."],
        ["n", "É a diferença entre a mão que ajuda e a mão arrebatadora. Boas instituições protegem a propriedade e os contratos."],
        ["marcos", "E patente para quem inventa, para valer a pena inventar!"],
        ["n", "E se abrir para o comércio com outros países também costuma ajudar a crescer."],
      ],
      draw(ctx) {
        let s = ENV.plaza(ctx.t, ctx.cam);
        s += card(330, 64, 870, 410, "O que faz uma economia crescer");
        s += pill(765, 140, "mão que ajuda  ×  mão arrebatadora", "#0f172a", ctx.li >= 3 ? seg(ctx, 3) : 0, 18);
        [["piggy", "poupança pública", 0], ["book", "capital humano", 1], ["scale", "instituições", 2], ["scroll", "patentes", 4], ["ship", "comércio", 5]].forEach(([k, label, li], i) => {
          const x = 480 + (i % 3) * 280, y = 250 + Math.floor(i / 3) * 140, p = seg(ctx, li);
          if (p <= 0) return;
          s += `<g opacity="${p.toFixed(3)}" transform="translate(0 ${f1((1 - p) * 30)})"><circle cx="${x}" cy="${y}" r="58" fill="#f1f5f9"/>${icon(k, x, y, 0.95)}${T(x, y + 82, label, { size: 19, w: 800 })}</g>`;
        });
        s += cast(ctx, [["paulo", 165, 680, { op: ctx.li <= 1 ? 1 : 0, point: ctx.li === 1 }], ["larissa", 165, 680, { op: ctx.li === 2 || ctx.li === 3 ? 1 : 0, point: ctx.li === 2 }], ["marcos", 165, 680, { op: ctx.li >= 4 ? 1 : 0 }]]);
        return s;
      },
    },
    {
      env: "Rua comercial", title: "Crescimento endógeno e destruição criativa",
      lines: [
        ["n", "O modelo de Solow trata a tecnologia como se ela caísse do céu. A teoria do crescimento endógeno tenta explicar de onde ela vem.", "O modelo de Sólou trata a tecnologia como se ela caísse do céu. A teoria do crescimento endógeno tenta explicar de onde ela vem."],
        ["larissa", "Conhecimento não cansa: cada ideia ajuda a ter a próxima. É subir nos ombros de gigantes."],
        ["n", "Se o capital inclui o conhecimento, não há retornos decrescentes. Aí, poupar e pesquisar geram crescimento permanente."],
        ["paulo", "Aí eu abri uma loja de bicicletas elétricas aqui na rua."],
        ["marcos", "E a bicicletaria antiga do lado fechou!"],
        ["n", "É a destruição criativa de Schumpeter: o novo derruba o velho. Os consumidores ganham, e alguns produtores perdem.", "É a destruição criativa de Xúmpeter: o novo derruba o velho. Os consumidores ganham, e alguns produtores perdem."],
      ],
      draw(ctx) {
        let s = ENV.street(ctx.t, ctx.cam);
        if (ctx.li <= 2) {
          s += card(460, 66, 380, 380, "Conhecimento acumulado", { accent: "#16a34a" });
          const n = 1 + Math.floor((ctx.li + ctx.lp) * 3);
          for (let i = 0; i < Math.min(n, 8); i++) { const c = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"][i % 4]; s += `<rect x="${560 + (i % 2) * 8}" y="${400 - i * 36}" width="180" height="32" rx="5" fill="${c}"/><rect x="${560 + (i % 2) * 8}" y="${400 - i * 36}" width="180" height="32" rx="5" fill="url(#gShadeV)"/><rect x="${574 + (i % 2) * 8}" y="${410 - i * 36}" width="70" height="6" rx="3" fill="#fff" opacity=".6"/>`; }
          s += pill(1000, 240, "sem retornos decrescentes", "#16a34a", ctx.li >= 2 ? seg(ctx, 2) : 0, 19);
        } else {
          const q = seg(ctx, 3);
          s += `<g opacity="${q.toFixed(3)}"><rect x="440" y="104" width="400" height="58" rx="6" fill="#16a34a"/>${T(640, 143, "E-BIKES DO PAULO", { size: 26, w: 900, fill: "#fff", ls: 1 })}${bicycle(565, 455, 0.8, "#16a34a")}${bicycle(720, 455, 0.8, "#0ea5e9")}<path d="M708 344 l-14 26 h14 l-10 24" stroke="#facc15" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
          if (at(ctx, 4)) s += `<g transform="rotate(-10 230 330)" opacity="${seg(ctx, 4).toFixed(3)}" filter="url(#fSoft)"><rect x="120" y="298" width="220" height="66" rx="8" fill="#dc2626"/>${T(230, 345, "FECHADO", { size: 34, w: 900, fill: "#fff" })}</g>`;
          s += pill(640, 540, "destruição criativa", "#0f172a", ctx.li >= 5 ? seg(ctx, 5) : 0, 22);
        }
        s += cast(ctx, [["larissa", 1070, 680, { flip: true, op: ctx.li <= 2 ? 1 : 0 }], ["paulo", 1070, 680, { flip: true, op: ctx.li === 3 || ctx.li === 5 ? 1 : 0, cheer: ctx.li === 3 }], ["marcos", 1070, 680, { flip: true, op: ctx.li === 4 ? 1 : 0, sad: true }]]);
        return s;
      },
    },
    {
      env: "Estádio", title: "Revisão relâmpago",
      lines: [
        ["n", "E, para fechar, revisão relâmpago no estádio!"],
        ["paulo", "Poupança e população têm um efeito de nível."],
        ["larissa", "Só a tecnologia sustenta o crescimento da renda por pessoa."],
        ["marcos", "A Regra de Ouro maximiza o consumo, e a economia não vai sozinha até lá."],
        ["paulo", "Abaixo da Regra de Ouro: sacrifício hoje, ganho para os netos."],
        ["larissa", "A convergência é condicional: cada país vai para o seu próprio equilíbrio."],
        ["marcos", "E correlação não é causalidade!"],
        ["n", "Boa prova, Paulo, Larissa e Marcos!"],
      ],
      draw(ctx) {
        let s = ENV.stadium(ctx.t, ctx.cam);
        const fin = ctx.li === 7 ? seg(ctx, 7) : 0;
        s += `<g opacity="${(1 - fin).toFixed(3)}">` + card(250, 70, 780, 376, "");
        ["Poupança e população: efeito de NÍVEL", "Só a tecnologia sustenta o crescimento", "Regra de Ouro: máximo CONSUMO", "Abaixo da RO: sacrifício hoje, netos ganham", "Convergência CONDICIONAL", "Correlação ≠ causalidade"].forEach((it, i) => {
          const p = seg(ctx, i + 1);
          if (p <= 0) return;
          const y = 120 + i * 54;
          s += `<g opacity="${p.toFixed(3)}" transform="translate(${f1((1 - p) * -30)} 0)">${icon("check", 310, y, 1)}${T(345, y + 8, it, { size: 25, w: 800, anchor: "start" })}</g>`;
        });
        s += `</g>`;
        if (fin > 0) s += confetti(ctx.t) + `<g opacity="${fin.toFixed(3)}">${T(W / 2, 230, "Boa prova!", { size: 110, w: 900, fill: "#facc15" })}${T(W / 2, 300, "Paulo · Larissa · Marcos", { size: 32, w: 700, fill: "#fff" })}</g>`;
        const end = ctx.li === 7;
        s += cast(ctx, [["paulo", 440, 712, { cheer: end }], ["larissa", 640, 712, { cheer: end }], ["marcos", 840, 712, { cheer: end }]]);
        return s;
      },
    },
  ];

  /* duração de cada fala = duração do áudio + respiro curto; sem áudio, estimativa */
  SCENES.forEach((sc, si) => {
    sc.lines = sc.lines.map(([who, text, say], li) => {
      const key = `s${String(si).padStart(2, "0")}_l${li}`;
      const ad = AUDIO && AUDIO[key];
      return { who, text, say: say || text, key, audio: ad ? AUDIO_BASE + key + ".mp3" : null, dur: ad ? ad + PAD : Math.min(9, Math.max(2.6, text.split(/\s+/).length * 0.36 + 0.8)) };
    });
    sc.dur = sc.lines.reduce((a, l) => a + l.dur, 0);
  });
  const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);

  /* ================= legenda e quadro ================= */
  function caption(line, lt) {
    if (!line) return "";
    const named = line.who !== "n", c = CH[line.who];
    const lines = wrap(line.text, named ? 64 : 76);
    const h = 26 + lines.length * 33, y = H - h - 16;
    const chipW = c.name.length * 12 + 36, tx = named ? 150 + chipW + 16 : W / 2;
    return `<g opacity="${clamp(lt * 10).toFixed(3)}"><rect x="120" y="${y}" width="${W - 240}" height="${h}" rx="18" fill="#0b1220" opacity=".84"/>` +
      (named ? `<rect x="146" y="${y + 13}" width="${chipW}" height="34" rx="17" fill="${c.color}"/>${T(146 + chipW / 2, y + 36, c.name, { size: 18, w: 800, fill: "#fff" })}` : "") +
      lines.map((l, i) => T(tx, y + 41 + i * 33, l, { size: 25, w: 600, fill: "#fff", anchor: named ? "start" : "middle" })).join("") + `</g>`;
  }
  function renderFrame(si, li, lt, st) {
    const sc = SCENES[si], line = sc.lines[li];
    const cam = clamp(st / sc.dur);
    const ctx = { t: st, li, lt, lp: clamp(lt / line.dur), line, cam };
    const zoom = 1 + 0.03 * cam;
    let svg = DEFS + `<g transform="translate(${W / 2} ${H / 2}) scale(${zoom.toFixed(4)}) translate(${-W / 2} ${-H / 2})">${sc.draw(ctx)}</g>`;
    svg += `<rect width="${W}" height="${H}" filter="url(#fGrain)" opacity=".6"/><rect width="${W}" height="${H}" fill="url(#gVignette)"/>` + caption(line, lt);
    const lbl = `${si + 1}/${SCENES.length} · ${sc.env}`;
    svg += `<rect x="20" y="18" width="${f1(lbl.length * 9 + 38)}" height="34" rx="17" fill="#0b1220" opacity=".78"/>${T(39, 41, lbl, { size: 15, w: 700, fill: "#fff", anchor: "start" })}`;
    const fade = li === 0 ? clamp(1 - lt / 0.35) : 0;
    if (fade > 0) svg += `<rect width="${W}" height="${H}" fill="#0b1220" opacity="${fade.toFixed(3)}"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(sc.title)}">${svg}</svg>`;
  }

  /* ================= player ================= */
  function create(root, opts = {}) {
    const stage = root.querySelector(".v-stage");
    const st = { si: 0, li: 0, lt: 0, st: 0, playing: false, last: 0, sound: !!AUDIO, rate: 1, ended: false };
    let audio = null;
    const stopAudio = () => { if (audio) { audio.pause(); audio = null; } };
    function playLine() {
      stopAudio();
      const line = SCENES[st.si].lines[st.li];
      if (!st.sound || !line.audio || !st.playing) return;
      audio = new Audio(line.audio);
      audio.playbackRate = st.rate;
      if (st.lt > 0.05) { try { audio.currentTime = st.lt; } catch {} }
      audio.play().catch(() => {});
    }
    function frame() { stage.innerHTML = renderFrame(st.si, st.li, st.lt, st.st); if (opts.onUpdate) opts.onUpdate(st, SCENES); }
    function elapsed() {
      let e = 0;
      for (let i = 0; i < st.si; i++) e += SCENES[i].dur;
      for (let j = 0; j < st.li; j++) e += SCENES[st.si].lines[j].dur;
      return e + Math.min(st.lt, SCENES[st.si].lines[st.li].dur);
    }
    function advance() {
      const sc = SCENES[st.si];
      if (st.li < sc.lines.length - 1) { st.li++; st.lt = 0; }
      else if (st.si < SCENES.length - 1) { st.si++; st.li = 0; st.lt = 0; st.st = 0; }
      else { st.playing = false; st.ended = true; stopAudio(); if (opts.onEnd) opts.onEnd(); return; }
      playLine();
    }
    function loop(ts) {
      if (!st.playing) return;
      const dt = Math.min(0.1, (ts - (st.last || ts)) / 1000) * st.rate;
      st.last = ts; st.lt += dt; st.st += dt;
      if (st.lt >= SCENES[st.si].lines[st.li].dur) advance();
      frame();
      if (st.playing) requestAnimationFrame(loop);
    }
    const api = {
      play() {
        if (st.ended) api.seekScene(0);
        if (st.playing) return;
        st.playing = true; st.last = 0;
        playLine();
        requestAnimationFrame(loop);
        if (opts.onUpdate) opts.onUpdate(st, SCENES);
      },
      pause() { st.playing = false; stopAudio(); frame(); },
      toggle() { st.playing ? api.pause() : api.play(); },
      seekScene(i) { st.si = clamp(i, 0, SCENES.length - 1); st.li = 0; st.lt = 0; st.st = 0; st.ended = false; playLine(); frame(); },
      next() { api.seekScene(st.si + 1); },
      prev() { api.seekScene(st.lt > 2 || st.li > 0 ? st.si : st.si - 1); },
      nextLine() { st.lt = SCENES[st.si].lines[st.li].dur; advance(); frame(); },
      setTTS(v) { st.sound = !!v; if (!st.sound) stopAudio(); else playLine(); },
      setRate(r) { st.rate = r; if (audio) audio.playbackRate = r; },
      hasTTS: () => !!AUDIO,
      state: st, scenes: SCENES, total: TOTAL, elapsed, render: frame,
    };
    frame();
    return api;
  }

  /* peças reutilizadas pelos vídeos curtos verticais (js/shorts) */
  const lib = { DEFS, ENV, person, cyclist, bicycle, nameTag, card, plot, curve, pill, bar, icon, confetti, box, T, R, ease, clamp, lerp, rnd, f1, smooth, CH, FONT, wrap };
  return { create, SCENES, TOTAL, renderFrame, lib };
})();
