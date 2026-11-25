/* 6~7장: 브라우저가 그리는 법, GPU와 3D */

/* 이 파일 전용 그리기 도구 (전역 이름 충돌 방지용 접두사) */
const rwKit = (() => {
  const rgb = (hex) => {
    if (hex.startsWith("rgb")) return hex.replace(/[^\d,.]/g, "").split(",").slice(0, 3).map(Number);
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((q) => q + q).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  /* 두 토큰 색을 섞은 불투명 색 */
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };
  /* 일러스트 부품: 오프셋 그림자 + 옅은 틴트 + 잉크 외곽선 */
  const part = (x, px, py, w, h, o = {}) => {
    const c = M.col(), r = o.r ?? 10, dim = o.dim;
    x.save();
    if (o.shadow !== false) { M.rrect(x, px + 1.5, py + 2.5, w, h, r); x.fillStyle = dim ? M.alpha(c.ink, 0.12) : c.ink; x.fill(); }
    M.rrect(x, px, py, w, h, r); x.fillStyle = c.surface; x.fill();
    if (o.fill) { x.save(); if (dim) x.globalAlpha = 0.4; x.fillStyle = o.fill; x.fill(); x.restore(); }
    x.lineWidth = o.lw || 1.25; x.strokeStyle = o.stroke || (dim ? M.alpha(c.ink, 0.35) : c.ink); if (o.dash) x.setLineDash(o.dash); x.stroke();
    x.restore();
  };
  /* 점선 외곽선만 */
  const ghost = (x, px, py, w, h, color, r = 10, lw = 1.5) => {
    x.save(); M.rrect(x, px, py, w, h, r); x.setLineDash([5, 4]); x.lineWidth = lw; x.strokeStyle = color; x.stroke(); x.restore();
  };
  /* 지수 보간: 단계 전환 시 ~300ms ease-out 느낌 */
  const approach = (cur, target, dt, ms = 110) => cur + (target - cur) * (1 - Math.exp(-(dt || 16) / ms));
  const fitText = (x, s, maxW, size, kind = "ui", weight = 600) => {
    let z = size;
    for (; z > 11; z -= 0.5) { x.font = M.font(z, kind, weight); if (x.measureText(s).width <= maxW) break; }
    return z;
  };
  /* 지시선 주석인데 라벨이 오른쪽 끝을 넘으면 왼쪽으로 뒤집음 */
  const call = (x, W, s, ax, ay, lx, ly, o = {}) => {
    x.font = M.font(o.size || 11.5, o.mono ? "mono" : "ui", o.weight || 600);
    const tw = x.measureText(s).width + 16;
    const d = Math.abs(lx - ax);
    const fitR = ax + d + tw <= W - 4, fitL = ax - d - tw >= 4;
    if (!fitR && !fitL) {
      // 양쪽 다 모자라면 대상 위/아래에 가운데 정렬
      const cx = M.clamp(ax, tw / 2 + 4, W - tw / 2 - 4);
      M.line(x, ax, ay, ax, ly, M.alpha(o.line || M.col().ink, 0.7), 1);
      M.dot(x, ax, ay, 3, o.line || M.col().ink);
      return M.tag(x, s, cx, ly, { ...o, align: "center" });
    }
    lx = (lx >= ax ? fitR : !fitL) ? ax + d : ax - d;
    return M.callout(x, s, ax, ay, lx, ly, o);
  };
  return { rgb, mix, part, ghost, approach, fitText, call };
})();

