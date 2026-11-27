/* Gráficos SVG do modelo de Solow — sem dependências.
   Função de produção usada nas ilustrações: y = k^α, α = 1/3 (Cobb-Douglas). */

const Charts = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const ALPHA = 1 / 3;
  const f = (k) => Math.pow(Math.max(k, 0), ALPHA);
  const mpk = (k) => ALPHA * Math.pow(k, ALPHA - 1);
  const kStar = (s, x) => Math.pow(s / x, 1 / (1 - ALPHA));
  const kGold = (x) => Math.pow(ALPHA / x, 1 / (1 - ALPHA));
  let uid = 0;

  function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, str, attrs = {}) {
    const t = el("text", { x, y, ...attrs }, parent);
    t.textContent = str;
    return t;
  }

  /* Redesenho responsivo: o SVG usa a largura real do contêiner (1 unidade = 1px),
     então o texto fica sempre em tamanho legível. Ao mudar a largura, redesenha. */
  const RO = typeof ResizeObserver !== "undefined" ? new ResizeObserver((ents) => {
    ents.forEach((e) => {
      const c = e.target, w = Math.round(e.contentRect.width);
      if (w > 0 && Math.abs(w - (c._w || 0)) > 3 && c._redraw) { c._w = w; c._redraw(); }
    });
  }) : null;
  function reg(container, fn) {
    container._redraw = fn;
    if (RO && !container._obs) { RO.observe(container); container._obs = true; }
  }

  /* Cria um quadro com eixos. Retorna escalas e grupos. */
  function frame(container, o) {
    container.innerHTML = "";
    const bw = o.w || 520, bh = o.h || 320;
    const cw = Math.round(container.clientWidth) || bw;
    container._w = cw;
    const W = Math.max(260, cw);
    // mantém a proporção, mas com altura mínima legível e máxima confortável
    const H = Math.round(Math.min(bh * 1.35, Math.max(o.minH || 230, (W * bh) / bw)));
    const narrow = W < 420;
    const m = Object.assign({ l: 44, r: narrow ? 64 : 84, t: 16, b: 38 }, o.m || {});
    if (narrow && o.m && o.m.r) m.r = Math.min(m.r, 70);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": o.aria || "gráfico" }, container);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x0 = o.xmin || 0, y0 = o.ymin || 0;
    const X = (v) => m.l + ((v - x0) / (o.xmax - x0)) * iw;
    const Y = (v) => m.t + ih - ((v - y0) / (o.ymax - y0)) * ih;
    const id = "clip" + ++uid;
    const defs = el("defs", {}, svg);
    const cp = el("clipPath", { id }, defs);
    el("rect", { x: m.l, y: m.t - 2, width: iw + 2, height: ih + 2 }, cp);
    const mk = el("marker", { id: id + "a", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0 L10,5 L0,10 z", class: "arrowhead" }, mk);

    // gradientes para as áreas sob as curvas (cores do tema via CSS)
    const grads = {};
    ["f", "s", "d", "c", "gold"].forEach((k) => {
      const g = el("linearGradient", { id: id + "g" + k, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el("stop", { offset: 0, style: `stop-color:var(--c-${k});stop-opacity:${k === "f" ? 0.09 : 0.2}` }, g);
      el("stop", { offset: 1, style: `stop-color:var(--c-${k});stop-opacity:0` }, g);
      grads[k] = `url(#${id}g${k})`;
    });
    // grade leve (horizontal e vertical)
    const gg = el("g", {}, svg);
    for (let i = 0; i < 4; i++) {
      const yy = m.t + (ih * i) / 4;
      el("line", { x1: m.l, x2: m.l + iw, y1: yy, y2: yy, class: "gridl" }, gg);
    }
    for (let i = 1; i <= 5; i++) {
      const xx = m.l + (iw * i) / 6;
      el("line", { x1: xx, x2: xx, y1: m.t, y2: m.t + ih, class: "gridl v" }, gg);
    }
    // eixos com setas
    el("line", { x1: m.l, x2: m.l + iw + 6, y1: m.t + ih, y2: m.t + ih, class: "ax", "marker-end": `url(#${id}a)` }, svg);
    el("line", { x1: m.l, x2: m.l, y1: m.t + ih, y2: m.t - 6, class: "ax", "marker-end": `url(#${id}a)` }, svg);
    if (o.xlabel) text(svg, m.l + iw, m.t + ih + 28, o.xlabel, { "text-anchor": "end" });
    if (o.ylabel) text(svg, m.l - 8, m.t + 4, o.ylabel, { "text-anchor": "end" });

    const plot = el("g", { "clip-path": `url(#${id})` }, svg);
    const over = el("g", {}, svg);
    return { svg, plot, over, X, Y, m, iw, ih, W, H, marker: `url(#${id}a)`, grads };
  }

  function pathFn(F, fn, a, b, n = 140) {
    let d = "";
    for (let i = 0; i <= n; i++) {
      const v = a + ((b - a) * i) / n;
      const px = F.X(v), py = F.Y(fn(v));
      d += (i ? "L" : "M") + px.toFixed(2) + "," + py.toFixed(2);
    }
    return d;
  }
  function pathData(F, data, xs) {
    let d = "";
    data.forEach((v, i) => {
      d += (i ? "L" : "M") + F.X(xs ? xs[i] : i).toFixed(2) + "," + F.Y(v).toFixed(2);
    });
    return d;
  }

  /* Rótulo no fim de uma curva, evitando sobreposição simples */
  function endLabel(F, used, x, y, str, cls) {
    let py = Math.max(F.m.t + 8, Math.min(F.m.t + F.ih, y));
    for (let tries = 0; tries < 8; tries++) {
      if (used.every((u) => Math.abs(u - py) > 13)) break;
      py += 13;
    }
    used.push(py);
    text(F.over, x + 6, py + 4, str, { class: "lbl " + cls });
  }

  /* ---------- Diagrama de Solow genérico ---------- */
  function solow(container, cfg) {
    reg(container, () => solow(container, cfg));
    const p = cfg.p;
    const x = p.d + (p.n || 0) + (p.g || 0);
    const kmax = cfg.kmax || 12, ymax = cfg.ymax || 2.4;
    const F = frame(container, { xmax: kmax, ymax, xlabel: cfg.xlabel || "k (capital por trabalhador" + (p.g ? " efetivo)" : ")"), ylabel: "", aria: cfg.aria });
    const used = [];
    const ks = kStar(p.s, x);
    const lab = cfg.labels || {};

    // faixa de consumo (fig Regra de Ouro)
    if (cfg.band) {
      let d = pathFn(F, f, 0, kmax);
      let back = "";
      for (let i = 140; i >= 0; i--) {
        const v = (kmax * i) / 140;
        back += "L" + F.X(v).toFixed(2) + "," + F.Y(Math.min(x * v, f(v))).toFixed(2);
      }
      el("path", { d: d + back + "Z", class: "band" }, F.plot);
    }

    // fantasma (referência)
    if (cfg.ghost) {
      const g = cfg.ghost, gx = g.d + (g.n || 0) + (g.g || 0);
      if (!cfg.hideS) el("path", { d: pathFn(F, (k) => g.s * f(k), 0, kmax), class: "ln ghost s" }, F.plot);
      el("path", { d: pathFn(F, (k) => gx * k, 0, kmax), class: "ln ghost d" }, F.plot);
      const gks = kStar(g.s, gx);
      if (gks <= kmax && !cfg.hideS) {
        el("line", { x1: F.X(gks), x2: F.X(gks), y1: F.Y(0), y2: F.Y(g.s * f(gks)), class: "guide" }, F.plot);
        el("circle", { cx: F.X(gks), cy: F.Y(g.s * f(gks)), r: 3.5, class: "ts", opacity: 0.45 }, F.over);
        text(F.over, F.X(gks), F.Y(0) + 15, lab.ghostK || "k*₁", { "text-anchor": "middle", opacity: 0.8 });
      }
      if (lab.ghostS && !cfg.hideS) endLabel(F, used, F.X(kmax), F.Y(g.s * f(kmax)), lab.ghostS, "ts");
      if (lab.ghostD) endLabel(F, used, F.X(Math.min(kmax, ymax / gx)), F.Y(Math.min(gx * kmax, ymax)), lab.ghostD, "td");
    }

    const area = (fn, k) => el("path", { d: pathFn(F, fn, 0, kmax) + `L${F.X(kmax)},${F.Y(0)} L${F.X(0)},${F.Y(0)} Z`, fill: F.grads[k], stroke: "none" }, F.plot);
    if (cfg.showF !== false && !cfg.band) area(f, "f");
    if (!cfg.hideS) area((k) => p.s * f(k), "s");
    if (cfg.showF !== false) {
      el("path", { d: pathFn(F, f, 0, kmax), class: "ln f" }, F.plot);
      endLabel(F, used, F.X(kmax), F.Y(f(kmax)), lab.f || "f(k)", "tf");
    }
    if (!cfg.hideS) {
      el("path", { d: pathFn(F, (k) => p.s * f(k), 0, kmax), class: "ln s" }, F.plot);
      endLabel(F, used, F.X(kmax), F.Y(p.s * f(kmax)), lab.s || "sf(k)", "ts");
    }
    el("path", { d: pathFn(F, (k) => x * k, 0, kmax), class: "ln d" }, F.plot);
    {
      const ke = Math.min(kmax, ymax / x);
      endLabel(F, used, F.X(ke), F.Y(Math.min(x * kmax, ymax)), lab.d || dLabel(p), "td");
    }

    // Regra de Ouro
    if (cfg.showGold) {
      const kg = kGold(x);
      if (kg <= kmax) {
        const yg = f(kg);
        const span = kmax * 0.22;
        el("line", { x1: F.X(kg - span), y1: F.Y(yg - x * span), x2: F.X(kg + span), y2: F.Y(yg + x * span), class: "guide", style: "stroke:var(--c-gold);opacity:.9" }, F.plot);
        el("line", { x1: F.X(kg), x2: F.X(kg), y1: F.Y(0), y2: F.Y(yg), class: "guide", style: "stroke:var(--c-gold)" }, F.plot);
        el("line", { x1: F.X(kg), x2: F.X(kg), y1: F.Y(x * kg), y2: F.Y(yg), class: "cgap", style: "stroke:var(--c-gold)" }, F.plot);
        el("circle", { cx: F.X(kg), cy: F.Y(yg), r: 10, class: "tgold halo" }, F.over);
        el("circle", { cx: F.X(kg), cy: F.Y(yg), r: 4.5, class: "tgold dot" }, F.over);
        text(F.over, F.X(kg), F.Y(yg) - 10, cfg.goldLabel || "k*ouro", { "text-anchor": "middle", class: "tgold lbl" });
        if (cfg.goldNote) text(F.over, F.X(kg) + 8, F.Y((yg + x * kg) / 2) + 4, cfg.goldNote, { class: "tgold lbl" });
      }
    }

    // Estado estacionário
    if (!cfg.hideS) {
      if (ks <= kmax) {
        const yi = p.s * f(ks);
        el("line", { x1: F.X(ks), x2: F.X(ks), y1: F.Y(0), y2: F.Y(cfg.showC || cfg.showF !== false ? f(ks) : yi), class: "guide" }, F.plot);
        if (cfg.showC) {
          el("line", { x1: F.X(ks), x2: F.X(ks), y1: F.Y(yi), y2: F.Y(f(ks)), class: "cgap" }, F.plot);
          text(F.over, F.X(ks) - 6, F.Y((yi + f(ks)) / 2) + 4, "c*", { class: "lbl tc", "text-anchor": "end" });
        }
        el("circle", { cx: F.X(ks), cy: F.Y(yi), r: 10, class: "ts halo" }, F.over);
        el("circle", { cx: F.X(ks), cy: F.Y(yi), r: 5, class: "ts dot" }, F.over);
        if (cfg.showF !== false) el("circle", { cx: F.X(ks), cy: F.Y(f(ks)), r: 3.5, class: "tf dot" }, F.over);
        text(F.over, F.X(ks), F.Y(0) + 15, lab.k || "k*", { "text-anchor": "middle", class: "lbl", style: "fill:var(--text)" });
      } else {
        text(F.over, F.X(kmax) - 4, F.Y(0) - 8, "k* fora da escala →", { "text-anchor": "end", class: "lbl", style: "fill:var(--text)" });
      }
    }

    // Setas de convergência
    if (cfg.arrows && ks <= kmax) {
      const yA = F.Y(0) - 14;
      const k1 = ks * 0.35, k2 = Math.min(kmax * 0.95, ks * 1.6);
      el("line", { x1: F.X(k1), x2: F.X(ks) - 10, y1: yA, y2: yA, class: "arrow", "marker-end": F.marker }, F.over);
      el("line", { x1: F.X(k2), x2: F.X(ks) + 10, y1: yA, y2: yA, class: "arrow", "marker-end": F.marker }, F.over);
      text(F.over, F.X(k1), yA - 6, "k₁", { "text-anchor": "middle" });
      text(F.over, F.X(k2), yA - 6, "k₂", { "text-anchor": "middle" });
      el("line", { x1: F.X(k1), x2: F.X(k1), y1: F.Y(0), y2: F.Y(p.s * f(k1)), class: "guide" }, F.plot);
      el("line", { x1: F.X(k2), x2: F.X(k2), y1: F.Y(0), y2: F.Y(x * k2), class: "guide" }, F.plot);
    }
    return { ks, kg: kGold(x), x };
  }

  function dLabel(p) {
    let s = "(δ";
    if (p.n) s += "+n";
    if (p.g) s += "+g";
    s += ")k";
    return s === "(δ)k" ? "δk" : s;
  }

  /* ---------- Séries temporais ---------- */
  function series(container, o) {
    reg(container, () => series(container, o));
    const all = o.series.flatMap((s) => s.data);
    let ymin = o.ymin !== undefined ? o.ymin : Math.min(...all);
    let ymax = o.ymax !== undefined ? o.ymax : Math.max(...all);
    const pad = (ymax - ymin) * 0.1 || 0.1;
    if (o.ymin === undefined) ymin -= pad;
    if (o.ymax === undefined) ymax += pad;
    const T = o.series[0].data.length - 1;
    const F = frame(container, { xmax: T, ymin, ymax, xlabel: o.xlabel || "tempo", aria: o.aria, w: o.w, h: o.h || 280, m: { l: 20, r: 92 } });
    const used = [];
    if (o.t0 !== undefined) {
      el("line", { x1: F.X(o.t0), x2: F.X(o.t0), y1: F.Y(ymin), y2: F.Y(ymax), class: "guide" }, F.plot);
      text(F.over, F.X(o.t0), F.Y(ymin) + 15, "t₀", { "text-anchor": "middle", class: "lbl", style: "fill:var(--text)" });
    }
    o.series.forEach((s) => {
      if (!s.ghost && o.area !== false && !F._areaDone && F.grads[s.cls]) {
        F._areaDone = true;
        el("path", { d: pathData(F, s.data) + `L${F.X(T)},${F.Y(ymin)} L${F.X(0)},${F.Y(ymin)} Z`, fill: F.grads[s.cls], stroke: "none" }, F.plot);
      }
      el("path", { d: pathData(F, s.data), class: "ln " + s.cls + (s.ghost ? " ghost" : "") }, F.plot);
      if (s.label) endLabel(F, used, F.X(T), F.Y(s.data[T]), s.label, "t" + s.cls);
    });
    if (o.note) text(F.over, F.m.l + 6, F.m.t + 12, o.note, {});
    return F;
  }

  /* Simulação discreta: k_{t+1} = k + s f(k) – (δ+n+g)k */
  function simulate(p0, p1, T = 100, t0 = 10, k0) {
    const x0 = p0.d + p0.n + p0.g;
    let k = k0 !== undefined ? k0 : kStar(p0.s, x0);
    const out = { k: [], y: [], c: [], i: [], lnYL: [] };
    let lnE = 0;
    for (let t = 0; t <= T; t++) {
      const p = t < t0 ? p0 : p1;
      const x = p.d + p.n + p.g;
      const y = f(k);
      out.k.push(k); out.y.push(y); out.c.push((1 - p.s) * y); out.i.push(p.s * y);
      out.lnYL.push(Math.log(y) + lnE);
      lnE += Math.log(1 + p.g);
      k = k + p.s * y - x * k;
    }
    return out;
  }

  /* ---------- Figuras estáticas da revisão ---------- */
  const figs = {
    steady(c) {
      const div = mount(c);
      solow(div, { p: { s: 0.3, d: 0.1 }, kmax: 12, ymax: 2.4, arrows: true, aria: "Estado estacionário", labels: { f: "produção", s: "investimento", d: "depreciação", k: "estado estac." }, xlabel: "capital por trabalhador" });
      legend(c, [["f", "produção por trabalhador"], ["s", "investimento (parte poupada)"], ["d", "depreciação (desgaste)"]]);
    },
    saving(c) {
      const div = mount(c);
      solow(div, { p: { s: 0.4, d: 0.1 }, ghost: { s: 0.25, d: 0.1 }, showF: false, kmax: 12, ymax: 1.4, labels: { s: "invest. (mais poupança)", ghostS: "invest. (antes)", d: "depreciação", k: "novo", ghostK: "antigo" }, aria: "Aumento da poupança", xlabel: "capital por trabalhador" });
      legend(c, [["s", "investimento com poupança maior"], ["s dash", "investimento antes"], ["d", "depreciação"]]);
    },
    gold(c) {
      const div = mount(c);
      solow(div, { p: { s: 0.3, d: 0.1 }, hideS: true, band: true, showGold: true, goldNote: "consumo máximo", goldLabel: "Regra de Ouro", kmax: 14, ymax: 2.6, labels: { f: "produção", d: "depreciação" }, aria: "Regra de Ouro", xlabel: "capital por trabalhador" });
      legend(c, [["f", "produção"], ["d", "o que é gasto repondo capital"], ["gold", "Regra de Ouro"], ["c", "área = o que sobra para consumir"]]);
    },
    pop(c) {
      const div = mount(c);
      solow(div, { p: { s: 0.3, d: 0.06, n: 0.04 }, ghost: { s: 0.3, d: 0.06, n: 0.01 }, showF: false, kmax: 12, ymax: 1.0, labels: { s: "investimento", d: "equilíbrio (pop. ↑)", ghostD: "equilíbrio (antes)", k: "novo", ghostK: "antigo" }, aria: "Aumento do crescimento populacional", xlabel: "capital por trabalhador" });
      legend(c, [["s", "investimento"], ["d", "investimento de equilíbrio com mais população"], ["d dash", "investimento de equilíbrio antes"]]);
    },
    trans(c) {
      const wrap = document.createElement("div");
      const ctrl = document.createElement("div");
      ctrl.className = "fig-ctrl";
      ctrl.innerHTML = `<div class="seg"><button class="seg-b on" data-v="below">Capital de menos → ↑ s</button><button class="seg-b" data-v="above">Capital demais → ↓ s</button></div>`;
      const div = document.createElement("div");
      div.className = "chart";
      const note = document.createElement("p");
      note.className = "muted small";
      note.style.marginTop = "8px";
      wrap.append(ctrl, div, note);
      c.prepend(wrap);
      const base = { d: 0.05, n: 0.01, g: 0.02 };
      const draw = (v) => {
        const s0 = v === "below" ? 0.2 : 0.5;
        const sim = simulate({ ...base, s: s0 }, { ...base, s: ALPHA }, 90, 10);
        series(div, {
          t0: 10, ymin: 0,
          series: [
            { data: sim.y, cls: "f", label: "Produção" },
            { data: sim.c, cls: "c", label: "Consumo" },
            { data: sim.i, cls: "s", label: "Investimento" },
            { data: sim.c.map(() => sim.c[0]), cls: "c", ghost: true },
          ],
          aria: "Transição para a Regra de Ouro",
        });
        note.innerHTML = v === "below"
          ? "Consumo <b>cai</b> em t₀ e depois sobe até <b>superar</b> o nível inicial (linha tracejada). Sacrifício da geração atual."
          : "Consumo <b>sobe</b> em t₀ e fica <b>acima do inicial</b> (tracejado) durante toda a transição, embora produção e investimento caiam.";
      };
      segBind(ctrl, draw);
      draw("below");
    },
    converge(c) {
      const wrap = document.createElement("div");
      const ctrl = document.createElement("div");
      ctrl.className = "fig-ctrl";
      ctrl.innerHTML = `<div class="seg"><button class="seg-b on" data-v="same">Mesmo estado estacionário</button><button class="seg-b" data-v="diff">Estados diferentes</button></div>`;
      const div = document.createElement("div");
      div.className = "chart";
      const note = document.createElement("p");
      note.className = "muted small";
      note.style.marginTop = "8px";
      wrap.append(ctrl, div, note);
      c.prepend(wrap);
      const draw = (v) => {
        const pr = { s: 0.3, d: 0.05, n: 0.01, g: 0.02 };
        const pp = v === "same" ? pr : { s: 0.12, d: 0.05, n: 0.03, g: 0.02 };
        const kRich = kStar(pr.s, 0.08) * 1.05;
        const rich = simulate(pr, pr, 100, 0, kRich);
        const poor = simulate(pp, pp, 100, 0, kRich * 0.12);
        series(div, {
          series: [
            { data: rich.lnYL, cls: "s", label: "Rico" },
            { data: poor.lnYL, cls: "d", label: "Pobre" },
          ],
          aria: "Convergência",
          note: "ln (renda por trabalhador)",
        });
        note.innerHTML = v === "same"
          ? "Mesma poupança, população e tecnologia: o pobre <b>cresce mais rápido</b> e <b>alcança</b> o rico. As duas curvas acabam crescendo à taxa g."
          : "O pobre poupa menos e tem população crescendo mais: vai ao <b>seu próprio</b> estado estacionário, mais baixo. Cresce à mesma taxa g, mas <b>não alcança</b> (convergência condicional).";
      };
      segBind(ctrl, draw);
      draw("same");
    },
    ak(c) {
      const div = mount(c);
      const T = 80, t0 = 15;
      const p0 = { s: 0.2, d: 0.05, n: 0.01, g: 0.02 }, p1 = { ...p0, s: 0.32 };
      const sol = simulate(p0, p1, T, t0);
      const solBase = simulate(p0, p0, T, t0);
      // calibrado para que, antes de t₀, o AK cresça à mesma taxa que Solow (g = 2%)
      const A = 0.32, dA = p0.s * A - 0.02;
      const ak = [], akBase = [];
      let ly = sol.lnYL[0], lb = sol.lnYL[0];
      for (let t = 0; t <= T; t++) {
        ak.push(ly); akBase.push(lb);
        const s = t < t0 ? p0.s : p1.s;
        ly += Math.log(1 + (s * A - dA));
        lb += Math.log(1 + (p0.s * A - dA));
      }
      series(div, {
        t0,
        series: [
          { data: solBase.lnYL, cls: "s", ghost: true },
          { data: akBase, cls: "d", ghost: true },
          { data: sol.lnYL, cls: "s", label: "Solow" },
          { data: ak, cls: "d", label: "AK" },
        ],
        aria: "Solow versus AK",
        note: "ln (renda por trabalhador)",
      });
      legend(c, [["s", "Solow: inclinação volta à de antes (só g)"], ["d", "AK: inclinação maior para sempre (sA – δ)"], ["f dash", "tracejado: sem a mudança"]]);
    },
  };

  function mount(c) {
    const div = document.createElement("div");
    div.className = "chart";
    c.prepend(div);
    return div;
  }
  function legend(c, items) {
    const lg = document.createElement("div");
    lg.className = "legend";
    lg.innerHTML = items.map(([cls, t]) => {
      const [k, dash] = cls.split(" ");
      return `<span><i class="${dash ? "dash" : ""}" style="background:var(--c-${k});color:var(--c-${k})"></i>${t}</span>`;
    }).join("");
    const cap = c.querySelector("figcaption");
    cap ? c.insertBefore(lg, cap) : c.appendChild(lg);
  }
  function segBind(ctrl, fn) {
    ctrl.querySelectorAll(".seg-b").forEach((b) =>
      b.addEventListener("click", () => {
        ctrl.querySelectorAll(".seg-b").forEach((x) => x.classList.toggle("on", x === b));
        fn(b.dataset.v);
      })
    );
  }

  function renderFigures(root = document) {
    root.querySelectorAll("[data-fig]").forEach((c) => {
      if (c.dataset.done) return;
      const fn = figs[c.dataset.fig];
      if (fn) { fn(c); c.dataset.done = "1"; }
    });
  }

  return { ALPHA, f, mpk, kStar, kGold, solow, series, simulate, renderFigures, legend };
})();
