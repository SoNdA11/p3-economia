/* App: navegação, tema, progresso, quiz, flashcards (repetição espaçada), jogos,
   laboratório, busca, atividade e cola. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CAP_NAME = { "8": "Capítulo 8", "9": "Capítulo 9", A: "Apêndice" };
  const DAY = 86400000;
  const SRS_DAYS = [0, 1, 3, 7, 14, 30];

  /* ---------- utilidades ---------- */
  const hash = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };
  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const fmtTime = (ms) => { const t = Math.max(0, Math.round(ms / 1000)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };

  QUESTIONS.forEach((q) => (q.id = hash(q.q)));
  FLASHCARDS.forEach((c) => (c.id = hash(c.f)));
  const QBY = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

  /* ---------- armazenamento ---------- */
  const KEY = "p3-econ-v1";
  const store = (() => {
    let d;
    try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { d = {}; }
    d.q = d.q || {}; d.fcs = d.fcs || {}; d.read = d.read || {};
    d.tfBest = d.tfBest || 0; d.shockBest = d.shockBest || 0; d.matchRounds = d.matchRounds || 0;
    // migração: marcações antigas de "já sei" viram caixa 2 da repetição espaçada
    if (d.fc) { Object.keys(d.fc).forEach((id) => { if (!d.fcs[id]) d.fcs[id] = { box: 2, due: Date.now() + 3 * DAY }; }); delete d.fc; }
    let t = null;
    const save = () => { clearTimeout(t); t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }, 150); };
    return { d, save };
  })();
  const recordAnswer = (q, ok) => {
    const r = store.d.q[q.id] || { seen: 0, ok: 0, last: null };
    r.seen++; if (ok) r.ok++; r.last = ok ? 1 : 0;
    store.d.q[q.id] = r;
    store.save();
  };
  const wrongQs = () => QUESTIONS.filter((q) => store.d.q[q.id] && store.d.q[q.id].last === 0);
  const unseenQs = () => QUESTIONS.filter((q) => !store.d.q[q.id]);
  const isDue = (c) => { const r = store.d.fcs[c.id]; return !r || r.due <= Date.now(); };
  const isLearned = (c) => { const r = store.d.fcs[c.id]; return !!r && r.box >= 2; };

  /* ---------- tema ---------- */
  $("#themeToggle").addEventListener("click", () => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    localStorage.setItem("p3-theme", t);
  });

  /* ---------- roteamento ---------- */
  const PAGES = ["inicio", "revisao", "video", "diagramas", "quiz", "flashcards", "jogos", "atividade", "cola"];
  let labInit = false, cameFromQuiz = false, currentPage = null;
  function route() {
    const h = decodeURIComponent(location.hash.slice(1)) || "inicio";
    let page = PAGES.includes(h) ? h : null;
    let anchor = null;
    if (!page && h.startsWith("r-")) { page = "revisao"; anchor = h; }
    if (!page) page = "inicio";
    PAGES.forEach((p) => ($("#" + p).hidden = p !== page));
    $$("[data-tab]").forEach((a) => a.classList.toggle("on", a.dataset.tab === page));
    closeMore();
    if (page !== "revisao") cameFromQuiz = false;
    $("#backPill").hidden = !(page === "revisao" && cameFromQuiz && Q);
    $("#readbar").hidden = page !== "revisao";
    if (page === "inicio") renderHome();
    if (page === "revisao" || page === "diagramas") Charts.renderFigures($("#" + page));
    if (page === "diagramas" && !labInit) { initLab(); labInit = true; }
    if (page === "quiz") updateAvail();
    if (page === "flashcards") { fcBuild(); fcRender(); }
    if (page === "atividade") renderAtividade();
    if (page === "cola") renderCola();
    if (page === "video") initVideo(); else if (VP && VP.state.playing) VP.pause();
    if (anchor) {
      requestAnimationFrame(() => {
        const t = document.getElementById(anchor);
        if (t) { if (t.tagName === "DETAILS") t.open = true; t.scrollIntoView(); flash(t); }
      });
    } else if (page !== currentPage) window.scrollTo(0, 0);
    currentPage = page;
    if (page === "revisao") onReadScroll();
  }
  function flash(el) {
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }
  window.addEventListener("hashchange", route);
  const go = (h) => { if (location.hash === "#" + h) route(); else location.hash = h; };

  /* ---------- navegação inferior (celular) ---------- */
  const moreBtn = $("#moreBtn"), moreSheet = $("#moreSheet");
  function closeMore() { moreSheet.hidden = true; moreBtn.setAttribute("aria-expanded", "false"); }
  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = moreSheet.hidden;
    moreSheet.hidden = !open; moreBtn.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => { if (!moreSheet.hidden && !moreSheet.contains(e.target)) closeMore(); });
  $("#moreSearch").addEventListener("click", () => { closeMore(); openSearch(); });

  /* ============================== INÍCIO ============================== */
  $$('[data-count="questions"]').forEach((e) => (e.textContent = QUESTIONS.length));
  $$('[data-count="flashcards"]').forEach((e) => (e.textContent = FLASHCARDS.length));

  function renderHome() {
    const qs = store.d.q;
    const seen = QUESTIONS.length - unseenQs().length;
    let tot = 0, ok = 0;
    QUESTIONS.forEach((q) => { if (qs[q.id]) { tot += qs[q.id].seen; ok += qs[q.id].ok; } });
    const learned = FLASHCARDS.filter(isLearned).length;
    const due = FLASHCARDS.filter(isDue).length;
    const wrong = wrongQs();
    const secs = $$(".prose h3[id]");
    const readN = secs.filter((h) => store.d.read[h.id]).length;
    const firstUnread = secs.find((h) => !store.d.read[h.id]);

    // bloco "continuar"
    const items = [];
    if (wrong.length) items.push(`<button class="next-item" data-act="wrong"><b>${wrong.length}</b><span>${wrong.length > 1 ? "questões" : "questão"} que você errou<em>Refazer agora →</em></span></button>`);
    if (due) items.push(`<button class="next-item" data-act="fc"><b>${due}</b><span>flashcard${due > 1 ? "s" : ""} para hoje<em>Revisar →</em></span></button>`);
    if (readN < secs.length) items.push(`<button class="next-item" data-act="read"><b>${readN}/${secs.length}</b><span>seções da revisão lidas<em>${readN ? "Continuar em “" + esc(firstUnread.textContent) + "” →" : "Começar a leitura →"}</em></span></button>`);
    const un = unseenQs().length;
    if (un) items.push(`<button class="next-item" data-act="new"><b>${un}</b><span>questões que você ainda não viu<em>Quiz com 20 novas →</em></span></button>`);
    if (!items.length) items.push(`<div class="next-item done"><b>✓</b><span>Tudo em dia. Faça um simulado cronometrado para fechar.<em></em></span></div>`);
    $("#homeNext").innerHTML = `<h2>Continue de onde parou</h2><div class="next-grid">${items.join("")}</div>`;
    $$("#homeNext [data-act]").forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "wrong") startQuizWith(shuffle(wrongQs()));
      if (a === "fc") { FC.mode = "due"; FC.cap = "all"; syncFcSegs(); go("flashcards"); }
      if (a === "read") go(firstUnread ? firstUnread.id : "revisao");
      if (a === "new") startQuizWith(shuffle(unseenQs()).slice(0, 20));
    }));

    $("#homeProgress").innerHTML = `
      <h3>Seu progresso</h3>
      <div class="pstat"><span>Questões já vistas</span><b>${seen} / ${QUESTIONS.length}</b></div>
      <div class="pstat"><span>Acerto geral</span><b>${tot ? Math.round((ok / tot) * 100) + "%" : "—"}</b></div>
      <div class="pstat"><span>Para revisar (última errada)</span><b>${wrong.length}</b></div>
      <div class="pstat"><span>Flashcards aprendidos</span><b>${learned} / ${FLASHCARDS.length}</b></div>
      <div class="pstat"><span>Seções da revisão lidas</span><b>${readN} / ${secs.length}</b></div>
      <div class="pstat"><span>Maior sequência no V ou F</span><b>${store.d.tfBest}</b></div>
      <p style="margin-top:12px"><button class="btn ghost sm" id="resetAll">Zerar progresso</button></p>`;
    $("#resetAll").onclick = () => {
      if (!confirm("Apagar todo o progresso salvo neste navegador?")) return;
      Object.assign(store.d, { q: {}, fcs: {}, read: {}, tfBest: 0, shockBest: 0, matchRounds: 0 });
      store.save(); renderHome(); markToc();
    };
  }

  /* ============================== REVISÃO: índice, progresso de leitura ============================== */
  const tocLinks = $$("#toc a");
  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (e.isIntersecting) tocLinks.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-80px 0px -70% 0px" });
  $$(".prose h3[id]").forEach((h) => io.observe(h));
  function markToc() {
    tocLinks.forEach((a) => a.classList.toggle("read", !!store.d.read[a.getAttribute("href").slice(1)]));
  }
  let rsPending = false;
  function onReadScroll() {
    if (rsPending || $("#revisao").hidden) return;
    rsPending = true;
    requestAnimationFrame(() => {
      rsPending = false;
      const prose = $(".prose"), r = prose.getBoundingClientRect();
      const total = r.height - innerHeight * 0.6;
      const pct = Math.max(0, Math.min(1, -r.top / Math.max(1, total)));
      $("#readbarFill").style.width = pct * 100 + "%";
      const hs = $$(".prose h3[id]");
      let changed = false;
      hs.forEach((h, i) => {
        const end = i + 1 < hs.length ? hs[i + 1].getBoundingClientRect().top : r.bottom;
        if (end < innerHeight * 0.45 && !store.d.read[h.id]) { store.d.read[h.id] = 1; changed = true; }
      });
      if (changed) { store.save(); markToc(); }
    });
  }
  window.addEventListener("scroll", onReadScroll, { passive: true });
  markToc();

  /* Links "rever no resumo" a partir do quiz */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-from='quiz']");
    if (a) cameFromQuiz = true;
  });
  $("#backPill").addEventListener("click", () => { cameFromQuiz = false; });
  const refLink = (q) => TOPIC_REF[q.topic] ? `<a class="ref-link" data-from="quiz" href="#${TOPIC_REF[q.topic]}">Rever no resumo →</a>` : "";

  /* ============================== QUIZ ============================== */
  const qCap = $("#qCap"), qTopic = $("#qTopic"), qN = $("#qN"), qMode = $("#qMode"), qWrong = $("#qWrong"), qSrc = $("#qSrc"), qTimer = $("#qTimer");
  function fillTopics() {
    const cap = qCap.value;
    const caps = cap === "all" ? ["8", "9", "A"] : [cap];
    qTopic.innerHTML = '<option value="all">Todos</option>' +
      caps.map((c) => `<optgroup label="${CAP_NAME[c]}">` + TOPICS[c].map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("") + "</optgroup>").join("");
  }
  function pool() {
    let p = QUESTIONS.filter((q) => (qCap.value === "all" || q.cap === qCap.value) && (qTopic.value === "all" || q.topic === qTopic.value));
    if (qSrc.value === "atv") p = p.filter((q) => q.atv || ATV_TOPICS.includes(q.topic));
    if (qSrc.value === "new") p = p.filter((q) => !store.d.q[q.id]);
    if (qWrong.checked) { const w = new Set(wrongQs().map((q) => q.id)); p = p.filter((q) => w.has(q.id)); }
    return p;
  }
  function updateAvail() {
    const n = pool().length;
    $("#qAvail").textContent = n + (n === 1 ? " questão disponível" : " questões disponíveis");
    const w = wrongQs().length;
    $("#qWrongCount").textContent = w ? `(${w})` : "(nenhuma ainda)";
    $("#qStart").disabled = n === 0;
  }
  qCap.addEventListener("change", () => { fillTopics(); updateAvail(); });
  [qTopic, qN, qWrong, qSrc].forEach((e) => e.addEventListener("change", updateAvail));
  fillTopics();

  let Q = null, clockT = null;
  function startQuizWith(list, opts = {}) {
    go("quiz");
    startQuiz(list, opts);
  }
  function startQuiz(list, opts = {}) {
    const n = +qN.value;
    let qs = list || shuffle(pool());
    if (!list && n) qs = qs.slice(0, n);
    if (!qs.length) return;
    const timer = opts.timer !== undefined ? opts.timer : list ? "0" : qTimer.value;
    Q = {
      items: qs.map((q) => ({ q, order: shuffle(q.opts.map((_, i) => i)), pick: null, checked: false })),
      i: 0,
      mode: opts.mode || (list ? "train" : qMode.value),
      timer, start: Date.now(),
      limit: /^\d+$/.test(timer) && +timer > 0 ? +timer * 1000 * qs.length : 0,
    };
    $("#quizSetup").hidden = true; $("#quizEnd").hidden = true; $("#quizRun").hidden = false;
    $("#qFinish").hidden = Q.mode !== "exam";
    clearInterval(clockT);
    const clock = $("#qClock");
    clock.hidden = timer === "0";
    if (timer !== "0") {
      const tick = () => {
        if (!Q) return;
        const el = Date.now() - Q.start;
        if (Q.limit) {
          const left = Q.limit - el;
          clock.textContent = "⏱ " + fmtTime(left);
          clock.classList.toggle("low", left < 60000);
          if (left <= 0) { clearInterval(clockT); endQuiz(true); }
        } else clock.textContent = "⏱ " + fmtTime(el);
      };
      tick(); clockT = setInterval(tick, 1000);
    }
    renderQ();
    window.scrollTo(0, 0);
  }
  function renderQ() {
    const it = Q.items[Q.i], q = it.q, last = Q.i === Q.items.length - 1;
    $("#qProg").textContent = `${Q.i + 1} / ${Q.items.length}`;
    const answered = Q.items.filter((x) => x.pick !== null).length;
    $("#qBar").style.width = (answered / Q.items.length) * 100 + "%";
    $("#qMeta").innerHTML = `<span class="cap-tag" data-cap="${q.cap}">${CAP_NAME[q.cap]}</span> ${esc(q.topic)}${q.atv ? ` · <span class="tag-atv">atividade, Q${q.atv}</span>` : ""}`;
    $("#qText").textContent = q.q;
    const box = $("#qOpts");
    box.innerHTML = "";
    it.order.forEach((oi, pos) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.innerHTML = `<span class="key">${pos + 1}</span><span>${esc(q.opts[oi])}</span>`;
      b.addEventListener("click", () => choose(pos));
      box.appendChild(b);
    });
    $("#qExp").hidden = true;
    $("#qPrev").disabled = Q.i === 0;
    $("#qNext").disabled = false;
    $("#qNext").textContent = last ? (Q.mode === "exam" ? "Finalizar" : "Ver resultado") : "Próxima";
    paintQ();
    renderGrid();
  }
  function renderGrid() {
    $("#qGrid").innerHTML = Q.items.map((it, i) => {
      let c = "";
      if (it.checked) c = it.order[it.pick] === it.q.a ? "ok" : "bad";
      else if (it.pick !== null) c = "ans";
      return `<button class="${c}${i === Q.i ? " cur" : ""}" data-i="${i}" aria-label="Questão ${i + 1}${c ? ", respondida" : ""}">${i + 1}</button>`;
    }).join("");
    $$("#qGrid button").forEach((b) => b.addEventListener("click", () => { Q.i = +b.dataset.i; renderQ(); }));
  }
  function choose(pos) {
    const it = Q.items[Q.i];
    if (it.checked) return;
    it.pick = pos;
    if (Q.mode === "train") { it.checked = true; recordAnswer(it.q, it.order[pos] === it.q.a); }
    paintQ();
    renderGrid();
    const answered = Q.items.filter((x) => x.pick !== null).length;
    $("#qBar").style.width = (answered / Q.items.length) * 100 + "%";
  }
  function paintQ() {
    const it = Q.items[Q.i], q = it.q;
    $$("#qOpts .opt").forEach((b, pos) => {
      b.classList.remove("sel", "right", "wrong", "dim");
      if (it.checked) {
        b.disabled = true;
        if (it.order[pos] === q.a) b.classList.add("right");
        else if (pos === it.pick) b.classList.add("wrong");
        else b.classList.add("dim");
      } else if (pos === it.pick) b.classList.add("sel");
    });
    if (it.checked) {
      const ok = it.order[it.pick] === q.a;
      const ex = $("#qExp");
      ex.innerHTML = `<span class="verdict ${ok ? "ok" : "bad"}">${ok ? "Correto." : "Incorreto."}</span>${esc(q.exp)} ${refLink(q)}`;
      ex.hidden = false;
    }
  }
  function nextQ() {
    if (!Q) return;
    if (Q.i < Q.items.length - 1) { Q.i++; renderQ(); }
    else finishAsk();
  }
  function prevQ() { if (Q && Q.i > 0) { Q.i--; renderQ(); } }
  function finishAsk() {
    const left = Q.items.filter((x) => x.pick === null).length;
    if (left && !confirm(`${left} questão(ões) sem resposta serão contadas como erradas. Finalizar mesmo assim?`)) return;
    endQuiz();
  }
  function endQuiz(timeUp) {
    clearInterval(clockT);
    const elapsed = Date.now() - Q.start;
    if (Q.mode === "exam") Q.items.forEach((it) => { if (it.pick !== null && !it.checked) { it.checked = true; recordAnswer(it.q, it.order[it.pick] === it.q.a); } });
    $("#quizRun").hidden = true;
    const end = $("#quizEnd");
    end.hidden = false;
    const res = Q.items.map((it) => ({ ...it, ok: it.pick !== null && it.order[it.pick] === it.q.a }));
    const ok = res.filter((r) => r.ok).length, n = res.length, pct = Math.round((ok / n) * 100);
    const byTopic = {};
    res.forEach((r) => { const t = (byTopic[r.q.topic] = byTopic[r.q.topic] || { ok: 0, n: 0 }); t.n++; if (r.ok) t.ok++; });
    const msg = pct >= 90 ? "Excelente. Pronto para a prova." : pct >= 70 ? "Bom resultado. Revise os erros abaixo." : pct >= 50 ? "No caminho. Vale reler os tópicos mais fracos." : "Volte à revisão desses tópicos e tente de novo.";
    const wrong = res.filter((r) => !r.ok);
    const timeTxt = Q.timer !== "0" ? ` · tempo ${fmtTime(elapsed)}${timeUp ? " (tempo esgotado)" : ""}` : "";
    end.innerHTML = `
      <div class="card score-hero">
        <div class="score-big">${ok}/${n}</div>
        <div class="score-sub">${pct}% de acerto${timeTxt} · ${msg}</div>
        <div class="score-actions">
          ${wrong.length ? '<button class="btn" id="qRetryWrong">Refazer as que errei</button>' : ""}
          <button class="btn ghost" id="qAgain">Novo quiz</button>
        </div>
      </div>
      <div class="card topic-break" style="margin-top:16px">
        <h3>Acerto por tópico</h3>
        ${Object.entries(byTopic).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([t, v]) =>
          `<div class="tb-row"><span>${TOPIC_REF[t] ? `<a href="#${TOPIC_REF[t]}" data-from="quiz">${esc(t)}</a>` : esc(t)}</span><div class="bar"><div class="bar-fill ${v.ok === v.n ? "ok" : ""}" style="width:${(v.ok / v.n) * 100}%"></div></div><b>${v.ok}/${v.n}</b></div>`).join("")}
        <p class="muted small" style="margin:10px 0 0">Clique em um tópico para relê-lo no resumo.</p>
      </div>
      <h3 style="margin-top:28px">Correção</h3>
      <div class="review-list">
        ${res.slice().sort((a, b) => a.ok - b.ok).map((r) => `
          <div class="rv ${r.ok ? "right" : "wrong"}">
            <div class="rv-q">${esc(r.q.q)}</div>
            ${r.ok ? "" : `<p><span class="lab-bad">Sua resposta:</span> ${r.pick === null ? "<i>sem resposta</i>" : esc(r.q.opts[r.order[r.pick]])}</p>`}
            <p><span class="lab-ok">Correta:</span> ${esc(r.q.opts[r.q.a])}</p>
            <p class="muted">${esc(r.q.exp)} ${refLink(r.q)}</p>
          </div>`).join("")}
      </div>`;
    $("#qAgain").onclick = () => { end.hidden = true; $("#quizSetup").hidden = false; Q = null; updateAvail(); window.scrollTo(0, 0); };
    const rw = $("#qRetryWrong");
    if (rw) rw.onclick = () => startQuiz(shuffle(wrong.map((r) => r.q)));
    window.scrollTo(0, 0);
  }
  $("#qStart").addEventListener("click", () => startQuiz());
  $("#qNext").addEventListener("click", nextQ);
  $("#qPrev").addEventListener("click", prevQ);
  $("#qFinish").addEventListener("click", finishAsk);
  $("#qQuit").addEventListener("click", () => {
    if (!confirm("Sair do quiz? As respostas do modo treino já foram salvas.")) return;
    clearInterval(clockT);
    $("#quizRun").hidden = true; $("#quizSetup").hidden = false; Q = null; updateAvail();
  });

  /* ============================== FLASHCARDS (repetição espaçada) ============================== */
  const FC = { cap: "all", mode: "due", deck: [], i: 0 };
  function syncFcSegs() {
    $$("#fcCap .seg-b").forEach((x) => x.classList.toggle("on", x.dataset.v === FC.cap));
    $$("#fcMode .seg-b").forEach((x) => x.classList.toggle("on", x.dataset.v === FC.mode));
  }
  function fcBuild(doShuffle) {
    let d = FLASHCARDS.filter((c) => FC.cap === "all" || c.cap === FC.cap);
    if (FC.mode === "due") {
      d = d.filter(isDue);
      // primeiro os que já foram vistos e venceram, depois os novos
      d.sort((a, b) => (store.d.fcs[a.id] ? 0 : 1) - (store.d.fcs[b.id] ? 0 : 1));
    }
    if (doShuffle) d = shuffle(d);
    FC.deck = d;
    FC.i = 0;
  }
  function fcRender() {
    const card = $("#fc");
    const wasFlipped = card.classList.contains("flip");
    card.classList.remove("flip");
    const all = FLASHCARDS.filter((c) => FC.cap === "all" || c.cap === FC.cap);
    const learned = all.filter(isLearned).length, due = all.filter(isDue).length;
    $("#fcBar").style.width = (all.length ? (learned / all.length) * 100 : 0) + "%";
    $("#fcStat").textContent = `${learned} de ${all.length} aprendidos · ${due} para hoje`;
    if (!FC.deck.length) {
      $("#fcFront").textContent = FC.mode === "due" ? "Nada para revisar hoje. 🎉" : "Nenhum cartão.";
      $("#fcBack").textContent = FC.mode === "due" ? "Volte amanhã ou escolha “Todos” para revisar à vontade." : "";
      $("#fcTagF").textContent = $("#fcTagB").textContent = "";
      $("#fcPos").textContent = "0 / 0";
      return;
    }
    const c = FC.deck[FC.i];
    setTimeout(() => { $("#fcBack").textContent = c.b; }, wasFlipped ? 220 : 0);
    $("#fcFront").textContent = c.f;
    const r = store.d.fcs[c.id];
    const st = !r ? '<span class="st new">novo</span>' : r.box >= 2 ? '<span class="st known">aprendido</span>' : '<span class="st learn">aprendendo</span>';
    const tag = `<span class="cap-tag" data-cap="${c.cap}">${CAP_NAME[c.cap]}</span>` + st;
    $("#fcTagF").innerHTML = tag; $("#fcTagB").innerHTML = tag;
    $("#fcPos").textContent = `${FC.i + 1} / ${FC.deck.length}`;
  }
  function fcFlip() { $("#fc").classList.toggle("flip"); }
  function fcMove(d) {
    if (!FC.deck.length) return;
    FC.i = (FC.i + d + FC.deck.length) % FC.deck.length;
    fcRender();
  }
  function fcMark(knew) {
    if (!FC.deck.length) return;
    const c = FC.deck[FC.i];
    const r = store.d.fcs[c.id] || { box: 0, due: 0 };
    if (knew) { r.box = Math.min(r.box + 1, SRS_DAYS.length - 1); r.due = Date.now() + SRS_DAYS[r.box] * DAY; }
    else { r.box = 0; r.due = Date.now(); }
    store.d.fcs[c.id] = r;
    store.save();
    if (FC.mode === "due") {
      FC.deck.splice(FC.i, 1);
      if (!knew) FC.deck.splice(Math.min(FC.i + 3, FC.deck.length), 0, c); // volta daqui a pouco
      if (FC.i >= FC.deck.length) FC.i = 0;
      fcRender();
    } else fcMove(1);
  }
  $("#fc").addEventListener("click", fcFlip);
  $("#fc").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); fcFlip(); } });
  $("#fcPrev").addEventListener("click", () => fcMove(-1));
  $("#fcNext").addEventListener("click", () => fcMove(1));
  $("#fcYes").addEventListener("click", () => fcMark(true));
  $("#fcNo").addEventListener("click", () => fcMark(false));
  $("#fcShuffle").addEventListener("click", () => { fcBuild(true); fcRender(); });
  $("#fcResetK").addEventListener("click", () => {
    if (!confirm("Zerar o histórico de repetição espaçada dos flashcards?")) return;
    store.d.fcs = {}; store.save(); fcBuild(); fcRender();
  });
  $$("#fcCap .seg-b").forEach((b) => b.addEventListener("click", () => { FC.cap = b.dataset.v; syncFcSegs(); fcBuild(); fcRender(); }));
  $$("#fcMode .seg-b").forEach((b) => b.addEventListener("click", () => { FC.mode = b.dataset.v; syncFcSegs(); fcBuild(); fcRender(); }));

  /* ============================== BUSCA ============================== */
  let SIDX = null;
  function buildIndex() {
    const rev = [];
    let ref = null, title = "Revisão";
    $$(".prose > *").forEach((el) => {
      const walk = (node) => {
        if (node.id && /^r-/.test(node.id)) { ref = node.id; title = node.tagName === "DETAILS" ? node.querySelector("summary").textContent.replace(/^(Estudo de caso|Tópico)\s*/, "") : node.textContent; }
        if (/^(P|LI|TR)$/.test(node.tagName) && !node.closest("figure")) {
          rev.push({ ref: ref || "revisao", title, text: node.textContent.trim(), n: norm(node.textContent) });
          return;
        }
        [...node.children].forEach(walk);
      };
      walk(el);
    });
    SIDX = {
      rev,
      q: QUESTIONS.map((q) => ({ q, n: norm(q.q + " " + q.opts[q.a] + " " + q.exp + " " + q.topic) })),
      fc: FLASHCARDS.map((c) => ({ c, n: norm(c.f + " " + c.b) })),
    };
  }
  function hl(text, terms) {
    let out = esc(text);
    terms.forEach((t) => {
      if (t.length < 2) return;
      const nt = norm(out);
      const idx = nt.indexOf(t);
      if (idx >= 0) out = out.slice(0, idx) + "<mark>" + out.slice(idx, idx + t.length) + "</mark>" + out.slice(idx + t.length);
    });
    return out;
  }
  function snippet(text, term) {
    const i = norm(text).indexOf(term);
    if (i < 0 || text.length < 170) return text.slice(0, 170) + (text.length > 170 ? "…" : "");
    const a = Math.max(0, i - 60);
    return (a ? "…" : "") + text.slice(a, a + 170) + "…";
  }
  function doSearch() {
    const raw = $("#searchIn").value.trim();
    const box = $("#searchRes");
    if (raw.length < 2) { box.innerHTML = `<p class="muted small sr-hint">Digite pelo menos 2 letras. Exemplos: <i>regra de ouro</i>, <i>kremer</i>, <i>convergência</i>, <i>resíduo</i>.</p>`; return; }
    if (!SIDX) buildIndex();
    const terms = norm(raw).split(/\s+/).filter(Boolean);
    const match = (n) => terms.every((t) => n.includes(t));
    const seenRef = new Set();
    const rev = SIDX.rev.filter((r) => match(r.n)).filter((r) => { const k = r.ref + r.text.slice(0, 30); if (seenRef.has(k)) return false; seenRef.add(k); return true; }).slice(0, 8);
    const qs = SIDX.q.filter((r) => match(r.n)).slice(0, 8);
    const fcs = SIDX.fc.filter((r) => match(r.n)).slice(0, 6);
    if (!rev.length && !qs.length && !fcs.length) { box.innerHTML = `<p class="muted sr-hint">Nada encontrado para “${esc(raw)}”.</p>`; return; }
    let h = "";
    if (rev.length) h += `<div class="sr-group"><p class="sr-title">Revisão</p>${rev.map((r) => `<a class="sr-item" href="#${r.ref}"><b>${esc(r.title)}</b><span>${hl(snippet(r.text, terms[0]), terms)}</span></a>`).join("")}</div>`;
    if (qs.length) h += `<div class="sr-group"><p class="sr-title">Questões</p>${qs.map((r, i) => `<button class="sr-item" data-sq="${i}"><b>${hl(r.q.q, terms)}</b><span class="sr-ans" hidden><span class="lab-ok">Resposta:</span> ${esc(r.q.opts[r.q.a])}<br><span class="muted">${esc(r.q.exp)}</span></span></button>`).join("")}</div>`;
    if (fcs.length) h += `<div class="sr-group"><p class="sr-title">Flashcards</p>${fcs.map((r) => `<button class="sr-item" data-sf><b>${hl(r.c.f, terms)}</b><span class="sr-ans" hidden>${hl(r.c.b, terms)}</span></button>`).join("")}</div>`;
    box.innerHTML = h;
    $$(".sr-item[data-sq], .sr-item[data-sf]", box).forEach((b) => b.addEventListener("click", () => { const a = $(".sr-ans", b); a.hidden = !a.hidden; }));
    $$("a.sr-item", box).forEach((a) => a.addEventListener("click", closeSearch));
  }
  let lastFocus = null;
  function openSearch() {
    lastFocus = document.activeElement;
    $("#searchOv").hidden = false;
    document.body.classList.add("noscroll");
    const inp = $("#searchIn");
    inp.focus(); inp.select();
    doSearch();
  }
  function closeSearch() {
    $("#searchOv").hidden = true;
    document.body.classList.remove("noscroll");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $("#searchBtn").addEventListener("click", openSearch);
  $("#searchIn").addEventListener("input", doSearch);
  $("#searchOv").addEventListener("click", (e) => { if (e.target.id === "searchOv") closeSearch(); });

  /* ============================== ATIVIDADE ============================== */
  const ATV_TOPIC_OF = { 1: "Poupança e crescimento", 2: "Regra de Ouro", 3: "Estado estacionário", 4: "Crescimento populacional", 5: "Convergência" };
  let atvDone = false;
  function renderAtividade() {
    if (atvDone) return;
    atvDone = true;
    $("#atvList").innerHTML = ATIVIDADE.map((a) => `
      <article class="card atv">
        <div class="atv-num">Questão ${a.n}</div>
        <h2>${esc(a.t)}</h2>
        <p class="atv-ctx">${esc(a.ctx)}</p>
        ${a.items.map((it) => `
          <div class="atv-item">
            <p class="atv-q"><b>${it.l})</b> ${esc(it.q)}</p>
            <details class="atv-ans"><summary>Ver resposta-modelo</summary><div>${it.a}</div></details>
          </div>`).join("")}
        <div class="atv-keys"><span class="muted small">Não pode faltar:</span>${a.keys.map((k) => `<span class="chip static">${esc(k)}</span>`).join("")}</div>
        <div class="atv-foot">
          <a class="btn ghost sm" href="#${a.ref}">Rever no resumo</a>
          <button class="btn sm" data-atv-quiz="${a.n}">Quiz desta questão</button>
        </div>
      </article>`).join("");
    $$("[data-atv-quiz]").forEach((b) => b.addEventListener("click", () => {
      const n = b.dataset.atvQuiz;
      const list = n === "all"
        ? QUESTIONS.filter((q) => q.atv || ATV_TOPICS.includes(q.topic))
        : QUESTIONS.filter((q) => q.atv === +n || q.topic === ATV_TOPIC_OF[n]);
      startQuizWith(shuffle(list).slice(0, n === "all" ? 20 : 12));
    }));
  }

  /* ============================== COLA ============================== */
  let colaDone = false;
  function renderCola() {
    if (colaDone) return;
    colaDone = true;
    const traps = $(".traps").innerHTML;
    $("#colaSheet").innerHTML = `
      <header class="cola-head"><b>P3 · Crescimento Econômico</b><span>Mankiw, Macroeconomia 8ª ed. · Caps. 8 e 9</span></header>
      <div class="cola-cols">
        <section><h3>Ideias-chave do modelo de Solow</h3>
          <p><b>Produto marginal decrescente:</b> cada unidade extra de capital rende menos que a anterior.</p>
          <p><b>Estado estacionário:</b> investimento = desgaste do capital (+ equipar os novos trabalhadores). O capital por trabalhador para de mudar. É o equilíbrio de longo prazo.</p>
          <p><b>Regra de Ouro:</b> o capital que maximiza o <b>consumo</b>. Uma unidade extra de capital rende exatamente o que custa mantê-la.</p>
          <p><b>Diluição:</b> mais população reparte o capital entre mais gente.</p>
        </section>
        <section><h3>O que cresce no longo prazo</h3>
          <table class="t mini concept"><tbody>
            <tr><td>Capital e produção por trabalhador efetivo</td><td><b>constantes</b></td></tr>
            <tr><td>Renda por trabalhador, salário real</td><td><b>ritmo da tecnologia</b></td></tr>
            <tr><td>Produção total do país</td><td><b>população + tecnologia</b></td></tr>
            <tr><td>Retorno do capital</td><td><b>estável</b></td></tr>
          </tbody></table>
          <p><b>Só a tecnologia</b> sustenta o crescimento do padrão de vida. A poupança e a população têm efeito de <b>nível</b>.</p>
        </section>
        <section class="span2"><h3>Choques: efeito no novo estado estacionário</h3>
          <table class="t mini"><thead><tr><th>Mudança</th><th>k*</th><th>y*</th><th>Cresc.</th></tr></thead><tbody>
            ${SHOCKS.map((s) => `<tr><td>${esc(s.s)}</td><td>${s.k}</td><td>${s.y}</td><td>${s.g}</td></tr>`).join("")}
          </tbody></table>
        </section>
        <section><h3>Transição para a Regra de Ouro</h3>
          <p><b>Capital demais → ↓ s:</b> c sobe já e fica acima do inicial sempre. Sem dilema.</p>
          <p><b>Capital de menos → ↑ s:</b> c cai, depois sobe e supera o inicial. As gerações atuais pagam, as futuras ganham.</p>
          <p><b>EUA:</b> o capital rende ~8% e a economia cresce ~3%: abaixo da Regra de Ouro, deveriam poupar mais.</p>
        </section>
        <section><h3>Convergência</h3>
          <p><b>Absoluta:</b> todos ao mesmo nível; exige o mesmo EE. <b>Não</b> ocorre globalmente.</p>
          <p><b>Condicional:</b> cada país ao seu EE (s, n, capital humano), ~2% a.a.</p>
        </section>
        <section><h3>Políticas (9-3)</h3>
          <p><b>Poupança:</b> pública (déficit desloca investimento) e privada (impostos sobre o capital, IRAs).</p>
          <p><b>Investimento:</b> campo nivelado × política setorial (ceticismo: externalidades difíceis de medir, lobby).</p>
          <p><b>Instituições:</b> direito inglês &gt; francês; mão que ajuda × mão arrebatadora; origens coloniais.</p>
          <p><b>Tecnologia:</b> patentes, isenção fiscal para P&amp;D, subsídio à pesquisa, propriedade intelectual.</p>
        </section>
        <section><h3>Desaceleração pós-1972 (PTF)</h3>
          <p>1) mensuração · 2) petróleo (sem recuperação em 1986) · 3) qualidade do trabalhador · 4) depleção de ideias. TI nos anos 1990.</p>
          <h3>Crescimento endógeno</h3>
          <p>Capital (incluindo conhecimento) sem retornos decrescentes: a poupança gera crescimento permanente. Dois setores: só a fração de pessoas em pesquisa afeta o crescimento. P&amp;D: ombros (+) × pés (–), retorno social &gt; 40%. Schumpeter: destruição criativa.</p>
        </section>
        <section class="span2"><h3>Quem disse o quê</h3>
          <ul class="cola-authors">${MATCHES.slice(0, 16).map((m) => `<li><b>${esc(m.l)}:</b> ${esc(m.r)}</li>`).join("")}</ul>
        </section>
        <section class="span2"><h3>Pegadinhas</h3><ol class="traps">${traps}</ol></section>
      </div>`;
  }
  $("#printBtn").addEventListener("click", () => window.print());

  /* ============================== VÍDEO ============================== */
  let VP = null;
  const EXPORT = new URLSearchParams(location.search).has("export");
  function initVideo() {
    if (VP) { VP.render(); return; }
    const root = $("#vplayer");
    const fmt = (s) => fmtTime(s * 1000);
    const marks = [];
    let acc = 0;
    SolowVideo.SCENES.forEach((sc) => { marks.push(acc / SolowVideo.TOTAL); acc += sc.dur; });
    $("#vMarks").innerHTML = marks.slice(1).map((m) => `<i style="left:${m * 100}%"></i>`).join("");
    $("#vChapters").innerHTML = SolowVideo.SCENES.map((sc, i) => `<button class="v-ch" data-i="${i}"><b>${i + 1}</b><span>${esc(sc.title)}</span><em>${fmt(marks[i] * SolowVideo.TOTAL)}</em></button>`).join("");
    VP = SolowVideo.create(root, {
      onUpdate(st) {
        root.classList.toggle("playing", st.playing);
        $("#vPlay").setAttribute("aria-label", st.playing ? "Pausar" : "Reproduzir");
        const e = VP ? VP.elapsed() : 0;
        $("#vProgFill").style.width = (e / SolowVideo.TOTAL) * 100 + "%";
        $("#vTime").textContent = fmt(e) + " / " + fmt(SolowVideo.TOTAL);
        $$("#vChapters .v-ch").forEach((b, i) => b.classList.toggle("on", i === st.si));
      },
      onEnd() { root.classList.remove("playing"); window.__videoDone = true; },
    });
    window.__vp = VP; // usado nos testes/exportação
    $("#vPlay").onclick = () => VP.toggle();
    $("#vNext").onclick = () => VP.next();
    $("#vPrev").onclick = () => VP.prev();
    $("#vSkip").onclick = () => VP.nextLine();
    $("#vStage").onclick = () => VP.toggle();
    $("#vTTS").disabled = !VP.hasTTS();
    $("#vTTS").onchange = (e) => VP.setTTS(e.target.checked);
    $("#vRate").onchange = (e) => VP.setRate(+e.target.value);
    $("#vFull").onclick = () => { const el = $("#vplayer"); document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen(); };
    $("#vProg").onclick = (e) => {
      const r = e.currentTarget.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
      let i = 0; while (i < marks.length - 1 && marks[i + 1] <= f) i++;
      VP.seekScene(i);
    };
    $$("#vChapters .v-ch").forEach((b) => b.addEventListener("click", () => { VP.seekScene(+b.dataset.i); VP.play(); }));
    if (EXPORT && !new URLSearchParams(location.search).has("step")) setTimeout(() => VP.play(), 800);
  }
  if (EXPORT) { document.documentElement.classList.add("export"); if (location.hash !== "#video") location.hash = "video"; }

  /* ============================== ATALHOS DE TECLADO ============================== */
  document.addEventListener("keydown", (e) => {
    if (!$("#searchOv").hidden) { if (e.key === "Escape") { e.preventDefault(); closeSearch(); } return; }
    if (e.key === "Escape") closeMore();
    if (e.target.matches("input, select, textarea")) return;
    if ((e.key === "/" && !e.metaKey && !e.ctrlKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); openSearch(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!$("#video").hidden && VP) {
      if (e.key === " " || e.key === "k") { e.preventDefault(); VP.toggle(); }
      else if (e.key === "ArrowRight") VP.next();
      else if (e.key === "ArrowLeft") VP.prev();
      else if (e.key === "n" || e.key === "N") VP.nextLine();
      return;
    }
    if (!$("#quiz").hidden && !$("#quizRun").hidden && Q) {
      if (/^[1-4]$/.test(e.key)) { const pos = +e.key - 1; if (pos < Q.items[Q.i].order.length) choose(pos); }
      else if (e.key === "Enter" && !e.target.matches("a, button:not(.opt)")) { e.preventDefault(); nextQ(); }
      else if (e.key === "ArrowRight") nextQ();
      else if (e.key === "ArrowLeft") prevQ();
    } else if (!$("#flashcards").hidden) {
      if (e.key === " ") { e.preventDefault(); fcFlip(); }
      else if (e.key === "ArrowRight") fcMove(1);
      else if (e.key === "ArrowLeft") fcMove(-1);
      else if (e.key === "1") fcMark(false);
      else if (e.key === "2") fcMark(true);
    } else if (!$("#jogos").hidden && !$("#game-tf").hidden && TF) {
      if (e.key === "v" || e.key === "V") tfAnswer(true);
      else if (e.key === "f" || e.key === "F") tfAnswer(false);
      else if (e.key === "Enter" && TF.answered) { e.preventDefault(); tfNext(); }
    }
  });

  /* ============================== JOGOS ============================== */
  $$("#gameSeg .seg-b").forEach((b) => b.addEventListener("click", () => {
    $$("#gameSeg .seg-b").forEach((x) => x.classList.toggle("on", x === b));
    ["tf", "shock", "match"].forEach((g) => ($("#game-" + g).hidden = g !== b.dataset.v));
  }));

  /* ---------- Verdadeiro ou falso ---------- */
  let TF = null;
  function tfStart() {
    TF = { list: shuffle(TRUEFALSE).slice(0, 15), i: 0, score: 0, streak: 0, answered: false };
    tfRender();
  }
  function tfRender() {
    const g = $("#game-tf");
    if (TF.i >= TF.list.length) {
      g.innerHTML = `<div class="card tf-card center">
        <div class="score-big">${TF.score}/${TF.list.length}</div>
        <p class="score-sub">Maior sequência de acertos já registrada: ${store.d.tfBest}</p>
        <button class="btn" id="tfAgain">Nova rodada</button></div>`;
      $("#tfAgain").onclick = tfStart;
      return;
    }
    const it = TF.list[TF.i];
    g.innerHTML = `<div class="card tf-card">
      <div class="tf-head"><span>${TF.i + 1} / ${TF.list.length} <span class="cap-tag" data-cap="${it.cap}">${CAP_NAME[it.cap]}</span></span>
        <span>Acertos <b>${TF.score}</b> · Sequência <b class="${TF.streak >= 5 ? "streak" : ""}">${TF.streak}</b></span></div>
      <div class="tf-statement">${esc(it.s)}</div>
      <div class="tf-btns">
        <button class="btn ghost" id="tfV">Verdadeiro <span class="muted small">(V)</span></button>
        <button class="btn ghost" id="tfF">Falso <span class="muted small">(F)</span></button>
      </div>
      <div class="qexp" id="tfExp" role="status" aria-live="polite" hidden></div>
      <div class="qnav" id="tfNav" hidden><span></span><button class="btn" id="tfNext">Próxima</button></div>
    </div>`;
    TF.answered = false;
    $("#tfV").onclick = () => tfAnswer(true);
    $("#tfF").onclick = () => tfAnswer(false);
  }
  function tfAnswer(v) {
    if (!TF || TF.answered || TF.i >= TF.list.length) return;
    TF.answered = true;
    const it = TF.list[TF.i], ok = v === it.v;
    if (ok) { TF.score++; TF.streak++; } else TF.streak = 0;
    if (TF.streak > store.d.tfBest) { store.d.tfBest = TF.streak; store.save(); }
    const bV = $("#tfV"), bF = $("#tfF");
    bV.disabled = bF.disabled = true;
    (it.v ? bV : bF).classList.replace("ghost", "ok-soft");
    if (!ok) (v ? bV : bF).classList.replace("ghost", "bad-soft");
    const ex = $("#tfExp");
    ex.innerHTML = `<span class="verdict ${ok ? "ok" : "bad"}">${ok ? "Acertou." : "Errou."}</span>${esc(it.exp)}`;
    ex.hidden = false;
    $("#tfNav").hidden = false;
    $("#tfNext").onclick = tfNext;
    $("#tfNext").focus({ preventScroll: true });
    const hb = $$(".tf-head b");
    hb[0].textContent = TF.score; hb[1].textContent = TF.streak;
  }
  function tfNext() { TF.i++; tfRender(); }
  tfStart();

  /* ---------- Choques ---------- */
  function shockRender() {
    const g = $("#game-shock");
    const tri = (i, col, na) => `<div class="tri${na ? " na" : ""}" role="radiogroup" data-i="${i}" data-col="${col}">${["↑", "=", "↓"].map((s) => `<button data-s="${s}" role="radio" aria-checked="false" aria-label="${s === "↑" ? "aumenta" : s === "↓" ? "diminui" : "não muda"}">${s}</button>`).join("")}</div>`;
    g.innerHTML = `<div class="card">
      <p class="shock-legend">Para cada mudança, marque o efeito <b>no novo estado estacionário</b> (comparado ao antigo). <b>k*</b> e <b>y*</b> são capital e renda por trabalhador (por trabalhador <i>efetivo</i> quando há tecnologia). <b>Crescimento</b> é a taxa de crescimento de longo prazo da renda por trabalhador.</p>
      <div class="table-wrap"><table class="shock-table">
        <thead><tr><th>Mudança</th><th>k*</th><th>y*</th><th>Crescimento</th></tr></thead>
        <tbody>${SHOCKS.map((s, i) => `<tr data-row="${i}"><td>${esc(s.s)}<div class="shock-exp">${esc(s.exp)}</div></td>
          <td data-l="k*">${tri(i, "k", s.na)}</td><td data-l="y*">${tri(i, "y", s.na)}</td><td data-l="Crescimento">${tri(i, "g")}</td></tr>`).join("")}</tbody>
      </table></div>
      <div class="shock-foot"><button class="btn" id="shCheck">Corrigir</button><button class="btn ghost" id="shReset">Limpar</button><span id="shScore" class="muted" role="status" aria-live="polite"></span></div>
    </div>`;
    $$(".tri", g).forEach((t) => $$("button", t).forEach((b) => b.addEventListener("click", () => {
      $$("button", t).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); });
      t.classList.remove("ok", "bad");
    })));
    $("#shCheck").onclick = () => {
      let ok = 0, tot = 0;
      SHOCKS.forEach((s, i) => {
        ["k", "y", "g"].forEach((col) => {
          if (s.na && col !== "g") return;
          tot++;
          const t = $(`.tri[data-i="${i}"][data-col="${col}"]`, g);
          const on = $("button.on", t);
          const right = on && on.dataset.s === s[col];
          if (right) ok++;
          t.classList.toggle("ok", !!right); t.classList.toggle("bad", !right);
        });
        $(`tr[data-row="${i}"]`, g).classList.add("checked");
      });
      if (ok > store.d.shockBest) { store.d.shockBest = ok; store.save(); }
      $("#shScore").innerHTML = `<b style="color:var(--text)">${ok}/${tot}</b> corretas. Leia a explicação embaixo de cada linha.`;
    };
    $("#shReset").onclick = shockRender;
  }
  shockRender();

  /* ---------- Associação ---------- */
  function matchStart() {
    const pairs = shuffle(MATCHES).slice(0, 6).map((p, i) => ({ ...p, k: i }));
    const right = shuffle(pairs);
    const M = { sel: null, done: 0, err: 0 };
    const g = $("#game-match");
    g.innerHTML = `<div class="card">
      <div class="match-head"><span class="muted small">Clique em um item da esquerda e depois na descrição correspondente.</span>
        <span class="small">Erros: <b id="mErr">0</b> · Rodadas completas: <b>${store.d.matchRounds}</b></span></div>
      <div class="match-grid">
        <div class="match-col">${pairs.map((p) => `<button class="mi left" data-k="${p.k}" data-side="l">${esc(p.l)}</button>`).join("")}</div>
        <div class="match-col">${right.map((p) => `<button class="mi" data-k="${p.k}" data-side="r">${esc(p.r)}</button>`).join("")}</div>
      </div>
      <div class="shock-foot"><button class="btn ghost" id="mNew">Nova rodada</button><span id="mMsg" class="muted" role="status" aria-live="polite"></span></div>
    </div>`;
    $$(".mi", g).forEach((b) => b.addEventListener("click", () => {
      if (b.classList.contains("done")) return;
      if (!M.sel || M.sel.dataset.side === b.dataset.side) {
        $$(".mi.sel", g).forEach((x) => x.classList.remove("sel"));
        b.classList.add("sel"); M.sel = b; return;
      }
      const a = M.sel; M.sel = null;
      a.classList.remove("sel");
      if (a.dataset.k === b.dataset.k) {
        a.classList.add("done"); b.classList.add("done"); a.disabled = b.disabled = true;
        if (++M.done === pairs.length) {
          store.d.matchRounds++; store.save();
          $("#mMsg").innerHTML = M.err === 0 ? "<b style='color:var(--ok)'>Perfeito, sem erros!</b>" : `Completo com ${M.err} erro(s).`;
        }
      } else {
        M.err++; $("#mErr").textContent = M.err;
        [a, b].forEach((x) => { x.classList.add("err"); setTimeout(() => x.classList.remove("err"), 400); });
      }
    }));
    $("#mNew").onclick = matchStart;
  }
  matchStart();

  /* ============================== LABORATÓRIO ============================== */
  function initLab() {
    const DEF = { s: 0.3, d: 0.05, n: 0.01, g: 0.02 };
    let P = { ...DEF }, REF = { ...DEF };
    let trajMode = "level";
    const ids = { s: "p-s", d: "p-d", n: "p-n", g: "p-g" };
    const pct = (v) => (v * 100).toFixed(Math.round(v * 1000) % 10 ? 1 : 0) + "%";
    const setInputs = () => Object.keys(ids).forEach((k) => { $("#" + ids[k]).value = P[k]; $("#o-" + k).textContent = pct(P[k]); });
    Object.keys(ids).forEach((k) => $("#" + ids[k]).addEventListener("input", (e) => { P[k] = +e.target.value; $("#o-" + k).textContent = pct(P[k]); draw(); }));
    ["c-f", "c-c", "c-gold"].forEach((id) => $("#" + id).addEventListener("change", draw));
    $("#labRef").onclick = () => { REF = { ...P }; draw(); };
    $("#labReset").onclick = () => { P = { ...DEF }; REF = { ...DEF }; setInputs(); draw(); };
    $$(".presets .chip").forEach((b) => b.addEventListener("click", () => {
      P = { ...DEF }; REF = { ...DEF };
      const v = b.dataset.preset;
      if (v === "s-up") P.s = 0.45;
      if (v === "n-up") P.n = 0.035;
      if (v === "d-up") P.d = 0.09;
      if (v === "g-up") P.g = 0.035;
      if (v === "gold") P.s = Math.round(Charts.ALPHA * 100) / 100;
      setInputs(); draw();
    }));
    $$("#trajSeg .seg-b").forEach((b) => b.addEventListener("click", () => {
      $$("#trajSeg .seg-b").forEach((x) => x.classList.toggle("on", x === b));
      trajMode = b.dataset.v; drawTraj();
    }));

    const same = (a, b) => ["s", "d", "n", "g"].every((k) => Math.abs(a[k] - b[k]) < 1e-9);

    function draw() {
      const changed = !same(P, REF);
      const x = P.d + P.n + P.g, xR = REF.d + REF.n + REF.g;
      const ks0 = Charts.kStar(P.s, x), kR = Charts.kStar(REF.s, xR);
      // eixo se ajusta quando k* (atual, referência ou ouro) não cabe na escala padrão
      const need = Math.max(ks0, changed ? kR : 0, $("#c-gold").checked ? Charts.kGold(x) : 0) * 1.18;
      const kmax = need > 24 ? Math.ceil(need / 10) * 10 : 24;
      const ymax = Math.max(3, Charts.f(kmax) * 1.08);
      const r = Charts.solow($("#labChart"), {
        p: P, ghost: changed ? REF : null,
        showF: $("#c-f").checked, showC: $("#c-c").checked, showGold: $("#c-gold").checked,
        kmax, ymax, labels: { ghostK: "k*ref", k: "k*" }, aria: "Diagrama de Solow interativo",
      });
      $("#labLegend").innerHTML = [
        $("#c-f").checked ? '<span><i style="background:var(--c-f)"></i>f(k): produção</span>' : "",
        '<span><i style="background:var(--c-s)"></i>sf(k): investimento</span>',
        '<span><i style="background:var(--c-d)"></i>(δ+n+g)k: investimento de equilíbrio</span>',
        $("#c-c").checked ? '<span><i style="background:var(--c-c)"></i>c*: consumo no EE</span>' : "",
        $("#c-gold").checked ? '<span><i style="background:var(--c-gold)"></i>Regra de Ouro</span>' : "",
        changed ? '<span><i class="dash" style="color:var(--muted)"></i>referência</span>' : "",
        kmax > 24 ? '<span class="scale-note">eixo ampliado para caber k*</span>' : "",
      ].join("");

      const yR = Charts.f(kR), cR = (1 - REF.s) * yR;
      const k = r.ks, y = Charts.f(k), c = (1 - P.s) * y;
      const arrow = (a, b) => Math.abs(a - b) / b < 0.005 ? '<span class="d same">= ref.</span>' : a > b ? `<span class="d up">↑ ${Math.round((a / b - 1) * 100)}%</span>` : `<span class="d down">↓ ${Math.round((1 - a / b) * 100)}%</span>`;
      const sG = Charts.ALPHA;
      let gold;
      if (Math.abs(P.s - sG) < 0.006) gold = "Na Regra de Ouro: PMgK – δ = n + g";
      else if (P.s < sG) gold = "Abaixo da Regra de Ouro: capital de menos (PMgK – δ > n + g). Poupar mais elevaria o consumo no longo prazo.";
      else gold = "Acima da Regra de Ouro: capital demais (PMgK – δ < n + g). Poupar menos elevaria o consumo já e sempre.";
      $("#labRead").innerHTML = `
        <div class="stat"><div class="k">k* (capital)</div><div class="v">${k.toFixed(2)} ${changed ? arrow(k, kR) : ""}</div></div>
        <div class="stat"><div class="k">y* (renda)</div><div class="v">${y.toFixed(2)} ${changed ? arrow(y, yR) : ""}</div></div>
        <div class="stat"><div class="k">c* (consumo)</div><div class="v">${c.toFixed(2)} ${changed ? arrow(c, cR) : ""}</div></div>
        <div class="stat"><div class="k">Cresc. de Y/L no EE</div><div class="v">g = ${pct(P.g)}</div></div>
        <div class="stat"><div class="k">Cresc. de Y no EE</div><div class="v">n + g = ${pct(P.n + P.g)}</div></div>
        <div class="stat wide"><div class="k">Regra de Ouro (aqui: s ouro = α ≈ 33%)</div><div class="v" style="font-size:.95rem;font-weight:500">${gold}</div></div>
        <div class="stat wide"><div class="k">Leitura</div><div class="v" style="font-size:.95rem;font-weight:500">${explain(REF, P)}</div></div>`;
      drawTraj();
    }

    function explain(a, b) {
      if (same(a, b)) return "Mude um parâmetro para comparar com a referência (tracejado). Clique em “Fixar como referência” para comparar a partir do ponto atual.";
      const out = [];
      if (b.s !== a.s) out.push(b.s > a.s ? "Poupança maior desloca sf(k) para cima: k* e y* aumentam (efeito de nível)." : "Poupança menor desloca sf(k) para baixo: k* e y* diminuem (efeito de nível).");
      if (b.d !== a.d) out.push(b.d > a.d ? "Depreciação maior inclina mais a reta de equilíbrio: k* e y* caem." : "Depreciação menor: reta menos inclinada, k* e y* sobem.");
      if (b.n !== a.n) out.push(b.n > a.n ? "Crescimento populacional maior inclina a reta (δ+n+g)k: k* e y* por trabalhador caem (efeito de nível). Y total cresce mais rápido." : "Crescimento populacional menor: k* e y* por trabalhador sobem.");
      if (b.g !== a.g) out.push(b.g > a.g ? "Progresso tecnológico mais rápido: k* e y* por trabalhador efetivo caem, mas Y/L passa a crescer mais rápido (efeito de crescimento). Veja o modo log abaixo." : "Progresso tecnológico mais lento: Y/L passa a crescer mais devagar.");
      return out.join(" ");
    }

    function drawTraj() {
      const sim = Charts.simulate(REF, P, 120, 10);
      if (trajMode === "level") {
        Charts.series($("#trajChart"), {
          t0: 10, ymin: 0, w: 960, h: 300,
          series: [
            { data: sim.y, cls: "f", label: "y" },
            { data: sim.c, cls: "c", label: "c" },
            { data: sim.i, cls: "s", label: "i" },
          ],
          aria: "Trajetória por trabalhador efetivo",
        });
      } else {
        const base = Charts.simulate(REF, REF, 120, 10);
        Charts.series($("#trajChart"), {
          t0: 10, w: 960, h: 300,
          series: [
            { data: base.lnYL, cls: "f", ghost: true, label: "sem mudança" },
            { data: sim.lnYL, cls: "s", label: "ln(Y/L)" },
          ],
          aria: "Trajetória de ln(Y/L)",
        });
      }
    }
    setInputs();
    draw();
  }

  route();
})();