/* ===== 6-1 렌더링 파이프라인 ===== */
LESSONS.push({
  id: "render-pipeline", ch: 5, order: 1,
  title: "한 프레임이 그려지기까지",
  lede: "브라우저가 화면 한 장을 그리는 다섯 단계와, 어떤 CSS 속성을 움직이면 그중 어느 단계를 다시 하게 되는지 봅니다. 레슨을 마치면 '애니메이션은 transform과 opacity로'라는 규칙이 왜 나왔는지 프레임 예산(ms)으로 설명할 수 있습니다.",
  steps: [
    ["다섯 단계", "화면이 바뀔 때마다 브라우저는 <b>자바스크립트 → 스타일 → 레이아웃 → 페인트 → 합성</b> 순서로 일합니다. 위쪽 카드에 불이 옮겨 가는 동안, 아래 화면에선 레이아웃 단계에 상자의 크기가 정해지고(점선), 페인트 단계에 색이 칠해지고, 합성 단계에 화면에 올라갑니다. 60Hz 화면이라면 이 전부가 <b>16.7ms</b> 안에 끝나야 합니다."],
    ["width를 움직이면", "<code>width</code>·<code>top</code>·<code>margin</code>처럼 크기나 위치를 바꾸면 <b>레이아웃</b>부터 다시 합니다. 아래 화면에서 상자가 커지면 오른쪽 '옆 요소'까지 밀려나는 게 보이죠. 브라우저는 매 프레임 주변 요소의 자리까지 다시 계산하고 다시 칠합니다. 가운데 막대가 16.7ms 선에 거의 닿습니다."],
    ["색을 움직이면", "<code>background-color</code>나 <code>box-shadow</code>는 크기를 바꾸지 않으니 레이아웃 카드는 꺼집니다. 그래도 픽셀을 새로 칠하는 <b>페인트</b>는 해야 합니다. 화면에서 초록 점선이 매 프레임 다시 칠하는 영역입니다. 작은 버튼의 hover 색 정도는 괜찮지만, 큰 면의 그림자를 계속 움직이면 무거워집니다."],
    ["transform과 opacity", "<code>transform</code>과 <code>opacity</code>는 이미 칠해 둔 그림을 GPU가 <b>옮기고 겹치기만</b> 합니다. 레이아웃과 페인트 카드가 모두 꺼지고 합성만 남아 막대가 3ms대로 줄었습니다. 상자는 움직여도 옆 요소는 제자리입니다(점선이 원래 레이아웃 자리). 그래서 움직임은 이 두 속성으로 만드는 것이 원칙입니다."],
    ["레이아웃 스래싱", "자바스크립트에서 <code>offsetWidth</code>를 읽고, 스타일을 쓰고, 또 읽기를 반복하면 브라우저는 <b>읽을 때마다 레이아웃을 강제로</b> 다시 합니다. 막대에 레이아웃 조각이 상자 수만큼 늘어나 16.7ms를 넘기면, 아래 프레임 띠에 빨간 칸(놓친 프레임)이 생기고 움직임이 끊깁니다. 이를 <b>쟁크</b>(jank)라고 부릅니다. '읽기 먼저' 체크로 고쳐 보세요."],
  ],
  terms: [
    ["레이아웃", "Layout · Reflow", "요소마다 크기와 위치를 계산하는 단계. width·margin·font-size를 바꾸거나 offsetWidth를 읽을 때 일어납니다."],
    ["페인트", "Paint", "글자·색·그림자를 픽셀로 칠하는 단계. 개발자 도구 Rendering 탭의 Paint flashing으로 칠한 영역을 볼 수 있습니다."],
    ["합성", "Composite", "따로 칠해 둔 레이어들을 GPU가 순서대로 겹쳐 최종 화면을 만드는 단계."],
    ["프레임 예산", "Frame budget", "한 프레임에 쓸 수 있는 시간. 60Hz에선 1000 ÷ 60 ≈ 16.7ms, 120Hz에선 8.3ms. 실제론 브라우저 몫을 빼고 10ms 안쪽을 목표로 잡습니다."],
    ["쟁크", "Jank", "프레임이 제때 그려지지 못해 움직임이 끊겨 보이는 현상. 성능 패널에서 빨간 프레임으로 표시됩니다."],
  ],
  mount(api) {
    const ST = [["JS", "자바스크립트", "JavaScript"], ["스타일", "스타일 계산", "Style"], ["레이아웃", "레이아웃", "Layout"], ["페인트", "페인트", "Paint"], ["합성", "합성", "Composite"]];
    const PROP = {
      first: [1.5, 1.5, 4, 4, 1],
      width: [1.5, 1.5, 6.5, 4.5, 1],
      background: [1.5, 1.5, 0, 4, 1],
      transform: [1.5, 1, 0, 0, 0.8],
    };
    const STEP_PROP = ["first", "width", "background", "transform", "thrash"];
    const CODE = {
      first: "/* 매 프레임: JS → Style → Layout → Paint → Composite */\n1000ms / 60fps  = 16.7ms\n1000ms / 120fps =  8.3ms",
      width: ".box { animation: grow 1s infinite alternate; }\n@keyframes grow {\n  from { width: 60px; }\n  to   { width: 220px; }   /* 레이아웃 → 페인트 → 합성 */\n}",
      background: ".box { animation: tint 1s infinite alternate; }\n@keyframes tint {\n  from { background: var(--blue); }\n  to   { background: var(--coral); }  /* 페인트 → 합성 */\n}",
      transform: ".box { animation: slide 1s infinite alternate; }\n@keyframes slide {\n  from { transform: translateX(0); }\n  to   { transform: translateX(160px); } /* 합성만 */\n}",
      thrash: "// 나쁨: 읽기와 쓰기를 번갈아 → 읽을 때마다 레이아웃 강제\nfor (const el of boxes) {\n  const w = el.offsetWidth;        // 읽기 → 레이아웃 강제\n  el.style.width = w + 1 + 'px';   // 쓰기 → 레이아웃 무효화\n}",
      fixed: "// 좋음: 전부 읽고 나서, 전부 쓴다 → 레이아웃 1번\nconst ws = boxes.map((el) => el.offsetWidth);   // 읽기만\nboxes.forEach((el, i) => {\n  el.style.width = ws[i] + 1 + 'px';            // 쓰기만\n});",
    };
    const HL = { first: [[1, 2]], width: [[3, 3]], background: [[3, 3]], transform: [[3, 3]], thrash: [[2, 3]], fixed: [[1, 4]] };
    const cv = api.canvas("fill");
    const ctl = M.el("div", { class: "webl-ctl" }); api.controls.append(ctl);
    let step = 0, prop = "first", hz = 60, nBox = 6, fixed = false;
    let segs = [], lastFrameAt = 0, shownP = 0, frames = [];
    const segTargets = () => {
      if (prop !== "thrash") return PROP[prop].map((ms, i) => ({ ms, k: i }));
      if (fixed) return [1.5, 1.5, 2.6, 2.2, 1].map((ms, i) => ({ ms, k: i }));
      const out = [{ ms: 1, k: 0 }, { ms: 1, k: 1 }];
      for (let i = 0; i < nBox; i++) out.push({ ms: 0.4, k: 0 }, { ms: 2.4, k: 2 });
      out.push({ ms: 2.2, k: 3 }, { ms: 1, k: 4 });
      return out;
    };
    const showCode = () => { const k = prop === "thrash" && fixed ? "fixed" : prop; api.code(CODE[k], HL[k], prop === "thrash" ? "JavaScript" : "CSS"); };
    function controls() {
      ctl.innerHTML = "";
      M.chips(ctl, { title: "화면 주사율", items: ["60Hz · 16.7ms", "120Hz · 8.3ms"], value: hz === 60 ? 0 : 1, onPick: (i) => (hz = i ? 120 : 60) });
      if (step >= 1 && step <= 3) M.chips(ctl, { title: "움직일 속성", items: ["width", "background-color", "transform"], value: ["width", "background", "transform"].indexOf(prop), onPick: (i) => { prop = ["width", "background", "transform"][i]; showCode(); } });
      if (step === 4) {
        M.slider(ctl, { id: "rp-n", label: "읽고 쓰는 상자 수", min: 1, max: 10, value: nBox, unit: "개", onInput: (v) => (nBox = v) });
        M.check(ctl, { id: "rp-fix", label: "읽기 먼저, 쓰기 나중 (고친 코드)", checked: fixed, onChange: (v) => { fixed = v; showCode(); } });
      }
      if (step === 0) M.readout(ctl).textContent = "주사율을 120Hz로 바꾸면 빨간 예산 선이 절반으로 당겨집니다.";
    }
    return {
      setStep(s) {
        step = s; prop = STEP_PROP[s]; fixed = false; nBox = 6; frames = []; lastFrameAt = 0;
        controls(); showCode();
      },
      frame(time, dt) {
        const { x, w, h } = M.fit(cv), c = M.col();
        const COL = [c.muted, c.a, c.b, c.key, c.c];
        const narrow = w < 520;
        const budget = 1000 / hz;
        const loop0 = step === 0 ? Math.min(5, Math.floor((time % 6300) / 900)) : -1; // 0~4 단계, 5 = 완성 상태 유지
        const target = segTargets().map((t) => (step === 0 && loop0 < 5 && t.k > loop0 ? { ...t, ms: 0 } : t));
        // 막대 조각 보간
        while (segs.length < target.length) segs.push({ ms: 0, k: target[segs.length].k });
        segs.length = Math.max(segs.length, target.length);
        segs.forEach((sg, i) => { const t = target[i]; if (t) sg.k = t.k; sg.ms = rwKit.approach(sg.ms, t ? t.ms : 0, dt); });
        segs = segs.filter((sg, i) => target[i] || sg.ms > 0.05);
        const total = target.reduce((a, b) => a + b.ms, 0);
        const live = segs.reduce((a, b) => a + b.ms, 0);
        const used = [0, 1, 2, 3, 4].map((k) => target.some((t) => t.k === k && t.ms > 0));

        /* ---- 1. 단계 카드 ---- */
        const gap = narrow ? 5 : 22, top = 4;
        const cardH = M.clamp(h * 0.16, 46, 66);
        const cw = (w - gap * 4) / 5;
        const focusK = { width: 2, background: 3, transform: 4, thrash: 2 }[prop];
        ST.forEach(([sh, ko, en], i) => {
          const px = i * (cw + gap);
          const on = step === 0 ? true : used[i];
          const hot = step === 0 ? i === loop0 : i === focusK;
          const tint = step === 0 ? (i < loop0 ? 0.2 : i === loop0 ? 0.42 : 0) : hot ? 0.42 : 0.2;
          rwKit.part(x, px, top, cw, cardH, { fill: on && tint ? M.alpha(COL[i], tint) : null, dim: !on, dash: on ? null : [4, 3], lw: hot ? 2.2 : 1.25, r: 10 });
          const name = narrow ? sh : ko;
          const fz = rwKit.fitText(x, name, cw - 10, narrow ? 12 : 13.5, "ui", 700);
          x.save(); if (!on) x.globalAlpha = 0.45;
          M.text(x, name, px + cw / 2, top + cardH / 2 + (cardH >= 54 && !narrow ? -3 : 4), { size: fz, weight: 700, color: c.ink, align: "center" });
          if (cardH >= 54 && !narrow) M.text(x, on ? en : "생략", px + cw / 2, top + cardH / 2 + 15, { size: 11, color: on ? c.muted : c.b, align: "center", mono: on });
          x.restore();
          if (!narrow && i < 4) M.arrow(x, px + cw + 4, top + cardH / 2, px + cw + gap - 4, top + cardH / 2, M.alpha(c.ink, 0.55), 1.25);
        });

        /* ---- 2. 프레임 예산 막대 ---- */
        const by = top + cardH + 30, bh = 24;
        const maxMs = Math.max(26, live + 2);
        const X = (ms) => (ms / maxMs) * w;
        M.text(x, prop === "thrash" && !fixed ? `한 프레임 작업 시간 · 레이아웃 × ${nBox}번` : "한 프레임 작업 시간", 0, by - 9, { size: 12, weight: 600, color: c.ink });
        const over = total > budget;
        M.text(x, `${total.toFixed(1)} ms`, w, by - 9, { size: 12.5, mono: true, weight: 700, color: over ? c.b : c.ink, align: "right" });
        M.rrect(x, 0, by, w, bh, 6); x.fillStyle = c.sunk; x.fill();
        let acc = 0;
        x.save(); M.rrect(x, 0, by, w, bh, 6); x.clip();
        segs.forEach((sg) => {
          const x0 = X(acc), x1 = X(acc + sg.ms); acc += sg.ms;
          if (x1 - x0 < 0.5) return;
          x.fillStyle = rwKit.mix(c.surface, COL[sg.k], sg.k === 0 ? 0.45 : 0.6); x.fillRect(x0, by, x1 - x0, bh);
          M.line(x, x1, by, x1, by + bh, c.ink, 1);
          if (x1 - x0 > 30 && !(prop === "thrash" && !fixed)) M.text(x, sg.ms.toFixed(1), (x0 + x1) / 2, by + bh / 2 + 4, { size: 11, mono: true, color: c.ink, align: "center", weight: 600 });
        });
        x.restore();
        M.rrect(x, 0, by, w, bh, 6); x.lineWidth = 1.25; x.strokeStyle = c.ink; x.stroke();
        const bx = X(budget);
        M.line(x, bx, by - 5, bx, by + bh + 5, c.b, 2);
        M.tag(x, `${budget.toFixed(1)}ms · ${hz}fps 예산`, bx, by + bh + 16, { align: bx > w - 90 ? "right" : "center", color: c.b, size: 11 });

        /* ---- 3. 화면 예시 ---- */
        const dy = by + bh + 34, dh = h - dy - 2;
        if (dh < 60) return;
        rwKit.part(x, 0, dy, w, dh, { fill: null, shadow: false, stroke: M.alpha(c.ink, 0.5), dash: [5, 4], r: 12 });
        const ix = 14, iw = w - 28;
        const strip = prop === "thrash";
        const avail = dh - 34 - (strip ? 44 : 0) - 34;
        const boxH = M.clamp(avail * 0.6, 34, 120);
        const rowY = dy + 34 + Math.max(0, (avail - boxH) / 2);
        const p = (Math.sin(time / 560) + 1) / 2;
        // 스래싱: 제때 끝난 프레임에서만 화면이 갱신됨
        let pShown = p;
        if (strip) {
          const per = 1000 / hz, need = Math.max(1, Math.ceil(total / per));
          const v = Math.floor(time / per);
          if (v !== lastFrameAt) {
            lastFrameAt = v;
            const fresh = v % need === 0;
            frames.push(fresh); if (frames.length > 40) frames.shift();
            if (fresh) shownP = p;
          }
          pShown = shownP;
        }
        const baseW = narrow ? 56 : 80, span = Math.min(narrow ? 90 : 170, iw * 0.34);
        let bw = baseW, tx = 0, fill = M.alpha(c.a, 0.3), flash = false;
        if (prop === "width" || strip) bw = baseW + span * pShown;
        if (prop === "background") { fill = rwKit.mix(rwKit.mix(c.surface, c.a, 0.35), rwKit.mix(c.surface, c.b, 0.45), M.smooth(p)); flash = Math.floor(time / 90) % 2 === 0; }
        if (prop === "transform") tx = span * p;
        const sibs = narrow ? [64, 52] : [110, 80, 60];
        const stage0 = step === 0 ? loop0 : 5;
        const cap = step === 0
          ? ["1 JS · DOM을 바꿈", "2 스타일 · 어떤 CSS가 맞는지 계산", "3 레이아웃 · 크기와 자리 계산", "4 페인트 · 픽셀로 칠함", "5 합성 · 레이어를 겹쳐 화면에", "완성된 프레임"][stage0]
          : { width: "레이아웃부터 다시", background: "페인트부터 다시", transform: "합성만 다시", thrash: fixed ? "레이아웃 1번" : "레이아웃을 매번 강제" }[prop];
        M.tag(x, cap, 12, dy + 16, { size: 11.5, fill: step === 0 && stage0 < 5 ? M.alpha(COL[stage0], 0.3) : c.surface });
        if (step === 0 && stage0 < 2) {
          const t = stage0 === 0 ? "box.style.width = '80px'" : ".box { width: 80px; background: blue }";
          M.text(x, t, w / 2, rowY + boxH / 2 + 4, { size: 13, mono: true, color: c.ink, align: "center", weight: 600 });
        }
        // 상자와 옆 요소
        const drawEl = (ex, ew, col, label, idx) => {
          if (step === 0 && stage0 < 2) return;
          if (step === 0 && stage0 === 2) {
            rwKit.ghost(x, ex, rowY, ew, boxH, c.ink, 9, 1.25);
            if (idx === 0) M.text(x, `${Math.round(ew)}×${Math.round(boxH)}`, ex + ew / 2, rowY + boxH / 2 + 4, { size: 11, mono: true, color: c.ink, align: "center" });
            return;
          }
          rwKit.part(x, ex, rowY, ew, boxH, { fill: col, r: 9, shadow: step !== 0 || stage0 >= 4 });
          if (label) M.text(x, label, ex + ew / 2, rowY + boxH / 2 + 4, { size: 11.5, weight: 600, color: c.ink, align: "center" });
        };
        let sx = ix + bw + 12;
        const sibX = [];
        sibs.forEach((sw) => { if (sx + sw <= ix + iw + (prop === "width" || strip ? 400 : 0)) sibX.push([sx, sw]); sx += sw + 10; });
        x.save(); x.beginPath(); x.rect(1, dy + 1, w - 2, dh - 2); x.clip();
        sibX.forEach(([sx0, sw], i) => drawEl(sx0, sw, M.alpha(c.muted, 0.16), i === 0 ? "옆 요소" : "", i + 1));
        if (prop === "transform") rwKit.ghost(x, ix, rowY, bw, boxH, M.alpha(c.ink, 0.5), 9, 1.25);
        drawEl(ix + tx, bw, fill, step === 0 ? ".box" : "", 0);
        if (flash) { rwKit.ghost(x, ix - 4, rowY - 4, bw + 8, boxH + 8, c.c, 12, 2.5); }
        x.restore();
        // 주석
        const ay = rowY + boxH;
        if (step > 0) {
          const ly = Math.min(ay + 22, dy + dh - 14 - (strip ? 40 : 0));
          if (prop === "width" || strip) rwKit.call(x, w, `width: ${Math.round(bw)}px`, ix + 24, ay, ix + 38, ly, { mono: true, size: 11 });
          if (prop === "background") rwKit.call(x, w, "다시 칠한 영역", ix + bw / 2, ay + 4, ix + bw / 2 + 16, ly + 4, { size: 11, line: c.c });
          if (prop === "transform") rwKit.call(x, w, `transform: translateX(${Math.round(tx)}px)`, ix + tx + 24, ay, ix + tx + 38, ly, { mono: true, size: 11 });
          if (sibX[0] && !narrow && !strip) {
            const [s0, sw] = sibX[0];
            const t = prop === "width" ? "옆 요소도 밀림" : "옆 요소는 그대로";
            if (s0 + sw / 2 < w - 20) rwKit.call(x, w, t, s0 + sw - 14, rowY, Math.min(w - 12, s0 + sw + 10), rowY - 14, { size: 11, line: prop === "width" ? c.b : c.ink, color: prop === "width" ? c.b : c.ink, align: "left" });
          }
        }
        // 프레임 띠
        if (strip) {
          const sy = dy + dh - 34, n = Math.max(8, Math.floor((iw - 90) / 15));
          M.text(x, "프레임", ix, sy + 13, { size: 11, weight: 600, color: c.ink });
          const fr = frames.slice(-n);
          const cell = (iw - 58) / n;
          fr.forEach((ok, i) => {
            const fx = ix + 50 + i * cell;
            M.rrect(x, fx, sy, cell - 3, 18, 4);
            x.fillStyle = ok ? M.alpha(c.c, 0.35) : M.alpha(c.b, 0.45); x.fill();
            x.lineWidth = 1; x.strokeStyle = ok ? M.alpha(c.ink, 0.6) : c.b; x.stroke();
          });
          const drops = fr.filter((v) => !v).length;
          M.text(x, drops ? `놓친 프레임 ${drops} / ${fr.length}` : "놓친 프레임 없음", ix + iw, dy + 20, { size: 11.5, mono: true, weight: 700, color: drops ? c.b : c.c, align: "right" });
        }
      },
    };
  },
});

