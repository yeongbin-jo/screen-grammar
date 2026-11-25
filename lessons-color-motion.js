/* 3장 색(배색 · 색의 역할 · 다크 모드), 4장 움직임의 문법(스태거 · 중단 가능한 애니메이션) */
(() => {
  /* ---------- 색 계산 (이 파일 전용) ---------- */
  const CM = {
    toLin: (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)),
    toGam: (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055),
    raw(L, Ch, h) {
      const a = Ch * Math.cos((h * Math.PI) / 180), b = Ch * Math.sin((h * Math.PI) / 180);
      const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
      return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    },
    /* oklch → sRGB(0~1). 색역 밖이면 채도만 줄여 맞춤 */
    oklch(L, Ch, h) {
      const ok = (v) => v.every((x) => x >= -1e-4 && x <= 1 + 1e-4);
      let lin = CM.raw(L, Ch, h);
      if (!ok(lin)) {
        let lo = 0, hi = Ch;
        for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; if (ok(CM.raw(L, mid, h))) lo = mid; else hi = mid; }
        lin = CM.raw(L, lo, h);
      }
      return lin.map((v) => CM.toGam(M.clamp(v, 0, 1)));
    },
    hsl(h, s, l) {
      h = ((h % 360) + 360) % 360;
      const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
      const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [f(0), f(8), f(4)];
    },
    toHsl([r, g, b]) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
      if (mx - mn < 1e-6) return [0, 0, l];
      const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return [h * 60, s, l];
    },
    L(rgb) {
      const [r, g, b] = rgb.map(CM.toLin);
      const l = Math.cbrt(0.4122214708 * r + 0.5363288035 * g + 0.0514459929 * b);
      const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
      const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
      return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    },
    gray(rgb) { const g = CM.toGam(M.clamp(CM.L(rgb) ** 3, 0, 1)); return [g, g, g]; },
    css: (rgb) => `rgb(${rgb.map((v) => Math.round(M.clamp(v, 0, 1) * 255)).join(",")})`,
    Y: (rgb) => { const [r, g, b] = rgb.map(CM.toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; },
    ratio: (a, b) => { const A = CM.Y(a), B = CM.Y(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); },
  };
  const wrapDeg = (d) => ((d % 360) + 540) % 360 - 180;
  /* 불투명 틴트: 표면색에 색을 t 만큼 섞음 (태그 바탕용) */
  const tint = (col, t) => {
    const hx = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((q) => q + q).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const a = hx(M.col().surface), b = hx(col);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
  };

  /* ===== 3-2 색상환과 배색 ===== */
  LESSONS.push({
    id: "harmony", ch: 2, order: 2,
    title: "색상환과 배색",
    lede: "이 레슨을 마치면 보색·유사색·삼각·분할보색 네 가지 배색 규칙을 색상환 위의 각도로 읽고, 왜 같은 규칙도 OKLCH 색상환에서 골라야 균형이 맞는지 알게 됩니다.",
    key: "배색은 색상(H) 각도만 돌려 고르고 밝기(L)와 채도(C)는 고정합니다. OKLCH 색상환에서 고르면 밝기가 저절로 맞습니다.",
    steps: [
      ["세 축: 색상·채도·명도", "색은 세 숫자로 설명합니다. <b>색상</b>(hue)은 색상환을 도는 각도, <b>채도</b>(chroma)는 중심에서 떨어진 거리, <b>명도</b>(lightness)는 밝기입니다. 오른쪽 세 줄은 한 축만 바꾼 결과이고, 진한 테두리 칸이 지금 고른 색입니다. 색상환 안을 끌어 기준 색을 바꿔 보세요."],
      ["보색", "색상환에서 <b>정반대(180°)</b>에 있는 두 색, 즉 보색(complementary)입니다. 가운데 각도 표시가 180°입니다. 대비가 가장 강해 서로를 돋보이게 하지만 같은 면적으로 쓰면 눈이 피로합니다. 아래 면적 막대처럼 한쪽을 80%로 넓게, 다른 쪽을 20%로 좁게 씁니다."],
      ["유사색", "기준 색 양옆 <b>±30°</b> 안의 이웃 색, 즉 유사색(analogous)입니다. 서로 부딪히지 않아 차분하고 통일감이 있습니다. 대신 대비가 약하니, 버튼처럼 눈에 띄어야 하는 곳은 명도 차이로 만듭니다."],
      ["삼각 배색", "색상환을 <b>120°씩 삼등분</b>한 세 색입니다. 색상환 위에 정삼각형이 생깁니다. 다채로우면서 균형이 잡혀 차트의 범주 색 출발점으로 좋습니다. 세 색을 같은 면적으로 쓰지 말고 60 · 30 · 10처럼 주종을 나눕니다."],
      ["분할보색", "보색 자리 대신 그 <b>양옆(180° ± 30°)</b> 두 색을 씁니다. 각도 표시가 150°로 바뀌었습니다. 보색만큼 대비가 있으면서 덜 날카로워, 처음 배색을 고를 때 가장 무난한 규칙입니다."],
      ["왜 OKLCH에서 고르나", "같은 규칙을 HSL 색상환에 적용하면 노랑·연두는 밝고 파랑·보라는 어두워 <b>한 색만 튀어</b> 보입니다. 오른쪽 아래 HSL 줄의 흑백을 보면 한 칸이 유독 밝거나 어둡습니다. OKLCH는 L과 C를 고정하고 H만 돌리므로 흑백도 고릅니다. 맨 아래 두 편차 숫자를 비교해 보세요."],
    ],
    terms: [
      ["색상환", "Color wheel", "색상을 원 둘레에 각도로 늘어놓은 도표. 배색 규칙은 이 위의 각도 관계입니다."],
      ["보색", "Complementary", "색상환에서 180° 떨어진 두 색. 대비가 가장 강합니다."],
      ["유사색", "Analogous", "색상환에서 이웃한(±30° 안팎) 색들. 차분하고 통일감이 있습니다."],
      ["삼각 배색", "Triadic", "120° 간격의 세 색. 다채롭지만 균형 잡힌 조합입니다."],
      ["분할보색", "Split-complementary", "기준 색 + 보색 양옆(180° ± 30°) 두 색. 보색보다 부드러운 대비."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const CMAX = 0.25;
      const RULES = [
        { name: "기준 색", off: [0, 0, 0], n: 1, hl: [[1, 1]] },
        { name: "보색 · 180°", off: [0, 180, 180], n: 2, hl: [[1, 1], [3, 4]] },
        { name: "유사색 · ±30°", off: [0, -30, 30], n: 3, hl: [[1, 1], [6, 8]] },
        { name: "삼각 배색 · 120° 간격", off: [0, 120, 240], n: 3, hl: [[1, 1], [10, 12]] },
        { name: "분할보색 · 180° ± 30°", off: [0, 150, 210], n: 3, hl: [[1, 1], [14, 16]] },
      ];
      let H = 255, L = 0.7, Cc = 0.14, rule = 0, step = 0;
      const cur = [0, 0, 0];
      let disc = null, discL = -1, geo = { cx: 0, cy: 0, R: 1 };

      const code = () => api.code(
        `:root {\n  --base: oklch(${L.toFixed(2)} ${Cc.toFixed(3)} ${Math.round(H)});\n\n  /* 보색: 색상만 180° */\n  --comp: oklch(from var(--base) l c calc(h + 180));\n\n  /* 유사색: ±30° */\n  --ana-1: oklch(from var(--base) l c calc(h - 30));\n  --ana-2: oklch(from var(--base) l c calc(h + 30));\n\n  /* 삼각: 120° 간격 */\n  --tri-1: oklch(from var(--base) l c calc(h + 120));\n  --tri-2: oklch(from var(--base) l c calc(h + 240));\n\n  /* 분할보색: 180° ± 30° */\n  --split-1: oklch(from var(--base) l c calc(h + 150));\n  --split-2: oklch(from var(--base) l c calc(h + 210));\n}`,
        RULES[rule].hl, "CSS · 상대 색 문법");

      const sH = M.slider(api.controls, { id: "hmH", label: "기준 색상 H", min: 0, max: 359, value: H, unit: "°", onInput: (v) => { H = v; code(); } });
      const sC = M.slider(api.controls, { id: "hmC", label: "채도 C", min: 0.02, max: 0.25, step: 0.005, value: Cc, fmt: (v) => v.toFixed(3), onInput: (v) => { Cc = v; code(); } });
      M.slider(api.controls, { id: "hmL", label: "명도 L", min: 0.35, max: 0.92, step: 0.01, value: L, fmt: (v) => v.toFixed(2), onInput: (v) => { L = v; code(); } });
      const chips = M.chips(api.controls, { title: "배색 규칙", items: ["보색", "유사색", "삼각", "분할보색"], onPick: (i) => { rule = i + 1; code(); } });

      function makeDisc() {
        const S = 170, oc = document.createElement("canvas");
        oc.width = oc.height = S;
        const g = oc.getContext("2d"), img = g.createImageData(S, S), d = img.data;
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          const dx = ((x + 0.5) / S) * 2 - 1, dy = ((y + 0.5) / S) * 2 - 1, r = Math.hypot(dx, dy), i = (y * S + x) * 4;
          if (r > 1.02) { d[i + 3] = 0; continue; }
          const hue = (Math.atan2(-dy, dx) * 180) / Math.PI;
          const rgb = CM.oklch(L, Math.min(r, 1) * CMAX, hue);
          d[i] = rgb[0] * 255; d[i + 1] = rgb[1] * 255; d[i + 2] = rgb[2] * 255;
          d[i + 3] = M.clamp((1.02 - r) * S * 0.5, 0, 1) * 255;
        }
        g.putImageData(img, 0, 0);
        disc = oc; discL = L;
      }

      let drag = false;
      const pick = (e) => {
        const r = cv.getBoundingClientRect();
        const dx = e.clientX - r.left - geo.cx, dy = e.clientY - r.top - geo.cy, d = Math.hypot(dx, dy);
        if (!drag && d > geo.R * 1.12) return false;
        H = Math.round((((Math.atan2(-dy, dx) * 180) / Math.PI) + 360) % 360);
        Cc = Math.round(M.clamp((d / geo.R) * CMAX, 0.02, CMAX) * 200) / 200;
        sH.set(H); sC.set(Cc); code();
        return true;
      };
      cv.style.cursor = "crosshair";
      cv.addEventListener("pointerdown", (e) => { if (pick(e)) { drag = true; cv.setPointerCapture(e.pointerId); } });
      cv.addEventListener("pointermove", (e) => { if (drag) pick(e); });
      cv.addEventListener("pointerup", () => (drag = false));
      cv.addEventListener("pointercancel", () => (drag = false));

      const swatch = (x, px, py, w, h, rgb, c, sel) => {
        if (sel) { M.rrect(x, px + 1.5, py + 2.5, w, h, Math.min(8, h / 3)); x.fillStyle = c.ink; x.fill(); }
        M.rrect(x, px, py, w, h, Math.min(8, h / 3)); x.fillStyle = CM.css(rgb); x.fill();
        x.strokeStyle = sel ? c.ink : M.alpha(c.ink, 0.6); x.lineWidth = sel ? 2 : 1; x.stroke();
      };
      const ruleHues = (r) => RULES[r].off.slice(0, RULES[r].n).map((o) => (H + o + 360) % 360);

      return {
        setStep(s) {
          step = s;
          rule = s >= 1 && s <= 4 ? s : s === 5 ? (rule || 3) : 0;
          chips.set(rule - 1);
          code();
        },
        frame(time, dt) {
          const { x, w, h } = M.fit(cv), c = M.col();
          const nar = w < 520;
          let R, cx, cy, px, py, pw, ph;
          if (!nar) { R = Math.min(h / 2 - 34, w * 0.24, 230); cx = 34 + R; cy = h / 2 + 6; px = cx + R + 46; py = 22; pw = w - px - 14; ph = h - 36; }
          else { R = Math.min(w * 0.26, h * 0.22, 110); cx = w / 2; cy = 30 + R; px = 10; py = cy + R + 26; pw = w - 20; ph = h - py - 6; }
          geo = { cx, cy, R };
          if (Math.abs(discL - L) > 1e-4 || !disc) makeDisc();

          // 색상환
          x.save(); x.imageSmoothingEnabled = true; x.drawImage(disc, cx - R, cy - R, R * 2, R * 2); x.restore();
          x.beginPath(); x.arc(cx, cy, R + 0.5, 0, Math.PI * 2); x.strokeStyle = M.alpha(c.ink, 0.35); x.lineWidth = 1; x.stroke();
          for (const a of [0, 90, 180, 270]) {
            if (step === 0 && rule === 0 && Math.abs(wrapDeg(a - H + 20)) < 40) continue;
            const rad = (-a * Math.PI) / 180;
            M.text(x, a + "°", cx + Math.cos(rad) * (R + 16), cy + Math.sin(rad) * (R + 16) + 4, { size: 11, mono: true, align: "center" });
          }
          // 마커 각도 애니메이션
          const tgt = RULES[rule].off, k = 1 - Math.exp(-(dt || 16) / 90);
          for (let i = 0; i < 3; i++) cur[i] += wrapDeg(tgt[i] - cur[i]) * k;
          const rr = (Cc / CMAX) * R;
          const pos = cur.map((o) => { const a = ((-(H + o)) * Math.PI) / 180; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, H + o]; });
          if (rule >= 1) {
            x.save(); x.setLineDash([4, 4]); x.strokeStyle = M.alpha(c.ink, 0.7); x.lineWidth = 1.5; x.beginPath();
            pos.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); x.stroke(); x.restore();
          }
          M.line(x, cx, cy, pos[0][0], pos[0][1], M.alpha(c.ink, 0.6), 1.5);
          M.dot(x, cx, cy, 2.5, c.ink);
          if (rule >= 1 && rule <= 4) {
            const ar = Math.max(22, rr * 0.38), a0 = (-H * Math.PI) / 180, a1 = (-(H + cur[1]) * Math.PI) / 180;
            M.line(x, cx, cy, pos[1][0], pos[1][1], M.alpha(c.ink, 0.6), 1.5);
            x.save(); x.strokeStyle = c.ink; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, ar, a0, a1, cur[1] > 0); x.stroke(); x.restore();
            const am = (a0 + a1) / 2, tr = Math.abs(cur[1]) < 60 ? rr + 30 : ar + 18;
            M.tag(x, Math.round(Math.abs(cur[1])) + "°", cx + Math.cos(am) * tr, cy + Math.sin(am) * tr, { align: "center", size: 11.5, mono: true, fill: tint(c.key, 0.35) });
          }
          if (step === 0 && rule === 0) {
            // 축 주석: 둘레 = 색상, 반지름 = 채도
            const a0 = (-H * Math.PI) / 180;
            x.save(); x.strokeStyle = c.ink; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, R + 7, a0, a0 - 0.7, true); x.stroke(); x.restore();
            const ae = a0 - 0.7;
            M.arrow(x, cx + Math.cos(ae + 0.08) * (R + 7), cy + Math.sin(ae + 0.08) * (R + 7), cx + Math.cos(ae) * (R + 7), cy + Math.sin(ae) * (R + 7), c.ink);
            const la = a0 - 0.35;
            M.text(x, "H 색상", cx + Math.cos(la) * (R + 26), cy + Math.sin(la) * (R + 26) + 4, { size: 11.5, weight: 700, color: c.ink, align: Math.cos(la) > 0.2 ? "left" : Math.cos(la) < -0.2 ? "right" : "center" });
            const ma = (-(H + 90) * Math.PI) / 180;
            const lx = cx + Math.cos(a0) * rr * 0.5 + Math.cos(ma) * 14, ly = cy + Math.sin(a0) * rr * 0.5 + Math.sin(ma) * 14;
            M.tag(x, "C 채도 = 중심에서 거리", lx, ly, { align: "center", size: 11 });
          }
          for (let i = (RULES[rule].n > 1 ? 2 : 0); i >= 0; i--) {
            const p = pos[i];
            const rgb = CM.oklch(L, Cc, p[2]);
            M.dot(x, p[0], p[1], i === 0 ? 12 : 9.5, CM.css(rgb));
            x.beginPath(); x.arc(p[0], p[1], (i === 0 ? 12 : 9.5) + 2, 0, Math.PI * 2); x.strokeStyle = c.surface; x.lineWidth = 3; x.stroke();
            x.beginPath(); x.arc(p[0], p[1], i === 0 ? 12 : 9.5, 0, Math.PI * 2); x.strokeStyle = c.ink; x.lineWidth = 2; x.stroke();
            if (i > 0 && RULES[rule].n === 1) break;
          }
          M.text(x, `명도 L ${L.toFixed(2)} 단면`, nar ? 10 : 14, nar ? 16 : 18, { size: 11, mono: true });

          // 오른쪽(아래) 패널
          if (step === 0 && rule === 0) {
            const rows = [
              { lab: "H 색상만 바꿈", vals: [-90, -60, -30, 0, 30, 60, 90].map((d) => CM.oklch(L, Cc, H + d)), ends: ["−90°", "+90°"], sel: 3 },
              { lab: "C 채도만 바꿈", vals: [0, 0.04, 0.08, 0.12, 0.16, 0.2, 0.24].map((v) => CM.oklch(L, v, H)), ends: ["0 (회색)", "0.24"], sel: Math.round(Cc / 0.04) },
              { lab: "L 명도만 바꿈", vals: [0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95].map((v) => CM.oklch(v, Cc, H)), ends: ["0.35", "0.95"], sel: Math.round((L - 0.35) / 0.1) },
            ];
            const ends = ph > 230, gap = 6, rowH = Math.min(56, (ph - rows.length * (ends ? 44 : 24)) / rows.length), cw = (pw - gap * 6) / 7;
            let y = py + 4;
            rows.forEach((r) => {
              M.text(x, r.lab, px, y + 12, { size: 12, weight: 700, color: c.ink });
              y += 18;
              r.vals.forEach((rgb, i) => swatch(x, px + i * (cw + gap), y, cw, rowH, rgb, c, i === r.sel));
              y += rowH + 4;
              if (ends) {
                M.text(x, r.ends[0], px, y + 12, { size: 11, mono: true });
                M.text(x, r.ends[1], px + pw, y + 12, { size: 11, mono: true, align: "right" });
                y += 22;
              } else y += 2;
            });
          } else if (step !== 5) {
            const R0 = RULES[rule], hs = ruleHues(rule), n = hs.length, gap = 10;
            const cw = Math.min(150, (pw - gap * (n - 1)) / n), bh = Math.max(24, Math.min(150, ph * 0.42, ph - 28 - (cw > 132 ? 58 : 42) - 34));
            let y = py + 6;
            M.text(x, R0.name, px, y + 12, { size: nar ? 13 : 14.5, weight: 800, color: c.ink });
            y += 28;
            hs.forEach((hh, i) => {
              const sx = px + i * (cw + gap);
              swatch(x, sx, y, cw, bh, CM.oklch(L, Cc, hh), c, i === 0);
              M.text(x, (i === 0 ? "기준 " : "") + Math.round(hh) + "°", sx, y + bh + 17, { size: 11.5, weight: 700, color: c.ink, mono: true });
              if (cw > 132) M.text(x, `oklch(${L.toFixed(2)} ${Cc.toFixed(2)} ${Math.round(hh)})`, sx, y + bh + 33, { size: 11, mono: true });
            });
            y += bh + (cw > 132 ? 58 : 42);
            const parts = n === 1 ? [100] : n === 2 ? [80, 20] : [60, 30, 10];
            M.text(x, "면적 예시 " + parts.join(" · ") + " %", px, y, { size: 11.5, weight: 600, color: c.ink });
            y += 8;
            const bw = Math.min(pw, cw * n + gap * (n - 1));
            let bx = px;
            const barH = Math.min(30, ph - (y - py) - 4);
            parts.forEach((p, i) => {
              const ww = (bw * p) / 100;
              x.fillStyle = CM.css(CM.oklch(L, Cc, hs[i])); x.fillRect(bx, y, ww, barH);
              bx += ww;
            });
            bx = px; parts.slice(0, -1).forEach((p) => { bx += (bw * p) / 100; M.line(x, bx, y, bx, y + barH, c.ink, 1); });
            x.strokeStyle = c.ink; x.lineWidth = 1.25; x.strokeRect(px + 0.5, y + 0.5, bw - 1, barH - 1);
          } else {
            const hs = ruleHues(rule), n = hs.length;
            const ok = hs.map((hh) => CM.oklch(L, Cc, hh));
            const base = CM.toHsl(ok[0]);
            const hl = hs.map((hh, i) => CM.hsl(base[0] + RULES[rule].off[i], base[1], base[2]));
            const rows = [["OKLCH에서 고름", ok], ["↳ 흑백", ok.map(CM.gray)], ["HSL에서 같은 규칙", hl], ["↳ 흑백", hl.map(CM.gray)]];
            const gap = 8, cw = Math.min(130, (pw - gap * (n - 1)) / n), rowH = Math.min(50, (ph - 4 * 22 - 34) / 4);
            let y = py + 4;
            rows.forEach(([lab, cols], ri) => {
              M.text(x, lab, px, y + 11, { size: 11.5, weight: ri % 2 ? 500 : 700, color: ri % 2 ? c.muted : c.ink });
              y += 17;
              cols.forEach((rgb, i) => swatch(x, px + i * (cw + gap), y, cw, rowH, rgb, c, false));
              y += rowH + (ri % 2 ? 12 : 5);
            });
            const spread = (cols) => { const ls = cols.map(CM.L); return Math.max(...ls) - Math.min(...ls); };
            const s1 = spread(ok), s2 = spread(hl);
            const ty = Math.min(h - 16, y + 12);
            const t1 = M.tag(x, `OKLCH 편차 ${s1.toFixed(2)}`, px, ty, { size: 11.5, mono: true, fill: tint(c.a, 0.22) });
            M.tag(x, `HSL 편차 ${s2.toFixed(2)}`, px + t1.w + 10, ty, { size: 11.5, mono: true, fill: tint(c.b, 0.22) });
          }
        },
      };
    },
  });

  /* ===== 3-3 색의 역할과 60·30·10 ===== */
  LESSONS.push({
    id: "color-roles", ch: 2, order: 3,
    title: "색의 역할과 60·30·10",
    lede: "좋은 화면은 색을 '무슨 색'보다 '무슨 역할'로 나눕니다. 바탕, 표면, 글자, 강조의 비율을 정하고 역할 이름을 토큰으로 만들어 두면 색을 바꿔도 화면이 무너지지 않습니다.",
    key: "색은 이름이 아니라 역할로 씁니다. 바탕이 넓게, 강조는 10% 안팎, 브랜드 색은 강조에만, 컴포넌트는 의미 토큰만 참조합니다.",
    steps: [
      ["네 가지 역할", "화면의 색은 대부분 네 역할로 나뉩니다. 가장 넓은 <b>바탕</b>(background), 그 위에 놓인 <b>표면</b>(surface: 카드, 패널), 읽는 <b>글자</b>(text), 행동을 부르는 <b>강조</b>(accent)입니다. 목업 모서리의 검은 이름표가 각 역할이고, 오른쪽 범례가 실제 색입니다. 색을 고를 때 '무슨 색'보다 '어느 역할'을 먼저 정합니다."],
      ["60·30·10", "실내 장식에서 온 경험칙으로, 주색 <b>60%</b>, 보조색 <b>30%</b>, 강조색 <b>10%</b>로 면적을 나눕니다. 오른쪽 막대는 목업에서 실제로 잰 면적으로, 표면 약 50 · 바탕 약 40 · 강조 약 10입니다. 숫자를 정확히 맞추는 것보다 <b>강조가 10% 안팎으로 드물게</b> 남는 것이 핵심입니다. 강조는 버튼, 진행 막대, 선택된 메뉴에만 씁니다."],
      ["강조가 넘치면", "헤더와 카드까지 강조 색으로 칠했습니다. 오른쪽 막대에서 강조가 절반 넘게 차지하자, 정작 버튼이 더는 눈에 띄지 않습니다. <b>강조는 드물어야 강조</b>입니다. '강조 색 면적' 슬라이더를 0으로 돌려 버튼이 다시 살아나는 것을 확인해 보세요."],
      ["의미 색", "성공(초록), 경고(호박색), 오류(빨강), 정보(파랑)는 관례로 굳어진 <b>의미 색</b>(semantic color)입니다. 목업 아래 알약 네 개가 그것이고, 브랜드 색과 따로 관리합니다. '직접 해보기'에서 브랜드를 코랄로 바꾸면 오른쪽 표에 <b>버튼과 같은 색!</b>이 뜹니다. 누르라는 버튼과 실패 표시가 같은 색이면 사용자가 헷갈립니다."],
      ["시맨틱 토큰 2단 구조", "1단 <b>원시 토큰</b>은 값 그 자체(<code>--blue-500</code>), 2단 <b>의미 토큰</b>은 역할 이름(<code>--color-accent</code>)입니다. 컴포넌트는 의미 토큰만 씁니다. 브랜드 색을 바꾸면 화살표 하나만 바뀌고 화면 전체가 따라옵니다. 다크 모드도 이 연결만 바꿔 끼웁니다."],
    ],
    terms: [
      ["60-30-10 규칙", "60-30-10 rule", "주색 60%, 보조색 30%, 강조색 10%로 면적을 나누는 경험칙."],
      ["강조 색", "Accent color", "행동을 부르는 요소에만 쓰는 색. 면적이 작을수록 효과가 큽니다."],
      ["의미 색", "Semantic / status colors", "성공·경고·오류·정보처럼 뜻이 정해진 색. 브랜드 색과 분리합니다."],
      ["디자인 토큰", "Design token", "색, 간격, 글자 크기 같은 결정을 이름 붙은 변수로 저장한 것."],
      ["원시 / 의미 토큰", "Primitive / Semantic token", "값을 담은 토큰(blue-500)과 역할을 담은 토큰(color-accent). 컴포넌트는 의미 토큰을 참조합니다."],
    ],
    mount(api) {
      const BRANDS = [
        { label: "파랑", v: "var(--a)", prim: "--blue-500" },
        { label: "청록", v: "var(--c)", prim: "--teal-500" },
        { label: "코랄", v: "var(--b)", prim: "--coral-500" },
      ];
      let step = 0, level = 0, brand = 0, tags = true;
      const root = M.el("div", { class: "dom-stage cm-fill" });
      const wrap = M.el("div", { class: "color-roles-wrap" });
      const mock = M.el("div", { class: "color-roles-mock" });
      mock.innerHTML = `
        <div class="color-roles-head" data-acc="1">
          <span class="color-roles-logo"></span><b>디자인 기초</b>
          <span class="color-roles-nav"><a class="color-roles-on">레슨</a><a>용어</a></span>
          <span class="color-roles-tag" data-r="accent" style="right:6px;top:-9px"></span>
        </div>
        <div class="color-roles-body">
          <div class="color-roles-card" data-acc="2">
            <span class="color-roles-tag" data-r="surface" style="right:8px;top:-9px"></span>
            <p class="color-roles-h">진행 중인 코스</p>
            <p class="color-roles-sub">레슨 5개 중 3개 완료<span class="color-roles-tag" data-r="text" style="position:static;margin-left:6px"></span></p>
            <div class="color-roles-bar"><i data-acc="0"></i></div>
            <button type="button" class="color-roles-btn" data-acc="0">이어서 보기</button>
          </div>
          <div class="color-roles-card" data-acc="2">
            <p class="color-roles-h">다음 레슨</p>
            <ul class="color-roles-list"><li>색상환과 배색</li><li>색의 역할</li><li>다크 모드</li></ul>
          </div>
          <div class="color-roles-status">
            <span class="ok">저장됨</span><span class="warn">연결 불안정</span><span class="err">업로드 실패</span><span class="info">새 레슨 2개</span>
          </div>
        </div>
        <span class="color-roles-tag" data-r="bg" style="left:8px;bottom:6px"></span>`;
      const side = M.el("div", { class: "color-roles-side" });
      const legend = M.el("div", { class: "color-roles-legend" });
      [["bg", "바탕", "가장 넓은 면"], ["surface", "표면", "카드 · 패널"], ["text", "글자", "본문 · 보조 글"], ["accent", "강조", "버튼 · 선택 상태"]].forEach(([k, n, d]) =>
        legend.append(M.el("div", { class: "color-roles-lrow" }, M.el("i", { class: "color-roles-sw-" + k }), M.el("b", {}, n), M.el("span", {}, d))));
      const ratio = M.el("div", { class: "color-roles-ratio" });
      const bar = M.el("div", { class: "color-roles-rbar" });
      const segs = ["surface", "bg", "accent"].map((k) => { const s = M.el("i", { class: "color-roles-sw-" + k }); bar.append(s); return s; });
      const rleg = M.el("div", { class: "color-roles-rleg" });
      ratio.append(M.el("p", { class: "color-roles-cap" }, "실제 면적 (글자 제외)"), bar, rleg);
      const tokens = M.el("div", { class: "color-roles-tokens" });
      const sem = M.el("div", { class: "color-roles-sem" });
      side.append(legend, ratio, sem, tokens);
      wrap.append(mock, side); root.append(wrap); api.stage.append(root);

      const TAGS = {
        bg: ["바탕", "--color-bg"], surface: ["표면", "--color-surface"], text: ["글자", "--color-text"], accent: ["강조", "--color-accent"],
      };
      function renderTokens() {
        const b = BRANDS[brand];
        const rows = [
          ["--gray-100", "--color-bg", "var(--sunk)"],
          ["--gray-0", "--color-surface", "var(--raised)"],
          ["--gray-900", "--color-text", "var(--ink)"],
          [b.prim, "--color-accent", b.v, true],
          ["--teal-500", "--color-success", "var(--c)"],
          ["--coral-500", "--color-danger", "var(--b)"],
        ];
        tokens.innerHTML = `<p class="color-roles-cap"><span>원시 토큰</span><span>의미 토큰</span></p>`;
        rows.forEach(([p, s, v, hot]) => tokens.append(M.el("div", { class: "color-roles-trow" + (hot ? " hot" : "") },
          M.el("span", { class: "p" }, M.el("i", { style: `background:${v}` }), p), M.el("span", { class: "ar" }, "→"), M.el("span", { class: "s" }, s))));
        const hot = tokens.querySelector(".hot");
        if (hot) { hot.classList.remove("flash"); void hot.offsetWidth; hot.classList.add("flash"); }
      }
      const area = (el) => { const r = el.getBoundingClientRect(); return r.width * r.height; };
      function measure() {
        const total = area(mock);
        if (!total) return;
        let acc = [...mock.querySelectorAll("[data-acc]")].filter((e) => +e.dataset.acc <= level);
        acc = acc.filter((e) => !acc.some((o) => o !== e && o.contains(e)));
        const A = acc.reduce((s, e) => s + area(e), 0);
        const cards = [...mock.querySelectorAll(".color-roles-card")];
        const S = level >= 2 ? 0 : cards.reduce((s, e) => s + area(e), 0) - acc.filter((e) => cards.some((cd) => cd.contains(e))).reduce((s, e) => s + area(e), 0);
        const pa = (A / total) * 100, ps = (S / total) * 100, pb = 100 - pa - ps;
        segs[0].style.width = ps + "%"; segs[1].style.width = pb + "%"; segs[2].style.width = pa + "%";
        rleg.innerHTML = `<span><i class="color-roles-sw-surface"></i>표면 ${Math.round(ps)}%</span><span><i class="color-roles-sw-bg"></i>바탕 ${Math.round(pb)}%</span><span><i class="color-roles-sw-accent"></i>강조 ${Math.round(pa)}%</span>`;
        ro.textContent = `강조 면적 ${pa.toFixed(1)}%  ${pa <= 15 ? "→ 버튼이 먼저 보입니다" : "→ 강조가 묻힙니다"}`;
      }
      function apply() {
        wrap.style.setProperty("--cr-accent", BRANDS[brand].v);
        mock.classList.toggle("lv1", level >= 1); mock.classList.toggle("lv2", level >= 2);
        mock.classList.toggle("show-status", step >= 3);
        mock.classList.toggle("show-tags", tags);
        mock.querySelectorAll(".color-roles-tag").forEach((t) => (t.textContent = TAGS[t.dataset.r][step >= 4 ? 1 : 0]));
        legend.hidden = step !== 0; ratio.hidden = step === 0 || step >= 3; tokens.hidden = step !== 4; sem.hidden = step !== 3;
        if (step === 3) {
          const ST = [["ok", "성공", "var(--c)", 1], ["warn", "경고", "var(--key)", -1], ["err", "오류", "var(--b)", 2], ["info", "정보", "var(--a)", 0]];
          sem.innerHTML = `<p class="color-roles-cap"><span>브랜드 색과 의미 색</span></p>`;
          sem.append(M.el("div", { class: "color-roles-srow brand" }, M.el("i", { style: `background:${BRANDS[brand].v}` }), M.el("b", {}, "브랜드(버튼)"), M.el("em", {}, BRANDS[brand].label)));
          ST.forEach(([k, n, v, bi]) => {
            const same = bi === brand, bad = same && k !== "info";
            sem.append(M.el("div", { class: "color-roles-srow" + (bad ? " clash" : "") }, M.el("i", { style: `background:${v}` }), M.el("span", {}, n), M.el("em", {}, bad ? "버튼과 같은 색!" : same ? "같은 색 (정보라 허용)" : "")));
          });
        }
        if (step === 4) renderTokens();
        requestAnimationFrame(measure);
      }
      const LV = ["10% 안팎 (버튼·막대)", "+ 헤더", "+ 카드까지"];
      const sLv = M.slider(api.controls, { id: "crLevel", label: "강조 색 면적", min: 0, max: 2, step: 1, value: 0, fmt: (v) => LV[v], onInput: (v) => { level = v; apply(); } });
      const bChips = M.chips(api.controls, { title: "브랜드 색", items: BRANDS.map((b) => b.label), value: 0, onPick: (i) => { brand = i; apply(); } });
      M.check(api.controls, { id: "crTags", label: "역할 이름표 보기", checked: true, onChange: (v) => { tags = v; apply(); } });
      const ro = M.readout(api.controls);
      const CODE = "/* 1단: 원시 토큰 = 값 */\n:root {\n  --blue-500: oklch(0.55 0.15 255);\n  --coral-500: oklch(0.62 0.17 30);\n  --gray-100: oklch(0.95 0.01 85);\n  --gray-900: oklch(0.22 0.01 85);\n}\n/* 2단: 의미 토큰 = 역할 */\n:root {\n  --color-bg: var(--gray-100);\n  --color-surface: white;\n  --color-text: var(--gray-900);\n  --color-accent: var(--blue-500);\n  --color-danger: var(--coral-500);\n}\n/* 컴포넌트는 의미 토큰만 */\n.button { background: var(--color-accent); }\n.alert-error { color: var(--color-danger); }";
      const HL = [[[9, 15]], [[10, 13], [17, 17]], [[13, 13], [17, 17]], [[14, 14], [18, 18]], [[0, 18]]];
      const rObs = new ResizeObserver(() => measure());
      rObs.observe(mock);
      return {
        setStep(s) {
          step = s;
          level = s === 2 ? 2 : 0; sLv.set(level);
          if (s !== 3 && s !== 4) { brand = 0; bChips.set(0); }
          apply();
          api.code(CODE, s === 4 ? [[0, 6], [7, 14]] : HL[s], "CSS · 디자인 토큰");
        },
        destroy() { rObs.disconnect(); },
      };
    },
  });

  /* ===== 3-4 다크 모드 팔레트 ===== */
  LESSONS.push({
    id: "dark-mode", ch: 2, order: 4,
    title: "다크 모드 팔레트",
    lede: "이 레슨을 마치면 다크 모드를 '색 뒤집기'가 아니라 팔레트를 하나 더 만드는 일로 보고, 바탕·고도·강조 색·대비를 어두운 환경에 맞춰 다시 정하는 순서를 알게 됩니다.",
    key: "다크 모드는 반전이 아닙니다. 순검정 대신 어두운 회색, 고도는 그림자 대신 밝기, 강조 색은 밝게·덜 채도 있게, 대비는 다시 잽니다.",
    steps: [
      ["라이트 팔레트", "출발점인 라이트 모드입니다. 밝은 바탕 위에 흰 카드가 <b>그림자</b>로 떠 있고, 강조 색은 진한 파랑입니다. 목업 아래 숫자는 주요 조합의 대비율이고, ✓는 기준(본문 4.5:1, 강조 3:1)을 넘었다는 뜻입니다."],
      ["단순 반전", "오른쪽은 <code>filter: invert(1)</code>로 통째로 뒤집은 결과입니다. 밝기만이 아니라 <b>색상도 반대</b>가 되어 파랑 버튼이 주황이 되고, 그림자는 빛나는 테두리가 됩니다. 사진과 로고도 함께 뒤집히니 반전으로는 다크 모드를 만들 수 없습니다."],
      ["순검정과 순백", "바탕을 <code>#000</code>, 글자를 <code>#fff</code>로 했습니다. 본문 대비가 21:1로 최대지만 글자가 번져 보이고(헐레이션) 눈이 피로합니다. 무엇보다 카드와 바탕이 똑같이 검어 <b>카드의 경계가 사라졌습니다</b>."],
      ["어두운 회색", "바탕을 <b>아주 어두운 회색</b>(OKLCH L 0.2 안팎)으로, 글자는 살짝 누른 흰색(L 0.93)으로 바꿨습니다. 본문 대비는 여전히 13:1 이상이면서 눈이 편합니다. '직접 해보기'의 바탕 밝기 슬라이더로 대비 숫자가 어떻게 변하는지 보세요."],
      ["고도는 밝기로", "어두운 곳에서는 그림자가 거의 보이지 않습니다. 대신 위로 떠 있을수록 <b>표면을 조금씩 밝게</b> 합니다. 호박색 이름표처럼 바탕(고도 0) → 카드(고도 1, L +0.05) → 팝업(고도 2, L +0.10) 순으로 밝아집니다. Material Design이 쓰는 방식입니다."],
      ["채도 낮추고 대비 재확인", "라이트의 진한 파랑은 어두운 바탕에서 대비가 낮고 번쩍입니다. 다크용 강조 색은 <b>밝기를 올리고(L 0.52 → 0.77) 채도를 낮춥니다</b>(C 0.17 → 0.11). 버튼 글자도 어두운 색으로 바꿉니다. 바꾼 뒤엔 아래 대비 숫자가 모두 ✓인지 다시 확인합니다."],
    ],
    terms: [
      ["다크 모드", "Dark mode / dark theme", "어두운 바탕의 색 테마. <code>prefers-color-scheme: dark</code>로 감지합니다."],
      ["고도", "Elevation", "표면이 바탕에서 떠 있는 정도. 라이트에선 그림자, 다크에선 밝기로 표현합니다."],
      ["헐레이션", "Halation", "순검정 위 순백 글자가 번져 보이는 현상. 다크 모드에서 순백을 피하는 이유."],
      ["색 구성표", "color-scheme", "브라우저 기본 UI(스크롤바, 입력창)의 라이트/다크를 알리는 CSS 속성."],
    ],
    mount(api) {
      const LIGHT = { bg: [0.965, 0.006, 85], s1: [1, 0, 0], s2: [1, 0, 0], text: [0.23, 0.012, 85], muted: [0.5, 0.012, 85], acc: [0.52, 0.17, 258], on: [0.99, 0, 0], ok: [0.55, 0.13, 155], shadow: true };
      let step = 0, bgL = 0.2, single = false, isDark = true;
      const darkPal = (s) => {
        if (s <= 1) return LIGHT;
        if (s === 2) return { bg: [0, 0, 0], s1: [0, 0, 0], s2: [0, 0, 0], text: [1, 0, 0], muted: [0.78, 0, 0], acc: LIGHT.acc, on: LIGHT.on, ok: LIGHT.ok, shadow: true };
        const g = (l) => [l, 0.008, 85];
        const p = { bg: g(bgL), s1: g(bgL), s2: g(bgL), text: [0.93, 0.008, 85], muted: [0.72, 0.01, 85], acc: LIGHT.acc, on: LIGHT.on, ok: LIGHT.ok, shadow: true };
        if (s >= 4) { p.s1 = g(bgL + 0.05); p.s2 = g(bgL + 0.1); p.shadow = false; }
        if (s >= 5) { p.acc = [0.77, 0.11, 258]; p.on = [0.2, 0.02, 258]; p.ok = [0.77, 0.12, 155]; }
        return p;
      };
      const rgbOf = (p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== "shadow").map(([k, v]) => [k, CM.oklch(...v)]));

      const root = M.el("div", { class: "dom-stage cm-fill" });
      const pair = M.el("div", { class: "dark-mode-pair" });
      const mkCol = () => {
        const col = M.el("div", { class: "dark-mode-col" });
        const cap = M.el("p", { class: "dark-mode-cap" });
        const mock = M.el("div", { class: "dark-mode-mock" });
        mock.innerHTML = `
          <div class="dark-mode-top"><b>디자인 기초</b><button type="button" class="dark-mode-sw" aria-label="라이트/다크 전환"><i></i></button></div>
          <div class="dark-mode-card">
            <span class="dark-mode-elev">고도 1</span>
            <p class="dark-mode-h">오늘의 레슨</p>
            <p class="dark-mode-sub">다크 모드 팔레트 · 6단계</p>
            <div class="dark-mode-bar"><i></i></div>
            <div class="dark-mode-pop"><span class="dark-mode-elev">고도 2</span><i class="dot"></i>저장됨</div>
          </div>
          <button type="button" class="dark-mode-btn">계속하기</button>
          <span class="dark-mode-elev dark-mode-elev0">고도 0</span>`;
        const meta = M.el("div", { class: "dark-mode-meta" });
        col.append(cap, mock, meta); pair.append(col);
        return { col, cap, mock, meta };
      };
      const A = mkCol(), B = mkCol();
      root.append(pair); api.stage.append(root);
      B.mock.querySelector(".dark-mode-sw").addEventListener("click", () => { if (single) { isDark = !isDark; render(); } });
      A.mock.querySelector(".dark-mode-sw").tabIndex = -1;

      function paint(side, pal, inv) {
        const rgb = rgbOf(pal), m = side.mock;
        for (const [k, v] of Object.entries(rgb)) m.style.setProperty("--dm-" + k, CM.css(v));
        m.style.setProperty("--dm-shadow", pal.shadow ? (pal === LIGHT ? "0 2px 0 rgba(0,0,0,.06), 0 6px 14px rgba(0,0,0,.12)" : "0 2px 0 rgba(0,0,0,.4), 0 6px 14px rgba(0,0,0,.55)") : "none");
        m.style.filter = inv ? "invert(1)" : "none";
        m.classList.toggle("is-dark", pal !== LIGHT);
        const R = inv ? Object.fromEntries(Object.entries(rgb).map(([k, v]) => [k, v.map((x) => 1 - x)])) : rgb;
        const row = (lab, a, b, min) => { const r = CM.ratio(a, b); return `<span class="${r >= min ? "ok" : "no"}">${r >= min ? "✓" : "✕"} ${lab} <b>${r.toFixed(1)}</b></span>`; };
        side.meta.innerHTML = row("본문", R.text, R.bg, 4.5) + row("보조", R.muted, R.s1, 4.5) + row("버튼", R.on, R.acc, 4.5) + row("강조/바탕", R.acc, R.bg, 3);
      }
      const CAPS = ["다크: 아직 없음", "다크 ① 단순 반전", "다크 ② 순검정 + 순백", "다크 ③ 어두운 회색", "다크 ④ 고도 = 밝기", "다크 ⑤ 강조 색 조정"];
      function render() {
        pair.classList.toggle("single", single);
        A.col.hidden = single;
        A.cap.textContent = "라이트";
        paint(A, LIGHT, false);
        const ds = Math.max(step, 1);
        if (single) {
          B.cap.textContent = (isDark ? CAPS[ds] : "라이트") + "  · 스위치를 눌러 전환";
          paint(B, isDark ? darkPal(ds) : LIGHT, isDark && ds === 1);
        } else {
          B.cap.textContent = CAPS[step];
          paint(B, darkPal(step), step === 1);
        }
        B.col.classList.toggle("empty", step === 0 && !single);
        pair.classList.toggle("elev", step >= 4);
        B.mock.classList.toggle("dark-mode-elevon", step >= 4 && (!single || isDark));
        sBg.el.classList.toggle("dark-mode-dim", step < 3);
      }
      M.chips(api.controls, { title: "보기", items: ["나란히", "하나로 전환"], value: 0, onPick: (i) => { single = i === 1; isDark = true; render(); } });
      const sBg = M.slider(api.controls, { id: "dmBgL", label: "다크 바탕 밝기 L (3단계부터)", min: 0, max: 0.32, step: 0.01, value: bgL, fmt: (v) => v.toFixed(2), onInput: (v) => { bgL = v; render(); } });
      const CODE = ":root {\n  color-scheme: light dark;\n  --color-bg: oklch(0.97 0.006 85);\n  --color-surface: oklch(1 0 0);\n  --color-text: oklch(0.23 0.012 85);\n  --color-accent: oklch(0.52 0.17 258);\n  --shadow: 0 6px 14px rgb(0 0 0 / .12);\n}\n@media (prefers-color-scheme: dark) {\n  :root {\n    --color-bg: oklch(0.20 0.008 85);   /* 순검정 X */\n    --color-text: oklch(0.93 0.008 85); /* 순백 X */\n    --color-surface: oklch(0.25 0.008 85);   /* 고도 1 */\n    --color-surface-2: oklch(0.30 0.008 85); /* 고도 2 */\n    --shadow: none;\n    --color-accent: oklch(0.77 0.11 258); /* 밝게, 채도↓ */\n    --color-on-accent: oklch(0.20 0.02 258);\n  }\n}";
      const HL = [[[0, 7]], [[8, 8]], [[10, 11]], [[10, 11]], [[12, 14]], [[15, 16]]];
      return {
        setStep(s) {
          step = s; isDark = true;
          if (s === 3) { bgL = 0.2; sBg.set(bgL); }
          render();
          api.code(s === 1 ? "/* 하지 말 것 */\nhtml.dark {\n  filter: invert(1);\n}\n/* 색상까지 뒤집혀 파랑 → 주황,\n   사진·그림자도 함께 뒤집힘 */" : CODE, s === 1 ? [[1, 3]] : HL[s], "CSS");
        },
      };
    },
  });

  /* ===== 4-6 스태거와 코레오그래피 ===== */
  LESSONS.push({
    id: "stagger", ch: 3, order: 6,
    title: "스태거와 코레오그래피",
    lede: "이 레슨을 마치면 여러 요소가 함께 등장할 때 시작 시간을 어긋나게 하는 스태거의 간격·상한·방향·겹침을 숫자로 정하는 법을 알게 됩니다. 이렇게 여러 움직임을 한 장면으로 설계하는 일을 코레오그래피라 합니다.",
    key: "스태거 간격은 30~80ms, 전체 등장은 수백 ms 안에. 항목이 많으면 간격을 줄이고, 주인공은 하나만 먼저 보냅니다.",
    steps: [
      ["한꺼번에", "카드 여섯 장이 <b>동시에</b> 나타납니다. 깔끔하지만 한 덩어리로 보여 눈이 어디서 시작할지 모릅니다. 오른쪽 타임라인의 막대가 각 카드의 시작과 끝인데, 지금은 모두 0ms에서 출발해 세로로 나란합니다."],
      ["순차 지연", "카드마다 시작을 <b>70ms씩</b> 늦췄습니다. 이것이 스태거(stagger)입니다. 타임라인 막대가 계단이 되고, 맨 위 치수선이 그 간격입니다. 눈이 위에서 아래로 흐름을 따라가며 '목록'이라는 구조가 움직임으로 드러납니다."],
      ["전체 시간 상한", "항목이 14개로 늘면 70ms × 13 = 910ms를 기다려야 마지막 카드가 출발합니다. 점선 막대가 상한 없이 늘어난 모습입니다. 빨간 점선처럼 마지막 출발을 <b>400ms 안</b>으로 묶고 간격을 자동으로 줄였습니다(70 → 31ms). 실무에서는 <code>Math.min(70, 400 / (n − 1))</code>처럼 계산합니다."],
      ["방향", "격자에서는 순서를 정하는 방법이 여럿입니다. <b>위→아래</b>, <b>대각선</b>, 누른 지점이나 <b>중심에서</b> 퍼지기. 지금은 호박색 점(중심)에서 가까운 카드부터 나옵니다. 방향은 '어디서 왔는가'를 알려 줍니다. '직접 해보기'의 방향 칩으로 바꿔 보세요."],
      ["주인공은 하나", "호박색 큰 카드(주인공)가 먼저, 30px 더 크게 움직이며 들어오고 나머지는 10px만 작고 빠르게 따라옵니다. 모두가 똑같이 화려하면 아무것도 눈에 띄지 않습니다. 한 장면에 <b>주인공(hero)은 하나</b>입니다."],
      ["겹침(오프셋)", "간격(120ms)이 지속시간(420ms)보다 짧으면 앞 카드가 끝나기 전에 다음 카드가 출발합니다. 막대 아래 호박색 선이 <b>겹치는 구간</b>입니다. 겹침이 0이면(간격 = 지속시간) 뚝뚝 끊겨 보이고, 많이 겹칠수록 물결처럼 이어집니다. 간격 슬라이더를 끝까지 올려 비교해 보세요."],
    ],
    terms: [
      ["스태거", "Stagger", "여러 요소의 시작 시간을 일정 간격으로 어긋나게 하는 기법."],
      ["코레오그래피", "Choreography", "여러 요소의 움직임 순서·방향·타이밍을 하나의 장면으로 설계하는 일."],
      ["오프셋", "Offset / overlap", "앞 동작이 끝나기 전 다음 동작을 시작하는 겹침. 애니메이션 원칙의 '겹치는 동작'과 같은 생각."],
      ["주인공 요소", "Hero element", "장면에서 가장 먼저, 가장 크게 움직이는 단 하나의 요소."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const CAP = 400;
      const DIRS = ["위→아래", "아래→위", "대각선", "중심에서"];
      let P = { n: 6, each: 0, D: 420, dir: 0, cap: false, hero: false, grid: false };
      const sEach = M.slider(api.controls, { id: "stgEach", label: "간격 stagger", min: 0, max: 450, step: 10, value: 0, unit: " ms", onInput: (v) => { P.each = v; api.restart(); } });
      const sN = M.slider(api.controls, { id: "stgN", label: "항목 수", min: 3, max: 16, value: 6, onInput: (v) => { P.n = v; api.restart(); } });
      const sD = M.slider(api.controls, { id: "stgD", label: "항목당 지속시간", min: 200, max: 800, step: 20, value: 420, unit: " ms", onInput: (v) => { P.D = v; api.restart(); } });
      const dChips = M.chips(api.controls, { title: "방향", items: DIRS, value: 0, onPick: (i) => { P.dir = i; api.restart(); } });
      const cCap = M.check(api.controls, { id: "stgCap", label: "전체 상한 400ms", onChange: (v) => { P.cap = v; api.restart(); } });
      const cHero = M.check(api.controls, { id: "stgHero", label: "주인공 먼저", onChange: (v) => { P.hero = v; api.restart(); } });
      const cGrid = M.check(api.controls, { id: "stgGrid", label: "격자 배치", onChange: (v) => { P.grid = v; api.restart(); } });
      const PRE = [
        { n: 6, each: 0, D: 420, dir: 0, cap: false, hero: false, grid: false },
        { n: 6, each: 70, D: 420, dir: 0, cap: false, hero: false, grid: false },
        { n: 14, each: 70, D: 420, dir: 0, cap: true, hero: false, grid: false },
        { n: 12, each: 60, D: 420, dir: 3, cap: true, hero: false, grid: true },
        { n: 7, each: 50, D: 380, dir: 0, cap: true, hero: true, grid: false },
        { n: 6, each: 120, D: 420, dir: 0, cap: false, hero: false, grid: false },
      ];
      let step = 0;
      const CODE = "/* CSS: 인덱스로 지연 */\n.card {\n  animation: rise 420ms cubic-bezier(.16,1,.3,1) both;\n  animation-delay: calc(var(--i) * 70ms);\n}\n@keyframes rise { from { opacity: 0; translate: 0 16px; } }\n\n// 전체 상한: 많을수록 간격을 줄인다\nconst each = Math.min(70, 400 / (cards.length - 1));\n\n// GSAP\ngsap.from(\".card\", {\n  y: 16, opacity: 0, duration: 0.42, ease: \"power3.out\",\n  stagger: { each: 0.06, from: \"center\", grid: \"auto\" },\n});\ngsap.timeline()\n  .from(\".hero\", { y: 32, opacity: 0, duration: 0.5 })\n  .from(\".card\", { y: 12, opacity: 0, stagger: 0.05 }, \"-=0.35\");";
      const HL = [[[1, 2]], [[3, 3]], [[7, 8]], [[10, 13]], [[14, 16]], [[2, 3]]];

      function layout(b) {
        const n = P.n, items = [];
        if (P.grid) {
          const cols = 4, rows = Math.ceil(n / cols), g = 8;
          const cw = (b.w - g * (cols - 1)) / cols, ch = Math.min(96, cw * 1.1, (b.h - g * (rows - 1)) / rows);
          for (let i = 0; i < n; i++) { const r = Math.floor(i / cols), cl = i % cols; items.push({ x: b.x + cl * (cw + g), y: b.y + r * (ch + g), w: cw, h: ch, r, c: cl }); }
          return { items, cols, rows };
        }
        const cols = n > 8 ? 2 : 1, g = 6;
        const heroRows = P.hero ? 2 : 0, rows = Math.ceil((n - (P.hero ? 1 : 0)) / cols) + heroRows;
        const ch = Math.min(52, (b.h - g * (rows - 1)) / rows), cw = (b.w - g * (cols - 1)) / cols;
        let k = 0;
        for (let i = 0; i < n; i++) {
          if (P.hero && i === 0) { items.push({ x: b.x, y: b.y, w: b.w, h: ch * 2 + g, r: 0, c: 0, hero: true }); continue; }
          const j = k++, r = Math.floor(j / cols) + heroRows, cl = j % cols;
          items.push({ x: b.x + cl * (cw + g), y: b.y + r * (ch + g), w: cw, h: ch, r, c: cl });
        }
        return { items, cols, rows };
      }
      function delays(L) {
        const n = P.n, its = L.items;
        let o = its.map((it, i) => {
          if (P.dir === 0) return P.grid ? it.r * L.cols + it.c : i;
          if (P.dir === 1) return P.grid ? (L.rows - 1 - it.r) * L.cols + it.c : n - 1 - i;
          if (P.dir === 2) return it.r + it.c;
          const cr = (L.rows - 1) / 2, cc = (L.cols - 1) / 2;
          return Math.hypot(it.r - cr, it.c - cc) * 1.6;
        });
        if (P.hero) { o = o.map((v, i) => (i === 0 ? 0 : v - (P.dir === 1 ? 0 : 1))); }
        const mx = Math.max(...o.filter((v, i) => !(P.hero && i === 0)), 0.0001);
        let each = P.each;
        const raw = o.map((v) => v * P.each);
        if (P.cap && mx * each > CAP) each = CAP / mx;
        const lead = P.hero ? Math.round(P.D * 0.35) : 0;
        const d = o.map((v, i) => (P.hero && i === 0 ? 0 : lead + v * each));
        const r2 = raw.map((v, i) => (P.hero && i === 0 ? 0 : lead + v));
        return { d, raw: r2, each, capped: P.cap && mx * P.each > CAP };
      }

      return {
        setStep(s) {
          step = s; P = { ...PRE[s] };
          sEach.set(P.each); sN.set(P.n); sD.set(P.D); dChips.set(P.dir); cCap.set(P.cap); cHero.set(P.hero); cGrid.set(P.grid);
          api.code(CODE, HL[s], "CSS · GSAP");
        },
        frame(time) {
          const { x, w, h } = M.fit(cv), c = M.col();
          const nar = w < 520;
          const ib = nar ? { x: 12, y: 12, w: w - 24, h: Math.round(h * 0.42) } : { x: 16, y: 16, w: Math.min(w * 0.38, 330), h: h - 30 };
          const tb = nar ? { x: 34, y: ib.y + ib.h + 34, w: w - 48, h: 0 } : { x: ib.x + ib.w + 52, y: 46, w: 0, h: h - 46 - 50 };
          if (nar) tb.h = h - tb.y - 44; else tb.w = w - tb.x - 18;
          const L = layout(ib), dl = delays(L);
          const Dh = (i) => (P.hero && i === 0 ? P.D * 1.3 : P.D);
          const end = Math.max(...dl.d.map((d, i) => d + Dh(i)));
          const per = end + 1300, t = time % per;
          // 무대: 자리 표시 + 카드
          L.items.forEach((it) => { x.save(); x.setLineDash([3, 4]); M.rrect(x, it.x, it.y, it.w, it.h, 9); x.strokeStyle = M.alpha(c.ink, 0.22); x.lineWidth = 1; x.stroke(); x.restore(); });
          if (P.dir === 3 && P.grid) { const a = L.items[0], cx = ib.x + ib.w / 2, cy = a.y + (L.rows * (a.h + 8) - 8) / 2; M.dot(x, cx, cy, 5, c.key, c.ink); }
          L.items.forEach((it, i) => {
            const p = M.clamp((t - dl.d[i]) / Dh(i), 0, 1);
            if (p <= 0) return;
            const e = M.ease.out(p);
            const dy = (1 - e) * (it.hero ? 30 : P.hero ? 10 : 16);
            const top = it.y + dy, r = Math.min(10, it.h / 3);
            x.save();
            x.globalAlpha = e ** 3; M.rrect(x, it.x + 1.5, top + 2.5, it.w, it.h, r); x.fillStyle = c.ink; x.fill();
            x.globalAlpha = e;
            M.rrect(x, it.x, top, it.w, it.h, r); x.fillStyle = c.surface; x.fill();
            if (it.hero) { x.fillStyle = M.alpha(c.key, 0.22); x.fill(); }
            x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
            // 썸네일 + 글줄
            const ip = M.clamp(it.h * 0.16, 3, 7);
            if (P.grid) {
              const ih = it.h * 0.52;
              M.rrect(x, it.x + ip, top + ip, it.w - ip * 2, ih, 5); x.fillStyle = M.alpha(c.a, 0.3); x.fill(); x.strokeStyle = M.alpha(c.ink, 0.7); x.lineWidth = 1; x.stroke();
              M.rrect(x, it.x + ip, top + ip + ih + 6, (it.w - ip * 2) * 0.8, 5, 2.5); x.fillStyle = M.alpha(c.ink, 0.7); x.fill();
              M.rrect(x, it.x + ip, top + ip + ih + 15, (it.w - ip * 2) * 0.5, 4, 2); x.fillStyle = M.alpha(c.ink, 0.25); x.fill();
            } else {
            const th = it.h - ip * 2, tw = it.hero ? Math.min(it.w * 0.32, th * 1.5) : Math.min(th, it.w * 0.3);
            if (th > 5) {
              M.rrect(x, it.x + ip, top + ip, tw, th, Math.min(5, th / 3)); x.fillStyle = M.alpha(it.hero ? c.key : c.a, 0.3); x.fill(); x.strokeStyle = M.alpha(c.ink, 0.7); x.lineWidth = 1; x.stroke();
              const tx = it.x + ip * 2 + tw, room = it.x + it.w - tx - (it.w > 120 && it.h > 22 ? 50 : 8);
              if (room > 20) {
                const lh = Math.min(6, th * 0.2);
                M.rrect(x, tx, top + it.h / 2 - lh - 2, room * 0.85, lh, lh / 2); x.fillStyle = M.alpha(c.ink, 0.7); x.fill();
                M.rrect(x, tx, top + it.h / 2 + 3, room * 0.55, lh * 0.8, lh / 2); x.fillStyle = M.alpha(c.ink, 0.25); x.fill();
              }
            }
            }
            if (!P.grid && it.w > 120 && it.h > 22) M.text(x, Math.round(dl.d[i]) + "ms", it.x + it.w - 8, top + it.h / 2 + 4, { size: 11, mono: true, align: "right", color: it.hero ? c.ink : c.muted });
            x.restore();
          });
          // 타임라인
          const tmax = Math.max(1000, ...dl.raw.map((d, i) => d + Dh(i)), end);
          const scale = Math.ceil(tmax / 200) * 200;
          const X = (ms) => tb.x + (ms / scale) * tb.w;
          const n = P.n, rh = Math.min(30, tb.h / n), bh = Math.max(4, Math.min(16, rh * 0.62));
          const tick = scale > 1600 || tb.w < 300 ? 400 : 200;
          for (let ms = 0; ms <= scale; ms += tick) {
            M.line(x, X(ms), tb.y - 4, X(ms), tb.y + n * rh, c.grid, 1);
            M.text(x, ms + "", X(ms), tb.y + n * rh + 15, { size: 11, mono: true, align: "center" });
          }
          if (P.cap) {
            const lead = P.hero ? Math.round(P.D * 0.35) : 0;
            M.line(x, X(lead + CAP), tb.y - 12, X(lead + CAP), tb.y + n * rh, c.b, 1.5, [4, 3]);
            M.tag(x, "출발 상한 400ms", X(lead + CAP) + 6, tb.y - 16, { size: 11, color: c.b });
          }
          for (let i = 0; i < n; i++) {
            const y = tb.y + i * rh + (rh - bh) / 2, d0 = dl.d[i], d1 = d0 + Dh(i);
            const hero = i === 0 && P.hero, col = hero ? c.key : c.a;
            if (dl.capped && Math.abs(dl.raw[i] - d0) > 1) {
              x.save(); x.setLineDash([3, 3]); M.rrect(x, X(dl.raw[i]), y, X(dl.raw[i] + Dh(i)) - X(dl.raw[i]), bh, 3); x.strokeStyle = M.alpha(c.muted, 0.8); x.lineWidth = 1; x.stroke(); x.restore();
            }
            M.rrect(x, X(d0), y, X(d1) - X(d0), bh, 3); x.fillStyle = M.alpha(col, 0.18); x.fill(); x.strokeStyle = M.alpha(c.ink, 0.45); x.lineWidth = 1; x.stroke();
            const pr = M.clamp((t - d0) / (d1 - d0), 0, 1);
            if (pr > 0) { M.rrect(x, X(d0), y, (X(d1) - X(d0)) * pr, bh, 3); x.fillStyle = M.alpha(col, 0.75); x.fill(); }
            if (step === 5 && i > 0) {
              const o0 = d0, o1 = Math.min(d1, dl.d[i - 1] + Dh(i - 1));
              if (o1 > o0) { x.fillStyle = c.key; x.fillRect(X(o0), y + bh - 3, X(o1) - X(o0), 3); }
            }
            if (rh >= 13) M.text(x, "#" + (i + 1), tb.x - 6, y + bh / 2 + 4, { size: 11, mono: true, align: "right" });
          }
          // 간격 치수
          if (!P.grid && !P.cap && n > 1 && dl.d[1] - dl.d[0] > 8 && (step === 1 || step === 5)) {
            const a0 = X(dl.d[0]), a1 = X(dl.d[1]), yy = tb.y - 8;
            M.line(x, a0, yy, a1, yy, c.ink, 1.5); M.line(x, a0, yy - 4, a0, yy + 4, c.ink, 1.5); M.line(x, a1, yy - 4, a1, yy + 4, c.ink, 1.5);
            M.tag(x, `간격 ${Math.round(dl.d[1] - dl.d[0])}ms`, a1 + 6, yy - 6, { size: 11, mono: true, fill: tint(c.a, 0.2) });
          }
          M.line(x, X(Math.min(t, scale)), tb.y - 6, X(Math.min(t, scale)), tb.y + n * rh + 2, c.ink, 1.5);
          // 요약
          const last = Math.max(...dl.d);
          let msg = `마지막 출발 ${Math.round(last)}ms · 전체 ${Math.round(end)}ms`;
          if (dl.capped) msg += ` · 간격 ${P.each}→${Math.round(dl.each)}ms`;
          if (step === 5) msg = `겹침 ${Math.round(M.clamp(1 - P.each / P.D, 0, 1) * 100)}% (= 1 − 간격/지속시간) · 전체 ${Math.round(end)}ms`;
          M.tag(x, msg, tb.x - (nar ? 22 : 0), Math.min(h - 16, tb.y + n * rh + 42), { size: 11, mono: true, fill: step === 5 ? tint(c.key, 0.3) : c.surface });
          if (!nar) M.text(x, "타임라인 (ms)", tb.x, 18, { size: 12, weight: 700, color: c.ink });
        },
      };
    },
  });

  /* ===== 4-7 중단 가능한 애니메이션 ===== */
  LESSONS.push({
    id: "interruptible", ch: 3, order: 7,
    title: "중단 가능한 애니메이션",
    lede: "이 레슨을 마치면 움직이는 도중 목표가 바뀔 때 재시작·트랜지션·스프링·가산 네 방식이 각각 어떻게 이어지는지 위치-시간 그래프로 구별하고, 사용자가 끼어드는 동작에 무엇을 써야 하는지 알게 됩니다.",
    key: "움직이는 도중 목표가 바뀌면 처음부터 다시 하지 말고, 현재 위치와 속도를 이어받으세요. 사용자가 끼어드는 동작엔 스프링이나 가산 애니메이션을 씁니다.",
    steps: [
      ["고정 시간 애니메이션", "상자가 정해진 시간(600ms) 동안 ease-in-out으로 오른쪽 깃발까지 갑니다. 끝까지 방해받지 않으면 아무 문제가 없습니다. 아래는 위치-시간 그래프로, 곡선이 부드러운 S자입니다."],
      ["중간에 바뀌면: 재시작", "가는 도중 목표가 왼쪽으로 바뀝니다(그래프의 세로 점선). 시작 위치가 고정된 키프레임 애니메이션을 새로 걸면, 상자가 <b>이전 목표로 순간이동</b>한 뒤 다시 출발합니다. 그래프에 '점프' 이름표가 붙은 수직 선이 그 순간입니다."],
      ["트랜지션: 현재 값에서 출발", "CSS 트랜지션은 현재 위치에서 새로 출발하므로 점프는 없습니다. 하지만 속도가 <b>0으로 리셋</b>돼 곡선이 꺾이고, 남은 거리가 짧아도 다시 600ms가 걸립니다. 호박색 원 '속도 끊김'이 꺾인 곳입니다."],
      ["스프링: 속도를 이어받음", "스프링은 목표만 바꾸고 <b>현재 위치와 속도</b>를 그대로 둔 채 계속 계산합니다. 파란 곡선은 달리던 방향으로 조금 더 가다가 자연스럽게 돌아서며, 꺾인 곳이 없습니다."],
      ["가산 애니메이션", "고정 시간을 쓰면서 끊김을 없애는 방법입니다. 목표를 <b>바로 새 값으로 옮기고</b>, '이전 목표와의 차이 → 0' 애니메이션을 진행 중인 것 위에 <b>더합니다</b>. 초록 곡선도 꺾이지 않습니다. iOS Core Animation의 기본 방식이고, 웹에서는 <code>composite: 'add'</code>입니다."],
      ["직접 리타기팅", "트랙을 아무 데나 빠르게 여러 번 클릭해 보세요. 진행 중에 목표를 고치는 것을 <b>리타기팅</b>(retargeting)이라 합니다. 빨강·호박 곡선만 계속 튀고 꺾입니다. 드래그, 스와이프, 호버처럼 사용자가 언제든 끼어드는 동작에는 속도를 보존하는 방식(스프링, 가산)이 필요합니다."],
    ],
    terms: [
      ["중단 가능", "Interruptible", "진행 중에 새 입력이 오면 자연스럽게 방향을 바꿀 수 있는 애니메이션."],
      ["리타기팅", "Retargeting", "진행 중인 애니메이션의 목표값만 바꾸고 현재 상태에서 이어 가는 것."],
      ["속도 보존", "Velocity preservation", "목표가 바뀌어도 그 순간의 속도를 이어받아 곡선이 꺾이지 않게 하는 것."],
      ["가산 애니메이션", "Additive animation", "새 애니메이션을 기존 값에 더해 겹치는 방식. Web Animations의 <code>composite: 'add'</code>."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      let D = 600, K = 170, step = 0;
      const E = (p) => M.ease.inOut(p);
      const VAR = [
        { id: "restart", lab: "재시작", sub: "키프레임 새로", col: "b" },
        { id: "transition", lab: "트랜지션", sub: "현재 값, 속도 0", col: "key" },
        { id: "additive", lab: "가산", sub: "차이를 더함", col: "c" },
        { id: "spring", lab: "스프링", sub: "속도 보존", col: "a" },
      ];
      const ROWS = [["transition"], ["restart"], ["restart", "transition"], ["restart", "transition", "spring"], ["restart", "transition", "additive", "spring"], ["restart", "transition", "additive", "spring"]];
      const make = {
        restart(x0) { let from = x0, to = x0, t0 = -1e9; return { set(tg, t) { from = to; to = tg; t0 = t; }, at(t) { return from + (to - from) * E(M.clamp((t - t0) / D, 0, 1)); } }; },
        transition(x0) { let from = x0, to = x0, t0 = -1e9, cur = x0; return { set(tg, t) { from = cur; to = tg; t0 = t; }, at(t) { cur = from + (to - from) * E(M.clamp((t - t0) / D, 0, 1)); return cur; } }; },
        additive(x0) { let base = x0; const offs = []; return { set(tg, t) { offs.push({ d: base - tg, t0: t }); base = tg; }, at(t) { let v = base; for (let i = offs.length - 1; i >= 0; i--) { const p = (t - offs[i].t0) / D; if (p >= 1) { offs.splice(i, 1); continue; } v += offs[i].d * (1 - E(M.clamp(p, 0, 1))); } return v; } }; },
        spring(x0) {
          let x = x0, v = 0, tg = x0, last = null;
          const cdamp = 2 * 0.72 * Math.sqrt(K);
          const self = { set(t1, t) { self.at(t); tg = t1; }, at(t) {
            if (last == null) last = t;
            let n = Math.min(400, Math.round(t - last)); last = t;
            while (n-- > 0) { const a = -K * (x - tg) - cdamp * v; v += a * 0.001; x += v * 0.001; }
            return x;
          } };
          return self;
        },
      };
      const SCRIPT = [[[200, 1]], [[200, 1], [560, 0.15], [1000, 0.8]]];
      let data = null, live = null;
      function precompute() {
        const ev = step === 0 ? SCRIPT[0] : SCRIPT[1], Pd = step === 0 ? 1500 : 2600;
        const vs = VAR.map((v) => make[v.id](0)), T = [], X = VAR.map(() => []);
        let ei = 0;
        for (let t = 0; t <= Pd; t += 2) {
          while (ei < ev.length && ev[ei][0] <= t) { vs.forEach((s) => s.set(ev[ei][1], t)); ei++; }
          T.push(t); vs.forEach((s, i) => X[i].push(s.at(t)));
        }
        data = { T, X, ev: ev.map((e) => e[0]), tg: ev, P: Pd };
      }
      function startLive(cur) {
        const tg0 = live ? live.tg : cur ? cur[1] : 0;
        live = { t: 0, vs: VAR.map((v, i) => make[v.id](cur ? cur[i] : 0)), T: [], X: VAR.map(() => []), ev: [], tg: tg0, auto: true, nextAuto: 400, user: false };
        live.vs.forEach((s) => s.at(0));
      }
      function retarget(v) {
        if (!live) startLive(curVals);
        live.vs.forEach((s) => s.set(v, live.t));
        live.ev.push(live.t); live.tg = v;
      }
      let curVals = [0, 0, 0, 0], geo = { x0: 0, x1: 1, yEnd: 0 };
      cv.style.cursor = "pointer";
      cv.addEventListener("pointerdown", (e) => {
        const r = cv.getBoundingClientRect();
        const v = M.clamp((e.clientX - r.left - geo.x0) / (geo.x1 - geo.x0), 0, 1);
        if (!live) startLive(curVals);
        live.user = true; retarget(v);
      });
      M.slider(api.controls, { id: "intD", label: "고정 시간 (재시작·트랜지션·가산)", min: 250, max: 1200, step: 50, value: D, unit: " ms", onInput: (v) => { D = v; if (!live) { precompute(); } } });
      M.slider(api.controls, { id: "intK", label: "스프링 강성 stiffness", min: 60, max: 400, step: 10, value: K, onInput: (v) => { K = v; if (!live) precompute(); else startLive(curVals); } });
      const box = M.el("div", { class: "ctl" }, M.el("span", { class: "lbl" }, "목표 바꾸기 (트랙 클릭과 같음)"),
        M.el("div", { class: "chips" },
          M.el("button", { class: "chip", type: "button", onclick: () => { if (!live) startLive(curVals); live.user = true; retarget(Math.random()); } }, "무작위 목표"),
          M.el("button", { class: "chip", type: "button", onclick: () => { live = null; api.restart(); } }, "각본으로 돌아가기")));
      api.controls.append(box);
      const CODE = "// ① 재시작: from 이 고정된 키프레임\nel.animate([{ transform: `translateX(${A}px)` },\n            { transform: `translateX(${B}px)` }], 600);\n\n// ② 트랜지션: 현재 값에서, 속도 0으로 다시 출발\nel.style.transition = \"transform 600ms ease-in-out\";\nel.style.transform = `translateX(${next}px)`;\n\n// ③ 스프링: 목표만 바꾸고 위치·속도는 유지\nfunction tick(dt) {\n  const a = -k * (pos - target) - c * vel;\n  vel += a * dt;  pos += vel * dt;\n}\nel.onpointerdown = (e) => (target = e.x);\n\n// ④ 가산: 새 값으로 옮기고 차이만 0으로\nel.style.transform = `translateX(${next}px)`;\nel.animate([{ transform: `translateX(${prev - next}px)` },\n            { transform: \"none\" }],\n  { duration: 600, easing: \"ease-in-out\", composite: \"add\" });";
      const HL = [[[4, 6]], [[0, 2]], [[4, 6]], [[8, 13]], [[15, 19]], [[8, 19]]];

      const sampleAt = (T, X, t) => {
        if (t <= T[0]) return X[0];
        let lo = 0, hi = T.length - 1;
        if (t >= T[hi]) return X[hi];
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
        const f = (t - T[lo]) / (T[hi] - T[lo] || 1);
        return X[lo] + (X[hi] - X[lo]) * f;
      };

      return {
        setStep(s) { step = s; live = null; precompute(); if (s === 5) startLive(null); api.code(CODE, HL[s], "JavaScript"); },
        replay() { if (step === 5) startLive(null); else live = null; },
        frame(time, dt) {
          const { x, w, h } = M.fit(cv), c = M.col();
          const nar = w < 560;
          const rows = ROWS[step].map((id) => VAR.findIndex((v) => v.id === id));
          // 시간·값
          let T, X, evs, tNow, t0w, t1w, tgt;
          if (live) {
            live.t += Math.min(dt || 16, 64);
            if (step === 5 && !live.user && live.t >= live.nextAuto) { retarget(live.tg > 0.5 ? 0.1 + Math.random() * 0.3 : 0.6 + Math.random() * 0.35); live.nextAuto = live.t + 700 + Math.random() * 500; }
            live.T.push(live.t); live.vs.forEach((s, i) => live.X[i].push(s.at(live.t)));
            while (live.T.length > 2 && live.T[0] < live.t - 4000) { live.T.shift(); live.X.forEach((a) => a.shift()); }
            T = live.T; X = live.X; evs = live.ev.filter((e) => e > live.t - 3000); tNow = live.t; t1w = Math.max(3000, live.t); t0w = t1w - 3000; tgt = live.tg;
            curVals = X.map((a) => a[a.length - 1]);
          } else {
            const tt = time % (data.P + 900);
            tNow = Math.min(tt, data.P); T = data.T; X = data.X; evs = data.ev.slice(1); t0w = 0; t1w = data.P;
            tgt = 0; for (const [et, v] of data.tg) if (et <= tNow) tgt = v;
            curVals = X.map((a) => sampleAt(T, a, tNow));
          }
          // 트랙
          const lab = nar ? 0 : 132, rh = nar ? 44 : M.clamp((h * 0.42) / rows.length, 30, 50);
          const x0 = 16 + lab + 14, x1 = w - 26;
          geo.x0 = x0; geo.x1 = x1;
          let y = nar ? 8 : 14;
          rows.forEach((ri) => {
            const V = VAR[ri], col = c[V.col];
            const ty = nar ? y + 30 : y + rh / 2;
            if (nar) M.text(x, `${V.lab} · ${V.sub}`, 16, y + 12, { size: 11.5, weight: 700, color: c.ink });
            else if (rh < 40) M.text(x, V.lab, 16, ty + 4, { size: 12.5, weight: 700, color: c.ink });
            else { M.text(x, V.lab, 16, ty - 2, { size: 12.5, weight: 700, color: c.ink }); M.text(x, V.sub, 16, ty + 13, { size: 11 }); }
            M.rrect(x, x0 - 12, ty - 4, x1 - x0 + 24, 8, 4); x.fillStyle = c.sunk; x.fill(); x.strokeStyle = M.alpha(c.ink, 0.3); x.lineWidth = 1; x.stroke();
            const gx = M.lerp(x0, x1, tgt);
            const fh = nar ? 11 : 13;
            M.line(x, gx, ty - fh, gx, ty + fh, c.ink, 1.5, [3, 3]);
            x.beginPath(); x.moveTo(gx, ty - fh); x.lineTo(gx + 9, ty - fh + 3.5); x.lineTo(gx, ty - fh + 7); x.closePath(); x.fillStyle = c.ink; x.fill();
            const v = curVals[ri], bx = M.lerp(x0, x1, v), sz = nar ? 18 : Math.min(24, rh - 10);
            M.rrect(x, bx - sz / 2 + 1.5, ty - sz / 2 + 2.5, sz, sz, 6); x.fillStyle = c.ink; x.fill();
            M.rrect(x, bx - sz / 2, ty - sz / 2, sz, sz, 6); x.fillStyle = col; x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
            y += rh;
          });
          if (!nar) M.text(x, "깃발 = 현재 목표", x1, 12, { size: 11, align: "right" });
          // 그래프
          const gb = { x: nar ? 44 : x0, y: y + 14, w: (nar ? w - 44 - 8 : x1 - x0) - 4, h: 0 };
          gb.h = h - gb.y - 24;
          const yMin = -0.2, yMax = 1.2;
          const GX = (t) => gb.x + ((t - t0w) / (t1w - t0w)) * gb.w;
          const GY = (v) => gb.y + gb.h - ((v - yMin) / (yMax - yMin)) * gb.h;
          x.fillStyle = M.alpha(c.surface, 0.85); x.fillRect(gb.x, gb.y, gb.w, gb.h);
          x.strokeStyle = c.line; x.lineWidth = 1; x.strokeRect(gb.x + 0.5, gb.y + 0.5, gb.w - 1, gb.h - 1);
          for (const v of [0, 1]) { M.line(x, gb.x, GY(v), gb.x + gb.w, GY(v), c.grid, 1, [3, 4]); M.text(x, v ? "오른쪽" : "왼쪽", gb.x - 6, GY(v) + 4, { size: 11, align: "right" }); }
          M.text(x, "위치", gb.x + 8, gb.y + 16, { size: 11, weight: 600 });
          M.text(x, "시간 →", gb.x + gb.w, gb.y + gb.h + 16, { size: 11, align: "right" });
          evs.forEach((e) => { M.line(x, GX(e), gb.y, GX(e), gb.y + gb.h, c.muted, 1, [4, 4]); });
          x.save(); x.beginPath(); x.rect(gb.x, gb.y, gb.w, gb.h); x.clip();
          rows.forEach((ri) => {
            const a = X[ri], col = c[VAR[ri].col];
            x.strokeStyle = col; x.lineWidth = 2.2; x.lineJoin = "round"; x.beginPath();
            let first = true;
            for (let i = 0; i < T.length; i++) {
              if (T[i] < t0w || T[i] > tNow) continue;
              const px = GX(T[i]), py = GY(a[i]);
              first ? x.moveTo(px, py) : x.lineTo(px, py); first = false;
            }
            x.stroke();
          });
          x.restore();
          // 끊김 표시
          const marks = [];
          evs.forEach((e) => {
            if (e + 40 > tNow) return;
            rows.forEach((ri) => {
              const id = VAR[ri].id, a = X[ri], f = (t) => sampleAt(T, a, t);
              let kind = null;
              if (id === "restart" && Math.abs(f(e + 1) - f(e - 20)) > 0.05) kind = "점프";
              if (id === "transition" && Math.abs(f(e - 2) - f(e - 34)) > 0.02) kind = "속도 끊김";
              if (kind) marks.push({ x: GX(e), y: GY(f(e + 1)), kind, ri });
            });
          });
          const seen = new Set();
          marks.forEach((m) => {
            x.beginPath(); x.arc(m.x, m.y, 9, 0, Math.PI * 2); x.fillStyle = M.alpha(c.key, 0.25); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.5; x.stroke();
            if (!seen.has(m.kind) && m.x + 90 < gb.x + gb.w) { seen.add(m.kind); M.tag(x, m.kind, m.x + 16, m.kind === "점프" ? m.y - 14 : m.y + 16, { size: 11, fill: tint(c.key, 0.35) }); }
          });
          // 현재 시각
          M.line(x, GX(tNow), gb.y, GX(tNow), gb.y + gb.h, c.ink, 1.2);
          rows.forEach((ri) => M.dot(x, GX(tNow), GY(curVals[ri]), 4, c[VAR[ri].col], c.surface));
          if (step === 5 && live && !live.user) M.tag(x, "트랙을 클릭해 보세요 (지금은 자동)", gb.x + gb.w - 8, gb.y + 16, { size: 11, align: "right", fill: tint(c.key, 0.3) });
        },
      };
    },
  });
})();
