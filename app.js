/* 앱 셸: 코스 트리, 라우팅(#id, #glossary), 단계 타임라인, 가이드, 재생 시계, 검색, 테마 */
(() => {
  /* 두 코스(트랙): 웹 디자인·모션 그래픽 / 영상 촬영·편집 */
  const TRACKS = {
    web: { name: "웹 디자인 · 모션", short: "웹·모션" },
    video: { name: "영상 촬영 · 편집", short: "영상" },
  };
  const CH = [
    ["보는 법", "web"], ["글자", "web"], ["색", "web"], ["움직임의 문법", "web"], ["모션 그래픽 도구", "web"],
    ["브라우저가 그리는 법", "web"], ["데이터 시각화", "web"], ["GPU와 3D", "web"],
    ["프레이밍", "video"], ["카메라와 빛", "video"], ["편집", "video"],
  ].map(([name, track], i, all) => ({ name, track, n: i, no: all.slice(0, i).filter((c) => c[1] === track).length + 1 }));
  const KEY = {
    hierarchy: "위계는 크기 → 대비 → 굵기 → 여백 순으로 강합니다. 한 화면에 강조점은 하나.",
    gestalt: "선이나 상자보다 여백이 먼저 구조를 만듭니다. 간격은 색보다 강합니다.",
    "type-anatomy": "서체를 섞을 땐 글자 크기가 아니라 엑스하이트와 베이스라인을 맞춥니다.",
    "perceptual-color": "HSL의 L은 눈이 느끼는 밝기가 아닙니다. 계산으로 색을 만들 땐 OKLCH.",
    "linear-vs-ease": "모션의 느낌은 위치가 아니라 속도의 변화에서 나옵니다.",
    "easing-curves": "들어올 땐 ease-out, 나갈 땐 ease-in, 자리를 옮길 땐 ease-in-out.",
    duration: "멀리 갈수록 길게, 자주 보는 동작일수록 짧게. UI는 대부분 100~500ms.",
    spring: "스프링은 시간을 정하지 않습니다. 강성·감쇠·질량이 시간을 만듭니다.",
    principles: "예비동작은 예고, 오버슈트는 관성, 스쿼시는 속도감. 강도는 브랜드 성격에 맞춥니다.",
    "camera-moves": "회전(팬·틸트)엔 시차가 없고, 이동(트럭·달리)엔 시차가 생깁니다. 줌은 원근을 바꾸지 않습니다.",
    cuts: "소리와 그림은 따로 자를 수 있습니다. 소리를 먼저 보내면 J, 늦게 끊으면 L.",
    "render-pipeline": "애니메이션은 transform과 opacity로. 레이아웃을 건드리면 프레임 예산이 무너집니다.",
    flip: "바뀐 레이아웃을 재고, transform으로 되감은 뒤, 풀어 줍니다. First · Last · Invert · Play.",
    projection: "원근은 거리로 나누는 계산입니다. 화각이 좁을수록 압축, 넓을수록 과장.",
    shaders: "셰이더는 픽셀 하나의 색을 정하는 함수. GPU는 그걸 모든 픽셀에 동시에 돌립니다.",
  };
  const ICON = {
    file: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    level: '<svg viewBox="0 0 24 24"><path d="M5 19v-2M10 19v-5M15 19v-8M20 19V7"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10M4 6h1M4 12h1M4 18h1"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
  };
  const folderSvg = (color) => `<svg class="folder" viewBox="0 0 24 24" style="fill:${color}"><path d="M2.5 6.5A1.5 1.5 0 0 1 4 5h5l2 2h9a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5z"/></svg>`;

  const L = window.LESSONS;
  L.forEach((l, i) => (l._i = i));
  L.sort((a, b) => a.ch - b.ch || (a.order ?? 99) - (b.order ?? 99) || a._i - b._i);
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad2 = (n) => String(n).padStart(2, "0");
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const done = new Set(store.get("hwamyeon-done", []));
  const openMods = new Set(store.get("hwamyeon-open", [0]).slice(0, 1));

  const trackOf = (l) => CH[l.ch].track;
  let track = store.get("hwamyeon-track", "web");
  const inTrack = () => L.filter((l) => trackOf(l) === track);
  let idx = -1, inst = null, step = 0, time = 0, last = performance.now();
  let playing = !reduce, speed = 1, query = "";

  /* ---------- 테마 ---------- */
  const savedTheme = store.get("hwamyeon-theme", null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  const root = document.documentElement;
  const isDark = () => root.dataset.theme === "dark";
  const syncThemeBtn = () => { $("themeBtn").dataset.mode = isDark() ? "dark" : "light"; $("themeBtn").setAttribute("aria-label", isDark() ? "라이트 모드로" : "다크 모드로"); };
  syncThemeBtn();
  /* 테마 전환: 버튼에서 원이 퍼지며 새 테마가 드러남 (View Transitions) */
  $("themeBtn").onclick = (e) => {
    const next = isDark() ? "light" : "dark";
    const apply = () => {
      root.dataset.theme = next; store.set("hwamyeon-theme", next); syncThemeBtn();
      M.resetCols && M.resetCols();
      if (inst && inst.frame && !$("lessonView").hidden) inst.frame(time, 0);
    };
    if (!document.startViewTransition || reduce) return apply();
    const r = $("themeBtn").getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const R = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
    root.classList.add("theme-vt");
    const t = document.startViewTransition(apply);
    t.ready.then(() => root.animate(
      { clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${R}px at ${cx}px ${cy}px)`] },
      { duration: 720, easing: "cubic-bezier(.7,0,.2,1)", pseudoElement: "::view-transition-new(root)" }));
    t.finished.finally(() => root.classList.remove("theme-vt"));
  };

  /* ---------- 코스 트리 ---------- */
  const matches = (l) => {
    if (!query) return true;
    const hay = [l.title, l.lede, CH[l.ch].name, ...(l.terms || []).flat()].join(" ").toLowerCase();
    return hay.includes(query);
  };
  /* 트리는 트랙·검색어가 바뀔 때만 다시 만들고, 나머지는 상태만 갱신(열고 닫기 애니메이션 유지) */
  let treeKey = "", modEls = [];
  function renderTree() {
    const key = track + "|" + query;
    if (key !== treeKey) { buildTree(); treeKey = key; }
    updateTree();
  }
  function buildTree() {
    const tree = $("tree"); tree.innerHTML = ""; modEls = [];
    $("trackName").textContent = TRACKS[track].name;
    CH.forEach((ch, ci) => {
      if (ch.track !== track) return;
      const ls = L.filter((l) => l.ch === ci), shown = ls.filter(matches);
      if (query && !shown.length) return;
      const mod = M.el("div", { class: "mod", "data-ci": ci });
      const head = M.el("button", { class: "mod__head", html: `${ICON.chev}${folderSvg(`var(--ch${ci})`)}<span class="mod__title">${pad2(ch.no)}. ${ch.name}</span><span class="mod__count num"></span>` });
      head.onclick = () => toggleMod(ci);
      const ul = M.el("ul", { class: "mod__list" });
      shown.forEach((l, k) => {
        const a = M.el("a", { href: "#" + l.id, "data-id": l.id, html: `<span class="ico"></span><span class="t">${l.title}</span>` });
        ul.append(M.el("li", { class: "lesson", style: `--k:${k}` }, a));
      });
      mod.append(head, M.el("div", { class: "mod__body" }, ul));
      tree.append(mod); modEls.push({ mod, head, ci, ls, links: [...ul.querySelectorAll("a")] });
    });
    if (query && !modEls.length) tree.append(M.el("p", { class: "hint tree-empty" }, `"${query}"에 맞는 레슨이 없습니다.`));
  }
  function updateTree() {
    const curId = L[idx] && !$("lessonView").hidden ? L[idx].id : null;
    modEls.forEach(({ mod, head, ci, ls, links }) => {
      const open = query ? true : openMods.has(ci);
      mod.classList.toggle("open", open); head.setAttribute("aria-expanded", String(open));
      mod.querySelector(".mod__body").inert = !open;
      head.querySelector(".mod__count").textContent = `${ls.filter((l) => done.has(l.id)).length}/${ls.length}`;
      links.forEach((a) => {
        const id = a.dataset.id, cur = id === curId, d = done.has(id);
        a.classList.toggle("is-current", cur); a.classList.toggle("is-done", d);
        if (cur) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
        const ico = a.querySelector(".ico"), want = d ? "check" : "file";
        if (ico.dataset.i !== want) { ico.dataset.i = want; ico.innerHTML = ICON[want]; if (want === "check") { ico.classList.remove("pop"); void ico.offsetWidth; ico.classList.add("pop"); } }
      });
    });
    const T = inTrack();
    $("lessonCount").textContent = `레슨 ${T.length}개`;
    $("progressText").textContent = `${T.filter((l) => done.has(l.id)).length} / ${T.length}`;
    $("progressBar").style.setProperty("--p", T.length ? T.filter((l) => done.has(l.id)).length / T.length : 0);
  }
  /* 아코디언: 한 번에 한 장만 열림 */
  function toggleMod(ci) {
    const wasOpen = openMods.has(ci);
    openMods.clear(); if (!wasOpen) openMods.add(ci);
    store.set("hwamyeon-open", [...openMods]); updateTree();
  }

  /* ---------- 오른쪽 도구 탭 (해보기 · 코드 · 용어 · 배울 내용) ---------- */
  let pane = "playWrap";
  const tabs = [...document.querySelectorAll("#panel .tab")];
  function setEmpty(el, v) { el.dataset.empty = v ? "1" : ""; syncTabs(); }
  function syncTabs() {
    const ok = (id) => $(id).dataset.empty !== "1";
    if (!ok(pane)) pane = tabs.map((t) => t.dataset.pane).find(ok) || "goalsWrap";
    tabs.forEach((t) => {
      t.hidden = !ok(t.dataset.pane);
      t.setAttribute("aria-selected", String(t.dataset.pane === pane));
      $(t.dataset.pane).hidden = t.dataset.pane !== pane;
    });
  }
  tabs.forEach((t) => (t.onclick = () => { if (pane === t.dataset.pane) return; pane = t.dataset.pane; syncTabs(); playEnter($(pane)); }));

  /* ---------- 레슨 ---------- */
  const api = {
    get stage() { return $("stage"); },
    get controls() { return $("controls"); },
    canvas(h) { return M.canvas($("stage"), h); },
    code(text, hl = [], title) {
      const wrap = $("codeWrap"), pre = $("code");
      if (!text) { setEmpty(wrap, true); return; }
      setEmpty(wrap, false);
      if (title) $("codeTitle").textContent = title;
      const inHl = (i) => hl === "all" || hl.some(([a, b]) => i >= a && i <= b);
      pre.innerHTML = "";
      text.split("\n").forEach((ln, i) => pre.append(M.el("span", { class: "ln" + (inHl(i) ? " hl" : "") }, ln || " ")));
    },
    restart() { time = 0; },
    get time() { return time; },
  };

  function showView(v, t = track) {
    track = t;
    $("lessonView").hidden = v !== "lesson"; $("glossView").hidden = v !== "gloss";
    $("rail").hidden = v !== "lesson";
    $("navWeb").classList.toggle("is-active", v === "lesson" && track === "web");
    $("navVideo").classList.toggle("is-active", v === "lesson" && track === "video");
    $("navGloss").classList.toggle("is-active", v === "gloss");
    document.querySelector(".layout").style.gridTemplateColumns = v === "gloss" && innerWidth > 860 ? (innerWidth > 1240 ? "256px minmax(0,1fr)" : "236px minmax(0,1fr)") : "";
  }

  function open(i) {
    if (inst && inst.destroy) inst.destroy();
    idx = i; const l = L[i], ch = CH[l.ch];
    showView("lesson", ch.track);
    track = ch.track; store.set("hwamyeon-track", track); store.set("hwamyeon-last-" + track, l.id);
    const inCh = L.filter((x) => x.ch === l.ch);
    openMods.clear(); openMods.add(l.ch); store.set("hwamyeon-open", [...openMods]);
    $("stage").innerHTML = ""; $("controls").innerHTML = ""; api.code(null);
    $("crumb").textContent = `${TRACKS[track].short}  ·  ${pad2(ch.no)}. ${ch.name}  /  ${inCh.length}개 중 ${inCh.indexOf(l) + 1}번째 레슨`;
    $("title").textContent = l.title;
    $("lede").textContent = l.lede;
    document.title = `${l.title} · 화면의 문법`;
    const mins = Math.round(l.steps.length * 1.5 + 2);
    const level = ch.track === "video" ? (ch.no === 1 ? "입문" : "기초") : ch.no <= 3 ? "입문" : ch.no <= 5 ? "기초" : "중급";
    $("tags").innerHTML = `<span class="tag tag--sand">${ICON.clock}${mins}분</span><span class="tag tag--mint">${ICON.level}${level}</span><span class="tag tag--lilac">${ICON.list}${l.steps.length}단계</span>`;
    const chip = $("chapterChip"); chip.textContent = ch.name; chip.style.background = `var(--ch${l.ch}-bg)`; chip.style.color = `var(--ch${l.ch}-fg)`;
    const key = l.key || KEY[l.id];
    $("callout").hidden = !key; $("calloutText").textContent = key || "";

    const terms = $("terms"); terms.innerHTML = "";
    setEmpty($("termsWrap"), !(l.terms && l.terms.length));
    (l.terms || []).forEach(([t, en, d]) => terms.append(M.el("dt", { html: `${t}${en ? `<span>${en}</span>` : ""}` }), M.el("dd", { html: d })));

    const steps = $("steps"); steps.innerHTML = ""; steps.style.setProperty("--n", l.steps.length);
    l.steps.forEach((s, j) => steps.append(M.el("li", { style: `--i:${j}` }, M.el("button", { title: s[0], onclick: () => setStep(j), html: `<span class="timeline__dot">${j + 1}</span><span class="timeline__label">${s[0]}</span>` }))));
    const goals = $("goals"); goals.innerHTML = "";
    l.steps.forEach((s) => goals.append(M.el("li", { html: `<span class="check">${ICON.check}</span><span>${s[0]}</span>` })));

    inst = l.mount(api) || {};
    [...$("controls").children].forEach((e, k) => e.style.setProperty("--i", k));
    setEmpty($("playWrap"), !$("controls").children.length);
    pane = $("playWrap").dataset.empty === "1" ? "goalsWrap" : "playWrap"; syncTabs();
    setStep(0);
    closeSide();
    window.scrollTo({ top: 0 });
  }

  /* 같은 트랙 안에서 앞뒤 레슨 */
  const sib = (d) => { const o = L[idx + d]; return o && trackOf(o) === trackOf(L[idx]) ? o : null; };

  /* 레슨 전환: 짧게 빠지고(exit) → 내용 교체 → 차례로 들어옴(enter) */
  let swapTimer = 0;
  const playEnter = (el) => { el.classList.remove("is-entering"); void el.offsetWidth; el.classList.add("is-entering"); };
  function switchTo(i) {
    const lv = $("lessonView"), rail = $("rail");
    const first = idx < 0 || lv.hidden || reduce;
    clearTimeout(swapTimer);
    const go = () => {
      lv.classList.remove("is-leaving"); rail.classList.remove("is-leaving");
      open(i); playEnter(lv); playEnter(rail);
    };
    if (first) return go();
    const dir = i > idx ? 1 : -1;
    lv.style.setProperty("--dir", dir); rail.style.setProperty("--dir", dir);
    lv.classList.add("is-leaving"); rail.classList.add("is-leaving");
    swapTimer = setTimeout(go, 150);
  }

  function setStep(s) {
    const l = L[idx], n = l.steps.length;
    step = M.clamp(s, 0, n - 1);
    time = 0;
    inst.setStep && inst.setStep(step);
    const [t, txt] = l.steps[step];
    $("stepNo").textContent = `${step + 1} / ${n}단계`;
    $("tlCount").textContent = `${n}단계 중 ${step + 1}단계`;
    $("stepTitle").textContent = t;
    $("stepText").innerHTML = txt;
    const g = $("guide"); g.classList.remove("is-in"); void g.offsetWidth; g.classList.add("is-in");
    $("steps").style.setProperty("--prog", n > 1 ? step / (n - 1) : 0);
    [...$("steps").children].forEach((li, j) => { li.className = j === step ? "cur" : j < step ? "past" : ""; });
    [...$("goals").children].forEach((li, j) => li.classList.toggle("done", j <= step));
    $("prevBtn").disabled = step === 0 && !sib(-1);
    const atEnd = step === n - 1, nextL = sib(1);
    $("nextLabel").textContent = atEnd ? (nextL ? `다음 레슨: ${nextL.title}` : "코스 끝") : `다음: ${l.steps[step + 1][0]}`;
    $("nextBtn").disabled = atEnd && !nextL;
    if (atEnd && !done.has(l.id)) { done.add(l.id); store.set("hwamyeon-done", [...done]); }
    renderTree();
  }

  function go(d) {
    if ($("lessonView").hidden) return;
    const n = L[idx].steps.length;
    if (d > 0 && step === n - 1) { if (sib(1)) location.hash = sib(1).id; return; }
    if (d < 0 && step === 0) { if (sib(-1)) location.hash = sib(-1).id; return; }
    setStep(step + d);
  }

  /* ---------- 용어집 ---------- */
  function renderGloss() {
    const box = $("gloss"); box.innerHTML = "";
    CH.forEach((ch, ci) => {
      const rows = L.filter((l) => l.ch === ci).flatMap((l) => (l.terms || []).map((t) => [l, ...t]))
        .filter(([l, t, en, d]) => !query || [t, en, d, l.title].join(" ").toLowerCase().includes(query));
      if (!rows.length) return;
      const sec = M.el("section", { class: "card" });
      if (!box.querySelector(`[data-track="${ch.track}"]`)) box.append(M.el("h3", { class: "gloss__track", "data-track": ch.track }, TRACKS[ch.track].name));
      sec.append(M.el("h2", { html: `${folderSvg(`var(--ch${ci})`)}${pad2(ch.no)}. ${ch.name}` }));
      const dl = M.el("dl");
      rows.forEach(([l, t, en, d]) => dl.append(M.el("div", {}, M.el("dt", { html: `<a href="#${l.id}">${t}</a>${en ? `<span>${en}</span>` : ""}` }), M.el("dd", { html: d }))));
      sec.append(dl); sec.style.setProperty("--i", box.children.length); box.append(sec);
    });
    if (!box.querySelector("section")) box.append(M.el("p", { class: "hint" }, `"${query}"에 맞는 용어가 없습니다.`));
  }

  function route() {
    const id = location.hash.slice(1);
    if (id === "glossary") {
      if (inst && inst.destroy) inst.destroy();
      inst = {}; $("stage").innerHTML = "";
      showView("gloss"); renderGloss(); playEnter($("glossView")); renderTree(); document.title = "용어집 · 화면의 문법"; closeSide(); return;
    }
    if (id === "web" || id === "video") {
      const last = store.get("hwamyeon-last-" + id, null);
      const t = L.find((l) => l.id === last && trackOf(l) === id) || L.find((l) => trackOf(l) === id);
      history.replaceState(null, "", "#" + t.id);
      return route();
    }
    let i = L.findIndex((l) => l.id === id);
    if (i < 0) i = Math.max(0, L.findIndex((l) => trackOf(l) === track));
    if (i !== idx || $("lessonView").hidden) switchTo(i);
  }

  /* ---------- 재생 ---------- */
  function tick(now) {
    const dt = Math.min(64, now - last) * (playing ? speed : 0);
    last = now; time += dt;
    if (inst && inst.frame && !$("lessonView").hidden) inst.frame(time, dt);
    $("tTime").textContent = `${Math.round(time)} ms`;
    requestAnimationFrame(tick);
  }
  function setPlaying(p) {
    playing = p;
    $("playLabel").textContent = p ? "일시정지" : "재생";
    $("playIcon").innerHTML = p ? ICON.pause : ICON.play;
  }
  const replay = () => { time = 0; inst.replay && inst.replay(); setPlaying(true); };

  /* ---------- 이벤트 ---------- */
  $("prevBtn").onclick = () => go(-1);
  $("nextBtn").onclick = () => go(1);
  $("playBtn").onclick = () => setPlaying(!playing);
  $("replayBtn").onclick = replay;
  $("slowBtn").onclick = () => { speed = speed === 1 ? 0.25 : 1; $("slowBtn").setAttribute("aria-pressed", String(speed !== 1)); };
  const search = $("search");
  search.addEventListener("input", () => { query = search.value.trim().toLowerCase(); renderTree(); if (!$("glossView").hidden) renderGloss(); });
  search.closest(".search").addEventListener("click", () => { search.closest(".search").classList.add("open"); search.focus(); });
  search.addEventListener("blur", () => { if (!search.value) search.closest(".search").classList.remove("open"); });
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.closest(".search").classList.add("open"); search.focus(); return; }
    if (e.target.closest("input, textarea, select")) { if (e.key === "Escape") e.target.blur(); return; }
    if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
    else if (e.key === "r" || e.key === "R") replay();
    else if (e.key === " " && !e.target.closest("button, a")) { setPlaying(!playing); e.preventDefault(); }
  });
  const side = $("side"), scrim = $("scrim");
  function closeSide() { side.classList.remove("open"); scrim.hidden = true; }
  $("courseBtn").onclick = () => { side.classList.add("open"); scrim.hidden = false; };
  scrim.onclick = closeSide;
  addEventListener("hashchange", route);
  addEventListener("resize", () => { if (!$("glossView").hidden) showView("gloss"); });

  setPlaying(playing);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { route(); requestAnimationFrame(tick); });
})();