/* ===== 6-3 FLIP ===== */
LESSONS.push({
  id: "flip", ch: 5, order: 3,
  title: "FLIP: 레이아웃을 부드럽게 바꾸는 요령",
  lede: "목록 순서가 바뀌거나 카드가 커질 때, 위치를 직접 애니메이션하면 매 프레임 레이아웃이 돕니다. 이 레슨을 마치면 FLIP 네 단계로 레이아웃 변화를 transform 애니메이션 하나로 바꿔치기하는 원리를 설명하고 직접 코드로 쓸 수 있습니다.",
  steps: [
    ["First: 처음 위치 기록", "바꾸기 전에 각 타일의 위치를 <code>getBoundingClientRect()</code>로 재서 적어 둡니다. 초록 점선이 기록해 둔 자리이고, 타일 A 옆 태그가 실제로 적어 둔 좌표입니다. 이 단계에선 화면에 아무 변화가 없습니다."],
    ["Last: 바꾸고 다시 재기", "DOM 순서를 바꾸면 브라우저는 다음 프레임에 새 자리로 <b>순간이동</b>시켜 그립니다. 타일이 점선(처음 자리)에서 툭 튀는 걸 보세요. 이때 새 위치를 한 번 더 잽니다. 측정은 이 두 번뿐입니다."],
    ["Invert: 거꾸로 되돌려 놓기", "타일마다 <code>처음 − 나중</code>만큼 <code>transform: translate()</code>를 걸어, 이미 새 자리에 있는데도 <b>원래 자리에 있는 것처럼</b> 보이게 합니다. 회색 점선이 진짜 레이아웃 자리, 화살표가 곧 움직일 경로입니다. A에 붙은 dx·dy 값이 거는 transform입니다."],
    ["Play: transform 풀기", "이제 transform을 0으로 애니메이션합니다. 레이아웃은 이미 끝났고 움직이는 건 transform뿐이라 브라우저는 <b>합성만</b> 합니다. A의 태그에서 translate 값이 0으로 줄어드는 걸 보세요. 지속시간은 보통 250~400ms, 이징(easing, 속도의 변화)은 ease-out이 자연스럽습니다."],
    ["직접 섞어 보기", "섞기 버튼을 누르거나 <b>타일을 끌어 다른 칸에 놓아</b> 보세요. 놓는 순간 FLIP이 돌아 나머지 타일이 미끄러지듯 자리를 찾습니다. 'FLIP 없이'와 비교하면 차이가 분명합니다. Framer Motion의 <code>layout</code>, GSAP Flip, View Transitions가 내부에서 하는 일이 바로 이것입니다."],
  ],
  terms: [
    ["FLIP", "First · Last · Invert · Play", "처음 위치 기록 → 바꾼 뒤 위치 측정 → transform으로 되돌림 → 풀기. Paul Lewis가 2015년에 이름 붙인 기법입니다."],
    ["레이아웃 애니메이션", "Layout animation", "크기나 위치가 바뀌는 전환. width·top을 직접 애니메이션하면 매 프레임 레이아웃이 돌아 무겁습니다."],
    ["getBoundingClientRect", "Element.getBoundingClientRect()", "요소의 화면상 위치와 크기를 돌려주는 메서드. 부르는 순간 레이아웃이 최신이 되도록 강제합니다."],
    ["공유 요소 전환", "Shared element transition", "한 화면의 요소가 다음 화면의 같은 요소로 이어지듯 변하는 전환. FLIP을 화면 단위로 넓힌 것입니다."],
  ],
  mount(api) {
    const N = 8, LET = "ABCDEFGH", B = [5, 2, 7, 4, 3, 6, 0, 1];
    const cv = api.canvas("fill");
    let step = 0, dur = 450, order = [...Array(N).keys()]; // order[slot] = tile
    let anim = null; // {from:[[x,y]], t0}
    let drag = null, noFlip = false, geo = null;
    const CODE = "// 1. First\nconst first = el.getBoundingClientRect();\n// 2. Last\ncontainer.append(...newOrder);\nconst last = el.getBoundingClientRect();\n// 3. Invert\nconst dx = first.left - last.left;\nconst dy = first.top - last.top;\nel.style.transform = `translate(${dx}px, ${dy}px)`;\n// 4. Play\nel.animate(\n  [{ transform: el.style.transform }, { transform: 'none' }],\n  { duration: 450, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });";
    const HLS = [[[0, 1]], [[2, 4]], [[5, 8]], [[9, 12]], "all"];
    const ctl = M.el("div", { class: "webl-ctl" }); api.controls.append(ctl);
    const shuffle = () => { const n = order.slice(); for (let i = n.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [n[i], n[j]] = [n[j], n[i]]; } return n; };
    function controls() {
      ctl.innerHTML = "";
      if (step === 4) {
        const row = M.el("div", { class: "chips" },
          M.el("button", { class: "chip", onclick: () => reorder(shuffle(), false) }, "섞기 (FLIP)"),
          M.el("button", { class: "chip", onclick: () => reorder(shuffle(), true) }, "섞기 (FLIP 없이)"));
        ctl.append(M.el("div", { class: "ctl" }, M.el("span", { class: "lbl" }, "섞기"), row));
        M.readout(ctl).textContent = "무대의 타일을 끌어 다른 칸에 놓아도 됩니다.";
      }
      M.slider(ctl, { id: "flipdur", label: "Play 지속시간", min: 150, max: 2000, step: 50, value: dur, unit: " ms", onInput: (v) => (dur = v) });
    }
    const slotRect = (g, k) => ({ x: g.ox + (k % g.cols) * (g.s + g.gap), y: g.oy + Math.floor(k / g.cols) * (g.s + g.gap), w: g.s, h: g.s });
    const tilePos = (g) => { const pos = []; order.forEach((t, k) => (pos[t] = slotRect(g, k))); return pos; };
    function reorder(next, instant) {
      if (!geo) { order = next; return; }
      const before = currentDrawn();
      order = next.slice();
      noFlip = instant;
      anim = instant ? null : { from: before, t0: api.time };
    }
    function currentDrawn() {
      const pos = tilePos(geo);
      return pos.map((r, i) => {
        let ox = 0, oy = 0;
        if (anim) { const t = M.clamp((api.time - anim.t0) / dur, 0, 1), e = 1 - M.ease.out(t); ox = (anim.from[i].x - r.x) * e; oy = (anim.from[i].y - r.y) * e; }
        if (drag && drag.tile === i) { ox = drag.px - drag.gx - r.x; oy = drag.py - drag.gy - r.y; }
        return { x: r.x + ox, y: r.y + oy };
      });
    }
    // 끌기
    const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left - (cv._inset || 0), e.clientY - r.top - (cv._inset || 0)]; };
    cv.addEventListener("pointerdown", (e) => {
      if (step !== 4 || !geo) return;
      const [px, py] = local(e), cur = currentDrawn();
      const i = cur.findIndex((r) => px >= r.x && px <= r.x + geo.s && py >= r.y && py <= r.y + geo.s);
      if (i < 0) return;
      drag = { tile: i, gx: px - cur[i].x, gy: py - cur[i].y, px, py };
      anim = null; cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener("pointermove", (e) => {
      const [px, py] = local(e);
      if (drag) { drag.px = px; drag.py = py; }
      if (step === 4 && geo) cv.style.cursor = drag ? "grabbing" : currentDrawn().some((r) => px >= r.x && px <= r.x + geo.s && py >= r.y && py <= r.y + geo.s) ? "grab" : "";
    });
    const drop = () => {
      if (!drag) return;
      const cx = drag.px - drag.gx + geo.s / 2, cy = drag.py - drag.gy + geo.s / 2;
      let best = 0, bd = 1e9;
      for (let k = 0; k < N; k++) { const r = slotRect(geo, k), d = Math.hypot(r.x + geo.s / 2 - cx, r.y + geo.s / 2 - cy); if (d < bd) { bd = d; best = k; } }
      const before = currentDrawn();
      const n = order.filter((t) => t !== drag.tile); n.splice(best, 0, drag.tile);
      drag = null; order = n; noFlip = false;
      anim = { from: before, t0: api.time };
    };
    cv.addEventListener("pointerup", drop); cv.addEventListener("pointercancel", drop);

    return {
      setStep(s) {
        step = s; anim = null; drag = null; noFlip = false;
        order = s === 0 ? [...Array(N).keys()] : B.slice();
        controls();
        api.code(CODE, HLS[s], "JavaScript");
      },
      frame(time) {
        const { x, w, h } = M.fit(cv), c = M.col();
        const TONE = [c.a, c.b, c.c, c.key];
        const tall = h > w * 0.95;
        const cols = tall ? 2 : 4, rows = N / cols;
        const top = 62, bottom = 34;
        const gap = M.clamp(w * 0.02, 8, 16);
        const s = Math.min((w - 24 - gap * (cols - 1)) / cols, (h - top - bottom - gap * (rows - 1)) / rows, 150);
        const gw = cols * s + (cols - 1) * gap, gh = rows * s + (rows - 1) * gap;
        geo = { cols, s, gap, ox: (w - gw) / 2, oy: top + (h - top - bottom - gh) / 2 };
        const g = geo;
        const firstPos = []; for (let i = 0; i < N; i++) firstPos[i] = slotRect(g, i); // A 순서 = 처음
        const lastPos = []; B.forEach((t, k) => (lastPos[t] = slotRect(g, k)));
        const fmt = (v) => (v > 0 ? "+" : "") + Math.round(v);
        // 단계별로 그릴 위치
        let pos, focus = 0;
        if (step === 0) pos = firstPos;
        else if (step === 1) { const ph = (time % 2400) / 2400; pos = ph < 0.4 ? firstPos : lastPos; }
        else if (step === 2) pos = firstPos;
        else if (step === 3) { const e = 1 - M.ease.out(M.clamp((time % (dur + 1000)) / dur, 0, 1)); pos = lastPos.map((r, i) => ({ x: r.x + (firstPos[i].x - r.x) * e, y: r.y + (firstPos[i].y - r.y) * e })); }
        else pos = currentDrawn();
        // 고스트
        if (step === 0) firstPos.forEach((r) => rwKit.ghost(x, r.x - 4, r.y - 4, s + 8, s + 8, c.c, 12, 1.75));
        if (step === 1) firstPos.forEach((r) => rwKit.ghost(x, r.x - 4, r.y - 4, s + 8, s + 8, M.alpha(c.c, 0.8), 12, 1.5));
        if (step === 2 || step === 3) lastPos.forEach((r) => rwKit.ghost(x, r.x, r.y, s, s, M.alpha(c.ink, 0.35), 10, 1.25));
        if (step === 4 && drag) for (let k = 0; k < N; k++) { const r = slotRect(g, k); rwKit.ghost(x, r.x, r.y, s, s, M.alpha(c.ink, 0.2), 10, 1); }
        // 타일 (끄는 타일은 맨 위)
        const ord = [...Array(N).keys()].sort((a, b) => (drag && a === drag.tile) - (drag && b === drag.tile) || (a === focus) - (b === focus));
        ord.forEach((i) => {
          const r = pos[i];
          const dimmed = step === 2 && i !== focus;
          rwKit.part(x, r.x, r.y, s, s, { fill: M.alpha(TONE[i % 4], i === focus && step >= 1 && step <= 3 ? 0.5 : 0.28), r: 10, dim: dimmed, lw: i === focus && step >= 1 && step <= 3 ? 2 : 1.25 });
          M.text(x, LET[i], r.x + s / 2, r.y + s / 2 + s * 0.12, { size: Math.round(s * 0.34), weight: 800, color: dimmed ? M.alpha(c.ink, 0.4) : c.ink, align: "center" });
        });
        // 화살표: Invert
        if (step === 2) {
          for (let i = 0; i < N; i++) {
            const a = firstPos[i], b = lastPos[i];
            if (Math.hypot(a.x - b.x, a.y - b.y) < 2) continue;
            M.arrow(x, a.x + s / 2, a.y + s / 2, b.x + s / 2, b.y + s / 2, i === focus ? c.ink : M.alpha(c.ink, 0.3), i === focus ? 2 : 1.25);
          }
        }
        // A 주석
        const A = pos[focus], fa = firstPos[focus], la = lastPos[focus];
        const cap = (t) => M.tag(x, t, 12, 18, { size: 11.5 });
        if (step === 0) { cap("① First · 처음 위치 기록"); rwKit.call(x, w, `first: x ${Math.round(fa.x)}, y ${Math.round(fa.y)}`, fa.x + s / 2, fa.y, fa.x + s / 2 + 10, Math.max(44, fa.y - 22), { mono: true, size: 11 }); }
        if (step === 1) {
          const jumped = (time % 2400) / 2400 >= 0.4;
          cap(jumped ? "② Last · 새 자리로 순간이동" : "② DOM 순서 바꾸는 중…");
          if (jumped) rwKit.call(x, w, `last: x ${Math.round(la.x)}, y ${Math.round(la.y)}`, la.x + s / 2, la.y, Math.min(w - 8, la.x + s / 2 + 10), Math.max(44, la.y - 22), { mono: true, size: 11 });
        }
        if (step === 2) { cap("③ Invert · transform으로 되돌려 놓기"); rwKit.call(x, w, `transform: translate(${fmt(fa.x - la.x)}px, ${fmt(fa.y - la.y)}px)`, A.x + s / 2, A.y, Math.min(w - 8, A.x + s / 2 + 12), Math.max(44, A.y - 22), { mono: true, size: 11 }); }
        if (step === 3) { cap("④ Play · transform → 0"); rwKit.call(x, w, `translate(${fmt(A.x - la.x)}px, ${fmt(A.y - la.y)}px)`, A.x + s / 2, A.y, Math.min(w - 8, A.x + s / 2 + 12), Math.max(44, A.y - 22), { mono: true, size: 11 }); }
        if (step === 4) cap(drag ? "놓는 칸으로 들어가며 FLIP" : noFlip ? "FLIP 없이: 순간이동" : "타일을 끌어 다른 칸에 놓아 보세요");
        // 하단 상태
        const msg = ["레이아웃 측정 1번 (first)", "레이아웃 측정 2번 (first, last)", "transform만 걸었음 · 레이아웃 그대로", "애니메이션 중 레이아웃 0번 · 합성만", noFlip ? "transform 없이 바로 바뀜" : "측정 2번 + transform 애니메이션"][step];
        M.text(x, msg, w / 2, h - 12, { size: 12, color: c.muted, align: "center" });
      },
      destroy() {},
    };
  },
});

