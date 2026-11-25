/* 8장 GPU와 3D: 좌표와 행렬, 장면 그래프, 조명과 노멀, WebGPU */
(() => {
  /* ---------- 이 파일 전용 도구 ---------- */
  const rgbOf = (s) => {
    s = (s || "").trim();
    if (s[0] === "#") {
      let h = s.slice(1);
      if (h.length === 3) h = h.split("").map((q) => q + q).join("");
      const n = parseInt(h.slice(0, 6), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = s.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
  };
  /* 두 색을 섞은 불투명 색 (큰 면을 옅은 틴트로) */
  const mix = (a, b, t) => { const p = rgbOf(a), q = rgbOf(b); return `rgb(${p.map((v, i) => Math.round(M.lerp(v, q[i], t))).join(",")})`; };
  /* 딱딱한 오프셋 그림자 카드 */
  const card = (x, px, py, bw, bh, o = {}) => {
    const c = M.col(), r = o.r ?? 8;
    if (!o.flat) { M.rrect(x, px + 2, py + 3, bw, bh, r); x.fillStyle = M.alpha(c.ink, 0.85); x.fill(); }
    M.rrect(x, px, py, bw, bh, r); x.fillStyle = o.fill || c.surface; x.fill();
    if (o.tint) { x.fillStyle = M.alpha(o.tint, o.tintA ?? 0.22); x.fill(); }
    if (o.dash) x.setLineDash(o.dash);
    x.strokeStyle = o.stroke || c.ink; x.lineWidth = o.lw || 1; x.stroke(); x.setLineDash([]);
  };
  /* 폭에 맞춰 줄어드는 글자 */
  const fitText = (x, s, px, py, maxW, o = {}) => {
    let size = o.size || 12;
    x.font = M.font(size, "mono", o.weight || 500);
    const tw = x.measureText(s).width;
    if (tw > maxW) size = Math.max(10, size * maxW / tw);
    M.text(x, s, px, py, { ...o, size });
  };
  const wrapLines = (x, s, maxW, size, weight = 500) => {
    x.font = M.font(size, "mono", weight);
    const out = [];
    let cur = "";
    for (const wd of s.split(" ")) {
      const t = cur ? cur + " " + wd : wd;
      if (!cur || x.measureText(t).width <= maxW) cur = t; else { out.push(cur); cur = wd; }
    }
    if (cur) out.push(cur);
    return out;
  };
  /* 제목·부제가 있는 상자 */
  const node = (x, b, title, sub, o = {}) => {
    const c = M.col();
    card(x, b.x, b.y, b.w, b.h, o);
    const ty = o.top ? b.y + 19 : sub ? b.y + b.h / 2 - 3 : b.y + b.h / 2 + 4;
    fitText(x, title, b.x + b.w / 2, ty, b.w - 12, { size: o.size || 12, weight: 700, color: c.ink, align: "center" });
    if (sub) fitText(x, sub, b.x + b.w / 2, ty + 15, b.w - 12, { size: 11, color: c.muted, align: "center" });
  };
  /* 상자 n개를 줄 맞춰 배치 (좁으면 여러 줄) */
  const flowPos = (n, ar, minW, bh, gap = 28, rowGap = 30, maxW = 170) => {
    let cols = n;
    while (cols > 1 && cols * minW + (cols - 1) * gap > ar.w) cols--;
    const rows = Math.ceil(n / cols);
    const bw = Math.min(maxW, (ar.w - (cols - 1) * gap) / cols);
    const totalW = cols * bw + (cols - 1) * gap, totalH = rows * bh + (rows - 1) * rowGap;
    const ox = ar.x + (ar.w - totalW) / 2;
    return { boxes: [...Array(n)].map((_, i) => ({ x: ox + (i % cols) * (bw + gap), y: ar.y + Math.floor(i / cols) * (bh + rowGap), w: bw, h: bh })), totalH, cols };
  };
  const flowArrows = (x, B, color) => {
    for (let i = 0; i < B.length - 1; i++) {
      const a = B[i], b = B[i + 1];
      if (Math.abs(a.y - b.y) < 1) M.arrow(x, a.x + a.w + 4, a.y + a.h / 2, b.x - 5, b.y + b.h / 2, color);
      else {
        const x0 = a.x + a.w / 2, y0 = a.y + a.h + 5, x1 = b.x + b.w / 2, y1 = b.y - 5, my = (y0 + y1) / 2;
        M.line(x, x0, y0, x0, my, color, 1.5); M.line(x, x0, my, x1, my, color, 1.5); M.arrow(x, x1, my, x1, y1, color);
      }
    }
  };
  /* 꺾은선 위 진행도 p(0~1)의 점 */
  const along = (pts, p) => {
    const seg = [];
    let tot = 0;
    for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(d); tot += d; }
    let k = p * tot;
    for (let i = 0; i < seg.length; i++) {
      if (k <= seg[i] || i === seg.length - 1) { const t = seg[i] ? M.clamp(k / seg[i], 0, 1) : 0; return [M.lerp(pts[i][0], pts[i + 1][0], t), M.lerp(pts[i][1], pts[i + 1][1], t), i]; }
      k -= seg[i];
    }
    return [pts[0][0], pts[0][1], 0];
  };
  /* 캔버스 높이를 원하는 값으로 (같으면 건드리지 않음) */
  const want = (cv, hh) => { hh = Math.round(hh); if (cv.style.height !== hh + "px") cv.style.height = hh + "px"; };

  /* 3×3 행렬 (행 우선, 열벡터에 곱함: p' = M·p) */
  const m3 = {
    I: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
    T: (x, y) => [1, 0, x, 0, 1, y, 0, 0, 1],
    R: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; },
    S: (x, y) => [x, 0, 0, 0, y, 0, 0, 0, 1],
    mul(A, B) { const r = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += A[i * 3 + k] * B[k * 3 + j]; r.push(s); } return r; },
    lerp: (A, B, t) => A.map((v, i) => M.lerp(v, B[i], t)),
    ap: (A, p) => [A[0] * p[0] + A[1] * p[1] + A[2] * p[2], A[3] * p[0] + A[4] * p[1] + A[5] * p[2], A[6] * p[0] + A[7] * p[1] + A[8] * p[2]],
  };
  const num = (v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);

  /* ===== 8-1 좌표계와 변환 행렬 ===== */
  LESSONS.push({
    id: "matrices", ch: 7, order: 1,
    title: "좌표계와 변환 행렬",
    lede: "3D 화면의 모든 점은 행렬 몇 개를 곱해서 제자리를 찾아갑니다. 2D 격자 위 도형 하나로 이동·회전·크기 행렬, 곱하는 순서, 동차 좌표 w를 봅니다.",
    key: "변환은 오른쪽 행렬부터 적용됩니다. 제자리에서 돌린 뒤 옮기려면 T · R · S 순서로 곱하세요.",
    steps: [
      ["로컬에서 화면까지", "점 하나가 화면에 찍히기까지 좌표계를 다섯 번 갈아탑니다. 물체 자신의 <b>로컬</b>, 장면 공통의 <b>월드</b>, 카메라 기준의 <b>뷰</b>, −1~1 상자로 줄인 <b>클립</b>, 픽셀 단위의 <b>화면</b>. 갈아탈 때마다 행렬을 하나씩 곱합니다."],
      ["이동 Translate", "이동 행렬은 오른쪽 열(호박색 칸)에 <code>tx, ty</code>를 둡니다. 곱하면 <code>x' = x + tx</code>, <code>y' = y + ty</code>가 되어, 점선 원래 모양에서 호박색 화살표만큼 통째로 옮겨집니다. 직접 해보기의 슬라이더를 움직이면 화살표 라벨과 행렬 칸이 함께 바뀝니다."],
      ["회전 Rotate", "회전 행렬은 왼쪽 위 2×2에 <code>cos</code>, <code>sin</code>이 들어갑니다. 회전은 언제나 <b>원점</b>을 중심으로 돕니다. 원점의 호박색 호와 각도 라벨을 보세요. 도형의 빨강·초록 화살표는 도형 자신의 x축, y축입니다."],
      ["크기 Scale", "크기 행렬은 대각선에 배율을 둡니다. x와 y를 다르게 주면 늘어나고 찌그러집니다. 크기도 원점을 기준으로 커지기 때문에, 원점에서 떨어진 도형은 커지면서 호박색 화살표처럼 바깥으로 밀려납니다. 제자리에서 키우려면 먼저 원점으로 옮겨 오는 이동이 필요합니다."],
      ["곱하는 순서", "행렬 곱은 순서를 바꾸면 결과가 달라집니다. <code>T · R</code>은 오른쪽의 R부터 적용해 <b>제자리에서 돈 뒤 옮기고</b>, <code>R · T</code>는 먼저 옮긴 뒤 원점을 축으로 <b>공전</b>시킵니다. 칩으로 바꿔 보세요. 점선이 다른 순서의 결과입니다."],
      ["동차 좌표 w", "이동은 곱셈만으로 표현할 수 없어서 좌표에 세 번째 값 <code>w</code>를 붙입니다. 점은 <code>w = 1</code>이라 이동이 적용되고, 방향은 <code>w = 0</code>이라 회전만 받습니다. 3D에서는 4×4 행렬과 (x, y, z, w)를 쓰고, 원근 투영은 마지막에 w로 나누는 일입니다."],
    ],
    terms: [
      ["변환 행렬", "Transformation matrix", "이동·회전·크기를 숫자 표 하나로 담은 것. 곱하면 차례로 합쳐집니다."],
      ["모델·뷰·투영", "Model · View · Projection", "로컬 → 월드 → 뷰 → 클립으로 옮기는 세 행렬. 줄여서 MVP."],
      ["동차 좌표", "Homogeneous coordinates", "좌표에 w를 하나 더 붙여 이동과 원근까지 곱셈으로 처리하는 방법."],
      ["클립 공간", "Clip space", "투영 뒤 좌표. x, y, z가 −w~w 안쪽인 것만 그려집니다."],
      ["뷰포트 변환", "Viewport transform", "−1~1 좌표를 실제 픽셀 좌표로 펼치는 마지막 단계."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const minH = () => (cv.style.minHeight = api.stage.clientWidth < 560 ? Math.round((api.stage.clientWidth - 36) * 0.7 + (step === 0 ? 44 : 0) + 200) + "px" : "");
      let step = 0, manual = false, tx = 3, ang = 60, scl = 1.5, order = 0;
      M.slider(api.controls, { id: "mxtx", label: "이동 tx", min: -3, max: 4, step: 0.1, value: 3, fmt: (v) => v.toFixed(1), onInput: (v) => { tx = v; manual = true; } });
      M.slider(api.controls, { id: "mxrot", label: "회전 각도", min: -180, max: 180, step: 5, value: 60, unit: "°", onInput: (v) => { ang = v; manual = true; } });
      M.slider(api.controls, { id: "mxsc", label: "크기 배율 sx", min: 0.3, max: 2, step: 0.05, value: 1.5, fmt: (v) => v.toFixed(2) + "×", onInput: (v) => { scl = v; manual = true; } });
      const chOrder = M.chips(api.controls, { title: "곱하는 순서 (5·6단계)", items: ["T · R  회전 후 이동", "R · T  이동 후 회전"], value: 0, onPick: (i) => { order = i; api.restart(); } });
      const SHAPE = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.25], [0, 0.75], [-0.5, 0.25]];
      const V = { x0: -3.5, x1: 6.5, y0: -2.5, y1: 4.5 };
      const CAM = [1.2, 0.8];
      const MODEL = (e) => m3.mul(m3.T(2.5 * e, 1.6 * e), m3.mul(m3.R((30 * e * Math.PI) / 180), m3.S(1 + 0.3 * e, 1 + 0.3 * e)));
      const VIEWM = m3.T(-CAM[0], -CAM[1]);
      const PROJ = m3.S(1 / 3, 1 / 2);
      const VP = [3, 0, 3, 0, 2, 2, 0, 0, 1];
      const SPACES = ["로컬", "월드", "뷰", "클립", "화면"];
      const FORM = ["I", "M", "V · M", "P · V · M", "VP · P · V · M"];
      const CODE = [
        "// 정점 셰이더: 모든 정점에 같은 행렬 셋을 곱한다\nuniform mat4 modelMatrix;       // 로컬 → 월드\nuniform mat4 viewMatrix;        // 월드 → 뷰 (카메라 역행렬)\nuniform mat4 projectionMatrix;  // 뷰 → 클립\nvoid main() {\n  gl_Position = projectionMatrix * viewMatrix\n              * modelMatrix * vec4(position, 1.0);\n}\n// 클립 → 화면(뷰포트)은 GPU가 자동으로 한다",
        "/* CSS matrix(a, b, c, d, tx, ty) = 3×3 행렬의 위 두 줄 */\n.box { transform: translate(120px, 40px); }\n.box { transform: matrix(1, 0, 0, 1, 120, 40); } /* 같은 뜻 */\n\n// three.js\nmesh.position.set(3, 1, 0);",
        ".box { transform: rotate(60deg); }\n/* = matrix(cos, sin, -sin, cos, 0, 0) */\n.box { transform: matrix(0.5, 0.866, -0.866, 0.5, 0, 0); }\n\n// three.js (라디안)\nmesh.rotation.z = Math.PI / 3;",
        ".box { transform: scale(1.5, 0.7); }\n.box { transform: matrix(1.5, 0, 0, 0.7, 0, 0); }\n\n// three.js\nmesh.scale.set(1.5, 0.7, 1);",
        "/* CSS transform 목록도 오른쪽부터 적용된다 */\n.a { transform: translate(120px) rotate(60deg); } /* T · R */\n.b { transform: rotate(60deg) translate(120px); } /* R · T */\n\n// three.js 는 항상 T · R · S 순서로 합친다\nmesh.matrix.compose(position, quaternion, scale);",
        "// 점: w = 1 → 이동까지 적용\nconst p = new THREE.Vector4(1, 0.5, 0, 1).applyMatrix4(m);\n// 방향(노멀, 속도): w = 0 → 이동은 무시, 회전만\nconst d = new THREE.Vector4(1, 0, 0, 0).applyMatrix4(m);\n\n// 원근 투영 뒤 GPU는 x/w, y/w, z/w 로 나눈다 (원근 나눗셈)",
      ];
      const HL = [[[1, 6]], [[1, 2]], [[0, 2]], [[0, 1]], [[1, 2]], [[0, 3]]];
      const TITLE = ["GLSL", "CSS · three.js", "CSS · three.js", "CSS · three.js", "CSS · three.js", "three.js"];

      function drawGrid(x, ar) {
        const c = M.col();
        const U = Math.min(ar.w / (V.x1 - V.x0), ar.h / (V.y1 - V.y0));
        const gw = U * (V.x1 - V.x0), gh = U * (V.y1 - V.y0);
        const ox = ar.x + (ar.w - gw) / 2, oy = ar.y + (ar.h - gh) / 2;
        const X = (u) => ox + (u - V.x0) * U, Y = (v) => oy + (V.y1 - v) * U;
        M.rrect(x, ox, oy, gw, gh, 8); x.fillStyle = c.surface; x.fill(); x.strokeStyle = c.line; x.lineWidth = 1; x.stroke();
        x.save(); M.rrect(x, ox, oy, gw, gh, 8); x.clip();
        for (let u = Math.ceil(V.x0); u <= V.x1; u++) M.line(x, X(u), oy, X(u), oy + gh, M.alpha(c.ink, 0.07), 1);
        for (let v = Math.ceil(V.y0); v <= V.y1; v++) M.line(x, ox, Y(v), ox + gw, Y(v), M.alpha(c.ink, 0.07), 1);
        M.line(x, X(V.x0), Y(0), X(V.x1), Y(0), M.alpha(c.ink, 0.4), 1.2);
        M.line(x, X(0), Y(V.y0), X(0), Y(V.y1), M.alpha(c.ink, 0.4), 1.2);
        M.text(x, "0", X(0) - 6, Y(0) + 13, { size: 11, mono: true, align: "right" });
        x.restore();
        return { X, Y, U, ox, oy, gw, gh };
      }
      function drawShape(x, g, A, o = {}) {
        const c = M.col();
        const P = SHAPE.map((p) => m3.ap(A, [p[0], p[1], 1]));
        x.beginPath(); P.forEach((p, i) => (i ? x.lineTo(g.X(p[0]), g.Y(p[1])) : x.moveTo(g.X(p[0]), g.Y(p[1])))); x.closePath();
        if (o.ghost) { x.setLineDash([4, 4]); x.strokeStyle = M.alpha(c.ink, 0.45); x.lineWidth = 1.3; x.stroke(); x.setLineDash([]); return; }
        x.fillStyle = M.alpha(o.color || c.a, 0.28); x.fill(); x.strokeStyle = o.color || c.a; x.lineWidth = 2; x.stroke();
        if (o.axes !== false) {
          const O = m3.ap(A, [0, 0, 1]), ex = m3.ap(A, [0.9, 0, 1]), ey = m3.ap(A, [0, 0.9, 1]);
          M.arrow(x, g.X(O[0]), g.Y(O[1]), g.X(ex[0]), g.Y(ex[1]), c.b, 2);
          M.arrow(x, g.X(O[0]), g.Y(O[1]), g.X(ey[0]), g.Y(ey[1]), c.c, 2);
          M.dot(x, g.X(O[0]), g.Y(O[1]), 3.5, c.ink);
        }
      }
      function drawMat(x, px, py, cw, chh, A, hl) {
        const c = M.col();
        for (let i = 0; i < 9; i++) {
          const r = Math.floor(i / 3), k = i % 3, cx = px + k * cw, cy = py + r * chh;
          if (hl && hl[i]) { M.rrect(x, cx + 3, cy + 2, cw - 6, chh - 4, 5); x.fillStyle = M.alpha(hl[i], 0.22); x.fill(); }
          M.text(x, num(A[i]), cx + cw - 9, cy + chh / 2 + 4, { mono: true, size: 12, align: "right", color: hl && hl[i] ? c.ink : c.muted, weight: hl && hl[i] ? 700 : 500 });
        }
        x.strokeStyle = c.ink; x.lineWidth = 1.5; x.beginPath();
        x.moveTo(px + 6, py); x.lineTo(px, py); x.lineTo(px, py + 3 * chh); x.lineTo(px + 6, py + 3 * chh);
        x.moveTo(px + 3 * cw - 6, py); x.lineTo(px + 3 * cw, py); x.lineTo(px + 3 * cw, py + 3 * chh); x.lineTo(px + 3 * cw - 6, py + 3 * chh);
        x.stroke();
      }

      return {
        setStep(s) {
          step = s; manual = false; minH();
          api.code(CODE[s], HL[s], TITLE[s]);
        },
        frame(time) {
          const rw = cv.getBoundingClientRect().width, narrow = rw < 560;
          const { x, w, h } = M.fit(cv), c = M.col();
          const top = step === 0 ? 46 : 12;
          const gAr = narrow ? { x: 12, y: top, w: w - 24, h: (w - 24) * 0.7 } : { x: 12, y: top, w: w * 0.6 - 18, h: h - top - 12 };
          const pAr = narrow ? { x: 12, y: gAr.y + gAr.h + 14, w: w - 24, h: h - gAr.y - gAr.h - 22 } : { x: w * 0.6 + 8, y: 12, w: w * 0.4 - 20, h: h - 24 };
          // 단계별 행렬
          let A = m3.I(), hl = null, label = "", lines = [], form = "", ghostA = null, envA = null, trail = null, vecs = null;
          const pp = M.pingpong(time, 1500, 800), e = manual ? 1 : M.ease.inOut(pp.back ? 1 - pp.p : pp.p);
          const rad = (ang * Math.PI) / 180;
          if (step === 0) {
            const P = 1500, k = Math.floor((time % (P * 5)) / P), te = M.ease.inOut(Math.min(1, (time % P) / 950));
            const stages = [() => m3.I(), (t) => MODEL(t), (t) => m3.mul(m3.lerp(m3.I(), VIEWM, t), MODEL(1)), (t) => m3.mul(m3.lerp(m3.I(), PROJ, t), m3.mul(VIEWM, MODEL(1))), (t) => m3.mul(m3.lerp(m3.I(), VP, t), m3.mul(PROJ, m3.mul(VIEWM, MODEL(1))))];
            const envs = [null, () => m3.I(), (t) => m3.lerp(m3.I(), VIEWM, t), (t) => m3.mul(m3.lerp(m3.I(), PROJ, t), VIEWM), (t) => m3.mul(m3.lerp(m3.I(), VP, t), m3.mul(PROJ, VIEWM))];
            A = stages[k](te); envA = envs[k] ? envs[k](te) : null;
            label = `${SPACES[k]} 좌표`; form = `누적 행렬 = ${FORM[k]}`;
            lines = [
              "물체 자신의 원점이 기준. 모델링한 그대로의 좌표.",
              "모델 행렬 M이 장면 안 자리로 옮김.",
              "뷰 행렬 V가 카메라를 원점으로. 세상이 반대로 움직임.",
              "투영 행렬 P가 보이는 범위를 −1~1 상자로 줄임.",
              "뷰포트 변환이 −1~1을 픽셀 좌표로 펼침.",
            ][k];
            lines = [lines];
            hl = A.map((_, i) => (i === 2 || i === 5 ? c.key : i === 0 || i === 1 || i === 3 || i === 4 ? c.a : null));
            // 위쪽 좌표계 사슬
            const n = 5, gap = narrow ? 10 : 18, pw = (gAr.w - gap * (n - 1)) / n;
            SPACES.forEach((s, i) => {
              const bx = gAr.x + i * (pw + gap), on = i === k;
              card(x, bx, 8, pw, 28, { r: 14, tint: on ? c.key : null, tintA: 0.45, flat: !on, stroke: on ? c.ink : c.line });
              fitText(x, s, bx + pw / 2, 26, pw - 8, { size: 11.5, weight: on ? 700 : 500, color: on ? c.ink : c.muted, align: "center" });
              if (i < n - 1) M.arrow(x, bx + pw + 2, 22, bx + pw + gap - 2, 22, i < k ? c.ink : c.line, 1.2);
            });
          } else if (step === 1) {
            const t = manual ? tx : 3 * e, ty = manual ? 1 : e;
            A = m3.T(t, ty); label = "이동 행렬 T"; form = `T(${t.toFixed(1)}, ${ty.toFixed(1)})`;
            hl = [null, null, c.key, null, null, c.key, null, null, null];
            lines = [`x' = x + ${t.toFixed(1)}`, `y' = y + ${ty.toFixed(1)}`];
            ghostA = m3.I();
          } else if (step === 2) {
            const a = manual ? rad : rad * e;
            A = m3.R(a); label = "회전 행렬 R"; form = `R(${((a * 180) / Math.PI).toFixed(0)}°)`;
            hl = [c.a, c.a, null, c.a, c.a, null, null, null, null];
            lines = [`x' = x·cos − y·sin`, `y' = x·sin + y·cos`];
            ghostA = m3.I();
          } else if (step === 3) {
            const sx = manual ? scl : 1 + 0.5 * e, sy = manual ? 1 / Math.sqrt(scl) : 1 - 0.3 * e;
            A = m3.mul(m3.S(sx, sy), m3.T(2, 1)); label = "크기 행렬 S"; form = `S(${sx.toFixed(2)}, ${sy.toFixed(2)}) · 원점에서 떨어진 도형`;
            const Sx = m3.S(sx, sy);
            hl = [c.c, null, null, null, c.c, null, null, null, null];
            lines = [`x' = x × ${sx.toFixed(2)}`, `y' = y × ${sy.toFixed(2)}`];
            ghostA = m3.T(2, 1);
            A._mat = Sx;
          } else if (step === 4) {
            const t = M.cycle(time, 2600, 1200), e1 = M.ease.inOut(M.clamp(t * 2, 0, 1)), e2 = M.ease.inOut(M.clamp(t * 2 - 1, 0, 1));
            const T = m3.T(tx, 1), Rm = m3.R(rad);
            if (order === 0) { A = m3.mul(m3.T(tx * e2, e2), m3.R(rad * e1)); ghostA = m3.mul(Rm, T); }
            else { A = m3.mul(m3.R(rad * e2), m3.T(tx * e1, e1)); ghostA = m3.mul(T, Rm); }
            const full = order === 0 ? m3.mul(T, Rm) : m3.mul(Rm, T);
            A._mat = full;
            trail = [];
            for (let i = 0; i <= 40; i++) {
              const q = Math.min(t, i / 40), q1 = M.ease.inOut(M.clamp(q * 2, 0, 1)), q2 = M.ease.inOut(M.clamp(q * 2 - 1, 0, 1));
              const Mi = order === 0 ? m3.mul(m3.T(tx * q2, q2), m3.R(rad * q1)) : m3.mul(m3.R(rad * q2), m3.T(tx * q1, q1));
              trail.push(m3.ap(Mi, [0, 0, 1]));
            }
            label = order === 0 ? "M = T · R" : "M = R · T"; form = order === 0 ? "오른쪽 R 먼저 → 그다음 T" : "오른쪽 T 먼저 → 그다음 R";
            hl = [c.a, c.a, c.key, c.a, c.a, c.key, null, null, null];
            lines = [order === 0 ? "제자리 회전 후 이동" : "이동 후 원점 기준 공전", `점선 = ${order === 0 ? "R · T" : "T · R"} 결과`];
          } else {
            A = m3.mul(m3.T(tx, 1), m3.R(rad)); label = "M = T · R"; form = "점 w = 1, 방향 w = 0";
            hl = [null, null, c.key, null, null, c.key, null, null, null];
            const p = m3.ap(A, [1, 0.5, 1]), d = m3.ap(A, [1, 0, 0]);
            vecs = { p, d };
            lines = [`점  (1, 0.5, 1) → (${num(p[0])}, ${num(p[1])}, 1)`, `방향 (1, 0, 0) → (${num(d[0])}, ${num(d[1])}, 0)`];
            ghostA = m3.I();
          }
          // 격자와 도형
          const g = drawGrid(x, gAr);
          x.save(); M.rrect(x, g.ox, g.oy, g.gw, g.gh, 8); x.clip();
          if (step === 0 && envA) {
            // 카메라가 보는 범위(±3, ±2)와 카메라 위치
            const box = [[-3, -2], [3, -2], [3, 2], [-3, 2]].map(([u, v]) => m3.ap(envA, [CAM[0] + u, CAM[1] + v, 1]));
            x.beginPath(); box.forEach((p, i) => (i ? x.lineTo(g.X(p[0]), g.Y(p[1])) : x.moveTo(g.X(p[0]), g.Y(p[1])))); x.closePath();
            x.fillStyle = M.alpha(c.key, 0.08); x.fill(); x.setLineDash([5, 4]); x.strokeStyle = c.key; x.lineWidth = 1.3; x.stroke(); x.setLineDash([]);
            const cp = m3.ap(envA, [CAM[0], CAM[1], 1]);
            M.dot(x, g.X(cp[0]), g.Y(cp[1]), 5, c.ink);
            M.text(x, "카메라", g.X(cp[0]) + 8, g.Y(cp[1]) - 7, { size: 11, color: c.ink });
            const k = Math.floor((time % 7500) / 1500);
            if (k === 3) M.text(x, "−1 ~ 1", g.X(-1) + 4, g.Y(1) - 5, { size: 11, mono: true, color: c.key });
            if (k === 4) M.text(x, "(0, 0) 픽셀", g.X(0) + 4, g.Y(4) + 14, { size: 11, mono: true, color: c.key });
          }
          if (trail) { x.beginPath(); trail.forEach((p, i) => (i ? x.lineTo(g.X(p[0]), g.Y(p[1])) : x.moveTo(g.X(p[0]), g.Y(p[1])))); x.strokeStyle = M.alpha(c.key, 0.9); x.lineWidth = 2; x.setLineDash([2, 4]); x.stroke(); x.setLineDash([]); }
          if (ghostA) drawShape(x, g, ghostA, { ghost: true });
          drawShape(x, g, A);
          // 단계별 주석
          if (step === 1) {
            const o = m3.ap(A, [0, 0, 1]);
            if (Math.hypot(o[0], o[1]) > 0.3) { M.arrow(x, g.X(0), g.Y(0), g.X(o[0]) - 3, g.Y(o[1]) + 3, c.key, 2); M.tag(x, `+${o[0].toFixed(1)}, +${o[1].toFixed(1)}`, g.X(o[0] / 2) + 10, g.Y(o[1] / 2) + 14, { mono: true, fill: M.alpha(c.key, 0.28) }); }
          } else if (step === 2) {
            const a = Math.atan2(A[3], A[0]);
            if (Math.abs(a) > 0.05) { x.beginPath(); x.arc(g.X(0), g.Y(0), g.U * 1.1, 0, -a, a > 0); x.strokeStyle = c.key; x.lineWidth = 2; x.stroke(); M.tag(x, `${Math.round((a * 180) / Math.PI)}°`, g.X(Math.cos(a / 2) * 1.25) + 6, g.Y(Math.sin(a / 2) * 1.25), { mono: true, fill: M.alpha(c.key, 0.28) }); }
            M.tag(x, "회전 중심 = 원점", g.X(0) - 10, g.Y(0) + 22, { align: "right" });
          } else if (step === 3) {
            const o = m3.ap(A, [0, 0, 1]);
            M.arrow(x, g.X(2), g.Y(1), g.X(o[0]), g.Y(o[1]), c.key, 2);
            M.dot(x, g.X(0), g.Y(0), 4, c.ink);
            if (Math.hypot(o[0] - 2, o[1] - 1) > 0.25) M.tag(x, "중심도 함께 밀려남", g.X(Math.max(o[0], 2)) + 14, g.Y(Math.min(o[1], 1)) + 18, { fill: M.alpha(c.key, 0.28) });
          }
          if (vecs) {
            const p0 = [1, 0.5];
            M.dot(x, g.X(p0[0]), g.Y(p0[1]), 4, M.alpha(c.ink, 0.4));
            M.arrow(x, g.X(p0[0]), g.Y(p0[1]), g.X(p0[0] + 1.2), g.Y(p0[1]), M.alpha(c.ink, 0.4), 1.5);
            M.dot(x, g.X(vecs.p[0]), g.Y(vecs.p[1]), 5, c.key, c.ink);
            M.arrow(x, g.X(vecs.p[0]), g.Y(vecs.p[1]), g.X(vecs.p[0] + vecs.d[0] * 1.2), g.Y(vecs.p[1] + vecs.d[1] * 1.2), c.key, 2.5);
            M.text(x, "점 p (w=1)", g.X(vecs.p[0]) + 8, g.Y(vecs.p[1]) + 16, { size: 11, color: c.ink, weight: 600 });
            M.text(x, "방향 d (w=0)", g.X(vecs.p[0] + vecs.d[0] * 1.2) + 6, g.Y(vecs.p[1] + vecs.d[1] * 1.2) - 6, { size: 11, color: c.key, weight: 600 });
          }
          x.restore();
          if (ghostA && step !== 5) M.text(x, "점선 = " + (step === 4 ? "순서를 바꾼 결과" : "원래 모양"), g.ox + 8, g.oy + g.gh - 8, { size: 11 });
          // 행렬 판
          card(x, pAr.x, pAr.y, pAr.w, pAr.h, { flat: true, fill: c.sunk, stroke: c.line });
          M.text(x, label, pAr.x + 14, pAr.y + 22, { size: 13, weight: 700, color: c.ink });
          const cw = Math.min(56, (pAr.w - 28) / 3.2), chh = narrow ? 24 : 30;
          const mx = pAr.x + 16, my = pAr.y + 36;
          drawMat(x, mx, my, cw, chh, A._mat || A, hl);
          const tx0 = narrow ? mx + 3 * cw + 18 : pAr.x + 14, ty0 = narrow ? my + 10 : my + 3 * chh + 26, tw = narrow ? pAr.x + pAr.w - tx0 - 8 : pAr.w - 28;
          let yy = ty0;
          for (const s of [form, ...lines]) {
            for (const ln of wrapLines(x, s, tw, 11)) { M.text(x, ln, tx0, yy, { size: 11, mono: true, color: s === form ? c.ink : c.muted, weight: s === form ? 600 : 500 }); yy += 16; }
            yy += 3;
          }
          if (!narrow) {
            const by = pAr.y + pAr.h - 50;
            M.text(x, "칸 색: 파랑 = 회전·크기, 호박 = 이동", pAr.x + 14, by + 16, { size: 11 });
            M.text(x, "도형 화살표: 빨강 = x축, 초록 = y축", pAr.x + 14, by + 34, { size: 11 });
          }
        },
      };
    },
  });

  /* ===== 8-3 three.js 장면 구조 ===== */
  LESSONS.push({
    id: "scene-graph", ch: 7, order: 3,
    title: "three.js 장면 구조",
    lede: "three.js 코드는 거의 같은 뼈대로 시작합니다. 장면·카메라·렌더러, 모양과 재질을 합친 Mesh, 부모의 변환을 물려받는 트리, 그리고 매 프레임 도는 렌더 루프입니다.",
    key: "함께 움직일 물체는 Group으로 묶어 부모만 움직이고, 자식의 position은 부모 기준 로컬 좌표로 생각하세요.",
    steps: [
      ["장면·카메라·렌더러", "three.js 프로그램은 셋으로 시작합니다. 물체를 담는 <b>Scene</b>, 어디서 볼지 정하는 <b>Camera</b>, 둘을 받아 캔버스에 그리는 <b>Renderer</b>. <code>renderer.render(scene, camera)</code> 한 줄이 그림 한 장을 만듭니다."],
      ["Mesh = 모양 + 재질", "화면에 보이는 물체는 대부분 <b>Mesh</b>입니다. 꼭짓점과 삼각형 목록인 <b>Geometry</b>(모양)와, 빛을 받으면 어떤 색이 되는지 정하는 <b>Material</b>(재질)을 합친 것입니다. 오른쪽은 모양만 있을 때와 재질을 입혔을 때를 번갈아 보여 줍니다."],
      ["Object3D 트리", "Scene, Camera, Mesh, Group은 모두 <b>Object3D</b>이고 저마다 <code>position</code>, <code>rotation</code>, <code>scale</code>을 가집니다. <code>add()</code>로 자식을 넣으면 트리가 됩니다. 이 구조를 <b>장면 그래프</b>라고 부릅니다. 왼쪽 트리를 눌러 노드를 골라 보세요."],
      ["부모 회전은 자식에게", "회전판(Group)의 <code>rotation.y</code> 하나만 바꿨는데(오른쪽 라벨) 그 아래 상자 A, B, C가 함께 돕니다. 자식의 변환이 <b>부모 기준</b>이기 때문입니다. 내부 계산은 앞 레슨의 행렬 곱, <code>월드 행렬 = 부모의 월드 행렬 × 내 로컬 행렬</code>입니다."],
      ["로컬과 월드", "위쪽 라벨처럼 상자 C의 <code>position</code>은 상자 B 기준이라 늘 같은 값입니다. 하지만 B가 자전하고 회전판이 돌면 C의 실제 위치(월드)는 계속 바뀝니다. 오른쪽 아래 숫자를 비교해 보세요. 월드 좌표는 <code>getWorldPosition()</code>으로 얻습니다."],
      ["렌더 루프", "애니메이션은 매 프레임 <b>값을 갱신하고 → 다시 그리는</b> 반복입니다. <code>setAnimationLoop</code>(내부는 requestAnimationFrame)가 화면 주사율에 맞춰 이 함수를 부릅니다. 무엇을 움직이든 이 루프 안에서 position과 rotation만 바꾸면 됩니다."],
    ],
    terms: [
      ["장면 그래프", "Scene graph", "물체를 부모-자식 트리로 묶은 구조. 부모의 변환이 자식에게 전해집니다."],
      ["메시", "Mesh", "Geometry(모양) + Material(재질). 화면에 그려지는 물체의 기본 단위."],
      ["지오메트리 · 머티리얼", "Geometry · Material", "꼭짓점·삼각형 데이터와, 빛을 받았을 때의 색 규칙."],
      ["로컬 · 월드 좌표", "Local · World space", "부모 기준 위치와 장면 전체 기준 위치."],
      ["렌더 루프", "Render loop", "매 프레임 갱신과 그리기를 반복하는 함수. three.js에선 setAnimationLoop."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      if (api.stage.clientWidth < 560) cv.style.minHeight = Math.round(262 + (api.stage.clientWidth - 36) * 0.75) + "px";
      let step = 0, sel = null, manual = false, gYawM = 0, rowHits = [];
      const NODES = [
        { id: "scene", name: "Scene", kind: "장면", parent: null, depth: 0 },
        { id: "cam", name: "PerspectiveCamera", kind: "카메라", parent: "scene", depth: 1 },
        { id: "light", name: "DirectionalLight", kind: "조명", parent: "scene", depth: 1 },
        { id: "group", name: "Group 회전판", kind: "", parent: "scene", depth: 1 },
        { id: "a", name: "Mesh 상자 A", kind: "", parent: "group", depth: 2 },
        { id: "b", name: "Mesh 상자 B", kind: "", parent: "group", depth: 2 },
        { id: "c", name: "Mesh 상자 C", kind: "", parent: "b", depth: 3 },
      ];
      const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
      const under = (id, anc) => { for (let n = byId[id]; n; n = byId[n.parent]) if (n.id === anc) return true; return false; };
      const PICK = [["group", "회전판"], ["a", "상자 A"], ["b", "상자 B"], ["c", "상자 C"]];
      const chips = M.chips(api.controls, { title: "노드 고르기 (트리를 눌러도 됩니다)", items: PICK.map((p) => p[1]), onPick: (i) => (sel = PICK[i][0]) });
      M.slider(api.controls, { id: "sgrot", label: "회전판 rotation.y", min: -180, max: 180, step: 5, value: 0, unit: "°", onInput: (v) => { gYawM = (v * Math.PI) / 180; manual = true; } });
      const ro = M.readout(api.controls);
      const DEF = [null, "a", "b", "group", "c", null];
      const LOCAL = { a: [-1.8, 0.5, 0], b: [1.6, 0.6, 0], c: [0.95, 1.2, 0] };
      const SIZE = { a: 1, b: 1.2, c: 0.45 };
      const rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
      const add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
      const f2 = (v) => v.map((q) => (Math.abs(q) < 0.005 ? 0 : q).toFixed(2)).join(", ");
      const CODE = "const scene = new THREE.Scene();\nconst camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);\nconst renderer = new THREE.WebGLRenderer({ antialias: true });\ndocument.body.append(renderer.domElement);\n\nconst geometry = new THREE.BoxGeometry(1, 1, 1);\nconst material = new THREE.MeshStandardMaterial({ color: 'royalblue' });\nconst boxA = new THREE.Mesh(geometry, material);\n\nconst turntable = new THREE.Group();\nscene.add(camera, light, turntable);\nturntable.add(boxA, boxB);\nboxB.add(boxC);                     // C는 B의 자식\nboxC.position.set(0.95, 1.2, 0);    // B 기준 로컬 좌표\n\nturntable.rotation.y = Math.PI / 4; // 자식 전부가 따라 돈다\nboxC.getWorldPosition(v);           // 월드 좌표로 환산\n\nrenderer.setAnimationLoop((t) => {\n  turntable.rotation.y = t / 2000;  // ① 갱신\n  boxB.rotation.y = t / 600;\n  renderer.render(scene, camera);   // ② 그리기\n});";
      const HL = [[[0, 3]], [[5, 7]], [[9, 13]], [[11, 11], [15, 15]], [[12, 13], [16, 16]], [[18, 22]]];
      cv.addEventListener("pointerdown", (e) => {
        const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        const hit = rowHits.find((h) => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h);
        if (hit && PICK.some((p) => p[0] === hit.id)) { sel = hit.id; chips.set(PICK.findIndex((p) => p[0] === hit.id)); }
      });
      return {
        setStep(s) {
          step = s; sel = DEF[s]; manual = false;
          chips.set(PICK.findIndex((p) => p[0] === sel));
          api.code(CODE, HL[s], "three.js");
        },
        frame(time) {
          const rw = cv.getBoundingClientRect().width, narrow = rw < 560;
          const { x, w, h } = M.fit(cv), c = M.col();
          const tAr = narrow ? { x: 12, y: 10, w: w - 24, h: 240 } : { x: 12, y: 12, w: Math.min(300, w * 0.42), h: h - 24 };
          const vAr = narrow ? { x: 12, y: 262, w: w - 24, h: h - 274 } : { x: tAr.x + tAr.w + 16, y: 12, w: w - tAr.w - 40, h: h - 24 };
          // 변환
          const g = manual ? gYawM : step >= 3 ? time / 2000 : 0;
          const bY = step >= 4 ? time / 600 : 0;
          const W = {
            group: [0, 0, 0],
            a: rotY(LOCAL.a, g), b: rotY(LOCAL.b, g),
            c: rotY(add(LOCAL.b, rotY(LOCAL.c, bY)), g),
          };
          const COL = { a: c.a, b: c.b, c: c.c };
          const hot = (id) => sel && (id === sel || under(id, sel));
          // ----- 트리 -----
          const rowH = narrow ? 23 : M.clamp(Math.floor((h - 90) / 10), 25, 34);
          const rows = [];
          NODES.forEach((n) => {
            rows.push(n);
            if (step >= 1 && n.id === sel && LOCAL[n.id]) rows.push({ id: n.id + "-geo", name: "BoxGeometry", kind: "모양", depth: n.depth + 1, sub: true, parent: n.id }, { id: n.id + "-mat", name: "Material", kind: "재질", depth: n.depth + 1, sub: true, parent: n.id });
          });
          const geoPhase = Math.floor(time / 1300) % 2;
          rowHits = [];
          const yOf = {};
          rows.forEach((n, i) => {
            const ry = tAr.y + i * rowH, ix = tAr.x + n.depth * (narrow ? 15 : 18);
            yOf[n.id] = ry + rowH / 2 - 2;
            const isHot = hot(n.id) && !n.sub, isSel = n.id === sel;
            const tri = step === 0 && (n.id === "scene" || n.id === "cam");
            const subOn = n.sub && step === 1 && ((n.id.endsWith("geo") && geoPhase === 0) || (n.id.endsWith("mat") && geoPhase === 1));
            const dim = step === 0 && !tri;
            card(x, ix, ry, tAr.x + tAr.w - ix, rowH - 5, { flat: !isSel && !tri, r: 6, fill: n.sub ? c.sunk : c.surface, tint: isSel || tri ? c.key : isHot ? c.key : subOn ? c.a : null, tintA: isSel || tri ? 0.4 : subOn ? 0.25 : 0.14, stroke: isSel || tri ? c.ink : c.line, dash: n.sub ? [3, 3] : null });
            let tx0 = ix + 8;
            if (COL[n.id]) { x.fillStyle = COL[n.id]; x.fillRect(ix + 7, ry + (rowH - 5) / 2 - 4, 8, 8); tx0 += 13; }
            fitText(x, n.name, tx0, ry + (rowH - 5) / 2 + 4, tAr.x + tAr.w - tx0 - (n.kind ? 44 : 8), { size: narrow ? 10.5 : 11.5, weight: isSel ? 700 : 500, color: dim ? c.muted : c.ink });
            if (n.kind) M.text(x, n.kind, tAr.x + tAr.w - 7, ry + (rowH - 5) / 2 + 4, { size: 11, align: "right", color: c.muted });
            if (n.parent) {
              const p = rows.find((r) => r.id === n.parent), px = tAr.x + p.depth * (narrow ? 15 : 18) + 5;
              x.strokeStyle = M.alpha(c.ink, 0.35); x.lineWidth = 1; x.beginPath(); x.moveTo(px, yOf[p.id] + 9); x.lineTo(px, ry + (rowH - 5) / 2); x.lineTo(ix, ry + (rowH - 5) / 2); x.stroke();
            }
            rowHits.push({ id: n.id, x: ix, y: ry, w: tAr.x + tAr.w - ix, h: rowH - 5 });
          });
          // 렌더러
          const rY = tAr.y + rows.length * rowH + 8, rH = Math.min(58, tAr.y + tAr.h - rY);
          if (rH > 30) {
            const rb = { x: tAr.x, y: rY, w: tAr.w, h: rH };
            const loopOn = step === 5 ? Math.floor(time / 500) % 2 : -1;
            card(x, rb.x, rb.y, rb.w, rb.h, { tint: step === 0 || step === 5 ? c.key : null, tintA: 0.3, r: 8 });
            M.text(x, "WebGLRenderer", rb.x + 10, rb.y + 18, { size: 11.5, weight: 700, color: c.ink });
            const sub = step === 5 ? (loopOn === 0 ? "① 변환 갱신" : "② render(scene, camera)") : "render(scene, camera) → canvas";
            if (rH > 40) fitText(x, sub, rb.x + 10, rb.y + 36, rb.w - 20, { size: 11, color: step === 5 ? c.ink : c.muted, weight: step === 5 ? 700 : 500 });
            if (step === 0) {
              for (const id of ["scene", "cam"]) {
                const sx = tAr.x + tAr.w - 4, sy = yOf[id];
                x.strokeStyle = c.key; x.lineWidth = 1.6; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(sx, sy); x.bezierCurveTo(sx + 14, sy, sx + 14, rb.y + 12, sx - 2, rb.y + 4); x.stroke(); x.setLineDash([]);
              }
            }
          }
          // ----- 3D 뷰 -----
          x.save();
          M.rrect(x, vAr.x, vAr.y, vAr.w, vAr.h, 10); x.fillStyle = c.sunk; x.fill(); x.strokeStyle = c.line; x.stroke(); x.clip();
          x.translate(vAr.x, vAr.y);
          const cam = { pos: [0, 3.6, -6.9], yaw: 0, pitch: -0.4, fov: M.clamp((2 * Math.atan(0.5 * vAr.h / vAr.w) * 180) / Math.PI, 36, 70) };
          M.drawGround(x, cam, vAr.w, vAr.h, M.alpha(c.ink, 0.1), 8, 1);
          const P = (p) => M.cam.project(cam, M.cam.toView(cam, p), vAr.w, vAr.h);
          // 회전판
          x.beginPath();
          for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2, q = P([Math.cos(a) * 2.9, 0, Math.sin(a) * 2.9]); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }
          const gHot = sel === "group";
          x.fillStyle = M.alpha(c.key, gHot ? 0.22 : 0.08); x.fill(); x.strokeStyle = gHot ? c.key : M.alpha(c.ink, 0.3); x.lineWidth = gHot ? 2 : 1; x.stroke();
          const o0 = P([0, 0, 0]), sp = P(rotY([2.9, 0, 0], g));
          M.line(x, o0[0], o0[1], sp[0], sp[1], gHot ? c.key : M.alpha(c.ink, 0.45), 2);
          M.dot(x, sp[0], sp[1], 4, gHot ? c.key : c.muted);
          // 상자
          const boxes = ["a", "b", "c"].map((id) => {
            let color = mix(c.surface, COL[id], 0.5);
            if (sel && hot(id)) color = mix(c.surface, c.key, 0.62);
            else if (sel) color = mix(c.surface, COL[id], 0.18);
            if (step === 1 && id === sel && geoPhase === 0) color = c.surface;
            return { c: W[id], s: [SIZE[id], SIZE[id], SIZE[id]], color };
          });
          M.drawScene(x, cam, boxes, vAr.w, vAr.h);
          if (step >= 4 && (sel === "c" || sel === "b")) {
            const pb = P(W.b), pc = P(W.c);
            M.line(x, pb[0], pb[1], pc[0], pc[1], c.ink, 1.3, [3, 3]);
          }
          ["a", "b", "c"].forEach((id) => {
            const q = P(add(W[id], [0, SIZE[id] / 2 + 0.25, 0]));
            M.text(x, id.toUpperCase(), q[0], q[1], { size: 12, weight: 700, color: c.ink, align: "center" });
          });
          if (step === 3 || (step === 2 && sel === "group")) M.tag(x, `회전판 rotation.y = ${Math.round(((g * 180) / Math.PI) % 360)}°`, sp[0], sp[1] - 18, { align: sp[0] > vAr.w / 2 ? "right" : "left", mono: true, fill: M.alpha(c.key, 0.28) });
          if (step === 4) { const q = P(add(W.c, [0, SIZE.c / 2, 0])); M.callout(x, "C.position = (0.95, 1.2, 0) · B 기준", q[0], q[1] - 18, M.clamp(q[0], 140, vAr.w - 140), 22, { mono: true, align: "center" }); }
          const cap = step === 0 ? "renderer.domElement (canvas)" : step === 1 ? (geoPhase === 0 ? "Geometry만: 모양 데이터" : "+ Material: 빛을 받은 색") : step === 5 ? `frame ${Math.floor(time / 16.67)}` : sel ? `선택: ${byId[sel].name}` : "";
          if (cap) M.text(x, cap, 10, vAr.h - 10, { size: 11, mono: true, color: c.ink, weight: 600 });
          if (step === 0) { x.strokeStyle = c.key; x.lineWidth = 3; x.strokeRect(1.5, 1.5, vAr.w - 3, vAr.h - 3); }
          x.restore();
          // 읽기
          if (sel && LOCAL[sel]) {
            const parent = byId[byId[sel].parent];
            const wp = W[sel];
            ro.textContent = `${byId[sel].name}\nposition (부모 기준)  ${f2(LOCAL[sel])}\n월드 위치            ${f2(wp)}\n부모: ${parent.name}`;
          } else if (sel === "group") ro.textContent = `Group 회전판\nrotation.y  ${((g * 180) / Math.PI % 360).toFixed(0)}°\n자식: 상자 A, 상자 B (+ B의 자식 C)`;
          else ro.textContent = "노드를 고르면 로컬·월드 좌표가 보입니다.";
        },
      };
    },
  });

  /* ===== 8-4 조명과 노멀 ===== */
  LESSONS.push({
    id: "lighting", ch: 7, order: 4,
    title: "조명과 노멀",
    lede: "3D 물체가 입체로 보이는 건 면마다 밝기가 달라서입니다. 그 밝기는 면이 향한 방향(노멀)과 빛의 방향 사이 각도에서 나옵니다. 구 하나를 픽셀마다 직접 계산해 칠해 봅니다.",
    key: "기본 조명은 앰비언트 + 확산(N·L) + 스페큘러(N·H)의 합입니다. 셋 다 노멀과의 내적이라 노멀이 틀리면 조명이 전부 틀립니다.",
    steps: [
      ["노멀: 면이 향한 방향", "표면의 모든 점에는 바깥쪽으로 수직인 길이 1짜리 화살표, <b>노멀</b>(법선)이 있습니다. 조명 계산은 전부 이 화살표와 빛의 방향 사이 각도로 합니다. 아직 조명이 없어서 구가 납작한 원처럼 보입니다. 가운데 화살표가 짧은 건 우리 쪽을 향하기 때문입니다."],
      ["램버트 확산 N·L", "빛을 정면으로 받는 면이 가장 밝고, 비스듬할수록 어두워집니다. 밝기 = <code>max(0, dot(N, L))</code>. 길이 1인 두 벡터의 내적은 사이 각도의 코사인입니다. 구를 드래그해 광원을 옮겨 보세요. 아래 라벨이 가리키는 빛을 등진 쪽은 내적이 음수라 0으로 잘려 완전히 검습니다."],
      ["앰비언트: 바닥 밝기", "현실에서는 벽과 바닥에 튕긴 빛이 그늘진 쪽도 조금 비춥니다. 이걸 흉내 내는 상수가 <b>앰비언트</b>입니다. 아래 라벨이 가리키는 그늘이 이제 새까맣지 않습니다. 실무에서는 0.1~0.3 정도로 두고, 슬라이더로 조절해 보면 값이 클수록 입체감이 줄어드는 것이 보입니다."],
      ["스페큘러: 반짝임", "매끈한 표면은 빛을 거울처럼 튕겨 <b>하이라이트</b>가 생깁니다. 블린-퐁은 빛과 시선의 중간 방향 <code>H</code>를 구해 <code>pow(dot(N, H), 광택)</code>으로 계산합니다. 라벨이 가리키는 흰 점이 하이라이트입니다. 광택(shininess) 값이 클수록 점이 작고 날카로워져 플라스틱(약 32)에서 금속·유리(100 이상) 느낌으로 바뀝니다."],
      ["플랫 vs 스무스", "3D 구는 사실 평평한 면 수백 개입니다. 면마다 노멀 하나를 쓰면 각진 <b>플랫 셰이딩</b>, 꼭짓점 노멀을 픽셀마다 <b>보간</b>하면 매끈한 <b>스무스 셰이딩</b>입니다. 모양은 같고 노멀만 다릅니다. 칩으로 바꿔 보세요."],
      ["노멀 맵", "텍스처에 노멀 방향을 저장해 두고 픽셀마다 노멀을 살짝 비틉니다. 삼각형은 그대로인데 요철이 보입니다. 외곽선은 여전히 매끈한 원입니다. 모양을 바꾸지 않고 <b>빛의 계산만</b> 속이는 기법이라서입니다."],
    ],
    terms: [
      ["노멀", "Normal", "표면에 수직인 단위 벡터. 정점마다 저장하고 픽셀마다 보간합니다."],
      ["램버트 확산", "Lambertian diffuse", "밝기 = N·L. 보는 방향과 상관없는 무광 반사."],
      ["블린-퐁", "Blinn-Phong", "중간 벡터 H로 하이라이트를 계산하는 고전 조명 모델."],
      ["앰비언트", "Ambient", "모든 곳에 똑같이 더하는 바닥 밝기. 간접광의 근사."],
      ["노멀 맵", "Normal map", "노멀 방향을 RGB로 저장한 텍스처. 형태 대신 음영으로 요철을 만듭니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      if (api.stage.clientWidth < 560) cv.style.minHeight = Math.round(Math.min(api.stage.clientWidth - 36, 290) + 210) + "px";
      cv.classList.add("lighting-drag");
      const RES = 150, off = document.createElement("canvas");
      off.width = off.height = RES;
      const octx = off.getContext("2d"), img = octx.createImageData(RES, RES);
      let step = 0, shin = 32, amb = 0.18, flat = false, bump = false, dragging = false, dragged = false, geo = null;
      let L = [-0.55, 0.5, 0.67];
      M.slider(api.controls, { id: "ltshin", label: "광택 shininess", min: 4, max: 128, step: 1, value: 32, onInput: (v) => (shin = v) });
      M.slider(api.controls, { id: "ltamb", label: "앰비언트", min: 0, max: 0.5, step: 0.02, value: 0.18, fmt: (v) => v.toFixed(2), onInput: (v) => (amb = v) });
      const chS = M.chips(api.controls, { title: "셰이딩", items: ["스무스", "플랫"], value: 0, onPick: (i) => (flat = i === 1) });
      const ckB = M.check(api.controls, { id: "ltbump", label: "노멀 맵 켜기", onChange: (v) => (bump = v) });
      const ro = M.readout(api.controls);
      const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
      const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      const VV = [0, 0, 1];
      const PROBE = norm([-0.38, 0.3, 0.87]);
      const SEG = Math.PI / 9;
      const nrmAt = (p) => {
        let n = p;
        const th = Math.atan2(p[0], p[2]), ph = Math.asin(M.clamp(p[1], -1, 1));
        if (flat) {
          const tc = (Math.floor(th / SEG) + 0.5) * SEG, pc = (Math.floor(ph / SEG) + 0.5) * SEG;
          n = [Math.cos(pc) * Math.sin(tc), Math.sin(pc), Math.cos(pc) * Math.cos(tc)];
        }
        if (bump) {
          const F = 9, k = 0.5;
          const dth = Math.cos(th * F) * Math.sin(ph * F), dph = Math.sin(th * F) * Math.cos(ph * F);
          const T = [Math.cos(th), 0, -Math.sin(th)], B = [-Math.sin(ph) * Math.sin(th), Math.cos(ph), -Math.sin(ph) * Math.cos(th)];
          n = norm([n[0] - k * (dth * T[0] + dph * B[0]), n[1] - k * (dth * T[1] + dph * B[1]), n[2] - k * (dth * T[2] + dph * B[2])]);
        }
        return n;
      };
      const terms = (n, H) => {
        const nl = dot(n, L), d = step >= 1 ? Math.max(0, nl) : 0;
        const a = step >= 2 ? amb : 0;
        const s = step >= 3 && nl > 0 ? Math.pow(Math.max(0, dot(n, H)), shin) : 0;
        return { nl, d, a, s };
      };
      const setL = (e) => {
        if (!geo) return;
        const r = cv.getBoundingClientRect();
        let dx = (e.clientX - r.left - geo.cx) / geo.R, dy = -(e.clientY - r.top - geo.cy) / geo.R;
        const l = Math.hypot(dx, dy);
        if (l > 0.97) { dx *= 0.97 / l; dy *= 0.97 / l; }
        L = norm([dx, dy, Math.sqrt(Math.max(0.0025, 1 - dx * dx - dy * dy))]);
        dragged = true;
      };
      cv.addEventListener("pointerdown", (e) => { dragging = true; try { cv.setPointerCapture(e.pointerId); } catch {} setL(e); });
      cv.addEventListener("pointermove", (e) => dragging && setL(e));
      const up = () => (dragging = false);
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      const GLSL = "uniform vec3 lightDir;    // 빛이 오는 쪽을 가리키는 단위 벡터\nuniform vec3 baseColor;\nuniform float shininess;\nvarying vec3 vNormal;     // 정점 노멀, 픽셀마다 보간되어 들어옴\nvarying vec3 vViewDir;\n\nvoid main() {\n  vec3 N = normalize(vNormal);\n  vec3 L = normalize(lightDir);\n  vec3 V = normalize(vViewDir);\n  float diffuse = max(dot(N, L), 0.0);           // 램버트\n  float ambient = 0.18;\n  vec3 H = normalize(L + V);                      // 블린-퐁\n  float spec = pow(max(dot(N, H), 0.0), shininess);\n  vec3 color = baseColor * (ambient + diffuse) + spec;\n  gl_FragColor = vec4(color, 1.0);\n}";
      const FLAT = "const geo = new THREE.SphereGeometry(1, 18, 12);\n\n// 면마다 노멀 하나 → 각진 면\nconst flat = new THREE.MeshPhongMaterial({ flatShading: true });\n\n// 꼭짓점 노멀을 보간 → 매끈한 면 (기본값)\nconst smooth = new THREE.MeshPhongMaterial({ flatShading: false });\n\ngeo.computeVertexNormals();  // 정점 노멀 다시 계산";
      const NMAP = "const normalMap = new THREE.TextureLoader().load('bumps-normal.png');\n\nconst mat = new THREE.MeshStandardMaterial({\n  color: 'royalblue',\n  normalMap,                             // 픽셀 RGB = 노멀 XYZ\n  normalScale: new THREE.Vector2(1, 1),  // 요철 세기\n});\n// 저장 규칙: rgb = normal * 0.5 + 0.5";
      const CODES = [[GLSL, [[3, 3], [7, 7]], "GLSL"], [GLSL, [[8, 8], [10, 10]], "GLSL"], [GLSL, [[11, 11], [14, 14]], "GLSL"], [GLSL, [[2, 2], [12, 14]], "GLSL"], [FLAT, [[2, 6]], "three.js"], [NMAP, [[2, 7]], "three.js"]];

      return {
        setStep(s) {
          step = s;
          flat = s === 4; bump = s === 5;
          chS.set(flat ? 1 : 0); ckB.set(bump);
          api.code(...CODES[s]);
        },
        frame(time) {
          const rw = cv.getBoundingClientRect().width, narrow = rw < 560;
          const sH = narrow ? Math.min(rw - 24, 290) : 0;
          const { x, w, h } = M.fit(cv), c = M.col();
          if (!dragged && step >= 1) {
            const a = time / 2600;
            L = norm([Math.cos(a) * 0.7 - 0.1, 0.45 + Math.sin(a * 0.7) * 0.2, 0.6]);
          }
          const sAr = narrow ? { x: 12, y: 8, w: w - 24, h: sH } : { x: 12, y: 12, w: Math.min(h - 24, w * 0.52), h: h - 24 };
          const R = Math.min(sAr.w, sAr.h) / 2 / 1.32;
          const cx = sAr.x + sAr.w / 2, cy = sAr.y + sAr.h / 2 + 4;
          geo = { cx, cy, R };
          // 픽셀 셰이딩
          const base = rgbOf(c.a);
          const H = norm([L[0] + VV[0], L[1] + VV[1], L[2] + VV[2]]);
          const D = img.data;
          for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
            const u = ((i + 0.5) / RES) * 2 - 1, v = 1 - ((j + 0.5) / RES) * 2, r2 = u * u + v * v, o = (j * RES + i) * 4;
            if (r2 > 1) { D[o + 3] = 0; continue; }
            const p = [u, v, Math.sqrt(1 - r2)];
            let rr, gg, bb;
            if (step === 0) { rr = base[0] * 0.8; gg = base[1] * 0.8; bb = base[2] * 0.8; }
            else {
              const n = nrmAt(p), t = terms(n, H), k = t.a + t.d, sp = t.s * 235;
              rr = base[0] * k + sp; gg = base[1] * k + sp; bb = base[2] * k + sp;
            }
            D[o] = rr; D[o + 1] = gg; D[o + 2] = bb;
            D[o + 3] = 255 * M.clamp((1 - Math.sqrt(r2)) * RES * 0.5, 0, 1);
          }
          octx.putImageData(img, 0, 0);
          x.imageSmoothingEnabled = true;
          x.drawImage(off, cx - R, cy - R, 2 * R, 2 * R);
          M.dot(x, cx, cy, R, null, M.alpha(c.ink, 0.25));
          // 노멀 화살표 (1단계)
          if (step === 0) {
            for (let v = -0.85; v <= 0.86; v += 0.34) for (let u = -0.85; u <= 0.86; u += 0.34) {
              const r2 = u * u + v * v;
              if (r2 > 0.86) continue;
              const n = [u, v, Math.sqrt(1 - r2)], X0 = cx + u * R, Y0 = cy - v * R;
              const X1 = X0 + n[0] * R * 0.3, Y1 = Y0 - n[1] * R * 0.3;
              if (Math.hypot(X1 - X0, Y1 - Y0) > 6) M.arrow(x, X0, Y0, X1, Y1, c.ink, 1.6);
              M.dot(x, X0, Y0, 2.4, c.ink);
            }
          }
          // 광원
          const pP = [cx + PROBE[0] * R, cy - PROBE[1] * R];
          if (step >= 1) {
            const l2 = Math.hypot(L[0], L[1]) || 1, far = 1.18 + 0.1 * (1 - L[2]);
            const sx = cx + (L[0] / Math.max(l2, 0.001)) * Math.min(1, l2 * 1.6) * R * far, sy = cy - (L[1] / Math.max(l2, 0.001)) * Math.min(1, l2 * 1.6) * R * far;
            M.line(x, sx, sy, pP[0], pP[1], M.alpha(c.key, 0.9), 1.3, [4, 3]);
            for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; M.line(x, sx + Math.cos(a) * 11, sy + Math.sin(a) * 11, sx + Math.cos(a) * 16, sy + Math.sin(a) * 16, c.key, 2); }
            M.dot(x, sx, sy, 8, c.key, c.ink);
            M.dot(x, pP[0], pP[1], 5, c.surface, c.ink);
            M.text(x, "P", pP[0] - 9, pP[1] - 8, { size: 12, weight: 700, color: c.ink, align: "right" });
          }
          // 단계별 주석
          if (step === 0) M.callout(x, "노멀 N: 바깥쪽으로 수직", cx + R * 0.62, cy - R * 0.62, cx + R * 0.95, sAr.y + 26, { align: "right" });
          else if (step === 1 || step === 2) { const ax = cx - (L[0] / (Math.hypot(L[0], L[1]) || 1)) * R * 0.72, ay = cy + (L[1] / (Math.hypot(L[0], L[1]) || 1)) * R * 0.72; M.callout(x, step === 1 ? "등진 쪽: N·L < 0 → 0" : `앰비언트 ${amb.toFixed(2)}만큼 밝음`, ax, ay, M.clamp(ax, sAr.x + 120, sAr.x + sAr.w - 120), cy + R + 18, { align: "center", fill: c.surface }); }
          else if (step === 3) { const hx = cx + H[0] * R, hy = cy - H[1] * R; M.callout(x, `하이라이트 · 광택 ${shin}`, hx, hy, M.clamp(hx, sAr.x + 100, sAr.x + sAr.w - 100), cy + R + 18, { align: "center" }); }
          else if (step === 5 && bump) M.callout(x, "외곽선은 여전히 매끈한 원", cx + R * 0.71, cy + R * 0.71, M.clamp(cx + R * 0.71, sAr.x + 100, sAr.x + sAr.w - 100), Math.min(cy + R + 22, sAr.y + sAr.h - 22), { align: "center" });
          const cap = ["조명 없음 · 노멀만", "확산만", "앰비언트 + 확산", "앰비언트 + 확산 + 스페큘러", flat ? "플랫 셰이딩" : "스무스 셰이딩", bump ? "노멀 맵 켬" : "노멀 맵 끔"][step];
          M.text(x, cap, sAr.x + 4, sAr.y + 14, { size: 11.5, weight: 700, color: c.ink });
          if (step >= 1) M.text(x, "드래그: 광원 옮기기", sAr.x + sAr.w - 4, sAr.y + 14, { size: 11, align: "right" });
          // 오른쪽 판: 점 P에서의 계산
          const pAr = narrow ? { x: 12, y: sAr.y + sAr.h + 10, w: w - 24, h: h - sAr.y - sAr.h - 18 } : { x: sAr.x + sAr.w + 14, y: 12, w: w - sAr.x - sAr.w - 26, h: h - 24 };
          card(x, pAr.x, pAr.y, pAr.w, pAr.h, { flat: true, fill: c.sunk, stroke: c.line });
          const n = step === 0 ? PROBE : nrmAt(PROBE), t = terms(n, H);
          M.text(x, step === 0 ? "점 P의 노멀" : "점 P에서의 계산", pAr.x + 12, pAr.y + 20, { size: 12, weight: 700, color: c.ink });
          // 벡터 부채
          const fan = narrow ? { x: pAr.x + 8, y: pAr.y + 26, w: pAr.w * 0.46, h: pAr.h - 32 } : { x: pAr.x + 8, y: pAr.y + 28, w: pAr.w - 16, h: Math.min(230, pAr.h - 200) };
          const bx = fan.x + fan.w / 2, by = fan.y + fan.h - 16, len = Math.min(fan.h - 30, fan.w / 2 - 14);
          M.line(x, bx - len - 8, by, bx + len + 8, by, c.ink, 1.5);
          for (let i = -len; i <= len; i += 9) M.line(x, bx + i, by, bx + i - 5, by + 6, M.alpha(c.ink, 0.3), 1);
          const vecAt = (ang) => [bx + Math.sin(ang) * len, by - Math.cos(ang) * len];
          const sideL = L[0] - n[0] >= 0 ? 1 : -1, sideV = VV[0] - n[0] >= 0 ? 1 : -1;
          const aL = sideL * Math.acos(M.clamp(t.nl, -1, 1)), aV = sideV * (Math.acos(M.clamp(dot(n, VV), -1, 1)) || 0.0001);
          const pN = vecAt(0);
          M.arrow(x, bx, by, pN[0], pN[1], c.ink, 2.2); M.text(x, "N", pN[0] + 6, pN[1] + 4, { size: 12, weight: 700, color: c.ink });
          if (step >= 1) {
            const pL = vecAt(aL), pV = vecAt(aV);
            M.arrow(x, bx, by, pL[0], pL[1], t.nl > 0 ? c.key : c.muted, 2.2); M.text(x, "L", pL[0] + sideL * 8, pL[1] - 4, { size: 12, weight: 700, color: c.key, align: sideL > 0 ? "left" : "right" });
            if (step >= 3) {
              M.arrow(x, bx, by, pV[0], pV[1], c.muted, 1.6); M.text(x, "V", pV[0] + sideV * 8, pV[1], { size: 11, weight: 700, align: sideV > 0 ? "left" : "right" });
              const hx = (pL[0] + pV[0]) / 2 - bx, hy = (pL[1] + pV[1]) / 2 - by, hl = Math.hypot(hx, hy) || 1;
              M.arrow(x, bx, by, bx + (hx / hl) * len * 0.8, by + (hy / hl) * len * 0.8, c.c, 2); M.text(x, "H", bx + (hx / hl) * len * 0.8 + 5, by + (hy / hl) * len * 0.8 - 2, { size: 11, weight: 700, color: c.c });
            }
            x.beginPath(); x.arc(bx, by, 22, -Math.PI / 2 + Math.min(aL, 0), -Math.PI / 2 + Math.max(aL, 0)); x.strokeStyle = c.key; x.lineWidth = 1.4; x.stroke();
          }
          // 막대
          const bars = narrow ? { x: pAr.x + pAr.w * 0.5, y: pAr.y + 34, w: pAr.w * 0.5 - 12 } : { x: pAr.x + 12, y: fan.y + fan.h + 18, w: pAr.w - 24 };
          const items = step === 0
            ? [["N.x", (n[0] + 1) / 2, n[0], c.ink], ["N.y", (n[1] + 1) / 2, n[1], c.ink], ["N.z", (n[2] + 1) / 2, n[2], c.ink], ["길이", 1, 1, c.muted]]
            : [["앰비언트", t.a, t.a, c.muted], ["확산 N·L", t.d, t.nl, c.a], ["스페큘러", t.s, t.s, c.key]];
          const rh = narrow ? 24 : 28;
          items.forEach(([nm, frac, val, col], i) => {
            const yy = bars.y + i * rh;
            M.text(x, nm, bars.x, yy + 10, { size: 11, color: c.ink });
            M.text(x, num(val), bars.x + bars.w, yy + 10, { size: 11, mono: true, align: "right", color: c.ink, weight: 600 });
            x.fillStyle = M.alpha(c.ink, 0.08); x.fillRect(bars.x, yy + 14, bars.w, 6);
            x.fillStyle = col; x.fillRect(bars.x, yy + 14, bars.w * M.clamp(frac, 0, 1), 6);
          });
          if (step >= 1) {
            const k = t.a + t.d, sp = t.s * 235;
            const rgb = base.map((q) => Math.round(M.clamp(q * k + sp, 0, 255)));
            const yy = bars.y + items.length * rh + 4;
            x.fillStyle = `rgb(${rgb.join(",")})`; M.rrect(x, bars.x, yy, 26, 18, 4); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
            fitText(x, `P의 색 = 기본색 × ${k.toFixed(2)} + ${t.s.toFixed(2)}`, bars.x + 34, yy + 13, bars.w - 34, { size: 11, color: c.ink });
          }
          ro.textContent = `L = (${L.map(num).join(", ")})\nN·L at P = ${num(t.nl)}${t.nl < 0 ? "  → 0 으로 자름" : ""}`;
        },
      };
    },
  });

  /* ===== 8-6 WebGPU ===== */
  LESSONS.push({
    id: "webgpu", ch: 7, order: 6,
    title: "WebGPU: 렌더와 컴퓨트",
    lede: "WebGPU는 WebGL의 뒤를 잇는 브라우저 GPU API입니다. 그림을 그리는 렌더 파이프라인과, 그림 없이 대량의 데이터를 병렬로 계산하는 컴퓨트 파이프라인을 같은 구조로 다룹니다.",
    key: "WebGPU는 파이프라인과 바인드 그룹을 미리 만들어 두고, 매 프레임에는 명령을 인코더에 기록해 큐에 한 번 제출하는 구조입니다.",
    steps: [
      ["어댑터 → 디바이스 → 큐", "WebGPU는 <code>navigator.gpu</code>에서 시작합니다. <b>어댑터</b>는 이 컴퓨터의 실제 GPU 하나, <b>디바이스</b>는 그 GPU와 내 페이지 사이의 논리적 연결입니다. 버퍼·파이프라인은 전부 디바이스로 만들고, 명령은 디바이스의 <b>큐</b>에 제출해야 실행됩니다."],
      ["버퍼와 바인드 그룹", "GPU는 자바스크립트 배열을 직접 읽지 못합니다. 데이터를 <b>GPUBuffer</b>(GPU 메모리)로 복사하고, 셰이더의 <code>@binding(n)</code> 자리에 어떤 버퍼를 꽂을지 <b>바인드 그룹</b>으로 묶어 넘깁니다."],
      ["렌더 패스", "<b>렌더 파이프라인</b>은 정점 셰이더 → 래스터화 → 프래그먼트 셰이더의 흐름과 설정을 객체 하나로 굳힌 것입니다. <b>명령 인코더</b>에 렌더 패스를 기록한 뒤 <code>queue.submit()</code>으로 한 번에 보냅니다."],
      ["컴퓨트 패스", "컴퓨트 파이프라인에는 래스터화도 픽셀도 없습니다. 버퍼를 읽고 쓰는 함수 하나를 <b>워크그룹</b> 단위로 수천 번 동시에 실행합니다. <code>dispatchWorkgroups(n)</code>이 몇 묶음을 띄울지 정합니다. 입자 시뮬레이션, 이미지 필터, 머신러닝 추론에 씁니다."],
      ["순차 vs 워크그룹", "숫자 1,152개를 두 배로 만드는 일입니다. CPU 루프는 한 칸씩, GPU는 워크그룹 여러 개를 한꺼번에 처리합니다. 동시에 도는 워크그룹 수는 GPU의 코어 묶음(SM, CU) 수가 정합니다. 칩과 슬라이더로 바꿔 보세요."],
      ["WebGL과 무엇이 다른가", "WebGL은 그릴 때마다 <code>gl.*</code> 호출로 전역 상태를 하나씩 바꾸는 <b>상태 기계</b>입니다. WebGPU는 상태를 <b>파이프라인 객체로 미리</b> 만들어 두고, 명령을 모아 한 번에 제출합니다. 셰이더 언어는 WGSL이고, 컴퓨트 셰이더를 정식으로 지원합니다."],
    ],
    terms: [
      ["어댑터 · 디바이스", "Adapter · Device", "실제 GPU와, 그 GPU에 대한 내 페이지 전용 연결."],
      ["파이프라인", "Render · Compute pipeline", "셰이더와 고정 설정을 미리 묶어 컴파일한 객체."],
      ["바인드 그룹", "Bind group", "셰이더의 @binding 자리에 꽂을 버퍼·텍스처 묶음."],
      ["워크그룹", "Workgroup", "함께 실행되고 공유 메모리를 쓰는 스레드 묶음. 크기는 @workgroup_size로 정합니다."],
      ["커맨드 인코더", "Command encoder", "GPU 명령을 기록해 두는 객체. finish()로 만든 버퍼를 큐에 제출합니다."],
      ["WGSL", "WebGPU Shading Language", "WebGPU 전용 셰이더 언어. Rust와 비슷한 문법."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      let step = 0, wgi = 1, units = 6;
      const WG = [[4, 4], [8, 8], [16, 8]];
      const COLS = 48, ROWS = 24, N = COLS * ROWS;
      M.chips(api.controls, { title: "워크그룹 크기 (5단계)", items: ["4×4 = 16", "8×8 = 64", "16×8 = 128"], value: 1, onPick: (i) => { wgi = i; api.restart(); if (step >= 3 && step <= 4) showCode(); } });
      M.slider(api.controls, { id: "wgpuunits", label: "동시에 도는 워크그룹", min: 1, max: 24, value: 6, onInput: (v) => { units = v; api.restart(); } });
      const ro = M.readout(api.controls);
      const computeCode = () => {
        const n = WG[wgi][0] * WG[wgi][1];
        return `// WGSL\n@group(0) @binding(0) var<storage, read_write> data: array<f32>;\n\n@compute @workgroup_size(${n})\nfn main(@builtin(global_invocation_id) id: vec3u) {\n  let i = id.x;\n  if (i < arrayLength(&data)) { data[i] = data[i] * 2.0; }\n}\n\n// JavaScript\nconst pipeline = device.createComputePipeline({\n  layout: 'auto', compute: { module, entryPoint: 'main' } });\nconst enc = device.createCommandEncoder();\nconst pass = enc.beginComputePass();\npass.setPipeline(pipeline);\npass.setBindGroup(0, bindGroup);\npass.dispatchWorkgroups(Math.ceil(${N} / ${n}));  // ${Math.ceil(N / n)}개\npass.end();\ndevice.queue.submit([enc.finish()]);`;
      };
      const CODE = [
        ["if (!navigator.gpu) throw new Error('WebGPU를 지원하지 않는 브라우저');\nconst adapter = await navigator.gpu.requestAdapter();\nconst device = await adapter.requestDevice();\nconst queue = device.queue;\n\n// 캔버스에 그리려면 컨텍스트를 디바이스에 연결\nconst context = canvas.getContext('webgpu');\nconst format = navigator.gpu.getPreferredCanvasFormat();\ncontext.configure({ device, format });", [[0, 3]], "JavaScript"],
        ["const input = new Float32Array(1152);          // JS 메모리\nconst buffer = device.createBuffer({            // GPU 메모리\n  size: input.byteLength,\n  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,\n});\ndevice.queue.writeBuffer(buffer, 0, input);     // 복사\n\nconst bindGroup = device.createBindGroup({\n  layout: pipeline.getBindGroupLayout(0),\n  entries: [{ binding: 0, resource: { buffer } }],\n});", [[0, 5], [7, 10]], "JavaScript"],
        ["// WGSL\n@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {\n  var p = array(vec2f(0, .6), vec2f(-.6, -.5), vec2f(.6, -.5));\n  return vec4f(p[i], 0, 1);\n}\n@fragment fn fs() -> @location(0) vec4f {\n  return vec4f(0.26, 0.43, 0.76, 1);\n}\n\n// JavaScript\nconst pipeline = device.createRenderPipeline({ layout: 'auto',\n  vertex: { module, entryPoint: 'vs' },\n  fragment: { module, entryPoint: 'fs', targets: [{ format }] } });\nconst enc = device.createCommandEncoder();\nconst pass = enc.beginRenderPass({ colorAttachments: [{\n  view: context.getCurrentTexture().createView(),\n  loadOp: 'clear', storeOp: 'store' }] });\npass.setPipeline(pipeline); pass.draw(3); pass.end();\ndevice.queue.submit([enc.finish()]);", [[1, 7], [10, 12], [17, 18]], "WGSL · JavaScript"],
        null, null,
        ["// WebGL: 그릴 때마다 전역 상태를 하나씩 바꾼다\ngl.useProgram(program);\ngl.bindBuffer(gl.ARRAY_BUFFER, vbo);\ngl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);\ngl.uniform1f(timeLoc, t);\ngl.drawArrays(gl.TRIANGLES, 0, 3);\n\n// WebGPU: 상태는 파이프라인 객체에 미리 굳혀 둔다\nconst pass = enc.beginRenderPass(desc);\npass.setPipeline(pipeline);        // 상태 전체를 한 번에\npass.setBindGroup(0, bindGroup);\npass.draw(3);\npass.end();\ndevice.queue.submit([enc.finish()]);  // 모아서 한 번", [[1, 5], [9, 13]], "WebGL · WebGPU"],
      ];
      function showCode() {
        if (step === 3) api.code(computeCode(), [[2, 7]], "WGSL · JavaScript");
        else if (step === 4) api.code(computeCode(), [[3, 3], [16, 16]], "WGSL · JavaScript");
        else api.code(...CODE[step]);
      }
      const NH = [330, 400, 470, 430, 480, 470];

      /* 단계별 그림 */
      function drawInit(x, w, h, time, narrow) {
        const c = M.col();
        M.text(x, "초기화: await 두 번", 14, 22, { size: 11.5, weight: 700, color: c.ink });
        const F = flowPos(4, { x: 12, y: 40, w: w - 24 }, 120, 56);
        const items = [["navigator.gpu", "진입점"], ["GPUAdapter", "requestAdapter()"], ["GPUDevice", "requestDevice()"], ["GPUQueue", "device.queue"]];
        const p = M.cycle(time, 2600, 900);
        const pts = F.boxes.map((b) => [b.x + b.w / 2, b.y + b.h / 2]);
        const [dx, dy, seg] = along(pts, p);
        const reached = p >= 1 ? 3 : seg + (p > 0 && Math.hypot(dx - pts[seg + 1][0], dy - pts[seg + 1][1]) < 4 ? 1 : 0);
        // 아래: 하드웨어와 캔버스
        const y2 = 40 + F.totalH + 44;
        const bw = Math.min(220, (w - 48) / 2);
        const a1c = F.boxes[1].x + F.boxes[1].w / 2, a2c = F.boxes[2].x + F.boxes[2].w / 2;
        const hb = { x: a1c - bw / 2, y: y2, w: bw, h: 52 }, cb = { x: a2c - bw / 2, y: y2, w: bw, h: 52 };
        const [L0, R0] = hb.x <= cb.x ? [hb, cb] : [cb, hb];
        const over = L0.x + bw + 16 - R0.x;
        if (over > 0) { L0.x -= over / 2; R0.x += over / 2; }
        if (L0.x < 12) { R0.x += 12 - L0.x; L0.x = 12; }
        if (R0.x + bw > w - 12) { L0.x -= R0.x + bw - (w - 12); R0.x = w - 12 - bw; }
        node(x, hb, "GPU 하드웨어", "실제 칩 (내장·외장)", { flat: true, dash: [4, 3], stroke: c.muted, fill: c.sunk });
        node(x, cb, "canvas 컨텍스트", "context.configure({ device })", { flat: true, dash: [4, 3], stroke: c.muted, fill: c.sunk });
        const a1 = F.boxes[1], a2 = F.boxes[2];
        M.line(x, hb.x + hb.w / 2, hb.y - 3, a1.x + a1.w / 2, a1.y + a1.h + 5, c.muted, 1.2, [3, 3]);
        M.line(x, cb.x + cb.w / 2, cb.y - 3, a2.x + a2.w / 2, a2.y + a2.h + 5, c.muted, 1.2, [3, 3]);
        flowArrows(x, F.boxes, c.ink);
        M.dot(x, dx, dy, 6, c.key, c.ink);
        F.boxes.forEach((b, i) => node(x, b, items[i][0], items[i][1], { tint: i <= reached ? [c.muted, c.a, c.c, c.key][i] : null, tintA: 0.3 }));
        return Math.max(hb.y, cb.y) + 52;
      }
      function drawBuffers(x, w, h, time, narrow) {
        const c = M.col();
        M.text(x, "데이터가 셰이더까지 가는 길", 14, 20, { size: 11.5, weight: 700, color: c.ink });
        const F = flowPos(4, { x: 12, y: 78, w: w - 24 }, 124, 56);
        const items = [["Float32Array", "JS 메모리"], ["GPUBuffer", "GPU 메모리"], ["GPUBindGroup", "@group(0)"], ["셰이더", "var<storage> data"]];
        flowArrows(x, F.boxes, c.ink);
        F.boxes.forEach((b, i) => node(x, b, items[i][0], items[i][1], { tint: [c.muted, c.a, c.key, c.c][i], tintA: 0.25 }));
        // writeBuffer 로 흘러가는 데이터 조각
        const b0 = F.boxes[0], b1 = F.boxes[1];
        const p0 = [b0.x + b0.w / 2, b0.y + b0.h / 2], p1 = [b1.x + b1.w / 2, b1.y + b1.h / 2];
        const ly = b0.y - 15;
        for (let k = 0; k < 4; k++) {
          const t = ((time / 1400) + k / 4) % 1;
          const px = M.lerp(p0[0], p1[0], t);
          x.fillStyle = c.a; x.fillRect(px - 5, ly - 5, 10, 10); x.strokeStyle = c.ink; x.lineWidth = 1; x.strokeRect(px - 5, ly - 5, 10, 10);
        }
        M.text(x, "queue.writeBuffer()", (p0[0] + p1[0]) / 2, ly - 14, { size: 11, mono: true, align: "center", color: c.a, weight: 600 });
        // 바인드 그룹 안쪽
        const y2 = 78 + F.totalH + 30;
        const bw = Math.min(440, w - 24), gb = { x: (w - bw) / 2, y: y2, w: bw, h: Math.min(h - y2 - 14, 132) };
        card(x, gb.x, gb.y, gb.w, gb.h, { tint: c.key, tintA: 0.12 });
        M.text(x, "bindGroup = 셰이더의 빈 자리에 꽂을 목록", gb.x + 12, gb.y + 20, { size: 11, weight: 700, color: c.ink });
        const slots = [["@binding(0)", "입력 버퍼", "storage"], ["@binding(1)", "출력 버퍼", "storage"], ["@binding(2)", "시간·해상도", "uniform"]];
        const on = Math.floor(time / 900) % 3, sh = (gb.h - 34) / 3;
        slots.forEach(([b, what, kind], i) => {
          const yy = gb.y + 30 + i * sh;
          M.rrect(x, gb.x + 10, yy, gb.w - 20, sh - 5, 6); x.fillStyle = i === on ? M.alpha(c.key, 0.35) : c.surface; x.fill(); x.strokeStyle = c.line; x.stroke();
          M.text(x, b, gb.x + 20, yy + sh / 2 + 1, { size: 11, mono: true, color: c.ink, weight: 700 });
          M.text(x, "← " + what, gb.x + 20 + (narrow ? 96 : 110), yy + sh / 2 + 1, { size: 11, color: c.ink });
          M.text(x, kind, gb.x + gb.w - 20, yy + sh / 2 + 1, { size: 11, align: "right" });
        });
        return gb.y + gb.h;
      }
      function icon(x, i, cx, cy, s, time) {
        const c = M.col();
        const T = [[cx, cy - s * 0.5], [cx - s * 0.6, cy + s * 0.45], [cx + s * 0.6, cy + s * 0.45]];
        if (i === 0) { T.forEach((p, k) => M.dot(x, cx + (k - 1) * s * 0.45, cy, 3.5, [c.b, c.c, c.a][k], c.ink)); M.text(x, "[          ]", cx, cy + 4, { size: 11, mono: true, align: "center" }); return; }
        if (i === 1) { x.beginPath(); T.forEach((p, k) => (k ? x.lineTo(...p) : x.moveTo(...p))); x.closePath(); x.strokeStyle = c.ink; x.lineWidth = 1.4; x.stroke(); T.forEach((p, k) => M.dot(x, p[0], p[1], 3.5, [c.b, c.c, c.a][k], c.ink)); return; }
        if (i === 4) { x.strokeStyle = c.ink; x.lineWidth = 1; x.strokeRect(cx - s * 0.8, cy - s * 0.65, s * 1.6, s * 1.3); x.beginPath(); T.forEach((p, k) => (k ? x.lineTo(...p) : x.moveTo(...p))); x.closePath(); x.fillStyle = c.a; x.fill(); return; }
        // 2, 3: 픽셀 격자
        const n = 7, cs = (s * 1.3) / n;
        for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
          const px = cx - s * 0.65 + k * cs, py = cy - s * 0.55 + j * cs;
          const u = (k + 0.5) / n, v = (j + 0.5) / n;
          const inside = v > 0.05 && Math.abs(u - 0.5) < v * 0.5;
          x.fillStyle = !inside ? M.alpha(c.ink, 0.06) : i === 2 ? M.alpha(c.ink, 0.45) : [c.b, c.c, c.a][Math.min(2, Math.floor(u * 3))];
          x.fillRect(px, py, cs - 1, cs - 1);
        }
      }
      function drawRender(x, w, h, time, narrow) {
        const c = M.col();
        // 명령 칩 줄
        const cmds = ["createCommandEncoder", "beginRenderPass", "setPipeline", "draw(3)", "end", "queue.submit"];
        const on = Math.floor(time / 500) % cmds.length;
        let cxp = 12, cyp = 10;
        x.font = M.font(10.5, "mono", 600);
        cmds.forEach((s, i) => {
          const tw = x.measureText(s).width + 16;
          if (cxp + tw > w - 12) { cxp = 12; cyp += 28; }
          card(x, cxp, cyp, tw, 22, { r: 11, flat: i !== on, tint: i === on ? c.key : null, tintA: 0.45, stroke: i === on ? c.ink : c.line });
          M.text(x, s, cxp + tw / 2, cyp + 15, { size: 11, mono: true, align: "center", color: c.ink, weight: 600 });
          cxp += tw + 12;
        });
        const top = cyp + 40;
        M.text(x, "렌더 파이프라인 (createRenderPipeline 으로 미리 만듦)", 14, top - 4, { size: 11, weight: 700, color: c.ink });
        const F = flowPos(5, { x: 12, y: top + 8, w: w - 24 }, 92, 86, 18, 28);
        const items = [["정점 버퍼", "꼭짓점 3개"], ["정점 셰이더", "@vertex"], ["래스터화", "고정 단계"], ["프래그먼트", "@fragment"], ["컬러 타깃", "캔버스 텍스처"]];
        const hot = Math.floor(time / 700) % 5;
        flowArrows(x, F.boxes, c.ink);
        F.boxes.forEach((b, i) => {
          node(x, b, items[i][0], items[i][1], { top: true, tint: i === hot ? c.key : i === 2 ? c.muted : null, tintA: i === hot ? 0.3 : 0.12 });
          icon(x, i, b.x + b.w / 2, b.y + 62, 18, time);
        });
        return top + 8 + F.totalH;
      }
      function drawCompute(x, w, h, time, narrow) {
        const c = M.col();
        M.text(x, "컴퓨트 파이프라인: 래스터화 없음", 14, 22, { size: 11.5, weight: 700, color: c.ink });
        const F = flowPos(3, { x: 12, y: 40, w: w - 24 }, 130, 56, 30, 30, 190);
        const items = [["스토리지 버퍼", "입력 data[]"], ["컴퓨트 셰이더", "@compute"], ["스토리지 버퍼", "출력 (같은 버퍼도 가능)"]];
        flowArrows(x, F.boxes, c.ink);
        F.boxes.forEach((b, i) => node(x, b, items[i][0], items[i][1], { tint: i === 1 ? c.c : c.a, tintA: 0.22 }));
        const y2 = 40 + F.totalH + 36;
        const [tw, th] = WG[wgi], nShow = 4;
        M.text(x, `dispatchWorkgroups(${nShow}) → 워크그룹 ${nShow}개 × 스레드 ${tw * th}개`, 14, y2, { size: 11, weight: 700, color: c.ink });
        const gap = 14, cols = narrow ? 2 : 4, bwid = (w - 24 - gap * (cols - 1)) / cols;
        const cs = Math.min(bwid / tw, (h - y2 - 60) / (Math.ceil(nShow / cols) * th) - 1, 16);
        const p = M.cycle(time, 1100, 900);
        for (let g = 0; g < nShow; g++) {
          const gx = 12 + (g % cols) * (bwid + gap) + (bwid - cs * tw) / 2, gy = y2 + 12 + Math.floor(g / cols) * (cs * th + 26);
          for (let j = 0; j < th; j++) for (let k = 0; k < tw; k++) {
            const id = j * tw + k, lit = p > (id / (tw * th)) * 0.25;
            x.fillStyle = lit ? M.alpha(g % 2 ? c.c : c.a, 0.5) : M.alpha(c.ink, 0.06);
            x.fillRect(gx + k * cs, gy + j * cs, cs - 1, cs - 1);
          }
          x.strokeStyle = c.ink; x.lineWidth = 1; x.strokeRect(gx - 1.5, gy - 1.5, cs * tw + 2, cs * th + 2);
          M.text(x, `workgroup_id ${g}`, gx, gy + cs * th + 14, { size: 11, mono: true });
        }
      }
      function drawRace(x, w, h, time, narrow) {
        const c = M.col();
        const [tw, th] = WG[wgi], gxN = COLS / tw, gyN = ROWS / th, nWG = gxN * gyN;
        const cellMs = 4, cpuMs = N * cellMs, waveMs = 340, waves = Math.ceil(nWG / units), gpuMs = waves * waveMs;
        const t = time % (cpuMs + 1500);
        const cpuDone = Math.min(N, Math.floor(t / cellMs));
        const wave = Math.floor(t / waveMs), wp = (t - wave * waveMs) / waveMs;
        const pw = narrow ? w - 24 : (w - 24 - 20) / 2;
        const cs = Math.min(pw / COLS, narrow ? 7 : 8);
        const gW = cs * COLS, gH = cs * ROWS;
        const A = { x: 12 + (pw - gW) / 2, y: 30 }, B = narrow ? { x: A.x, y: 30 + gH + 40 } : { x: 12 + pw + 20 + (pw - gW) / 2, y: 30 };
        M.text(x, `CPU 루프 · ${cpuDone} / ${N}`, A.x, A.y - 10, { size: 11.5, weight: 700, color: c.ink });
        const gDone = Math.min(N, Math.min(wave, waves) * units * tw * th);
        M.text(x, `GPU 워크그룹 ${tw}×${th} · ${Math.min(nWG, Math.min(wave, waves) * units)} / ${nWG}개`, B.x, B.y - 10, { size: 11.5, weight: 700, color: c.ink });
        const gap = cs > 5 ? 1 : 0;
        for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
          const k = j * COLS + i;
          x.fillStyle = k < cpuDone ? M.alpha(c.b, 0.5) : M.alpha(c.ink, 0.06);
          x.fillRect(A.x + i * cs, A.y + j * cs, cs - gap, cs - gap);
          const wx = Math.floor(i / tw), wy = Math.floor(j / th), wi = wy * gxN + wx, ww = Math.floor(wi / units);
          const local = (j % th) * tw + (i % tw);
          const lit = ww < wave || (ww === wave && wp > (local / (tw * th)) * 0.35);
          x.fillStyle = lit ? M.alpha((wx + wy) % 2 ? c.c : c.a, 0.5) : M.alpha(c.ink, 0.06);
          x.fillRect(B.x + i * cs, B.y + j * cs, cs - gap, cs - gap);
        }
        if (cpuDone < N) { const i = cpuDone % COLS, j = Math.floor(cpuDone / COLS); x.strokeStyle = c.key; x.lineWidth = 2; x.strokeRect(A.x + i * cs - 1, A.y + j * cs - 1, cs + 1, cs + 1); }
        if (wave < waves) for (let wi = wave * units; wi < Math.min(nWG, (wave + 1) * units); wi++) {
          const wx = wi % gxN, wy = Math.floor(wi / gxN);
          x.strokeStyle = c.key; x.lineWidth = 2; x.strokeRect(B.x + wx * tw * cs - 1, B.y + wy * th * cs - 1, tw * cs + 1, th * cs + 1);
        }
        x.strokeStyle = c.line; x.lineWidth = 1; x.strokeRect(A.x - 0.5, A.y - 0.5, gW, gH); x.strokeRect(B.x - 0.5, B.y - 0.5, gW, gH);
        // 시간 막대
        const by = B.y + gH + 30, bw = w - 24 - 120;
        const bar = (yy, lab, total, col, sub) => {
          M.text(x, lab, 12, yy + 11, { size: 11, weight: 700, color: c.ink });
          x.fillStyle = M.alpha(c.ink, 0.08); x.fillRect(120, yy, bw, 14);
          x.fillStyle = col; x.fillRect(120, yy, bw * (Math.min(t, total) / cpuMs), 14);
          x.strokeStyle = c.ink; x.lineWidth = 1; x.strokeRect(120.5, yy + 0.5, bw * (total / cpuMs) - 1, 13);
          M.text(x, sub, 120 + Math.max(bw * (total / cpuMs), 0) + 6 > w - 150 ? 124 : 120 + bw * (total / cpuMs) + 6, yy + 11, { size: 11, mono: true, color: c.ink });
        };
        bar(by, "CPU 순차", cpuMs, c.b, "");
        bar(by + 24, "GPU 병렬", gpuMs, c.a, `${waves} 웨이브`);
        M.text(x, `${N.toLocaleString()} 단계`, 120 + bw - 6, by + 11, { size: 11, mono: true, align: "right", color: c.ink });
        bottomY = by + 40;
        ro.textContent = `워크그룹 ${tw}×${th} = ${tw * th} 스레드, 총 ${nWG}개\n동시 ${units}개씩 → ${waves} 웨이브\nCPU ${N.toLocaleString()} 단계 vs GPU ${waves} 단계`;
        return gDone;
      }
      function drawCompare(x, w, h, time, narrow) {
        const c = M.col();
        // 위: 호출 흐름 두 줄
        const laneH = 54, lw = narrow ? w - 24 : (w - 36) / 2;
        const La = { x: 12, y: 8, w: lw, h: laneH }, Lb = narrow ? { x: 12, y: 8 + laneH + 10, w: lw, h: laneH } : { x: 24 + lw, y: 8, w: lw, h: laneH };
        for (const [ar, lab] of [[La, "WebGL: 호출마다 바로 드라이버로"], [Lb, "WebGPU: 기록해 두었다가 한 번에 submit"]]) {
          card(x, ar.x, ar.y, ar.w, ar.h, { flat: true, fill: c.sunk, stroke: c.line });
          M.text(x, lab, ar.x + 10, ar.y + 16, { size: 11, weight: 700, color: c.ink });
          node(x, { x: ar.x + ar.w - 52, y: ar.y + 22, w: 44, h: 24 }, "GPU", null, { size: 11 });
        }
        // WebGL: 작은 호출이 줄줄이
        for (let k = 0; k < 10; k++) {
          const t = ((time / 1800) + k / 10) % 1, px = La.x + 12 + t * (La.w - 80);
          x.fillStyle = c.b; x.fillRect(px, La.y + 30, 9, 9);
        }
        // WebGPU: 인코더에 모았다가 한 덩어리로
        const cyc = (time % 2200) / 2200, encX = Lb.x + 12, encW = 72;
        card(x, encX, Lb.y + 22, encW, 24, { flat: true, r: 5, tint: c.a, tintA: 0.2, stroke: c.ink });
        M.text(x, "encoder", encX + encW / 2, Lb.y + 38, { size: 11, mono: true, align: "center", color: c.ink });
        const filled = Math.min(6, Math.floor(cyc / 0.1));
        if (cyc < 0.6) for (let k = 0; k < filled; k++) { x.fillStyle = c.a; x.fillRect(encX + 6 + k * 10, Lb.y + 48, 7, 4); }
        else {
          const t = (cyc - 0.6) / 0.4, px = M.lerp(encX + encW + 6, Lb.x + Lb.w - 82, M.ease.inOut(t));
          x.fillStyle = c.a; M.rrect(x, px, Lb.y + 27, 26, 14, 3); x.fill(); x.strokeStyle = c.ink; x.stroke();
        }
        // 아래: 비교 표
        const rows = [["API 모양", "전역 상태 기계 · gl.* 함수", "객체: 디바이스·파이프라인·바인드 그룹"], ["그리기 준비", "그릴 때마다 상태를 다시 설정", "파이프라인을 미리 만들어 재사용"], ["명령 전달", "호출하는 즉시", "인코더에 기록 → submit 한 번"], ["셰이더", "GLSL", "WGSL"], ["범용 계산", "없음 (텍스처로 우회)", "컴퓨트 셰이더"]];
        const ty = (narrow ? Lb.y + laneH : La.y + laneH) + 14;
        const c0 = narrow ? 66 : 110, cw = (w - 24 - c0) / 2;
        const hy = ty;
        M.text(x, "WebGL", 12 + c0 + 8, hy + 12, { size: 11.5, weight: 700, color: c.b });
        M.text(x, "WebGPU", 12 + c0 + cw + 8, hy + 12, { size: 11.5, weight: 700, color: c.a });
        let yy = hy + 22;
        const hotRow = Math.floor(time / 1600) % rows.length;
        rows.forEach((r, i) => {
          const l1 = wrapLines(x, r[1], cw - 16, 10.5), l2 = wrapLines(x, r[2], cw - 16, 10.5), l0 = wrapLines(x, r[0], c0 - 12, 10.5, 700);
          const rh = Math.max(l0.length, l1.length, l2.length) * 14 + 12;
          M.rrect(x, 12, yy, w - 24, rh - 3, 6); x.fillStyle = i === hotRow ? M.alpha(c.key, 0.22) : i % 2 ? c.sunk : c.surface; x.fill();
          l0.forEach((s, k) => M.text(x, s, 20, yy + 16 + k * 14, { size: 11, weight: 700, color: c.ink }));
          l1.forEach((s, k) => M.text(x, s, 12 + c0 + 8, yy + 16 + k * 14, { size: 11, color: c.ink }));
          l2.forEach((s, k) => M.text(x, s, 12 + c0 + cw + 8, yy + 16 + k * 14, { size: 11, color: c.ink }));
          yy += rh;
        });
        return yy;
      }
      const bottoms = {};
      let bottomY = 0;
      return {
        setStep(s) { step = s; showCode(); if (s !== 4) ro.textContent = "칩과 슬라이더는 5단계(순차 vs 워크그룹)에서 효과가 큽니다."; },
        frame(time) {
          const rw = cv.getBoundingClientRect().width, narrow = rw < 560;
          cv.style.minHeight = narrow ? NH[step] + "px" : "";
          const { x, w, h } = M.fit(cv);
          const scalable = !narrow && (step <= 1 || step === 5);
          const k = scalable && bottoms[step] ? M.clamp(Math.min(h / (bottoms[step] + 30), w / 620), 1, 1.3) : 1;
          const oy = step !== 3 && bottoms[step] ? Math.max(0, Math.round((h - bottoms[step] * k) / 2)) : 0;
          x.save(); x.translate(0, oy); x.scale(k, k);
          const W2 = w / k, H2 = (h - oy) / k;
          let bot = 0;
          if (step === 0) bot = drawInit(x, W2, H2, time, narrow);
          else if (step === 1) bot = drawBuffers(x, W2, H2, time, narrow);
          else if (step === 2) bot = drawRender(x, W2, H2, time, narrow);
          else if (step === 3) drawCompute(x, w, h, time, narrow);
          else if (step === 4) { drawRace(x, w, h - oy, time, narrow); bot = bottomY; }
          else bot = drawCompare(x, W2, H2, time, narrow) + 12;
          x.restore();
          if (bot) bottoms[step] = bot;
        },
      };
    },
  });
})();
