/* Vídeo curto vertical (TikTok/Reels), Parte 1: produto marginal decrescente do capital.
   1080×1920. Reaproveita personagens, cenários e gráficos de js/video.js (SolowVideo.lib).
   A duração e o instante de cada palavra vêm de parte1-audio.js (gerado com a narração). */
const Short1 = (() => {
  const L = SolowVideo.lib;
  const { T, R, ease, clamp, lerp, f1, rnd } = L;
  const W = 1080, H = 1920, GAP = 0.08;
  const AUD = typeof SHORT1_AUDIO !== "undefined" ? SHORT1_AUDIO : {};
  const COLORS = { paulo: "#3b82f6", larissa: "#ef4444", marcos: "#06b6d4", n: "#ffffff" };

  /* ---------- roteiro ---------- */
  const SCRIPT = [
    { k: "l00", who: "n", text: "Esse conceito cai em toda prova de Economia.", emph: ["toda", "prova"], sfx: [[0, "riser"], ["toda", "impact"]], punch: true },
    { k: "l01", who: "marcos", text: "Fácil! Mais máquina, mais produção. Pra sempre!", emph: ["sempre"] },
    { k: "l02", who: "larissa", text: "Errado, Marcos.", emph: ["errado"], sfx: [[0, "buzz"]], shake: true },
    { k: "l03", who: "n", text: "Olha o Paulo. A pé, ele faz quatro entregas por dia.", emph: ["quatro"], sfx: [[0, "whoosh"], ["quatro", "pop"]] },
    { k: "l04", who: "n", text: "Com uma bicicleta: vinte entregas!", emph: ["vinte"], sfx: [["vinte", "pop"], ["vinte", "coin"]], punch: true },
    { k: "l05", who: "paulo", text: "Comprei a segunda. Vinte e três.", emph: ["três"], sfx: [["três", "pop"]] },
    { k: "l06", who: "paulo", text: "E com a terceira, só vinte e quatro?", emph: ["quatro"], sfx: [["quatro", "womp"]] },
    { k: "l07", who: "larissa", text: "Claro! Você só pedala uma de cada vez.", emph: ["uma"] },
    { k: "l08", who: "n", text: "Cada bicicleta a mais rende menos que a anterior.", emph: ["menos"], sfx: [[0, "whoosh"]] },
    { k: "l09", who: "n", text: "Isso é o produto marginal decrescente do capital.", emph: ["produto", "marginal", "decrescente"], sfx: [["decrescente", "ding"]], punch: true },
    { k: "l10", who: "n", text: "Pausa! Verdadeiro ou falso: dar o dobro de máquinas a cada trabalhador dobra a produção dele?", emph: ["verdadeiro", "falso", "dobro", "dobra"], sfx: [[0, "whoosh"]] },
    { k: "cd", who: "pause", text: "", dur: 3.0, sfx: [[0, "tick"], [1, "tick"], [2, "tick"]] },
    { k: "l11", who: "n", text: "Falso! Cada máquina extra rende menos que a anterior.", emph: ["falso"], sfx: [[0, "ding"]], punch: true },
    { k: "l12", who: "marcos", text: "Tá, mas então o que faz um país crescer de verdade?", emph: ["crescer"], sfx: [[0, "whoosh"]] },
    { k: "l13", who: "larissa", text: "Isso é a parte dois. E anota: esse conceito cai em toda prova.", emph: ["parte", "dois"] },
  ];
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

  /* linha do tempo: duração vinda do áudio */
  let acc = 0;
  const LINES = SCRIPT.map((l, i) => {
    const a = AUD[l.k];
    const dur = l.dur || (a ? a.dur + GAP : Math.max(1.6, l.text.split(" ").length * 0.33));
    const words = a ? a.words.map(([t, d, w]) => ({ t, d, w })) : l.text.split(" ").map((w, j, arr) => ({ t: (j / arr.length) * (dur - 0.3), d: 0.3, w }));
    const line = { ...l, i, start: acc, dur, words };
    acc += dur;
    return line;
  });
  const TOTAL = acc + 0.4;

  /* eventos de efeito sonoro com tempo absoluto (usados na mixagem) */
  const SFX = [];
  LINES.forEach((l) => (l.sfx || []).forEach(([when, kind]) => {
    let t = l.start;
    if (typeof when === "number") t += when;
    else { const w = l.words.find((x) => norm(x.w) === norm(when)); t += w ? w.t : 0; }
    SFX.push({ t: +t.toFixed(3), kind });
  }));

  /* ---------- helpers visuais ---------- */
  const lineAt = (t) => { let l = LINES[0]; for (const x of LINES) if (t >= x.start) l = x; return l; };
  const since = (t, li) => t - LINES[li].start;
  const pop = (x) => { x = clamp(x); return x < 0.6 ? ease(x / 0.6) * 1.12 : 1.12 - 0.12 * ease((x - 0.6) / 0.4); };
  const stroke = (s, x, y, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-size="${o.size || 64}" font-weight="900" text-anchor="${o.anchor || "middle"}" font-family="${L.FONT}" fill="${o.fill || "#fff"}" stroke="#0b1020" stroke-width="${o.sw ?? 12}" stroke-linejoin="round" paint-order="stroke"${o.extra || ""}>${s}</text>`;
  const emoji = (e, x, y, size = 90, rot = 0) => `<text x="${f1(x)}" y="${f1(y)}" font-size="${size}" text-anchor="middle" font-family="Noto Color Emoji, Apple Color Emoji, sans-serif" transform="rotate(${rot} ${f1(x)} ${f1(y)})">${e}</text>`;
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  let _ctx = null;
  function measure(text, size) {
    try {
      if (!_ctx) _ctx = document.createElement("canvas").getContext("2d");
      _ctx.font = `900 ${size}px ${L.FONT}`;
      return _ctx.measureText(text).width;
    } catch { return text.length * size * 0.66; }
  }
  /* legenda palavra por palavra (pedaços de até ~3 palavras) */
  function chunks(words) {
    const out = [];
    let cur = [];
    words.forEach((w) => {
      cur.push(w);
      const len = cur.map((x) => x.w).join(" ").length;
      if (cur.length >= 3 || len > 16 || /[.!?:,]$/.test(w.w)) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);
    return out;
  }
  function caption(l, lt) {
    if (l.who === "pause" || !l.words.length) return "";
    const cs = chunks(l.words);
    let ci = 0;
    cs.forEach((c, i) => { if (lt >= c[0].t - 0.05) ci = i; });
    const c = cs[ci];
    const emph = new Set((l.emph || []).map(norm));
    const y = 1200;
    const fs = 76;
    // largura aproximada para centralizar
    const gap = fs * 0.32;
    const widths = c.map((w) => measure(w.w.toUpperCase(), fs) * 1.06 + gap);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = W / 2 - total / 2;
    let s = "";
    const cStart = c[0].t;
    c.forEach((w, i) => {
      const active = lt >= w.t - 0.04 && lt < w.t + w.d + 0.12;
      const shown = lt >= w.t - 0.06;
      const isE = emph.has(norm(w.w));
      const k = active ? pop((lt - w.t + 0.04) / 0.18) : 1;
      const fill = isE ? (active ? "#facc15" : "#fde047") : active ? "#ffffff" : "#e2e8f0";
      const cx = x + widths[i] / 2;
      if (shown) s += `<g transform="translate(${f1(cx)} ${y}) scale(${f1(k * (isE ? 1.08 : 1))}) translate(${f1(-cx)} ${-y})">${stroke(esc(w.w.toUpperCase()), cx, y, { size: fs, fill })}</g>`;
      x += widths[i];
    });
    // etiqueta de quem fala
    if (l.who !== "n") {
      const nm = L.CH[l.who].name, wd = nm.length * 24 + 50, a = clamp((lt - cStart + 0.2) / 0.2);
      s = `<g opacity="${a}"><rect x="${W / 2 - wd / 2}" y="${y - 150}" width="${wd}" height="52" rx="26" fill="${COLORS[l.who]}"/>${T(W / 2, y - 114, nm, { size: 30, w: 900, fill: "#fff" })}</g>` + s;
    }
    return s;
  }

  /* ---------- cenário vertical (reaproveita a central de entregas) ---------- */
  function background(t, cam) {
    const sc = 2.2, tx = -(1280 * sc - W) / 2 - cam * 80, ty = 1720 - 650 * sc;
    return `<rect width="${W}" height="${H}" fill="#7cb6e8"/><g transform="translate(${f1(tx)} ${f1(ty)}) scale(${sc})">${L.ENV.delivery(t, cam)}</g>`;
  }

  /* gráfico de barras: entregas por bicicleta (desenhado em escala 1,5) */
  function barsCard(t) {
    const vals = [[0, 4, 3], [1, 20, 4], [2, 23, 5], [3, 24, 6]];
    let s = L.card(0, 0, 600, 440, "Entregas por dia × bicicletas", { sub: "cada bicicleta extra rende menos" });
    const bx = 60, by = 110, bw = 500, bh = 270;
    s += L.plot(bx, by, bw, bh, { yl: "" });
    vals.forEach(([v, c, li], i) => {
      const st = since(t, li);
      if (st < 0) return;
      const key = { 3: "quatro", 4: "vinte", 5: "três", 6: "quatro" }[li];
      const w = LINES[li].words.find((x) => norm(x.w) === norm(key));
      const p = clamp((st - (w ? w.t : 0) + 0.1) / 0.45);
      if (p <= 0) return;
      const x = bx + 55 + v * 125, val = Math.round(c * ease(p)), hh = (c / 26) * bh * ease(p);
      s += L.bar(x - 42, by + bh, 84, hh, i ? "url(#gBarBlue)" : "url(#gBarGray)", "", "");
      s += T(x, by + bh + 30, v === 0 ? "a pé" : v + (v === 1 ? " bike" : " bikes"), { size: 19, w: 800, fill: "#475569" });
      s += stroke(String(val), x, by + bh - hh - 14, { size: 38, fill: "#0f172a", sw: 0 });
      if (i && p > 0.5) {
        const d = c - vals[i - 1][1], col = d > 10 ? "#16a34a" : d > 2 ? "#65a30d" : "#dc2626";
        s += `<g transform="translate(${x} ${f1(by + bh - hh + 44)}) scale(${f1(pop((p - 0.5) * 2))})">${L.pill(0, 0, "+" + d, col, 1, 20)}</g>`;
      }
    });
    if (t >= LINES[8].start) s += L.curve(bx + 55, by, 375, bh, (u) => 0.15 + 0.77 * (1 - Math.exp(-u * 3.4)) / (1 - Math.exp(-3.4)), clamp(since(t, 8) / 1.2), "#0f172a", { area: false, width: 4 });
    return `<g transform="translate(90 330) scale(1.5)">${s}</g>`;
  }

  /* ---------- quadro principal ---------- */
  function renderAt(time) {
    const t = clamp(time, 0, TOTAL - 0.001);
    const l = lineAt(t), lt = t - l.start, li = l.i;
    const cam = t / TOTAL;
    // zoom de impacto e tremida
    let zoom = 1, sx = 0, sy = 0;
    if (l.punch) zoom = 1 + 0.07 * (1 - ease(clamp(lt / 0.35)));
    if (l.shake && lt < 0.5) { const a = (1 - lt / 0.5) * 18; sx = Math.sin(lt * 90) * a; sy = Math.cos(lt * 70) * a * 0.6; }
    let s = L.DEFS;
    s += `<g transform="translate(${f1(W / 2 + sx)} ${f1(H / 2 + sy)}) scale(${f1(zoom * (1 + cam * 0.04))}) translate(${-W / 2} ${-H / 2})">`;
    s += background(t, cam);

    // ---- conteúdo central por trecho ----
    if (li <= 2) {
      // gancho
      const p = clamp(t / 0.5);
      const k = pop(p);
      s += `<g transform="translate(540 620) scale(${f1(k)}) rotate(${f1(-4 * (1 - p))})">` + `<rect x="-470" y="-230" width="940" height="400" rx="40" fill="#0b1020" opacity=".88"/>` +
        stroke("ISSO CAI EM", 0, -100, { size: 84, fill: "#fff", sw: 0 }) + stroke("TODA PROVA", 0, 30, { size: 132, fill: "#facc15", sw: 0 }) + stroke("de Economia", 0, 120, { size: 52, fill: "#cbd5e1", sw: 0 }) + `</g>` + emoji("📌", 920, 440, 110, 14);
      if (li === 1) s += `<g transform="translate(540 960) scale(${f1(pop(lt / 0.3))})">${L.pill(0, 0, "“Mais máquina = mais produção pra sempre!”", "#0891b2", 1, 34)}</g>`;
      if (li === 2) { const p2 = clamp(lt / 0.25); s += `<g opacity="${f1(p2)}" transform="translate(540 700) scale(${f1(pop(p2) * 1.4)})">${emoji("❌", 0, 60, 380)}</g><rect width="${W}" height="${H}" fill="#dc2626" opacity="${f1(0.28 * (1 - clamp(lt / 0.5)))}"/>`; }
    } else if (li <= 9) {
      s += barsCard(t);
      if (li === 9 || (li === 8 && lt > 0.3)) {
        const p = li === 9 ? 1 : clamp((lt - 0.3) / 0.4);
        const w = l.words.find((x) => norm(x.w) === "decrescente");
        const stamp = li === 9 && w ? clamp((lt - w.t) / 0.25) : 0;
        if (li === 9) s += `<g transform="translate(540 1040) rotate(-4) scale(${f1(0.6 + 0.4 * pop(stamp))})" opacity="${f1(stamp)}"><rect x="-430" y="-62" width="860" height="124" rx="20" fill="#4f46e5"/><rect x="-418" y="-50" width="836" height="100" rx="14" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="14 10"/>${stroke("PRODUTO MARGINAL DECRESCENTE", 0, 18, { size: 46, fill: "#fff", sw: 0 })}</g>`;
        else s += `<g opacity="${f1(p)}">${L.pill(540, 1045, "cada uma rende MENOS que a anterior", "#dc2626", 1, 32)}</g>`;
      }
      if (li === 6) s += emoji("😬", 930, 360, 100, 10);
      if (li === 4 && lt > 0.6) s += emoji("🚀", 930, 370, 100, -10);
    } else if (li <= 12 && l.k !== "l12") {
      // pausa interativa
      const qp = li === 10 ? clamp(lt / 0.4) : 1;
      s += `<g transform="translate(540 670) scale(${f1(pop(qp))})"><rect x="-460" y="-330" width="920" height="660" rx="40" fill="#fff"/><rect x="-460" y="-330" width="920" height="120" rx="40" fill="#7c3aed"/><rect x="-460" y="-250" width="920" height="40" fill="#7c3aed"/>${stroke("⏸ PAUSA!", 0, -248, { size: 64, fill: "#fff", sw: 0 })}`;
      s += T(0, -120, "Verdadeiro ou falso?", { size: 46, w: 900, fill: "#334155" });
      ["Dar o DOBRO de máquinas", "a cada trabalhador", "DOBRA a produção dele?"].forEach((tx, i) => { s += T(0, -40 + i * 64, tx, { size: 50, w: 800, fill: "#0f172a" }); });
      const reveal = l.k === "l11" ? clamp(lt / 0.3) : 0;
      [["VERDADEIRO", -215, "#16a34a"], ["FALSO", 215, "#dc2626"]].forEach(([lab, x, c], i) => {
        const chosen = i === 1 && reveal > 0, dim = i === 0 && reveal > 0;
        s += `<g opacity="${dim ? 0.35 : 1}" transform="translate(${x} 230) scale(${f1(chosen ? pop(reveal) * 1.06 : 1)})"><rect x="-195" y="-60" width="390" height="120" rx="60" fill="${chosen ? c : "#f1f5f9"}" stroke="${c}" stroke-width="6"/>${T(0, 18, lab, { size: 46, w: 900, fill: chosen ? "#fff" : c })}</g>`;
      });
      s += `</g>`;
      if (l.k === "cd") {
        const n = 3 - Math.floor(lt);
        const frac = lt % 1;
        s += `<g transform="translate(540 1130)"><circle r="96" fill="#0b1020" opacity=".9"/><circle r="84" fill="none" stroke="#334155" stroke-width="14"/><circle r="84" fill="none" stroke="#facc15" stroke-width="14" stroke-dasharray="${f1(528 * (1 - frac))} 600" transform="rotate(-90)" stroke-linecap="round"/><g transform="scale(${f1(pop(frac / 0.25))})">${stroke(String(Math.max(1, n)), 0, 34, { size: 110, fill: "#fff", sw: 0 })}</g></g>`;
        s += stroke("comenta sua resposta 👇", 540, 1300, { size: 44, fill: "#fff", sw: 10 });
      }
      if (l.k === "l11") s += emoji("✅", 860, 900, 130, 10);
    } else {
      // gancho para a parte 2
      const p = clamp(since(t, 14) / 0.5);
      s += `<g transform="translate(540 650)"><rect x="-460" y="-280" width="920" height="560" rx="40" fill="#0b1020" opacity=".9"/>${stroke("PARTE 2", 0, -150, { size: 110, fill: "#facc15", sw: 0 })}${T(0, -60, "O que faz um país", { size: 54, w: 900, fill: "#fff" })}${T(0, 10, "crescer de verdade?", { size: 54, w: 900, fill: "#fff" })}<g opacity="${f1(p)}" transform="translate(0 150) scale(${f1(pop(p))})"><rect x="-300" y="-56" width="600" height="112" rx="56" fill="#ef4444"/>${stroke("SEGUE PRA VER 👀", 0, 18, { size: 46, fill: "#fff", sw: 0 })}</g></g>`;
      s += emoji("🤔", 880, 360, 110, 12);
    }

    // ---- personagens ----
    const talk = (w) => l.who === w;
    const shock = li === 2 ? { marcos: true } : {};
    const bike = li >= 4 && li <= 9;
    const cast = [];
    cast.push(["marcos", 205, 1760, { scale: 1.55, shock: shock.marcos, point: li === 1, cheer: li === 1 && lt < 0.6 }]);
    cast.push(["larissa", 875, 1760, { scale: 1.55, flip: true, point: li === 2 || li === 7 }]);
    cast.push(["paulo", 540, 1780, bike ? { bike: true, scale: 1.25, speed: li === 4 ? 10 : 2.5 } : { scale: 1.6 }]);
    s += cast.map(([who, x, y, o]) => {
      const fig = o.bike ? L.cyclist(x, y, t, { ...o, talk: talk(who) }) : L.person(who, x, y, { t: t + x * 0.01, talk: talk(who) && !o.shock, ...o });
      return fig;
    }).join("");
    if (li === 2) s += emoji("😱", 330, 1330, 84, -8);
    s += `</g>`;

    // ---- camadas fixas: legenda, título, barra de progresso ----
    s += `<rect width="${W}" height="${H}" fill="url(#gVignette)"/>`;
    s += caption(l, lt);
    s += `<rect x="0" y="0" width="${W}" height="12" fill="#0b1020" opacity=".5"/><rect x="0" y="0" width="${f1(W * (t / TOTAL))}" height="12" fill="#facc15"/>`;
    s += `<g transform="translate(540 230)"><rect x="-330" y="-46" width="660" height="92" rx="46" fill="#0b1020" opacity=".86"/>${T(-10, 14, "ECONOMIA EM 1 MINUTO", { size: 36, w: 900, fill: "#fff" })}<rect x="214" y="-30" width="100" height="60" rx="30" fill="#4f46e5"/>${T(264, 12, "P1", { size: 32, w: 900, fill: "#fff" })}</g>`;
    // transição rápida (flash branco) nas trocas de bloco
    [3, 10, 13].forEach((k) => { const d = t - LINES[k].start; if (d >= 0 && d < 0.18) s += `<rect width="${W}" height="${H}" fill="#fff" opacity="${f1(0.55 * (1 - d / 0.18))}"/>`; });
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  }

  return { SCRIPT, LINES, TOTAL, SFX, renderAt, W, H };
})();