/* ===== 7-2 원근 투영 ===== */
LESSONS.push({
  id: "projection", ch: 7, order: 2,
  title: "원근 투영과 화각",
  lede: "three.js의 PerspectiveCamera(fov, aspect, near, far)는 네 숫자로 3D 공간을 2D 화면에 옮깁니다. 같은 크기의 상자 셋을 옆에서 본 모습과 카메라 화면으로 나란히 보며, 레슨을 마치면 화각과 거리가 화면 속 크기를 어떻게 바꾸는지 숫자로 설명할 수 있습니다.",
  steps: [
    ["멀수록 작게", "화면 속 높이는 <b>초점거리 × 실제 높이 ÷ 거리</b>입니다. 거리로 <b>나누기</b> 때문에 두 배 멀면 절반 크기가 됩니다. 왼쪽 그림의 점선이 상자 꼭대기에서 카메라로 들어오는 빛이고, 오른쪽 화면의 px 태그가 그 결과입니다. 거리 d와 px 값을 짝지어 비교해 보세요."],
    ["망원: 좁은 화각", "화각(fov, 카메라가 담는 각도)을 18°로 좁히고, 앞 상자가 같은 크기로 보이도록 카메라를 뒤로 뺐습니다. 앞뒤 상자의 크기 차이(아래 '앞 ÷ 뒤' 태그)가 줄어 <b>원근이 압축</b>됩니다. 망원 렌즈로 찍은 도시 사진에서 건물이 빽빽하게 겹쳐 보이는 이유입니다."],
    ["광각: 넓은 화각", "이번엔 화각을 100°로 넓히고 카메라를 바짝 붙였습니다. 앞 상자는 그대로인데 뒤 상자가 훨씬 작아져 '앞 ÷ 뒤' 값이 커집니다. <b>원근이 과장</b>되는 것이죠. 게임에서 FOV를 90° 이상으로 올리면 속도감이 커지는 것도, 셀카 광각에서 코가 커 보이는 것도 같은 원리입니다."],
    ["near와 far", "카메라는 <b>near</b>보다 가깝거나 <b>far</b>보다 먼 것을 그리지 않습니다. 두 평면과 화각이 만드는 잘린 피라미드(노란 영역)가 <b>절두체</b>(frustum), 즉 보이는 공간입니다. far를 12로 줄여 맨 뒤 상자가 점선으로 빠졌습니다. 슬라이더로 near와 far를 직접 움직여 보세요."],
    ["직교 투영", "거리로 나누지 않으면 원근이 사라져 세 상자가 <b>모두 같은 높이</b>로 보입니다. three.js에선 <code>OrthographicCamera</code>입니다. 크기를 정확히 비교해야 하는 설계도, 아이소메트릭 일러스트, 전략 게임 지도, 시스템 다이어그램에 씁니다."],
  ],
  terms: [
    ["원근 투영", "Perspective projection", "거리로 나눠 멀수록 작게 그리는 투영. 사람 눈과 사진 렌즈가 보는 방식이고, 3D 장면의 기본입니다."],
    ["직교 투영", "Orthographic projection", "거리와 상관없이 같은 크기로 그리는 투영. 아이소메트릭 일러스트와 CAD 도면이 이 방식입니다."],
    ["절두체", "Frustum", "near·far 평면과 화각으로 정해지는 잘린 피라미드 모양의 보이는 공간. 이 밖의 물체는 그리지 않습니다(컬링)."],
    ["화각 · 초점거리", "FOV · Focal length", "카메라가 담는 각도. 좁은 화각 = 긴 초점거리(망원), 넓은 화각 = 짧은 초점거리(광각). three.js의 fov는 세로 화각입니다."],
  ],
  mount(api) {
    const cv = api.canvas("fill");
    let step = 0, fov = 50, near = 0.5, far = 30, keep = true;
    const sF = M.slider(api.controls, { id: "pjf", label: "화각 fov", min: 12, max: 110, value: 50, unit: "°", onInput: (v) => { fov = v; anim = null; } });
    const sN = M.slider(api.controls, { id: "pjn", label: "near", min: 0.1, max: 6, step: 0.1, value: 0.5, onInput: (v) => { near = v; anim = null; } });
    const sR = M.slider(api.controls, { id: "pjr", label: "far", min: 4, max: 30, step: 0.5, value: 30, onInput: (v) => { far = v; anim = null; } });
    M.check(api.controls, { id: "pjk", label: "앞 상자 크기 고정 (카메라 자동 이동)", checked: true, onChange: (v) => (keep = v) });
    const CODE = [
      "const camera = new THREE.PerspectiveCamera(\n  50,          // fov: 세로 화각(°)\n  w / h,       // aspect\n  0.5, 30      // near, far\n);\n// 화면 높이 = f × 실제 높이 ÷ 거리",
      "camera.fov = 18;                 // 망원\ncamera.position.z -= 9;          // 뒤로 물러나 크기 맞춤\ncamera.updateProjectionMatrix(); // 바꾼 뒤 꼭 호출",
      "camera.fov = 100;                // 광각\ncamera.position.z += 3;          // 바짝 다가감\ncamera.updateProjectionMatrix();",
      "camera.near = 0.5;   // 이보다 가까우면 잘림\ncamera.far  = 12;    // 이보다 멀면 안 그림\ncamera.updateProjectionMatrix();\n// near 를 너무 작게 잡으면 깊이 정밀도가 떨어져\n// 면이 깜박이는 z-fighting 이 생깁니다",
      "const camera = new THREE.OrthographicCamera(\n  -w / 2, w / 2,   // left, right\n  h / 2, -h / 2,   // top, bottom\n  0.1, 100         // near, far\n);  // 거리로 나누지 않음 → 원근 없음",
    ];
    const HL = [[[1, 1], [5, 5]], [[0, 1]], [[0, 1]], [[0, 1]], [[0, 4]]];
    let anim = null;
    const startAnim = (k, to, ms = 1400) => { const from = k === "fov" ? fov : far; anim = from === to ? null : { k, from, to, t0: -1, ms }; };
    return {
      setStep(s) {
        step = s; near = 0.5;
        if (s === 0 || s === 4) { fov = 50; far = 30; anim = null; }
        if (s === 1) { far = 30; startAnim("fov", 18); }
        if (s === 2) { far = 30; startAnim("fov", 100); }
        if (s === 3) { fov = 50; far = 30; startAnim("far", 12, 1100); }
        sF.set(Math.round(fov)); sN.set(near); sR.set(far);
        api.code(CODE[s], HL[s], "three.js");
      },
      frame(time) {
        if (anim) {
          if (anim.t0 < 0) anim.t0 = time;
          const t = M.clamp((time - anim.t0 - 300) / anim.ms, 0, 1), v = M.lerp(anim.from, anim.to, M.ease.inOut(t));
          if (anim.k === "fov") { fov = v; sF.set(Math.round(fov)); } else { far = v; sR.set(Math.round(far * 2) / 2); }
          if (t >= 1) anim = null;
        }
        const { x, w, h } = M.fit(cv), c = M.col();
        const TONE = [c.b, c.a, c.c];
        const boxZ = [3, 7, 14], boxX = [-1.1, 0.3, 1.7];
        const D0 = 4.5, D = keep ? D0 * Math.tan((50 * Math.PI) / 360) / Math.tan((fov * Math.PI) / 360) : D0;
        const camZ = boxZ[0] - D;
        const ortho = step === 4;
        const wide = w / h >= 1.9;
        const g = 16;
        const dw = wide ? Math.round((w - g) * 0.47) : w, dh = wide ? h : Math.round((h - g) * 0.42);
        const ix = wide ? dw + g : 0, iy = wide ? 0 : dh + g, iw = w - ix, ih = h - iy;

        /* ---- 옆에서 본 모습 ---- */
        x.save(); x.translate(0, 0);
        rwKit.part(x, 0, 0, dw - 2, dh - 3, { fill: null, r: 12 });
        M.rrect(x, 0, 0, dw - 2, dh - 3, 12); x.clip();
        M.tag(x, "옆에서 본 모습", 12, 20, { size: 11.5 });
        const zMin = Math.min(camZ, -1) - 1.2, zMax = 17;
        const sc = Math.min((dw - 30) / (zMax - zMin), (dh - 76) / 3.4), PZ = (z) => 14 + (z - zMin) * sc, PY = (y) => Math.min(dh - 40, dh * 0.5 + 24 + sc) - y * sc;
        M.line(x, 0, PY(0), dw, PY(0), M.alpha(c.ink, 0.35), 1);
        const cx0 = PZ(camZ), cy0 = PY(1);
        const half = (fov * Math.PI) / 360;
        if (!ortho) {
          const fz = camZ + far, nz = camZ + near;
          const hy = (z) => Math.tan(half) * (z - camZ);
          x.beginPath(); x.moveTo(PZ(nz), PY(1 + hy(nz))); x.lineTo(PZ(fz), PY(1 + hy(fz))); x.lineTo(PZ(fz), PY(1 - hy(fz))); x.lineTo(PZ(nz), PY(1 - hy(nz))); x.closePath();
          x.fillStyle = M.alpha(c.key, 0.16); x.fill();
          M.line(x, cx0, cy0, PZ(fz), PY(1 + hy(fz)), M.alpha(c.key, 0.9), 1.25); M.line(x, cx0, cy0, PZ(fz), PY(1 - hy(fz)), M.alpha(c.key, 0.9), 1.25);
          M.line(x, PZ(nz), PY(1 + hy(nz)), PZ(nz), PY(1 - hy(nz)), c.key, step === 3 ? 2.5 : 1.5);
          M.line(x, PZ(fz), PY(1 + hy(fz)), PZ(fz), PY(1 - hy(fz)), c.key, step === 3 ? 2.5 : 1.5);
          // fov 호
          const ar = Math.min(34, sc * 1.2);
          x.save(); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.beginPath(); x.arc(cx0, cy0, ar, -half, half); x.stroke(); x.restore();
          if (step !== 3) M.tag(x, `fov ${Math.round(fov)}°`, cx0 + ar + 6, Math.max(54, cy0 - Math.tan(half) * ar - 14), { size: 11, mono: true });
          if (step === 3 || near > 1) rwKit.call(x, dw, `near ${near.toFixed(1)}`, PZ(nz), cy0, Math.max(14, PZ(nz) - 4), Math.max(54, cy0 - 34), { size: 11, mono: true });
          if (PZ(fz) < dw - 10) M.tag(x, `far ${far.toFixed(1)}`, PZ(fz) - 4, Math.max(54, PY(0) - 2.6 * sc), { size: 11, mono: true, align: "right" });
        } else {
          x.fillStyle = M.alpha(c.key, 0.16); x.fillRect(cx0, PY(2.6), dw, PY(-0.6) - PY(2.6));
          M.line(x, cx0, PY(2.6), dw, PY(2.6), c.key, 1.25); M.line(x, cx0, PY(-0.6), dw, PY(-0.6), c.key, 1.25);
          M.tag(x, "평행한 시선", cx0 + 40, PY(2.6) - 14, { size: 11 });
        }
        boxZ.forEach((z, i) => {
          const vis = ortho || (z - camZ > near && z - camZ < far);
          const bx = PZ(z - 0.5), by = PY(2), bw = sc, bh = 2 * sc;
          if (vis) rwKit.part(x, bx, by, bw, bh, { fill: M.alpha(TONE[i], 0.45), r: 3, shadow: false });
          else rwKit.ghost(x, bx, by, bw, bh, c.muted, 3, 1.25);
          if (step === 0 && vis) M.line(x, bx + bw / 2, by, cx0, cy0, TONE[i], 1.5, [5, 4]);
          if (step === 0 || step === 3) M.text(x, `d ${(z - camZ).toFixed(1)}`, bx + bw / 2, PY(0) + 16, { size: 11, mono: true, align: "center", color: vis ? c.ink : c.muted });
          if (step === 3 && !vis) M.tag(x, "far 밖 → 안 그림", bx + bw / 2, by - 14, { size: 11, align: "center", color: c.b });
        });
        // 카메라 아이콘
        x.save(); x.translate(cx0, cy0);
        M.rrect(x, -20, -9, 16, 18, 3); x.fillStyle = c.surface; x.fill(); x.lineWidth = 1.25; x.strokeStyle = c.ink; x.stroke();
        x.beginPath(); x.moveTo(-4, -5); x.lineTo(2, -8); x.lineTo(2, 8); x.lineTo(-4, 5); x.closePath(); x.fillStyle = c.ink; x.fill();
        x.restore();
        M.text(x, "카메라", Math.max(24, cx0 - 12), cy0 + 26, { size: 11.5, align: "center", color: c.ink, weight: 600 });
        x.restore();

        /* ---- 카메라 화면 ---- */
        x.save(); x.translate(ix, iy);
        rwKit.part(x, 0, 0, iw - 2, ih - 3, { fill: c.sunk, r: 12 });
        M.rrect(x, 0, 0, iw - 2, ih - 3, 12); x.clip();
        const vh = ih - 3;
        const cam = { pos: [0, 1, camZ], yaw: 0, pitch: 0, fov, ortho: ortho ? vh / 7 : 0 };
        if (!ortho) M.drawGround(x, cam, iw, vh, M.alpha(c.ink, 0.12), 30, 1);
        const boxes = boxZ.map((z, i) => ({ c: [boxX[i], 1, z], s: [1, 2, 1], color: rwKit.mix(c.surface, TONE[i], 0.55) }));
        const px = [];
        boxes.forEach((b, i) => {
          const top = M.cam.project(cam, M.cam.toView(cam, [b.c[0], 2, b.c[2] - 0.5]), iw, vh);
          const bot = M.cam.project(cam, M.cam.toView(cam, [b.c[0], 0, b.c[2] - 0.5]), iw, vh);
          const vis = ortho || (boxZ[i] - camZ > near && boxZ[i] - camZ < far);
          px.push({ top, bot, vis, hpx: Math.abs(bot[1] - top[1]) });
        });
        if (ortho) {
          boxes.forEach((b) => { const v = M.cam.toView(cam, b.c), p = M.cam.project(cam, v, iw, vh); const s = cam.ortho; rwKit.part(x, p[0] - s / 2, p[1] - s, s, 2 * s, { fill: b.color, r: 2, shadow: false }); });
        } else M.drawScene(x, cam, boxes, iw, vh, { near, far });
        // 화면 속 높이
        const placed = [];
        px.forEach((q, i) => {
          if (!q.vis) return;
          const hpx = ortho ? cam.ortho * 2 : q.hpx;
          const tx = ortho ? M.cam.project(cam, M.cam.toView(cam, boxes[i].c), iw, vh)[0] : q.top[0];
          const ty = ortho ? M.cam.project(cam, M.cam.toView(cam, boxes[i].c), iw, vh)[1] - cam.ortho : q.top[1];
          if (tx < 10 || tx > iw - 10 || ty < 40) return;
          if (step === 0 || step === 4 || i !== 1) {
            let yy = ty - 14;
            for (const r of placed) if (Math.abs(r[0] - tx) < 48 && Math.abs(r[1] - yy) < 24) yy = r[1] - 26;
            if (yy < 40) return;
            placed.push([tx, yy]);
            M.tag(x, `${Math.round(hpx)}px`, tx, yy, { size: 11, mono: true, align: "center", fill: rwKit.mix(c.surface, TONE[i], 0.25) });
          }
        });
        M.tag(x, "카메라 화면", 12, 20, { size: 11.5 });
        if ((step === 1 || step === 2) && px[0].vis && px[2].vis) {
          const r = px[0].hpx / Math.max(1, px[2].hpx);
          M.tag(x, `앞 ÷ 뒤 = ${r.toFixed(1)}배`, iw - 12, 20, { size: 12, mono: true, align: "right", fill: M.alpha(c.key, 0.3) });
        }
        const sig = ortho ? "OrthographicCamera" : `PerspectiveCamera(${fov.toFixed(0)}, aspect, ${near.toFixed(1)}, ${far.toFixed(1)})`;
        const fz = rwKit.fitText(x, sig, iw - 40, 11.5, "mono", 600);
        M.tag(x, sig, 12, vh - 18, { size: fz, mono: true });
        x.restore();
      },
    };
  },
});

