/* 8장(ch 7): 데이터 시각화 — d3 는 로드하지 않고 개념을 캔버스로 직접 그린다. 실제 d3 코드는 api.code 로. */
(() => {
  /* ---------- 공용 헬퍼 (IIFE 안에서만) ---------- */
  const ease = (t) => M.ease.out(M.clamp(t, 0, 1));
  const ppv = (time, dur, hold = 600) => { const { p, back } = M.pingpong(time, dur, hold); const e = M.ease.inOut(p); return back ? 1 - e : e; };
  // d3.ticks 와 같은 간격 고르기 (1·2·5 × 10ⁿ)
  const tickStep = (a, b, n) => {
    const s0 = (b - a) / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(s0))), e = s0 / p;
    return (e >= Math.sqrt(50) ? 10 : e >= Math.sqrt(10) ? 5 : e >= Math.sqrt(2) ? 2 : 1) * p;
  };
  const ticks = (a, b, n) => { const st = tickStep(a, b, n), out = []; for (let v = Math.ceil(a / st - 1e-9) * st; v <= b + st * 1e-6; v += st) out.push(+v.toFixed(10)); return out; };
  const fmt = (v, d = 1) => (Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(d));

  /* ===== 8-1 시각 인코딩 ===== */
  const ENC_VALS = [["A", 34], ["B", 27], ["C", 18], ["D", 13], ["E", 8]];
  const ENC_NAMES = ["위치", "길이", "각도", "면적", "색"];
  const ENC_RANK = [0, 2, 3, 4, 6];
  const ENC_LADDER = [
    ["공통 축 위 위치", "position · common scale"],
    ["어긋난 축 위 위치", "position · non-aligned"],
    ["길이", "length"],
    ["각도 · 기울기", "angle · slope"],
    ["면적", "area"],
    ["부피 · 곡률", "volume · curvature"],
    ["색 농도 · 채도", "shading · saturation"],
  ];
  const ENC_CODE = [
    "// 위치: 공통 축 위의 점 (dot plot)\nconst x = d3.scaleLinear()\n    .domain([0, 40])\n    .range([0, width]);\n\nsvg.selectAll(\"circle\").data(data).join(\"circle\")\n    .attr(\"cx\", d => x(d.value))\n    .attr(\"cy\", d => y(d.key) + y.bandwidth() / 2)\n    .attr(\"r\", 6);",
    "// 길이: 막대. 길이로 읽히니 반드시 0 에서 시작\nconst x = d3.scaleLinear()\n    .domain([0, 40])\n    .range([0, width]);\n\nsvg.selectAll(\"rect\").data(data).join(\"rect\")\n    .attr(\"x\", x(0))\n    .attr(\"y\", d => y(d.key))\n    .attr(\"width\", d => x(d.value) - x(0))\n    .attr(\"height\", y.bandwidth());",
    "// 각도: 파이. 값 → 각도로 바꿔 주는 레이아웃\nconst pie = d3.pie().value(d => d.value).sort(null);\nconst arc = d3.arc().innerRadius(0).outerRadius(r);\n\nsvg.selectAll(\"path\").data(pie(data)).join(\"path\")\n    .attr(\"d\", arc)\n    .attr(\"fill\", d => color(d.data.key));",
    "// 면적: 원. 면적이 값에 비례하려면 반지름은 √값\nconst r = d3.scaleSqrt()\n    .domain([0, 40])\n    .range([0, 60]);\n\nsvg.selectAll(\"circle\").data(data).join(\"circle\")\n    .attr(\"cx\", d => x(d.key))\n    .attr(\"r\", d => r(d.value));",
    "// 범주형: 구분만 한다. 순서가 없다\nconst cat = d3.scaleOrdinal(d3.schemeTableau10);\n\n// 순차형: 작다 → 크다. 밝기 하나로\nconst seq = d3.scaleSequential(d3.interpolateBlues)\n    .domain([0, 40]);\n\n// 발산형: 기준값(0)에서 양쪽으로 멀어짐\nconst div = d3.scaleDiverging(d3.interpolateRdBu)\n    .domain([-2, 0, 2]);",
  ];
  const ENC_HL = [[[1, 3], [6, 6]], [[1, 3], [6, 8]], [[1, 2], [5, 5]], [[1, 4], [8, 8]], "all"];
  const ENC_BASE_CODE = "// 막대는 길이로 읽힌다 → 축은 0 에서\nx.domain([0, d3.max(data, d => d.value)]).nice();\n\n// 잘린 축: 차이가 몇 배로 과장된다\nx.domain([7, 34]);   // E 막대가 거의 사라짐\n\n// 점·선 차트는 위치로 읽히므로 0 이 아니어도 된다\nx.domain(d3.extent(data, d => d.value)).nice();";

  LESSONS.push({
    id: "encoding", ch: 6, order: 1,
    title: "시각 인코딩: 값을 무엇으로 보여 줄까",
    lede: "차트는 숫자를 위치·길이·각도·면적·색 같은 시각 속성으로 옮기는 일입니다. 같은 다섯 값을 다섯 가지 방식으로 그려 보고, 눈이 어떤 속성을 정확히 읽고 어떤 속성에 속는지 확인합니다.",
    key: "크기를 비교하게 하려면 공통 축 위의 위치나 0에서 시작하는 막대로 그리고, 색은 구분이나 보조 정보에만 씁니다.",
    steps: [
      ["위치: 공통 축 위의 점", "다섯 값(34, 27, 18, 13, 8)을 한 눈금자 위의 점으로 찍었습니다. 위쪽 A와 B 사이의 <b>7칸 차이</b>가 눈금으로 바로 읽힙니다. 시각 인코딩(visual encoding), 즉 값을 시각 속성에 옮기는 방법 가운데 가장 정확하다는 것이 Cleveland와 McGill의 실험(1984) 결과이고, 오른쪽 순위표 1위가 이것입니다."],
      ["길이: 막대", "같은 값을 0에서 출발하는 막대로 바꿨습니다. 눈은 이제 막대의 <b>길이</b>를 비교합니다. 위치 다음으로 정확해서 순위표 3위이고, 보고서에 막대 차트가 가장 흔한 이유이기도 합니다. 막대 끝에 값을 직접 적어 두면 범례나 눈금을 오가지 않아도 됩니다."],
      ["각도: 파이", "같은 값을 원을 나눈 <b>각도</b>로 바꿨습니다. 파랑 A(122°)와 주황 B(97°)를 보세요. 공통 기준선이 없어서 둘의 차이가 얼마인지 읽기 어렵습니다. 파이는 '절반이 넘는가' 정도의 전체 대비 비율에만 쓰고, 조각은 다섯 개 이하로 줄이는 것이 실무 관행입니다."],
      ["면적: 원", "<b>면적</b>은 더 어렵습니다. 위 줄은 반지름을 <code>√값</code>으로 정해 면적이 값에 비례하므로 A가 E의 4.25배입니다. 아래 줄처럼 반지름을 값에 비례시키면 면적은 제곱인 <b>18배</b>가 되어 큰 값이 크게 과장됩니다. 원 크기로 값을 보여 줄 때는 늘 제곱근 스케일을 씁니다."],
      ["0 기준선", "막대는 길이로 읽히므로 축이 <b>0에서 시작</b>해야 합니다. 빨간 세로선처럼 축 시작을 7로 자르면 E 막대가 거의 사라지고, 위쪽 라벨처럼 A÷E가 실제 4.25배인데 화면에서는 20배를 넘습니다. 위치로 읽는 점·선 차트는 0이 아니어도 괜찮습니다."],
      ["색: 범주 · 순차 · 발산", "색은 크기 비교에는 가장 약하지만 쓰임새가 분명합니다. <b>범주형</b>은 서로 다른 색상으로 구분만 하고, <b>순차형</b>은 밝기 하나로 작다→크다를, <b>발산형</b>은 가운데 기준값(0, 평균)에서 양쪽으로 멀어지는 정도를 두 색으로 보여 줍니다. 한 차트의 범주 색은 5~7개를 넘기지 않습니다."],
    ],
    terms: [
      ["시각 인코딩", "Visual encoding", "데이터 값을 위치·길이·색 같은 시각 속성에 대응시키는 일. 차트 종류를 고를 때 '무엇으로 인코딩할까'라고 말합니다."],
      ["시각 채널", "Visual channel", "인코딩에 쓰는 속성 하나하나. 정확도 순위(Cleveland & McGill, Mackinlay)가 있어 비교가 중요한 값은 위쪽 채널에 둡니다."],
      ["기준선", "Baseline", "막대가 시작하는 값. 길이로 읽는 차트는 0이어야 하며, '축을 잘랐다'는 지적은 이 규칙을 어겼다는 뜻입니다."],
      ["순차형 · 발산형 · 범주형", "Sequential · Diverging · Categorical", "크기 순서, 기준값에서의 거리, 순서 없는 구분을 각각 보여 주는 색 팔레트 종류. 데이터 성격에 맞춰 고릅니다."],
      ["데이터 잉크", "Data-ink", "Tufte의 말로, 그림에서 실제 데이터를 나타내는 잉크. 장식·진한 격자를 줄이고 이것의 비율을 높이라는 원칙입니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      if (api.stage.clientWidth < 560) cv.style.minHeight = "540px";
      let enc = 0, step = 0;
      const chips = M.chips(api.controls, { title: "인코딩 바꾸기", items: ENC_NAMES, value: 0, onPick: (i) => { enc = i; api.restart(); show(); } });
      const ro = M.readout(api.controls);
      function show() {
        ro.innerHTML = `실제 <b>A ÷ B = 1.26</b>, <b>A ÷ E = 4.25</b>\n${ENC_NAMES[enc]}: 정확도 <b>${ENC_RANK[enc] + 1}위</b> / 7`;
        if (step === 4 && enc === 1) api.code(ENC_BASE_CODE, [[0, 1], [3, 4]], "d3.js");
        else api.code(ENC_CODE[enc], ENC_HL[enc], "d3.js");
      }
      const TITLES = [["점 차트", "dot plot · 공통 축 위 위치"], ["막대 차트", "bar chart · 길이"], ["파이 차트", "pie chart · 각도"], ["버블", "bubble · 면적"], ["색 팔레트", "color scales · 색상·밝기"]];
      const hair = (c) => M.alpha(c.ink, 0.08);

      function head(x, b, c, i) {
        M.text(x, TITLES[i][0], b.x, b.y + 13, { size: 13, color: c.ink, weight: 700 });
        x.font = M.font(13, "ui", 700);
        M.text(x, TITLES[i][1], b.x + x.measureText(TITLES[i][0]).width + 10, b.y + 13, { size: 11, mono: true });
        return { x: b.x, y: b.y + 28, w: b.w, h: b.h - 28 };
      }
      function drawRows(x, b, c, g, lo, bars, time) {
        const n = ENC_VALS.length, top = b.y + 6, axisY = b.y + b.h - 22;
        const rh = (axisY - top) / n, ax0 = b.x + 30, ax1 = b.x + b.w - 40;
        const X = (v) => ax0 + ((Math.max(v, lo) - lo) / (40 - lo)) * (ax1 - ax0);
        ticks(0, 40, 4).forEach((t) => {
          if (t < lo - 1e-6) return;
          M.line(x, X(t), top, X(t), axisY, hair(c), 1);
          M.text(x, String(t), X(t), axisY + 16, { size: 11, mono: true, align: "center" });
        });
        if (lo > 0.05) M.text(x, fmt(lo), ax0, axisY + 16, { size: 11, mono: true, align: "center", color: c.b, weight: 700 });
        const pos = [];
        ENC_VALS.forEach(([k, v], i) => {
          const cy = top + rh * (i + 0.5), vx = M.lerp(ax0, X(v), g);
          const focus = step === 0 ? i < 2 : step === 4 ? i === 0 || i === 4 : true;
          M.text(x, k, b.x + 12, cy + 4, { size: 12, mono: true, color: focus ? c.ink : c.muted, weight: 700, align: "center" });
          if (bars) {
            const bh = Math.min(24, rh * 0.56);
            M.rrect(x, ax0, cy - bh / 2, Math.max(0.5, vx - ax0), bh, 3);
            x.fillStyle = M.alpha(c.a, focus ? 0.26 : 0.14); x.fill();
            x.strokeStyle = M.alpha(c.ink, focus ? 0.9 : 0.4); x.lineWidth = 1.25; x.stroke();
          } else {
            M.line(x, ax0, cy, vx, cy, M.alpha(c.ink, 0.14), 1);
            M.dot(x, vx, cy, 6, focus ? c.a : M.alpha(c.a, 0.45), c.surface);
            x.lineWidth = 1.25; x.strokeStyle = M.alpha(c.ink, focus ? 0.9 : 0.35); x.beginPath(); x.arc(vx, cy, 7, 0, Math.PI * 2); x.stroke();
          }
          if (g > 0.6) M.text(x, String(v), vx + (bars ? 7 : 12), cy + 4, { size: 11, mono: true, color: focus ? c.ink : c.muted, weight: 600 });
          pos.push([vx, cy]);
        });
        M.line(x, ax0, top, ax0, axisY, lo > 0 ? c.b : M.alpha(c.ink, 0.85), lo > 0 ? 2 : 1.25);
        M.line(x, ax0, axisY, ax1, axisY, M.alpha(c.ink, 0.5), 1);
        if (g < 0.95) return;
        if (step === 0) {
          // A·B 사이 차이 표시
          const [ax, ay] = pos[0], [bx, by] = pos[1], my = (ay + by) / 2;
          M.line(x, bx, my, ax, my, c.key, 2);
          M.line(x, bx, my - 5, bx, my + 5, c.key, 2); M.line(x, ax, my - 5, ax, my + 5, c.key, 2);
          M.tag(x, "A − B = 7칸", bx - 14, my, { align: "right", mono: true });
        } else if (step === 1) {
          const [ax, ay] = pos[0];
          M.callout(x, "길이 = 34 − 0", ax - 30, ay + 10, ax - 30, ay + Math.min(rh * 0.75, 40), { mono: true, align: "center" });
        } else if (step === 4 && lo > 0.5) {
          const [ex, ey] = pos[4];
          M.callout(x, "E 막대가 거의 사라짐", ex + 4, ey, Math.min(ax1 - 10, ex + 120), ey - Math.min(rh * 0.6, 30), { line: c.b });
        }
      }
      function drawPie(x, b, c, g) {
        const total = ENC_VALS.reduce((s, d) => s + d[1], 0);
        const r = M.clamp(Math.min(b.w * 0.62, b.h - 64) / 2 - 22, 40, 140);
        const cx = b.x + b.w / 2, cy = b.y + (b.h - 30) / 2;
        const fills = [M.alpha(c.a, 0.3), M.alpha(c.key, 0.32), M.alpha(c.ink, 0.06), M.alpha(c.ink, 0.06), M.alpha(c.ink, 0.06)];
        let a0 = -Math.PI / 2;
        const mids = [];
        ENC_VALS.forEach(([k, v], i) => {
          const da = (v / total) * Math.PI * 2 * g, a1 = a0 + da;
          x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r, a0, a1); x.closePath();
          x.fillStyle = c.surface; x.fill(); x.fillStyle = fills[i]; x.fill();
          x.strokeStyle = M.alpha(c.ink, 0.85); x.lineWidth = 1.25; x.stroke();
          mids.push([(a0 + a1) / 2, da]);
          a0 = a1;
        });
        if (g < 0.9) return;
        ENC_VALS.forEach(([k, v], i) => {
          const [am, da] = mids[i], deg = Math.round((v / total) * 360);
          const inside = da > 0.75 && r > 70;
          const lr = inside ? r * 0.62 : r + 20;
          const px = cx + Math.cos(am) * lr, py = cy + Math.sin(am) * lr;
          const al = inside ? "center" : Math.cos(am) > 0.2 ? "left" : Math.cos(am) < -0.2 ? "right" : "center";
          const hot = i < 2;
          M.text(x, `${k} ${v}`, px, py - 1, { size: 12, mono: true, align: al, color: hot ? c.ink : c.muted, weight: 700 });
          M.text(x, `${deg}°`, px, py + 14, { size: 11, mono: true, align: al, color: hot ? c.ink : c.muted });
        });
        M.tag(x, "A와 B, 몇 배 차이일까?", cx, b.y + b.h - 12, { align: "center" });
      }
      function drawArea(x, b, c, g) {
        const n = ENC_VALS.length, slot = b.w / n, half = b.h / 2;
        const R = Math.max(10, Math.min(slot * 0.44, (half - 44) / 2));
        [["반지름 = √값", "면적이 값에 비례 · A ÷ E = 4.25배", c.a, (v) => Math.sqrt(v / 34)], ["반지름 = 값", "면적이 제곱으로 과장 · A ÷ E = 18배", c.b, (v) => v / 34]].forEach(([lbl, sub, col, f], row) => {
          const y0 = b.y + row * half;
          M.text(x, lbl, b.x, y0 + 12, { size: 12, color: col, weight: 700 });
          x.font = M.font(12, "ui", 700);
          M.text(x, sub, b.x + x.measureText(lbl).width + 10, y0 + 12, { size: 11, mono: true });
          const base = y0 + 22 + 2 * R;
          M.line(x, b.x, base, b.x + b.w, base, hair(c), 1);
          ENC_VALS.forEach(([k, v], i) => {
            const cx = b.x + slot * (i + 0.5), r = Math.max(0.5, R * f(v) * g), hot = i === 0 || i === 4;
            x.beginPath(); x.arc(cx, base - r, r, 0, Math.PI * 2);
            x.fillStyle = M.alpha(col, hot ? 0.24 : 0.12); x.fill();
            x.strokeStyle = M.alpha(c.ink, hot ? 0.85 : 0.4); x.lineWidth = 1.25; x.stroke();
            M.text(x, `${k} ${v}`, cx, base + 16, { size: 11, mono: true, align: "center", color: hot ? c.ink : c.muted, weight: 600 });
          });
        });
      }
      function drawColor(x, b, c, g) {
        const rows = [
          ["범주형", "구분만 · 순서 없음", [c.a, c.b, c.c, c.key, c.muted], ["A", "B", "C", "D", "E"]],
          ["순차형", "밝기 하나 · 작다 → 크다", ENC_VALS.map(([, v]) => M.alpha(c.a, 0.1 + 0.85 * (v / 34))), ENC_VALS.map(([, v]) => String(v))],
          ["발산형", "기준 0에서 양쪽으로", [M.alpha(c.b, 0.85), M.alpha(c.b, 0.35), M.alpha(c.ink, 0.06), M.alpha(c.a, 0.35), M.alpha(c.a, 0.85)], ["−2", "−1", "0", "+1", "+2"]],
        ];
        const rh = b.h / 3, sw = Math.min(64, b.w / 5 - 8), sh = Math.min(40, rh - 46);
        rows.forEach(([ko, sub, cols, labels], r) => {
          const y0 = b.y + r * rh + 4;
          M.text(x, ko, b.x, y0 + 12, { size: 12.5, color: c.ink, weight: 700 });
          x.font = M.font(12.5, "ui", 700);
          M.text(x, sub, b.x + x.measureText(ko).width + 10, y0 + 12, { size: 11 });
          const ty = y0 + 22;
          cols.forEach((col, i) => {
            const show = M.clamp(g * 5 - i * 0.6, 0, 1);
            if (show <= 0) return;
            x.globalAlpha = show;
            const sx = b.x + i * (sw + 8);
            M.rrect(x, sx, ty, sw, sh, 6); x.fillStyle = c.surface; x.fill(); x.fillStyle = col; x.fill();
            x.strokeStyle = M.alpha(c.ink, 0.8); x.lineWidth = 1.25; x.stroke();
            M.text(x, labels[i], sx + sw / 2, ty + sh + 14, { size: 11, mono: true, align: "center", color: c.ink, weight: 600 });
            x.globalAlpha = 1;
          });
          if (r === 1 && g > 0.9) { const ax = b.x + 5 * (sw + 8) + 4; if (ax + 30 < b.x + b.w) M.text(x, "← 진할수록 큼", ax, ty + sh / 2 + 4, { size: 11, color: c.a, weight: 600 }); }
          if (r === 2 && g > 0.9) { const ax = b.x + 5 * (sw + 8) + 4; if (ax + 30 < b.x + b.w) M.text(x, "← 가운데가 기준", ax, ty + sh / 2 + 4, { size: 11, color: c.ink, weight: 600 }); }
        });
      }
      function drawLadder(x, b, c) {
        const cur = ENC_RANK[enc];
        M.text(x, "정확도 순위", b.x, b.y + 13, { size: 13, color: c.ink, weight: 700 });
        M.text(x, "Cleveland & McGill · 위일수록 정확", b.x, b.y + 30, { size: 11 });
        const top = b.y + 42, rh = Math.min(46, (b.h - 44) / ENC_LADDER.length), two = rh >= 34;
        ENC_LADDER.forEach(([ko, en], i) => {
          const y = top + i * rh, on = i === cur;
          if (on) {
            M.rrect(x, b.x + 1.5, y + 4, b.w - 2, rh - 5, 8); x.fillStyle = c.ink; x.fill();
            M.rrect(x, b.x, y + 2, b.w - 2, rh - 5, 8); x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(c.key, 0.32); x.fill();
            x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
          } else if (i > 0 && i !== cur + 1) M.line(x, b.x + 6, y + 0.5, b.x + b.w - 6, y + 0.5, hair(c), 1);
          const cyy = y + rh / 2 + 0.5;
          M.dot(x, b.x + 17, cyy, 9.5, on ? c.ink : null, on ? null : M.alpha(c.ink, 0.25));
          M.text(x, String(i + 1), b.x + 17, cyy + 4, { size: 11, mono: true, align: "center", color: on ? c.surface : c.muted, weight: 700 });
          M.text(x, ko, b.x + 34, two ? cyy - 2 : cyy + 4, { size: 12, color: on ? c.ink : c.muted, weight: on ? 700 : 500 });
          if (two) M.text(x, en, b.x + 34, cyy + 13, { size: 11, mono: true, color: on ? c.ink : M.alpha(c.muted, 0.8) });
          if (on && b.w > 200) M.text(x, "지금", b.x + b.w - 12, cyy + 4, { size: 11, align: "right", color: c.ink, weight: 700 });
        });
      }
      function drawStrip(x, b, c) {
        const cur = ENC_RANK[enc], n = ENC_LADDER.length, cw = (b.w - (n - 1) * 4) / n;
        M.text(x, "정확도 순위", b.x, b.y + 12, { size: 12, color: c.ink, weight: 700 });
        M.text(x, "← 정확    덜 정확 →", b.x + b.w, b.y + 12, { size: 11, align: "right" });
        ENC_LADDER.forEach((_, i) => {
          const px = b.x + i * (cw + 4), on = i === cur;
          M.rrect(x, px, b.y + 22, cw, 22, 6); x.fillStyle = on ? M.alpha(c.key, 0.4) : M.alpha(c.ink, 0.05); x.fill();
          if (on) { x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke(); }
          M.text(x, String(i + 1), px + cw / 2, b.y + 37, { size: 11, mono: true, align: "center", color: on ? c.ink : c.muted, weight: 700 });
        });
        M.text(x, `${cur + 1}위 · ${ENC_LADDER[cur][0]} (${ENC_LADDER[cur][1]})`, b.x, b.y + 62, { size: 11.5, color: c.ink, weight: 600 });
      }
      return {
        setStep(s) { step = s; enc = [0, 1, 2, 3, 1, 4][s]; chips.set(enc); show(); },
        frame(time) {
          const { x, w, h } = M.fit(cv), c = M.col();
          const g = ease(time / 700);
          const wide = w >= 560 && w / h > 1.05;
          const split = wide ? Math.round(w * (w > 900 ? 0.7 : 0.66)) : 0;
          let mb = wide ? { x: 12, y: 8, w: split - 36, h: h - 16 } : { x: 8, y: 6, w: w - 16, h: h - 96 };
          const lb = wide ? { x: split + 4, y: 8, w: w - split - 16, h: h - 16 } : { x: 8, y: h - 74, w: w - 16, h: 70 };
          mb = head(x, mb, c, enc);
          let lo = 0;
          if (step === 4 && enc <= 1) {
            lo = 7 * ppv(time, 1300, 900);
            const ratio = (34 - lo) / (8 - lo);
            M.tag(x, `화면 속 A ÷ E = ${ratio.toFixed(1)}배  (실제 4.25배)`, mb.x, mb.y + 8, { mono: true, color: lo > 0.5 ? c.b : c.ink });
            mb = { ...mb, y: mb.y + 26, h: mb.h - 26 };
          }
          if (enc === 0) drawRows(x, mb, c, g, lo, false, time);
          else if (enc === 1) drawRows(x, mb, c, g, lo, true, time);
          else if (enc === 2) drawPie(x, mb, c, g);
          else if (enc === 3) drawArea(x, mb, c, g);
          else drawColor(x, mb, c, g);
          if (wide) { M.line(x, split - 12, 10, split - 12, h - 10, M.alpha(c.ink, 0.12), 1); drawLadder(x, lb, c); }
          else { M.line(x, 8, h - 84, w - 8, h - 84, M.alpha(c.ink, 0.12), 1); drawStrip(x, lb, c); }
        },
      };
    },
  });

  /* ===== 8-2 스케일 ===== */
  const SC_TYPES = ["linear", "log", "sqrt", "band", "time"];
  const SC_CODE = {
    linear: "const x = d3.scaleLinear()\n    .domain(d3.extent(data, d => d.value)) // [3.7, 96.2]\n    .range([margin.left, width - margin.right])\n    .nice();                                // → [0, 100]\n\nx(37);          // 데이터 → 픽셀\nx.invert(274);  // 픽셀 → 데이터 (마우스 위치 읽기)\nx.ticks(5);     // [0, 20, 40, 60, 80, 100]\nsvg.append(\"g\").call(d3.axisBottom(x).ticks(5));",
    log: "const x = d3.scaleLog()\n    .domain([1, 10000])   // 0 은 넣을 수 없다 (log 0 = −∞)\n    .range([0, width]);\n\nx(10) - x(1);     // 같은 비율(×10)은\nx(1000) - x(100); // 같은 거리\nx.ticks();        // 1, 2, 3 … 10, 20, 30 …",
    sqrt: "// 원의 면적이 값에 비례해야 한다 → 반지름은 √값\nconst r = d3.scaleSqrt()\n    .domain([0, d3.max(data, d => d.value)])\n    .range([0, 54]);\n\ncircle.attr(\"r\", d => r(d.value));\n\n// scaleLinear 로 반지름을 정하면\n// 값이 2배일 때 면적은 4배가 된다",
    band: "const x = d3.scaleBand()\n    .domain(data.map(d => d.key))  // [\"A\",\"B\",\"C\",\"D\",\"E\"]\n    .range([0, width])\n    .paddingInner(0.2)\n    .paddingOuter(0.1);\n\nrect.attr(\"x\", d => x(d.key))\n    .attr(\"width\", x.bandwidth());\nx.step();   // 띠 하나 + 간격 하나\n// band 에는 invert 가 없다",
    time: "const x = d3.scaleTime()\n    .domain([start, end])   // Date 객체 두 개\n    .range([0, width]);\n\nx(date);         // 날짜 → 픽셀\nx.invert(px);    // 픽셀 → Date\nx.ticks();       // 기간이 길면 월, 짧으면 주·일 단위\nx.tickFormat();  // 단위에 맞는 날짜 형식",
  };
  const SC_HL = [{ linear: [[0, 3], [5, 5]] }, { linear: [[1, 1], [3, 3], [7, 8]] }, { linear: [[6, 6]] }, { log: [[0, 6]] }, { sqrt: [[1, 5]] }, { band: [[0, 8]], time: [[0, 7]] }];
  const SC_MON = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const SC_MSTART = SC_MON.reduce((a, d, i) => (a.push(a[i] + d), a), [0]);
  const scDate = (day) => { let m = 0; while (m < 11 && day >= SC_MSTART[m + 1]) m++; return [m + 1, Math.floor(day - SC_MSTART[m]) + 1]; };

  LESSONS.push({
    id: "d3-scales", ch: 6, order: 2,
    title: "스케일: 데이터에서 픽셀로",
    lede: "차트의 모든 좌표는 '데이터 값 → 화면 픽셀' 변환 하나에서 나옵니다. d3는 이 변환을 스케일이라 부릅니다. 위는 데이터의 수직선, 아래는 픽셀 축이고, 선이 둘을 잇는 매핑입니다.",
    key: "스케일은 domain(데이터 범위)과 range(픽셀 범위)를 잇는 함수입니다. 데이터의 성질에 맞춰 고르고, 원의 크기는 sqrt, 범주는 band로 정합니다.",
    steps: [
      ["domain → range", "<code>scaleLinear</code>는 데이터 범위(<b>domain</b>)를 픽셀 범위(<b>range</b>)로 비례해서 옮깁니다. 위 0~100이 아래 여백을 뺀 폭으로 늘고 줄어듭니다. 호박색 선은 값 하나가 픽셀 하나로 가는 길이고, 아래 라벨 <code>x(값) = 픽셀</code>이 그 계산 결과입니다."],
      ["nice()와 ticks", "데이터 범위를 그대로 쓰면 축이 3.7에서 시작해 96.2에서 끝납니다. <code>nice()</code>는 domain을 0과 100처럼 <b>깔끔한 값으로 넓힙니다</b>. <code>ticks(5)</code>는 1·2·5 × 10ⁿ 간격 중 다섯 개 안팎이 되는 눈금을 골라 줍니다."],
      ["invert: 거꾸로", "<code>x.invert(px)</code>는 픽셀을 데이터 값으로 되돌립니다. 마우스 위치로 툴팁 값을 읽거나 브러시로 범위를 고를 때 씁니다. 빨간 화살표가 아래 픽셀에서 위 데이터로 거슬러 올라갑니다. 무대 위에 마우스를 올리면 그 위치의 값을 직접 읽습니다."],
      ["scaleLog", "값이 1부터 10000까지 퍼져 있으면 선형 축에서는 작은 값들이 왼쪽에 뭉칩니다(위 수직선). <code>scaleLog</code>는 <b>같은 비율을 같은 거리</b>로 옮깁니다. 1→10과 1000→10000이 같은 폭입니다. 0과 음수는 넣을 수 없습니다."],
      ["scaleSqrt: 면적", "원의 크기로 값을 보여 줄 때 반지름을 값에 비례시키면 면적은 제곱으로 커집니다(점선). <code>scaleSqrt</code>로 반지름을 √값에 맞추면 <b>면적이 값에 비례</b>합니다. 아래 선이 위쪽 값보다 왼쪽으로 몰리는 모양이 √ 곡선입니다."],
      ["scaleBand와 scaleTime", "<code>scaleBand</code>는 범주를 같은 폭의 <b>띠</b>로 나눕니다. <code>bandwidth()</code>가 막대 폭, <code>step()</code>이 띠와 간격을 합친 폭입니다. 날짜는 <code>scaleTime</code>을 씁니다. 칩에서 time을 고르면 기간에 따라 눈금 단위가 월 → 주 → 일로 바뀝니다."],
    ],
    terms: [
      ["스케일", "Scale", "데이터 값을 시각 값(픽셀, 반지름, 색)으로 바꾸는 함수."],
      ["정의역 · 치역", "Domain · Range", "스케일의 입력 범위와 출력 범위. d3에서는 각각 데이터 범위와 픽셀 범위."],
      ["역변환", "Invert", "출력(픽셀)에서 입력(데이터)을 거꾸로 구하는 계산. 연속 스케일에만 있습니다."],
      ["밴드 스케일", "Band scale", "범주를 같은 폭의 띠로 나누는 스케일. 막대 차트의 x축."],
      ["눈금", "Ticks", "축에 표시하는 기준값. 사람이 읽기 쉬운 1·2·5 간격으로 고릅니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      if (api.stage.clientWidth < 560) cv.style.minHeight = "460px";
      let type = "linear", step = 0, ptr = null, ptrT = -1e9;
      const chips = M.chips(api.controls, { title: "스케일 종류", items: SC_TYPES, value: 0, onPick: (i) => { type = SC_TYPES[i]; api.restart(); showCode(); } });
      const ro = M.readout(api.controls);
      function showCode() { const hl = SC_HL[step][type]; api.code(SC_CODE[type], hl || [], "d3.js"); }
      const onMove = (e) => { const r = cv.getBoundingClientRect(); ptr = e.clientX - r.left; ptrT = performance.now(); };
      const onLeave = () => { ptr = null; };
      cv.addEventListener("pointermove", onMove); cv.addEventListener("pointerleave", onLeave);
      cv.style.cursor = "crosshair";

      function axisTop(x, c, a, b, y) { M.line(x, a, y, b, y, c.ink, 2); }
      function frame(time) {
        const { x, w, h } = M.fit(cv), c = M.col();
        const x0 = 26, x1 = w - 26, W = x1 - x0;
        const tall = type === "sqrt" || type === "band";
        const T = tall ? M.clamp(h * 0.16, 66, 100) : M.clamp(h * 0.2, 66, 130), B = tall ? Math.max(T + 110, h - 250) : Math.max(T + 150, h - Math.max(130, h * 0.3));
        const usePtr = ptr != null && performance.now() - ptrT < 2500 && ptr >= x0 - 4 && ptr <= x1 + 4;
        M.tag(x, "domain · 데이터 값", x0, 18, { fill: M.alpha(c.a, 0.14) });
        let rangeLbl = "range · 화면 픽셀";
        let mapLines = [], marker = null, inv = null, topLbls = [], botLbls = [], extra = null;
        // 위쪽 데이터 수직선(희미하게)
        M.line(x, x0, T, x1, T, M.alpha(c.ink, 0.12), 1);
        M.line(x, x0, B, x1, B, M.alpha(c.ink, 0.12), 1);

        if (type === "linear") {
          let d0 = 0, d1 = 100;
          if (step === 1) { const k = ppv(time, 1200, 1000); d0 = M.lerp(3.7, 0, k); d1 = M.lerp(96.2, 100, k); }
          const r0 = x0 + W * 0.14, r1 = x1 - W * 0.04;
          const top = (v) => x0 + (v / 100) * W;
          const S = (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
          axisTop(x, c, top(d0), top(d1), T); M.line(x, r0, B, r1, B, c.ink, 2);
          const tk = ticks(0, 100, 5);
          tk.forEach((v) => { if (v < d0 - 1e-6 || v > d1 + 1e-6) return; mapLines.push([top(v), S(v), c.line]); topLbls.push([top(v), String(v)]); botLbls.push([S(v), Math.round(S(v))]); });
          if (step === 1) {
            if (d0 > 0.05) { topLbls.push([top(d0), fmt(d0), c.b]); botLbls.push([S(d0), Math.round(S(d0)), c.b]); }
            if (d1 < 99.95) topLbls.push([top(d1), fmt(d1), c.b]);
            [3.7, 18, 41, 57, 96.2].forEach((v) => { mapLines.push([top(v), S(v), M.alpha(c.a, 0.7)]); extra = extra || []; extra.push(["dot", top(v), T, c.a]); });
            M.text(x, d0 < 0.05 ? "nice() → [0, 100]" : `domain [${fmt(d0)}, ${fmt(d1)}]`, x1, 20, { size: 11, mono: true, align: "right", color: d0 < 0.05 ? c.c : c.b, weight: 700 });
          } else if (step !== 1) M.text(x, "domain [0, 100] → range [" + Math.round(r0) + ", " + Math.round(r1) + "]", x1, 20, { size: 11, mono: true, align: "right" });
          const v = M.lerp(d0, d1, ppv(time, 2200, 500) * 0.92 + 0.04);
          if (step !== 1) marker = { tx: top(v), bx: S(v), label: `x(${fmt(v)}) = ${Math.round(S(v))}px` };
          if (step === 2 || usePtr) {
            const px = usePtr ? M.clamp(ptr, r0, r1) : M.lerp(r0, r1, ppv(time + 700, 2600, 400));
            const dv = d0 + ((px - r0) / (r1 - r0)) * (d1 - d0);
            inv = { bx: px, tx: top(dv), label: `x.invert(${Math.round(px)}) = ${fmt(dv)}` };
            if (step === 2) marker = null;
          }
        } else if (type === "log") {
          const r0 = x0 + W * 0.03, r1 = x1 - W * 0.03;
          const top = (v) => x0 + (v / 10000) * W;
          const S = (v) => r0 + (Math.log10(v) / 4) * (r1 - r0);
          axisTop(x, c, top(1), top(10000), T); M.line(x, r0, B, r1, B, c.ink, 2);
          for (let p = 0; p < 4; p++) for (let m = 2; m <= 9; m++) M.line(x, S(m * 10 ** p), B, S(m * 10 ** p), B + 4, c.muted, 1);
          [1, 10, 100, 1000, 10000].forEach((v) => { mapLines.push([top(v), S(v), c.line]); botLbls.push([S(v), v >= 1000 ? `${v / 1000}k` : String(v)]); });
          topLbls.push([top(1000), "1000"], [top(10000), "10000"], [top(5000), "5000"]);
          extra = [["brace", top(1), top(100), "1 · 10 · 100 이 여기 뭉침"]];
          const lv = M.lerp(0.1, 3.9, ppv(time, 2400, 500)), v = 10 ** lv;
          marker = { tx: top(v), bx: S(v), label: `x(${v >= 100 ? Math.round(v) : v.toFixed(1)}) = ${Math.round(S(v))}px` };
          if (usePtr) { const px = M.clamp(ptr, r0, r1), dv = 10 ** (((px - r0) / (r1 - r0)) * 4); inv = { bx: px, tx: top(dv), label: `x.invert(${Math.round(px)}) = ${dv >= 100 ? Math.round(dv) : dv.toFixed(1)}` }; }
        } else if (type === "sqrt") {
          const RM = 54, r0 = x0 + W * 0.06, r1 = x1 - W * 0.06;
          const top = (v) => x0 + (v / 100) * W;
          const rad = (v) => RM * Math.sqrt(v / 100);
          const S = (v) => r0 + (rad(v) / RM) * (r1 - r0);
          rangeLbl = "range · 반지름 0~54px (확대 표시)";
          axisTop(x, c, top(0), top(100), T); M.line(x, r0, B, r1, B, c.ink, 2);
          [0, 10, 25, 50, 75, 100].forEach((v) => { mapLines.push([top(v), S(v), c.line]); topLbls.push([top(v), String(v)]); botLbls.push([S(v), rad(v).toFixed(0)]); });
          const v = M.lerp(2, 100, ppv(time, 2400, 500));
          marker = { tx: top(v), bx: S(v), label: `r(${Math.round(v)}) = ${rad(v).toFixed(1)}px` };
          extra = [["circles", rad]];
        } else if (type === "band") {
          const K = ["A", "B", "C", "D", "E"], n = K.length, pi = 0.2, po = 0.1;
          const st = W / (n - pi + 2 * po), bw = st * (1 - pi), bx = (i) => x0 + po * st + i * st;
          const top = (i) => x0 + ((i + 0.5) / n) * W;
          M.line(x, x0, B, x1, B, c.ink, 2);
          const hot = Math.floor(time / 900) % n;
          K.forEach((k, i) => {
            M.line(x, top(i), T + 12, bx(i), B, i === hot ? c.key : c.line, i === hot ? 2 : 1);
            M.line(x, top(i), T + 12, bx(i) + bw / 2, B, M.alpha(c.ink, 0.15), 1, [3, 3]);
            M.rrect(x, top(i) - 14, T - 12, 28, 24, 6); x.fillStyle = c.surface; x.fill(); x.fillStyle = i === hot ? M.alpha(c.key, 0.5) : c.surface; x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
            M.text(x, k, top(i), T + 4, { size: 12, mono: true, align: "center", color: c.ink, weight: 700 });
            M.rrect(x, bx(i), B + 6, bw, 90, 4); x.fillStyle = c.surface; x.fill(); x.fillStyle = i === hot ? M.alpha(c.key, 0.4) : M.alpha(c.a, 0.16); x.fill(); x.strokeStyle = M.alpha(c.ink, i === hot ? 0.9 : 0.5); x.lineWidth = 1.25; x.stroke();
            M.text(x, W < 400 ? k : `x("${k}")`, bx(i) + bw / 2, B + 55, { size: 11, mono: true, align: "center", color: c.ink, weight: 700 });
          });
          const yb = B + 114;
          M.line(x, bx(1), yb, bx(1) + bw, yb, c.ink, 1.5); M.line(x, bx(1), yb - 4, bx(1), yb + 4, c.ink, 1.5); M.line(x, bx(1) + bw, yb - 4, bx(1) + bw, yb + 4, c.ink, 1.5);
          M.text(x, `bandwidth() = ${Math.round(bw)}`, bx(1) + bw / 2, yb + 16, { size: 11, mono: true, align: "center", color: c.ink });
          const ys = B + 148;
          M.line(x, bx(2), ys, bx(3), ys, c.b, 1.5); M.line(x, bx(2), ys - 4, bx(2), ys + 4, c.b, 1.5); M.line(x, bx(3), ys - 4, bx(3), ys + 4, c.b, 1.5);
          M.text(x, `step() = ${Math.round(st)}`, (bx(2) + bx(3)) / 2, ys + 16, { size: 11, mono: true, align: "center", color: c.b });
          M.text(x, "paddingInner 0.2 · paddingOuter 0.1", x0, W < 420 ? h - 30 : h - 10, { size: 11, mono: true });
          M.text(x, `x("${K[hot]}") = ${Math.round(bx(hot))}px`, x1, h - 10, { size: 11, mono: true, align: "right", color: c.ink, weight: 700 });
          rangeLbl = "range · 픽셀 [" + Math.round(x0) + ", " + Math.round(x1) + "]";
        } else if (type === "time") {
          const k = ppv(time, 2600, 1100);
          const span = Math.exp(M.lerp(Math.log(365), Math.log(12), k)), d0 = 0, d1 = span;
          const r0 = x0 + W * 0.08, r1 = x1 - W * 0.08;
          const top = (d) => x0 + ((d - d0) / span) * W;
          const S = (d) => r0 + ((d - d0) / span) * (r1 - r0);
          axisTop(x, c, x0, x1, T); M.line(x, r0, B, r1, B, c.ink, 2);
          let tk = [], unit;
          if (span > 100) { unit = "월"; tk = SC_MSTART.filter((d) => d <= span); }
          else if (span > 30) { unit = "주"; for (let d = 0; d <= span; d += 7) tk.push(d); }
          else { unit = "일"; const s = span > 16 ? 2 : 1; for (let d = 0; d <= span; d += s) tk.push(d); }
          const every = Math.ceil(tk.length / Math.max(4, Math.floor(W / 56)));
          tk.forEach((d, i) => {
            const [m, dd] = scDate(d);
            mapLines.push([top(d), S(d), c.line]);
            if (i % every === 0) botLbls.push([S(d), unit === "월" ? `${m}월` : `${m}/${dd}`]);
          });
          topLbls.push([x0 + 18, "start"], [x1 - 14, "end"]);
          M.text(x, `기간 ${Math.round(span)}일 → 눈금 단위: ${unit}`, x1, 20, { size: 11, mono: true, align: "right", color: c.ink, weight: 700 });
          const dv = M.lerp(0, span, ppv(time, 1700, 300) * 0.9 + 0.05), [m, dd] = scDate(dv);
          marker = { tx: top(dv), bx: S(dv), label: `x(${m}월 ${dd}일) = ${Math.round(S(dv))}px` };
        }
        // 매핑 선
        mapLines.forEach(([a, b, col]) => {
          M.line(x, a, T, b, B, col === c.line ? M.alpha(c.ink, 0.2) : col, 1.2);
          M.line(x, a, T - 4, a, T + 4, c.ink, 1.5); M.line(x, b, B - 4, b, B + 4, c.ink, 1.5);
        });
        topLbls.forEach(([px, s, col]) => M.text(x, s, px, T - 10, { size: 11, mono: true, align: "center", color: col || c.muted, weight: col ? 700 : 500 }));
        const showBot = type !== "band";
        if (showBot) botLbls.forEach(([px, s, col]) => M.text(x, String(s), px, B + 18, { size: 11, mono: true, align: "center", color: col || c.muted, weight: col ? 700 : 500 }));
        M.tag(x, rangeLbl, x0, type === "band" ? B - 16 : B + 42, { fill: M.alpha(c.key, 0.2) });
        if (extra) extra.forEach((e) => {
          if (e[0] === "dot") M.dot(x, e[1], e[2], 4.5, e[3], c.surface);
          if (e[0] === "brace") {
            const y = T - 31; M.line(x, e[1], y, Math.max(e[2], e[1] + 6), y, c.b, 2);
            M.text(x, "↓ " + e[3], e[1] + 12, y + 4, { size: 11, color: c.b, weight: 700 });
          }
          if (e[0] === "circles") {
            const rad = e[1], cy = (B + 86 + h - 26) / 2 - 27, vals = [25, 50, 100];
            const slot = W / 3;
            vals.forEach((v, i) => {
              const cx = x0 + slot * (i + 0.5), r = rad(v), rl = 54 * (v / 100) * 1;
              M.dot(x, cx, cy + 27, r, M.alpha(c.a, 0.22)); x.lineWidth = 1.25; x.strokeStyle = M.alpha(c.ink, 0.85); x.stroke();
              x.save(); x.setLineDash([4, 4]); M.dot(x, cx, cy + 27, rl * 1, null, c.b); x.restore();
              M.text(x, `값 ${v}`, cx, h - 8, { size: 11, mono: true, align: "center", color: c.ink });
            });
            M.text(x, "● √ 반지름 → 면적 1 : 2 : 4", x0, B + 74, { size: 11, color: c.a, weight: 700 });
            M.text(x, "◌ 선형 반지름 → 면적 1 : 4 : 16", x1, B + 74, { size: 11, color: c.b, weight: 700, align: "right" });
          }
        });
        if (marker) {
          M.line(x, marker.tx, T, marker.bx, B, c.key, 2.5);
          M.dot(x, marker.tx, T, 5.5, c.key, c.ink); M.dot(x, marker.bx, B, 5.5, c.key, c.ink);
        }
        if (inv) {
          M.arrow(x, inv.bx, B - 2, inv.tx, T + 6, c.b, 2.2);
          M.dot(x, inv.bx, B, 5.5, c.b, c.ink);
        }
        const lines = [marker && marker.label, inv && inv.label].filter(Boolean);
        if (type !== "band" && type !== "sqrt") {
          const ly0 = Math.min(h - 18, B + 80);
          if (marker) M.callout(x, marker.label, marker.bx, B + 6, M.clamp(marker.bx, x0 + 90, x1 - 90), ly0, { mono: true, align: "center", fill: M.alpha(c.key, 0.28) });
          if (inv) M.callout(x, inv.label, inv.bx, B + 6, M.clamp(inv.bx, x0 + 100, x1 - 100), Math.min(h - 18, ly0 + (marker ? 34 : 0)), { mono: true, align: "center", line: c.b, color: c.b });
        }
        if (type === "sqrt" && marker) M.tag(x, marker.label, x1, 18, { mono: true, align: "right", fill: M.alpha(c.key, 0.28) });
        ro.innerHTML = lines.length ? lines.join("\n") : type === "band" ? "band 스케일은 범주 → 띠 시작 위치\n(invert 없음)" : "";
      }
      return {
        setStep(s) { step = s; type = ["linear", "linear", "linear", "log", "sqrt", "band"][s]; chips.set(SC_TYPES.indexOf(type)); showCode(); },
        frame,
        destroy() { cv.removeEventListener("pointermove", onMove); cv.removeEventListener("pointerleave", onLeave); },
      };
    },
  });

  /* ===== 8-3 데이터 조인과 전환 ===== */
  const DJ_D5 = [["A", 30], ["B", 80], ["C", 45], ["D", 60], ["E", 25]];
  const DJ_SCEN = [
    null,
    [DJ_D5.slice(0, 3), DJ_D5],
    [DJ_D5, [["A", 55], ["B", 35], ["C", 70], ["D", 20], ["E", 50]]],
    [DJ_D5, [DJ_D5[0], DJ_D5[2], DJ_D5[4]]],
    [DJ_D5, DJ_D5.slice(1)],
    null,
  ];
  const DJ_CODE = "const bars = svg.selectAll(\"rect\")\n  .data(data, d => d.key);   // 키 함수: 누가 누구인지\n\nbars.join(\n  enter => enter.append(\"rect\")\n      .attr(\"fill\", \"var(--enter)\")\n      .attr(\"x\", d => x(d.key)).attr(\"height\", 0)\n    .call(e => e.transition(t)\n      .attr(\"height\", d => h(d.value))),\n  update => update\n      .attr(\"fill\", \"var(--update)\")\n    .call(u => u.transition(t)\n      .attr(\"x\", d => x(d.key))\n      .attr(\"height\", d => h(d.value))),\n  exit => exit\n      .attr(\"fill\", \"var(--exit)\")\n    .call(e => e.transition(t)\n      .attr(\"height\", 0)\n      .remove())\n);";
  const DJ_HL = [[[0, 1]], [[3, 8]], [[9, 13]], [[14, 18]], [[1, 1]], "all"];

  LESSONS.push({
    id: "data-join", ch: 6, order: 3,
    title: "데이터 조인과 전환",
    lede: "데이터가 바뀌면 화면의 막대도 따라 바뀌어야 합니다. d3는 새 데이터와 기존 요소를 짝지어 들어올 것(enter), 남을 것(update), 나갈 것(exit)으로 나눕니다. 이 짝짓기가 전환 애니메이션의 의미를 정합니다.",
    key: "selection.data()에는 항상 키 함수를 넘겨 같은 데이터가 같은 요소로 남게 하고, 전환은 들어옴·바뀜·나감을 따로 연출합니다.",
    steps: [
      ["데이터와 요소", "위 칸은 데이터 배열, 아래 막대는 화면 요소입니다. <code>selection.data(data, d =&gt; d.key)</code>는 둘을 <b>짝지어</b> 각 요소에 데이터를 묶습니다(binding). 점선이 그 연결이고, 이렇게 묶인 데이터가 이후 모든 속성(높이, 위치)의 근거가 됩니다."],
      ["enter: 새로 들어옴", "데이터가 3개에서 5개로 늘었습니다. 짝이 없는 새 데이터 D, E는 <b>enter</b> 선택에 들어가고, 여기에 요소를 새로 만듭니다(청록). 막대 위 <code>enter</code> 라벨을 보세요. 높이 0에서 자라도록 전환을 걸면 새로 생겼다는 사실이 눈에 보입니다."],
      ["update: 값이 바뀜", "같은 키의 데이터가 새 값을 갖고 왔습니다. 짝이 있는 요소는 <b>update</b>입니다(파랑). 요소를 새로 만들지 않고 높이만 전환합니다. 점선은 바뀌기 전 높이입니다. 막대가 같은 자리에서 늘고 줄어 무엇이 얼마나 변했는지 따라갈 수 있습니다."],
      ["exit: 빠져나감", "B와 D가 데이터에서 빠졌습니다. 짝을 잃은 요소는 <b>exit</b> 선택입니다(코랄). 높이를 0으로 줄인 뒤 <code>remove()</code>합니다. 남은 막대는 update로 빈자리를 채웁니다."],
      ["키 함수가 없으면", "왼쪽은 키 없이 <b>순서(인덱스)로</b> 짝지었고, 오른쪽은 키로 짝지었습니다. A를 지우면 왼쪽은 첫 막대가 B의 값을 받고, 모든 막대가 한 칸씩 다른 데이터로 바뀌며, 마지막 막대가 사라집니다. 오른쪽은 A만 빠지고 나머지가 제자리를 찾아 옮깁니다."],
      ["객체 불변성", "같은 데이터는 전환 내내 <b>같은 요소</b>로 남아야 눈이 따라갈 수 있습니다. 이것을 객체 불변성(object constancy)이라 합니다. 버튼으로 추가·삭제·정렬해 보고, 키 함수를 끄고 다시 해 보세요."],
    ],
    terms: [
      ["데이터 조인", "Data join", "데이터 배열과 화면 요소를 짝지어 enter·update·exit로 나누는 d3의 핵심 동작."],
      ["키 함수", "Key function", "데이터마다 고유한 이름을 돌려주는 함수. 없으면 순서(인덱스)로 짝짓습니다."],
      ["enter · update · exit", "", "새로 생길 요소, 계속 남는 요소, 사라질 요소. <code>selection.join()</code>이 셋을 한 번에 처리합니다."],
      ["전환", "Transition", "속성을 시간에 걸쳐 바꾸는 d3의 애니메이션. <code>selection.transition().duration(ms)</code>."],
      ["객체 불변성", "Object constancy", "같은 데이터가 같은 시각 요소로 이어지게 해 변화를 눈으로 추적할 수 있게 하는 원칙."],
    ],
    mount(api) {
      const narrow = () => api.stage.clientWidth < 560;
      const cv = api.canvas("fill");
      let step = 0, dur = 750, manual = false, lastK = -1, joined = false, uid = 0, sortDesc = true;
      let charts = [];
      const POOL = "ABCDEFGHIJKL";
      const make = (useKey) => ({ useKey, data: [], live: [], exiting: [], counts: { enter: 0, update: 0, exit: 0 } });
      const cur = (e, t) => {
        const k = ease((t - e.t0) / dur);
        return { cx: M.lerp(e.from.cx, e.to.cx, k), bw: M.lerp(e.from.bw, e.to.bw, k), v: M.lerp(e.from.v, e.to.v, k), op: M.lerp(e.from.op, e.to.op, k) };
      };
      const slot = (i, n) => ({ cx: (i + 0.5) / n, bw: 0.7 / Math.max(n, 3) });
      function reset(ch, data) {
        ch.data = data.map((d) => d.slice());
        ch.exiting = [];
        ch.live = ch.data.map(([k, v], i) => { const s = slot(i, data.length), st = { ...s, v, op: 1 }; return { id: uid++, key: k, cls: "update", from: st, to: st, t0: -1e9 }; });
        ch.counts = { enter: 0, update: data.length, exit: 0 };
      }
      function join(ch, data, t) {
        const n = data.length, next = [], counts = { enter: 0, update: 0, exit: 0 };
        const go = (e, to, cls) => { e.from = cur(e, t); e.to = to; e.t0 = t; e.cls = cls; };
        if (ch.useKey) {
          const by = new Map(ch.live.map((e) => [e.key, e]));
          data.forEach(([k, v], i) => {
            const s = slot(i, n), e = by.get(k);
            if (e) { by.delete(k); go(e, { ...s, v, op: 1 }, "update"); counts.update++; next.push(e); }
            else { next.push({ id: uid++, key: k, cls: "enter", from: { ...s, v: 0, op: 0 }, to: { ...s, v, op: 1 }, t0: t }); counts.enter++; }
          });
          by.forEach((e) => { const c0 = cur(e, t); go(e, { ...c0, v: 0, op: 0 }, "exit"); ch.exiting.push(e); counts.exit++; });
        } else {
          data.forEach(([k, v], i) => {
            const s = slot(i, n), e = ch.live[i];
            if (e) { go(e, { ...s, v, op: 1 }, "update"); e.key = k; counts.update++; next.push(e); }
            else { next.push({ id: uid++, key: k, cls: "enter", from: { ...s, v: 0, op: 0 }, to: { ...s, v, op: 1 }, t0: t }); counts.enter++; }
          });
          ch.live.slice(n).forEach((e) => { const c0 = cur(e, t); go(e, { ...c0, v: 0, op: 0 }, "exit"); ch.exiting.push(e); counts.exit++; });
        }
        ch.live = next; ch.data = data.map((d) => d.slice()); ch.counts = counts;
      }
      const act = (fn) => {
        manual = true;
        const t = api.time;
        charts.forEach((ch) => { const d = fn(ch.data.map((x) => x.slice())); if (d) join(ch, d, t); });
        report();
      };
      const btnBox = M.el("div", { class: "chips" },
        M.el("button", { class: "chip", onclick: () => act((d) => { if (d.length >= 9) return null; const used = new Set(d.map((x) => x[0])); const k = [...POOL].find((p) => !used.has(p)); const i = Math.floor(Math.random() * (d.length + 1)); d.splice(i, 0, [k, 15 + Math.round(Math.random() * 80)]); return d; }) }, "추가"),
        M.el("button", { class: "chip", onclick: () => act((d) => { if (d.length <= 1) return null; d.splice(Math.floor(Math.random() * d.length), 1); return d; }) }, "삭제"),
        M.el("button", { class: "chip", onclick: () => { const desc = sortDesc; sortDesc = !sortDesc; act((d) => d.sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1]))); } }, "정렬"),
        M.el("button", { class: "chip", onclick: () => act((d) => d.map(([k]) => [k, 15 + Math.round(Math.random() * 80)])) }, "값 바꾸기"),
        M.el("button", { class: "chip", onclick: () => { manual = true; charts.forEach((ch) => reset(ch, DJ_D5)); report(); } }, "처음으로"));
      api.controls.append(M.el("div", { class: "ctl" }, M.el("span", { class: "lbl" }, "데이터 바꾸기"), btnBox));
      const keyChk = M.check(api.controls, { id: "djkey", label: "키 함수 d => d.key 사용", checked: true, onChange: (v) => { if (step !== 4) charts.forEach((ch) => (ch.useKey = v)); } });
      M.slider(api.controls, { id: "djdur", label: "전환 시간 duration", min: 200, max: 2000, step: 50, value: 750, unit: " ms", onInput: (v) => (dur = v) });
      api.controls.append(M.el("div", { class: "data-join-legend", html: '<span><i class="is-enter"></i>enter</span><span><i class="is-update"></i>update</span><span><i class="is-exit"></i>exit</span>' }));
      const ro = M.readout(api.controls);
      function report() {
        ro.innerHTML = charts.map((ch) => `${charts.length > 1 ? (ch.useKey ? "키 있음  " : "키 없음  ") : ""}<b>enter ${ch.counts.enter}</b> · update ${ch.counts.update} · exit ${ch.counts.exit}`).join("\n");
      }
      function setup() {
        manual = false; lastK = -1; joined = false;
        charts = step === 4 ? [make(false), make(true)] : [make(keyChk.get())];
        charts.forEach((ch) => reset(ch, DJ_D5));
        cv.style.minHeight = narrow() ? (step === 4 ? "560px" : "380px") : "";
        report();
      }
      function drawChart(x, b, ch, t, c, title) {
        const col = { enter: c.c, update: c.a, exit: c.b };
        if (title) { M.text(x, title[0], b.x, b.y + 12, { size: 11.5, color: c.ink, weight: 700 }); M.text(x, title[1], b.x + b.w, b.y + 12, { size: 11, mono: true, align: "right", color: title[2] }); b = { ...b, y: b.y + 20, h: b.h - 20 }; }
        // 데이터 행
        const n = ch.data.length, dh = 24, dy = b.y + 2;
        M.text(x, "data", b.x, dy + 16, { size: 11, mono: true, color: c.ink, weight: 600 });
        const gx = b.x + 40, gw = b.w - 40;
        const boxW = Math.min(48, (gw / Math.max(n, 1)) - 4);
        ch.data.forEach(([k, v], i) => {
          const cx = gx + gw * slot(i, n).cx;
          M.rrect(x, cx - boxW / 2 + 1.5, dy + 2, boxW, dh, 6); x.fillStyle = c.ink; x.fill();
          M.rrect(x, cx - boxW / 2, dy, boxW, dh, 6); x.fillStyle = c.surface; x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
          M.text(x, boxW > 42 ? `${k}·${v}` : k, cx, dy + 16, { size: 11, mono: true, align: "center", color: c.ink, weight: 700 });
        });
        const by = b.y + b.h - 18, bt = dy + dh + 34, H = by - bt;
        M.line(x, gx - 4, by, gx + gw, by, c.ink, 1.5);
        [25, 50, 75, 100].forEach((v) => { M.line(x, gx, by - (v / 100) * H, gx + gw, by - (v / 100) * H, M.alpha(c.ink, 0.07), 1); M.text(x, String(v), gx - 6, by - (v / 100) * H + 4, { size: 11, mono: true, align: "right" }); });
        // 바인딩 선
        ch.live.forEach((e, i) => {
          if (i >= n) return;
          const s = cur(e, t), dx = gx + gw * slot(i, n).cx, ex = gx + gw * s.cx, ey = by - (s.v / 100) * H;
          M.line(x, dx, dy + dh, ex, Math.max(ey - 16, dy + dh + 4), M.alpha(c.ink, 0.28), 1, [3, 3]);
        });
        if (step === 0 && ch.live[0] && n) {
          const s0 = cur(ch.live[0], t), ex = gx + gw * s0.cx;
          M.tag(x, "selection.data() 가 짝지음", ex + gw * s0.bw / 2 + 10, dy + dh + 22, { mono: true, size: 11, fill: M.alpha(c.key, 0.28) });
        }
        [...ch.exiting, ...ch.live].forEach((e) => {
          const s = cur(e, t);
          if (s.op <= 0.01 && e.cls === "exit") return;
          const bx = gx + gw * s.cx, bw = gw * s.bw, bh = (s.v / 100) * H;
          x.globalAlpha = M.clamp(s.op, 0, 1);
          M.rrect(x, bx - bw / 2, by - bh, bw, Math.max(0.5, bh), 3); x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(col[e.cls], e.cls === "update" ? 0.2 : 0.32); x.fill();
          x.strokeStyle = e.cls === "update" ? M.alpha(c.ink, 0.8) : col[e.cls]; x.lineWidth = e.cls === "update" ? 1.25 : 2; x.stroke();
          if (e.cls === "update" && t - e.t0 < dur + 1400 && Math.abs(e.from.v - e.to.v) > 1 && t >= e.t0) {
            const py = by - (e.from.v / 100) * H;
            M.line(x, bx - bw / 2 - 4, py, bx + bw / 2 + 4, py, c.muted, 1.5, [4, 3]);
            const rt = bx + bw / 2 + 62 > gx + gw; M.text(x, "이전 " + Math.round(e.from.v), rt ? bx - bw / 2 - 6 : bx + bw / 2 + 6, py + 4, { size: 11, mono: true, align: rt ? "right" : "left" });
          }
          const fresh = t - e.t0 < dur + 900 && e.cls !== "update";
          if (fresh && bh > 4 && bw > 30) M.tag(x, e.cls, bx, Math.max(by - bh - 26, dy + dh + 18), { align: "center", mono: true, size: 11, color: col[e.cls] });
          M.text(x, e.key, bx, by + 14, { size: 11, mono: true, align: "center", color: c.ink, weight: 700 });
          if (bh > 4) M.text(x, String(Math.round(s.v)), bx, bh > 24 ? by - bh + 16 : by - bh - 5, { size: 11, mono: true, align: "center", color: c.ink, weight: 600 });
          x.globalAlpha = 1;
        });
      }
      return {
        setStep(s) { step = s; setup(); api.code(DJ_CODE, DJ_HL[s], "d3.js"); },
        replay() { setup(); },
        frame(time) {
          const sc = DJ_SCEN[step];
          if (sc && !manual) {
            const P = dur + 2300, k = Math.floor(time / P), local = time % P;
            if (k !== lastK) { lastK = k; joined = false; charts.forEach((ch) => reset(ch, sc[0])); report(); }
            if (!joined && local >= 600) { joined = true; charts.forEach((ch) => join(ch, sc[1], k * P + 600)); report(); }
          }
          charts.forEach((ch) => { ch.exiting = ch.exiting.filter((e) => time - e.t0 < dur); });
          const { x, w, h } = M.fit(cv), c = M.col();
          if (charts.length === 2) {
            const tall = h > 450;
            const T = [["키 없음 · 인덱스로 짝짓기", ".data(data)", c.b], ["키 있음 · 이름으로 짝짓기", ".data(data, d => d.key)", c.c]];
            charts.forEach((ch, i) => {
              const b = tall ? { x: 12, y: 8 + i * (h / 2), w: w - 24, h: h / 2 - 16 } : { x: 12 + i * (w / 2), y: 10, w: w / 2 - 24, h: h - 20 };
              drawChart(x, b, ch, time, c, T[i]);
            });
            if (tall) M.line(x, 12, h / 2, w - 12, h / 2, c.line, 1); else M.line(x, w / 2, 14, w / 2, h - 14, c.line, 1);
          } else {
            drawChart(x, { x: 14, y: 12, w: w - 28, h: h - 24 }, charts[0], time, c);
          }
        },
      };
    },
  });
})();
