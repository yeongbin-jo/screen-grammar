/* 5장: 모션 그래픽 도구 — 애프터이펙트·피그마·Rive 가 공유하는 말 */
(() => {
  const K = window.MOTKIT; // lessons-motion.js 의 그리기 도구(틴트 상자, 카드, 그래프)
  const narrowOf = (api) => (api.stage.clientWidth || 700) < 520;
  const EASY = M.bezier(0.33, 0, 0.67, 1);
  const rgbOf = (hex) => {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((q) => q + q).join("") : h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const rgbStr = (v) => `rgb(${v.map((q) => Math.round(M.clamp(q, 0, 1) * 255)).join(",")})`;
  const checker = (x, X, Y, W, H, c, s = 10) => {
    x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip();
    x.fillStyle = c.surface; x.fillRect(X, Y, W, H);
    x.fillStyle = c.sunk;
    for (let j = 0; j * s < H; j++) for (let i = 0; i * s < W; i++) if ((i + j) % 2) x.fillRect(X + i * s, Y + j * s, s, s);
    x.restore();
  };
  /* 패널: 잉크 테두리 + 그림자 + 왼쪽 위 알약 라벨 */
  const panel = (x, b, c, label, o = {}) => {
    K.box(x, b.x, b.y, b.w, b.h, { r: 10, fill: o.fill, alpha: o.alpha });
    if (label) M.tag(x, label, b.x + 10, b.y, { size: 11, fill: o.tag });
  };

  /* ===== 5-1 키프레임과 보간 ===== */
  /* 키프레임 모양: linear 다이아몬드, bezier 모래시계, hold 사각, roving 점 */
  const kfShape = (x, cx, cy, kind, fill, stroke) => {
    const s = 7;
    x.beginPath();
    if (kind === 0) { x.moveTo(cx, cy - s); x.lineTo(cx + s, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s, cy); x.closePath(); }
    else if (kind === 1) { x.moveTo(cx - s * 0.8, cy - s); x.lineTo(cx, cy - s * 0.2); x.lineTo(cx + s * 0.8, cy - s); x.lineTo(cx + s * 0.8, cy + s); x.lineTo(cx, cy + s * 0.2); x.lineTo(cx - s * 0.8, cy + s); x.closePath(); }
    else if (kind === 2) { x.rect(cx - s * 0.75, cy - s * 0.75, s * 1.5, s * 1.5); }
    else { x.arc(cx, cy, 4, 0, Math.PI * 2); }
    x.fillStyle = fill; x.fill(); x.strokeStyle = stroke; x.lineWidth = 1.5; x.stroke();
  };
  /* 점 목록 → 세그먼트(직선 또는 Catmull-Rom 베지어) + 호 길이 표 */
  const buildPath = (P, curved) => {
    const n = P.length;
    const T = P.map((p, i) => (curved && i > 0 && i < n - 1) ? [(P[i + 1][0] - P[i - 1][0]) / 2, (P[i + 1][1] - P[i - 1][1]) / 2] : [0, 0]);
    const segs = [];
    for (let i = 0; i < n - 1; i++) {
      const b0 = P[i], b3 = P[i + 1];
      const b1 = [b0[0] + T[i][0] / 3, b0[1] + T[i][1] / 3], b2 = [b3[0] - T[i + 1][0] / 3, b3[1] - T[i + 1][1] / 3];
      const at = (u) => {
        const v = 1 - u;
        return [v * v * v * b0[0] + 3 * v * v * u * b1[0] + 3 * v * u * u * b2[0] + u * u * u * b3[0],
          v * v * v * b0[1] + 3 * v * v * u * b1[1] + 3 * v * u * u * b2[1] + u * u * u * b3[1]];
      };
      const KK = 100, tab = [0];
      let prev = at(0), L = 0;
      for (let k = 1; k <= KK; k++) { const q = at(k / KK); L += Math.hypot(q[0] - prev[0], q[1] - prev[1]); tab.push(L); prev = q; }
      const byFrac = (f) => {
        const d = M.clamp(f, 0, 1) * L;
        let k = 1; while (k < KK && tab[k] < d) k++;
        const a = tab[k - 1], b = tab[k], u = (k - 1 + (b > a ? (d - a) / (b - a) : 0)) / KK;
        return at(u);
      };
      segs.push({ at, byFrac, L, b1, b2 });
    }
    const total = segs.reduce((s, g) => s + g.L, 0);
    const cum = [0]; segs.forEach((g) => cum.push(cum[cum.length - 1] + g.L));
    return { segs, total, cum, T };
  };
  /* 종이비행기 레이어: 진행 방향(ang)으로 회전 */
  const plane = (x, px, py, ang, s, c, o = {}) => {
    x.save(); x.translate(px, py); x.rotate(ang); x.globalAlpha *= o.alpha ?? 1;
    const path = () => { x.beginPath(); x.moveTo(s, 0); x.lineTo(-s * 0.8, -s * 0.7); x.lineTo(-s * 0.4, 0); x.lineTo(-s * 0.8, s * 0.7); x.closePath(); };
    if (!o.ghost) { x.save(); x.translate(1.5, 2.5); path(); x.fillStyle = c.ink; x.fill(); x.restore(); }
    path(); x.fillStyle = o.ghost ? "rgba(0,0,0,0)" : c.surface; x.fill();
    if (!o.ghost) { x.fillStyle = M.alpha(c.b, 0.45); x.fill(); }
    x.lineWidth = 1.25; x.strokeStyle = o.ghost ? c.b : c.ink; x.lineJoin = "round"; if (o.ghost) x.setLineDash([2, 2]); x.stroke();
    if (!o.ghost) { M.line(x, -s * 0.4, 0, s, 0, c.ink, 1); }
    x.restore();
  };

  LESSONS.push({
    id: "keyframes", ch: 4, order: 1,
    title: "키프레임과 보간",
    lede: "모션 툴의 움직임은 '언제 어떤 값'을 찍은 키프레임과 그 사이를 채우는 보간으로 만들어집니다. 이 레슨을 마치면 속도를 정하는 시간 보간과 길을 정하는 공간 보간을 구별하고, 그래프 에디터에서 둘을 읽을 수 있습니다.",
    key: "키프레임은 '언제 무슨 값'만 정합니다. 느낌은 그 사이 보간에서 나오니, 속도는 그래프 에디터로, 경로는 모션 패스로 다듬습니다.",
    steps: [
      ["키프레임", "키프레임(keyframe)은 <b>특정 시간에 속성이 가질 값</b>을 적어 둔 점입니다. 컴포지션의 <b>0.0s</b>, <b>2.4s</b> 라벨이 두 키입니다. 그 사이 프레임은 프로그램이 계산해 채우는데, 이를 보간이라 합니다. 아래 타임라인의 다이아몬드가 같은 키입니다."],
      ["시간 보간: 베지어", "키를 넷으로 늘리고 <b>시간 보간</b>을 베지어(Easy Ease)로 바꿨습니다. 키마다 감속했다가 다시 출발하므로 키 근처에서 잔상이 촘촘해집니다. 타임라인의 키 모양이 모래시계로 바뀐 것이 그 표시입니다."],
      ["시간 보간: 홀드", "홀드(Hold)는 다음 키까지 값을 <b>그대로 붙잡고 있다가</b> 한순간에 바꿉니다. 중간 프레임이 없어 뚝뚝 끊기므로 시계 초침, 깜빡이는 커서, 스톱모션 느낌에 씁니다. CSS에선 <code>steps(1, end)</code>가 같은 일을 합니다."],
      ["공간 보간: 모션 패스", "공간 보간은 화면 위에서 <b>어느 길로</b> 가는지를 정합니다. 직선 경로는 키에서 꺾이고, 곡선(베지어) 경로는 키를 지나며 부드럽게 휩니다. 키 양옆의 <b>방향 핸들</b>이 길의 기울기를 정합니다. 시간 보간과 공간 보간은 서로 독립이라 따로 바꿀 수 있습니다."],
      ["로빙 키프레임", "구간 길이가 다른데 키 사이 시간이 정해져 있으면 구간마다 속도가 튑니다. 로빙(Roving)을 켜면 처음과 끝 키만 시간에 고정되고, 가운데 키는 거리에 맞춰 시간이 자동으로 옮겨져 <b>속도가 일정</b>해집니다. 타임라인에서 점으로 바뀐 키가 로빙 키입니다."],
      ["값 그래프 vs 속도 그래프", "그래프 에디터는 두 방식으로 봅니다. 값 그래프는 시간에 따른 x·y 값, 속도 그래프는 그 기울기인 빠르기입니다. 로빙을 끈 지금은 속도가 구간마다 <b>계단처럼 튑니다</b>. 오른쪽에서 로빙을 켜거나 시간 보간을 바꿔 그래프가 평평해지는지 보세요."],
    ],
    terms: [
      ["키프레임", "Keyframe", "특정 시간에 속성 값을 지정한 점. 그 사이는 보간이 채웁니다."],
      ["시간 보간", "Temporal interpolation", "키 사이에서 값이 '얼마나 빨리' 변하는지. Linear · Bezier(Easy Ease) · Hold."],
      ["공간 보간", "Spatial interpolation", "위치 값이 화면에서 '어느 길로' 가는지. 모션 패스(Motion path)의 직선·곡선."],
      ["로빙 키프레임", "Roving keyframe", "시간에 고정되지 않고 앞뒤 키에 맞춰 자동으로 옮겨지는 키. 속도를 고르게 만들 때 켭니다."],
      ["그래프 에디터", "Graph editor", "값 그래프(Value graph)와 속도 그래프(Speed graph)로 보간을 직접 편집하는 창."],
    ],
    mount(api) {
      const narrow = narrowOf(api);
      const cv = api.canvas("fill");
      if (narrow) cv.style.minHeight = "520px";
      const UV4 = [[0.04, 0.85], [0.3, 0.12], [0.62, 0.78], [0.96, 0.18]], UV2 = [UV4[0], UV4[3]];
      const TIMES4 = [0, 0.25, 0.5, 1];
      const S = { two: true, temporal: 0, spatial: 0, roving: false, graph: 0 };
      const V = { g: 0 };
      let step = 0, dur = 2400;
      const chT = M.chips(api.controls, { title: "시간 보간 Temporal", items: ["Linear", "Bezier", "Hold"], value: 0, onPick: (i) => { S.temporal = i; code(); api.restart(); } });
      const chS = M.chips(api.controls, { title: "공간 보간 Spatial", items: ["직선 경로", "곡선 경로"], value: 0, onPick: (i) => { S.spatial = i; code(); } });
      const rov = M.check(api.controls, { id: "kfRoving", label: "로빙 키프레임", onChange: (v) => { S.roving = v; code(); api.restart(); } });
      const chG = M.chips(api.controls, { title: "그래프 에디터", items: ["끄기", "값 그래프", "속도 그래프"], value: 0, onPick: (i) => { S.graph = i; } });
      M.slider(api.controls, { id: "kfDur", label: "길이", min: 1200, max: 4000, step: 100, value: 2400, fmt: (v) => (v / 1000).toFixed(1) + " s", onInput: (v) => { dur = v; code(); api.restart(); } });

      const model = (P) => {
        const path = buildPath(P, S.spatial === 1);
        const n = P.length;
        const times = S.roving && n > 2 ? path.cum.map((d) => d / path.total) : (n === 2 ? [0, 1] : TIMES4);
        const pos = (tn) => {
          tn = M.clamp(tn, 0, 1);
          if (S.roving && n > 2) {
            const d = tn * path.total;
            let i = 0; while (i < path.segs.length - 1 && path.cum[i + 1] < d) i++;
            return path.segs[i].byFrac((d - path.cum[i]) / path.segs[i].L);
          }
          if (tn >= 1) return P[n - 1];
          let i = 0; while (i < n - 2 && times[i + 1] <= tn) i++;
          const u = (tn - times[i]) / (times[i + 1] - times[i]);
          const e = S.temporal === 0 ? u : S.temporal === 1 ? EASY(u) : 0;
          return path.segs[i].byFrac(e);
        };
        return { path, times, pos };
      };

      function code() {
        const P = (S.two ? UV2 : UV4).map(([u, v]) => [Math.round(40 + u * 320), Math.round(20 + v * 160)]);
        const m = model(P);
        const fn = ["linear", "cubic-bezier(.33, 0, .67, 1)", "steps(1, end)"][S.roving ? 0 : S.temporal];
        let d = `M ${P[0][0]} ${P[0][1]}`;
        m.path.segs.forEach((g, i) => {
          d += S.spatial ? ` C ${Math.round(g.b1[0])} ${Math.round(g.b1[1])}, ${Math.round(g.b2[0])} ${Math.round(g.b2[1])}, ${P[i + 1][0]} ${P[i + 1][1]}` : ` L ${P[i + 1][0]} ${P[i + 1][1]}`;
        });
        const lines = [
          "/* 공간 보간 = 경로, 시간 보간 = timing-function */",
          ".layer {",
          `  offset-path: path("${d}");`,
          `  animation: move ${(dur / 1000).toFixed(1)}s infinite;`,
          "}",
          "@keyframes move {",
        ];
        m.times.forEach((t, i) => {
          const pct = (Math.round(t * 100) + "%").padEnd(4);
          const dist = (Math.round((m.path.cum[i] / m.path.total) * 100) + "%;").padEnd(5);
          const last = i === m.times.length - 1;
          lines.push(`  ${pct} { offset-distance: ${dist}${last ? "" : ` animation-timing-function: ${fn};`} }`);
        });
        lines.push("}");
        if (S.roving) lines.push("/* 로빙: 키의 시간 % = 거리 % → 속도 일정 */");
        const k0 = 6, k1 = 6 + m.times.length - 1;
        const hl = [[[k0, k1]], [[k0, k1 - 1]], [[k0, k1 - 1]], [[2, 2]], [[k0, k1 + 2]], [[k0, k1]]][step];
        api.code(lines.join("\n"), hl, "CSS · offset-path");
      }

      return {
        setStep(s) {
          step = s;
          const cfg = [[true, 0, 0, false, 0], [false, 1, 0, false, 0], [false, 2, 0, false, 0], [false, 0, 1, false, 0], [false, 0, 1, true, 0], [false, 0, 1, false, 2]][s];
          [S.two, S.temporal, S.spatial, S.roving, S.graph] = cfg;
          chT.set(S.temporal); chS.set(S.spatial); rov.set(S.roving); chG.set(S.graph);
          code();
        },
        frame(time, dt) {
          const { x, w, h } = M.fit(cv), c = M.col();
          const T = M.cycle(time, dur, 600);
          K.toward(V, "g", S.graph > 0 ? 1 : 0, dt);
          const TLH = 74, top = h - TLH - 10, g = V.g;
          let comp, gb;
          if (!narrow) {
            const cw = w - 8 - g * (w * 0.46);
            comp = { x: 4, y: 12, w: cw, h: top - 12 };
            gb = { x: comp.x + cw + 50, y: 18, w: w - (comp.x + cw + 50) - 8, h: top - 24 };
          } else {
            const chh = top - 12 - g * (top * 0.48);
            comp = { x: 4, y: 12, w: w - 8, h: chh };
            gb = { x: 44, y: comp.y + chh + 18, w: w - 54, h: top - (comp.y + chh + 18) - 4 };
          }
          panel(x, comp, c, "컴포지션", { fill: M.alpha(c.sunk, 0.5) });
          const pad = 34;
          const P = (S.two ? UV2 : UV4).map(([u, v]) => [comp.x + pad + u * (comp.w - 2 * pad), comp.y + pad + 4 + v * (comp.h - 2 * pad - 4)]);
          const m = model(P);
          // 모션 패스
          x.save(); x.setLineDash([2, 4]); x.strokeStyle = M.alpha(c.ink, 0.55); x.lineWidth = 1.5; x.beginPath();
          m.path.segs.forEach((sg, i) => { for (let k = 0; k <= 30; k++) { const q = sg.at(k / 30); (i || k) ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); } });
          x.stroke(); x.restore();
          let hEnd = null;
          if (S.spatial) m.path.T.forEach((t, i) => {
            if (!t[0] && !t[1]) return;
            const a = [P[i][0] - t[0] / 3, P[i][1] - t[1] / 3], b = [P[i][0] + t[0] / 3, P[i][1] + t[1] / 3];
            M.line(x, a[0], a[1], b[0], b[1], c.key, 1.75);
            M.dot(x, a[0], a[1], 4, c.key, c.ink); M.dot(x, b[0], b[1], 4, c.key, c.ink);
            if (!hEnd) hEnd = b;
          });
          // 잔상: 같은 시간 간격
          const N = 24;
          for (let k = 0; k <= N; k++) {
            if (k / N > T + 1e-6) break;
            const q = m.pos(k / N);
            M.dot(x, q[0], q[1], 4, M.alpha(c.b, 0.25), M.alpha(c.b, 0.7));
          }
          // 키
          P.forEach((p, i) => {
            const on = T >= m.times[i] - 1e-6;
            x.save(); x.translate(p[0], p[1]); x.rotate(Math.PI / 4);
            x.fillStyle = on ? c.key : c.surface; x.fillRect(-5, -5, 10, 10); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.strokeRect(-5, -5, 10, 10);
            x.restore();
          });
          if (step === 0) {
            M.tag(x, "0.0s 키", P[0][0] + 12, P[0][1] + 18, { mono: true, size: 11, fill: K.tint(c.key, 0.3) });
            M.tag(x, `${(dur / 1000).toFixed(1)}s 키`, P[1][0] - 12, P[1][1] - 18, { mono: true, size: 11, align: "right", fill: K.tint(c.key, 0.3) });
            if (T > 0.5) { const q = m.pos(0.25); M.callout(x, "보간이 채운 프레임", q[0], q[1], q[0] + 30, q[1] + 40, { size: 11.5 }); }
          } else if (step === 1 && T > 0.3) {
            M.callout(x, "키 근처 촘촘 = 감속", P[1][0], P[1][1], P[1][0] + 34, P[1][1] + 30, { size: 11.5 });
          } else if (step === 2 && T > 0.3) {
            M.callout(x, "다음 키까지 멈춤", P[1][0], P[1][1], P[1][0] + 34, P[1][1] + 30, { size: 11.5 });
          } else if (step === 3 && hEnd) {
            M.callout(x, "방향 핸들", hEnd[0], hEnd[1], hEnd[0] + 30, hEnd[1] + 28, { size: 11.5, fill: K.tint(c.key, 0.3) });
          } else if (step === 4 && T > 0.4) {
            const q = m.pos(0.62); M.callout(x, "간격이 고름 = 속도 일정", q[0], q[1], q[0] - 20, q[1] + 34, { size: 11.5 });
          }
          // 레이어(종이비행기)
          const q = m.pos(T), q2 = m.pos(Math.min(1, T + 0.01)), q0 = m.pos(Math.max(0, T - 0.01));
          const ang = Math.hypot(q2[0] - q0[0], q2[1] - q0[1]) > 0.2 ? Math.atan2(q2[1] - q0[1], q2[0] - q0[0]) : (V.ang ?? 0);
          V.ang = ang;
          plane(x, q[0], q[1], ang, Math.min(24, comp.h * 0.08), c);

          // 그래프
          if (g > 0.02 && gb.w > 60 && gb.h > 50) {
            x.save(); x.globalAlpha = g;
            if (S.graph === 1) {
              K.graph(x, gb, [
                { f: (t) => (m.pos(t)[0] - comp.x) / comp.w, color: c.a },
                { f: (t) => 1 - (m.pos(t)[1] - comp.y) / comp.h, color: c.b },
              ], { t: T, yl: "값 그래프", top: "최대", bottom: "최소", alpha: g });
              M.tag(x, "x", gb.x + gb.w - 34, gb.y + 16, { mono: true, size: 11, fill: K.tint(c.a, 0.25) });
              M.tag(x, "y", gb.x + gb.w - 16, gb.y + 16, { mono: true, size: 11, fill: K.tint(c.b, 0.25) });
            } else {
              const KN = 160, sp = [];
              for (let k = 0; k <= KN; k++) { const a = m.pos((k - 1) / KN), b = m.pos((k + 1) / KN); sp.push(Math.hypot(b[0] - a[0], b[1] - a[1])); }
              const sorted = sp.slice().sort((a, b) => a - b), mx = Math.max(1e-6, S.temporal === 2 && !S.roving ? sorted[KN] : sorted[KN] * 1.15);
              const G = K.graph(x, gb, [{ f: (t) => M.clamp(sp[Math.round(t * KN)] / mx, 0, 1), color: c.c }], { t: T, yl: "속도 그래프", top: "빠름", bottom: "0", alpha: g });
              if (step === 5 && !S.roving && S.temporal === 0) {
                const tt = 0.5, v1 = sp[Math.round(0.45 * KN)] / mx;
                M.callout(x, "구간마다 속도가 튐", G.X(tt), G.Y(v1), G.X(tt) + 14, gb.y + gb.h - 24, { size: 11.5 });
              } else if (S.roving && S.temporal === 0 && step === 5) {
                M.tag(x, "로빙: 평평 = 일정", gb.x + gb.w / 2, gb.y + gb.h - 22, { align: "center", size: 11.5, fill: K.tint(c.c, 0.2) });
              }
            }
            x.restore();
          }

          // 타임라인
          const y0 = h - TLH;
          K.box(x, 4, y0, w - 12, TLH - 6, { r: 10 });
          M.text(x, "위치 Position", 14, y0 + 19, { size: 11.5, color: c.ink, weight: 700 });
          const tx0 = 24, tx1 = w - 30, ty = y0 + 46;
          M.line(x, tx0, ty, tx1, ty, c.line, 2);
          M.text(x, (dur / 1000).toFixed(1) + "s", tx1, y0 + 19, { size: 11, mono: true, align: "right" });
          const kind = S.roving && P.length > 2 ? null : S.temporal;
          m.times.forEach((t, i) => {
            const k = kind == null ? (i === 0 || i === m.times.length - 1 ? 0 : 3) : kind;
            kfShape(x, M.lerp(tx0, tx1, t), ty, k, T >= t - 1e-6 ? c.key : c.surface, c.ink);
          });
          const px = M.lerp(tx0, tx1, T);
          M.line(x, px, y0 + 28, px, y0 + TLH - 12, c.b, 1.5);
          x.beginPath(); x.moveTo(px - 5, y0 + 25); x.lineTo(px + 5, y0 + 25); x.lineTo(px, y0 + 31); x.closePath(); x.fillStyle = c.b; x.fill();
          const kname = ["Linear ◆", "Bezier ⧗", "Hold ■"][S.temporal];
          if (w > 420) M.text(x, S.roving ? "로빙 ●" : kname, w / 2, y0 + 19, { size: 11, align: "center", mono: true });
        },
      };
    },
  });

  /* ===== 5-2 앵커 포인트와 부모-자식 ===== */
  LESSONS.push({
    id: "anchor-parent", ch: 4, order: 2,
    title: "앵커 포인트와 부모-자식",
    lede: "모든 레이어는 위치·스케일·회전·불투명도라는 같은 트랜스폼 속성을 가집니다. 이 레슨을 마치면 회전과 스케일의 중심(앵커 포인트)을 옮겨 원하는 동작을 만들고, 여러 레이어를 부모-자식으로 엮어 한 몸처럼 움직일 수 있습니다.",
    key: "애니메이션을 걸기 전에 앵커 포인트부터 회전·스케일이 일어날 자리로 옮기고, 함께 움직일 것은 부모나 널로 묶습니다.",
    steps: [
      ["트랜스폼 속성", "레이어의 기본 속성은 <b>위치·스케일·회전·불투명도</b>, 그리고 이들의 기준점인 <b>앵커 포인트</b>입니다. 애프터이펙트·피그마·Rive 모두 같은 다섯 가지를 씁니다. 왼쪽 속성 패널에서 지금 움직이는 값이 노랗게 강조되고, 카드가 그 값대로 바뀝니다."],
      ["앵커 포인트", "회전과 스케일은 <b>앵커 포인트를 중심으로</b> 일어납니다. 기본값은 레이어 한가운데라서 카드가 제자리에서 돌고 커집니다. 노란 십자가 앵커 포인트이고, 호와 각도 라벨이 회전량입니다."],
      ["앵커 옮기기", "앵커를 왼쪽 가장자리로 옮기면 같은 회전값이 <b>문짝처럼</b> 경첩을 축으로 열리는 동작이 되고, 스케일은 그 변에서 뻗어 나갑니다. 키프레임을 찍기 <b>전에</b> 앵커부터 옮기는 것이 순서입니다. 오른쪽 칩으로 다른 위치도 바꿔 보세요."],
      ["페어런팅", "레이어를 다른 레이어의 <b>자식</b>으로 연결하면 부모의 위치·회전·스케일을 그대로 물려받습니다. 스탠드 조명의 위팔만 돌렸는데 아래팔과 전등갓이 따라옵니다. 오른쪽 위 계층 패널이 그 관계이고, 각 관절의 앵커는 관절 자리에 둡니다."],
      ["관절 체인", "자식은 물려받은 움직임 위에 <b>자기 회전을 더합니다</b>. 어깨·팔꿈치·목을 조금씩 늦게 돌리면 끝으로 갈수록 휘청이는 자연스러운 흔들림(후속 동작)이 됩니다. 오른쪽에서 관절을 하나만 골라 돌려 보세요."],
      ["널 오브젝트", "<b>널(Null)</b>은 화면에 보이지 않는 빈 레이어입니다. 조명 전체와 공을 널의 자식으로 걸면 점선 상자 하나만 움직여 묶음 전체를 옮기고 돌릴 수 있습니다. 피그마의 그룹·프레임, Rive의 그룹이 같은 역할입니다."],
    ],
    terms: [
      ["트랜스폼", "Transform", "위치(Position)·스케일(Scale)·회전(Rotation)·불투명도(Opacity). 모든 레이어가 공통으로 가진 속성."],
      ["앵커 포인트", "Anchor point · Pivot", "회전과 스케일의 중심. CSS의 transform-origin, 피그마·Rive의 원점(Origin)."],
      ["페어런팅", "Parenting · Pick whip", "레이어를 다른 레이어의 자식으로 연결. 부모의 변형을 물려받습니다. 애프터이펙트에선 픽 윕으로 끌어 연결합니다."],
      ["널 오브젝트", "Null object", "렌더링되지 않는 빈 레이어. 여러 레이어를 묶어 조종하는 손잡이."],
      ["후속 동작", "Follow-through · Overlap", "부모가 멈춘 뒤에도 끝부분이 조금 늦게 따라와 멈추는 움직임."],
    ],
    mount(api) {
      const narrow = narrowOf(api);
      const cv = api.canvas("fill");
      if (narrow) cv.style.minHeight = "420px";
      const ANC = [
        { label: "중앙", a: [0.5, 0.5], css: "50% 50%" },
        { label: "왼쪽 위", a: [0, 0], css: "0 0" },
        { label: "왼쪽 가운데", a: [0, 0.5], css: "0 50%" },
        { label: "아래 가운데", a: [0.5, 1], css: "50% 100%" },
      ];
      let step = 0, anc = 0, joint = 0, lastK = -1;
      const A = { ax: 0.5, ay: 0.5 };
      const chA = M.chips(api.controls, { title: "앵커 포인트", items: ANC.map((a) => a.label), value: 0, onPick: (i) => { anc = i; code(); } });
      const chJ = M.chips(api.controls, { title: "회전할 관절", items: ["어깨", "팔꿈치", "목", "전체"], value: 0, onPick: (i) => { joint = i; } });
      function code(k = -1) {
        if (step <= 2) {
          const txt = [
            "/* 레이어 트랜스폼 = CSS transform */",
            ".layer {",
            `  transform-origin: ${ANC[anc].css};${" ".repeat(Math.max(1, 12 - ANC[anc].css.length))}/* 앵커 포인트 */`,
            "  translate: 60px 0;            /* 위치 */",
            "  scale: 1.3;                   /* 스케일 */",
            "  rotate: 40deg;                /* 회전 */",
            "  opacity: 0.3;                 /* 불투명도 */",
            "}",
          ].join("\n");
          api.code(txt, step === 0 ? (k >= 0 ? [[3 + k, 3 + k]] : []) : [[2, 2]], "CSS");
        } else {
          const txt = [
            "<div class=\"null\">          <!-- 널: 보이지 않는 묶음 -->",
            "  <div class=\"upper\">       <!-- 위팔: 부모 -->",
            "    <div class=\"fore\">      <!-- 아래팔: 위팔의 자식 -->",
            "      <div class=\"head\"></div>  <!-- 전등갓 -->",
            "    </div>",
            "  </div>",
            "  <div class=\"ball\"></div>",
            "</div>",
            "",
            "/* 자식은 부모의 transform 위에 자기 transform을 더한다 */",
            ".upper, .fore, .head { transform-origin: 0 50%; }",
            ".upper { rotate: -20deg; }",
            ".fore  { rotate: 35deg; translate: 140px 0; }",
            ".null  { translate: 40px 10px; rotate: 8deg; }",
          ].join("\n");
          api.code(txt, step === 3 ? [[1, 3], [10, 12]] : step === 4 ? [[9, 12]] : [[0, 0], [6, 7], [13, 13]], "HTML · CSS");
        }
      }
      /* UI 카드 레이어 */
      const drawLayer = (x, c, X, Y, lw, lh, a, rot, sc, op, ghost) => {
        const ax = lw * a[0], ay = lh * a[1];
        x.save(); x.translate(X + ax, Y + ay); x.rotate(rot); x.scale(sc, sc); x.translate(-ax, -ay);
        if (ghost) K.box(x, 0, 0, lw, lh, { r: 12, shadow: false, base: false, dash: [4, 4], stroke: M.alpha(c.ink, 0.45), lw: 1 });
        else {
          K.box(x, 0, 0, lw, lh, { r: 12, fill: M.alpha(c.a, 0.16), alpha: op, lw: 1.25 / sc });
          x.globalAlpha *= op;
          x.save(); M.rrect(x, 0, 0, lw, lh, 12); x.clip(); x.fillStyle = M.alpha(c.a, 0.5); x.fillRect(0, 0, lw, lh * 0.36); x.restore();
          M.line(x, 0, lh * 0.36, lw, lh * 0.36, c.ink, 1);
          M.dot(x, lw * 0.16, lh * 0.36, lh * 0.13, c.surface); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
          K.bar(x, lw * 0.08, lh * 0.6, lw * 0.6, Math.max(4, lh * 0.08), M.alpha(c.ink, 0.55));
          K.bar(x, lw * 0.08, lh * 0.76, lw * 0.42, Math.max(4, lh * 0.08), M.alpha(c.ink, 0.25));
        }
        x.restore();
        return [X + ax, Y + ay];
      };
      const anchorMark = (x, c, px, py) => {
        M.dot(x, px, py, 7, c.surface, c.ink);
        M.line(x, px - 12, py, px + 12, py, c.ink, 1.5); M.line(x, px, py - 12, px, py + 12, c.ink, 1.5);
        M.dot(x, px, py, 3.5, c.key);
      };
      return {
        setStep(s) {
          step = s;
          chA.el.hidden = s >= 3; chJ.el.hidden = s < 3;
          if (s === 1) { anc = 0; chA.set(0); } else if (s === 2) { anc = 2; chA.set(2); }
          if (s === 3) { joint = 0; chJ.set(0); } else if (s >= 4) { joint = 3; chJ.set(3); }
          lastK = -1; code();
        },
        frame(time, dt) {
          const { x, w, h } = M.fit(cv), c = M.col();
          if (step <= 2) {
            const a = step === 0 ? [0.5, 0.5] : ANC[anc].a;
            K.toward(A, "ax", a[0], dt); K.toward(A, "ay", a[1], dt);
            let area, vals = { dx: 0, sc: 1, rot: 0, op: 1 }, k = -1;
            const pw = narrow ? w - 12 : Math.min(250, w * 0.34);
            const rows = [["앵커 포인트", ""], ["위치", ""], ["스케일", ""], ["회전", ""], ["불투명도", ""]];
            if (step === 0) {
              k = Math.floor(time / 1600) % 4;
              if (k !== lastK) { lastK = k; code(k); }
              const s = Math.sin(Math.PI * ((time % 1600) / 1600));
              if (k === 0) vals.dx = (narrow ? 50 : 80) * s; else if (k === 1) vals.sc = 1 + 0.3 * s; else if (k === 2) vals.rot = (40 * s * Math.PI) / 180; else vals.op = 1 - 0.75 * s;
            } else {
              const ph = Math.floor(time / 2400) % 2, s = Math.sin((2 * Math.PI * (time % 2400)) / 2400);
              if (ph === 0) vals.rot = (40 * s * Math.PI) / 180; else vals.sc = 1 + 0.3 * s;
              k = ph === 0 ? 2 : 1;
            }
            const area0 = narrow ? { x: 0, y: 160, w, h: h - 160 } : { x: pw + 16, y: 0, w: w - pw - 16, h };
            area = area0;
            const lw = Math.min(narrow ? 170 : 270, area.w * 0.5, area.h * 0.8), lh = lw * 0.62;
            rows[0][1] = `${Math.round(lw * A.ax)}, ${Math.round(lh * A.ay)}`;
            rows[1][1] = `${Math.round(360 + vals.dx)}, 200`;
            rows[2][1] = `${Math.round(vals.sc * 100)}%`;
            rows[3][1] = `${Math.round((vals.rot * 180) / Math.PI)}°`;
            rows[4][1] = `${Math.round(vals.op * 100)}%`;
            // 속성 패널
            const rh = narrow ? 22 : 28, pb = { x: 6, y: 12, w: pw, h: 30 + rows.length * rh };
            panel(x, pb, c, "트랜스폼 Transform");
            rows.forEach(([n, v], i) => {
              const on = i - 1 === k || (i === 0 && step > 0), y = pb.y + 26 + i * rh + rh / 2;
              if (on) { x.fillStyle = K.tint(c.key, i === 0 ? 0.22 : 0.38); x.fillRect(pb.x + 4, y - rh / 2 + 2, pb.w - 8, rh - 4); }
              M.text(x, n, pb.x + 14, y + 4, { size: 12, color: on ? c.ink : c.muted, weight: on ? 700 : 500 });
              M.text(x, v, pb.x + pb.w - 14, y + 4, { size: 12, mono: true, align: "right", color: on ? c.ink : c.muted, weight: on ? 700 : 500 });
            });
            const X0 = area.x + area.w / 2 - lw / 2, Y = area.y + area.h / 2 - lh / 2;
            const aa = [A.ax, A.ay];
            drawLayer(x, c, X0, Y, lw, lh, aa, 0, 1, 1, true);
            const ap = drawLayer(x, c, X0 + vals.dx, Y, lw, lh, aa, vals.rot, vals.sc, vals.op, false);
            if (step === 2 && A.ax < 0.05) { // 경첩
              for (const yy of [0.2, 0.8]) { K.box(x, ap[0] - 5, Y + lh * yy - 7, 10, 14, { r: 3, fill: K.tint(c.key, 0.5), shadow: false }); }
            }
            if (Math.abs(vals.rot) > 0.01) {
              const R = Math.min(48, lh * 0.7);
              x.save(); x.strokeStyle = c.key; x.lineWidth = 2.5; x.beginPath();
              x.arc(ap[0], ap[1], R, -Math.PI / 2, -Math.PI / 2 + vals.rot, vals.rot < 0); x.stroke(); x.restore();
              M.line(x, ap[0], ap[1], ap[0], ap[1] - R - 6, M.alpha(c.ink, 0.4), 1, [2, 3]);
              const ea = -Math.PI / 2 + vals.rot;
              M.tag(x, `${Math.round((vals.rot * 180) / Math.PI)}°`, ap[0] + Math.cos(ea) * (R + 18), ap[1] + Math.sin(ea) * (R + 18), { mono: true, size: 11, align: "center", fill: K.tint(c.key, 0.3) });
            }
            anchorMark(x, c, ap[0], ap[1]);
            if (step > 0) {
              const lx = Math.min(area.x + area.w - 10, ap[0] + 60), ly = Math.min(h - 16, Y + lh + 46);
              M.callout(x, step === 2 && A.ax < 0.05 ? "앵커 = 경첩" : "앵커 포인트", ap[0], ap[1], lx, ly, { size: 11.5, fill: K.tint(c.key, 0.3) });
            }
            return;
          }
          // ----- 스탠드 조명 체인 -----
          const L1 = Math.min(w * (narrow ? 0.3 : 0.22), h * 0.34, 190), L2 = L1 * 0.95, L3 = L1 * 0.36;
          const base = [-1.05, 1.25, 0.55];
          const ph = (2 * Math.PI * time) / 2400;
          const off = [0, 1, 2].map((j) => {
            const amp = [0.35, 0.5, 0.6][j];
            if (joint === 3) return amp * Math.sin(ph - j * 0.9);
            return joint === j ? amp * Math.sin(ph) : 0;
          });
          const floor = h - 22;
          let nul = [narrow ? w * 0.36 : w * 0.34, floor - 30], nr = 0;
          if (step === 5) {
            const q = (2 * Math.PI * time) / 4200;
            nul = [nul[0] + Math.sin(q) * w * 0.08, floor - 30 - Math.max(0, Math.sin(2 * q)) * h * 0.12];
            nr = Math.sin(q) * 0.12;
          }
          M.line(x, 8, floor, w - 8, floor, c.ink, 1.25);
          // 계층 패널
          const rowsH = step === 5 ? [["널", 0, -1], ["위팔", 1, 0], ["아래팔", 2, 1], ["전등갓", 3, 2], ["공", 1, -1]] : [["위팔", 0, 0], ["아래팔", 1, 1], ["전등갓", 2, 2]];
          const bw = narrow ? 150 : 180, rr = 22, bh = 32 + rowsH.length * rr, bx = w - bw - 10;
          panel(x, { x: bx, y: 12, w: bw, h: bh }, c, "레이어 → 부모");
          rowsH.forEach(([n, ind, j], i) => {
            const yy = 12 + 28 + i * rr + rr / 2, hot = j >= 0 && (joint === 3 || joint === j);
            const tx = bx + 14 + ind * 16;
            if (ind) { M.line(x, tx - 10, yy - rr + 6, tx - 10, yy, M.alpha(c.ink, 0.45), 1); M.line(x, tx - 10, yy, tx - 3, yy, M.alpha(c.ink, 0.45), 1); }
            if (hot && step < 5) { x.fillStyle = K.tint(c.key, 0.35); x.fillRect(tx - 2, yy - 9, bw - (tx - bx) - 8, 18); }
            M.text(x, n, tx, yy + 4, { size: 12, color: c.ink, weight: hot ? 700 : 500 });
          });
          x.save(); x.translate(nul[0], nul[1]); x.rotate(nr);
          // 받침
          K.box(x, -36, 8, 72, 14, { r: 6, fill: M.alpha(c.ink, 0.15) });
          if (step === 5) {
            const bxp = -L1 * 0.9, byp = 22 - 16;
            M.line(x, 0, 0, bxp, byp, M.alpha(c.ink, 0.5), 1, [3, 3]);
            M.dot(x, bxp + 1.5, byp + 2.5, 16, c.ink); M.dot(x, bxp, byp, 16, K.tint(c.b, 0.55)); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
          }
          const joints = [];
          const chain = [[L1, 16, c.a, "위팔"], [L2, 14, c.c, "아래팔"], [L3, 0, c.key, "전등갓"]];
          chain.forEach(([len, th, col, name], j) => {
            x.rotate(base[j] + off[j]);
            if (j < 2) {
              M.rrect(x, -th / 2 + 1.5, -th / 2 + 2.5, len + th, th, th / 2); x.fillStyle = c.ink; x.fill();
              M.rrect(x, -th / 2, -th / 2, len + th, th, th / 2); x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(col, 0.4); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
            } else {
              // 전등갓 + 빛
              x.save(); x.beginPath(); x.moveTo(len * 0.8, -len * 0.2); x.lineTo(len * 3.4, -len * 1.4); x.lineTo(len * 3.4, len * 1.4); x.lineTo(len * 0.8, len * 0.2); x.closePath();
              const gr = x.createLinearGradient(len * 0.8, 0, len * 3.4, 0); gr.addColorStop(0, M.alpha(c.key, 0.35)); gr.addColorStop(1, M.alpha(c.key, 0)); x.fillStyle = gr; x.fill(); x.restore();
              x.beginPath(); x.moveTo(0, -len * 0.25); x.lineTo(len, -len * 0.75); x.lineTo(len, len * 0.75); x.lineTo(0, len * 0.25); x.closePath();
              x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(col, 0.55); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
            }
            const mt = x.getTransform(), d = window.devicePixelRatio || 1;
            joints.push([mt.e / d, mt.f / d, name, j]);
            x.translate(len, 0);
          });
          { const mt = x.getTransform(), d = window.devicePixelRatio || 1; joints.push([mt.e / d, mt.f / d]); }
          x.restore();
          joints.slice(0, 3).forEach(([jx, jy, name, j], i) => {
            const [ex, ey] = joints[i + 1], mx = (jx + ex) / 2, my = (jy + ey) / 2;
            let nx = -(ey - jy), ny = ex - jx; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; if (ny > 0) { nx = -nx; ny = -ny; }
            const hot = joint === 3 || joint === j;
            M.tag(x, name, mx + nx * 26, my + ny * 26, { size: 11, align: "center", fill: hot ? K.tint(c.key, 0.35) : undefined });
          });
          joints.slice(0, 3).forEach(([jx, jy]) => anchorMark(x, c, jx, jy));
          if (step === 5) {
            x.save(); x.translate(nul[0], nul[1]); x.rotate(nr);
            x.setLineDash([4, 3]); x.strokeStyle = c.ink; x.lineWidth = 1.5; x.strokeRect(-16, -16, 32, 32);
            x.restore();
            M.line(x, nul[0] - 9, nul[1], nul[0] + 9, nul[1], c.ink, 1.2); M.line(x, nul[0], nul[1] - 9, nul[0], nul[1] + 9, c.ink, 1.2);
            M.tag(x, "널 Null", nul[0] + 22, nul[1] + 6, { mono: true, size: 11, fill: K.tint(c.ink, 0.08) });
          }
        },
      };
    },
  });

  /* ===== 5-3 마스크와 매트 ===== */
  LESSONS.push({
    id: "masks-mattes", ch: 4, order: 3,
    title: "마스크와 매트",
    lede: "레이어의 일부만 보이게 하는 방법은 두 가지입니다. 이 레슨을 마치면 모양으로 오리는 마스크와 다른 레이어의 투명도·밝기를 빌려 오리는 매트를 구별하고, 가장 흔한 글자 드러내기 연출을 만들 수 있습니다.",
    key: "모양으로 자르면 마스크, 다른 레이어의 알파·밝기로 자르면 매트. 글자 드러내기는 움직이지 않는 사각형 마스크 하나로 충분합니다.",
    steps: [
      ["마스크", "마스크(mask)는 레이어 위에 그린 <b>패스(모양)</b>로 그 안쪽만 남기는 기능입니다. 가운데 패널의 노란 선이 마스크 패스입니다. 패스도 키프레임으로 움직일 수 있어서, 원이 커지며 화면이 열리는 전환을 만듭니다. CSS의 <code>clip-path</code>가 같은 역할입니다."],
      ["알파 매트", "매트(matte)는 오려 낼 모양을 <b>다른 레이어</b>에서 가져옵니다. 알파 매트는 그 레이어의 투명도(알파)를 씁니다. 글자가 칠해진 곳만 보이고, 체크무늬(투명)인 곳은 숨습니다. 그래서 풍경이 글자 모양으로만 남습니다. 애프터이펙트에선 <b>트랙 매트</b>로 지정합니다."],
      ["루마 매트", "루마 매트는 투명도 대신 <b>밝기</b>를 씁니다. 아래 띠처럼 흰색은 보이고, 검은색은 숨고, 회색은 반쯤 비칩니다. 부드러운 그라디언트를 매트로 쓰고 움직이면 경계가 흐린 와이프 전환이 됩니다. CSS에선 <code>mask-mode: luminance</code>입니다."],
      ["반전", "반전(Inverted)을 켜면 매트 안쪽이 아니라 <b>바깥</b>이 남습니다. 글자 모양으로 구멍이 뚫리는 녹아웃 효과입니다. 마스크와 매트 모두 반전 스위치가 있으니 다른 단계에서도 체크박스로 켜 보세요."],
      ["글자 드러내기", "가장 많이 쓰는 기법입니다. 글자는 아래에서 위로 움직이고, 그 위에 <b>움직이지 않는 사각형 마스크</b>가 있어 선 밖으로 나간 부분은 보이지 않습니다. 줄마다 조금씩 늦게 출발시키면 완성입니다. 웹에선 <code>overflow: hidden</code> 상자 하나로 같은 효과를 냅니다."],
    ],
    terms: [
      ["마스크", "Mask", "레이어 위에 그린 패스로 그 안(또는 밖)만 남깁니다. 웹의 clip-path."],
      ["트랙 매트", "Track matte", "다른 레이어를 오려 낼 모양으로 쓰는 기능. 피그마에선 'Use as mask'."],
      ["알파 매트 · 루마 매트", "Alpha matte · Luma matte", "매트 레이어의 투명도로 오리느냐, 밝기로 오리느냐."],
      ["반전", "Inverted", "남길 부분과 지울 부분을 뒤바꿈. 녹아웃(Knockout) 효과에 씁니다."],
      ["리빌", "Reveal", "가려져 있던 요소가 마스크 경계를 넘어 들어오며 드러나는 연출."],
    ],
    mount(api) {
      const narrow = narrowOf(api);
      const cv = api.canvas("fill");
      if (narrow) cv.style.minHeight = "470px";
      const off = document.createElement("canvas");
      let step = 0, inv = false, auto = true, manual = 0.6;
      const chkInv = M.check(api.controls, { id: "mmInv", label: "반전 Inverted", onChange: (v) => { inv = v; } });
      const chkAuto = M.check(api.controls, { id: "mmAuto", label: "자동 재생", checked: true, onChange: (v) => { auto = v; } });
      const sl = M.slider(api.controls, { id: "mmProg", label: "진행 (끌면 자동 재생이 멈춤)", min: 0, max: 100, value: 60, unit: "%", onInput: (v) => { manual = v / 100; auto = false; chkAuto.set(false); } });
      const LABELS = [["레이어", "마스크 패스", "결과"], ["채움 레이어", "알파 매트 (글자)", "결과"], ["채움 레이어", "루마 매트 (밝기)", "결과"], ["채움 레이어", "알파 매트 · 반전", "결과"], ["글자 레이어", "사각형 마스크", "결과"]];
      const CODE = [
        ["/* 마스크: 모양(패스)으로 레이어를 오려 냄 */", ".photo {", "  clip-path: ellipse(20% 20% at 50% 50%);", "  transition: clip-path .8s cubic-bezier(.65, 0, .35, 1);", "}", ".photo.open {", "  clip-path: ellipse(75% 75% at 50% 50%);", "}"],
        ["/* 알파 매트: 다른 이미지의 투명도로 오려 냄 */", ".pattern {", "  mask-image: url(word.svg);   /* 글자 모양 */", "  mask-mode: alpha;", "  mask-size: contain;", "  mask-repeat: no-repeat;", "}", "/* 글자에 채움을 넣는 흔한 대안 */", ".title { background: url(pattern.png);", "         background-clip: text; color: transparent; }"],
        ["/* 루마 매트: 밝을수록 보임 → 부드러운 와이프 */", ".pattern {", "  mask-image: linear-gradient(to right, white 40%, black 60%);", "  mask-mode: luminance;", "  mask-size: 300% 100%;", "  animation: wipe 1.8s forwards;", "}", "@keyframes wipe {", "  from { mask-position: 100% 0; }   /* 검은 쪽 = 숨김 */", "  to   { mask-position: 0 0; }      /* 흰 쪽 = 보임 */", "}"],
        ["/* 반전: 매트 바깥만 남기기 */", ".pattern {", "  mask-image: url(word.svg), linear-gradient(#000 0 0);", "  mask-composite: exclude;   /* 겹치지 않는 부분만 */", "}"],
        ["<h2 class=\"reveal\"><span>디자인 기초</span></h2>", "", ".reveal { overflow: hidden; }   /* 줄 상자 = 사각형 마스크 */", ".reveal span {", "  display: inline-block;", "  transform: translateY(110%);", "  animation: up .7s cubic-bezier(.16, 1, .3, 1) forwards;", "}", "@keyframes up { to { transform: translateY(0); } }", "/* 또는 clip-path: inset(100% 0 0 0) → inset(0) */"],
      ];
      const HL = [[[2, 2], [6, 6]], [[2, 3]], [[2, 3]], [[2, 3]], [[2, 2], [5, 6]]];
      /* 채움 레이어: 하늘·해·언덕 일러스트 */
      const layerArt = (x, pw, ph, c) => {
        x.fillStyle = c.surface; x.fillRect(0, 0, pw, ph);
        x.fillStyle = M.alpha(c.a, 0.3); x.fillRect(0, 0, pw, ph);
        x.lineWidth = 1.25; x.strokeStyle = c.ink;
        M.dot(x, pw * 0.7, ph * 0.32, Math.min(pw, ph) * 0.14, c.key); x.stroke();
        const hill = (y0, amp, col, ph0) => {
          x.beginPath(); x.moveTo(0, ph);
          for (let i = 0; i <= 30; i++) { const u = i / 30; x.lineTo(u * pw, ph * y0 - Math.sin(u * Math.PI * 1.4 + ph0) * ph * amp); }
          x.lineTo(pw, ph); x.closePath(); x.fillStyle = col; x.fill(); x.stroke();
        };
        hill(0.68, 0.12, K.tint(c.c, 0.55), 0.3);
        hill(0.86, 0.08, K.tint(c.c, 0.85), 2.2);
        for (let i = 0; i < 3; i++) { const cx = pw * (0.18 + i * 0.12), cy = ph * (0.22 + (i % 2) * 0.06); x.beginPath(); x.ellipse(cx, cy, pw * 0.07, ph * 0.035, 0, 0, Math.PI * 2); x.fillStyle = c.surface; x.fill(); x.stroke(); }
      };
      const WORD = "모션";
      const matteShape = (x, pw, ph, p, s, fill) => {
        x.fillStyle = fill;
        if (s === 0) {
          x.beginPath(); x.ellipse(pw / 2, ph / 2, pw * (0.08 + 0.5 * p), ph * (0.08 + 0.5 * p), 0, 0, Math.PI * 2); x.fill();
        } else {
          const fs = Math.min(ph * 0.62, pw * 0.42) * (0.75 + 0.35 * p);
          x.font = M.font(fs, "ui", 900); x.textAlign = "center"; x.textBaseline = "middle";
          x.fillText(WORD, pw / 2, ph / 2 + fs * 0.04);
        }
      };
      const lumaGrad = (x, pw, p, a0) => {
        const e = -0.3 + 1.6 * p, g = x.createLinearGradient(0, 0, pw, 0);
        for (let k = 0; k <= 10; k++) {
          const f = k / 10, L = M.clamp((e - f) / 0.3 + 0.5, 0, 1);
          g.addColorStop(f, a0(L));
        }
        return g;
      };
      const reveal = (x, pw, ph, p, c, clip, showMask, ghost) => {
        const lines = ["디자인 기초", "레슨 다섯 개"];
        const fs = Math.min(ph * 0.16, pw * 0.11), lh = fs * 1.6, mh = fs * 1.3;
        const y0 = ph / 2 - lh + fs * 0.35;
        lines.forEach((s, i) => {
          const pi = M.clamp((p - i * 0.18) / 0.82, 0, 1), dy = (1 - M.ease.out(pi)) * mh;
          const by = y0 + i * lh;
          if (!ghost) {
            x.save();
            if (clip) { x.beginPath(); x.rect(0, by - fs, pw, mh); x.clip(); }
            x.font = M.font(fs, "ui", 800); x.fillStyle = c.ink; x.textAlign = "center"; x.textBaseline = "alphabetic";
            x.fillText(s, pw / 2, by + dy);
            x.restore();
          }
          if (showMask) {
            x.fillStyle = M.alpha(c.key, 0.16); x.fillRect(10, by - fs, pw - 20, mh);
            x.save(); x.setLineDash([5, 3]); x.strokeStyle = c.key; x.lineWidth = 2; x.strokeRect(10, by - fs, pw - 20, mh); x.restore();
          }
        });
        return { y0, fs, mh };
      };
      return {
        setStep(s) {
          step = s; inv = s === 3; chkInv.set(inv);
          chkInv.el.style.opacity = s === 4 ? 0.45 : "";
          api.code(CODE[s].join("\n"), HL[s], "CSS");
        },
        frame(time) {
          const { x, w, h } = M.fit(cv), c = M.col();
          let p = manual;
          if (auto) { const pp = M.pingpong(time, 1800, 700); p = M.ease.inOut(pp.back ? 1 - pp.p : pp.p); sl.set(Math.round(p * 100)); }
          const LEG = 44; // 아래 범례
          let R;
          if (!narrow) {
            const gap = 34, pw = (w - 14 - 2 * gap) / 3, ph = Math.min(h - 30 - LEG - 10, pw * 1.15), py = 18 + (h - 18 - LEG - 10 - ph) / 2;
            R = [0, 1, 2].map((i) => ({ x: 4 + i * (pw + gap), y: py, w: pw, h: ph }));
            M.text(x, "+", R[0].x + pw + gap / 2 + 1, py + ph / 2 + 7, { size: 20, align: "center", color: c.ink, weight: 700 });
            M.text(x, "=", R[1].x + pw + gap / 2 + 1, py + ph / 2 + 7, { size: 20, align: "center", color: c.ink, weight: 700 });
          } else {
            const gap = 28, pw = (w - 14 - gap) / 2, ph = Math.round(pw * 0.8);
            R = [{ x: 4, y: 16, w: pw, h: ph }, { x: 4 + pw + gap, y: 16, w: pw, h: ph }];
            M.text(x, "+", 4 + pw + gap / 2 + 1, 16 + ph / 2 + 7, { size: 20, align: "center", color: c.ink, weight: 700 });
            M.text(x, "=", w / 2, 16 + ph + 26, { size: 20, align: "center", color: c.ink, weight: 700 });
            const ry = 16 + ph + 48;
            R.push({ x: 4, y: ry, w: w - 14, h: h - ry - LEG - 14 });
          }
          const inPanel = (r, fn) => { x.save(); M.rrect(x, r.x, r.y, r.w, r.h, 10); x.clip(); x.translate(r.x, r.y); fn(); x.restore(); };
          R.forEach((r) => K.box(x, r.x, r.y, r.w, r.h, { r: 10 }));

          if (step === 4) {
            let info;
            inPanel(R[0], () => { x.fillStyle = c.surface; x.fillRect(0, 0, R[0].w, R[0].h); x.globalAlpha = 0.25; reveal(x, R[0].w, R[0].h, p, c, false, false); x.globalAlpha = 1; reveal(x, R[0].w, R[0].h, p, c, false, false); });
            inPanel(R[1], () => { x.fillStyle = c.surface; x.fillRect(0, 0, R[1].w, R[1].h); x.globalAlpha = 0.18; reveal(x, R[1].w, R[1].h, p, c, false, false); x.globalAlpha = 1; info = reveal(x, R[1].w, R[1].h, 0, c, false, true, true); });
            inPanel(R[2], () => { x.fillStyle = c.surface; x.fillRect(0, 0, R[2].w, R[2].h); reveal(x, R[2].w, R[2].h, p, c, true, false); });
          } else {
            inPanel(R[0], () => layerArt(x, R[0].w, R[0].h, c));
            inPanel(R[1], () => {
              const pw = R[1].w, ph = R[1].h;
              if (step === 0) {
                layerArt(x, pw, ph, c); x.fillStyle = M.alpha(c.surface, 0.6); x.fillRect(0, 0, pw, ph);
                x.save(); x.beginPath(); x.ellipse(pw / 2, ph / 2, pw * (0.08 + 0.5 * p), ph * (0.08 + 0.5 * p), 0, 0, Math.PI * 2);
                x.strokeStyle = c.key; x.lineWidth = 3; x.stroke(); x.restore();
                for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; M.dot(x, pw / 2 + Math.cos(a) * pw * (0.08 + 0.5 * p), ph / 2 + Math.sin(a) * ph * (0.08 + 0.5 * p), 4, c.surface, c.ink); }
              } else if (step === 2) {
                x.fillStyle = "rgb(255,255,255)"; x.fillRect(0, 0, pw, ph);
                x.fillStyle = lumaGrad(x, pw, p, (L) => `rgba(0,0,0,${1 - L})`); x.fillRect(0, 0, pw, ph);
              } else {
                checker(x, 0, 0, pw, ph, c);
                matteShape(x, pw, ph, p, 1, c.ink);
              }
            });
            const r = R[2], d = window.devicePixelRatio || 1;
            const W = Math.max(1, Math.round(r.w * d)), H = Math.max(1, Math.round(r.h * d));
            if (off.width !== W || off.height !== H) { off.width = W; off.height = H; }
            const o = off.getContext("2d");
            o.setTransform(d, 0, 0, d, 0, 0); o.globalCompositeOperation = "source-over"; o.clearRect(0, 0, r.w, r.h);
            layerArt(o, r.w, r.h, c);
            o.globalCompositeOperation = inv ? "destination-out" : "destination-in";
            if (step === 2) { o.fillStyle = lumaGrad(o, r.w, p, (L) => `rgba(0,0,0,${L})`); o.fillRect(0, 0, r.w, r.h); }
            else matteShape(o, r.w, r.h, p, step === 0 ? 0 : 1, c.ink);
            o.globalCompositeOperation = "source-over";
            inPanel(r, () => { checker(x, 0, 0, r.w, r.h, c); x.drawImage(off, 0, 0, r.w, r.h); });
          }
          R.forEach((r) => { M.rrect(x, r.x, r.y, r.w, r.h, 10); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke(); });
          R.forEach((r, i) => M.tag(x, (i === 2 && inv && step < 4 ? "결과 · 반전" : LABELS[step][i]), r.x + 10, r.y, { size: 11, fill: i === 1 ? K.tint(c.key, 0.35) : i === 2 ? K.tint(c.c, 0.2) : undefined }));
          if (step === 0) {
            const r = R[1], ex = r.x + r.w / 2 + r.w * (0.08 + 0.5 * p) * 0.7, ey = r.y + r.h / 2 - r.h * (0.08 + 0.5 * p) * 0.7;
            if (!narrow) M.callout(x, "패스 점", ex, ey, Math.min(r.x + r.w - 6, ex + 20), r.y + 26, { size: 11 });
          }
          if (step === 4 && !narrow) {
            const r = R[1], fs = Math.min(r.h * 0.16, r.w * 0.11);
            const y = r.y + r.h / 2 - fs * 1.6 + fs * 0.35 - fs;
            M.callout(x, "고정된 줄 상자", r.x + r.w - 14, y, r.x + r.w - 10, Math.max(r.y + 20, y - 26), { size: 11 });
          }
          // 아래 범례
          const ly = h - LEG / 2 - 4, lx = 8;
          if (step === 0) { M.tag(x, "패스 안 = 보임", lx, ly, { size: 11.5, fill: K.tint(c.key, 0.3) }); M.tag(x, "밖 = 숨김", lx + 120, ly, { size: 11.5 }); }
          else if (step === 1 || step === 3) {
            const sw = 22;
            K.box(x, lx, ly - sw / 2, sw, sw, { r: 4, fill: c.ink, shadow: false });
            M.text(x, step === 3 ? "칠한 곳 = 구멍" : "칠한 곳 = 보임", lx + sw + 8, ly + 4, { size: 12, color: c.ink, weight: 600 });
            const x2 = lx + sw + 130;
            checker(x, x2, ly - sw / 2, sw, sw, c, 5.5); M.rrect(x, x2, ly - sw / 2, sw, sw, 4); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
            M.text(x, step === 3 ? "투명 = 보임" : "투명 = 숨김", x2 + sw + 8, ly + 4, { size: 12, color: c.ink, weight: 600 });
          } else if (step === 2) {
            const gw = Math.min(260, w - 150), g = x.createLinearGradient(lx + 40, 0, lx + 40 + gw, 0);
            g.addColorStop(0, "rgb(0,0,0)"); g.addColorStop(1, "rgb(255,255,255)");
            M.text(x, "숨김", lx, ly + 4, { size: 12, color: c.ink, weight: 600 });
            M.rrect(x, lx + 40, ly - 9, gw, 18, 4); x.fillStyle = g; x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
            M.text(x, "보임", lx + 48 + gw, ly + 4, { size: 12, color: c.ink, weight: 600 });
            if (w - (lx + 90 + gw) > 90) M.text(x, "회색 = 반투명", lx + 90 + gw, ly + 4, { size: 11.5 });
          } else {
            M.tag(x, "줄 상자 밖으로 나간 글자 = 잘림", lx, ly, { size: 11.5, fill: K.tint(c.key, 0.3) });
          }
        },
      };
    },
  });

  /* ===== 5-4 블렌딩 모드 ===== */
  LESSONS.push({
    id: "blend-modes", ch: 4, order: 4,
    title: "블렌딩 모드",
    lede: "위 레이어가 아래를 그냥 덮는 대신, 두 픽셀을 계산해서 섞는 규칙이 블렌딩 모드입니다. 이 레슨을 마치면 곱하기·스크린·오버레이·차이·더하기가 흰색과 검은색을 어떻게 다루는지 떠올려 알맞은 모드를 고를 수 있습니다.",
    key: "그림자·질감은 곱하기(어둡게), 빛·광택은 스크린이나 더하기(밝게). 블렌딩은 0~1 값끼리의 계산이라 흰색과 검은색이 어떻게 되는지부터 떠올립니다.",
    steps: [
      ["보통 Normal", "블렌딩 모드(blend mode)는 위 레이어 픽셀과 아래 레이어 픽셀을 <b>어떤 계산으로 섞을지</b> 정합니다. 기본값 보통은 섞지 않고 위가 아래를 가립니다. 위 레이어는 원 세 개(색·<b>흰</b>·<b>검정</b>)입니다. 이후 계산은 색 채널을 0~1로 놓고 합니다(a = 아래, b = 위)."],
      ["곱하기 Multiply", "두 값을 곱합니다. 1보다 작은 수끼리 곱하면 작아지므로 결과는 <b>항상 어두워지고</b>, 흰 원(1)은 라벨처럼 아예 사라집니다. 그림자, 종이 질감, 잉크 얹기에 씁니다. 흰 배경 스캔 이미지를 곱하기로 얹으면 흰 부분이 빠집니다."],
      ["스크린 Screen", "곱하기의 반대입니다. 둘 다 뒤집어(1 − 값) 곱한 뒤 다시 뒤집습니다. 결과는 <b>항상 밝아지고</b>, 이번엔 검은 원(0)이 사라집니다. 빛 번짐, 렌즈 플레어, 검은 바탕에 찍은 불꽃·연기 소스를 얹을 때 씁니다."],
      ["오버레이 Overlay", "아래 레이어가 어두운 곳은 곱하기, 밝은 곳은 스크린으로 처리합니다. 위쪽 회색 띠에서 왼쪽(어두움)은 더 어둡게, 오른쪽(밝음)은 더 밝게 되어 <b>대비가 올라갑니다</b>. 질감이나 색감을 입힐 때 씁니다."],
      ["차이 Difference", "두 값 차이의 절댓값 |a − b|입니다. 같은 색이 겹치면 <b>검게</b> 사라지고, 흰 원 아래에선 색이 <b>반전</b>됩니다. 두 이미지가 어긋난 곳을 찾거나, 배경에 따라 반전되는 커서·글자 효과에 씁니다."],
      ["더하기 Add", "두 값을 그대로 더하고 1에서 자릅니다. 스크린보다 <b>더 강하게</b> 밝아지고 쉽게 하얗게 날아갑니다. 빛이 겹치는 글로우, 파티클에 씁니다. 캔버스에선 <code>lighter</code>, CSS에선 <code>plus-lighter</code>입니다."],
    ],
    terms: [
      ["블렌딩 모드", "Blend mode", "위·아래 레이어 픽셀을 섞는 계산 규칙. 웹의 mix-blend-mode."],
      ["곱하기", "Multiply", "a × b. 항상 어두워짐. 흰색은 투명한 것처럼 사라집니다. 그림자·질감에."],
      ["스크린", "Screen", "1 − (1−a)(1−b). 항상 밝아짐. 검은색은 투명한 것처럼 사라집니다. 빛·불꽃 소스에."],
      ["오버레이", "Overlay", "아래가 어두우면 곱하기, 밝으면 스크린. 대비가 커집니다."],
      ["더하기", "Add · Linear dodge", "a + b (1에서 자름). 빛 겹침, 글로우."],
    ],
    mount(api) {
      const narrow = narrowOf(api);
      const cv = api.canvas("fill");
      if (narrow) cv.style.minHeight = "610px";
      const MODES = [
        { label: "보통", op: "source-over", css: "normal", f: (a, b) => b, fs: "b" },
        { label: "곱하기", op: "multiply", css: "multiply", f: (a, b) => a * b, fs: "a × b" },
        { label: "스크린", op: "screen", css: "screen", f: (a, b) => 1 - (1 - a) * (1 - b), fs: "1 − (1−a)(1−b)" },
        { label: "오버레이", op: "overlay", css: "overlay", f: (a, b) => (a < 0.5 ? 2 * a * b : 1 - 2 * (1 - a) * (1 - b)), fs: "a<.5 ? 2ab : 1−2(1−a)(1−b)" },
        { label: "차이", op: "difference", css: "difference", f: (a, b) => Math.abs(a - b), fs: "|a − b|" },
        { label: "더하기", op: "lighter", css: "plus-lighter", f: (a, b) => Math.min(1, a + b), fs: "min(1, a + b)" },
      ];
      const NOTE = ["위가 아래를 가림", "흰 원 → 사라짐", "검은 원 → 사라짐", "어두운 곳 더 어둡게", "흰 원 아래 → 반전", "밝은 곳 → 하얗게"];
      let mode = 0, op = 1, move = true;
      const chips = M.chips(api.controls, { title: "블렌딩 모드", items: MODES.map((m) => m.label), value: 0, onPick: (i) => { mode = i; code(); } });
      M.slider(api.controls, { id: "bmOpacity", label: "위 레이어 불투명도", min: 0, max: 100, value: 100, unit: "%", onInput: (v) => { op = v / 100; } });
      M.check(api.controls, { id: "bmMove", label: "위 레이어 움직이기", checked: true, onChange: (v) => { move = v; } });
      function code() {
        const m = MODES[mode];
        api.code([
          "/* CSS: 위 요소가 아래와 섞이는 방식 */",
          `.glow { mix-blend-mode: ${m.css}; }`,
          "",
          "/* 캔버스 2D: 그 다음에 그리는 것부터 적용 */",
          `ctx.globalCompositeOperation = "${m.op}";`,
          "ctx.drawImage(blendLayer, 0, 0);",
          "ctx.globalCompositeOperation = \"source-over\";  // 되돌리기",
          "",
          `/* 채널마다 (0~1): 결과 = ${m.fs} */`,
        ].join("\n"), [[1, 1], [4, 4], [8, 8]], "CSS · Canvas");
      }
      const WHITE = "rgb(255,255,255)", BLACK = "rgb(0,0,0)";
      return {
        setStep(s) { mode = s; chips.set(s); code(); },
        frame(time) {
          const { x, w, h } = M.fit(cv), c = M.col(), m = MODES[mode];
          const V = narrow ? { x: 4, y: 14, w: w - 12, h: Math.min(260, h * 0.48) } : { x: 4, y: 14, w: Math.round(w * 0.6), h: h - 26 };
          // 아래 레이어: 회색 단계(검정→흰) + 색 띠 — 블렌딩 계산 데이터라 테마와 무관한 실제 흑백
          x.save(); M.rrect(x, V.x, V.y, V.w, V.h, 10); x.clip();
          const g = x.createLinearGradient(V.x, 0, V.x + V.w, 0); g.addColorStop(0, BLACK); g.addColorStop(1, WHITE);
          x.fillStyle = g; x.fillRect(V.x, V.y, V.w, V.h * 0.42);
          const bands = [c.a, c.key, c.c, c.b];
          bands.forEach((col, i) => { x.fillStyle = col; x.fillRect(V.x + (i * V.w) / 4, V.y + V.h * 0.42, V.w / 4 + 1, V.h * 0.58); });
          // 위 레이어
          x.globalCompositeOperation = m.op; x.globalAlpha = op;
          const sx = move ? Math.sin(time / 1300) * V.w * 0.08 : 0, R = Math.min(V.w * 0.17, V.h * 0.3);
          const DOTS = [[0.24, 0.5, c.b], [0.52, 0.5, WHITE], [0.79, 0.5, BLACK]];
          DOTS.forEach(([u, v, col]) => M.dot(x, V.x + u * V.w + sx, V.y + v * V.h, R, col));
          x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
          x.restore();
          M.rrect(x, V.x + 2, V.y + 3, V.w, V.h, 10); // 그림자는 테두리 뒤 한 번만
          M.rrect(x, V.x, V.y, V.w, V.h, 10); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
          // 원 외곽선(위치 표시)과 라벨
          DOTS.forEach(([u, v], i) => {
            const cx = V.x + u * V.w + sx, cy = V.y + v * V.h;
            x.save(); x.setLineDash([3, 3]); M.dot(x, cx, cy, R, null, M.alpha(c.ink, 0)); x.strokeStyle = M.alpha(i === 1 ? "#000000" : "#ffffff", 0.5); x.lineWidth = 1; x.stroke(); x.restore();
            M.tag(x, ["색 b", "흰 1.0", "검정 0.0"][i], cx, cy + R + 14 > V.y + V.h - 12 ? cy - R - 12 : cy + R + 14, { size: 11, mono: true, align: "center" });
          });
          M.tag(x, `아래 + 위 (${m.label})`, V.x + 10, V.y, { size: 11, fill: K.tint(c.key, 0.35) });
          // 모드 특징 주석
          const hot = [null, [0.52, 0.5], [0.79, 0.5], [0.15, 0.2], [0.52, 0.5], [0.52, 0.72]][mode];
          if (hot) {
            const ax = V.x + hot[0] * V.w + (mode === 3 ? 0 : sx), ay = V.y + hot[1] * V.h - (mode === 3 ? 0 : R * 0.6);
            const lx = ax > V.x + V.w * 0.6 ? ax - 30 : M.clamp(ax + 30, V.x + 90, V.x + V.w - 10);
            M.callout(x, NOTE[mode], ax, ay, lx, Math.max(V.y + 26, ay - 34), { size: 11.5, fill: K.tint(c.b, 0.2) });
          }
          // 계산표
          const T = narrow ? { x: 6, y: V.y + V.h + 24, w: w - 16 } : { x: V.x + V.w + 26, y: 18, w: w - (V.x + V.w + 26) - 8 };
          const rowsN = 3, sw = Math.min(narrow ? 40 : 50, (T.w - 80) / 3), rowH = sw + 14;
          const TH = 56 + rowsN * rowH + 84;
          panel(x, { x: T.x, y: T.y, w: T.w, h: Math.min(TH, h - T.y - 8) }, c, "픽셀 계산");
          M.text(x, "결과 = " + m.fs, T.x + 12, T.y + 30, { size: 12, mono: true, color: c.ink, weight: 700 });
          const pairs = [[[0.5, 0.5, 0.5], [1, 1, 1]], [[0.5, 0.5, 0.5], [0, 0, 0]], [rgbOf(c.a), rgbOf(c.b)]];
          const ty = T.y + 44, gapX = (T.w - 24 - 3 * sw) / 2;
          const cols = [T.x + 12, T.x + 12 + sw + gapX, T.x + 12 + 2 * (sw + gapX)];
          ["아래 a", "위 b", "결과"].forEach((s, k) => M.text(x, s, cols[k], ty + 4, { size: 11, mono: true }));
          let first = null;
          pairs.forEach(([a, b], i) => {
            const y = ty + 12 + i * rowH;
            const res = a.map((av, k) => M.lerp(av, m.f(av, b[k]), op));
            if (i === 2) first = [a, b, res];
            [[rgbStr(a), 0], [rgbStr(b), 1], [rgbStr(res), 2]].forEach(([col, k]) => {
              M.rrect(x, cols[k], y, sw, sw, 7); x.fillStyle = col; x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
            });
            if (i < 2) M.text(x, `${a[0].toFixed(1)}`, cols[0] + sw / 2, y + sw / 2 + 4, { size: 11, mono: true, align: "center", color: a[0] > 0.45 ? "#000" : "#fff" });
            if (i < 2) M.text(x, `${b[0].toFixed(1)}`, cols[1] + sw / 2, y + sw / 2 + 4, { size: 11, mono: true, align: "center", color: b[0] > 0.45 ? "#000" : "#fff" });
            if (i < 2) M.text(x, `${res[0].toFixed(2)}`, cols[2] + sw / 2, y + sw / 2 + 4, { size: 11, mono: true, align: "center", color: res[0] > 0.45 ? "#000" : "#fff", weight: 700 });
            M.text(x, "+", (cols[0] + sw + cols[1]) / 2, y + sw / 2 + 5, { size: 14, align: "center", color: c.ink });
            M.text(x, "=", (cols[1] + sw + cols[2]) / 2, y + sw / 2 + 5, { size: 14, align: "center", color: c.ink });
          });
          const ny = ty + 12 + pairs.length * rowH + 8;
          if (ny + 64 < T.y + Math.min(TH, h - T.y - 8)) {
            M.text(x, "셋째 줄 채널 값 (a, b → 결과)", T.x + 12, ny + 6, { size: 11, mono: true });
            ["R", "G", "B"].forEach((ch, k) => {
              const [a, b, r] = first;
              M.text(x, `${ch}  ${a[k].toFixed(2)}, ${b[k].toFixed(2)} → ${r[k].toFixed(2)}`, T.x + 12, ny + 24 + k * 17, { size: 11.5, mono: true, color: c.ink });
            });
          }
        },
      };
    },
  });

  /* ===== 5-5 프레임레이트와 모션 블러 ===== */
  LESSONS.push({
    id: "frame-rate", ch: 4, order: 5,
    title: "프레임레이트와 모션 블러",
    lede: "영상은 정지 화면의 연속입니다. 이 레슨을 마치면 1초에 몇 장을 보여 주는지(프레임레이트)와 한 장을 찍는 동안 셔터를 얼마나 여는지(셔터 각도)가 움직임을 매끄럽게 또는 끊기게 만드는 원리를 설명할 수 있습니다.",
    key: "영상은 셔터 각도 180°(노출 = 프레임 길이의 절반)가 기본입니다. 블러가 없는 웹에선 프레임 수가 아니라 경과 시간으로 움직여야 어떤 주사율에서도 속도가 같습니다.",
    steps: [
      ["프레임레이트", "1초에 보여 주는 정지 화면 수가 <b>프레임레이트(fps)</b>입니다. 영화 24, 방송·웹 영상 30, 게임·UI 60. 같은 움직임이라도 장수가 적을수록 한 장마다 건너뛰는 거리가 커집니다. 카드 아래 눈금이 최근 프레임들의 위치이고, <b>간격</b> 라벨이 한 장에 건너뛴 거리입니다."],
      ["셔터 각도", "카메라는 한 프레임 동안 셔터를 <b>일부만</b> 열어 둡니다. 그 비율을 회전 원판의 각도로 말하는 것이 셔터 각도(shutter angle)입니다. 180°면 프레임 길이의 절반, 24fps에서 1/48초 노출입니다. 아래 띠의 노란 부분이 셔터가 열린 시간입니다."],
      ["모션 블러", "셔터가 열린 동안 물체가 움직이면 그 경로가 한 장에 번져 찍힙니다. 이것이 <b>모션 블러</b>입니다. 블러가 프레임 사이의 빈 구간을 이어 줘서, 같은 24fps라도 위 줄처럼 끊기지 않고 아래 줄처럼 <b>흐름</b>으로 보입니다. 영화가 24fps로도 자연스러운 이유입니다."],
      ["스트로빙", "블러 없이 빠르게 움직이면 띄엄띄엄 끊겨 보입니다(<b>스트로빙</b>). 바퀴처럼 반복되는 무늬는 한 프레임 동안 거의 한 칸을 돌면 <b>거꾸로 도는 것처럼</b> 보이기도 합니다(마차 바퀴 효과). 셔터 각도를 넓히면 줄어듭니다. 움직임 속도 슬라이더도 바꿔 보세요."],
      ["웹과 120Hz 화면", "웹 애니메이션은 블러 없이 화면 주사율(refresh rate)에 맞춰 그려집니다. 60Hz는 16.7ms, 120Hz는 8.3ms마다 한 장입니다. 장수가 늘면 간격이 좁아져 블러 없이도 부드럽습니다. 그래서 코드에선 <b>프레임 수가 아니라 경과 시간</b>으로 움직여야 어떤 화면에서도 속도가 같습니다."],
    ],
    terms: [
      ["프레임레이트", "Frame rate · fps", "1초에 보여 주는 정지 화면 수. 영화 24, 방송 30, 게임·UI 60fps."],
      ["셔터 각도", "Shutter angle", "한 프레임 중 셔터가 열린 비율을 각도로 표시. 180°가 표준(노출 = 1 ÷ (2 × fps))."],
      ["모션 블러", "Motion blur", "노출 중 움직임이 번져 찍힌 흔적. 프레임 사이를 이어 줍니다."],
      ["스트로빙", "Strobing", "블러 없는 빠른 움직임이 띄엄띄엄 끊겨 보이는 현상. 반복 무늬는 거꾸로 도는 듯 보이기도 합니다."],
      ["주사율", "Refresh rate", "화면이 1초에 다시 그리는 횟수(Hz). 브라우저의 requestAnimationFrame은 이에 맞춰 불립니다."],
    ],
    mount(api) {
      const narrow = narrowOf(api);
      const cv = api.canvas("fill");
      if (narrow) cv.style.minHeight = "420px";
      const FPS = [12, 24, 30, 60, 120];
      let step = 0, U = 24, Sh = 0, spd = 1;
      const chF = M.chips(api.controls, { title: "프레임레이트 (조절 레인)", items: FPS.map((f) => f + "fps"), value: 1, onPick: (i) => { U = FPS[i]; code(); } });
      const slS = M.slider(api.controls, { id: "frShutter", label: "셔터 각도 (조절 레인)", min: 0, max: 360, step: 15, value: 0, fmt: (v) => (v ? v + "°" : "0° 블러 없음"), onInput: (v) => { Sh = v; code(); } });
      M.slider(api.controls, { id: "frSpeed", label: "움직임 속도", min: 50, max: 200, step: 5, value: 100, unit: "%", onInput: (v) => { spd = v / 100; } });
      const DEF = [[24, 0], [24, 180], [24, 180], [24, 180], [30, 0]];
      const lanes = () => [
        [{ fps: 60 }, { fps: 30 }, { fps: U, sh: Sh, user: true }],
        [{ fps: U, sh: Sh, user: true }],
        [{ fps: 24, sh: 0 }, { fps: U, sh: Sh, user: true }],
        [{ fps: 0 }, { fps: 24, sh: 0 }, { fps: U, sh: Sh, user: true }],
        [{ fps: 60 }, { fps: 120 }, { fps: U, sh: Sh, user: true }],
      ][step];
      function code() {
        if (step === 0 || step === 4) {
          api.code([
            "/* 웹: rAF는 화면 주사율마다 불린다 (60Hz·120Hz) */",
            "let last = performance.now();",
            "function tick(now) {",
            "  const dt = now - last; last = now;  // 16.7ms 또는 8.3ms",
            "  x += speed * dt / 1000;             // 프레임 수가 아니라 시간으로",
            "  el.style.transform = `translateX(${x}px)`;",
            "  requestAnimationFrame(tick);",
            "}",
            "requestAnimationFrame(tick);",
          ].join("\n"), step === 0 ? [[0, 0], [3, 3]] : [[3, 4]], "JS");
        } else {
          const exp = Sh ? `1/${Math.round((U * 360) / Sh)}초` : "블러 없음";
          api.code([
            "/* 애프터이펙트: 컴포지션 설정 + 모션 블러 스위치 */",
            `Frame Rate        ${U} fps`,
            `Shutter Angle     ${Sh}°        // 노출 = 1/${U} × ${Sh}/360 = ${exp}`,
            "Shutter Phase     -90°        // 노출을 프레임 중앙에",
            "Samples Per Frame 16          // 블러를 몇 장 겹쳐 계산할지",
            "",
            "/* CSS에는 모션 블러가 없다: 필요하면 filter: blur()나 잔상으로 흉내 */",
          ].join("\n"), step === 1 ? [[1, 2]] : step === 2 ? [[2, 2], [4, 4]] : [[2, 2]], "After Effects");
        }
      }
      const P = () => 1500 / spd;
      const qt = (t, fps) => (fps ? (Math.floor((t * fps) / 1000) * 1000) / fps : t);
      const label = (L) => (L.fps ? `${L.fps}fps` : "연속(참고)") + (L.fps ? (L.sh ? ` · ${L.sh}°` : " · 블러 없음") : "") + (L.user ? " · 조절" : "");
      return {
        setStep(s) {
          step = s; [U, Sh] = DEF[s];
          chF.set(FPS.indexOf(U)); slS.set(Sh); code();
        },
        frame(time) {
          const { x, w, h } = M.fit(cv), c = M.col();
          const LS = lanes(), diag = step === 1;
          const availH = h - (diag ? 104 : 0);
          if (step === 3) {
            const n = LS.length, cw = (w - 8) / n, R = Math.min(cw * 0.36, availH * 0.3), cy = availH * 0.44;
            const omega = 1300 * spd;
            LS.forEach((L, i) => {
              const cx = 4 + cw * (i + 0.5), tf = qt(time, L.fps);
              const exp = L.fps && L.sh ? ((L.sh / 360) * 1000) / L.fps : 0, N = exp ? 12 : 1;
              // 바퀴 몸체
              M.dot(x, cx + 2, cy + 3, R + 6, c.ink); M.dot(x, cx, cy, R + 6, c.surface);
              M.dot(x, cx, cy, R + 6, L.user ? M.alpha(c.a, 0.14) : M.alpha(c.ink, 0.05)); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
              x.save(); x.lineCap = "round";
              for (let k = 0; k < N; k++) {
                const ang = (((tf + (N > 1 ? (exp * k) / (N - 1) : 0)) / 1000) * omega * Math.PI) / 180;
                x.globalAlpha = N > 1 ? 0.2 : 1;
                for (let sp = 0; sp < 6; sp++) {
                  const a = ang + (sp * Math.PI) / 3;
                  M.line(x, cx, cy, cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92, sp === 0 ? c.b : c.ink, sp === 0 ? 5 : 3.5);
                }
              }
              x.restore();
              M.dot(x, cx, cy, R, null, c.ink); x.lineWidth = 2.5; x.strokeStyle = c.ink; x.stroke();
              M.dot(x, cx, cy, 6, c.surface, c.ink);
              const lb = label(L).split(" · ");
              lb.forEach((t, k) => M.tag(x, t, cx, cy + R + 26 + k * 24, { size: 11, mono: true, align: "center", fill: L.user && k === 0 ? K.tint(c.a, 0.25) : undefined }));
            });
            M.text(x, `한 프레임(24fps) 동안 ${Math.round((1300 * spd) / 24)}° 회전 · 바퀴살 간격 60°`, w / 2, h - 10, { size: 11.5, mono: true, align: "center", color: c.ink });
            return;
          }
          const n = LS.length, laneH = Math.min(n === 1 ? 200 : 150, availH / n);
          const oy = (availH - laneH * n) / 2;
          LS.forEach((L, i) => {
            const y = oy + i * laneH;
            const lx = narrow ? 12 : 170, rx = w - 18;
            const ly = narrow ? y + laneH * 0.6 : y + laneH / 2;
            M.tag(x, label(L), narrow ? 10 : 12, narrow ? y + 14 : ly, { size: 11, mono: true, fill: L.user ? K.tint(c.a, 0.25) : undefined });
            const ch = Math.min(52, laneH * 0.36), cw = Math.min(ch * 1.9, (rx - lx) * 0.2);
            const mid = (lx + rx) / 2, A = (rx - lx) / 2 - cw / 2 - 4;
            const X = (t) => mid + A * Math.sin((2 * Math.PI * t) / P());
            M.line(x, lx, ly + ch / 2 + 8, rx, ly + ch / 2 + 8, c.line, 2);
            const tf = qt(time, L.fps);
            if (L.fps) {
              for (let j = 1; j <= 6; j++) {
                const px = X(tf - (j * 1000) / L.fps);
                M.line(x, px, ly + ch / 2 + 4, px, ly + ch / 2 + 13, M.alpha(c.b, 0.8 * (1 - j / 7)), 2);
              }
              if (!narrow && laneH > 70) {
                const gap = Math.abs(X(tf) - X(tf - 1000 / L.fps));
                M.text(x, `간격 ${Math.round(gap)}px`, rx, ly + ch / 2 + 28, { size: 11, mono: true, align: "right" });
              }
            }
            const exp = L.fps && L.sh ? ((L.sh / 360) * 1000) / L.fps : 0;
            if (exp) {
              const NB = 14;
              for (let k = 0; k < NB; k++) {
                const px = X(tf + (exp * k) / (NB - 1));
                x.save(); x.globalAlpha = 0.09; M.rrect(x, px - cw / 2, ly - ch / 2, cw, ch, 8); x.fillStyle = c.a; x.fill(); x.restore();
              }
              const px = X(tf + exp / 2);
              x.save(); M.rrect(x, px - cw / 2, ly - ch / 2, cw, ch, 8); x.strokeStyle = M.alpha(c.ink, 0.35); x.lineWidth = 1; x.setLineDash([3, 3]); x.stroke(); x.restore();
            } else K.card(x, X(tf) - cw / 2, ly - ch / 2, cw, ch, c.a);
          });
          if (diag) {
            const fps = U, fdur = 1000 / fps, nF = narrow ? 6 : 8, sx0 = 12, sx1 = w - 14, fw = (sx1 - sx0) / nF, y = h - 66;
            M.text(x, `${fps}fps · 한 칸 ${fdur.toFixed(1)}ms · 노란 부분 = 셔터 열림 ${Sh}°`, sx0, y - 14, { size: 11.5, mono: true, color: c.ink });
            const cur = Math.floor((time % (nF * fdur)) / fdur);
            K.box(x, sx0, y, sx1 - sx0, 36, { r: 6 });
            for (let f = 0; f < nF; f++) {
              const fx = sx0 + f * fw;
              if (f === cur) { x.fillStyle = M.alpha(c.a, 0.16); x.fillRect(fx + 1, y + 1, fw - 2, 34); }
              const ow = (fw * Sh) / 360, st = (fw - ow) / 2;
              if (Sh) { M.rrect(x, fx + st, y + 7, ow, 22, 3); x.fillStyle = K.tint(c.key, 0.7); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke(); }
              if (f) M.line(x, fx, y, fx, y + 36, c.ink, 1);
            }
            const ph = ((time % (nF * fdur)) / fdur) * fw + sx0;
            M.line(x, ph, y - 4, ph, y + 40, c.b, 2);
            M.tag(x, Sh ? `노출 1/${Math.round((fps * 360) / Sh)}초` : "노출 0 (블러 없음)", sx1, y + 54, { size: 11, mono: true, align: "right", fill: K.tint(c.key, 0.3) });
          }
          if (step === 2 && Sh > 0) {
            const L = LS[1], tf = qt(time, L.fps), lx = narrow ? 12 : 170, rx = w - 18, ch = Math.min(52, laneH * 0.36), cw = Math.min(ch * 1.9, (rx - lx) * 0.2);
            const mid = (lx + rx) / 2, A = (rx - lx) / 2 - cw / 2 - 4, px = mid + A * Math.sin((2 * Math.PI * (tf + (Sh / 720) * 1000 / L.fps)) / P());
            const ly = narrow ? oy + laneH * 1.6 : oy + laneH * 1.5;
            M.callout(x, "노출 동안 번진 흔적", px, ly - ch / 2, M.clamp(px + 20, 120, w - 150), ly - ch / 2 - 26, { size: 11.5, fill: K.tint(c.a, 0.2) });
          }
        },
      };
    },
  });
})();