/* ===== 7-5 GPU와 셰이더 ===== */
LESSONS.push({
  id: "shaders", ch: 7, order: 5,
  title: "GPU는 왜 빠른가: 셰이더",
  lede: "셰이더는 '이 픽셀은 무슨 색인가'에 답하는 작은 함수입니다. GPU는 이 함수를 수십만 픽셀에 동시에 돌립니다. 레슨을 마치면 프래그먼트 셰이더 몇 줄을 읽고 화면에 무엇이 그려질지 예상할 수 있고, three.js 머티리얼과 WebGPU가 왜 이 구조 위에 있는지 알게 됩니다.",
  steps: [
    ["CPU: 하나씩 차례로", "CPU는 강한 코어 몇 개로 일을 <b>차례대로</b> 처리합니다. 왼쪽 코어 하나가 오른쪽 격자를 한 칸씩 칠해 나가는 모습을 보세요. 노란 테두리가 지금 계산 중인 픽셀입니다. 실제 화면은 픽셀이 200만 개가 넘으니, 이렇게 하면 한 장 칠하는 데 한참 걸립니다."],
    ["GPU: 전부 동시에", "GPU는 단순한 코어 수천 개가 <b>같은 함수를 동시에</b> 돌립니다. 격자 전체가 한꺼번에 켜지죠. 해상도 슬라이더를 올려 픽셀 수를 늘려도 기다림이 늘지 않습니다. 이 '같은 일을 많이, 동시에'가 GPU의 전부입니다."],
    ["좌표가 곧 색", "픽셀 하나가 받는 입력은 자기 위치 <code>uv</code>(0~1)뿐입니다. 빨강 = u, 초록 = v로 두면 왼쪽 아래는 어둡고 오른쪽 위는 노란 그라데이션이 됩니다. <b>격자 위에 마우스를 올리면</b> 그 픽셀의 입력과 출력이 태그로 보입니다. 모든 셰이더 연습의 첫 줄입니다."],
    ["거리로 원 그리기", "중심까지의 거리 <code>length(p)</code>가 반지름 0.3보다 작으면 흰색, 크면 검정입니다. 픽셀은 '원'이 뭔지 모릅니다. 각자 자기 거리만 계산할 뿐인데 원이 생깁니다. 경계에서 회색이 되는 건 <code>smoothstep</code>으로 가장자리를 부드럽게 했기 때문(안티에일리어싱)입니다."],
    ["시간 넣기", "모든 픽셀에 똑같이 전달되는 값 <code>uniform float time</code>을 넣으면 그림이 움직입니다. 왼쪽 패널의 time 값이 모든 코어에 동시에 들어갑니다. 물결, 노이즈 배경, 히어로 섹션의 움직이는 그라데이션이 이렇게 만들어집니다."],
    ["정점과 프래그먼트", "3D는 두 단계입니다. <b>정점 셰이더</b>가 꼭짓점 3개의 화면 위치를 정하면, 래스터라이저가 삼각형이 덮는 픽셀을 골라, <b>프래그먼트 셰이더</b>가 그 픽셀들을 칠합니다. 꼭짓점 색 세 개가 픽셀마다 거리에 따라 섞여(보간) 들어옵니다. 계산 횟수를 왼쪽 패널에서 비교해 보세요."],
  ],
  terms: [
    ["셰이더", "Shader", "GPU에서 도는 작은 프로그램. WebGL에선 GLSL, WebGPU에선 WGSL로 씁니다."],
    ["프래그먼트", "Fragment", "칠해질 후보 픽셀. 프래그먼트 셰이더가 픽셀마다 한 번씩 돌아 색을 정합니다."],
    ["정점", "Vertex", "삼각형의 꼭짓점. 정점 셰이더가 꼭짓점마다 한 번씩 돌아 화면 위치를 정합니다."],
    ["유니폼", "Uniform", "한 번 그리는 동안 모든 픽셀에 똑같이 전달되는 값. 시간, 마우스 위치, 해상도처럼 전체에 공통인 값에 씁니다."],
    ["래스터화", "Rasterization", "삼각형을 픽셀 격자로 바꾸는 과정. 어떤 픽셀이 삼각형 안에 드는지 고르는 일입니다."],
    ["WebGL · WebGPU", "", "브라우저에서 GPU를 쓰는 API. WebGPU가 더 새롭고, 그리기 외에 범용 계산(컴퓨트 셰이더)도 합니다."],
  ],
  mount(api) {
    const cv = api.canvas("fill");
    let step = 0, res = 40, hover = null;
    M.slider(api.controls, { id: "shres", label: "해상도 (가로 픽셀)", min: 16, max: 96, step: 4, value: 40, onInput: (v) => { res = v; api.restart(); } });
    const ro = M.readout(api.controls);
    const GLSL = [
      "// CPU 방식 (자바스크립트): 픽셀을 하나씩 차례로\nfor (let y = 0; y < height; y++)\n  for (let x = 0; x < width; x++)\n    pixels[y][x] = shade(x / width, y / height);",
      "// GPU 방식: 함수만 넘기면 모든 픽셀에서 동시에 실행\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / resolution;\n  gl_FragColor = shade(uv);\n}",
      "uniform vec2 resolution;\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / resolution;  // 0~1\n  gl_FragColor = vec4(uv.x, uv.y, 0.6, 1.0);\n}",
      "void main() {\n  // 가운데가 0, 세로 길이가 1 이 되게 (원이 찌그러지지 않게)\n  vec2 p = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;\n  float d = length(p);\n  float inside = 1.0 - smoothstep(0.29, 0.31, d);\n  gl_FragColor = vec4(vec3(inside), 1.0);\n}",
      "uniform float time;   // 모든 픽셀에 같은 값\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / resolution;\n  vec2 p = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;\n  float wave = sin(length(p) * 28.0 - time * 3.0) * 0.5 + 0.5;\n  gl_FragColor = vec4(wave, uv.y, 1.0 - wave, 1.0);\n}",
      "// 정점 셰이더: 꼭짓점마다 한 번\nattribute vec3 position; attribute vec3 color;\nvarying vec3 vColor;\nvoid main() { vColor = color; gl_Position = mvp * vec4(position, 1.0); }\n\n// 프래그먼트 셰이더: 픽셀마다 한 번\nvarying vec3 vColor;   // 세 꼭짓점 색이 보간되어 들어옴\nvoid main() { gl_FragColor = vec4(vColor, 1.0); }",
    ];
    const HL = [[[1, 3]], [[1, 4]], [[3, 3]], [[2, 4]], [[0, 0], [4, 4]], [[1, 3], [6, 7]]];
    const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left - (cv._inset || 0), e.clientY - r.top - (cv._inset || 0)]; };
    const onMove = (e) => (hover = local(e));
    const onLeave = () => (hover = null);
    cv.addEventListener("pointermove", onMove); cv.addEventListener("pointerdown", onMove); cv.addEventListener("pointerleave", onLeave);
    const shade = (u, v, t, asp) => {
      const pxv = (u - 0.5) * asp, pyv = v - 0.5, d = Math.hypot(pxv, pyv);
      switch (step) {
        case 0: case 1: case 2: return [u, v, 0.6];
        case 3: { const k = 1 - M.clamp((d - 0.29) / 0.02, 0, 1); return [k, k, k]; }
        default: { const wv = Math.sin(d * 28 - t * 3) * 0.5 + 0.5; return [wv, v, 1 - wv]; }
      }
    };
    const f2 = (q) => q.toFixed(2);
    return {
      setStep(s) { step = s; api.code(GLSL[s], HL[s], s === 0 ? "JavaScript" : "GLSL"); },
      frame(time) {
        const { x, w, h } = M.fit(cv), c = M.col();
        const wide = w / h >= 1.25;
        const g = 16;
        const pw = wide ? Math.min(250, Math.round(w * 0.3)) : w, ph = wide ? h : Math.min(118, Math.round(h * 0.3));
        const gx0 = wide ? pw + g : 0, gy0 = wide ? 0 : ph + g, gW = w - gx0, gH = h - gy0;
        const cols = res, rows = Math.round(res * 9 / 16);
        const top = 34, bot = 8;
        const cell = Math.min(gW / cols, (gH - top - bot) / rows);
        const gw = cell * cols, gh = cell * rows, ox = gx0 + (gW - gw) / 2, oy = gy0 + top + (gH - top - bot - gh) / 2;
        const total = cols * rows, asp = cols / rows;
        const per = step === 0 ? 0.35 : Infinity;
        const cyc = total / 0.35 + 1200;
        const done = step === 0 ? Math.min(total, Math.floor((time % cyc) * per)) : total;
        const t = time / 1000;
        const gp = cell > 6 ? 1 : 0;
        // 정점 셰이더 결과: 회전하는 삼각형
        let tri = null, TV = null;
        if (step === 5) {
          const a = t * 0.5;
          const R = (pxv, pyv) => { const dx = (pxv - 0.5) * asp, dy = pyv - 0.5; return [0.5 + (dx * Math.cos(a) - dy * Math.sin(a)) / asp, 0.5 + dx * Math.sin(a) + dy * Math.cos(a)]; };
          tri = [R(0.5, 0.14), R(0.24, 0.8), R(0.76, 0.8)];
          TV = [c.b, c.c, c.a].map((q) => rwKit.rgb(q).map((v) => v / 255));
        }
        // GPU 단계 1: 한꺼번에 켜짐
        const lit = step === 1 ? M.clamp(((time % 2200) - 300) / 250, 0, 1) : 1;
        let inside = 0;
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const px = ox + i * cell, py = oy + j * cell;
          if (k >= done || lit === 0) { x.fillStyle = c.sunk; x.fillRect(px, py, cell - gp, cell - gp); continue; }
          const u = (i + 0.5) / cols, v = 1 - (j + 0.5) / rows;
          let rgb;
          if (tri) {
            const P = [u, 1 - v], [A, Bv, Cc] = tri;
            const den = (Bv[1] - Cc[1]) * (A[0] - Cc[0]) + (Cc[0] - Bv[0]) * (A[1] - Cc[1]);
            const l1 = ((Bv[1] - Cc[1]) * (P[0] - Cc[0]) + (Cc[0] - Bv[0]) * (P[1] - Cc[1])) / den;
            const l2 = ((Cc[1] - A[1]) * (P[0] - Cc[0]) + (A[0] - Cc[0]) * (P[1] - Cc[1])) / den;
            const l3 = 1 - l1 - l2;
            if (l1 < 0 || l2 < 0 || l3 < 0) { x.fillStyle = c.sunk; x.fillRect(px, py, cell - gp, cell - gp); continue; }
            inside++;
            rgb = [0, 1, 2].map((q) => l1 * TV[0][q] + l2 * TV[1][q] + l3 * TV[2][q]);
          } else rgb = shade(u, v, t, asp);
          x.save(); if (lit < 1) x.globalAlpha = lit;
          x.fillStyle = `rgb(${rgb.map((q) => Math.round(M.clamp(q, 0, 1) * 255)).join(",")})`;
          x.fillRect(px, py, cell - gp, cell - gp);
          x.restore();
        }
        x.lineWidth = 1.25; x.strokeStyle = c.ink; x.strokeRect(ox - 0.5, oy - 0.5, gw + 1, gh + 1);
        const capG = step === 0 ? `처리 ${done} / ${total} 픽셀` : step === 5 ? `${total} 픽셀 중 ${inside}개가 삼각형 안` : `${total} 픽셀을 한 번에`;
        M.tag(x, capG, ox, gy0 + 15, { size: 11.5, mono: true });
        // 삼각형 꼭짓점
        if (tri) {
          x.strokeStyle = c.ink; x.lineWidth = 1.5; x.beginPath();
          tri.forEach(([a, b], i) => { const X = ox + a * gw, Y = oy + b * gh; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); x.stroke();
          tri.forEach(([a, b], i) => { M.dot(x, ox + a * gw, oy + b * gh, 6, [c.b, c.c, c.a][i], c.ink); });
          const [a0, b0] = tri[0];
          rwKit.call(x, w, "정점 1 · 위치와 색", ox + a0 * gw, oy + b0 * gh, ox + a0 * gw + 22, Math.max(gy0 + 40, oy + b0 * gh - 10), { size: 11 });
        }
        // CPU 커서
        if (step === 0 && done < total) {
          const i = done % cols, j = Math.floor(done / cols);
          x.strokeStyle = c.key; x.lineWidth = 2.5; x.strokeRect(ox + i * cell - 1, oy + j * cell - 1, cell + 1, cell + 1);
        }
        // 탐침: 픽셀 하나의 입력과 출력
        if (step >= 2 && step <= 4) {
          let pi, pj;
          if (hover && hover[0] >= ox && hover[0] < ox + gw && hover[1] >= oy && hover[1] < oy + gh) { pi = Math.floor((hover[0] - ox) / cell); pj = Math.floor((hover[1] - oy) / cell); }
          else { pi = Math.floor((0.5 + 0.36 * Math.sin(t * 0.7)) * cols); pj = Math.floor((0.5 + 0.36 * Math.cos(t * 0.53)) * rows); }
          pi = M.clamp(pi, 0, cols - 1); pj = M.clamp(pj, 0, rows - 1);
          const u = (pi + 0.5) / cols, v = 1 - (pj + 0.5) / rows, rgb = shade(u, v, t, asp);
          const cx = ox + pi * cell, cy = oy + pj * cell;
          x.strokeStyle = c.surface; x.lineWidth = 3; x.strokeRect(cx - 1, cy - 1, cell + 1, cell + 1);
          x.strokeStyle = c.ink; x.lineWidth = 1.5; x.strokeRect(cx - 1, cy - 1, cell + 1, cell + 1);
          const d = Math.hypot((u - 0.5) * asp, v - 0.5);
          const lab = step === 2 ? `uv (${f2(u)}, ${f2(v)}) → rgb(${f2(rgb[0])}, ${f2(rgb[1])}, 0.60)`
            : step === 3 ? `d = ${f2(d)} ${d < 0.3 ? "< 0.3 → 흰색" : "> 0.3 → 검정"}`
            : `d ${f2(d)}, time ${t.toFixed(2)} → wave ${f2(rgb[0])}`;
          const above = cy - oy > gh / 2;
          rwKit.call(x, w, lab, cx + cell / 2, above ? cy : cy + cell, cx + cell / 2 + 16, above ? cy - 22 : cy + cell + 22, { size: 11, mono: true });
        }

        /* ---- 프로세서 패널 ---- */
        rwKit.part(x, 0, 0, pw - 2, ph - 3, { fill: null, r: 12 });
        const title = step === 0 ? "CPU · 강한 코어 4개" : step === 5 ? "GPU · 두 셰이더" : "GPU · 작은 코어 수천 개";
        M.tag(x, title, 12, 18, { size: 11.5 });
        const ax = 14, ay = 38, aw = pw - 30, ah = ph - ay - 14;
        if (step === 0) {
          const n = wide ? 2 : 4, s = wide ? Math.min((aw - 10) / 2, (ah - 26) / 2, 70) : Math.min((aw * 0.62 - 30) / 4, ah - 4, 56);
          const bx0 = ax + (wide ? (aw - (2 * s + 10)) / 2 : 0);
          for (let k = 0; k < 4; k++) {
            const bx = bx0 + (k % n) * (s + 10), by = ay + Math.floor(k / n) * (s + 10);
            rwKit.part(x, bx, by, s, s, { fill: k === 0 ? M.alpha(c.key, 0.45) : null, r: 8, dim: k !== 0 });
            M.text(x, k === 0 ? "작업" : "대기", bx + s / 2, by + s / 2 + 4, { size: 11, align: "center", color: k === 0 ? c.ink : c.muted, weight: 600 });
          }
          if (wide) M.text(x, "한 번에 픽셀 1개", ax + aw / 2, ay + 2 * s + 30, { size: 11.5, align: "center", color: c.ink, weight: 600 });
          else M.text(x, "한 번에 픽셀 1개", ax + aw, ay + s / 2 + 4, { size: 11.5, align: "right", color: c.ink, weight: 600 });
        } else if (step === 5) {
          const rowsP = [["정점 셰이더", "정점", "× 3번", c.b], ["래스터화", "래스터화", "삼각형 → 픽셀", c.muted], ["프래그먼트 셰이더", "프래그먼트", `× ${inside}번`, c.c]];
          if (wide) {
            const bh = Math.min(40, (ah - 24) / 3), gap = (ah - bh * 3) / 2;
            rowsP.forEach(([a, , b, col], k) => {
              const by = ay + k * (bh + gap);
              rwKit.part(x, ax, by, aw, bh, { fill: M.alpha(col, 0.25), r: 8 });
              M.text(x, a, ax + 10, by + bh / 2 + 4, { size: 12, weight: 700, color: c.ink });
              M.text(x, b, ax + aw - 10, by + bh / 2 + 4, { size: 11, mono: true, color: c.ink, align: "right" });
              if (k < 2) M.arrow(x, ax + aw / 2, by + bh + 2, ax + aw / 2, by + bh + gap - 2, M.alpha(c.ink, 0.6), 1.25);
            });
          } else {
            const gap = 16, bw = (aw - gap * 2) / 3, bh = Math.min(ah, 50);
            rowsP.forEach(([, a, b, col], k) => {
              const bx = ax + k * (bw + gap);
              rwKit.part(x, bx, ay, bw, bh, { fill: M.alpha(col, 0.25), r: 8 });
              M.text(x, a, bx + bw / 2, ay + bh / 2 - 2, { size: 12, weight: 700, color: c.ink, align: "center" });
              M.text(x, b, bx + bw / 2, ay + bh / 2 + 14, { size: 11, mono: true, color: c.ink, align: "center" });
              if (k < 2) M.arrow(x, bx + bw + 2, ay + bh / 2, bx + bw + gap - 2, ay + bh / 2, M.alpha(c.ink, 0.6), 1.25);
            });
          }
        } else {
          const n = wide ? 10 : 24, s0 = aw / n, availH = ah - (step === 4 ? 30 : 4);
          const m = Math.max(2, Math.floor(availH / s0)), s = Math.min(s0, availH / m);
          const gx = ax + (aw - s * n) / 2, gyy = ay + (step === 4 ? 30 : 0);
          for (let k = 0; k < n * m; k++) {
            const on = step === 1 ? lit : 1;
            M.rrect(x, gx + (k % n) * s + 1, gyy + Math.floor(k / n) * s + 1, s - 2, s - 2, 2);
            x.fillStyle = M.alpha(c.c, 0.1 + 0.3 * on); x.fill(); x.lineWidth = 0.75; x.strokeStyle = M.alpha(c.ink, 0.45); x.stroke();
          }
          if (step === 4) M.tag(x, `uniform time = ${t.toFixed(2)}`, ax + aw / 2, ay + 10, { size: 11, mono: true, align: "center", fill: M.alpha(c.key, 0.35) });
        }
        ro.innerHTML = `격자 ${cols} × ${rows} = <b>${total}</b> 픽셀\n실제 1920 × 1080 화면 = <b>2,073,600</b> 픽셀, 초당 60번`;
      },
      destroy() { cv.removeEventListener("pointermove", onMove); },
    };
  },
});
