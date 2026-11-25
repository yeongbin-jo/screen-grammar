/* 4장: 움직임의 문법 */
(() => {
  /* ---------- 공용 그리기 도구 (모션·모션그래픽 레슨이 함께 씀: window.MOTKIT) ---------- */
  const K = {};
  /* 일러스트 부품: 옅은 틴트 채움 + 1.25px 잉크 외곽선 + 오프셋 그림자 */
  K.box = (x, X, Y, W, H, o = {}) => {
    const c = M.col(), r = o.r ?? 10, st = o.stroke || c.ink;
    x.save(); x.globalAlpha *= o.alpha ?? 1;
    if (o.shadow !== false) { M.rrect(x, X + 2, Y + 3, W, H, r); x.fillStyle = st; x.fill(); }
    M.rrect(x, X, Y, W, H, r);
    if (o.base !== false) { x.fillStyle = c.surface; x.fill(); }
    if (o.fill) { x.fillStyle = o.fill; x.fill(); }
    if (o.dash) x.setLineDash(o.dash);
    if (o.lw !== 0) { x.lineWidth = o.lw || 1.25; x.strokeStyle = st; x.stroke(); }
    x.restore();
  };
  /* 불투명 틴트: 색을 surface 위에 a 만큼 섞은 색 (태그처럼 그림자 위에 칠할 때) */
  K.tint = (col, a = 0.2) => {
    const s = M.col().surface, p = (h) => { h = h.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map((q) => q + q).join("") : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const A = p(col), B = p(s);
    return `rgb(${A.map((v, i) => Math.round(B[i] + (v - B[i]) * a)).join(",")})`;
  };
  K.bar = (x, X, Y, W, H, col) => { M.rrect(x, X, Y, Math.max(0, W), H, H / 2); x.fillStyle = col; x.fill(); };
  /* 알림 카드(토스트): 아이콘 + 두 줄 */
  K.card = (x, X, Y, W, H, col, o = {}) => {
    const c = M.col(), a = o.alpha ?? 1;
    if (o.ghost) { K.box(x, X, Y, W, H, { r: Math.min(10, H / 3), shadow: false, base: false, alpha: a, stroke: col, dash: [3, 3], lw: 1 }); return; }
    K.box(x, X, Y, W, H, { r: Math.min(10, H / 3), fill: K.tint(col, 0.16), alpha: a });
    x.save(); x.globalAlpha *= a;
    const r = H * 0.24, cx = X + H * 0.5, cy = Y + H / 2;
    M.dot(x, cx, cy, r, M.alpha(col, 0.55)); x.strokeStyle = c.ink; x.lineWidth = 1.1; x.stroke();
    const lx = X + H, lw = W - H - H * 0.3, bh = Math.max(3, H * 0.11);
    if (lw > 8) { K.bar(x, lx, cy - bh * 1.6, lw, bh, M.alpha(c.ink, 0.6)); K.bar(x, lx, cy + bh * 0.6, lw * 0.62, bh, M.alpha(c.ink, 0.28)); }
    x.restore();
  };
  /* 토글 스위치 */
  K.toggle = (x, X, Y, W, H, p, col, o = {}) => {
    const c = M.col();
    K.box(x, X, Y, W, H, { r: H / 2, fill: K.tint(col, 0.12 + 0.7 * M.clamp(p, 0, 1)), alpha: o.alpha ?? 1 });
    x.save(); x.globalAlpha *= o.alpha ?? 1;
    M.dot(x, X + H / 2 + p * (W - H), Y + H / 2, H / 2 - 4, c.surface); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
    x.restore();
  };
  /* 지수 접근: 단계 전환 보간 (약 300ms 안에 거의 도달) */
  K.toward = (o, k, target, dt, tau = 80) => { o[k] += (target - o[k]) * (1 - Math.exp(-(dt || 0) / tau)); if (Math.abs(target - o[k]) < 1e-3) o[k] = target; return o[k]; };
  /* 진행도-시간 그래프 (11px 라벨, 잉크 테두리) */
  K.graph = (x, b, curves, o = {}) => {
    const c = M.col(), ymin = o.ymin ?? 0, ymax = o.ymax ?? 1;
    const X = (t) => b.x + t * b.w, Y = (v) => b.y + b.h - ((v - ymin) / (ymax - ymin)) * b.h;
    K.box(x, b.x, b.y, b.w, b.h, { r: 8, shadow: false, alpha: o.alpha ?? 1 });
    x.save(); x.globalAlpha = o.alpha ?? 1;
    for (let i = 1; i < 4; i++) M.line(x, X(i / 4), b.y + 1, X(i / 4), b.y + b.h - 1, c.grid, 1);
    for (const v of [0, 1]) if (v >= ymin && v <= ymax) {
      M.line(x, b.x, Y(v), b.x + b.w, Y(v), M.alpha(c.ink, 0.22), 1, [3, 4]);
      if (o.ylab !== false) M.text(x, v ? (o.top || "100%") : (o.bottom || "0%"), b.x - 6, Y(v) + 4, { size: 11, mono: true, align: "right" });
    }
    if (o.xl) M.text(x, o.xl, b.x + b.w - 8, b.y + b.h - 8, { size: 11, align: "right" });
    if (o.yl) M.text(x, o.yl, b.x + 8, b.y + 17, { size: 11, color: c.ink, weight: 600 });
    x.beginPath(); x.rect(b.x, b.y, b.w, b.h); x.clip();
    if (o.under) o.under(X, Y);
    const N = Math.max(60, Math.round(b.w / 2));
    for (const cv of curves) {
      x.save(); x.globalAlpha *= cv.alpha ?? 1;
      x.strokeStyle = cv.color; x.lineWidth = cv.w || 2.4; x.lineJoin = "round"; x.setLineDash(cv.dash || []);
      x.beginPath();
      for (let i = 0; i <= N; i++) { const t = i / N, v = cv.f(t); i ? x.lineTo(X(t), Y(v)) : x.moveTo(X(t), Y(v)); }
      x.stroke(); x.restore();
    }
    if (o.t != null) {
      M.line(x, X(o.t), b.y, X(o.t), b.y + b.h, c.key, 1.5);
      for (const cv of curves) if (!cv.noDot) M.dot(x, X(o.t), Y(cv.f(o.t)), 4.5, cv.color, c.ink);
    }
    x.restore();
    return { X, Y };
  };
  /* 블롭 캐릭터: 아래 가운데 기준, sx·sy 로 찌그러짐, look = 시선(-1~1) */
  K.blob = (x, cx, by, S, col, o = {}) => {
    const c = M.col(), sx = o.sx || 1, sy = o.sy || 1, a = o.alpha ?? 1;
    x.save(); x.globalAlpha = a; x.translate(cx, by); x.scale(sx, sy);
    if (o.ghost) { M.rrect(x, -S / 2, -S, S, S, S * 0.32); x.setLineDash([3, 3]); x.strokeStyle = col; x.lineWidth = 1 / Math.min(sx, sy); x.stroke(); x.restore(); return; }
    M.rrect(x, -S / 2 + 2, -S + 3, S, S, S * 0.32); x.fillStyle = c.ink; x.fill();
    M.rrect(x, -S / 2, -S, S, S, S * 0.32); x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(col, 0.42); x.fill();
    x.lineWidth = 1.25 / Math.sqrt(sx * sy); x.strokeStyle = c.ink; x.stroke();
    const look = M.clamp(o.look || 0, -1, 1) * S * 0.08;
    for (const e of [-1, 1]) {
      x.beginPath(); x.ellipse(e * S * 0.17 + look, -S * 0.6, S * 0.09, S * 0.12, 0, 0, Math.PI * 2); x.fillStyle = c.surface; x.fill(); x.lineWidth = 1; x.stroke();
      M.dot(x, e * S * 0.17 + look * 1.6, -S * 0.58, S * 0.045, c.ink);
    }
    x.beginPath(); x.arc(look, -S * 0.38, S * 0.08, 0.15 * Math.PI, 0.85 * Math.PI); x.lineWidth = 1.2; x.strokeStyle = c.ink; x.stroke();
    x.restore();
  };
  window.MOTKIT = K;

  /* ===== 4-1 등속은 왜 어색할까 ===== */
  LESSONS.push({
    id: "linear-vs-ease", ch: 3, order: 1,
    title: "등속은 왜 어색할까",
    lede: "같은 거리를 같은 시간에 가도 느낌은 전혀 다를 수 있습니다. 이 레슨을 마치면 '속도가 시간에 따라 어떻게 변하는가'를 잔상과 그래프로 읽을 수 있습니다.",
    key: "모션의 느낌은 위치가 아니라 속도의 변화에서 나옵니다. 잔상 간격과 그래프 기울기로 속도를 읽습니다.",
    steps: [
      ["일정한 속도", "<code>linear</code>, 즉 등속은 매 순간 같은 거리만큼 움직입니다. 위쪽 <b>속도</b> 막대를 보세요. 출발하자마자 꽉 찼다가 도착하는 순간 0으로 떨어집니다. 현실에서 이렇게 출발하고 멈추는 물체는 없어서 기계처럼 보입니다."],
      ["잔상 찍기", "같은 시간 간격(100ms)마다 카드의 위치를 점선으로 남겼습니다. 아래 눈금의 <b>간격이 모두 같다</b>는 것은 속도가 한 번도 변하지 않았다는 뜻입니다. 모션 툴의 어니언 스킨(onion skin)이 바로 이 잔상입니다."],
      ["감속을 더하면", "<code>ease-out</code>은 처음엔 크게, 끝으로 갈수록 작게 움직입니다. 아래 줄의 눈금이 오른쪽으로 갈수록 <b>촘촘해지는</b> 구간이 감속입니다. 알림 카드가 미끄러져 들어와 부드럽게 자리 잡는 느낌이 여기서 나옵니다."],
      ["그래프로 읽기", "가로는 시간, 세로는 진행도입니다. 곡선의 <b>기울기가 곧 속도</b>입니다. 그래프 안 라벨처럼 ease-out은 처음에 가파르고(빠름) 끝에서 평평합니다(멈춰 감). 애프터이펙트 그래프 에디터의 값 그래프가 이 곡선입니다."],
      ["정리", "두 카드는 출발점·도착점·지속시간이 모두 같습니다. 달라진 것은 <b>속도의 분배</b>뿐입니다. 오른쪽 '비교 곡선'을 ease-in, ease-in-out으로 바꿔 잔상과 그래프가 어떻게 달라지는지 확인해 보세요."],
    ],
    terms: [
      ["보간", "Interpolation · Tween", "두 키프레임 사이 값을 계산해 채우는 일. 'in-between'에서 온 말로, 툴에서 '트윈을 건다'고 합니다."],
      ["이징", "Easing", "보간의 속도 변화. 가속(ease-in), 감속(ease-out), 둘 다(ease-in-out). CSS의 timing-function."],
      ["어니언 스킨", "Onion skin", "앞뒤 프레임을 반투명하게 겹쳐 보는 표시. 간격으로 속도를 확인할 때 씁니다."],
      ["그래프 에디터", "Graph editor", "값(Value graph)이나 속도(Speed graph)를 곡선으로 직접 편집하는 창."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const CMP = [{ name: "ease-out", f: M.ease.out }, { name: "ease-in", f: M.ease.in }, { name: "ease-in-out", f: M.ease.inOut }];
      let step = 0, dur = 1000, cmp = 0;
      const V = { ease: 0, graph: 0, ghost: 0, dim: 0 };
      M.slider(api.controls, { id: "l1dur", label: "지속시간", min: 300, max: 2500, step: 50, value: 1000, unit: " ms", onInput: (v) => { dur = v; api.restart(); } });
      const chC = M.chips(api.controls, { title: "비교 곡선 (아래 줄)", items: CMP.map((q) => q.name), value: 0, onPick: (i) => { cmp = i; api.restart(); } });
      const ro = M.readout(api.controls);
      const speedOf = (f, t) => { if (t >= 1 || t <= 0) return 0; const e = 0.004; return (f(Math.min(1, t + e)) - f(Math.max(0, t - e))) / (2 * e); };
      return {
        setStep(s) { step = s; if (s < 4) { cmp = 0; chC.set(0); } chC.el.style.opacity = s >= 2 ? "" : 0.45; },
        frame(time, dt) {
          const { x, w, h } = M.fit(cv), c = M.col();
          K.toward(V, "ease", step >= 2 ? 1 : 0, dt); K.toward(V, "graph", step >= 3 ? 1 : 0, dt);
          K.toward(V, "ghost", step >= 1 ? 1 : 0, dt); K.toward(V, "dim", step === 2 ? 1 : 0, dt);
          const t = M.cycle(time, dur, 900), narrow = w < 520;
          const GH = Math.min(h * 0.46, 260), LA = h - V.graph * (GH + 8);
          const lanes = [{ name: "linear", f: M.ease.linear, col: c.a, a: 1 - 0.6 * V.dim, k: 0 }];
          if (V.ease > 0.01) lanes.push({ name: CMP[cmp].name, f: CMP[cmp].f, col: c.b, a: V.ease, k: 1 });
          const lh = Math.min(180, LA / (1 + V.ease)), x0 = 16, x1 = w - 16;
          const cw = Math.min(150, Math.max(84, w * 0.18)), ch = Math.max(28, Math.min(52, lh * 0.34));
          const sp = [];
          lanes.forEach((L, i) => {
            const cy0 = LA / 2 + (i === 0 ? -lh / 2 * V.ease : lh / 2);
            const top = cy0 - lh / 2;
            x.save(); x.globalAlpha = L.a;
            // 머리줄: 이름 + 속도 막대
            const hy = top + Math.min(22, lh * 0.2);
            M.tag(x, L.name, x0, hy, { mono: true, fill: K.tint(L.col, 0.18) });
            const v = speedOf(L.f, t), mw = Math.min(150, w * 0.32), mx = x1 - mw;
            M.text(x, "속도", mx - 8, hy + 4, { size: 11, align: "right" });
            K.box(x, mx, hy - 6, mw, 12, { r: 6, shadow: false });
            K.bar(x, mx + 2, hy - 4, (mw - 4) * M.clamp(v / 3, 0, 1), 8, L.col);
            sp.push(v);
            // 바닥 트랙
            const cy = top + lh * 0.56, fy = cy + ch / 2 + 9;
            M.line(x, x0, fy, x1, fy, c.line, 2);
            const pos = (p) => x0 + p * (x1 - x0 - cw);
            if (V.ghost > 0.01) {
              const N = Math.max(3, Math.round(dur / 100));
              for (let k = 0; k <= N; k++) {
                if (k / N > t + 1e-6) break;
                const gx = pos(L.f(k / N));
                K.card(x, gx, cy - ch / 2, cw, ch, L.col, { ghost: true, alpha: 0.32 * V.ghost });
                M.line(x, gx + cw / 2, fy - 4, gx + cw / 2, fy + 5, M.alpha(L.col, 0.9 * V.ghost), 2);
              }
            }
            K.card(x, pos(L.f(t)), cy - ch / 2, cw, ch, L.col);
            x.restore();
            L.cy = cy; L.fy = fy; L.pos = pos;
          });
          // 주석
          const L0 = lanes[0], L1 = lanes[1];
          if (step === 0) {
            M.callout(x, "출발부터 전속력", L0.pos(0) + cw / 2, L0.fy, x0 + cw * 0.9, L0.fy + 26, { size: 11.5 });
            M.callout(x, "도착 순간 급정거", L0.pos(1) + cw / 2, L0.fy, x1 - cw * 0.9, L0.fy + (narrow ? 58 : 26), { size: 11.5, fill: K.tint(c.b, 0.16) });
          } else if (step === 1 && t > 0.35) {
            const N = Math.max(3, Math.round(dur / 100)), g = (L0.pos(1 / N) - L0.pos(0));
            const ax = L0.pos(0) + cw / 2, yy = L0.fy + 14;
            M.line(x, ax, yy, ax + g, yy, c.ink, 1.2); M.line(x, ax, yy - 4, ax, yy + 4, c.ink, 1.2); M.line(x, ax + g, yy - 4, ax + g, yy + 4, c.ink, 1.2);
            M.tag(x, `간격 모두 ${Math.round(g)}px = 속도 일정`, ax, yy + 18, { size: 11.5 });
          } else if (step === 2 && L1 && t > 0.6) {
            if (!narrow) M.callout(x, "넓음 = 빠름", L1.pos(L1.f(0.05)) + cw / 2, L1.fy, L1.pos(L1.f(0.1)) + cw / 2 + 30, L1.fy + 24, { size: 11.5 });
            M.callout(x, "촘촘 = 감속", L1.pos(0.97) + cw / 2, L1.fy, x1 - cw * 1.2, L1.fy + 24, { size: 11.5, fill: K.tint(c.b, 0.16) });
          } else if (step === 4) {
            M.tag(x, `둘 다 0 → 100%, ${dur}ms`, w / 2, 14, { align: "center", size: 11.5 });
          }
          // 그래프
          if (V.graph > 0.01) {
            const left = 46, gb = { x: left, y: LA + 8, w: w - left - 14, h: GH - 6 };
            const G = K.graph(x, gb, lanes.map((L) => ({ f: L.f, color: L.col, alpha: L.a })), { t, yl: "진행도", xl: "시간 →", alpha: V.graph });
            if (step === 3 && L1 && gb.h > 90) {
              const f = L1.f, slope = (tt) => (f(tt + 0.01) - f(tt - 0.01)) / 0.02;
              const tan = (tt, len) => {
                const s = slope(tt), dx = len / Math.hypot(1, s * gb.h / gb.w);
                const px = G.X(tt), py = G.Y(f(tt)), ddx = dx, ddy = -s * dx * gb.h / gb.w;
                M.line(x, px - ddx, py - ddy, px + ddx, py + ddy, c.ink, 2);
                return [px, py];
              };
              const [ax, ay] = tan(cmp === 1 ? 0.92 : 0.06, 26);
              M.callout(x, "가파름 = 빠름", ax, ay, ax + (cmp === 1 ? -40 : 46), ay + (cmp === 1 ? 26 : 18), { size: 11.5 });
              const [bx, by] = tan(cmp === 1 ? 0.12 : 0.88, 26);
              M.callout(x, cmp === 1 ? "평평 = 천천히 출발" : "평평 = 멈춰 감", bx, by, bx + (cmp === 1 ? 40 : -36), by + 26, { size: 11.5 });
              if (!narrow) M.callout(x, "직선 = 속도 일정", G.X(0.5), G.Y(0.5), G.X(0.62), G.Y(0.3), { size: 11.5, line: c.a });
            }
          }
          ro.innerHTML = `linear 속도 ×<b>${sp[0].toFixed(2)}</b>` + (sp[1] != null ? `\n${CMP[cmp].name} 속도 ×<b>${sp[1].toFixed(2)}</b>` : "");
        },
      };
    },
  });

  /* ===== 4-2 이징 곡선 ===== */
  LESSONS.push({
    id: "easing-curves", ch: 3, order: 2,
    title: "이징 곡선 읽고 만들기",
    lede: "CSS의 cubic-bezier는 점 네 개로 속도의 흐름을 정합니다. 이 레슨을 마치면 곡선 모양만 보고 어떤 UI 동작에 어울리는지 고를 수 있고, 직접 곡선을 만들어 코드로 가져갈 수 있습니다.",
    key: "들어올 땐 ease-out, 나갈 땐 ease-in, 화면 안에서 자리를 옮길 땐 ease-in-out. 오버슈트는 작은 강조에만.",
    steps: [
      ["ease-in: 천천히 출발", "출발이 느리고 끝에서 빨라집니다. 그래프 왼쪽 아래가 납작한 부분이 '천천히 출발'입니다. 끝에서 가장 빠르니 <b>화면 밖으로 나가는 요소</b>에 어울립니다. 오른쪽 미리보기에서 대화상자가 닫히는 모습을 보세요."],
      ["ease-out: 빠르게 반응", "빠르게 출발해 부드럽게 멈춥니다. 누르자마자 반응하는 느낌이라 <b>UI 등장·클릭 반응</b>의 기본값입니다. 첫 핸들 P1이 위로 높이 들릴수록 출발이 날카로워집니다. 대화상자가 열리는 장면이 훨씬 경쾌해졌습니다."],
      ["ease-in-out: 양쪽 다 부드럽게", "출발과 도착이 모두 부드러운 S자 곡선입니다. <b>이미 화면에 있는 요소가 자리를 옮길 때</b> 자연스럽습니다. 미리보기의 카드가 왼쪽 칸에서 오른쪽 칸으로 옮겨 갑니다. 대신 출발이 느려 클릭 반응에는 둔하게 느껴집니다."],
      ["오버슈트", "두 번째 핸들 P2를 1보다 위로 올리면 곡선이 100%를 넘었다가 돌아옵니다. 그래프의 옅은 띠가 <b>목표를 지나친 구간</b>입니다. 알림 배지가 톡 튀어나오는 것처럼 작은 강조에 좋지만, 자주 보는 큰 화면 전환에 쓰면 산만합니다."],
      ["직접 만들기", "그래프의 두 핸들(●)을 끌어 보세요. 오른쪽 '직접 해보기'의 CSS 값을 그대로 복사해 쓸 수 있습니다. 미리보기 종류도 바꿔 보며 같은 곡선이 등장·퇴장·이동에서 각각 어떻게 느껴지는지 비교해 보세요."],
    ],
    terms: [
      ["cubic-bezier(x1, y1, x2, y2)", "", "P0(0,0)과 P3(1,1) 사이 조절점 P1, P2의 좌표. x는 시간이라 0~1로 제한, y는 진행도라 범위를 벗어날 수 있습니다."],
      ["핸들", "Handle · Influence", "곡선의 기울기를 당기는 조절점. 애프터이펙트에선 '영향(Influence)'이라 부르며, 길수록 그 끝의 속도 변화가 완만해집니다."],
      ["오버슈트", "Overshoot", "목표값을 넘었다가 돌아오는 움직임. 탄력·장난스러움을 줄 때 씁니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const PRE = [
        { label: "ease-in", p: [0.42, 0, 1, 1] },
        { label: "ease-out", p: [0.16, 1, 0.3, 1] },
        { label: "ease-in-out", p: [0.65, 0, 0.35, 1] },
        { label: "overshoot", p: [0.34, 1.56, 0.64, 1] },
        { label: "linear", p: [0, 0, 1, 1] },
      ];
      const SC = ["퇴장", "등장", "이동", "팝"];
      if ((api.stage.clientWidth || 700) < 520) cv.style.minHeight = "540px";
      let P = PRE[0].p.slice(), f = M.bezier(...P), dur = 900, drag = -1, layout = null, step = 0, scene = 0;
      const R = { lo: -0.15, hi: 1.15 };
      const chips = M.chips(api.controls, { title: "프리셋", items: PRE.map((p) => p.label), value: 0, onPick: (i) => setP(PRE[i].p) });
      const chS = M.chips(api.controls, { title: "미리보기", items: SC, value: 0, onPick: (i) => { scene = i; api.restart(); } });
      const out = M.copyRow(api.controls);
      M.slider(api.controls, { id: "bzdur", label: "지속시간", min: 200, max: 2000, step: 50, value: 900, unit: " ms", onInput: (v) => { dur = v; api.restart(); } });
      function setP(p) { P = p.slice(); f = M.bezier(...P); out.textContent = `cubic-bezier(${P.map((v) => +v.toFixed(2)).join(", ")})`; api.restart(); }
      setP(P);
      const toPt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const near = (mx, my) => [[P[0], P[1]], [P[2], P[3]]].findIndex(([a, b]) => Math.hypot(layout.X(a) - mx, layout.Y(b) - my) < 20);
      const onDown = (e) => {
        if (!layout) return;
        const [mx, my] = toPt(e); drag = near(mx, my);
        if (drag >= 0) { cv.setPointerCapture(e.pointerId); chips.set(-1); }
      };
      const onMove = (e) => {
        if (!layout) return;
        const [mx, my] = toPt(e);
        if (drag < 0) { cv.style.cursor = near(mx, my) >= 0 ? "grab" : ""; return; }
        const vx = M.clamp(layout.iX(mx), 0, 1), vy = M.clamp(layout.iY(my), -0.6, 1.6);
        const n = P.slice(); n[drag * 2] = Math.round(vx * 100) / 100; n[drag * 2 + 1] = Math.round(vy * 100) / 100; setP(n);
      };
      const onUp = () => (drag = -1);
      cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove); cv.addEventListener("pointerup", onUp);
      /* 미리보기 장면 */
      const drawScene = (x, b, v, c) => {
        K.box(x, b.x, b.y, b.w, b.h, { r: 12, fill: K.tint(c.sunk, 0.6) });
        x.save(); M.rrect(x, b.x, b.y, b.w, b.h, 12); x.clip();
        // 배경 화면: 목록 줄
        for (let i = 0; i < 4; i++) K.bar(x, b.x + 16, b.y + 22 + i * 18, (b.w - 32) * (0.8 - i * 0.12), 6, M.alpha(c.ink, 0.12));
        if (scene <= 1) {
          const p = scene === 0 ? 1 - v : v;
          x.fillStyle = M.alpha(c.ink, 0.28 * M.clamp(p, 0, 1)); x.fillRect(b.x, b.y, b.w, b.h);
          const mw = Math.min(220, b.w * 0.7), mh = Math.min(140, b.h * 0.56), s = M.lerp(0.86, 1, p);
          const cx = b.x + b.w / 2, cy = b.y + b.h / 2 + (1 - p) * b.h * 0.18;
          x.save(); x.translate(cx, cy); x.scale(s, s);
          K.box(x, -mw / 2, -mh / 2, mw, mh, { r: 12, fill: K.tint(c.a, 0.1), alpha: M.clamp(p, 0, 1) });
          x.globalAlpha = M.clamp(p, 0, 1);
          K.bar(x, -mw / 2 + 16, -mh / 2 + 18, mw * 0.5, 8, M.alpha(c.ink, 0.7));
          K.bar(x, -mw / 2 + 16, -mh / 2 + 36, mw * 0.72, 5, M.alpha(c.ink, 0.25));
          K.bar(x, -mw / 2 + 16, -mh / 2 + 48, mw * 0.6, 5, M.alpha(c.ink, 0.25));
          const bw = Math.min(72, mw * 0.36);
          K.box(x, mw / 2 - bw - 14, mh / 2 - 34, bw, 22, { r: 11, fill: K.tint(c.a, 0.75), shadow: false });
          x.restore();
        } else if (scene === 2) {
          const sw = Math.min(130, (b.w - 48) / 2), sh = Math.min(84, b.h * 0.42), sy = b.y + b.h * 0.58 - sh / 2;
          const sx0 = b.x + 16, sx1 = b.x + b.w - 16 - sw;
          for (const sx of [sx0, sx1]) K.box(x, sx, sy, sw, sh, { r: 10, shadow: false, base: false, dash: [4, 4], stroke: M.alpha(c.ink, 0.4), lw: 1 });
          K.card(x, M.lerp(sx0, sx1, v), sy, sw, sh, c.c);
        } else {
          const bx = b.x + b.w / 2, by = b.y + b.h * 0.58, R0 = Math.min(30, b.h * 0.16);
          // 종 아이콘
          K.box(x, bx - R0, by - R0, R0 * 2, R0 * 2, { r: R0 * 0.7, fill: K.tint(c.key, 0.3) });
          M.line(x, bx - R0 * 0.45, by + R0 * 0.35, bx + R0 * 0.45, by + R0 * 0.35, c.ink, 1.5);
          x.beginPath(); x.arc(bx, by - R0 * 0.05, R0 * 0.45, Math.PI, 0); x.lineTo(bx + R0 * 0.45, by + R0 * 0.35); x.moveTo(bx - R0 * 0.45, by - R0 * 0.05); x.lineTo(bx - R0 * 0.45, by + R0 * 0.35); x.strokeStyle = c.ink; x.lineWidth = 1.5; x.stroke();
          const s = Math.max(0, v), br = R0 * 0.55;
          x.save(); x.translate(bx + R0 * 0.85, by - R0 * 0.85); x.scale(s, s);
          M.dot(x, 2, 3, br, c.ink); M.dot(x, 0, 0, br, c.b); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
          M.text(x, "3", 0, 1, { size: 12, align: "center", base: "middle", color: "#fff", weight: 700 });
          x.restore();
        }
        x.restore();
        M.tag(x, `미리보기 · ${SC[scene]}`, b.x + 10, b.y, { size: 11 });
      };
      return {
        setStep(s) { step = s; if (s < 4) { chips.set(s); setP(PRE[s].p); } scene = [0, 1, 2, 3, 1][s]; chS.set(scene); },
        frame(time, dt) {
          const { x, w, h } = M.fit(cv), c = M.col();
          const t = M.cycle(time, dur, 700), v = f(t);
          // y 범위: 곡선·핸들에 맞춰 부드럽게 넓힘 (끄는 중엔 고정)
          if (drag < 0) {
            let lo = Math.min(-0.12, P[1], P[3]), hi = Math.max(1.12, P[1], P[3]);
            for (let i = 0; i <= 40; i++) { const q = f(i / 40); lo = Math.min(lo, q - 0.08); hi = Math.max(hi, q + 0.08); }
            K.toward(R, "lo", lo, dt); K.toward(R, "hi", hi, dt);
          }
          const wide = w >= 520;
          let G, Sb;
          if (wide) {
            const side = Math.min(h - 50, w * 0.46);
            G = { x: 46, y: (h - side) / 2 + 4, s: side };
            Sb = { x: G.x + side + 34, y: Math.max(16, h / 2 - Math.min(h - 40, side) / 2), w: w - (G.x + side + 34) - 10 };
            Sb.h = Math.min(h - 40, side);
          } else {
            const side = Math.min(w - 64, h * 0.56);
            G = { x: 46, y: 10, s: side };
            Sb = { x: 8, y: G.y + side + 26, w: w - 20 }; Sb.h = h - Sb.y - 10;
          }
          const u = G.s / (R.hi - R.lo), gw = G.s;
          const X = (a) => G.x + a * gw, Y = (b) => G.y + (R.hi - b) * u;
          layout = { X, Y, iX: (px) => (px - G.x) / gw, iY: (py) => R.hi - (py - G.y) / u };
          K.box(x, G.x, G.y, gw, G.s, { r: 8, shadow: false });
          x.save(); M.rrect(x, G.x, G.y, gw, G.s, 8); x.clip();
          if (R.hi > 1.02) { x.fillStyle = M.alpha(c.b, step === 3 ? 0.16 : 0.08); x.fillRect(G.x, G.y, gw, Y(1) - G.y); }
          if (R.lo < -0.02) { x.fillStyle = M.alpha(c.a, 0.08); x.fillRect(G.x, Y(0), gw, G.y + G.s - Y(0)); }
          for (let i = 1; i < 4; i++) M.line(x, X(i / 4), G.y, X(i / 4), G.y + G.s, c.grid, 1);
          M.line(x, G.x, Y(0), G.x + gw, Y(0), M.alpha(c.ink, 0.25), 1, [3, 4]); M.line(x, G.x, Y(1), G.x + gw, Y(1), M.alpha(c.ink, 0.25), 1, [3, 4]);
          // 핸들 선
          M.line(x, X(0), Y(0), X(P[0]), Y(P[1]), M.alpha(c.ink, 0.55), 1.5); M.line(x, X(1), Y(1), X(P[2]), Y(P[3]), M.alpha(c.ink, 0.55), 1.5);
          M.line(x, G.x, Y(0), G.x + gw, Y(1), M.alpha(c.ink, 0.15), 1, [2, 4]);
          x.strokeStyle = c.a; x.lineWidth = 2.8; x.beginPath(); x.moveTo(X(0), Y(0));
          x.bezierCurveTo(X(P[0]), Y(P[1]), X(P[2]), Y(P[3]), X(1), Y(1)); x.stroke();
          M.line(x, X(t), G.y, X(t), G.y + G.s, M.alpha(c.key, 0.9), 1.5);
          x.restore();
          M.text(x, "0", G.x - 6, Y(0) + 4, { mono: true, size: 11, align: "right" });
          M.text(x, "1", G.x - 6, Y(1) + 4, { mono: true, size: 11, align: "right" });
          M.text(x, "시간 →", G.x + gw, G.y + G.s + 16, { size: 11, align: "right" });
          M.text(x, "진행도", G.x - 6, G.y + 12, { size: 11, align: "right" });
          M.dot(x, X(0), Y(0), 4, c.ink); M.dot(x, X(1), Y(1), 4, c.ink);
          M.dot(x, X(P[0]), Y(P[1]), 8, c.key, c.ink); M.dot(x, X(P[2]), Y(P[3]), 8, c.key, c.ink);
          M.dot(x, X(t), Y(v), 5.5, c.a, c.ink);
          // 주석
          const ann = (tt, s, dx, dy, o = {}) => { const px = X(tt), py = Y(f(tt)); M.callout(x, s, px, py, M.clamp(px + dx, G.x + 8, G.x + gw - 8), py + dy, { size: 11.5, ...o }); };
          if (step === 0) ann(0.3, "천천히 출발", -6, -44);
          else if (step === 1) ann(0.08, "즉시 출발", 40, 6);
          else if (step === 2) { ann(0.12, "부드러운 출발", 34, 8); ann(0.9, "부드러운 도착", -40, -8); }
          else if (step === 3) { let pk = 0, pv = 0; for (let i = 0; i <= 60; i++) { const q = f(i / 60); if (q > pv) { pv = q; pk = i / 60; } } ann(pk, `최고 ${Math.round(pv * 100)}% · 지나침`, -30, -6, { fill: K.tint(c.b, 0.16) }); }
          {
            const hp = (n, a, b, dy) => { const px = X(a), r = px > G.x + gw * 0.55; M.tag(x, wide ? `${n} (${a.toFixed(2)}, ${b.toFixed(2)})` : n, px + (r ? -12 : 12), M.clamp(Y(b) + dy, 12, h - 12), { mono: true, size: 11, align: r ? "right" : "left" }); };
            hp("P1", P[0], P[1], -15); hp("P2", P[2], P[3], 17);
          }
          if (step === 4 && drag < 0 && time < 2400) M.tag(x, "● 핸들을 끌어 보세요", G.x + gw / 2, G.y + G.s - 16, { align: "center", size: 11.5, fill: K.tint(c.key, 0.3) });
          // 미리보기 + 진행 막대
          const pb = { x: Sb.x, y: Sb.y + 6, w: Sb.w, h: Sb.h - 40 };
          drawScene(x, pb, v, c);
          const by = Sb.y + Sb.h - 14, bx0 = Sb.x + 70, bx1 = Sb.x + Sb.w - 50;
          M.text(x, "진행도", Sb.x, by + 4, { size: 11 });
          K.box(x, bx0, by - 6, bx1 - bx0, 12, { r: 6, shadow: false });
          const full = (bx1 - bx0 - 4) / 1.2;
          K.bar(x, bx0 + 2, by - 4, full * M.clamp(v, 0, 1.2), 8, v > 1 ? c.b : c.a);
          M.line(x, bx0 + 2 + full, by - 9, bx0 + 2 + full, by + 9, c.ink, 1.2);
          M.text(x, `${Math.round(v * 100)}%`, Sb.x + Sb.w, by + 4, { size: 11.5, mono: true, align: "right", color: c.ink, weight: 700 });
        },
        destroy() { cv.removeEventListener("pointerdown", onDown); },
      };
    },
  });

  /* ===== 4-3 지속시간 ===== */
  LESSONS.push({
    id: "duration", ch: 3, order: 3,
    title: "얼마나 길게",
    lede: "지속시간(duration)에 하나의 정답은 없지만 고르는 기준은 있습니다. 이 레슨을 마치면 움직이는 거리와 사용 빈도를 보고 100~500ms 안에서 알맞은 값을 고를 수 있습니다.",
    key: "멀리 갈수록 길게, 자주 보는 동작일수록 짧게. UI는 대부분 100~500ms, 나갈 땐 들어올 때보다 짧게.",
    steps: [
      ["모두 400ms", "세 동작에 모두 400ms를 줬습니다. 각 줄 오른쪽의 <b>시간 막대</b>가 모두 같은 길이입니다. 24px만 움직이는 토글은 굼떠 보이고, 화면을 가로지르는 패널은 상대적으로 서두르는 것처럼 보입니다."],
      ["모두 150ms", "모두 짧게 했습니다. 토글은 경쾌해졌지만 큰 패널은 따라갈 틈도 없이 <b>순간이동</b>처럼 보입니다. 사용자는 패널이 어디서 왔는지 놓칩니다."],
      ["거리에 비례", "멀리 갈수록 조금 더 길게 줍니다. 토글 120ms, 탭 밑줄 220ms, 사이드 패널 360ms. 각 줄의 <b>이동 거리 라벨</b>과 시간 막대가 함께 늘어납니다. 이제 세 동작의 체감 속도가 비슷해집니다."],
      ["자주 보는 건 짧게", "하루에 수백 번 보는 토글·호버는 100~150ms, 가끔 보는 큰 전환은 300~500ms가 적당합니다. 막대의 <b>500ms 선</b>을 넘으면 사용자는 기다린다고 느낍니다. 나갈 때는 들어올 때보다 짧게(약 70%) 잡아 화면을 빨리 비워 줍니다."],
    ],
    terms: [
      ["지속시간", "Duration", "움직임 한 번에 걸리는 시간. UI는 대체로 100~500ms, 영상 타이틀은 그보다 깁니다."],
      ["체감 속도", "Perceived speed", "실제 시간과 별개로 '빠르다/느리다'고 느끼는 정도. 거리와 이징에 따라 달라집니다."],
      ["지연", "Delay", "시작 전 대기 시간. 여러 요소에 조금씩 다르게 주면 스태거(stagger)가 됩니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const D = [[400, 400, 400], [150, 150, 150], [120, 220, 360], [120, 220, 360]];
      const FREQ = ["하루 수백 번", "하루 수십 번", "가끔"];
      let step = 0, mul = 1, exitShort = false;
      const V = { d0: 400, d1: 400, d2: 400, fq: 0 };
      const ro = M.readout(api.controls);
      const sl = M.slider(api.controls, { id: "durMul", label: "세 동작 모두 배율", min: 0.5, max: 2, step: 0.05, value: 1, fmt: (v) => "×" + v.toFixed(2), onInput: (v) => { mul = v; api.restart(); } });
      const ex = M.check(api.controls, { id: "durExit", label: "나갈 때 70%로 짧게", onChange: (v) => { exitShort = v; api.restart(); } });
      return {
        setStep(s) { step = s; mul = 1; sl.set(1); exitShort = s === 3; ex.set(exitShort); },
        frame(time, dt) {
          const { x, w, h } = M.fit(cv), c = M.col();
          const tgt = D[step].map((d) => d * mul);
          K.toward(V, "d0", tgt[0], dt); K.toward(V, "d1", tgt[1], dt); K.toward(V, "d2", tgt[2], dt); K.toward(V, "fq", step === 3 ? 1 : 0, dt);
          const ds = [V.d0, V.d1, V.d2], maxIn = Math.max(...tgt);
          const P = maxIn * 2 + 1600, local = time % P;
          const inEnd = maxIn + 700, back = local >= inEnd;
          const prog = (d) => {
            if (!back) return M.ease.out(Math.min(1, local / d));
            const de = exitShort ? d * 0.7 : d;
            return 1 - M.ease.in(Math.min(1, (local - inEnd) / de));
          };
          const narrow = w < 520, pad = 14, rowH = (h - 26) / 3;
          const bx = narrow ? w * 0.5 : w * 0.58, bw = w - pad - bx, msX = (ms) => bx + (ms / 600) * bw;
          const names = ["토글 스위치", "탭 밑줄", "사이드 패널"];
          // 500ms 기준선
          const lx = msX(500);
          M.line(x, lx, 4, lx, h - 4, M.alpha(c.b, step === 3 ? 0.7 : 0.3), 1, [4, 4]);
          M.tag(x, "500ms", lx, h - 12, { align: "center", size: 11, mono: true, fill: step === 3 ? K.tint(c.b, 0.2) : undefined });
          names.forEach((nm, i) => {
            const y0 = i * rowH, d = ds[i], p = prog(tgt[i]);
            const hy = y0 + 20;
            M.text(x, nm, pad, hy + 4, { size: 13, weight: 700, color: c.ink });
            x.font = M.font(13, "ui", 700);
            const nw = x.measureText(nm).width;
            const mt = M.tag(x, `${Math.round(d)} ms`, pad + nw + 8, hy, { mono: true, size: 11, fill: K.tint(c.key, 0.3) });
            // 시간 막대
            K.box(x, bx, hy - 7, bw, 14, { r: 7, shadow: false });
            K.bar(x, bx + 2, hy - 5, msX(d) - bx - 4, 10, M.alpha(c.a, 0.25));
            const run = back ? 0 : Math.min(1, local / tgt[i]);
            K.bar(x, bx + 2, hy - 5, (msX(d) - bx - 4) * run, 10, c.a);
            // 물체
            const oy = y0 + 36, oh = rowH - 46, ow = (narrow ? w - pad * 2 : bx - pad - 24);
            let dist = "";
            if (i === 0) {
              const th = M.clamp(oh * 0.62, 24, 44), tw = th * 1.75;
              K.toggle(x, pad, oy + oh / 2 - th / 2, tw, th, p, c.a);
              dist = `이동 ${Math.round(tw - th)}px`;
              M.text(x, dist, pad + tw + 14, oy + oh / 2 + 4, { mono: true, size: 11 });
            } else if (i === 1) {
              const tabs = ["개요", "상세", "리뷰"], tw = Math.min(120, (narrow ? ow * 0.62 : ow) / 3), th = M.clamp(oh * 0.7, 26, 46), ty = oy + oh / 2 - th / 2;
              K.box(x, pad, ty, tw * 3, th, { r: 8, shadow: false });
              tabs.forEach((t, j) => M.text(x, t, pad + j * tw + tw / 2, ty + th / 2 + 4, { size: 12.5, align: "center", color: c.ink }));
              K.bar(x, pad + p * tw * 2 + 10, ty + th - 6, tw - 20, 4, c.a);
              dist = `이동 ${Math.round(tw * 2)}px`;
              if (!narrow) M.text(x, dist, pad + tw * 3 + 14, ty + th / 2 + 4, { mono: true, size: 11 });
            } else {
              const sh = Math.max(34, oh), sw = ow, sy = oy;
              K.box(x, pad, sy, sw, sh, { r: 8, fill: K.tint(c.sunk, 0.5), shadow: false });
              x.save(); M.rrect(x, pad, sy, sw, sh, 8); x.clip();
              for (let k = 0; k < 3; k++) K.bar(x, pad + 12, sy + 12 + k * 12, sw * (0.5 - k * 0.1), 5, M.alpha(c.ink, 0.14));
              x.fillStyle = M.alpha(c.ink, 0.18 * p); x.fillRect(pad, sy, sw, sh);
              const pw = Math.min(240, sw * 0.55), px = pad + sw - pw * p;
              K.box(x, px, sy + 4, pw, sh - 8, { r: 8, fill: K.tint(c.a, 0.16) });
              for (let k = 0; k < 3; k++) K.bar(x, px + 14, sy + 16 + k * 12, pw * (0.6 - k * 0.12), 5, M.alpha(c.ink, 0.45));
              x.restore();
              dist = `이동 ${Math.round(pw)}px`;
              M.tag(x, dist, pad + 8, sy + sh - 12, { mono: true, size: 11 });
            }
            if (V.fq > 0.02) {
              x.save(); x.globalAlpha = V.fq;
              if (narrow) M.tag(x, FREQ[i], w - pad, i === 2 ? oy + 14 : oy + oh / 2, { size: 11, align: "right", fill: K.tint(c.c, 0.2) });
              else M.tag(x, FREQ[i], mt.x + mt.w + 10, hy, { size: 11, fill: K.tint(c.c, 0.2) });
              x.restore();
            }
          });
          M.tag(x, back ? (exitShort ? "← 나가는 중 · 70%" : "← 나가는 중") : "→ 들어오는 중", pad, h - 12, { size: 11, fill: back ? K.tint(c.b, 0.18) : K.tint(c.a, 0.18) });
          ro.innerHTML = `토글 <b>${Math.round(tgt[0])}</b> · 탭 <b>${Math.round(tgt[1])}</b> · 패널 <b>${Math.round(tgt[2])}</b> ms` + (tgt[2] > 500 ? "\n패널이 500ms를 넘었습니다 → 기다린다고 느낌" : tgt[2] < 200 ? "\n패널이 200ms 미만 → 순간이동처럼 보임" : "");
        },
      };
    },
  });

  /* ===== 4-4 스프링 ===== */
  LESSONS.push({
    id: "spring", ch: 3, order: 4,
    title: "스프링: 지속시간 대신 물리",
    lede: "iOS, Framer Motion, React Spring은 곡선 대신 스프링을 씁니다. 이 레슨을 마치면 강성·감쇠·질량 세 값이 출렁임과 정착 시간을 어떻게 만드는지 읽고, 원하는 느낌의 값을 고를 수 있습니다.",
    key: "스프링은 시간을 정하지 않습니다. 강성·감쇠·질량이 시간을 만들고, 감쇠비 ζ 하나로 성격을 읽습니다.",
    steps: [
      ["임계 감쇠", "감쇠비(damping ratio) ζ가 1이면 <b>튀지 않으면서 가장 빨리</b> 목표에 닿습니다. 그래프의 <b>정착</b> 라벨이 움직임이 멈춘 시점입니다. 바텀 시트처럼 깔끔해야 하는 UI 전환의 기본값입니다."],
      ["부족 감쇠", "감쇠를 줄여 ζ &lt; 1이 되면 목표를 지나쳤다가 몇 번 출렁이며 멈춥니다. 그래프의 <b>오버슈트</b> 라벨이 얼마나 넘쳤는지 보여 줍니다. 점선은 임계 감쇠입니다. 손으로 튕긴 듯한 탄성이 생기지만 정착은 늦어집니다."],
      ["과감쇠", "감쇠를 키워 ζ &gt; 1이 되면 꿀 속을 지나듯 느릿하게 다가갑니다. 출렁임은 없지만 점선(임계 감쇠)보다 <b>늦게 도착</b>합니다. 무겁고 신중한 느낌이 필요할 때만 씁니다."],
      ["질량", "질량을 4배로 늘렸습니다. 같은 힘에 더 느리게 반응하고, 출렁임은 <b>크고 길어집니다</b>. 시트가 두꺼워진 것이 무게의 표시입니다. 큰 패널에 묵직함을 줄 때 씁니다."],
      ["직접 조절", "슬라이더로 값을 바꿔 보세요. 정착 시간은 직접 정하는 값이 아니라 <b>결과</b>입니다. '목표 바꾸기'를 움직이는 도중에 눌러 보면, 시트가 현재 속도(화살표)를 이어받아 자연스럽게 방향을 틉니다. 곡선 애니메이션은 이렇게 끊김 없이 되돌리기 어렵습니다."],
    ],
    terms: [
      ["강성", "Stiffness (k)", "목표로 당기는 힘의 세기. 클수록 빠르고 날카롭습니다. Framer Motion 기본 100."],
      ["감쇠", "Damping (c)", "움직임을 잡아먹는 마찰. 클수록 덜 튑니다."],
      ["질량", "Mass (m)", "움직이는 물체의 무게. 클수록 둔하고 출렁임이 깁니다."],
      ["감쇠비", "Damping ratio ζ", "c / 2√(km). 1이면 임계, 작으면 튀고, 크면 느립니다. Apple은 이 값과 '반응 시간'으로 스프링을 정의합니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const PRE = [[170, 26, 1], [170, 7, 1], [170, 60, 1], [170, 14, 4], [220, 18, 1]];
      let k = 170, cc = 26, m = 1, sp = M.spring(k, cc, m), crit = M.spring(k, 2 * Math.sqrt(k * m), m), step = 0;
      const sim = { p: 0, v: 0, g: 1, since: 0, idle: 0, last: -1 };
      const V = { m: 1 };
      const ro = M.readout(api.controls);
      const reset = () => { sim.p = 0; sim.v = 0; sim.g = 1; sim.since = 0; sim.idle = 0; };
      const upd = () => {
        sp = M.spring(k, cc, m); crit = M.spring(k, 2 * Math.sqrt(k * m), m);
        ro.innerHTML = `감쇠비 ζ = <b>${sp.zeta.toFixed(2)}</b>   정착 ≈ <b>${Math.round(sp.settle * 1000)} ms</b>\n{ type: "spring", stiffness: ${k}, damping: ${cc}, mass: ${m} }`;
        reset(); api.restart();
      };
      const sk = M.slider(api.controls, { id: "sk", label: "강성 stiffness", min: 20, max: 500, value: k, onInput: (v) => { k = v; upd(); } });
      const sc = M.slider(api.controls, { id: "sc", label: "감쇠 damping", min: 1, max: 80, value: cc, onInput: (v) => { cc = v; upd(); } });
      const sm = M.slider(api.controls, { id: "sm", label: "질량 mass", min: 0.2, max: 6, step: 0.1, value: m, onInput: (v) => { m = v; upd(); } });
      const flip = () => { sim.g = 1 - sim.g; sim.since = 0; sim.idle = 0; };
      const btn = M.el("button", { class: "chip", onclick: flip }, "목표 바꾸기");
      api.controls.append(M.el("div", { class: "ctl" }, M.el("span", { class: "lbl" }, "움직이는 도중에 눌러 보세요"), btn));
      cv.addEventListener("pointerdown", flip);
      return {
        setStep(s) { step = s; [k, cc, m] = PRE[s]; sk.set(k); sc.set(cc); sm.set(m); upd(); },
        frame(time, dt) {
          const { x, w, h } = M.fit(cv), c = M.col();
          K.toward(V, "m", m, dt);
          // 실시간 시뮬레이션
          if (time < sim.last) reset();
          sim.last = time;
          let rem = (dt || 0) / 1000;
          while (rem > 1e-6) { const h1 = Math.min(rem, 1 / 240); const a = (-k * (sim.p - sim.g) - cc * sim.v) / m; sim.v += a * h1; sim.p += sim.v * h1; rem -= h1; }
          sim.since += dt || 0;
          if (Math.abs(sim.p - sim.g) < 0.002 && Math.abs(sim.v) < 0.02) { sim.idle += dt || 0; if (sim.idle > 800) flip(); } else sim.idle = 0;
          const T = M.clamp(sp.settle * 1.15, 0.6, 4);
          const side = w >= 480;
          // 장면 상자
          const S = side ? { x: 10, y: 10, w: Math.min(220, w * 0.32), h: h - 20 } : { x: 10, y: 10, w: w - 20, h: Math.min(150, h * 0.36) };
          K.box(x, S.x, S.y, S.w, S.h, { r: 14, fill: K.tint(c.sunk, 0.6) });
          x.save(); M.rrect(x, S.x, S.y, S.w, S.h, 14); x.clip();
          for (let i = 0; i < 3; i++) K.bar(x, S.x + 14, S.y + 18 + i * 14, (S.w - 28) * (0.7 - i * 0.15), 6, M.alpha(c.ink, 0.12));
          const thick = M.clamp(0.7 + 0.12 * V.m, 0.7, 1.4);
          let vec;
          if (side) {
            const sh = S.h * 0.42 * thick, top1 = S.y + S.h * 0.4, top0 = S.y + S.h - 6;
            const ty = M.lerp(top0, top1, sim.p);
            M.line(x, S.x, top1, S.x + S.w, top1, M.alpha(c.key, 0.9), 1.5, [5, 4]);
            // 코일
            x.strokeStyle = M.alpha(c.ink, 0.5); x.lineWidth = 1.3; x.beginPath();
            const n = 16, cx = S.x + S.w / 2;
            for (let i = 0; i <= n; i++) { const yy = M.lerp(S.y + S.h, ty + sh, i / n); const xx = cx + (i === 0 || i === n ? 0 : i % 2 ? -9 : 9); i ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
            x.stroke();
            K.box(x, S.x + 8, ty, S.w - 16, sh, { r: 14, fill: K.tint(c.a, 0.18) });
            K.bar(x, S.x + S.w / 2 - 18, ty + 8, 36, 5, M.alpha(c.ink, 0.45));
            for (let i = 0; i < 3; i++) K.bar(x, S.x + 22, ty + 26 + i * 14, (S.w - 44) * (0.8 - i * 0.2), 6, M.alpha(c.ink, 0.3));
            vec = [S.x + S.w - 26, ty + 20, 0, -sim.v * (top0 - top1) * 0.06 * (sim.g ? 1 : 1)];
            x.restore();
            M.tag(x, "목표", S.x + S.w - 8, top1 - 12, { align: "right", size: 11, fill: K.tint(c.key, 0.3) });
          } else {
            const sw = S.w * 0.3 * thick, l1 = S.x + S.w - sw - 14, l0 = S.x + 14;
            const lx = M.lerp(l0, l1, sim.p);
            M.line(x, l1 + sw, S.y, l1 + sw, S.y + S.h, M.alpha(c.key, 0.9), 1.5, [5, 4]);
            const cy = S.y + S.h * 0.6, ch = S.h * 0.5;
            x.strokeStyle = M.alpha(c.ink, 0.5); x.lineWidth = 1.3; x.beginPath();
            for (let i = 0; i <= 16; i++) { const xx = M.lerp(S.x, lx, i / 16); const yy = cy + (i === 0 || i === 16 ? 0 : i % 2 ? -8 : 8); i ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
            x.stroke();
            K.box(x, lx, cy - ch / 2, sw, ch, { r: 12, fill: K.tint(c.a, 0.18) });
            for (let i = 0; i < 3; i++) K.bar(x, lx + 12, cy - ch / 2 + 14 + i * 12, (sw - 24) * (0.8 - i * 0.2), 5, M.alpha(c.ink, 0.3));
            vec = [lx + sw / 2, cy - ch / 2 - 10, sim.v * (l1 - l0) * 0.06, 0];
            x.restore();
            M.tag(x, "목표", l1 + sw - 6, S.y + 14, { align: "right", size: 11, fill: K.tint(c.key, 0.3) });
          }
          // 속도 화살표
          const vl = Math.hypot(vec[2], vec[3]);
          if (vl > 4) { const s = Math.min(1, 60 / vl); M.arrow(x, vec[0], vec[1], vec[0] + vec[2] * s, vec[1] + vec[3] * s, c.b, 2.2); }
          if (step >= 3) M.tag(x, `m = ${m}`, S.x + 10, S.y + 14, { mono: true, size: 11 });
          // 그래프
          const gb = side ? { x: S.x + S.w + 52, y: 14, w: w - (S.x + S.w + 52) - 12, h: h - 28 } : { x: 46, y: S.y + S.h + 16, w: w - 58, h: h - (S.y + S.h + 16) - 8 };
          let peak = 0, pt = 0;
          const NN = 200; for (let i = 0; i <= NN; i++) { const q = sp.at((i / NN) * T); if (q > peak) { peak = q; pt = i / NN; } }
          const ymax = Math.max(1.25, peak + 0.22), ymin = -0.08;
          const ts = Math.min(sim.since / 1000, T) / T;
          const G = K.graph(x, gb, [
            { f: (t) => crit.at(t * T), color: M.alpha(c.ink, 0.45), w: 1.5, dash: [4, 4], noDot: true },
            { f: (t) => sp.at(t * T), color: c.a },
          ], { t: ts, ymin, ymax, yl: "위치", xl: `시간 → ${T.toFixed(1)}s`, top: "목표" });
          const sx = G.X(Math.min(1, sp.settle / T));
          M.line(x, sx, gb.y + 22, sx, gb.y + gb.h, M.alpha(c.c, 0.9), 1.5, [3, 3]);
          M.tag(x, `정착 ${Math.round(sp.settle * 1000)}ms`, sx, gb.y + gb.h * 0.72, { align: sx > gb.x + gb.w * 0.6 ? "right" : "left", size: 11, mono: true, fill: K.tint(c.c, 0.2) });
          if (peak > 1.01) M.callout(x, `오버슈트 +${Math.round((peak - 1) * 100)}%`, G.X(pt), G.Y(peak), Math.min(gb.x + gb.w - 10, G.X(pt) + 40), G.Y(peak) - 4 < gb.y + 30 ? gb.y + 40 : G.Y(peak) - 14, { size: 11, mono: true, fill: K.tint(c.b, 0.18) });
          M.tag(x, `ζ = ${sp.zeta.toFixed(2)}`, gb.x + gb.w - 8, gb.y + 16, { align: "right", mono: true, size: 11.5, fill: K.tint(sp.zeta < 0.95 ? c.b : sp.zeta > 1.05 ? c.a : c.c, 0.22) });
          if (step >= 1 && step <= 2 && gb.w > 200) M.text(x, "점선 = 임계 감쇠(ζ 1)", gb.x + 10, gb.y + gb.h - 10, { size: 11 });
        },
        destroy() { cv.removeEventListener("pointerdown", flip); },
      };
    },
  });

  /* ===== 4-5 애니메이션 원칙 ===== */
  LESSONS.push({
    id: "principles", ch: 3, order: 5,
    title: "예비동작, 오버슈트, 스쿼시",
    lede: "디즈니 애니메이터들이 정리한 '애니메이션의 12원칙'은 지금도 모션 디자인의 공용어입니다. 이 레슨을 마치면 UI에서 가장 자주 쓰는 세 원칙을 그래프 모양으로 알아보고 강도를 조절할 수 있습니다.",
    key: "예비동작은 예고, 오버슈트는 관성, 스쿼시는 속도감. 강도는 브랜드 성격에 맞춰 조금씩.",
    steps: [
      ["기본 이동", "캐릭터가 <code>ease-in-out</code>으로 출발선에서 도착선까지 갑니다. 깔끔하지만 무게도 성격도 없습니다. 아래 그래프의 점선이 이후 단계와 비교할 기준입니다."],
      ["예비동작", "예비동작(anticipation)은 출발 전에 <b>반대 방향으로 살짝 물러나는</b> 동작입니다. 점프 전에 무릎을 굽히는 것과 같습니다. 그래프가 0 아래로 내려간 파란 구간이 그 순간입니다. 보는 사람이 '곧 움직인다'를 미리 알아챕니다."],
      ["오버슈트", "도착할 때 <b>도착선을 지나쳤다가 돌아옵니다</b>. 12원칙의 팔로우 스루(follow-through)에 해당합니다. 그래프가 100% 위로 솟은 빨간 구간입니다. 멈추는 순간에도 관성이 살아 있다는 느낌을 줍니다."],
      ["둘 다", "예비동작과 오버슈트를 함께 넣었습니다. 같은 거리와 시간인데 훨씬 살아 있는 움직임이 됩니다. 오른쪽 <b>강도</b> 슬라이더로 0~150%를 오가 보세요. 버튼이나 아이콘에는 30~50% 정도가 적당하고, 과하면 만화처럼 보입니다."],
      ["스쿼시 앤 스트레치", "빠르게 움직일수록 진행 방향으로 <b>늘어나고</b>, 그만큼 위아래는 줄어 부피를 유지합니다. 출발 전 웅크릴 땐 납작해집니다. 속도감과 탄성을 동시에 주는 가장 유명한 원칙으로, UI에선 버튼을 누를 때 살짝 눌리는 정도로 씁니다."],
    ],
    terms: [
      ["애니메이션 12원칙", "12 principles", "스쿼시 앤 스트레치, 예비동작, 연출, 포즈 투 포즈, 팔로우 스루, 슬로 인·아웃, 아크, 2차 동작, 타이밍, 과장, 입체감, 어필."],
      ["예비동작", "Anticipation", "본 동작 전 반대 방향 준비 동작. 큰 동작을 예고할 때 씁니다."],
      ["팔로우 스루", "Follow-through", "멈춘 뒤에도 관성으로 조금 더 가는 움직임. UI에선 오버슈트로 구현합니다."],
      ["스쿼시 앤 스트레치", "Squash & stretch", "부피를 유지하며 찌그러지고 늘어나는 변형. 속도감과 탄성을 줍니다."],
      ["슬로 인 · 슬로 아웃", "Slow in & out", "출발·도착에서 느려지는 것. 이징의 원조입니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      let step = 0, dur = 1100, trail = true, amt = 1;
      const X0 = { a: 0, b: 0, init: 0 };
      const make = () => {
        const a = 0.45 * amt, o = 0.55 * amt;
        return [M.bezier(0.65, 0, 0.35, 1), M.bezier(0.6, -a, 0.3, 1), M.bezier(0.34, 1 + o, 0.64, 1), M.bezier(0.68, -a * 1.2, 0.265, 1 + o), M.bezier(0.68, -a * 1.2, 0.265, 1 + o)];
      };
      const css = () => {
        const a = +(0.45 * amt).toFixed(2), o = +(0.55 * amt).toFixed(2);
        return ["cubic-bezier(0.65, 0, 0.35, 1)", `cubic-bezier(0.6, ${-a}, 0.3, 1)`, `cubic-bezier(0.34, ${1 + o}, 0.64, 1)`, `cubic-bezier(0.68, ${+(-a * 1.2).toFixed(2)}, 0.265, ${1 + o})`, `cubic-bezier(0.68, ${+(-a * 1.2).toFixed(2)}, 0.265, ${1 + o})`][step];
      };
      let F = make();
      const ro = M.copyRow(api.controls);
      const upd = () => { F = make(); ro.textContent = css(); };
      M.slider(api.controls, { id: "prAmt", label: "강도 (예비동작·오버슈트)", min: 0, max: 150, step: 5, value: 100, unit: "%", onInput: (v) => { amt = v / 100; upd(); api.restart(); } });
      M.slider(api.controls, { id: "prdur", label: "지속시간", min: 400, max: 2000, step: 50, value: 1100, unit: " ms", onInput: (v) => { dur = v; api.restart(); } });
      M.check(api.controls, { id: "prtrail", label: "잔상 보기", checked: true, onChange: (v) => (trail = v) });
      return {
        setStep(s) { step = s; upd(); },
        frame(time, dt) {
          const { x, w, h } = M.fit(cv), c = M.col();
          const f = F[step], t = M.cycle(time, dur, 900);
          const SH = Math.max(140, h * 0.52), fy = SH - 22;
          const S = Math.min(84, SH * 0.42);
          let lo = -0.08, hi = 1.08; for (let i = 0; i <= 60; i++) { const yv = f(i / 60); lo = Math.min(lo, yv); hi = Math.max(hi, yv); }
          const in0 = 16 + S * 0.6, in1 = w - 16 - S * 0.6, D = (in1 - in0) / (hi - lo);
          K.toward(X0, "a", in0 - lo * D, dt); K.toward(X0, "b", in0 - lo * D + D, dt);
          if (!X0.init) { X0.a = in0 - lo * D; X0.b = X0.a + D; X0.init = 1; }
          const x0 = X0.a, x1 = X0.b;
          // 바닥, 출발·도착선
          M.line(x, 12, fy, w - 12, fy, c.ink, 1.25);
          for (let i = 0; i < (w - 24) / 14; i++) M.line(x, 16 + i * 14, fy + 2, 10 + i * 14, fy + 9, M.alpha(c.ink, 0.2), 1);
          M.line(x, x0, 26, x0, fy, M.alpha(c.ink, 0.35), 1, [3, 4]); M.line(x, x1, 26, x1, fy, M.alpha(c.key, 0.9), 1.5, [3, 4]);
          M.tag(x, "출발", x0, 16, { align: "center", size: 11 }); M.tag(x, "도착", x1, 16, { align: "center", size: 11, fill: K.tint(c.key, 0.3) });
          const pose = (tt) => {
            const e = 0.004, v = f(tt), vel = (f(Math.min(1, tt + e)) - f(Math.max(0, tt - e))) / (2 * e);
            let sx = 1, sy = 1;
            if (step === 4) {
              sx = 1 + Math.min(0.55, Math.abs(vel) * 0.16); sy = 1 / sx;
              if (v < -0.005 && tt < 0.5) { const q = Math.min(0.25, -v * 1.4); sy = 1 - q; sx = 1 / sy; }
            }
            return { px: M.lerp(x0, x1, v), sx, sy, look: M.clamp(vel * 0.5, -1, 1) };
          };
          if (trail) for (let k = 0; k <= 14; k++) { if (k / 14 > t) break; const q = pose(k / 14); K.blob(x, q.px, fy, S, c.b, { sx: q.sx, sy: q.sy, ghost: true, alpha: 0.4 }); }
          const q = pose(t);
          K.blob(x, q.px, fy, S, c.b, { sx: q.sx, sy: q.sy, look: t > 0 && t < 1 ? q.look : 0 });
          const v = f(t);
          if (step === 1 || step === 3) if (v < -0.01) M.callout(x, "뒤로 물러남", q.px - S * 0.5, fy - S * 0.5, q.px - S - 10, fy - S - 14, { size: 11.5, fill: K.tint(c.a, 0.18) });
          if (step === 2 || step === 3) if (v > 1.01) M.callout(x, "지나침", q.px + S * 0.45, fy - S * 0.5, q.px - S * 0.2, fy - S - 16, { size: 11.5, fill: K.tint(c.b, 0.18) });
          if (step === 4 && q.sx > 1.12) M.callout(x, `늘어남 ×${q.sx.toFixed(2)}`, q.px, fy - S * q.sy, q.px + 10, Math.max(14, fy - S - 30), { size: 11.5, mono: true });
          if (step === 4 && q.sy < 0.9) M.callout(x, "웅크림", q.px, fy - S * q.sy, q.px - 16, Math.max(14, fy - S - 30), { size: 11.5 });
          // 그래프
          const gb = { x: 46, y: SH + 6, w: w - 60, h: h - SH - 12 };
          if (gb.h > 70) {
            lo -= 0.06; hi += 0.06;
            K.graph(x, gb, [{ f: F[0], color: M.alpha(c.ink, 0.45), w: 1.5, dash: [4, 4], noDot: true }, { f, color: c.b }], {
              t, ymin: lo, ymax: hi, yl: "위치", xl: "시간 →", top: "도착", bottom: "출발",
              under: (X, Y) => {
                if (lo < -0.02) { x.fillStyle = M.alpha(c.a, 0.14); x.fillRect(gb.x, Y(0), gb.w, gb.y + gb.h - Y(0)); }
                if (hi > 1.12) { x.fillStyle = M.alpha(c.b, 0.12); x.fillRect(gb.x, gb.y, gb.w, Y(1) - gb.y); }
              },
            });
          }
        },
      };
    },
  });
})();
