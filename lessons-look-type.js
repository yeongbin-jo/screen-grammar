/* 1장 보는 법(grid, spacing, states) · 2장 글자(type-classification, type-scale, measure, kerning-tracking) */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  /* 넓은 화면에서 무대 높이가 뷰포트에 묶여 있는가 */
  const fixedStage = () => matchMedia("(min-width: 1241px) and (min-height: 640px)").matches;
  /* 무대를 채우는 캔버스. 무대 높이가 자유로운 좁은 화면에서는 최소 높이를 따로 준다 */
  const fillCanvas = (api, narrowMin = 420) => {
    const cv = api.canvas("fill");
    if (!fixedStage()) cv.style.minHeight = narrowMin + "px";
    return cv;
  };
  const ease = (cur, tgt, dt, ms = 360) => {
    const k = 1 - Math.pow(0.001, (dt || 16) / ms);
    for (const p in tgt) if (typeof tgt[p] === "number") cur[p] = M.lerp(cur[p] ?? tgt[p], tgt[p], k);
  };
  /* 일러스트 부품: 옅은 틴트 + 1.25px 잉크 외곽선 (+ 오프셋 그림자) */
  const part = (x, px, py, w, h, r, tint, o = {}) => {
    const c = M.col();
    if (o.shadow) { M.rrect(x, px + 2, py + 3, w, h, r); x.fillStyle = M.alpha(c.ink, 0.85); x.fill(); }
    M.rrect(x, px, py, w, h, r); x.fillStyle = c.surface; x.fill();
    if (tint) { x.fillStyle = M.alpha(tint, o.ta ?? 0.2); x.fill(); }
    x.lineWidth = o.lw || 1.25; x.strokeStyle = o.stroke || M.alpha(c.ink, 0.85); x.stroke();
  };
  const tagW = (x, s, o = {}) => { x.font = M.font(o.size || 11.5, o.mono ? "mono" : "ui", o.weight || 600); return x.measureText(s).width + 2 * (o.padX ?? 8); };
  /* 가운데 정렬 태그를 [lo, hi] 안으로 밀어 넣어 잘리지 않게 */
  const tagIn = (x, s, cx, cy, lo, hi, o = {}) => { const tw = tagW(x, s, o); return M.tag(x, s, M.clamp(cx - tw / 2, lo, Math.max(lo, hi - tw)), cy, o); };

  /* DOM 무대용 지시선 주석: host(position:relative) 안에 SVG 선 + 알약 태그 */
  const domNotes = (host, o = {}) => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "lt-ov"); svg.setAttribute("aria-hidden", "true");
    host.append(svg);
    const pool = [];
    const get = (i) => {
      if (!pool[i]) {
        const p = document.createElementNS(NS, "path"), d = document.createElementNS(NS, "circle");
        d.setAttribute("r", "3");
        svg.append(p, d);
        const t = M.el("span", { class: "lt-tag" + (o.anim === false ? " no-tr" : "") });
        host.append(t);
        pool[i] = { p, d, t };
      }
      return pool[i];
    };
    /* list: [{el|rect, text, side, dx, dy, tone}] · z: 조상 zoom 배율 */
    return {
      set(list, z = 1) {
        const hr = host.getBoundingClientRect();
        const W = host.clientWidth, H = host.clientHeight;
        list.forEach((n, i) => {
          const P = get(i);
          const R = n.rect || n.el.getBoundingClientRect();
          const r = n.rect ? R : { left: (R.left - hr.left) / z, top: (R.top - hr.top) / z, width: R.width / z, height: R.height / z };
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2, side = n.side || "bottom";
          const ax = side === "left" ? r.left : side === "right" ? r.left + r.width : cx + (n.ax || 0);
          const ay = side === "top" ? r.top : side === "bottom" ? r.top + r.height : cy;
          const off = n.off ?? 24;
          let tx = ax + (n.dx || 0) + (side === "left" ? -off : side === "right" ? off : 0);
          let ty = ay + (n.dy || 0) + (side === "top" ? -off : side === "bottom" ? off : 0);
          if (P.t.textContent !== n.text) P.t.textContent = n.text;
          P.t.className = "lt-tag" + (o.anim === false ? " no-tr" : "") + (n.tone ? " t-" + n.tone : "");
          const tw = P.t.offsetWidth, th = P.t.offsetHeight;
          let left = side === "left" ? tx - tw : side === "right" ? tx : tx - tw / 2;
          left = M.clamp(left, 2, Math.max(2, W - tw - 2));
          const top = M.clamp(ty - th / 2, 2, Math.max(2, H - th - 2));
          P.t.style.left = left + "px"; P.t.style.top = top + "px"; P.t.style.opacity = "1";
          const ex = M.clamp(ax, left, left + tw), ey = M.clamp(ay, top, top + th);
          P.p.setAttribute("d", `M${ax},${ay} L${ex},${ey}`);
          P.d.setAttribute("cx", ax); P.d.setAttribute("cy", ay);
          P.p.style.opacity = P.d.style.opacity = "1";
        });
        pool.slice(list.length).forEach((P) => { P.t.style.opacity = "0"; P.p.style.opacity = P.d.style.opacity = "0"; });
      },
      svg,
    };
  };

  const FS = {
    serif: '"Times New Roman", Times, "AppleMyungjo", "Nanum Myeongjo", serif',
    old: '"Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif',
    sans: '"Helvetica Neue", Helvetica, Arial, "Apple SD Gothic Neo", sans-serif',
    slab: 'Rockwell, "Roboto Slab", "Courier New", serif',
    mono: 'Menlo, "SF Mono", Consolas, "Courier New", monospace',
    display: 'Didot, "Bodoni 72", "Bodoni MT", "Times New Roman", serif',
    geo: 'Futura, "Century Gothic", Avenir, "Trebuchet MS", sans-serif',
    human: '"Gill Sans", "Gill Sans MT", "Segoe UI", Optima, Candara, sans-serif',
    myeong: '"AppleMyungjo", "Nanum Myeongjo", "Noto Serif KR", "Batang", serif',
    gothic: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
  };
  const tf = (px, fam, wt = 400) => `${wt} ${px}px ${fam}`;
  const T = (x, s, px, py, size, fam, color, o = {}) => {
    x.font = tf(size, fam, o.weight || 400); x.fillStyle = color;
    x.textAlign = o.align || "left"; x.textBaseline = o.base || "alphabetic"; x.fillText(s, px, py);
  };

  /* ===================== 1-3 정렬과 그리드 ===================== */
  LESSONS.push({
    id: "grid", ch: 0, order: 3,
    title: "정렬과 그리드",
    lede: "이 레슨을 마치면 화면 밑에 깔린 보이지 않는 선, 즉 그리드를 읽을 수 있습니다. 칼럼·거터·마진이 무엇인지, 왜 12칼럼이 표준이 됐는지, 언제 그리드를 깨도 되는지 봅니다.",
    key: "모든 요소의 가장자리는 칼럼 선에 맞추고, 그리드를 깨는 일은 강조할 단 하나에만 허락합니다.",
    steps: [
      ["정렬되지 않은 화면", "요소의 가장자리가 제각각이면 하나하나는 멀쩡해도 화면 전체가 어수선해 보입니다. 빨간 점선은 요소 가장자리마다 그은 세로선이고, 오른쪽 아래 태그가 그 개수입니다. '어긋남' 태그처럼 몇 픽셀 차이가 쌓이면 눈이 따라갈 공통된 선이 사라집니다."],
      ["정렬선", "가장자리를 몇 개의 공통된 세로선에 맞추면 화면이 조용해집니다. 이 보이지 않는 선을 <b>정렬선</b>(alignment line)이라고 합니다. 오른쪽 아래 태그의 숫자가 크게 줄어든 것을 보세요. 실무에서는 새 요소를 놓을 때 '이미 있는 선 중 어디에 붙일까'부터 정합니다."],
      ["칼럼 · 거터 · 마진", "정렬선을 규칙으로 만든 것이 그리드입니다. 주황 괄호 세 개를 보세요. 내용이 놓이는 <b>칼럼</b>(column), 칼럼 사이 틈인 <b>거터</b>(gutter), 화면 가장자리 여백인 <b>마진</b>(margin)입니다. 요소의 폭은 픽셀이 아니라 '칼럼 몇 개에 걸치는가(span)'로 정합니다."],
      ["12칼럼", "12는 2, 3, 4, 6으로 나누어떨어져서 반반·3등분·4등분 배치를 한 그리드 안에서 모두 만들 수 있습니다. 블록마다 붙은 span 태그를 보면 큰 블록 8 + 옆 4, 카드 4 + 4 + 4, 글 6 + 6입니다. '직접 해보기'에서 칼럼 수를 5나 7로 바꾸면 카드 span이 2·2·1처럼 고르지 않게 깨집니다."],
      ["모듈러 그리드", "세로에도 일정한 행을 두면 화면이 같은 크기의 칸, 즉 <b>모듈</b>(module)로 나뉩니다. 파란 가로 띠가 행이고, 주황 테두리 칸이 모듈 하나입니다. 블록 높이까지 '모듈 몇 칸'으로 맞추므로 대시보드나 갤러리처럼 같은 모양이 반복되는 화면에 씁니다."],
      ["의도적 예외", "그리드를 잘 지킨 화면에서는 그리드를 깨는 요소 하나가 곧 강조점이 됩니다. 큰 블록이 왼쪽 마진을 무시하고 화면 끝까지 나간 것(<b>풀블리드</b>, full bleed)을 보세요. 나머지가 모두 점선 마진선 안에 있어야 이 예외가 실수가 아니라 의도로 읽힙니다."],
    ],
    terms: [
      ["칼럼", "Column", "그리드에서 내용이 놓이는 세로 띠. 요소 폭을 'span 4'처럼 칼럼 개수로 말할 때 씁니다."],
      ["거터", "Gutter", "칼럼과 칼럼 사이의 고정된 틈. 보통 16~32px이고, 화면이 좁아지면 함께 줄입니다."],
      ["마진", "Margin", "그리드 바깥, 화면 가장자리의 여백. 모바일 16~20px, 데스크톱 32px 이상이 흔합니다."],
      ["모듈러 그리드", "Modular grid", "칼럼과 행이 함께 있어 화면을 같은 크기의 칸으로 나누는 그리드. 대시보드·갤러리 설계에서 씁니다."],
      ["풀블리드", "Full bleed", "마진을 무시하고 화면 끝까지 채운 요소. 인쇄에서 재단선 밖까지 칠하던 데서 온 말로, 히어로 이미지에 흔히 씁니다."],
    ],
    mount(api) {
      const cv = fillCanvas(api, 440);
      const S = [
        { snap: 0, guides: 1, cols: 0, mod: 0, bleed: 0, lab: 0, sp: 0 },
        { snap: 1, guides: 1, cols: 0, mod: 0, bleed: 0, lab: 0, sp: 0 },
        { snap: 1, guides: 0, cols: 1, mod: 0, bleed: 0, lab: 1, sp: 0 },
        { snap: 1, guides: 0, cols: 1, mod: 0, bleed: 0, lab: 0, sp: 1 },
        { snap: 1, guides: 0, cols: 0.6, mod: 1, bleed: 0, lab: 0, sp: 0 },
        { snap: 1, guides: 0, cols: 0.35, mod: 0, bleed: 1, lab: 0, sp: 0 },
      ];
      const ROWS = [
        { parts: [1], h: 1, m: 1, kind: ["nav"] },
        { parts: [2 / 3, 1 / 3], h: 3.2, m: 3, kind: ["hero", "side"] },
        { parts: [1 / 3, 1 / 3, 1 / 3], h: 2.2, m: 2, kind: ["card", "card", "card"] },
        { parts: [1 / 2, 1 / 2], h: 1.6, m: 2, kind: ["text", "text"] },
      ];
      const JIT = [[5, -10], [-9, 6], [13, -16], [3, -8], [-5, 6], [8, -4], [-6, 11], [11, -14]];
      let step = 0, cols = 12, gut = 20, ovOn = false, tgt = S[0];
      const cur = { ...S[0] };
      let R = null;
      M.slider(api.controls, { id: "grid-cols", label: "칼럼 수", min: 3, max: 12, value: 12, onInput: (v) => { cols = v; code(); } });
      M.slider(api.controls, { id: "grid-gut", label: "거터", min: 0, max: 40, step: 2, value: 20, unit: "px", onInput: (v) => { gut = v; code(); } });
      M.check(api.controls, { id: "grid-ov", label: "칼럼 늘 보기", onChange: (v) => (ovOn = v) });
      api.controls.append(M.el("p", { class: "hint" }, "칼럼 수를 바꾸면 블록이 가장 가까운 칼럼 선으로 다시 붙습니다. 4단계에서 12 → 5 → 7로 바꿔 카드의 span 태그를 보세요."));
      const spans = (parts) => {
        let acc = 0; const b = [0];
        parts.forEach((p, i) => {
          acc += p;
          let e = Math.round(acc * cols);
          e = Math.max(b[i] + 1, Math.min(cols - (parts.length - 1 - i), e));
          b.push(e);
        });
        return b;
      };
      function code() {
        const hs = spans(ROWS[1].parts), cs = spans(ROWS[2].parts);
        const HL = [[], [], [[2, 4]], [[6, 7]], [[8, 8]], [[9, 9]]];
        api.code([
          ".page {",
          "  display: grid;",
          `  grid-template-columns: repeat(${cols}, 1fr); /* 칼럼 */`,
          `  column-gap: ${gut}px;                     /* 거터 */`,
          "  padding-inline: 32px;               /* 마진 */",
          "}",
          `.hero { grid-column: span ${hs[1] - hs[0]}; }`,
          `.card { grid-column: span ${cs[1] - cs[0]}; }`,
          `.page { grid-auto-rows: 64px; row-gap: ${gut}px; } /* 모듈 */`,
          ".hero.bleed { margin-left: -32px; } /* 의도적 예외 */",
        ].join("\n"), HL[step], "CSS Grid");
      }
      return {
        setStep(s) { step = s; tgt = S[s]; code(); },
        frame(time, dt) {
          ease(cur, tgt, dt, 380);
          const { x, w, h } = M.fit(cv), c = M.col();
          const fx = 4, fy = 4, fw = w - 10, fh = h - 40;
          const sc = Math.min(1, fw / 680);
          const mar = Math.max(14, Math.round(fw * 0.05)), g = gut * sc;
          const colW = (fw - 2 * mar - (cols - 1) * g) / cols;
          const colX = (i) => fx + mar + i * (colW + g);
          const padV = Math.max(12, mar * 0.7), rg = Math.max(8, g);
          const ah = fh - 2 * padV - (ROWS.length - 1) * rg;
          const modH = (fh - 2 * padV - 7 * rg) / 8;
          const Tg = []; let y = fy + padV, bi = 0;
          const rowSpans = [];
          ROWS.forEach((row) => {
            const rh = M.lerp((row.h / 8) * ah, row.m * modH + (row.m - 1) * rg, cur.mod);
            const b = spans(row.parts);
            rowSpans.push(b);
            row.parts.forEach((_, i) => {
              const sx = colX(b[i]), ex = colX(b[i + 1] - 1) + colW;
              const [dx, dw] = JIT[bi];
              let rx = M.lerp(sx + dx * sc, sx, cur.snap), rw = M.lerp(ex - sx + dw * sc, ex - sx, cur.snap);
              if (row.kind[i] === "hero") { const right = rx + rw; rx = M.lerp(rx, fx, cur.bleed); rw = right - rx; }
              Tg.push({ x: rx, y, w: rw, h: rh, kind: row.kind[i], span: b[i + 1] - b[i], row: ROWS.indexOf(row) });
              bi++;
            });
            y += rh + rg;
          });
          if (!R || R.length !== Tg.length) R = Tg.map((r) => ({ ...r }));
          const k = 1 - Math.pow(0.001, (dt || 16) / 380);
          R.forEach((r, i) => { for (const p of ["x", "y", "w", "h"]) r[p] = M.lerp(r[p], Tg[i][p], k); r.span = Tg[i].span; r.kind = Tg[i].kind; r.row = Tg[i].row; });
          // 페이지 종이
          part(x, fx, fy, fw, fh, 10, null, { shadow: true });
          x.save(); M.rrect(x, fx, fy, fw, fh, 10); x.clip();
          const ca = Math.max(cur.cols, ovOn ? 1 : 0);
          if (ca > 0.01) for (let i = 0; i < cols; i++) { x.fillStyle = M.alpha(c.b, 0.11 * ca); x.fillRect(colX(i), fy, colW, fh); }
          if (cur.mod > 0.01) for (let r = 0; r < 8; r++) { x.fillStyle = M.alpha(c.a, 0.1 * cur.mod); x.fillRect(fx, fy + padV + r * (modH + rg), fw, modH); }
          // 블록
          const COL = { nav: c.muted, hero: c.a, side: c.muted, card: c.c, text: c.muted };
          R.forEach((r) => {
            const col = COL[r.kind];
            let a = M.lerp(1, 0.32, cur.lab);
            if (r.kind !== "hero") a *= M.lerp(1, 0.4, cur.bleed);
            x.globalAlpha = a;
            part(x, r.x, r.y, r.w, r.h, 6, col, { ta: r.kind === "hero" || r.kind === "card" ? 0.2 : 0.14 });
            const p = Math.min(10, r.h * 0.2), bar = (bx, by, bw, bh, al = 0.55) => { if (bw > 2 && bh > 1) { M.rrect(x, bx, by, bw, bh, Math.min(3, bh / 2)); x.fillStyle = M.alpha(col, al); x.fill(); } };
            if (r.kind === "nav") { bar(r.x + p, r.y + r.h / 2 - 4, Math.min(60, r.w * 0.2), 8, 0.7); for (let i = 0; i < 3; i++) bar(r.x + r.w - p - (i + 1) * Math.min(46, r.w * 0.1), r.y + r.h / 2 - 3, Math.min(36, r.w * 0.08), 6, 0.45); }
            else if (r.kind === "hero") { bar(r.x + p * 1.5, r.y + r.h * 0.3, r.w * 0.6, Math.min(14, r.h * 0.12), 0.7); bar(r.x + p * 1.5, r.y + r.h * 0.3 + Math.min(22, r.h * 0.18), r.w * 0.42, Math.min(14, r.h * 0.12), 0.7); bar(r.x + p * 1.5, r.y + r.h * 0.74, r.w * 0.3, 6, 0.45); }
            else if (r.kind === "card") { bar(r.x + p, r.y + p, r.w - 2 * p, r.h * 0.42, 0.28); bar(r.x + p, r.y + r.h * 0.6, (r.w - 2 * p) * 0.7, 6, 0.6); bar(r.x + p, r.y + r.h * 0.6 + 12, (r.w - 2 * p) * 0.5, 5, 0.4); }
            else { const n = Math.max(1, Math.floor((r.h - 2 * p) / 12)); for (let i = 0; i < n; i++) bar(r.x + p, r.y + p + i * 12, (r.w - 2 * p) * (i === n - 1 ? 0.6 : 0.95), 5, 0.35); }
            x.globalAlpha = 1;
          });
          // 정렬선
          if (cur.guides > 0.01) {
            const xs = [];
            R.forEach((r) => [r.x, r.x + r.w].forEach((v) => { if (!xs.some((q) => Math.abs(q - v) < 1.5)) xs.push(v); }));
            const col = cur.snap < 0.5 ? c.b : c.key;
            x.globalAlpha = cur.guides;
            xs.forEach((v) => M.line(x, v, fy, v, fy + fh, col, 1.25, [4, 4]));
            x.globalAlpha = 1;
            M.tag(x, `세로 정렬선 ${xs.length}개`, fx + fw - 10, fy + fh - 18, { align: "right", color: col, size: 12 });
            if (cur.snap < 0.5) {
              // 큰 블록과 첫 카드의 왼쪽 끝 차이
              const a = R[1], b = R[3], d = Math.round(Math.abs(a.x - b.x));
              const yy = b.y - rg / 2;
              M.line(x, a.x, yy, b.x, yy, c.b, 2);
              M.dot(x, a.x, yy, 2.5, c.b); M.dot(x, b.x, yy, 2.5, c.b);
              M.tag(x, `${d}px 어긋남`, Math.max(a.x, b.x) + 8, yy, { color: c.b });
              const e = R[2], f = R[5], d2 = Math.round(Math.abs(e.x + e.w - (f.x + f.w)));
              const y2 = f.y - rg / 2;
              M.line(x, e.x + e.w, y2, f.x + f.w, y2, c.b, 2);
              M.tag(x, `${d2}px 어긋남`, Math.min(e.x + e.w, f.x + f.w) - 8, y2, { color: c.b, align: "right" });
            }
          }
          // 칼럼 · 거터 · 마진 괄호
          if (cur.lab > 0.01) {
            x.globalAlpha = cur.lab;
            const br = (a, b, yy, label) => {
              M.line(x, a, yy - 7, a, yy + 7, c.key, 2); M.line(x, b, yy - 7, b, yy + 7, c.key, 2); M.line(x, a, yy, b, yy, c.key, 2);
              tagIn(x, label, (a + b) / 2, yy + 22, fx + 4, fx + fw - 4, { color: c.ink });
            };
            const hs = rowSpans[1];
            br(fx, fx + mar, R[1].y + 16, `마진 ${Math.round(mar)}px`);
            br(colX(0), colX(0) + colW, R[3].y + R[3].h * 0.35, `칼럼 ${Math.round(colW)}px`);
            if (cols > 1) br(colX(hs[1] - 1) + colW, colX(hs[1]), R[1].y + R[1].h * 0.45, `거터 ${gut}px`);
            x.globalAlpha = 1;
          }
          // span 태그
          if (cur.sp > 0.01) {
            x.globalAlpha = cur.sp;
            const rows = {};
            R.forEach((r) => (rows[r.row] = rows[r.row] || []).push(r.span));
            R.forEach((r) => {
              if (r.kind === "nav") return;
              const sp = rows[r.row], uneven = sp.some((v) => v !== sp[0]) && (r.kind === "card" || r.kind === "text");
              M.tag(x, `span ${r.span}`, r.x + 6, r.y + 14, { size: 11, mono: true, color: uneven ? c.b : c.ink });
            });
            x.globalAlpha = 1;
          }
          // 모듈 하나 강조
          if (cur.mod > 0.3) {
            x.globalAlpha = M.clamp((cur.mod - 0.3) / 0.7, 0, 1);
            const mi = cols - 1, mr = 4;
            const mx = colX(mi), my = fy + padV + mr * (modH + rg);
            x.strokeStyle = c.key; x.lineWidth = 2.5; M.rrect(x, mx, my, colW, modH, 3); x.stroke();
            M.callout(x, "모듈 = 1칼럼 × 1행", mx, my + modH / 2, mx - 24, my - 14, { color: c.ink });
            const hr = R[1];
            M.tag(x, "3행", hr.x + 6, hr.y + 14, { size: 11, mono: true });
            M.tag(x, "2행", R[3].x + 6, R[3].y + 14, { size: 11, mono: true });
            x.globalAlpha = 1;
          }
          // 풀블리드
          if (cur.bleed > 0.3) {
            x.globalAlpha = M.clamp((cur.bleed - 0.3) / 0.7, 0, 1);
            M.line(x, fx + mar, fy, fx + mar, fy + fh, c.key, 1.25, [5, 4]);
            M.line(x, fx + fw - mar, fy, fx + fw - mar, fy + fh, c.key, 1.25, [5, 4]);
            const r = R[1];
            M.callout(x, "풀블리드: 마진을 넘어 끝까지", fx + 3, r.y + r.h * 0.55, fx + mar + 14, r.y + r.h - 16, { color: c.a });
            M.tag(x, "마진선", fx + fw - mar - 6, fy + fh - 18, { align: "right", size: 11, color: c.key });
            x.globalAlpha = 1;
          }
          x.restore();
          const dv = [2, 3, 4, 6].filter((d) => cols % d === 0);
          M.text(x, `${cols}칼럼 · 거터 ${gut}px · 칼럼 폭 ${Math.round(colW)}px`, fx + 2, h - 12, { mono: true, size: 11.5, color: c.muted });
          if (step === 3) M.tag(x, dv.length ? `${dv.join("·")}등분 가능` : "2·3·4·6 어느 것으로도 안 나뉨", w - 8, h - 16, { align: "right", color: cols % 3 ? c.b : c.c, size: 12 });
        },
      };
    },
  });

  /* ===================== 1-4 여백의 리듬 ===================== */
  LESSONS.push({
    id: "spacing", ch: 0, order: 4,
    title: "여백의 리듬",
    lede: "이 레슨을 마치면 간격을 감이 아니라 규칙으로 고를 수 있습니다. 4의 배수로 된 간격 스케일, 그리고 '묶인 것의 안쪽은 바깥보다 좁게'라는 규칙 두 가지를 봅니다.",
    key: "간격은 4·8의 배수 스케일에서만 고르고, 묶인 것의 안쪽 여백은 바깥 간격보다 작게 둡니다.",
    steps: [
      ["감으로 정한 간격", "간격을 그때그때 정하면 값이 제각각이 됩니다. 왼쪽 카드의 색 띠와 숫자 태그를 보세요. 13, 7, 3, 11, 17, 9px로 규칙이 없습니다. 화면 하나에선 티가 덜 나도 화면이 수십 개로 늘면 어디는 빽빽하고 어디는 헐거워집니다."],
      ["4/8pt 그리드", "모든 간격을 <b>4의 배수</b>(주로 8의 배수)로 맞춘 것이 8pt 그리드입니다. 배경의 점 하나가 8px이고, 태그의 숫자가 모두 4의 배수로 바뀌었습니다. 해상도 배율(1.5x, 2x, 3x)을 곱해도 픽셀이 딱 떨어지고, 디자이너와 개발자가 같은 숫자로 말할 수 있습니다."],
      ["간격 스케일", "고를 수 있는 값을 미리 정해 둔 목록이 <b>간격 스케일</b>(spacing scale)입니다. 위쪽 막대가 4, 8, 12, 16, 24, 32, 48, 64이고, 주황색이 지금 쓰인 값입니다. 작은 쪽은 촘촘하고 큰 쪽은 성큼 커집니다. 코드에서는 이 값들을 <code>--space-4</code> 같은 토큰으로만 씁니다."],
      ["안쪽이 바깥보다 넓으면", "카드 안쪽 여백(padding)이 32px인데 카드 사이(gap)는 8px입니다. 빨간 점선처럼 눈은 두 카드를 <b>한 덩어리</b>로 묶어 버립니다. 가까운 것끼리 묶어 보는 근접성(proximity) 때문이고, 테두리가 있어도 간격이 이깁니다."],
      ["안쪽 ≤ 바깥", "안쪽 16px, 카드 사이 32px으로 바꾸면 초록 점선처럼 카드가 각각 독립된 묶음으로 보입니다. 카드 안에서도 같은 원리로 제목과 부제는 4px로 붙이고 덩어리 사이는 16~24px로 뗍니다. '직접 해보기'에서 padding과 gap을 바꿔 경계가 뒤집히는 순간을 보세요."],
      ["수직 리듬", "줄 높이(line-height)까지 8의 배수로 맞추면 모든 요소의 위아래가 8px 가로선 위에 떨어집니다. 이것이 <b>수직 리듬</b>(vertical rhythm)입니다. 파란 가로선과 카드 안 글줄·버튼 가장자리가 맞물리는 것을 보세요. 여러 열을 나란히 놓아도 줄이 가지런합니다."],
    ],
    terms: [
      ["8pt 그리드", "8-point grid", "간격과 크기를 8(세밀할 땐 4)의 배수로만 쓰는 규칙. 디자인 시스템을 처음 세울 때 가장 먼저 정합니다."],
      ["간격 스케일", "Spacing scale", "미리 정해 둔 간격 값의 목록. '이 간격은 스케일의 몇 번째 값인가'로 대화합니다."],
      ["디자인 토큰", "Design token", "색·간격·글자 크기 같은 결정을 이름 붙은 변수로 만든 것(--space-4, spacing.md). 디자인 도구와 코드가 같은 값을 쓰게 합니다."],
      ["안쪽 여백 · 바깥 여백", "Padding · Margin(Gap)", "요소 안쪽의 여백과 요소 사이의 간격. 근접성 규칙상 안쪽 ≤ 바깥으로 둡니다."],
      ["수직 리듬", "Vertical rhythm", "줄 높이와 간격을 같은 기본 단위의 배수로 맞춰 세로에 규칙적인 박자를 만드는 것. 긴 글과 다단 레이아웃에서 따집니다."],
    ],
    mount(api) {
      const cv = fillCanvas(api, 660);
      const S = [
        { pad: 13, t1: 7, t2: 3, g1: 11, g2: 17, gap: 9, lb: 20, dots: 0, scale: 0, rhythm: 0, grp: 0 },
        { pad: 12, t1: 8, t2: 4, g1: 12, g2: 16, gap: 8, lb: 20, dots: 1, scale: 0, rhythm: 0, grp: 0 },
        { pad: 16, t1: 4, t2: 4, g1: 16, g2: 16, gap: 16, lb: 20, dots: 0, scale: 1, rhythm: 0, grp: 0 },
        { pad: 32, t1: 4, t2: 4, g1: 16, g2: 16, gap: 8, lb: 20, dots: 0, scale: 1, rhythm: 0, grp: 1 },
        { pad: 16, t1: 4, t2: 4, g1: 16, g2: 24, gap: 32, lb: 20, dots: 0, scale: 1, rhythm: 0, grp: 1 },
        { pad: 16, t1: 8, t2: 8, g1: 16, g2: 16, gap: 32, lb: 24, dots: 0, scale: 0, rhythm: 1, grp: 0 },
      ];
      const SCALE = [4, 8, 12, 16, 24, 32, 48, 64];
      const PADS = [8, 12, 16, 24, 32], GAPS = [8, 16, 24, 32, 48];
      let step = 0, tgt = { ...S[0] }, show = true;
      const cur = { ...S[0] };
      const tok = (v) => (SCALE.includes(v) ? `var(--space-${SCALE.indexOf(v) + 1})` : v + "px");
      const pc = M.chips(api.controls, { title: "카드 안쪽 여백 (padding)", items: PADS.map((v) => v + ""), onPick: (i) => { tgt.pad = PADS[i]; out(); } });
      const gc = M.chips(api.controls, { title: "카드 사이 간격 (gap)", items: GAPS.map((v) => v + ""), onPick: (i) => { tgt.gap = GAPS[i]; out(); } });
      M.check(api.controls, { id: "spacing-show", label: "간격 표시", checked: true, onChange: (v) => (show = v) });
      const ro = M.copyRow(api.controls);
      function out() {
        pc.set(PADS.indexOf(tgt.pad)); gc.set(GAPS.indexOf(tgt.gap));
        ro.textContent = `.card { padding: ${tok(tgt.pad)}; }  .card-list { gap: ${tok(tgt.gap)}; }`;
        const HL = [[], [[0, 4]], [[0, 4]], [[6, 7]], [[6, 7]], [[9, 9]]];
        api.code([
          ":root {",
          "  --space-1: 4px;  --space-2: 8px;",
          "  --space-3: 12px; --space-4: 16px;",
          "  --space-5: 24px; --space-6: 32px;",
          "  --space-7: 48px; --space-8: 64px;",
          "}",
          `.card      { padding: ${tok(tgt.pad)}; }  /* 안쪽 */`,
          `.card-list { gap: ${tok(tgt.gap)}; }      /* 바깥 */`,
          ".card h3   { margin-block: var(--space-1); }",
          `.card p    { line-height: ${Math.round(tgt.lb)}px; } /* 8의 배수 → 리듬 */`,
        ].join("\n"), HL[step], "CSS · 간격 토큰");
      }
      return {
        setStep(s) { step = s; tgt = { ...S[s] }; out(); },
        frame(time, dt) {
          ease(cur, tgt, dt, 380);
          const { x, w, h } = M.fit(cv), c = M.col();
          const vert = w < 520;
          const top = 54, bot = 48, CW = 250, CH = 262;
          const k = vert
            ? Math.min(1.3, (w - 40) / CW, (h - top - bot - 10) / (2 * CH + 48))
            : Math.min(1.45, (h - top - bot - 10) / CH, (w - 40) / (2 * CW + 48));
          const gp = cur.gap * k, cw = vert ? Math.min(w - 40, CW * k * 1.2) : Math.min((w - 60 - gp) / 2, CW * k * 1.35);
          const inner = 16 + cur.t1 + 24 + cur.t2 + 16 + cur.g1 + cur.lb * 2 + cur.g2 + 32;
          const ch = (2 * cur.pad + inner) * k;
          const totW = vert ? cw : 2 * cw + gp, totH = vert ? 2 * ch + gp : ch;
          const ox = (w - totW) / 2, oy = top + Math.max(0, (h - top - bot - totH) / 2);
          const pos = (i) => (vert ? [ox, oy + i * (ch + gp)] : [ox + i * (cw + gp), oy]);
          // 스케일 자
          if (cur.scale > 0.01) {
            x.globalAlpha = cur.scale;
            const u = Math.min(1.3, (w - 7 * 12 - 24) / 208);
            let sx = (w - (208 * u + 7 * 12)) / 2;
            const used = [tgt.pad, tgt.gap, tgt.t1, tgt.g1, tgt.g2].map(Math.round);
            SCALE.forEach((v) => {
              const bw = v * u, on = used.includes(v);
              M.rrect(x, sx, 10, bw, 12, 3); x.fillStyle = on ? c.key : M.alpha(c.muted, 0.25); x.fill();
              x.strokeStyle = on ? c.ink : M.alpha(c.ink, 0.3); x.lineWidth = 1; x.stroke();
              M.text(x, v + "", sx + bw / 2, 40, { mono: true, size: 11, align: "center", color: on ? c.ink : c.muted, weight: on ? 700 : 500 });
              sx += bw + 12;
            });
            x.globalAlpha = 1;
          }
          if (cur.dots > 0.01) {
            x.fillStyle = M.alpha(c.ink, 0.3 * cur.dots);
            const st = 8 * k;
            for (let yy = oy - st * 3; yy < oy + totH + st * 3; yy += st) for (let xx = ox - st * 3; xx < ox + totW + st * 3; xx += st) x.fillRect(xx - 0.75, yy - 0.75, 1.5, 1.5);
            M.tag(x, "점 하나 = 8px", ox + totW, oy - 14, { align: "right", size: 11 });
          }
          const fs = (v) => Math.max(11, v * k);
          const cards = [["레슨 5개", "디자인 기초", "약 40분 · 입문"], ["레슨 4개", "모션 입문", "약 30분 · 입문"]];
          cards.forEach((cd, ci) => {
            const [cx, cy] = pos(ci);
            part(x, cx, cy, cw, ch, 12, null, { shadow: true });
            x.save(); M.rrect(x, cx, cy, cw, ch, 12); x.clip();
            const px = cx + cur.pad * k, pw = cw - 2 * cur.pad * k;
            let y = cy + cur.pad * k;
            const marks = [];
            M.text(x, cd[0], px, y + 12 * k, { size: fs(11), color: c.c, weight: 700 }); y += 16 * k;
            marks.push([y, cur.t1, "t"]); y += cur.t1 * k;
            M.text(x, cd[1], px, y + 18 * k, { size: fs(17), color: c.ink, weight: 700 }); y += 24 * k;
            marks.push([y, cur.t2, "t"]); y += cur.t2 * k;
            M.text(x, cd[2], px, y + 12 * k, { size: fs(11.5), color: c.muted }); y += 16 * k;
            marks.push([y, cur.g1, "g"]); y += cur.g1 * k;
            for (let i = 0; i < 2; i++) { M.rrect(x, px, y + (cur.lb * k) / 2 - 3 * k, pw * (i ? 0.62 : 0.95), 6 * k, 3 * k); x.fillStyle = M.alpha(c.muted, 0.4); x.fill(); y += cur.lb * k; }
            marks.push([y, cur.g2, "g"]); y += cur.g2 * k;
            const bw = Math.min(pw, 92 * k);
            M.rrect(x, px, y, bw, 32 * k, 7 * k); x.fillStyle = c.a; x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
            M.text(x, "시작하기", px + bw / 2, y + 16 * k + 4, { size: fs(12), color: c.surface, weight: 700, align: "center" });
            if (cur.rhythm > 0.01) {
              x.globalAlpha = cur.rhythm;
              for (let yy = cy; yy <= cy + ch + 0.5; yy += 8 * k) M.line(x, cx, yy, cx + cw, yy, M.alpha(c.a, 0.4), 1);
              x.globalAlpha = 1;
            }
            if (show && ci === 0) {
              x.fillStyle = M.alpha(c.key, 0.3); x.fillRect(cx, cy, cw, cur.pad * k); x.fillRect(cx, cy + cur.pad * k, cur.pad * k, ch - 2 * cur.pad * k); x.fillRect(cx, cy + ch - cur.pad * k, cw, cur.pad * k);
              marks.forEach(([yy, v, kind]) => {
                const col = kind === "t" ? c.c : c.a;
                x.fillStyle = M.alpha(col, 0.32); x.fillRect(px, yy, pw, v * k);
                M.tag(x, Math.round(v) + "", px + pw - 2, yy + (v * k) / 2, { align: "right", size: 11, mono: true, h: 17, padX: 6, color: col });
              });
            }
            x.restore();
            if (show && ci === 0) M.tag(x, "padding " + Math.round(cur.pad), cx + 8, cy + ch, { size: 11, mono: true, h: 18, padX: 7, color: c.ink, fill: c.surface });
          });
          const P = Math.round(tgt.pad), G = Math.round(tgt.gap), ok = P <= G;
          if (show) {
            const bad = cur.pad > cur.gap + 0.5, col = bad ? c.b : c.c;
            const [ax, ay] = pos(0);
            if (vert) { x.fillStyle = M.alpha(col, 0.3); x.fillRect(ax, ay + ch, cw, gp); M.tag(x, "gap " + Math.round(cur.gap), ax + cw - 4, ay + ch + gp / 2, { align: "right", size: 11, mono: true, color: col }); }
            else { x.fillStyle = M.alpha(col, 0.3); x.fillRect(ax + cw, ay, gp, ch); tagIn(x, "gap " + Math.round(cur.gap), ax + cw + gp / 2, ay - 14, 4, w - 4, { size: 11, mono: true, color: col }); }
          }
          // 묶음 표시
          if (cur.grp > 0.02) {
            x.globalAlpha = cur.grp;
            const one = cur.pad > cur.gap;
            const col = one ? c.b : c.c;
            x.save(); x.setLineDash([6, 5]); x.strokeStyle = col; x.lineWidth = 2;
            if (one) { M.rrect(x, ox - 9, oy - 9, totW + 18, totH + 18, 16); x.stroke(); }
            else [0, 1].forEach((i) => { const [cx, cy] = pos(i); M.rrect(x, cx - 7, cy - 7, cw + 14, ch + 14, 15); x.stroke(); });
            x.restore();
            M.tag(x, one ? "한 덩어리로 보임" : "카드마다 따로 보임", ox + totW + 9, oy + totH + 9, { align: "right", color: col, size: 12 });
            x.globalAlpha = 1;
          }
          let msg;
          if (step === 0) msg = "간격 13 · 7 · 3 · 11 · 17 · 9 — 규칙 없음";
          else if (step === 1) msg = "모두 4의 배수";
          else if (step === 5) msg = "줄 높이 24 · 간격 8/16/32 → 모두 8px 가로선에 떨어짐";
          else msg = `안쪽 ${P} ${ok ? "≤" : ">"} 바깥 ${G}  ${ok ? "✓ 카드가 따로 보입니다" : "✕ 카드가 한 덩어리로 보입니다"}`;
          M.text(x, msg, 12, h - 12, { mono: true, size: 11.5, color: step >= 2 && step <= 4 ? (ok ? c.c : c.b) : c.muted, weight: 600 });
        },
      };
    },
  });

  /* ===================== 1-5 어포던스와 상태 ===================== */
  LESSONS.push({
    id: "states", ch: 0, order: 5,
    title: "어포던스와 상태",
    lede: "이 레슨을 마치면 버튼을 '그림 한 장'이 아니라 여러 상태의 묶음으로 설계할 수 있습니다. 실제 신청 폼 안에서 기본·호버·누름·포커스·비활성·로딩이 어떻게 보여야 하는지, 손가락이 누르는 영역은 얼마여야 하는지 봅니다.",
    key: "인터랙티브 요소마다 기본·호버·누름·포커스·비활성·로딩 상태를 모두 그리고, 누르는 영역은 44px 이상 확보합니다.",
    steps: [
      ["어포던스와 시그니파이어", "<b>어포던스</b>(affordance)는 물건이 허락하는 행동이고, <b>시그니파이어</b>(signifier)는 그 행동을 알려 주는 보이는 단서입니다. 폼 아래 '취소'는 글자뿐이라 누를 수 있는지 알 수 없고, '신청하기'는 채움·테두리·그림자가 '눌러도 된다'고 알려 줍니다. 태그 두 개를 비교해 보세요."],
      ["호버", "포인터를 올리면 버튼 색이 조금 짙어지고 1px 떠오릅니다. '이건 반응한다'는 <b>피드백</b>입니다. 커서가 버튼에 닿는 순간 오른쪽 상태 목록의 '호버'에 불이 들어옵니다. 터치 화면에는 호버가 없으므로 호버 때만 보이는 정보에 기대면 안 됩니다."],
      ["누름", "누르는 순간 버튼이 그림자만큼 내려앉습니다(<code>:active</code>). 이 반응이 약 100ms 안에 보여야 사람은 '눌렸다'고 느낍니다. 늦으면 같은 버튼을 두세 번 누르게 되고, 결제·신청 버튼이라면 요청이 중복됩니다."],
      ["포커스", "키보드 <kbd>Tab</kbd>으로 움직이는 사람에게는 지금 위치가 <b>포커스 링</b>(focus ring)으로 보여야 합니다. 파란 링이 닫기 → 입력칸 → 체크박스 → 취소 → 신청하기 순서로 옮겨 가는 것을 보세요. <code>:focus-visible</code>을 쓰면 마우스 클릭 때는 숨고 키보드일 때만 나타납니다."],
      ["비활성과 로딩", "<b>비활성</b>(disabled)은 '지금은 못 누름'이라 대비를 낮추고 그림자를 뺍니다. 이유도 보여야 해서, 여기서는 체크박스를 켜야 버튼이 살아납니다. <b>로딩</b>(loading)은 '눌렸고 처리 중'이라 글자를 스피너로 바꾸되, 폭 태그처럼 버튼 폭을 그대로 두어야 주변이 흔들리지 않습니다."],
      ["터치 타깃 44px", "손가락은 커서보다 뭉툭합니다. 빨간 점선이 실제로 눌리는 영역(<b>터치 타깃</b>, touch target)입니다. 닫기 아이콘은 24px로 보여도 눌리는 영역은 <b>44×44px</b>(Apple HIG, WCAG 2.5.5) 이상이어야 하고, Material은 48dp를 권합니다. 보이는 크기와 누르는 크기는 따로 정할 수 있습니다."],
    ],
    terms: [
      ["어포던스", "Affordance", "대상이 허락하는 행동의 가능성. 버튼은 누름을, 슬라이더는 끌기를 허락합니다. '이건 눌러질 것 같지 않다'는 리뷰에서 쓰는 말입니다."],
      ["시그니파이어", "Signifier", "어포던스를 알려 주는 보이는 단서. 채움, 테두리, 그림자, 밑줄, 커서 모양."],
      ["상호작용 상태", "Interaction states", "default · hover · active(pressed) · focus · disabled · loading. 디자인 시스템 컴포넌트 문서는 상태별 모습을 모두 정의합니다."],
      ["포커스 링", "Focus ring", "키보드 포커스 위치를 보여 주는 윤곽선. 배경과 3:1 이상 대비가 필요하며, 지우기만 하면 접근성 위반입니다."],
      ["터치 타깃", "Touch target · Hit area", "실제로 눌리는 영역. 최소 44×44pt(iOS), 48×48dp(Android). 작은 아이콘은 투명한 여백으로 넓힙니다."],
    ],
    mount(api) {
      const NAMES = { default: "기본", hover: "호버", press: "누름", focus: "포커스", disabled: "비활성", loading: "로딩" };
      const DESC = { default: "단서만 갖춘 평소 모습", hover: "색 짙게 · 1px 떠오름", press: "그림자만큼 내려앉음", focus: "3px 링 · 키보드 위치", disabled: "대비 낮춤 · 그림자 없음", loading: "스피너 · 폭 그대로" };
      const KEYS = Object.keys(NAMES);
      const MINI = { default: "", hover: "is-hover", press: "is-press", focus: "is-focus", disabled: "is-disabled", loading: "is-loading" };
      const root = M.el("div", { class: "dom-stage lt-fill" });
      const wrap = M.el("div", { class: "states" });
      const scene = M.el("div", { class: "states-scene" });
      const card = M.el("div", { class: "states-card" });
      const close = M.el("button", { class: "states-ibtn", type: "button", "aria-label": "닫기" }, "×");
      const head = M.el("div", { class: "states-head" }, M.el("b", {}, "레슨 알림 신청"), close);
      const input = M.el("input", { class: "states-input", type: "text", placeholder: "name@example.com", "aria-label": "이메일" });
      const field = M.el("label", { class: "states-field" }, M.el("small", {}, "이메일"), input);
      const cbox = M.el("input", { type: "checkbox", class: "states-cb", id: "states-cb" });
      const crow = M.el("div", { class: "states-check" }, cbox, M.el("label", { for: "states-cb" }, "새 레슨이 열리면 알림 받기"));
      const cancel = M.el("button", { class: "states-ghost", type: "button" }, "취소");
      const btn = M.el("button", { class: "states-btn", type: "button" }, M.el("span", { class: "states-spin", "aria-hidden": "true" }), M.el("span", { class: "states-label" }, "신청하기"));
      card.append(head, field, crow, M.el("div", { class: "states-actions" }, cancel, btn));
      const HIT = [close, cbox, cancel, btn].map(() => M.el("span", { class: "states-hit", "aria-hidden": "true" }));
      const cursor = M.el("div", { class: "states-cursor", "aria-hidden": "true", html: '<svg viewBox="0 0 20 24" width="22" height="26"><path d="M2 1 L2 19 L7 14.5 L10.5 22 L13.5 20.6 L10 13.3 L16.5 13.3 Z"/></svg>' });
      const finger = M.el("span", { class: "states-finger", "aria-hidden": "true" });
      const kbd = M.el("kbd", { class: "states-kbd", "aria-hidden": "true" }, "Tab ⇥");
      scene.append(card, ...HIT, finger, cursor, kbd);
      const notes = domNotes(scene);
      const rail = M.el("div", { class: "states-rail", "aria-hidden": "true" });
      const rows = KEYS.map((k) => {
        const e = M.el("div", { class: "states-row" },
          M.el("span", { class: "states-btn states-mini " + MINI[k] }, M.el("span", { class: "states-spin" }), M.el("span", { class: "states-label" }, "신청")),
          M.el("span", { class: "states-row-t" }, M.el("b", {}, NAMES[k]), M.el("small", {}, DESC[k])));
        rail.append(e); return e;
      });
      wrap.append(scene, rail); root.append(wrap); api.stage.append(root);
      let step = 0, forced = null, shown = "", hitOn = false, z = 1;
      const chips = M.chips(api.controls, { title: "상태 고정", items: ["자동", ...KEYS.map((k) => NAMES[k])], value: 0, onPick: (i) => { forced = i ? KEYS[i - 1] : null; shown = ""; } });
      M.check(api.controls, { id: "states-hit", label: "터치 영역 보기", onChange: (v) => { hitOn = v; shown = ""; } });
      api.controls.append(M.el("p", { class: "hint" }, "무대의 폼은 진짜 HTML입니다. 버튼에 직접 마우스를 올리고 누르고, 무대를 한 번 클릭한 뒤 Tab 키로 포커스를 옮겨 보세요."));
      const CODE = [
        ".btn {",
        "  min-height: 44px;  padding: 0 22px;",
        "  background: var(--pop);  box-shadow: 2px 3px 0 var(--ink);",
        "  transition: transform .12s, box-shadow .12s;",
        "}",
        ".btn:hover  { background: var(--pop-strong); transform: translate(-1px, -1px); }",
        ".btn:active { transform: translate(2px, 3px); box-shadow: none; }",
        ".btn:focus-visible { outline: 3px solid var(--a); outline-offset: 3px; }",
        ".btn:disabled { opacity: .45; box-shadow: none; cursor: not-allowed; }",
        ".btn[aria-busy=\"true\"] .label { visibility: hidden; } /* 폭 유지 */",
        ".icon-btn { width: 24px; height: 24px; position: relative; }",
        ".icon-btn::after { content: \"\"; position: absolute; inset: -10px; } /* 44px */",
      ].join("\n");
      const HL = [[[0, 4]], [[5, 5]], [[6, 6]], [[7, 7]], [[8, 9]], [[1, 1], [10, 11]]];
      const FOC = [close, input, cbox, cancel, btn];
      /* 단계별 타임라인: [버튼 상태, 길이, 포커스 대상 번호, 커서 대상, 체크 여부] */
      const SEQ = [
        [["default", 1e9]],
        [["default", 1100, -1, "away"], ["hover", 1700, -1, "btn"]],
        [["default", 800, -1, "away"], ["hover", 500, -1, "btn"], ["press", 420, -1, "btn"], ["hover", 900, -1, "btn"]],
        [["default", 900, 0], ["default", 900, 1], ["default", 900, 2], ["default", 900, 3], ["focus", 1300, 4]],
        [["disabled", 1500, -1, "cb", 0], ["disabled", 350, -1, "cb", 1], ["default", 800, -1, "btn", 1], ["press", 220, -1, "btn", 1], ["loading", 1900, -1, "btn", 1]],
        [["default", 1e9]],
      ];
      const rel = (el) => {
        const s = scene.getBoundingClientRect(), r = el.getBoundingClientRect();
        return { left: (r.left - s.left) / z, top: (r.top - s.top) / z, width: r.width / z, height: r.height / z };
      };
      function fit() {
        wrap.style.zoom = 1;
        const nh = wrap.offsetHeight, nw = wrap.offsetWidth;
        const aw = root.clientWidth - 8, ah = fixedStage() ? root.clientHeight - 8 : 1e9;
        z = M.clamp(Math.min(ah / nh, aw / nw, fixedStage() ? 1.35 : 1), 0.72, 1.35);
        wrap.style.zoom = z;
        shown = "";
      }
      function apply(st, fi, cur, chk) {
        const key = [st, fi, cur, chk, step, hitOn, z].join("|");
        if (key === shown) return;
        shown = key;
        btn.classList.toggle("is-hover", st === "hover");
        btn.classList.toggle("is-press", st === "press");
        btn.classList.toggle("is-loading", st === "loading");
        btn.disabled = st === "disabled";
        btn.setAttribute("aria-busy", st === "loading" ? "true" : "false");
        FOC.forEach((el, i) => el.classList.toggle("is-focus", i === fi || (el === btn && st === "focus")));
        if (chk != null) cbox.checked = !!chk;
        cancel.classList.toggle("flat", step === 0);
        rows.forEach((p, i) => p.classList.toggle("on", KEYS[i] === st && step !== 0 && step !== 5));
        // 커서
        const showCur = cur && step !== 3 && step !== 0 && step !== 5;
        cursor.classList.toggle("vis", !!showCur);
        cursor.classList.toggle("down", st === "press");
        if (showCur) {
          const t = cur === "btn" ? rel(btn) : cur === "cb" ? rel(cbox) : rel(card);
          const tx = cur === "away" ? t.left + t.width * 0.35 : t.left + t.width * 0.6;
          const ty = cur === "away" ? t.top + t.height * 0.55 : t.top + t.height * 0.55;
          cursor.style.transform = `translate(${tx}px, ${ty}px)`;
        }
        // Tab 키
        kbd.classList.toggle("on", step === 3);
        if (step === 3) { kbd.classList.remove("tap"); void kbd.offsetWidth; kbd.classList.add("tap"); }
        // 터치 영역
        const hit = step === 5 || hitOn;
        [close, cbox, cancel, btn].forEach((el, i) => {
          const r = rel(el), W = Math.max(44, r.width), H = Math.max(44, r.height);
          Object.assign(HIT[i].style, { left: r.left + r.width / 2 - W / 2 + "px", top: r.top + r.height / 2 - H / 2 + "px", width: W + "px", height: H + "px" });
          HIT[i].classList.toggle("on", hit);
        });
        finger.classList.toggle("on", step === 5);
        if (step === 5) { const r = rel(close); finger.style.left = r.left + r.width / 2 + "px"; finger.style.top = r.top + r.height / 2 + "px"; }
        // 주석
        const N = [];
        if (step === 0) {
          N.push({ el: cancel, side: "left", text: "글자만: 누를 수 있나?", tone: "b" });
          N.push({ el: btn, side: "bottom", text: "채움 · 테두리 · 그림자 = 단서", tone: "c" });
        } else if (step === 3) {
          const el = FOC[fi < 0 ? 4 : fi], name = ["닫기", "입력칸", "체크박스", "취소", "신청하기"][fi < 0 ? 4 : fi];
          const side = el === close ? "left" : el === input ? "bottom" : el === cbox ? "bottom" : el === cancel ? "left" : "bottom";
          N.push({ el, side, text: `포커스 ${(fi < 0 ? 4 : fi) + 1}/5 · ${name}`, tone: "a", dx: el === cbox ? 70 : el === input ? 60 : 0, off: el === input ? 16 : 24 });
        } else if (step === 4) {
          if (st === "disabled" && !cbox.checked) N.push({ el: cbox, side: "bottom", dx: 60, off: 18, text: "먼저 체크해야 활성", tone: "b" });
          N.push({ el: btn, side: "bottom", text: st === "loading" ? `로딩: 폭 ${Math.round(rel(btn).width)}px 그대로` : st === "disabled" ? "비활성: 지금은 못 누름" : NAMES[st] + ": " + DESC[st], tone: st === "disabled" ? "b" : "c" });
        } else if (step === 5) {
          N.push({ el: close, side: "left", off: 34, text: "보이는 24px · 눌리는 44px", tone: "b" });
          N.push({ el: cbox, side: "bottom", dx: 70, off: 30, text: "체크박스 20px → 44px", tone: "b" });
          N.push({ el: btn, side: "bottom", off: 30, text: "높이 44px", tone: "b" });
        } else {
          N.push({ el: btn, side: "bottom", text: `${NAMES[st]}: ${DESC[st]}`, tone: st === "default" ? null : "c" });
        }
        notes.set(N.map((n) => ({ ...n, rect: rel(n.el) })), 1);
      }
      const ro = new ResizeObserver(() => fit());
      ro.observe(root);
      return {
        setStep(s) {
          step = s; forced = null; chips.set(0); shown = "";
          cbox.checked = s !== 4;
          FOC.forEach((el) => el.classList.remove("is-focus"));
          wrap.classList.toggle("s-dim-rail", s === 0 || s === 5);
          wrap.classList.toggle("s-touch", s === 5);
          api.code(CODE, HL[s], "CSS · 상태");
          fit();
        },
        frame(time) {
          if (forced) return apply(forced, forced === "focus" ? 4 : -1, forced === "hover" || forced === "press" ? "btn" : null, forced === "disabled" ? 0 : 1);
          const seq = SEQ[step], tot = seq.reduce((a, b) => a + b[1], 0);
          let t = time % tot, e = seq[0];
          for (const q of seq) { if (t < q[1]) { e = q; break; } t -= q[1]; }
          apply(e[0], e[2] ?? -1, e[3] || null, e[4]);
        },
        destroy() { ro.disconnect(); },
      };
    },
  });

  /* ===================== 2-2 서체 분류와 짝짓기 ===================== */
  LESSONS.push({
    id: "type-classification", ch: 1, order: 2,
    title: "서체 분류와 짝짓기",
    lede: "이 레슨을 마치면 처음 보는 서체도 '어느 갈래인가'로 읽을 수 있습니다. 획 끝의 모양, 굵기 대비, 획이 기운 축을 보고 서체의 성격과 어울리는 짝을 고르는 법을 봅니다.",
    key: "서체는 두 개까지만 섞고, 확실히 대비되는 짝이거나 한 패밀리의 굵기 차이로만 나눕니다.",
    steps: [
      ["세리프와 산세리프", "가장 큰 갈래는 획 끝에 작은 돌기, 즉 <b>세리프</b>(serif, 부리)가 있는지입니다. 오른쪽 도식의 주황 돌기가 세리프이고, 돌기 없이 잘린 쪽이 <b>산세리프</b>(sans-serif, sans는 '없다')입니다. 세리프는 전통적·문학적인 인상, 산세리프는 중립적·현대적인 인상을 줍니다."],
      ["슬랩 · 모노 · 디스플레이", "<b>슬랩 세리프</b>는 세리프가 획만큼 두꺼운 네모입니다. <b>모노스페이스</b>는 오른쪽 위 상자처럼 i와 m과 W의 폭이 모두 같아서 코드와 숫자 표에 씁니다. <b>디스플레이</b> 서체는 큰 크기에서만 쓰도록 개성을 키운 제목용입니다."],
      ["획 대비와 스트레스", "한 글자 안에서 굵은 획과 가는 획의 차이가 <b>획 대비</b>(contrast), 가장 가는 부분을 이은 축이 <b>스트레스</b>(stress)입니다. 오른쪽 O의 주황 점선이 축입니다. 펜 흔적이 남은 올드스타일은 축이 비스듬하고, 모던(디돈)은 수직이며 대비가 극단적입니다. 슬라이더로 두 값을 바꿔 보세요."],
      ["산세리프의 세 갈래", "산세리프도 골격에 따라 나뉩니다. 도식의 주황 선이 <b>조리개</b>(aperture), 즉 c의 열린 틈입니다. <b>지오메트릭</b>은 원과 직선으로 그린 듯하고, <b>그로테스크</b>는 조리개가 좁으며, <b>휴머니스트</b>는 손글씨 흔적이 남아 조리개가 넓어 작은 크기에서도 잘 읽힙니다."],
      ["명조와 고딕", "한글에서는 붓의 흔적인 <b>부리</b>와 <b>맺음</b>이 있는 <b>명조</b>가 세리프, 굵기가 고른 <b>고딕</b>이 산세리프에 해당합니다. 도식에서 주황으로 칠한 곳이 부리와 맺음입니다. 화면 본문은 고딕이 기본이고, 긴 글이나 감성적인 제목에는 명조를 씁니다."],
      ["짝짓기", "두 서체를 섞을 땐 <b>확실히 다르게</b>(명조 제목 + 고딕 본문) 하거나, 한 패밀리 안에서 <b>굵기만</b> 바꿉니다. 초록 카드 두 장이 그 예입니다. 빨간 카드처럼 비슷하지만 다른 두 서체를 섞으면 의도인지 실수인지 구분되지 않아 가장 나쁜 짝이 됩니다."],
    ],
    terms: [
      ["세리프 · 산세리프", "Serif · Sans-serif", "획 끝 돌기의 유무로 나눈 가장 큰 분류. 한글의 명조·고딕에 해당하며, 서체를 고를 때 가장 먼저 정합니다."],
      ["획 대비", "Stroke contrast", "한 글자 안 굵은 획과 가는 획의 굵기 차이. 대비가 크면 작은 크기·저해상도에서 가는 획이 사라집니다."],
      ["스트레스", "Stress · Axis", "글자에서 가장 가는 부분을 이은 축의 기울기. 올드스타일은 사선, 모던은 수직. 세리프 서체의 시대를 가늠할 때 씁니다."],
      ["조리개", "Aperture", "c, e, a처럼 반쯤 열린 글자의 열린 정도. 넓을수록 작은 크기에서 잘 읽혀 UI 본문 서체를 고를 때 따집니다."],
      ["타입 페어링", "Type pairing", "제목용·본문용 서체를 짝짓는 일. 확실한 대비 또는 같은 골격이 원칙입니다."],
    ],
    mount(api) {
      const cv = fillCanvas(api, 560);
      let step = 0, contrast = 0.7, axis = -22;
      M.slider(api.controls, { id: "tc-contrast", label: "획 대비 (3·5단계 도식)", min: 0, max: 0.92, step: 0.01, value: 0.7, fmt: (v) => Math.round(v * 100) + "%", onInput: (v) => (contrast = v) });
      M.slider(api.controls, { id: "tc-axis", label: "스트레스 기울기 (3단계 도식)", min: -40, max: 0, step: 1, value: -22, unit: "°", onInput: (v) => (axis = v) });
      api.controls.append(M.el("p", { class: "hint" }, "웹폰트를 불러오지 않고 이 기기에 있는 시스템 서체로 보여 줍니다. 기기에 따라 표본 모양이 조금 다를 수 있습니다."));
      const SAMPLES = [
        [["세리프", "Serif", FS.serif, "Rag 가나"], ["산세리프", "Sans-serif", FS.sans, "Rag 가나"]],
        [["슬랩 세리프", "Slab serif", FS.slab, "Rag 12"], ["모노스페이스", "Monospace", FS.mono, "Rag 12"], ["디스플레이", "Display", FS.display, "Rag 12"]],
        [["올드스타일", "Old-style", FS.old, "Rag oe"], ["모던 · 디돈", "Modern · Didone", FS.display, "Rag oe"], ["모노라인 산세리프", "Monoline", FS.geo, "Rag oe"]],
        [["지오메트릭", "Geometric", FS.geo, "Rag ce"], ["그로테스크", "Grotesque", FS.sans, "Rag ce"], ["휴머니스트", "Humanist", FS.human, "Rag ce"]],
        [["명조", "Myeongjo", FS.myeong, "가나다 한글"], ["고딕", "Gothic", FS.gothic, "가나다 한글"]],
      ];
      const CODE = [
        [":root {", `  --serif: ${FS.serif};`, `  --sans: ${FS.sans};`, "}"],
        [`.code   { font-family: ${FS.mono}; }`, `.badge  { font-family: ${FS.slab}; }`, `.poster { font-family: ${FS.display}; }`],
        ["/* 같은 '세리프'라도 시대에 따라 축과 대비가 다름 */", `.oldstyle { font-family: ${FS.old}; }`, `.modern   { font-family: ${FS.display}; }`],
        [`.geometric  { font-family: ${FS.geo}; }`, `.grotesque  { font-family: ${FS.sans}; }`, `.humanist   { font-family: ${FS.human}; }`],
        [":root {", `  --myeongjo: ${FS.myeong};`, `  --gothic: ${FS.gothic};`, "}"],
        ["/* 대비: 명조 제목 + 고딕 본문 */", "h1   { font-family: var(--myeongjo); font-weight: 700; }", "body { font-family: var(--gothic);  font-weight: 400; }", "", "/* 같은 골격: 한 패밀리의 굵기만 */", "h1   { font-family: var(--gothic); font-weight: 800; }"],
      ];
      const HL = [[[1, 2]], "all", [[1, 2]], "all", [[1, 2]], [[1, 2]]];
      function stem(x, cx, base, sh, sw, kind, c, a) {
        const top = base - sh;
        x.fillStyle = c.ink; x.fillRect(cx - sw / 2, top, sw, sh);
        if (kind === "sans") return;
        if (kind === "slab") {
          const sl = sw * 0.62;
          x.fillStyle = M.alpha(c.key, 0.4 + 0.6 * a);
          x.fillRect(cx - sw * 1.35, top, sw * 2.7, sl); x.fillRect(cx - sw * 1.35, base - sl, sw * 2.7, sl);
          return;
        }
        x.fillStyle = M.alpha(c.key, 0.4 + 0.6 * a);
        const th = sw * 0.16, ext = sw * 1.25, br = sw * 0.7;
        for (const [yy, dir] of [[top, 1], [base, -1]]) for (const side of [-1, 1]) {
          const ex = cx + side * (sw / 2), fx = cx + side * (sw / 2 + ext);
          x.beginPath(); x.moveTo(ex, yy); x.lineTo(fx, yy); x.lineTo(fx, yy + dir * th);
          x.quadraticCurveTo(ex, yy + dir * th, ex, yy + dir * (th + br)); x.closePath();
          x.fill();
        }
      }
      function drawO(x, cx, cy, R, ct, ax, c) {
        const thick = R * 0.3, thin = Math.max(1.5, thick * (1 - ct));
        const rx = R * 0.82, ry = R;
        const a = (ax * Math.PI) / 180, L = ry * 1.3;
        x.save(); x.translate(cx, cy);
        x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        x.ellipse(0, 0, rx - thick, ry - thin, a, 0, Math.PI * 2, true);
        x.fillStyle = c.ink; x.fill("evenodd");
        M.line(x, -Math.sin(-a) * L, -Math.cos(-a) * L, Math.sin(-a) * L, Math.cos(-a) * L, c.key, 2, [5, 4]);
        x.restore();
        const dx = Math.sin(a), dy = -Math.cos(a);
        return { thinPt: [cx + dx * (ry - thin / 2) * 0.86, cy + dy * (ry - thin / 2)], thickPt: [cx + rx - thick / 2, cy], axisEnd: [cx - dx * L, cy - dy * L], thin, thick };
      }
      function arcC(x, cx, cy, rx, ry, gap, lw, c, tilt = 0, mod = 0) {
        const a0 = gap, a1 = Math.PI * 2 - gap, N = 60;
        x.save(); x.translate(cx, cy); x.rotate(tilt); x.strokeStyle = c.ink; x.lineCap = "butt";
        for (let i = 0; i < N; i++) {
          const t0 = a0 + ((a1 - a0) * i) / N, t1 = a0 + ((a1 - a0) * (i + 1.15)) / N;
          x.lineWidth = lw * (1 - mod * 0.55 * Math.abs(Math.sin(t0 + 0.35)));
          x.beginPath(); x.ellipse(0, 0, rx, ry, 0, t0, Math.min(t1, a1)); x.stroke();
        }
        const p0 = [Math.cos(a0) * rx, Math.sin(a0) * ry], p1 = [Math.cos(a1) * rx, Math.sin(a1) * ry];
        M.line(x, p0[0] + lw * 0.2, p0[1], p1[0] + lw * 0.2, p1[1], c.key, 3);
        x.restore();
        return [cx + Math.cos(tilt) * (p0[0] + lw * 0.2), cy + Math.sin(tilt) * p0[0]];
      }
      function hangul(x, ox, base, s, myeong, ct, c, a) {
        const stW = s * 0.15, thin = myeong ? Math.max(2, stW * (1 - ct * 0.85)) : stW;
        const vx = ox + s * 0.2, top = base - s, hy = top + s * 0.46, hw = s * 0.42;
        x.fillStyle = c.ink;
        if (!myeong) { x.fillRect(vx, top, stW, s); x.fillRect(vx + stW, hy - stW / 2, hw, stW); return null; }
        x.beginPath(); x.moveTo(vx, top + stW * 0.9); x.lineTo(vx + stW, top + stW * 0.5); x.lineTo(vx + stW, base - stW * 0.4);
        x.lineTo(vx + stW * 0.55, base); x.lineTo(vx, base - stW * 0.2); x.closePath(); x.fill();
        x.fillRect(vx + stW, hy - thin / 2, hw - stW * 0.3, thin);
        x.fillStyle = M.alpha(c.key, 0.4 + 0.6 * a);
        x.beginPath(); x.moveTo(vx - stW * 0.55, top + stW * 0.75); x.lineTo(vx + stW * 0.15, top - stW * 0.25);
        x.lineTo(vx + stW, top + stW * 0.5); x.lineTo(vx, top + stW * 1.2); x.closePath(); x.fill();
        const ex = vx + stW + hw - stW * 0.3;
        x.beginPath(); x.moveTo(ex - stW * 0.6, hy - thin / 2); x.lineTo(ex - stW * 0.1, hy - stW * 0.75);
        x.lineTo(ex + stW * 0.45, hy + thin / 2 + stW * 0.15); x.lineTo(ex - stW * 0.6, hy + thin / 2); x.closePath(); x.fill();
        return { buri: [vx - stW * 0.2, top + stW * 0.2], maet: [ex + stW * 0.1, hy], thin, stW };
      }
      return {
        setStep(s) { step = s; api.code(CODE[s].join("\n"), HL[s], "CSS · font-family"); },
        frame(time) {
          const { x, w, h } = M.fit(cv), c = M.col();
          const wide = w >= 560 && w > h * 1.15;
          const ap = M.ease.out(M.clamp(time / 700, 0, 1));
          const A = wide ? { x: 12, y: 6, w: w * 0.44 - 12, h: h - 12 } : { x: 10, y: 6, w: w - 20, h: h * 0.44 };
          const B = wide ? { x: w * 0.47, y: 6, w: w * 0.53 - 12, h: h - 14 } : { x: 10, y: h * 0.46, w: w - 20, h: h * 0.54 - 10 };
          if (step === 5) {
            const P = [
              ["대비 ✓", "명조 제목 + 고딕 본문", [FS.myeong, 700, "디자인 기초"], [FS.gothic, 400, "정렬과 여백, 위계를 차례로 익힙니다."], c.c],
              ["같은 골격 ✓", "고딕 800 + 고딕 400", [FS.gothic, 800, "디자인 기초"], [FS.gothic, 400, "정렬과 여백, 위계를 차례로 익힙니다."], c.c],
              ["애매한 짝 ✕", "비슷한 산세리프 둘", [FS.sans, 700, "Design Basics"], [FS.human, 400, "Alignment, spacing, hierarchy."], c.b],
            ];
            const row = w >= 560, gp = 14;
            const cw = row ? (w - 24 - gp * 2) / 3 : w - 24;
            const chh = row ? Math.min(h - 30, 300) : (h - 20 - gp * 2) / 3;
            P.forEach((p, i) => {
              const cx = row ? 12 + i * (cw + gp) : 12, cy0 = row ? (h - chh) / 2 : 8 + i * (chh + gp);
              const a = M.ease.out(M.clamp((time - i * 160) / 600, 0, 1));
              const cy = cy0 + (1 - a) * 12;
              x.globalAlpha = a;
              part(x, cx, cy, cw - 3, chh - 4, 12, p[4], { shadow: true, ta: 0.08 });
              M.tag(x, p[0], cx + 12, cy + 20, { color: p[4], size: 12 });
              M.text(x, p[1], cx + 14, cy + 50, { size: 11, mono: true, color: c.muted });
              const hs = Math.min(row ? 32 : 24, cw / 7, chh * 0.2);
              const hy = cy + (row ? chh * 0.48 : Math.min(chh * 0.62, 50 + hs + 8));
              T(x, p[2][2], cx + 14, hy, hs, p[2][0], c.ink, { weight: p[2][1] });
              const bs = Math.max(12, Math.min(15, cw / 16));
              x.font = tf(bs, p[3][0], 400);
              const words = p[3][2].split(" "); let line = "", ly = hy + bs * 2;
              for (const wd of words) {
                const tst = line ? line + " " + wd : wd;
                if (x.measureText(tst).width > cw - 30 && line) { T(x, line, cx + 14, ly, bs, p[3][0], c.muted); line = wd; ly += bs * 1.55; } else line = tst;
              }
              T(x, line, cx + 14, ly, bs, p[3][0], c.muted);
              x.globalAlpha = 1;
            });
            return;
          }
          // 표본
          const rows = SAMPLES[step];
          const rh = A.h / rows.length;
          rows.forEach(([ko, en, fam, txt], i) => {
            const y0 = A.y + i * rh;
            const a = M.ease.out(M.clamp((time - i * 120) / 500, 0, 1));
            x.globalAlpha = a;
            M.text(x, ko, A.x, y0 + 16, { size: 12.5, weight: 700, color: c.ink });
            x.font = M.font(12.5, "ui", 700); const kw = x.measureText(ko).width;
            M.text(x, en, A.x + kw + 8, y0 + 16, { size: 11, mono: true, color: c.muted });
            let fs = Math.min(rh * 0.55, A.w / 5.2, 64);
            x.font = tf(fs, fam); const tw0 = x.measureText(txt).width;
            if (tw0 > A.w - 4) fs *= (A.w - 4) / tw0;
            T(x, txt, A.x, y0 + 22 + fs * 1.0, fs, fam, c.ink);
            if (i < rows.length - 1) M.line(x, A.x, y0 + rh - 4, A.x + A.w, y0 + rh - 4, c.line, 1);
            x.globalAlpha = 1;
          });
          // 도식 패널
          part(x, B.x, B.y, B.w - 3, B.h - 3, 14, c.key, { shadow: true, ta: 0.06 });
          const lo = B.x + 6, hi = B.x + B.w - 10;
          if (step === 0) {
            const sh = Math.min(B.h * 0.48, 170), sw = sh * 0.16, base = B.y + B.h * 0.5 + sh * 0.5;
            const c1 = B.x + B.w * 0.3, c2 = B.x + B.w * 0.72;
            stem(x, c1, base, sh, sw, "serif", c, ap);
            stem(x, c2, base, sh, sw, "sans", c, ap);
            const ext = sw * 1.25;
            const sl = "부리 · 받침(bracket)", stw = tagW(x, sl);
            M.callout(x, sl, c1 - sw / 2 - ext * 0.7, base - sh + 2, Math.max(B.x + 8 + stw, c1 - sw / 2 - ext * 0.7 - 8), base - sh - 26, { color: c.ink, align: "right" });
            M.callout(x, "잘린 끝", c2 + sw / 2 - 1, base - sh + 1, c2 + sw / 2 + 10, base - sh - 26, { color: c.ink });
            tagIn(x, "세리프", c1, base + 26, lo, hi, { color: c.key, size: 12.5 });
            tagIn(x, "산세리프", c2, base + 26, lo, hi, { size: 12.5 });
          } else if (step === 1) {
            const sh = Math.min(B.h * 0.4, 130), sw = sh * 0.16, sx = B.x + B.w * 0.17, base = B.y + B.h * 0.62;
            stem(x, sx, base, sh, sw, "slab", c, ap);
            tagIn(x, "슬랩: 네모난 세리프", sx, base + 26, lo, hi, { color: c.key, size: 11.5 });
            const gx = B.x + B.w * 0.36, gw = B.w * 0.6;
            const fs = Math.min(60, gw / 3.4, B.h * 0.17);
            x.font = tf(fs, FS.mono, 500); const mw = x.measureText("m").width;
            const r1 = B.y + B.h * 0.36, r2 = B.y + B.h * 0.76;
            let px = gx;
            ["i", "m", "W"].forEach((l) => {
              x.fillStyle = M.alpha(c.key, 0.18); x.fillRect(px, r1 - fs * 0.95, mw, fs * 1.2);
              x.strokeStyle = c.ink; x.lineWidth = 1; x.strokeRect(px + 0.5, r1 - fs * 0.95, mw, fs * 1.2);
              T(x, l, px + mw / 2, r1, fs, FS.mono, c.ink, { align: "center" }); px += mw;
            });
            M.tag(x, "모노: 폭이 모두 같음", gx, r1 + fs * 0.25 + 18, { size: 11.5, color: c.key });
            px = gx; x.font = tf(fs, FS.sans, 500);
            ["i", "m", "W"].forEach((l) => {
              x.font = tf(fs, FS.sans, 500);
              const lw = x.measureText(l).width;
              x.strokeStyle = M.alpha(c.ink, 0.5); x.lineWidth = 1; x.strokeRect(px + 0.5, r2 - fs * 0.95, lw, fs * 1.2);
              T(x, l, px, r2, fs, FS.sans, c.ink, { weight: 500 }); px += lw;
            });
            M.tag(x, "비례폭: 글자마다 다름", gx, r2 + fs * 0.25 + 18, { size: 11.5 });
          } else if (step === 2) {
            const R = Math.min(B.h * 0.3, B.w * 0.26), cx = B.x + B.w * 0.42, cy = B.y + B.h * 0.48;
            const o = drawO(x, cx, cy, R, contrast, axis, c);
            M.callout(x, `가는 획 ${o.thin.toFixed(0)}px`, o.thinPt[0], o.thinPt[1], cx + R * 0.95, cy - R - 8, { color: c.ink });
            M.callout(x, `굵은 획 ${o.thick.toFixed(0)}px`, o.thickPt[0], o.thickPt[1], cx + R * 1.2, cy + 14, { color: c.ink });
            tagIn(x, `스트레스 축 ${axis}° · 대비 ${Math.round(contrast * 100)}%`, cx, cy + R + 40, lo, hi, { color: c.key, size: 12 });
          } else if (step === 3) {
            const cw = B.w / 3, R = Math.min(cw * 0.3, B.h * 0.22), cy = B.y + B.h * 0.44, lw = R * 0.24;
            const g1 = arcC(x, B.x + cw * 0.5, cy, R, R, 0.62, lw, c);
            arcC(x, B.x + cw * 1.5, cy, R * 0.86, R * 1.02, 0.42, lw, c);
            const g3 = arcC(x, B.x + cw * 2.5, cy, R * 0.84, R, 0.9, lw, c, -0.12, 1);
            [["지오메트릭", "원 · 고른 굵기"], ["그로테스크", "닫힌 조리개"], ["휴머니스트", "열린 조리개"]].forEach(([a, b], i) => {
              tagIn(x, a, B.x + cw * (i + 0.5), cy + R + 30, lo, hi, { size: 12, color: c.ink });
              M.text(x, b, B.x + cw * (i + 0.5), cy + R + 58, { size: 11, align: "center", color: c.muted });
            });
            M.callout(x, "조리개(열린 틈)", g3[0] + 2, g3[1], g3[0] - 4, B.y + 26, { color: c.key });
            void g1;
          } else if (step === 4) {
            const s = Math.min(B.h * 0.48, B.w * 0.34), bb = B.y + B.h * 0.66;
            const m = hangul(x, B.x + B.w * 0.1, bb, s, true, contrast, c, ap);
            hangul(x, B.x + B.w * 0.56, bb, s, false, contrast, c, ap);
            if (m) {
              M.callout(x, "부리", m.buri[0], m.buri[1], m.buri[0] - 14, m.buri[1] - 22, { color: c.key });
              M.callout(x, "맺음", m.maet[0], m.maet[1], m.maet[0] + 12, m.maet[1] - 30, { color: c.key });
              M.text(x, `가로 ${m.thin.toFixed(0)} : 세로 ${m.stW.toFixed(0)}`, B.x + B.w * 0.1 + s * 0.4, bb + 52, { size: 11, mono: true, align: "center", color: c.muted });
            }
            tagIn(x, "명조", B.x + B.w * 0.1 + s * 0.4, bb + 26, lo, hi, { color: c.key, size: 12.5 });
            tagIn(x, "고딕 · 고른 굵기", B.x + B.w * 0.56 + s * 0.4, bb + 26, lo, hi, { size: 12.5 });
          }
        },
      };
    },
  });

  /* ===================== 2-3 타입 스케일 ===================== */
  LESSONS.push({
    id: "type-scale", ch: 1, order: 3,
    title: "타입 스케일",
    lede: "이 레슨을 마치면 글자 크기를 하나씩 고르지 않고 '사다리'로 만들 수 있습니다. 기본 크기에 한 비율을 거듭 곱하는 모듈러 스케일과, 화면 폭에 따라 크기가 이어지는 유동 타이포를 봅니다.",
    key: "크기는 기본 16px에 한 비율을 거듭 곱해 만들고, 그 사다리에 없는 크기는 쓰지 않습니다.",
    steps: [
      ["기본 크기 16px", "모든 크기는 본문 크기에서 출발합니다. 초록으로 표시된 '본문' 줄을 보세요. 브라우저 기본값이자 <code>1rem</code>인 <b>16px</b>가 화면 본문의 표준이고, 다른 크기는 이것과의 비율로 정합니다."],
      ["비율을 곱한다", "16에 <b>1.25</b>를 곱하면 20, 다시 곱하면 25, 31, 39가 됩니다. 이렇게 한 비율을 거듭 곱한 크기 사다리가 <b>모듈러 스케일</b>(modular scale)입니다. 왼쪽 파란 막대의 길이가 일정한 비율로 늘어나는 것을 보세요. 아래로는 나눠서 small(12.8px)을 얻습니다."],
      ["작은 비율 · 촘촘한 화면", "<b>1.125</b>(장2도)나 1.2(단3도)는 단계 차이가 작아 막대가 거의 같은 길이입니다. 맨 위 태그처럼 h1이 본문의 1.6배 정도라 제목이 조용합니다. 정보가 많은 앱, 대시보드, 설정 화면에 맞습니다."],
      ["큰 비율 · 극적인 화면", "<b>1.5</b>(완전5도)나 <b>1.618</b>(황금비)은 h1이 본문의 6배 이상이 됩니다. 랜딩 페이지, 에디토리얼처럼 첫인상이 중요한 곳에 씁니다. 단계를 4~5개 넘기면 너무 커지므로 단계 수를 줄여서 씁니다."],
      ["유동 타이포", "작은 화면에는 작은 비율, 큰 화면에는 큰 비율이 어울립니다. <code>clamp(최소, 화면 폭 비례, 최대)</code>를 쓰면 크기가 화면 폭에 따라 부드럽게 이어집니다. 위쪽 화면 폭 막대가 움직이는 동안 사다리 전체가 함께 늘고 줄어드는 것을 보세요."],
    ],
    terms: [
      ["모듈러 스케일", "Modular scale", "기본 크기에 일정 비율을 거듭 곱해 만든 크기 목록. 비율을 음정 이름(장2도, 완전4도…)으로 부르기도 합니다."],
      ["rem", "Root em", "루트(html) 글자 크기 기준 단위. 기본 1rem = 16px. 사용자가 브라우저 글자 크기를 키우면 함께 커져서 글자 크기에는 px 대신 씁니다."],
      ["황금비", "Golden ratio", "약 1.618. 단계 차이가 매우 커서 단계를 적게 쓰는 제목 위주의 화면에 어울립니다."],
      ["유동 타이포그래피", "Fluid typography", "화면 폭에 따라 글자 크기가 연속으로 변하는 방식. CSS clamp()와 vw로 만들며, 반응형 제목에 씁니다."],
    ],
    mount(api) {
      const RATIOS = [[1.125, "1.125 장2도"], [1.2, "1.2 단3도"], [1.25, "1.25 장3도"], [1.333, "1.333 완전4도"], [1.5, "1.5 완전5도"], [1.618, "1.618 황금비"]];
      const LV = [["h1", 4], ["h2", 3], ["h3", 2], ["h4", 1], ["본문", 0], ["small", -1]];
      const SR = [2, 2, 0, 5, 3];
      const USE = ["", "", "어울리는 곳: 대시보드 · 설정 화면", "어울리는 곳: 랜딩 · 에디토리얼", ""];
      let step = 0, ri = 2, base = 16, vw = 960, vwTouched = false;
      const root = M.el("div", { class: "dom-stage lt-fill" });
      const wrap = M.el("div", { class: "type-scale" });
      const pRatio = M.el("span", { class: "lt-pill key" }), pMul = M.el("span", { class: "lt-pill" }), pUse = M.el("span", { class: "lt-pill soft" });
      const headRow = M.el("div", { class: "type-scale-head" }, pRatio, pMul, pUse);
      const vp = M.el("div", { class: "type-scale-vp" });
      const vpTrack = M.el("div", { class: "type-scale-vp-track" }), vpMark = M.el("span", { class: "type-scale-vp-mark" }), vpLbl = M.el("span", { class: "type-scale-vp-lbl" });
      vpTrack.append(vpMark, vpLbl);
      vp.append(M.el("span", { class: "type-scale-vp-end" }, "휴대폰 360"), vpTrack, M.el("span", { class: "type-scale-vp-end" }, "1280 데스크톱"));
      const list = M.el("div", { class: "type-scale-list" });
      const rows = LV.map(([n, lv]) => {
        const px = M.el("b"), mul = M.el("small"), bar = M.el("i");
        const smp = M.el("span", { class: "type-scale-sample" }, n === "본문" || n === "small" ? "디자인 기초를 익힙니다" : "디자인");
        const pill = lv === 0 ? M.el("span", { class: "lt-pill c type-scale-basepill" }, "기준 16px = 1rem") : null;
        const r = M.el("div", { class: "type-scale-row" }, M.el("span", { class: "type-scale-name" }, n), M.el("span", { class: "type-scale-px" }, px, mul), M.el("span", { class: "type-scale-bar" }, bar), M.el("span", { class: "type-scale-smp" }, smp, pill));
        list.append(r); return { r, px, mul, smp, bar, pill };
      });
      const note = M.el("p", { class: "type-scale-note" });
      wrap.append(headRow, vp, list, note); root.append(wrap); api.stage.append(root);
      const chips = M.chips(api.controls, { title: "비율", items: RATIOS.map((r) => r[1]), value: ri, onPick: (i) => { ri = i; update(); } });
      M.slider(api.controls, { id: "ts-base", label: "기본 크기", min: 12, max: 20, value: 16, unit: "px", onInput: (v) => { base = v; update(); } });
      const vs = M.slider(api.controls, { id: "ts-vw", label: "화면 폭 (5단계 유동 타이포)", min: 360, max: 1280, step: 10, value: 960, unit: "px", onInput: (v) => { vw = v; vwTouched = true; update(); } });
      const cp = M.copyRow(api.controls);
      const fluid = (lv) => {
        const lo = base * Math.pow(1.2, lv), hi = base * Math.pow(RATIOS[ri][0], lv);
        const t = M.clamp((vw - 360) / 920, 0, 1);
        return { lo, hi, now: lo + (hi - lo) * t };
      };
      const r2 = (v) => +v.toFixed(3);
      function update() {
        const r = RATIOS[ri][0];
        const sizes = LV.map(([, lv]) => (step === 4 ? fluid(lv).now : base * Math.pow(r, lv)));
        const maxS = step === 4 ? fluid(4).hi : sizes[0];
        const availW = Math.max(120, list.clientWidth - (list.clientWidth < 420 ? 150 : 240));
        const lh = fixedStage() ? list.clientHeight : 420;
        const compact = lh < 330;
        wrap.classList.toggle("compact", compact);
        const minRow = compact ? 17 : 31, availH = lh - (compact ? 16 : 28) - 5 * (compact ? 2 : 6);
        let f = Math.min(1, availW / (sizes[0] * 3.2));
        for (let i = 0; i < 40 && sizes.reduce((a, s) => a + Math.max(minRow, s * f * 1.2), 0) > availH; i++) f *= 0.95;
        rows.forEach((o, i) => {
          const s = sizes[i];
          o.smp.style.fontSize = s * f + "px";
          o.px.textContent = (Math.round(s * 10) / 10) + "px";
          o.mul.textContent = LV[i][1] === 0 ? "기준" : (step === 4 ? "" : (LV[i][1] > 0 ? "×" : "÷") + r);
          o.bar.style.width = Math.min(100, (s / maxS) * 100) + "%";
          o.r.classList.toggle("dim", step === 0 && LV[i][1] !== 0);
          o.r.classList.toggle("base", LV[i][1] === 0);
          if (o.pill) o.pill.hidden = step !== 0;
        });
        const ratio = step === 4 ? sizes[0] / sizes[4] : Math.pow(r, 4);
        pRatio.textContent = step === 4 ? `비율 1.2 → ${r}` : `비율 ${r}`;
        pMul.textContent = `h1 ÷ 본문 = ${ratio.toFixed(2)}배`;
        pUse.textContent = USE[step]; pUse.hidden = !USE[step];
        note.textContent = f < 0.995 ? `무대에 맞춰 실제 크기의 ${Math.round(f * 100)}%로 줄여 보여 줍니다` : "실제 크기";
        vpMark.style.left = ((vw - 360) / 920) * 100 + "%"; vpLbl.textContent = `${Math.round(vw)}px`; vpLbl.style.left = ((vw - 360) / 920) * 100 + "%";
        if (step === 4) {
          const lines = LV.filter(([, lv]) => lv >= 0).map(([, lv]) => {
            const { lo, hi } = fluid(lv); const slope = (hi - lo) / 920, icpt = lo - slope * 360;
            return `--step-${lv}: clamp(${r2(lo / 16)}rem, ${r2(icpt / 16)}rem + ${r2(slope * 100)}vw, ${r2(hi / 16)}rem);`;
          });
          cp.textContent = lines.reverse().join(" ");
          api.code([":root {", ...lines.map((l) => "  " + l), "}", "h1 { font-size: var(--step-4); }", "p  { font-size: var(--step-0); }"].join("\n"), [[1, 5]], "CSS · clamp()");
        } else {
          const lines = LV.map(([, lv]) => `--step-${lv}: ${r2(Math.pow(r, lv) * base / 16)}rem;`);
          cp.textContent = lines.join(" ");
          const HL = [[[5, 5]], [[1, 6]], [[1, 4]], [[1, 4]]];
          api.code([":root {", ...lines.map((l, i) => "  " + l + `  /* ${(Math.round(base * Math.pow(r, LV[i][1]) * 10) / 10)}px */`), "}", "h1 { font-size: var(--step-4); }", "p  { font-size: var(--step-0); }"].join("\n"), HL[step], "CSS · 타입 스케일");
        }
      }
      const ro = new ResizeObserver(() => update());
      ro.observe(list);
      return {
        setStep(s) {
          step = s; ri = SR[s]; chips.set(ri); vwTouched = false;
          wrap.classList.toggle("fluid", s === 4);
          update();
        },
        frame(time) {
          if (step === 4 && !vwTouched) {
            const { p, back } = M.pingpong(time, 2600, 600);
            const e = M.ease.inOut(p);
            vw = 360 + 920 * (back ? 1 - e : e); vs.set(Math.round(vw / 10) * 10); update();
          }
        },
        destroy() { ro.disconnect(); },
      };
    },
  });

  /* ===================== 2-4 행 길이와 행간 ===================== */
  LESSONS.push({
    id: "measure", ch: 1, order: 4,
    title: "행 길이와 행간",
    lede: "이 레슨을 마치면 본문을 편하게 읽히게 하는 두 숫자, 한 줄의 길이와 줄 사이 간격을 정할 수 있습니다. 시선이 실제로 어떻게 움직이는지 보며 알맞은 범위를 익힙니다.",
    key: "본문은 한 줄 45~75자(한글 30~40자), 행간 1.4~1.7. 글자가 커질수록 행간은 줄입니다.",
    steps: [
      ["너무 긴 줄", "한 줄이 너무 길면 줄 끝에서 다음 줄 처음으로 돌아가는 시선 이동이 길어집니다. 빨간 화살표가 그 되돌아가는 길이고, 태그가 거리입니다. 길이 멀수록 같은 줄을 다시 읽거나 한 줄을 건너뛰기 쉽습니다."],
      ["너무 짧은 줄", "반대로 줄이 너무 짧으면 시선이 몇 글자마다 꺾입니다. 화살표 수가 크게 늘어난 것을 보세요. 단어가 어색하게 끊기고 오른쪽 끝이 들쭉날쭉해져(래그, rag) 읽는 박자가 계속 끊깁니다."],
      ["알맞은 길이", "영문 본문은 한 줄 <b>45~75자</b>(66자가 이상적), 한글은 글자 폭이 넓어 <b>30~40자</b> 안팎이 편합니다. 이 폭을 <b>메저</b>(measure)라고 부릅니다. CSS에서는 <code>max-width: 65ch</code>나 <code>36em</code>처럼 글자 단위로 정하면 글자 크기가 바뀌어도 글자 수가 유지됩니다."],
      ["행간이 좁으면", "줄 사이가 글자 크기의 1.1배로 좁으면 윗줄과 아랫줄이 엉겨 다음 줄을 찾기 어렵습니다. 주황 띠가 줄 사이 여백(줄 높이 − 글자 크기)인데, 글자 크기의 0.1배인 2px 남짓으로 거의 사라졌습니다. 한글은 받침 때문에 글자가 위아래로 꽉 차 있어 더 답답해 보입니다."],
      ["알맞은 행간과 문단 간격", "본문 행간(line-height)은 <b>1.4~1.7</b>, 한글은 1.6 안팎이 무난합니다. 문단 사이는 초록 띠처럼 한 줄 높이 정도(<code>1em</code>~<code>1.5em</code>)를 띄워 줄 사이 주황 띠보다 확실히 넓게 둡니다. 둘이 비슷하면 문단이 구분되지 않습니다."],
      ["큰 글자는 행간을 줄인다", "행간은 글자 크기에 곱하는 값이라, 큰 제목에 본문 값 1.6을 그대로 쓰면 왼쪽처럼 줄 사이가 지나치게 벌어집니다. 두 제목의 주황 띠 두께를 비교해 보세요. 제목은 <b>1.1~1.3</b>으로 줄이고, 글자가 클수록 행간 배수는 작게 둡니다."],
    ],
    terms: [
      ["메저", "Measure · Line length", "한 줄의 길이. 보통 글자 수로 세고, 본문 칼럼 폭을 정할 때 씁니다."],
      ["행간", "Line height · Leading", "줄과 줄 사이의 간격. CSS line-height는 단위 없이 글자 크기에 대한 배수(1.6)로 쓰는 것이 기본입니다."],
      ["래그", "Rag", "왼쪽 정렬 글의 들쭉날쭉한 오른쪽 끝. 너무 거칠면 읽는 흐름이 끊겨, 편집 디자인에서 줄바꿈을 손보는 이유가 됩니다."],
      ["ch 단위", "ch unit", "숫자 0의 폭을 기준으로 한 CSS 길이 단위. max-width: 65ch ≈ 영문 65자로 메저를 정할 때 씁니다."],
    ],
    mount(api) {
      const TXT = {
        ko: ["글을 읽을 때 눈은 한 줄을 따라가다가 끝에서 다음 줄의 처음으로 크게 돌아옵니다. 줄이 너무 길면 이 되돌아가는 길이 멀어져 같은 줄을 다시 읽거나 한 줄을 건너뛰기 쉽습니다.", "반대로 줄이 너무 짧으면 시선이 자주 꺾이고 단어가 어색하게 끊깁니다. 알맞은 행 길이와 행간은 독자가 글자를 의식하지 않고 내용에 머물게 해 줍니다."],
        en: ["When we read, the eye follows a line to its end and then sweeps back to the start of the next one. If lines run too long, that return trip gets lost and readers repeat or skip lines.", "If lines are too short, the eye breaks its rhythm too often and words split awkwardly. A comfortable measure and leading let readers forget the type and stay with the words."],
      };
      const S = [{ n: 90, lh: 1.6 }, { n: 13, lh: 1.6 }, { n: 34, lh: 1.6 }, { n: 34, lh: 1.1 }, { n: 34, lh: 1.65 }, { n: 34, lh: 1.65 }];
      let step = 0, lang = "ko", n = 90, lh = 1.6, fsz = 16;
      const root = M.el("div", { class: "dom-stage lt-fill" });
      const wrap = M.el("div", { class: "measure" });
      const hA = M.el("h3", { class: "measure-h loose" }, "글자가 커지면 행간을 줄입니다"), hB = M.el("h3", { class: "measure-h tight" }, "글자가 커지면 행간을 줄입니다");
      const hs = M.el("div", { class: "measure-hs" },
        M.el("div", {}, M.el("small", {}, "line-height 1.6 (본문 값 그대로)"), hA),
        M.el("div", {}, M.el("small", {}, "line-height 1.15"), hB));
      const ruler = M.el("div", { class: "measure-ruler" });
      const text = M.el("div", { class: "measure-text" });
      const probe = M.el("span", { class: "measure-probe" }, "");
      const tag = M.el("div", { class: "measure-tag" });
      wrap.append(hs, tag, ruler, text, probe); root.append(wrap); api.stage.append(root);
      const notes = domNotes(wrap, { anim: false });
      const g = document.createElementNS(NS, "g"); notes.svg.prepend(g);
      const sn = M.slider(api.controls, { id: "measure-n", label: "한 줄 폭 (글자 수)", min: 10, max: 100, value: 90, unit: "자", onInput: (v) => { n = v; update(); } });
      const sl = M.slider(api.controls, { id: "measure-lh", label: "행간 line-height", min: 1, max: 2.2, step: 0.05, value: 1.6, fmt: (v) => v.toFixed(2), onInput: (v) => { lh = v; update(); } });
      M.chips(api.controls, { title: "언어", items: ["한글", "English"], value: 0, onPick: (i) => { lang = i ? "en" : "ko"; fill(); update(); } });
      const ro = M.readout(api.controls);
      const range = document.createRange();
      function fill() {
        text.innerHTML = ""; text.lang = lang;
        TXT[lang].forEach((p) => text.append(M.el("p", {}, p)));
        wrap.classList.toggle("en", lang === "en");
      }
      /* 한 요소 안 글줄들의 사각형(줄마다 하나) */
      function lineRects(el, wr) {
        range.selectNodeContents(el);
        const out = [];
        for (const q of range.getClientRects()) {
          if (q.width < 2) continue;
          const t = q.top - wr.top, b = q.bottom - wr.top, l = q.left - wr.left, r = q.right - wr.left;
          const same = out.find((o) => Math.abs(o.t - t) < 3);
          if (same) { same.l = Math.min(same.l, l); same.r = Math.max(same.r, r); } else out.push({ t, b, l, r });
        }
        return out.sort((a, b) => a.t - b.t);
      }
      function fitFont() {
        // 폭 전환 애니메이션을 잠시 끄고 최종 배치로 글자 크기를 맞춘 뒤 다시 애니메이션
        const prev = text.getBoundingClientRect().width;
        text.style.transition = ruler.style.transition = "none";
        let f = fixedStage() ? 20 : 15;
        const unit = lang === "ko" ? "em" : "ch";
        text.style.width = ruler.style.width = n + unit;
        wrap.style.setProperty("--mfs", f + "px");
        if (fixedStage()) {
          const H = root.clientHeight - 6;
          while (f > 12 && wrap.scrollHeight > H) { f -= 0.5; wrap.style.setProperty("--mfs", f + "px"); }
        }
        fsz = f;
        const fin = text.style.width;
        text.style.width = ruler.style.width = prev - 0 + "px"; void text.offsetWidth;
        text.style.transition = ruler.style.transition = "";
        text.style.width = ruler.style.width = fin;
      }
      function update() {
        const unit = lang === "ko" ? "em" : "ch";
        text.style.lineHeight = lh;
        text.style.setProperty("--measure-pgap", step >= 4 ? "1.1em" : lh * 0.35 + "em");
        wrap.classList.toggle("short", n < 20);
        fitFont();
        probe.style.width = "10" + unit;
        const upx = probe.getBoundingClientRect().width / 10 || 15;
        const maxW = wrap.clientWidth - 26;
        const real = Math.min(n, Math.floor((Math.min(maxW, n * upx)) / upx + 0.01));
        ruler.innerHTML = "";
        for (let k = 10; k <= real; k += 10) ruler.append(M.el("span", { style: `left:${k}${unit}` }, k + ""));
        const [lo, hi] = lang === "ko" ? [30, 40] : [45, 75];
        const okN = real >= lo && real <= hi, okL = lh >= 1.4 && lh <= 1.75;
        tag.innerHTML = "";
        tag.append(M.el("span", { class: "lt-pill " + (okN ? "ok" : "bad") }, `한 줄 ≈ ${real}자 ${okN ? "✓" : "✕"}`), M.el("span", { class: "lt-pill " + (okL ? "ok" : "bad") }, `행간 ${lh.toFixed(2)} ${okL ? "✓" : "✕"}`), M.el("span", { class: "lt-pill soft" }, `권장 ${lang === "ko" ? "30~40자" : "45~75자"} · 1.4~1.7`));
        ro.textContent = `글자 ${fsz}px · 줄 높이 ${(fsz * lh).toFixed(1)}px${real < n ? ` · 무대 폭 때문에 ${real}자에서 잘림` : ""}`;
        const HL = [[[1, 1]], [[1, 1]], [[1, 1]], [[2, 2]], [[2, 3]], [[5, 5]]];
        api.code(["p {", `  max-width: ${n}${unit};      /* 메저 */`, `  line-height: ${lh.toFixed(2)};       /* 행간 */`, "  margin-block: 0 1.1em;  /* 문단 간격 > 줄 간격 */", "}", "h1 { line-height: 1.15; }  /* 큰 글자는 행간을 줄인다 */"].join("\n"), HL[step], "CSS · 메저와 행간");
      }
      function overlay() {
        const wr = wrap.getBoundingClientRect();
        const c = M.col();
        let svg = "";
        const N = [];
        const ps = [...text.querySelectorAll("p")];
        if (step <= 2) {
          const L = lineRects(ps[0], wr);
          const bad = step !== 2 && !(n >= (lang === "ko" ? 30 : 45) && n <= (lang === "ko" ? 40 : 75));
          const col = bad ? c.b : c.c;
          const lim = Math.min(L.length - 1, step === 1 ? 12 : 3);
          for (let i = 0; i < lim; i++) {
            const a = L[i], b = L[i + 1];
            const y0 = (a.t + a.b) / 2, y1 = (b.t + b.b) / 2;
            const mx = (a.r + b.l) / 2;
            svg += `<path d="M${a.r + 3},${y0} Q${mx},${(y0 + y1) / 2 + 2} ${b.l - 2},${y1 - 1}" fill="none" stroke="${col}" stroke-width="1.5" stroke-dasharray="5 4" opacity=".6"/>`;
            const ang = Math.atan2(y1 - 1 - (y0 + y1) / 2, b.l - 2 - mx), s = 7, ex = b.l - 2, ey = y1 - 1;
            svg += `<path d="M${ex},${ey} L${ex - s * Math.cos(ang - 0.45)},${ey - s * Math.sin(ang - 0.45)} L${ex - s * Math.cos(ang + 0.45)},${ey - s * Math.sin(ang + 0.45)} Z" fill="${col}"/>`;
          }
          if (L.length > 1) {
            const a = L[0], b = L[1];
            const total = ps.reduce((s, p) => s + lineRects(p, wr).length, 0);
            const txt = step === 1 ? `줄바꿈 ${total - ps.length}번` : `되돌아가는 거리 ${Math.round(a.r - b.l)}px`;
            N.push({ rect: { left: (a.r + b.l) / 2 - 1, top: (a.b + b.t) / 2 - 1, width: 2, height: 2 }, side: step === 1 ? "right" : "bottom", off: step === 1 ? Math.max(40, a.r - (a.r + b.l) / 2 + 30) : 30, text: txt, tone: bad ? "b" : "c" });
          }
        } else {
          const targets = step === 5 ? [hA, hB] : [ps[0]];
          targets.forEach((el, ti) => {
            // 줄 상자 높이(L) - 글자 크기(em 상자) = 줄 사이 여백. 글줄마다 em 상자 사이를 칠한다
            const L = lineRects(el, wr), er = el.getBoundingClientRect(), cs = getComputedStyle(el);
            const fsz = parseFloat(cs.fontSize), LH = parseFloat(cs.lineHeight) || fsz * lh;
            const top0 = er.top - wr.top + parseFloat(cs.paddingTop || 0), gapH = LH - fsz;
            const l = Math.min(...L.map((q) => q.l)), r = Math.max(...L.map((q) => q.r));
            for (let i = 0; i < L.length - 1; i++) {
              const y = top0 + i * LH + (LH + fsz) / 2;
              svg += `<rect x="${l}" y="${gapH > 1.5 ? y : y - 0.75}" width="${r - l}" height="${Math.max(1.5, gapH)}" fill="${M.alpha(c.key, 0.5)}"/>`;
            }
            if (L.length > 1) {
              const y = top0 + (LH + fsz) / 2;
              N.push({ rect: { left: r - 1, top: y + gapH / 2 - 1, width: 2, height: 2 }, side: step === 5 ? "bottom" : "right", off: step === 5 ? 18 : 16, dx: step === 5 ? -60 : 0,
                text: `줄 사이 여백 (${(LH / fsz).toFixed(2)}−1)×${Math.round(fsz)} = ${Math.round(gapH)}px`, tone: gapH < fsz * 0.25 ? "b" : null });
            }
          });
          if (step === 4 && ps[1]) {
            const a = ps[0].getBoundingClientRect(), b = ps[1].getBoundingClientRect();
            const gt = a.bottom - wr.top, gb = b.top - wr.top, lx = a.left - wr.left;
            svg += `<rect x="${lx}" y="${gt}" width="${a.width}" height="${gb - gt}" fill="${M.alpha(c.c, 0.45)}"/>`;
            N.push({ rect: { left: lx + a.width * 0.35, top: (gt + gb) / 2 - 1, width: 2, height: 2 }, side: "right", off: 30, text: `문단 간격 ${Math.round(gb - gt)}px`, tone: "c" });
          }
        }
        if (g.innerHTML !== svg) g.innerHTML = svg;
        notes.set(N);
      }
      fill();
      const rObs = new ResizeObserver(() => update());
      rObs.observe(root);
      return {
        setStep(s) {
          step = s; n = S[s].n; lh = S[s].lh; sn.set(n); sl.set(lh);
          wrap.classList.toggle("s-head", s === 5);
          update();
        },
        frame() { overlay(); },
        destroy() { rObs.disconnect(); },
      };
    },
  });

  /* ===================== 2-5 커닝 · 트래킹 · 리딩 ===================== */
  LESSONS.push({
    id: "kerning-tracking", ch: 1, order: 5,
    title: "커닝 · 트래킹 · 리딩",
    lede: "이 레슨을 마치면 글자 사이를 다루는 세 가지 말을 구분해 쓸 수 있습니다. 특정 두 글자 사이(커닝), 단어 전체의 자간(트래킹), 줄 사이(리딩). 이름을 구분하면 무엇을 고쳐야 할지 분명해집니다.",
    key: "큰 제목은 자간을 조이고 작은 대문자 라벨은 넓히되, 본문 자간과 서체의 커닝은 그대로 둡니다.",
    steps: [
      ["글자 상자", "디지털 글자는 저마다 폭을 가진 상자에 들어 있습니다. 이 폭이 <b>어드밴스</b>(advance)이고, 잉크 양옆의 노란 여백이 <b>사이드 베어링</b>(side bearing)입니다. 상자를 그대로 나란히 붙이면 빨간 쐐기처럼 A와 V같이 사선끼리 만나는 곳에 큰 빈틈이 생깁니다."],
      ["커닝", "특정 글자 쌍의 간격만 따로 조정하는 것이 <b>커닝</b>(kerning)입니다. 흐린 글자가 커닝 전, 진한 글자가 커닝 후이고, 아래 태그가 쌍마다 줄인 양(1/1000em 단위)입니다. 서체는 AV, To 같은 쌍의 값을 표로 갖고 있고, 브라우저는 기본으로 이 표를 적용합니다."],
      ["트래킹", "단어 전체의 글자 사이를 고르게 넓히거나 좁히는 것이 <b>트래킹</b>(tracking)이고, CSS에선 <code>letter-spacing</code>입니다. 아래 초록 막대가 모든 글자 사이에 똑같이 더해진 양입니다. 커닝은 쌍마다 다르고, 트래킹은 모든 사이에 같은 값을 더한다는 점이 다릅니다."],
      ["크기에 따라 반대로", "서체는 본문 크기에 맞춰 간격이 설계돼 있습니다. 그래서 큰 제목은 간격이 헐거워 보여 <code>-0.02em</code> 안팎으로 조이고, 작은 대문자 라벨은 답답해 보여 <code>+0.08em</code> 안팎으로 넓힙니다. 위아래 흐린 줄(조정 전)과 진한 줄(조정 후)을 비교해 보세요. 본문은 건드리지 않습니다."],
      ["리딩", "줄과 줄 사이 간격이 <b>리딩</b>(leading)입니다. 금속 활자 시절 줄 사이에 끼우던 <b>납(lead) 띠</b>에서 온 말입니다. 주황 띠가 그 납 띠 자리이고, 아래 식처럼 CSS <code>line-height</code>는 베이스라인 사이 거리 전체를 정합니다. 남는 공간은 글줄 위아래에 반씩 나뉩니다."],
      ["옵티컬 보정", "숫자로 똑같이 맞추면 눈에는 다르게 보입니다. O처럼 둥근 글자는 H와 높이가 같으면 작아 보여서, 빨간 부분처럼 베이스라인과 대문자 높이 밖으로 살짝 넘치게 그립니다. 이것이 <b>오버슈트</b>(overshoot)입니다. 아이콘이나 로고의 원과 사각형을 맞출 때도 같은 보정을 합니다."],
    ],
    terms: [
      ["커닝", "Kerning", "특정 글자 쌍 사이의 간격 조정. 서체 안의 kern 표에 들어 있고, CSS font-kerning으로 켜고 끕니다. 로고 글자는 손으로 다시 맞춥니다."],
      ["트래킹", "Tracking · Letter-spacing", "글자 전체에 고르게 더하는 간격. CSS letter-spacing에 em 단위로 씁니다."],
      ["리딩", "Leading", "줄 사이 간격. 금속 활자의 납 띠에서 유래했고, CSS에서는 line-height로 정합니다."],
      ["사이드 베어링", "Side bearing", "글리프 잉크 양옆에 미리 들어 있는 여백. 서체 디자이너가 기본 간격을 정하는 곳입니다."],
      ["오버슈트", "Overshoot", "둥글거나 뾰족한 글자를 기준선 밖으로 조금 넘겨 그려 같은 크기로 보이게 하는 옵티컬 보정."],
    ],
    mount(api) {
      const cv = fillCanvas(api, 420);
      const KP = { AV: -80, VA: -80, AT: -70, TA: -70, AW: -60, WA: -60, AY: -75, YA: -75, Ty: -90, Te: -60, To: -80, yp: -10, VE: -15, AR: -15 };
      const WORDS = ["AVATAR", "WAVE", "Type"];
      const S = [{ kern: 0, track: 0 }, { kern: 1, track: 0 }, { kern: 1, track: 0.08 }, { kern: 1, track: 0 }, { kern: 1, track: 0 }, { kern: 1, track: 0 }];
      let step = 0, wi = 0, kernT = 0, track = 0, trackTouched = false;
      const cur = { kern: 0, track: 0 };
      M.chips(api.controls, { title: "단어", items: WORDS, value: 0, onPick: (i) => (wi = i) });
      const kc = M.check(api.controls, { id: "kt-kern", label: "커닝 적용 (font-kerning)", onChange: (v) => (kernT = v ? 1 : 0) });
      const ts = M.slider(api.controls, { id: "kt-track", label: "트래킹 letter-spacing", min: -0.1, max: 0.3, step: 0.01, value: 0, fmt: (v) => (v > 0 ? "+" : "") + v.toFixed(2) + "em", onInput: (v) => { track = v; trackTouched = true; } });
      const ro = M.readout(api.controls);
      const CODE = [
        "h1 {",
        "  font-size: 64px;",
        "  letter-spacing: -0.02em;  /* 트래킹: 큰 제목은 조인다 */",
        "  line-height: 1.1;         /* 리딩 */",
        "}",
        ".label {",
        "  font-size: 12px;",
        "  text-transform: uppercase;",
        "  letter-spacing: 0.08em;   /* 작은 대문자는 넓힌다 */",
        "}",
        "body {",
        "  font-kerning: normal;     /* 서체의 커닝 쌍 사용 (기본값) */",
        "}",
      ].join("\n");
      const HL = [[], [[10, 12]], [[2, 2]], [[2, 2], [5, 8]], [[3, 3]], []];
      const FAM = FS.sans;
      function layout(x, word, size, kern, trk) {
        x.font = tf(size, FAM, 600);
        const g = []; let px = 0;
        for (let i = 0; i < word.length; i++) {
          const ch = word[i], m = x.measureText(ch);
          g.push({ ch, x: px, adv: m.width, l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight });
          const k = i < word.length - 1 ? (KP[ch + word[i + 1]] || 0) : 0;
          g[i].k = k;
          px += m.width + (i < word.length - 1 ? (k / 1000) * size * kern + trk * size : 0);
        }
        return { g, width: px };
      }
      return {
        setStep(s) {
          step = s; kernT = S[s].kern; kc.set(!!kernT); track = S[s].track; ts.set(track); trackTouched = false;
          if (s === 0) cur.kern = 0;
          api.code(CODE, HL[s], "CSS · 글자 간격");
        },
        frame(time, dt) {
          if (step === 2 && !trackTouched) { const { p, back } = M.pingpong(time, 1600, 500); const e = M.ease.inOut(p); track = M.lerp(-0.04, 0.2, back ? 1 - e : e); ts.set(+track.toFixed(2)); }
          ease(cur, { kern: kernT, track }, dt, step === 1 ? 900 : 300);
          const { x, w, h } = M.fit(cv), c = M.col();
          x.fontKerning = "none";
          ro.textContent = `font-kerning: ${kernT ? "normal" : "none"}; letter-spacing: ${track.toFixed(2)}em;`;
          if (step <= 2) {
            const word = WORDS[wi];
            const size = Math.min(200, (w - (step === 0 ? 110 : 60)) / (word.length * 0.74), h * 0.42);
            const L = layout(x, word, size, cur.kern, cur.track);
            const ox = (w - L.width) / 2, base = h * 0.56;
            x.font = tf(size, FAM, 600); const H = x.measureText("H");
            const asc = H.actualBoundingBoxAscent, dsc = size * 0.08;
            const bt = base - asc - 8, bh = asc + dsc + 16;
            if (step === 1 || cur.kern < 0.99) {
              const G = layout(x, word, size, 0, cur.track);
              x.font = tf(size, FAM, 600); x.textAlign = "left"; x.textBaseline = "alphabetic";
              x.fillStyle = M.alpha(c.ink, 0.13); G.g.forEach((q) => x.fillText(q.ch, (w - G.width) / 2 + q.x, base));
            }
            M.line(x, 16, base, w - 16, base, M.alpha(c.a, 0.5), 1, [4, 4]);
            let widest = -1;
            L.g.forEach((q, i) => {
              const gx = ox + q.x;
              if (step === 0) {
                x.fillStyle = M.alpha(c.a, 0.1); x.fillRect(gx, bt, q.adv, bh);
                x.fillStyle = M.alpha(c.key, 0.4);
                const il = gx - q.l, ir = gx + q.r;
                if (il > gx) x.fillRect(gx, bt, il - gx, bh);
                if (ir < gx + q.adv) x.fillRect(ir, bt, gx + q.adv - ir, bh);
                x.strokeStyle = M.alpha(c.a, 0.9); x.lineWidth = 1.25; x.strokeRect(gx + 0.5, bt, q.adv - 1, bh);
                if (i < L.g.length - 1 && widest < 0 && /^(AV|VA|AW|WA|AT|TA|AY|YA|To|Ty)$/.test(q.ch + L.g[i + 1].ch)) widest = i;
              }
              x.font = tf(size, FAM, 600); x.fillStyle = c.ink; x.textAlign = "left"; x.textBaseline = "alphabetic"; x.fillText(q.ch, gx, base);
              if (i < L.g.length - 1) {
                const jx = gx + q.adv + ((q.k / 1000) * size * cur.kern) / 2;
                if (step === 1 && q.k) {
                  M.line(x, jx, base + 10, jx, base + 22, c.key, 2);
                  M.tag(x, q.k + "", jx, base + 36, { align: "center", mono: true, size: 11.5, color: c.ink, fill: undefined });
                }
                if (step === 2) {
                  const tw = cur.track * size;
                  const bx = gx + q.adv + (q.k / 1000) * size * cur.kern;
                  M.rrect(x, Math.min(bx, bx + tw), base + 16, Math.max(2, Math.abs(tw)), 10, 2);
                  x.fillStyle = M.alpha(tw >= 0 ? c.c : c.b, 0.6); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
                }
              }
            });
            if (step === 0) {
              const q0 = L.g[Math.min(2, L.g.length - 1)], a0 = ox + q0.x;
              M.line(x, a0, bt - 12, a0 + q0.adv, bt - 12, c.a, 1.5);
              M.line(x, a0, bt - 17, a0, bt - 7, c.a, 1.5); M.line(x, a0 + q0.adv, bt - 17, a0 + q0.adv, bt - 7, c.a, 1.5);
              M.tag(x, `어드밴스 폭 ${Math.round(q0.adv)}px`, a0 + q0.adv / 2, bt - 30, { align: "center", color: c.a });
              const last = L.g[L.g.length - 1], lx = ox + last.x;
              if (last.r < last.adv) {
                const sx = lx + last.r + (last.adv - last.r) / 2, sbw = tagW(x, "사이드 베어링");
                const right = sx + 12 + sbw < w - 8;
                M.callout(x, "사이드 베어링", sx, bt + bh * 0.85, right ? sx + 12 : sx - 12, base + 44, { color: c.ink, align: right ? "left" : "right" });
              }
              if (widest >= 0) {
                // 사선끼리 만나는 쌍: 위쪽이 넓게 벌어진 쐐기 모양 빈틈
                const q = L.g[widest], nq = L.g[widest + 1];
                const ax0 = ox + q.x, bx0 = ox + nq.x, capY = base - asc;
                const topA = q.ch === "A" ? ax0 + q.adv * 0.56 : ax0 + q.r, topB = nq.ch === "A" ? bx0 + nq.adv * 0.44 : bx0 - nq.l;
                const botA = q.ch === "A" ? ax0 + q.r : ax0 + q.adv * 0.56, botB = nq.ch === "A" ? bx0 - nq.l : bx0 + nq.adv * 0.44;
                x.beginPath(); x.moveTo(topA, capY); x.lineTo(topB, capY); x.lineTo(botB, base); x.lineTo(botA, base); x.closePath();
                x.fillStyle = M.alpha(c.b, 0.35); x.fill(); x.strokeStyle = c.b; x.lineWidth = 1.25; x.stroke();
                const gw = Math.max(Math.abs(topB - topA), Math.abs(botB - botA));
                M.callout(x, `${q.ch}${nq.ch} 사이 빈틈 최대 ${Math.round(gw)}px`, (topA + topB) / 2, capY + 4, Math.max(16 + tagW(x, `${q.ch}${nq.ch} 사이 빈틈 최대 ${Math.round(gw)}px`), (topA + topB) / 2 - 10), w < 520 ? base + 74 : bt - 26, { color: c.b, align: "right" });
              }
            }
            const msg = step === 0 ? "파란 상자 = 어드밴스 폭 · 노란 띠 = 사이드 베어링" : step === 1 ? "숫자 = 커닝 값 (1/1000em) · 흐린 글자 = 커닝 전" : `letter-spacing ${(cur.track >= 0 ? "+" : "") + cur.track.toFixed(2)}em → 모든 사이에 ${(cur.track * size).toFixed(1)}px`;
            M.text(x, msg, 16, h - 12, { mono: true, size: 11.5, color: c.muted });
            if (step === 2) M.tag(x, `+${(cur.track * size).toFixed(0)}px × ${word.length - 1}곳`, w / 2, base + 50, { align: "center", color: cur.track >= 0 ? c.c : c.b });
          } else if (step === 3) {
            const narrow = w < 520;
            const big = Math.min(84, w / (narrow ? 6.2 : 8.5), h * 0.17), sm = Math.max(12, Math.min(15, h * 0.035));
            const rows = [[0, big, "Heading", 0, "letter-spacing: 0"], [1, big, "Heading", -0.03, "-0.03em 조임"], [2, sm, "SECTION LABEL", 0, "letter-spacing: 0"], [3, sm, "SECTION LABEL", 0.1, "+0.10em 넓힘"]];
            const totalH = big * 2.1 + sm * 2.4 + (narrow ? 4 * 30 : 3 * 22) + 30;
            let y = Math.max(16, (h - totalH) / 2);
            const lx = narrow ? 16 : 190;
            rows.forEach(([i, size, s, ls, note]) => {
              const good = i % 2 === 1;
              if (narrow) { M.tag(x, note, 16, y + 10, { size: 11, mono: true, color: good ? c.key : c.muted }); y += 24; }
              const by = y + size * 0.85;
              x.letterSpacing = (ls * size).toFixed(2) + "px";
              T(x, s, lx, by, size, FAM, good ? c.ink : M.alpha(c.ink, 0.4), { weight: size > 20 ? 700 : 600 });
              x.letterSpacing = "0px";
              if (!narrow) M.tag(x, note, 16, by - Math.min(size, 40) * 0.35, { size: 11, mono: true, color: good ? c.key : c.muted });
              y += size * 1.05 + (narrow ? 6 : 16) + (i === 1 ? 16 : 0);
              if (i === 1) M.line(x, 16, y - 12, w - 16, y - 12, c.line, 1);
            });
          } else if (step === 4) {
            const pp = M.pingpong(time, 1800, 700), pe = M.ease.inOut(pp.p);
            const size = Math.min(56, w / 11, h / 6.5), lhv = 1.1 + 0.5 * (pp.back ? 1 - pe : pe);
            const L = size * lhv, lines = ["Lines of metal type", "were spaced apart", "with strips of lead."];
            x.font = tf(size, FAM, 500); const m = x.measureText("Hg"), asc = m.actualBoundingBoxAscent, dsc = m.actualBoundingBoxDescent;
            const ox = 40, top = (h - L * 3) / 2 - 14;
            lines.forEach((t, i) => {
              const by = top + i * L + (L + asc - dsc) / 2;
              if (i < 2) {
                const gTop = by + dsc, gBot = by + L - asc;
                if (gBot > gTop) part(x, ox - 10, gTop, w - 2 * ox + 20, gBot - gTop, 2, c.key, { ta: 0.45, lw: 1 });
                if (i === 0) M.tag(x, `납 띠(lead) ${Math.max(0, gBot - gTop).toFixed(0)}px`, w - ox + 10, (gTop + gBot) / 2, { align: "right", size: 11, mono: true });
                if (i === 0) { M.arrow(x, ox - 22, by, ox - 22, by + L - 2, c.a); M.arrow(x, ox - 22, by + L, ox - 22, by + 2, c.a); }
              }
              M.line(x, ox - 10, by, w - ox + 10, by, M.alpha(c.a, 0.6), 1, [4, 3]);
              T(x, t, ox, by, size, FAM, c.ink, { weight: 500 });
            });
            M.tag(x, `${size.toFixed(0)}px × line-height ${lhv.toFixed(2)} = 베이스라인 간격 ${L.toFixed(0)}px`, w / 2, h - 18, { align: "center", mono: true, size: 11.5, color: c.a });
          } else {
            const size = Math.min(230, h * 0.58, w / 3.2);
            x.font = tf(size, FAM, 600);
            const mH = x.measureText("H"), mO = x.measureText("O");
            const tw = mH.width + mO.width, ox = Math.max(16, (w - tw) / 2 - (w > 560 ? w * 0.1 : 0)), base = h * 0.74;
            const cap = mH.actualBoundingBoxAscent, oTop = mO.actualBoundingBoxAscent, oBot = mO.actualBoundingBoxDescent;
            M.line(x, 12, base, w - 12, base, c.a, 1.25); M.line(x, 12, base - cap, w - 12, base - cap, c.a, 1.25);
            M.tag(x, "베이스라인", 14, base + 16, { size: 11, color: c.a });
            M.tag(x, "대문자 높이", 14, base - cap - 16, { size: 11, color: c.a });
            const blink = 0.5 + 0.5 * Math.sin(time / 300);
            x.fillStyle = M.alpha(c.b, 0.3 + 0.3 * blink);
            const ox2 = ox + mH.width;
            x.fillRect(ox2, base - oTop, mO.width, Math.max(1.5, oTop - cap)); x.fillRect(ox2, base, mO.width, Math.max(1.5, oBot));
            T(x, "HO", ox, base, size, FAM, c.ink, { weight: 600 });
            const osl = `오버슈트 위 ${(oTop - cap).toFixed(1)}px · 아래 ${oBot.toFixed(1)}px`, osx = ox2 + mO.width * 0.5;
            M.callout(x, osl, osx, base + Math.max(oBot, 2), Math.min(osx + 12, w - 8 - tagW(x, osl)), base + 40, { color: c.b, align: "left" });
            // 확대경
            const d = window.devicePixelRatio || 1, zs = 3, zw = Math.min(220, w * 0.32), zh = zw * 0.55;
            const sx0 = ox2 + mO.width * 0.36 - zw / zs / 2, sy0 = base - zh / zs / 2;
            const zx = w - zw - 14, zy = 12;
            x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
            x.imageSmoothingEnabled = true;
            x.drawImage(cv, sx0 * d, sy0 * d, (zw / zs) * d, (zh / zs) * d, zx * d, zy * d, zw * d, zh * d);
            x.restore();
            M.rrect(x, zx, zy, zw, zh, 8); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
            x.strokeStyle = c.b; x.lineWidth = 1.25; x.strokeRect(sx0, sy0, zw / zs, zh / zs);
            tagIn(x, "×3 확대: O가 베이스라인 아래로", zx + zw / 2, zy + zh + 16, 8, w - 8, { size: 11 });
          }
        },
      };
    },
  });
})();
