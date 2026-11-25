/* 영상 촬영·편집 트랙: 9장 카메라와 빛(3점 조명), 10장 편집(리듬, 몽타주, 색 보정, 소리 편집)
   인물·소품·배경·뷰파인더·클립·파형은 공용 일러스트 키트 M.art(art.js)로 그립니다. */
(() => {
  /* ---------- 공용 도우미 (이 파일 전용) ---------- */
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const sstep = (a, b, v) => { const t = M.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hexRgb = (hex) => {
    const h = (hex || "#888").replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((q) => q + q).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  /* 값을 목표로 부드럽게 (단계 전환 보간, 약 300ms) */
  const chase = (v, t, dt, ms = 85) => v + (t - v) * (1 - Math.exp(-Math.max(0, dt || 16) / ms));
  /* 좁은 화면에서만 캔버스 최소 높이를 지정 */
  const minH = (cv, px) => { const s = px ? Math.round(px) + "px" : ""; if (cv.style.minHeight !== s) cv.style.minHeight = s; };
  /* 패널: 불투명 면 + 1px 잉크 테두리 + 오프셋 그림자 (+ 제목) */
  const card = (x, px, py, pw, ph, o = {}) => {
    const c = M.col();
    x.save();
    M.rrect(x, px + 2, py + 2.5, pw, ph, 10); x.fillStyle = M.alpha(c.ink, 0.85); x.fill();
    M.rrect(x, px, py, pw, ph, 10); x.fillStyle = o.fill || c.surface; x.fill();
    x.lineWidth = 1; x.strokeStyle = c.ink; x.stroke();
    x.restore();
    if (o.title) M.text(x, o.title, px + 12, py + 20, { size: 12, weight: 700, color: c.ink });
    if (o.note) M.text(x, o.note, px + pw - 12, py + 20, { size: 11, mono: true, color: c.muted, align: "right" });
  };
  /* 색온도 → RGB (0..1). Tanner Helland 근사 */
  const kelvin = (K) => {
    const t = K / 100; let r, g, b;
    if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; }
    else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); b = 255; }
    return [r, g, b].map((v) => M.clamp(v, 0, 255) / 255);
  };
  const lightTint = (K, wb) => {
    const a = kelvin(K), w = kelvin(wb);
    const r = [a[0] / w[0], a[1] / w[1], a[2] / w[2]];
    const l = 0.3 * r[0] + 0.59 * r[1] + 0.11 * r[2];
    return r.map((v) => v / l);
  };
  const rgbStr = (r, a = 1) => `rgba(${r.map((v) => Math.round(M.clamp(v, 0, 1) * 255)).join(",")},${a})`;
  /* 작은 삼각 표식 */
  const tri = (x, px, py, s, col, up = true) => { x.beginPath(); x.moveTo(px, py); x.lineTo(px - s, py + (up ? s * 1.4 : -s * 1.4)); x.lineTo(px + s, py + (up ? s * 1.4 : -s * 1.4)); x.closePath(); x.fillStyle = col; x.fill(); };

  /* ===== 9-3 3점 조명과 빛의 질 ===== */
  LESSONS.push({
    id: "three-point-light", ch: 9, order: 3,
    title: "3점 조명과 빛의 질",
    lede: "인물 조명의 기본인 키·필·백 세 개의 빛이 얼굴에 각각 무엇을 하는지 배웁니다. 왼쪽은 촬영장을 위에서 본 배치도, 오른쪽은 카메라 모니터입니다. 배치도의 조명을 끌어 옮기면 얼굴의 빛과 그림자가 바로 바뀝니다.",
    key: "키로 형태를 만들고, 필로 그림자 깊이를 정하고, 백으로 배경에서 떼어 냅니다. 빛의 부드러움은 밝기가 아니라 광원의 크기가 정합니다.",
    steps: [
      ["키 라이트", "가장 밝은 주광을 <b>키 라이트</b>(key light)라고 합니다. 배치도에서 노란 <b>키</b> 조명은 카메라 축에서 45° 옆에 있습니다. 모니터의 '밝은 쪽'과 '그림자 쪽' 라벨을 보면 얼굴 한쪽만 밝아서 입체감이 생긴 것이 보입니다. 키 조명을 끌어 각도를 바꿔 보세요. 10° 쪽은 평평하고, 90° 쪽은 얼굴이 반으로 갈립니다."],
      ["필 라이트", "키 반대편에 약한 <b>필 라이트</b>(fill light)를 더하면 그림자 쪽이 살아납니다. 그림자를 없애는 빛이 아니라 <b>얼마나 어둡게 남길지</b> 정하는 빛입니다. 배치도 아래 막대에 키와 필의 밝기 비율이 나옵니다. 현장에서는 흰 반사판 하나로 대신하는 경우도 많습니다."],
      ["백 라이트", "인물 뒤 위쪽에서 비추는 <b>백 라이트</b>(back light)는 머리와 어깨 가장자리에 밝은 테두리, 즉 <b>림</b>(rim)을 만듭니다. 모니터의 '림' 라벨 자리를 보세요. 이 테두리 덕분에 어두운 머리카락이 어두운 배경에서 떨어져 보입니다."],
      ["키:필 비율", "키와 필의 밝기 비율을 <b>조명비</b>(lighting ratio)라고 합니다. 2:1 근처는 그림자가 옅은 <b>하이키</b>(high-key, 밝고 가벼운 광고·코미디 톤), 8:1 이상은 그림자가 깊은 <b>로우키</b>(low-key, 누아르·스릴러 톤)입니다. 지금 필 세기가 저절로 오르내리며 아래 막대의 표식이 두 구역을 오갑니다. 2배마다 1스톱 차이입니다."],
      ["하드 vs 소프트", "빛의 질은 <b>광원의 크기</b>가 정합니다. 배치도에서 키 조명의 앞면이 넓어졌다 좁아집니다. 인물에 비해 작은 광원(맨 전구, 한낮의 해)은 그림자 경계가 날카로운 <b>하드 라이트</b>, 큰 광원(소프트박스, 흐린 하늘)은 경계가 번지는 <b>소프트 라이트</b>입니다. 같은 소프트박스도 인물에 가까이 붙이면 상대적으로 커져서 더 부드러워집니다."],
      ["색온도", "빛의 색은 켈빈(K)으로 적습니다. 텅스텐 조명은 약 <b>3200K</b>(주황), 한낮의 햇빛은 약 <b>5600K</b>(흰색~푸른색)입니다. 카메라의 <b>화이트밸런스</b>(white balance)를 5600K에 맞추면 3200K 키는 주황으로 찍힙니다. 아래 막대에서 키·백·WB 표식을 비교하고, '카메라 화이트밸런스'를 3200K로 바꿔 보세요. 이번엔 배경 쪽 백 라이트가 푸르게 변합니다."],
    ],
    terms: [
      ["키 · 필 · 백 라이트", "Key · Fill · Back light", "주광, 그림자를 채우는 보조광, 뒤에서 윤곽을 그리는 역광. 셋을 합쳐 3점 조명이라 부르며 인물 촬영 조명의 출발점입니다."],
      ["조명비", "Lighting ratio", "밝은 쪽과 그림자 쪽의 밝기 비. 2배마다 1스톱 차이이고, 조명 감독이 장면의 톤을 말할 때 씁니다."],
      ["하이키 · 로우키", "High-key · Low-key", "그림자가 옅고 밝은 톤 / 그림자가 깊고 어두운 톤. 장르와 분위기를 정할 때 쓰는 말입니다."],
      ["하드 · 소프트 라이트", "Hard · Soft light", "광원이 작으면 그림자 경계가 날카롭고, 크면 번집니다. 디퓨저·소프트박스를 고를 때의 기준입니다."],
      ["색온도", "Color temperature (K)", "빛의 색을 켈빈으로 나타낸 값. 텅스텐 3200K, 주광 5600K. 카메라 화이트밸런스와 짝으로 씁니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const S = {
        key: { on: true, I: 1, ang: -45, K: 5600 },
        fill: { on: false, I: 0.35, ang: 50, K: 5600 },
        back: { on: false, I: 0.9, ang: 155, K: 5600 },
        size: 0.3, wb: 5600,
      };
      /* 화면에 보이는 값(목표를 따라감) */
      const V = { key: 1, fill: 0, rim: 0, soft: 0.3, ang: -45, fang: 50, keyA: 1, fillA: 0, backA: 0, warm: 0, bgK: [1, 1, 1], kTint: [1, 1, 1], bTint: [1, 1, 1], wb: 5600 };
      let step = 0, touched = false, drag = null, L = null, HD = null;
      const ctl = api.controls;
      const ck = M.check(ctl, { id: "tplk", label: "키 라이트 켜기", checked: true, onChange: (v) => (S.key.on = v) });
      const cf = M.check(ctl, { id: "tplf", label: "필 라이트 켜기", checked: false, onChange: (v) => (S.fill.on = v) });
      const cb = M.check(ctl, { id: "tplb", label: "백 라이트 켜기", checked: false, onChange: (v) => (S.back.on = v) });
      const sk = M.slider(ctl, { id: "tplki", label: "키 세기", min: 0, max: 100, value: 100, unit: "%", onInput: (v) => (S.key.I = v / 100) });
      const sf = M.slider(ctl, { id: "tplfi", label: "필 세기", min: 0, max: 100, value: 35, unit: "%", onInput: (v) => { S.fill.I = v / 100; touched = true; } });
      const sb = M.slider(ctl, { id: "tplbi", label: "백 세기", min: 0, max: 100, value: 90, unit: "%", onInput: (v) => (S.back.I = v / 100) });
      const sa = M.slider(ctl, { id: "tplka", label: "키 각도 (카메라 축에서) · 배치도에서 끌어도 됨", min: 5, max: 95, value: 45, unit: "°", onInput: (v) => (S.key.ang = -v) });
      const ss = M.slider(ctl, { id: "tplsz", label: "키 광원 크기", min: 0, max: 100, value: 30, fmt: (v) => (v < 30 ? "작음 · 하드 " : v > 65 ? "큼 · 소프트 " : "중간 ") + v, onInput: (v) => { S.size = v / 100; touched = true; } });
      const sK = M.slider(ctl, { id: "tplkk", label: "키 색온도", min: 2700, max: 7500, step: 100, value: 5600, unit: " K", onInput: (v) => (S.key.K = v) });
      const wbChips = M.chips(ctl, { title: "카메라 화이트밸런스", items: ["3200K", "5600K"], value: 1, onPick: (i) => (S.wb = i ? 5600 : 3200) });
      const ro = M.readout(ctl);

      function setUI() {
        ck.set(S.key.on); cf.set(S.fill.on); cb.set(S.back.on);
        sk.set(Math.round(S.key.I * 100)); sf.set(Math.round(S.fill.I * 100)); sb.set(Math.round(S.back.I * 100));
        sa.set(-S.key.ang); ss.set(Math.round(S.size * 100)); sK.set(S.key.K); wbChips.set(S.wb === 5600 ? 1 : 0);
      }
      const ratioOf = () => { const k = S.key.on ? S.key.I : 0, f = S.fill.on ? S.fill.I : 0; return f < 0.02 ? Infinity : (k + f) / f; };
      function readout() {
        const k = S.key.on ? S.key.I : 0, r = ratioOf();
        let line;
        if (!k) line = "키가 꺼져 있습니다. 얼굴의 형태를 만드는 빛이 없습니다.";
        else if (!isFinite(r)) line = "키:필 = 필 없음 → 그림자 쪽이 거의 검게 남습니다 (로우키)";
        else line = `키:필 = <b>${r.toFixed(1)} : 1</b> (${Math.log2(r).toFixed(1)} 스톱 차이) · ${r <= 2.6 ? "하이키 쪽" : r >= 7 ? "로우키 쪽" : "중간 톤"}`;
        const q = S.size < 0.3 ? "하드" : S.size > 0.65 ? "소프트" : "중간";
        ro.innerHTML = `${line}\n키 광원: ${q} · 키 ${S.key.K}K / 백 ${S.back.K}K · 화이트밸런스 ${S.wb}K`;
      }

      /* ---- 배치도 끌기 ---- */
      const angAt = (px, py) => (Math.atan2(px - L.cx, py - L.cy) * 180) / Math.PI;
      const hit = (px, py) => {
        if (!L) return null;
        for (const k of ["key", "fill"]) { const p = L.fx[k]; if (p && Math.hypot(px - p[0], py - p[1]) < 26) return k; }
        return null;
      };
      const ptr = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const onDown = (e) => { const [px, py] = ptr(e); drag = hit(px, py); if (drag) { cv.setPointerCapture(e.pointerId); e.preventDefault(); } };
      const onMove = (e) => {
        const [px, py] = ptr(e);
        if (!drag) { cv.style.cursor = hit(px, py) ? "grab" : ""; return; }
        cv.style.cursor = "grabbing";
        const a = angAt(px, py);
        if (drag === "key") { S.key.ang = -M.clamp(Math.round(-a), 5, 95); S.key.on = true; sa.set(-S.key.ang); ck.set(true); }
        else { S.fill.ang = M.clamp(Math.round(a), 20, 100); S.fill.on = true; cf.set(true); touched = true; }
      };
      const onUp = () => { drag = null; cv.style.cursor = ""; };
      cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove);
      cv.addEventListener("pointerup", onUp); cv.addEventListener("pointercancel", onUp);

      /* ---- 조명 기구 아이콘(위에서 본 모습). 로컬 +x 가 인물 쪽 ---- */
      function fixture(x, kind, lx, ly, a, sizePx, on, col, c) {
        x.save(); x.translate(lx, ly); x.rotate(a);
        x.lineWidth = 1.25; x.strokeStyle = on ? c.ink : c.muted;
        if (!on) x.setLineDash([3, 3]);
        const fillC = on ? col : c.surface;
        if (kind === "key") {
          const hw = sizePx / 2;
          x.beginPath(); x.moveTo(-14, -6); x.lineTo(0, -hw); x.lineTo(0, hw); x.lineTo(-14, 6); x.closePath();
          x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(fillC, on ? 0.55 : 1); x.fill(); x.stroke();
          x.beginPath(); x.moveTo(0, -hw); x.lineTo(0, hw); x.lineWidth = 3; x.strokeStyle = on ? c.ink : c.muted; x.stroke();
        } else if (kind === "fill") {
          M.rrect(x, -5, -sizePx / 2, 5, sizePx, 2); x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(fillC, on ? 0.55 : 1); x.fill(); x.stroke();
        } else {
          M.rrect(x, -14, -6, 12, 12, 2); x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(fillC, on ? 0.55 : 1); x.fill(); x.stroke();
          x.beginPath(); x.moveTo(-2, -6); x.lineTo(4, -10); x.moveTo(-2, 6); x.lineTo(4, 10); x.stroke();
        }
        x.setLineDash([]);
        x.restore();
        M.dot(x, lx, ly, 2.5, on ? c.ink : c.muted);
      }

      function drawPlan(x, px, py, pw, ph, c, hero) {
        card(x, px, py, pw, ph, { title: "위에서 본 배치도" });
        const strip = step === 0 ? 0 : 62;
        const top = py + 32, bot = py + ph - strip - 10;
        // 도면 격자
        x.save(); M.rrect(x, px + 8, top, pw - 16, bot - top, 6); x.clip();
        x.fillStyle = M.alpha(c.a, 0.05); x.fillRect(px, top, pw, bot - top);
        x.strokeStyle = M.alpha(c.ink, 0.07); x.lineWidth = 1;
        for (let gx = px + 8; gx < px + pw; gx += 18) { x.beginPath(); x.moveTo(gx + 0.5, top); x.lineTo(gx + 0.5, bot); x.stroke(); }
        for (let gy = top; gy < bot; gy += 18) { x.beginPath(); x.moveTo(px, gy + 0.5); x.lineTo(px + pw, gy + 0.5); x.stroke(); }
        x.restore();
        const cx = px + pw / 2, cy = top + (bot - top) * 0.46, R = Math.max(40, Math.min(pw * 0.36, (bot - top) * 0.39));
        L = { cx, cy, fx: {} };
        const pos = (ang, rr = R) => { const a = (ang * Math.PI) / 180; return [cx + Math.sin(a) * rr, cy + Math.cos(a) * rr]; };
        // 카메라 축
        const [camx, camy] = pos(0, R * 1.02);
        M.line(x, camx, camy - 14, cx, cy + 16, M.alpha(c.ink, 0.35), 1, [4, 4]);
        const spec = [["back", "백", c.c, V.rim > 0.02 ? V.backA : 0, S.back.ang], ["fill", "필", c.a, V.fillA, V.fang], ["key", "키", c.key, V.keyA, V.ang]];
        // 빛 원뿔
        for (const [k, , col, A, ang] of spec) {
          if (A < 0.02) continue;
          const [lx, ly] = pos(ang);
          const a = Math.atan2(cy - ly, cx - lx), nx = -Math.sin(a), ny = Math.cos(a);
          const hw = k === "key" ? 6 + V.soft * 26 : k === "fill" ? 15 : 6;
          const I = k === "key" ? V.key : k === "fill" ? V.fill / 0.9 : V.rim / 1.1;
          x.save(); x.globalAlpha = hero(k) ? 1 : 0.35;
          const g = x.createLinearGradient(lx, ly, cx, cy);
          g.addColorStop(0, M.alpha(col, (0.18 + 0.32 * M.clamp(I, 0, 1)) * A)); g.addColorStop(1, M.alpha(col, 0.04 * A));
          x.beginPath(); x.moveTo(lx + nx * hw, ly + ny * hw); x.lineTo(lx - nx * hw, ly - ny * hw);
          x.lineTo(cx - nx * 22, cy - ny * 22); x.lineTo(cx + nx * 22, cy + ny * 22); x.closePath();
          x.fillStyle = g; x.fill();
          x.restore();
        }
        // 키 각도 호
        if (V.keyA > 0.05) {
          const r0 = Math.min(46, R * 0.5), a0 = Math.PI / 2, a1 = Math.PI / 2 - (V.ang * Math.PI) / 180;
          x.save(); x.globalAlpha = hero("key") ? 1 : 0.4; x.strokeStyle = c.ink; x.lineWidth = 1.25;
          x.beginPath(); x.arc(cx, cy, r0, Math.min(a0, a1), Math.max(a0, a1)); x.stroke();
          const am = (a0 + a1) / 2;
          M.tag(x, `${Math.round(-V.ang)}°`, cx + Math.cos(am) * (r0 + 16), cy + Math.sin(am) * (r0 + 16), { mono: true, size: 11, align: "center" });
          x.restore();
        }
        // 인물 (위에서): 어깨 + 머리 + 코 방향
        const face = (25 * Math.PI) / 180;
        x.save(); x.translate(cx, cy); x.rotate(-face);
        x.beginPath(); x.ellipse(0, 0, 25, 11, 0, 0, Math.PI * 2); x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(c.b, 0.35); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
        x.beginPath(); x.moveTo(-4, 11); x.lineTo(0, 17); x.lineTo(4, 11); x.closePath(); x.fillStyle = c.surface; x.fill(); x.stroke();
        x.beginPath(); x.arc(0, 0, 11, 0, Math.PI * 2); x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(c.ink, 0.55); x.fill(); x.stroke();
        x.restore();
        M.tag(x, "인물", cx + 30, cy - 18, { size: 11 });
        // 카메라
        x.save(); x.translate(camx, camy);
        M.rrect(x, -14, -2, 28, 18, 3); x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(c.ink, 0.18); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
        x.beginPath(); x.moveTo(-6, -2); x.lineTo(-9, -11); x.lineTo(9, -11); x.lineTo(6, -2); x.closePath(); x.fillStyle = c.surface; x.fill(); x.stroke();
        x.restore();
        M.tag(x, "카메라", camx + 22, camy + 8, { size: 11 });
        // 조명 기구 + 이름표
        for (const [k, name, col, A, ang] of spec) {
          const [lx, ly] = pos(ang), a = Math.atan2(cy - ly, cx - lx);
          const on = (k === "key" ? S.key.on : k === "fill" ? S.fill.on : S.back.on);
          const sz = k === "key" ? 12 + V.soft * 52 : 30;
          x.save(); x.globalAlpha = hero(k) ? 1 : 0.4;
          fixture(x, k, lx, ly, a, sz, on, col, c);
          const [tx, ty] = pos(ang, R + 30);
          const pct = k === "key" ? S.key.I : k === "fill" ? S.fill.I : S.back.I;
          const lab = on ? `${name} ${Math.round(pct * 100)}%` : `${name} 꺼짐`;
          M.tag(x, lab, M.clamp(tx, px + 50, px + pw - 50), M.clamp(ty, top + 12, bot - 12), { align: "center", size: 11.5, fill: on && hero(k) ? col : c.surface, color: c.ink });
          x.restore();
          L.fx[k] = [lx, ly];
          void A;
        }
        if (step === 0 && !drag) M.callout(x, "끌어서 옮기기", L.fx.key[0], L.fx.key[1] - 12, L.fx.key[0] - 4, L.fx.key[1] - 46, { size: 11 });
        // 아래 계기
        if (!strip) return;
        const sx = px + 16, sw = pw - 32, sy = py + ph - strip + 12;
        if (step <= 3) {
          const r = ratioOf(), u = isFinite(r) ? M.clamp(Math.log2(r) / 4, 0, 1) : 1;
          M.text(x, "키 : 필 비율", sx, sy, { size: 11, weight: 700, color: c.ink });
          M.text(x, isFinite(r) ? `${r.toFixed(1)} : 1` : "필 없음", sx + sw, sy, { size: 11, mono: true, weight: 700, color: c.ink, align: "right" });
          const by = sy + 8, bh = 17;
          M.rrect(x, sx, by, sw, bh, 6); x.fillStyle = c.sunk; x.fill();
          x.save(); M.rrect(x, sx, by, sw, bh, 6); x.clip();
          x.fillStyle = M.alpha(c.key, 0.4); x.fillRect(sx, by, sw * 0.3, bh);
          x.fillStyle = M.alpha(c.ink, 0.28); x.fillRect(sx + sw * 0.75, by, sw * 0.25, bh);
          x.restore();
          M.rrect(x, sx, by, sw, bh, 6); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
          M.text(x, "하이키", sx + 7, by + 12.5, { size: 11, weight: 600, color: c.ink });
          M.text(x, "로우키", sx + sw - 7, by + 12.5, { size: 11, weight: 600, color: c.ink, align: "right" });
          for (const [k, t] of [[0, "1:1"], [0.25, "2:1"], [0.5, "4:1"], [0.75, "8:1"], [1, "16:1"]]) M.text(x, t, sx + sw * k, by + bh + 13, { size: 11, mono: true, align: k === 0 ? "left" : k === 1 ? "right" : "center" });
          const ux = sx + sw * u;
          M.line(x, ux, by - 3, ux, by + bh + 3, c.ink, 2.5); tri(x, ux, by - 3, 5, c.ink, false);
        } else if (step === 4) {
          M.text(x, "키 광원 크기", sx, sy, { size: 11, weight: 700, color: c.ink });
          const by = sy + 10, bh = 12;
          const g = x.createLinearGradient(sx, 0, sx + sw, 0); g.addColorStop(0, M.alpha(c.key, 0.15)); g.addColorStop(1, M.alpha(c.key, 0.7));
          M.rrect(x, sx, by, sw, bh, 6); x.fillStyle = g; x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
          M.text(x, "작음 · 하드", sx, by + bh + 13, { size: 11, align: "left" }); M.text(x, "큼 · 소프트", sx + sw, by + bh + 13, { size: 11, align: "right" });
          M.line(x, sx + sw * V.soft, by - 3, sx + sw * V.soft, by + bh + 3, c.ink, 2.5);
        } else {
          M.text(x, "색온도", sx, sy, { size: 11, weight: 700, color: c.ink });
          const by = sy + 8, bh = 14, K0 = 2500, K1 = 8000, KX = (K) => sx + ((K - K0) / (K1 - K0)) * sw;
          x.save(); M.rrect(x, sx, by, sw, bh, 6); x.clip();
          for (let i = 0; i < sw; i += 2) { x.fillStyle = rgbStr(lightTint(M.lerp(K0, K1, i / sw), 6500)); x.fillRect(sx + i, by, 2.5, bh); }
          x.restore();
          M.rrect(x, sx, by, sw, bh, 6); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
          [[S.key.K, "키"], [S.back.K, "백"]].forEach(([K, n], i) => {
            const mx = KX(K), s2 = `${n} ${K}K`; M.line(x, mx, by - 2, mx, by + bh + 2, c.ink, 2);
            x.font = M.font(11, "mono", 500); const tw = x.measureText(s2).width;
            let right = i === 0 && S.key.K <= S.back.K; if (right && mx - 4 - tw < sx) right = false; if (!right && mx + 4 + tw > sx + sw) right = true;
            M.text(x, s2, mx + (right ? -4 : 4), by + bh + 14, { size: 11, mono: true, color: c.ink, align: right ? "right" : "left" });
          });
          const wx = KX(S.wb); tri(x, wx, by - 2, 5, c.ink, false); M.text(x, `카메라 WB ${S.wb}K`, sx + sw, sy, { size: 11, mono: true, weight: 700, color: c.ink, align: "right" });
        }
      }

      function drawMonitor(x, mx, my, mw, mh, c, time, hero) {
        const fr = M.art.frame(x, { x: mx, y: my, w: mw, h: mh, label: "MCU", rec: true, time, draw: (x, r) => {
          // 배경 벽: 필이 공간을 밝히고, 키가 벽에 빛 웅덩이를 만들고, 백이 뒤를 물들임
          const bgL = 0.1 + 0.32 * V.fill + 0.1 * V.key;
          x.fillStyle = rgbStr([0.16 * (1 + bgL), 0.15 * (1 + bgL), 0.145 * (1 + bgL)]); x.fillRect(r.x, r.y, r.w, r.h);
          const side = Math.sign(V.ang) || -1;
          const pool = x.createRadialGradient(r.x + r.w * (0.5 - side * 0.32), r.y + r.h * 0.35, 0, r.x + r.w * (0.5 - side * 0.32), r.y + r.h * 0.35, r.w * 0.55);
          pool.addColorStop(0, rgbStr(V.kTint.map((v) => v * 0.55), 0.35 * V.key)); pool.addColorStop(1, rgbStr(V.kTint, 0));
          x.fillStyle = pool; x.fillRect(r.x, r.y, r.w, r.h);
          const hcx = r.x + r.w * 0.5, hcy = r.y + r.h * 0.42, hr = Math.min(r.h * 0.17, r.w * 0.2);
          const halo = x.createRadialGradient(hcx, hcy - hr * 0.6, hr * 0.5, hcx, hcy - hr * 0.6, hr * 3.2);
          halo.addColorStop(0, rgbStr(V.bTint.map((v) => v * 0.7), 0.45 * V.rim)); halo.addColorStop(1, rgbStr(V.bTint, 0));
          x.fillStyle = halo; x.fillRect(r.x, r.y, r.w, r.h);
          const th = (Math.abs(V.ang) * Math.PI) / 180;
          M.art.head(x, { cx: hcx, cy: hcy, r: hr, who: "A", view: "three-quarter-right", expr: "neutral", blink: (time % 3900) < 120 ? 1 : 0,
            light: { dx: side * Math.sin(th) * 0.95, dy: -0.38, key: V.key, fill: V.fill, rim: V.rim, warm: V.warm, soft: V.soft } });
          HD = { x: hcx, y: hcy, r: hr, side, r0: r };
        } });
        fr.overlay();
        const H = HD; if (!H) return;
        const LN = "rgba(242,236,226,0.85)";
        const tagAt = (s, ax, ay, dir, dy = 0) => {
          x.font = M.font(11, "ui", 600); const tw = x.measureText(s).width + 18;
          let lx = H.x + dir * H.r * 1.45;
          if (dir > 0) lx = Math.min(lx, rt.x + rt.w - 6 - tw); else lx = Math.max(lx, rt.x + 6 + tw);
          if ((dir > 0 && lx < ax + 8) || (dir < 0 && lx > ax - 8)) lx = ax + dir * 8;
          M.callout(x, s, ax, ay, lx, ay + dy, { size: 11, line: LN });
        };
        const rt = H.r0;
        if (step === 0 || step === 3 || step === 1) {
          tagAt("밝은 쪽", H.x + H.side * H.r * 0.55, H.y + H.r * 0.2, H.side, -H.r * 0.2);
          tagAt(step === 1 ? "그림자 쪽 · 필이 채움" : "그림자 쪽", H.x - H.side * H.r * 0.12, H.y + H.r * 0.55, -H.side, H.r * 0.3);
        } else if (step === 2) {
          tagAt("림 (테두리)", H.x + H.r * 0.72, H.y - H.r * 0.72, 1, -H.r * 0.3);
        } else if (step === 4) {
          tagAt(V.soft > 0.55 ? "그림자 경계: 번짐" : V.soft < 0.25 ? "그림자 경계: 날카로움" : "그림자 경계", H.x + H.r * 0.12, H.y + H.r * 0.5, 1, H.r * 0.3);
        } else if (step === 5) {
          tagAt(S.wb === 5600 ? "키 3200K → 주황" : "키 3200K → 흰색", H.x + H.side * H.r * 0.55, H.y + H.r * 0.2, H.side, -H.r * 0.2);
          tagAt(S.wb === 5600 ? "백 5600K → 흰색" : "백 5600K → 파랑", H.x - H.side * H.r * 0.7, H.y - H.r * 0.8, -H.side, -H.r * 0.2);
        }
        void hero;
      }

      return {
        setStep(s) {
          step = s; touched = false;
          S.key = { on: true, I: 1, ang: -45, K: 5600 };
          S.fill.on = s >= 1; S.fill.I = s === 4 ? 0.18 : 0.35; S.fill.K = 5600; S.fill.ang = 50;
          S.back.on = s >= 2; S.back.I = 0.9; S.back.K = 5600;
          S.size = s === 4 ? 0.05 : s === 5 ? 0.55 : 0.3; S.wb = 5600;
          if (s === 5) { S.key.K = 3200; S.back.K = 5600; }
          setUI();
        },
        frame(time, dt) {
          const c = M.col();
          if (!touched && step === 3) { const p = M.pingpong(time, 2400, 900); const e = M.ease.inOut(p.back ? 1 - p.p : p.p); S.fill.I = M.lerp(0.95, 0.12, e); sf.set(Math.round(S.fill.I * 100)); }
          if (!touched && step === 4) { const p = M.pingpong(time, 2400, 900); const e = M.ease.inOut(p.back ? 1 - p.p : p.p); S.size = M.lerp(0.03, 1, e); ss.set(Math.round(S.size * 100)); }
          // 목표값 → 화면값
          const T = {
            key: S.key.on ? S.key.I : 0, fill: S.fill.on ? S.fill.I * 0.9 : 0, rim: S.back.on ? S.back.I * 1.1 : 0,
            keyA: S.key.on ? 1 : 0.0001, fillA: S.fill.on ? 1 : 0, backA: S.back.on ? 1 : 0,
          };
          for (const k in T) V[k] = chase(V[k], T[k], dt);
          V.soft = chase(V.soft, S.size, dt, drag ? 30 : 85); V.ang = chase(V.ang, S.key.ang, dt, drag ? 25 : 85); V.fang = chase(V.fang, S.fill.ang, dt, drag ? 25 : 85);
          V.warm = chase(V.warm, M.clamp((S.wb - S.key.K) / 2400, -1, 1), dt);
          const kt = lightTint(S.key.K, S.wb), bt = lightTint(S.back.K, S.wb);
          V.kTint = V.kTint.map((v, i) => chase(v, kt[i], dt)); V.bTint = V.bTint.map((v, i) => chase(v, bt[i], dt));
          readout();
          const r0 = cv.getBoundingClientRect(), narrow = r0.width < 600;
          if (narrow) minH(cv, r0.width * 0.8 + 12 + Math.max(330, r0.width * 1.02)); else minH(cv, 0);
          const { x, w, h } = M.fit(cv);
          const HERO = [["key"], ["fill"], ["back"], ["key", "fill"], ["key"], ["key", "back"]][step];
          const hero = (k) => HERO.includes(k);
          if (narrow) {
            const mh = Math.min(w * 0.8, h * 0.46);
            drawMonitor(x, 4, 4, w - 8, mh, c, time, hero);
            drawPlan(x, 4, mh + 14, w - 10, h - mh - 20, c, hero);
          } else {
            const pw = Math.round(Math.min(w * 0.5, Math.max(300, w - h * 0.95)));
            drawPlan(x, 4, 4, pw, h - 10, c, hero);
            drawMonitor(x, pw + 18, 4, w - pw - 22, h - 8, c, time, hero);
          }
        },
        destroy() { cv.removeEventListener("pointerdown", onDown); cv.removeEventListener("pointermove", onMove); cv.removeEventListener("pointerup", onUp); cv.removeEventListener("pointercancel", onUp); },
      };
    },
  });

  /* ---------- 편집 레슨 공용: 장면(세계)을 카메라 프레이밍으로 그리기 ----------
     세계 좌표: 높이 1, 폭 16/9. cam = {cx, cy, z} — z 배 확대해서 (cx, cy) 를 가운데에 둔다.
     와이드와 클로즈업이 같은 세계를 다른 크기로 보므로 컷 사이 연속성이 저절로 맞는다. */
  const WW = 16 / 9;
  const camMap = (r, cam) => { const s = r.h * cam.z; return { s, X: (u) => r.x + r.w / 2 + (u - cam.cx) * s, Y: (v) => r.y + r.h / 2 + (v - cam.cy) * s }; };
  const talkMouth = (t) => Math.abs(Math.sin(t * 11)) * (Math.sin(t * 2.3) > -0.5 ? 1 : 0.1);
  const blinkAt = (t, per = 3.1, off = 0) => ((t + off) % per < 0.12 ? 1 : 0);
  /* 대화 장면: A(왼쪽, 오른쪽을 봄)와 B(오른쪽, 왼쪽을 봄) */
  function talkWorld(x, r, cam, t, o = {}) {
    const m = camMap(r, cam), ms = t * 1000;
    M.art.backdrop(x, "room", { x: m.X(0), y: m.Y(0), w: WW * m.s, h: m.s, time: ms });
    M.art.prop(x, "plant", { cx: m.X(1.62), cy: m.Y(0.9), s: 0.3 * m.s });
    M.art.prop(x, "lamp", { cx: m.X(0.16), cy: m.Y(0.9), s: 0.5 * m.s });
    M.art.person(x, { cx: m.X(o.ax ?? 0.55), cy: m.Y(0.94), h: 0.62 * m.s, who: "A", view: o.aView || "three-quarter-right", pose: o.aPose, phase: o.aPhase, expr: o.aExpr || "neutral", mouth: o.aMouth, blink: blinkAt(t, 3.1) });
    if (!o.noB) M.art.person(x, { cx: m.X(1.27), cy: m.Y(0.94), h: 0.6 * m.s, who: "B", view: "three-quarter-left", expr: o.bExpr || "neutral", mouth: o.bMouth, blink: blinkAt(t, 2.7, 1.1) });
    if (o.table !== false) { M.art.prop(x, "table", { cx: m.X(0.91), cy: m.Y(0.97), s: 0.2 * m.s }); M.art.prop(x, "mug", { cx: m.X(0.84), cy: m.Y(0.77), s: 0.05 * m.s, steam: true, time: ms }); }
  }
  function streetWorld(x, r, cam, t) {
    const m = camMap(r, cam), ms = t * 1000;
    M.art.backdrop(x, "street", { x: m.X(0), y: m.Y(0), w: WW * m.s, h: m.s, time: ms });
    const carX = ((0.1 + t * 0.32) % 2.4) - 0.3;
    M.art.person(x, { cx: m.X(0.45 + t * 0.07), cy: m.Y(0.92), h: 0.42 * m.s, who: "B", view: "profile-right", pose: "walk", phase: (t * 1.1) % 1 });
    M.art.prop(x, "car", { cx: m.X(carX), cy: m.Y(0.985), s: 0.2 * m.s });
  }
  function parkWorld(x, r, cam, t) {
    const m = camMap(r, cam), ms = t * 1000;
    M.art.backdrop(x, "park", { x: m.X(0), y: m.Y(0), w: WW * m.s, h: m.s, time: ms });
    M.art.person(x, { cx: m.X(0.7), cy: m.Y(0.93), h: 0.4 * m.s, who: "A", view: "three-quarter-right", pose: "wave", phase: (t * 0.9) % 1, expr: "smile" });
    M.art.person(x, { cx: m.X(1.0), cy: m.Y(0.92), h: 0.38 * m.s, who: "B", view: "three-quarter-left", expr: "smile" });
  }
  /* 썸네일 캐시: 같은 숏·크기·테마면 다시 그리지 않음 */
  const thumbCache = new Map();
  const cachedThumb = (key, w, h, draw) => {
    const d = window.devicePixelRatio || 1, k = `${key}|${Math.round(w)}x${Math.round(h)}|${M.col().ink}|${d}`;
    let cv = thumbCache.get(k);
    if (!cv) {
      if (thumbCache.size > 120) thumbCache.clear();
      cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(w * d)); cv.height = Math.max(1, Math.round(h * d));
      const q = cv.getContext("2d"); q.scale(d, d); q.beginPath(); q.rect(0, 0, w, h); q.clip(); draw(q, { x: 0, y: 0, w, h });
      thumbCache.set(k, cv);
    }
    return cv;
  };
  /* 타임라인 트랙 머리 */
  const trackHead = (x, name, px, py, pw, ph, col) => {
    const c = M.col();
    M.rrect(x, px, py, pw, ph, 5); x.fillStyle = c.surface; x.fill(); x.lineWidth = 1; x.strokeStyle = M.alpha(c.ink, 0.6); x.stroke();
    x.fillStyle = col || c.muted; x.fillRect(px + 1, py + 4, 3, ph - 8);
    M.text(x, name, px + pw / 2 + 2, py + ph / 2 + 4, { size: 11, mono: true, weight: 700, color: c.ink, align: "center" });
  };
  /* 초 눈금자 */
  const ruler = (x, X, t0, t1, y, step, w) => {
    const c = M.col(), pps = (X(t1) - X(t0)) / Math.max(1e-6, t1 - t0);
    step = [0.5, 1, 2, 4, 5, 10].find((q) => q >= step && q * pps >= 46) || 10;
    for (let s = t0; s <= t1 + 1e-6; s += step) {
      const px = X(s); M.line(x, px, y + 4, px, y + 10, c.muted, 1);
      const endL = px + 26 > w; M.text(x, (Math.round(s * 10) / 10) + "s", endL ? px - 3 : px + 3, y + 9, { size: 11, mono: true, align: endL ? "right" : "left" });
    }
  };
  const playhead = (x, px, y0, y1) => {
    const c = M.col();
    M.line(x, px, y0, px, y1, c.ink, 2);
    x.beginPath(); x.moveTo(px - 6, y0 - 6); x.lineTo(px + 6, y0 - 6); x.lineTo(px + 6, y0); x.lineTo(px, y0 + 6); x.lineTo(px - 6, y0); x.closePath();
    x.fillStyle = c.key; x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
  };

  /* ===== 10-3 편집 리듬과 액션 컷 ===== */
  LESSONS.push({
    id: "pacing", ch: 10, order: 3,
    title: "편집 리듬과 액션 컷",
    lede: "같은 대화 장면도 컷을 어디서, 얼마나 자주 자르느냐에 따라 느리게도 숨 가쁘게도 느껴집니다. 이 레슨을 마치면 숏 길이로 템포를 조절하고, 액션 컷·리액션 샷·B롤·비트 컷이 각각 언제 쓰이는지 알게 됩니다. 위는 재생 모니터, 아래는 편집 타임라인입니다.",
    key: "템포는 숏의 길이가 만듭니다. 컷은 움직임 한가운데에서 자르고, 음악이 있으면 비트 위에서 자릅니다.",
    steps: [
      ["컷 길이가 템포", "숏 하나가 화면에 머무는 시간이 길면 관객은 화면을 천천히 둘러보고, 장면은 <b>느리고 차분하게</b> 느껴집니다. 숏 길이의 평균을 <b>ASL</b>(average shot length)이라고 하며, 편집의 빠르기를 재는 가장 단순한 지표입니다. 오른쪽 '숏 길이' 막대가 모두 높고, ASL이 3초가 넘습니다."],
      ["짧은 컷, 빠른 템포", "같은 와이드·클로즈업·리액션을 1초 안팎으로 잘게 자르면 같은 시간에 컷이 몇 배로 늘어납니다. 관객이 화면을 다 읽기 전에 다음 숏이 오기 때문에 <b>긴장과 속도감</b>이 생깁니다. 타임라인의 클립이 촘촘해지고 막대가 낮아진 것을 보세요. 액션, 예고편, 뮤직비디오가 이 방식입니다."],
      ["액션 중에 자르기", "A가 방을 가로질러 걷는 동안 와이드에서 미디엄으로 자릅니다. 걸음 <b>한가운데에서</b> 자르면 눈이 움직임을 따라가느라 컷을 거의 느끼지 못합니다. 이것이 <b>액션 컷</b>(cutting on action)입니다. 타임라인의 노란 '동작 구간'과 빨간 '컷' 선을 보며 '컷 지점' 슬라이더로 동작 전·후에 잘라 보세요."],
      ["리액션 샷", "말하는 A만 계속 보여 주지 않고, 듣는 B의 표정(<b>리액션 샷</b>, reaction shot)을 끼워 넣습니다. 아래 A1 트랙의 대사 파형은 끊기지 않고 이어지고, V1의 그림만 바뀝니다. 리액션은 관객에게 이 말을 어떻게 받아들일지 알려 주고, 대사를 잘라 낸 자리도 가려 줍니다."],
      ["B롤", "인터뷰(A롤) 위 트랙 V2에 거리·공원 장면 같은 <b>B롤</b>(B-roll)을 덮습니다. 타임라인에서 위 트랙이 아래 트랙을 가리므로, 소리는 인터뷰가 그대로 이어지고 화면만 그 내용을 보여 줍니다. 말의 길이는 그대로 두고 화면 리듬만 바꾸는 도구입니다."],
      ["음악 비트에 맞추기", "음악이 깔리면 관객은 박자를 몸으로 느낍니다. 컷을 <b>비트 위</b>에 두면 편집이 음악과 함께 숨 쉬는 것처럼 느껴집니다. 타임라인의 점선이 비트이고, 한 박마다 자르면 빠르고 네 박(한 마디)마다 자르면 여유롭습니다. '비트에 맞추기'를 끄면 컷이 점선에서 어긋납니다."],
    ],
    terms: [
      ["평균 숏 길이", "ASL · Average shot length", "전체 길이 ÷ 숏 개수. 짧을수록 빠른 편집이며, 장르나 감독의 편집 스타일을 비교할 때 씁니다."],
      ["액션 컷", "Cutting on action · Match on action", "동작 도중에 다른 앵글로 잘라 움직임으로 컷을 감추는 기법. 연속 편집의 기본입니다."],
      ["리액션 샷", "Reaction shot", "말이나 사건에 반응하는 인물의 표정을 보여 주는 숏. 대화 장면의 리듬과 감정을 조절할 때 끼워 넣습니다."],
      ["B롤", "B-roll", "인터뷰·내레이션(A롤) 위에 덮는 보조 화면. 다큐·유튜브 편집에서 가장 흔히 쓰는 말입니다."],
      ["비트 컷", "Cutting to the beat", "음악 박자에 맞춰 컷 지점을 두는 편집. 뮤직비디오·몽타주·광고에서 씁니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      let step = 0, scale = 1, cut = 1.9, bpm = 100, snap = true;
      const ctl = api.controls;
      const sS = M.slider(ctl, { id: "pcsc", label: "숏 길이 배율", min: 30, max: 200, step: 5, value: 100, fmt: (v) => "× " + (v / 100).toFixed(2), onInput: (v) => (scale = v / 100) });
      const sC = M.slider(ctl, { id: "pccut", label: "컷 지점 (3단계)", min: 0.4, max: 3.4, step: 0.05, value: 1.9, fmt: (v) => v.toFixed(2) + " s", onInput: (v) => { cut = v; api.restart(); } });
      const sB = M.slider(ctl, { id: "pcbpm", label: "음악 템포 (6단계)", min: 60, max: 160, value: 100, unit: " BPM", onInput: (v) => (bpm = v) });
      const cS = M.check(ctl, { id: "pcsnap", label: "비트에 맞추기 (6단계)", checked: true, onChange: (v) => (snap = v) });
      const ro = M.readout(ctl);
      void sB;
      const NAME = { wide: "와이드", close: "CU · A", react: "리액션 · B", broll: "B롤 · 거리", broll2: "B롤 · 공원", awide: "와이드", aclose: "미디엄", interview: "인터뷰 A롤" };
      const SLATE = { wide: "WS", close: "CU", react: "CU", broll: "B-ROLL", broll2: "B-ROLL", awide: "WS", aclose: "MS", interview: "CU" };
      const ACT = [1.2, 2.6];
      const AX = (gt) => M.lerp(0.32, 1.12, sstep(ACT[0], ACT[1], gt));

      function drawShot(x, r, type, lt, gt) {
        if (type === "wide") talkWorld(x, r, { cx: WW / 2, cy: 0.5, z: 1 }, lt, { aExpr: "talk", aMouth: talkMouth(lt) });
        else if (type === "close" || type === "interview") talkWorld(x, r, { cx: 0.63, cy: 0.4, z: 3.4 }, lt, { aExpr: "talk", aMouth: talkMouth(lt) });
        else if (type === "react") talkWorld(x, r, { cx: 1.2, cy: 0.41, z: 3.4 }, lt, { bExpr: lt > 0.35 ? "surprised" : "neutral", aExpr: "talk", aMouth: talkMouth(lt) });
        else if (type === "broll") streetWorld(x, r, { cx: 0.85 + lt * 0.03, cy: 0.52, z: 1.15 }, lt + 2);
        else if (type === "broll2") parkWorld(x, r, { cx: 0.86, cy: 0.58, z: 1.5 }, lt);
        else {
          const ax = AX(gt), walking = gt > ACT[0] && gt < ACT[1];
          const o = { noB: true, table: false, ax, aView: "profile-right", aPose: walking ? "walk" : "stand", aPhase: ((ax - 0.32) / 0.34) % 1 };
          if (type === "awide") talkWorld(x, r, { cx: WW / 2, cy: 0.5, z: 1 }, gt, o);
          else talkWorld(x, r, { cx: ax + 0.06, cy: 0.56, z: 2.3 }, gt, o);
        }
      }

      function build() {
        const D = { v1: [], v2: [], a1: [], a2: [], action: null, beat: 0 };
        const lay = (list, k = scale) => { let t = 0; return list.map(([type, len]) => { const s = t; t += len * k; return { type, s, e: t }; }); };
        if (step === 0 || step === 1) {
          const L0 = [["wide", 3.6], ["close", 3], ["react", 2.6], ["wide", 3.2]];
          const L1 = [["wide", 0.9], ["close", 0.7], ["react", 0.6], ["broll", 0.8], ["close", 0.6], ["wide", 0.7], ["react", 0.5], ["broll2", 0.8], ["close", 0.6], ["wide", 0.7], ["react", 0.6], ["close", 0.8]];
          D.v1 = lay(step ? L1 : L0);
          D.a1 = [{ s: 0, e: D.v1.at(-1).e, label: "현장음", seed: 4 }];
        } else if (step === 2) {
          D.v1 = [{ type: "awide", s: 0, e: cut }, { type: "aclose", s: cut, e: cut + 1.8 }];
          D.action = ACT;
          D.a1 = [{ s: 0, e: cut + 1.8, label: "현장음", seed: 6 }];
        } else if (step === 3) {
          D.v1 = lay([["close", 2.2], ["react", 1], ["close", 2.4], ["react", 0.9], ["close", 1.9]]);
          D.a1 = [{ s: 0, e: D.v1.at(-1).e, label: "대사 (A 목소리)", seed: 2 }];
        } else if (step === 4) {
          const T = 10 * scale;
          D.v1 = [{ type: "interview", s: 0, e: T }];
          D.v2 = [{ type: "broll", s: 1.8 * scale, e: 4.6 * scale }, { type: "broll2", s: 6.4 * scale, e: 8.8 * scale }];
          D.a1 = [{ s: 0, e: T, label: "인터뷰 목소리", seed: 2 }];
        } else {
          const beat = 60 / bpm; D.beat = beat;
          const B = [4, 2, 2, 4, 1, 1, 2, 4];
          const types = ["wide", "close", "react", "broll", "close", "react", "broll2", "close"];
          let t = 0;
          D.v1 = B.map((n, i) => {
            let len = Math.max(1, Math.round(n * scale)) * beat;
            if (!snap) len += (hash(i + 3) - 0.5) * 0.9 * beat;
            const s = t; t += Math.max(0.2, len);
            return { type: types[i], s, e: t };
          });
          D.a2 = [{ s: 0, e: t, label: `음악 ${bpm} BPM`, seed: 9 }];
        }
        D.total = Math.max(...[...D.v1, ...D.v2, ...D.a1, ...D.a2].map((q) => q.e));
        const pts = new Set([0, D.total]);
        [...D.v1, ...D.v2].forEach((q) => { pts.add(q.s); pts.add(q.e); });
        const P = [...pts].sort((a, b) => a - b);
        D.segs = [];
        for (let i = 0; i < P.length - 1; i++) {
          const top = topAt(D, (P[i] + P[i + 1]) / 2);
          if (!top) continue;
          const last = D.segs.at(-1);
          if (last && last.clip === top) last.e = P[i + 1]; else D.segs.push({ clip: top, s: P[i], e: P[i + 1] });
        }
        return D;
      }
      const topAt = (D, t) => D.v2.find((q) => t >= q.s && t < q.e) || D.v1.find((q) => t >= q.s && t < q.e) || null;

      let lastClip = null, flashAt = -1e9, D = null;
      function readout() {
        const n = D.segs.length, asl = D.total / Math.max(1, n);
        let s = `숏 ${n}개 · 전체 ${D.total.toFixed(1)}초\n평균 숏 길이(ASL) <b>${asl.toFixed(2)}초</b> · 분당 컷 <b>${Math.round(60 / asl)}</b>회`;
        if (step === 2) {
          const ap = (cut - ACT[0]) / (ACT[1] - ACT[0]);
          s += `\n컷 지점: 동작 ${Math.round(M.clamp(ap, 0, 1) * 100)}% 지점 → ` + (ap <= 0.05 ? "<b>동작 전</b>. 서 있는 그림끼리 붙어 컷이 드러납니다." : ap >= 0.95 ? "<b>동작 후</b>. 걸음이 끝나서 컷이 늦고 늘어집니다." : "<b>동작 중</b>. 걸음이 컷을 가려 줍니다.");
        }
        if (step === 5) s += `\n한 박 = ${(60 / bpm).toFixed(2)}초 · ${snap ? "컷이 비트 위에 있습니다" : "컷이 비트에서 어긋납니다"}`;
        ro.innerHTML = s;
      }
      const colOf = (type) => { const c = M.col(); return { wide: c.a, awide: c.a, close: c.b, aclose: c.b, interview: c.b, react: c.c, broll: c.key, broll2: c.key }[type]; };

      return {
        setStep(s) {
          step = s; scale = 1; sS.set(100); lastClip = null; flashAt = -1e9;
          if (s === 2) { cut = 1.9; sC.set(1.9); }
          if (s === 5) { snap = true; cS.set(true); }
        },
        frame(time) {
          const c = M.col();
          D = build(); readout();
          const r0 = cv.getBoundingClientRect(), narrow = r0.width < 600;
          const rows = [D.v2.length ? "V2" : null, "V1", D.a1.length ? "A1" : null, D.a2.length ? "A2" : null].filter(Boolean);
          const laneH = narrow ? 34 : M.clamp(Math.round(r0.height * 0.085), 28, 44);
          const tlH = 26 + rows.length * (laneH + 6) + (step === 2 ? 22 : 0);
          if (narrow) { const fw = r0.width - 8; minH(cv, (fw - 12) * 9 / 16 + 30 + 12 + 78 + 12 + tlH + 8); } else minH(cv, 0);
          const { x, w, h } = M.fit(cv);
          const loop = D.total + 0.8;
          const t = Math.min(D.total - 1e-3, (time / 1000) % loop);
          const clip = topAt(D, t);
          const ck = clip ? clip.type + clip.s.toFixed(3) : "";
          if (ck !== lastClip) { if (lastClip) flashAt = time; lastClip = ck; }
          // 모니터
          let fx = 4, fy = 4, fw, fh;
          if (narrow) { fw = w - 8; fh = (fw - 12) * 9 / 16 + 30; }
          else { fh = h - tlH - 16; fw = Math.min(w * 0.66, (fh - 30) * 16 / 9 + 12); }
          const fr = M.art.frame(x, { x: fx, y: fy, w: fw, h: fh, aspect: 16 / 9, label: clip ? SLATE[clip.type] : "", tc: t * 1000, draw: (x, r) => { if (clip) drawShot(x, r, clip.type, t - clip.s, t); } });
          fr.overlay();
          if (clip) M.tag(x, NAME[clip.type], fr.x + 10, fr.y + fr.h - 18, { size: 11.5, fill: colOf(clip.type) });
          const fl = time < flashAt ? 0 : 1 - M.clamp((time - flashAt) / 300, 0, 1);
          if (fl > 0) { x.save(); x.strokeStyle = M.alpha(c.key, fl); x.lineWidth = 5; x.strokeRect(fr.x + 2.5, fr.y + 2.5, fr.w - 5, fr.h - 5); x.restore(); M.tag(x, "컷", fr.x + fr.w - 12, fr.y + fr.h - 18, { align: "right", size: 11.5, fill: c.key }); }
          if (D.beat) { const bp = (t % D.beat) / D.beat; M.dot(x, fr.x + fr.w - 16, fr.y + 16, 4 + 6 * (1 - bp) * (1 - bp), M.alpha(c.b, 0.4 + 0.6 * (1 - bp))); }
          // 리듬 패널: 숏 길이 막대
          let rx, ry, rw, rh;
          if (narrow) { rx = 4; ry = fy + fh + 12; rw = w - 10; rh = 78; }
          else { rx = fx + fw + 14; ry = 4; rw = w - rx - 6; rh = fh; }
          const n = D.segs.length, asl = D.total / Math.max(1, n);
          card(x, rx, ry, rw, rh, { title: "숏 길이", note: `ASL ${asl.toFixed(2)}s` });
          const bx0 = rx + 12, bw = rw - 24, by1 = ry + rh - (narrow ? 10 : 40), bTop = ry + 32;
          const maxL = Math.max(4, ...D.segs.map((q) => q.e - q.s));
          const gap = 3, bwi = Math.min(44, (bw - gap * (n - 1)) / n);
          D.segs.forEach((q, i) => {
            const L = q.e - q.s, bh = Math.max(3, ((by1 - bTop) * L) / maxL), cur = t >= q.s && t < q.e;
            M.rrect(x, bx0 + i * (bwi + gap), by1 - bh, bwi, bh, Math.min(4, bwi / 3));
            x.fillStyle = cur ? colOf(q.clip.type) : M.alpha(colOf(q.clip.type), 0.3); x.fill();
            x.strokeStyle = cur ? c.ink : M.alpha(c.ink, 0.45); x.lineWidth = 1; x.stroke();
          });
          if (!narrow) {
            const tempo = M.clamp(1 - (asl - 0.5) / 3.5, 0, 1), my = ry + rh - 20;
            M.text(x, "느림", bx0, my + 4, { size: 11 });
            const mx0 = bx0 + 32, mx1 = rx + rw - 44;
            M.rrect(x, mx0, my - 5, mx1 - mx0, 10, 5); x.fillStyle = c.sunk; x.fill();
            M.rrect(x, mx0, my - 5, Math.max(10, (mx1 - mx0) * tempo), 10, 5); x.fillStyle = c.b; x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
            M.text(x, "빠름", rx + rw - 12, my + 4, { size: 11, align: "right" });
          }
          // 타임라인
          const ty0 = (narrow ? ry + rh : fy + fh) + 12, hx = narrow ? 34 : 44;
          const X = (s) => 4 + hx + 6 + (s / D.total) * (w - 16 - hx);
          ruler(x, X, 0, D.total, ty0, D.total > 14 ? 2 : D.total > 6 ? 1 : 0.5, w);
          const top = ty0 + 22;
          rows.forEach((row, i) => {
            const y = top + i * (laneH + 6);
            trackHead(x, row, 4, y, hx, laneH, row[0] === "A" ? c.c : c.a);
            M.rrect(x, X(0), y, X(D.total) - X(0), laneH, 5); x.fillStyle = M.alpha(c.ink, 0.05); x.fill();
            const list = row === "V1" ? D.v1 : row === "V2" ? D.v2 : row === "A1" ? D.a1 : D.a2;
            for (const q of list) {
              const a0 = X(q.s) + 1, a1 = X(q.e) - 1, cw = Math.max(2, a1 - a0);
              if (row[0] === "A") {
                M.art.clip(x, { x: a0, y, w: cw, h: laneH, color: row === "A2" ? c.b : c.c, label: "" });
                M.art.waveform(x, { x: a0 + 4, y: y + 6, w: cw - 8, h: laneH - 10, seed: q.seed || 1, density: 0.5, gain: row === "A2" ? 0.8 : 1, color: M.alpha(row === "A2" ? c.b : c.c, 0.9) });
                if (cw > 120) M.tag(x, q.label, a0 + 6, y + laneH / 2, { size: 11 });
              } else {
                const cur = t >= q.s && t < q.e;
                M.art.clip(x, { x: a0, y, w: cw, h: laneH, color: colOf(q.type), label: cw > 70 ? NAME[q.type] : cw > 30 ? SLATE[q.type] : "", sub: laneH >= 34 && cw > 120 ? `${(q.e - q.s).toFixed(1)}s` : null, selected: cur,
                  thumb: (x, rr) => x.drawImage(cachedThumb(q.type, rr.w, rr.h, (q2, r2) => drawShot(q2, r2, q.type, 0.6, q.type === "aclose" ? ACT[0] + 0.7 : 0.3)), rr.x, rr.y, rr.w, rr.h) });
              }
            }
          });
          const bot = top + rows.length * (laneH + 6) - 6;
          if (D.beat) for (let b = 0; b <= D.total + 1e-6; b += D.beat) M.line(x, X(b), top - 4, X(b), bot + 2, M.alpha(c.b, 0.55), 1, [2, 3]);
          if (D.action) {
            const a0 = X(D.action[0]), a1 = X(D.action[1]);
            x.fillStyle = M.alpha(c.key, 0.2); x.fillRect(a0, top - 4, a1 - a0, bot - top + 8);
            M.tag(x, "동작 구간 · 걷기", (a0 + a1) / 2, bot + 14, { align: "center", size: 11, fill: c.key });
            M.line(x, X(cut), top - 6, X(cut), bot + 4, c.b, 2.5);
            M.tag(x, "컷", X(cut) + (X(cut) > (a0 + a1) / 2 ? 6 : -6), top + laneH / 2, { size: 11, align: X(cut) > (a0 + a1) / 2 ? "left" : "right", fill: c.b, color: c.ink });
          }
          playhead(x, X(t), ty0 + 14, bot + 4);
        },
      };
    },
  });

  /* ===== 10-4 몽타주와 쿨레쇼프 효과 ===== */
  /* 숏 그림: (x, r=프레임 안쪽 사각형, t=숏 안 시간 s) — 실제 촬영 컷처럼 배경 + 인물/소품 */
  const tableTop = (x, r, y) => {
    const c = M.col();
    x.fillStyle = "#b98a5f"; x.fillRect(r.x, y, r.w, r.y + r.h - y);
    x.fillStyle = "rgba(255,240,220,0.18)"; x.fillRect(r.x, y, r.w, r.h * 0.03);
    x.fillStyle = "rgba(60,35,15,0.12)"; x.fillRect(r.x, y + r.h * 0.12, r.w, r.y + r.h - y);
    M.line(x, r.x, y, r.x + r.w, y, c.ink, 1.2);
  };
  const wallBehind = (x, r, t) => M.art.backdrop(x, "room", { x: r.x - r.w * 0.55, y: r.y - r.h * 0.5, w: r.w * 2.1, h: r.h * 1.85, time: t * 1000 });
  const KU = {
    face(x, r, t) {
      M.art.backdrop(x, "studio", { ...r });
      M.art.head(x, { cx: r.x + r.w * 0.5, cy: r.y + r.h * 0.43, r: r.h * 0.2, who: "A", view: "front", expr: "neutral", blink: blinkAt(t, 2.6, 0.9) });
    },
    soup(x, r, t) {
      wallBehind(x, r, t); tableTop(x, r, r.y + r.h * 0.7);
      M.art.prop(x, "bowl", { cx: r.x + r.w * 0.5, cy: r.y + r.h * 0.9, s: r.h * 0.5, steam: true, time: t * 1000 });
      M.art.prop(x, "mug", { cx: r.x + r.w * 0.8, cy: r.y + r.h * 0.82, s: r.h * 0.16 });
    },
    flower(x, r, t) {
      wallBehind(x, r, t); tableTop(x, r, r.y + r.h * 0.72);
      x.save(); x.fillStyle = "rgba(40,30,45,0.12)"; x.fillRect(r.x, r.y, r.w, r.h); x.restore();
      M.art.prop(x, "flower", { cx: r.x + r.w * 0.47, cy: r.y + r.h * 0.9, s: r.h * 0.7, droop: 1 });
      const fp = (t * 0.4) % 1;
      x.fillStyle = "#e8a0a0";
      for (const [u, v, a] of [[0.62, 0.86, 0.4], [0.68, 0.88, -0.6], [0.35, 0.9, 1.1]]) { x.beginPath(); x.ellipse(r.x + r.w * u, r.y + r.h * v, r.h * 0.025, r.h * 0.014, a, 0, Math.PI * 2); x.fill(); }
      x.beginPath(); x.ellipse(r.x + r.w * (0.6 + Math.sin(fp * 7) * 0.02), r.y + r.h * (0.55 + fp * 0.3), r.h * 0.022, r.h * 0.013, fp * 4, 0, Math.PI * 2); x.globalAlpha = 1 - fp; x.fill(); x.globalAlpha = 1;
    },
    gift(x, r, t) {
      wallBehind(x, r, t); tableTop(x, r, r.y + r.h * 0.7);
      M.art.prop(x, "gift", { cx: r.x + r.w * 0.5, cy: r.y + r.h * 0.9, s: r.h * 0.42 });
      M.art.prop(x, "gift", { cx: r.x + r.w * 0.74, cy: r.y + r.h * 0.86, s: r.h * 0.22, color: "#7fa0b8" });
      for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.6, px = r.x + r.w * 0.5 + Math.cos(a) * r.h * 0.4, py = r.y + r.h * 0.42 + Math.sin(a) * r.h * 0.14, s = r.h * 0.03 * (0.6 + 0.4 * Math.sin(t * 5 + i));
        x.fillStyle = "#e0b154"; x.beginPath(); x.moveTo(px, py - s * 2); x.lineTo(px + s * 0.6, py); x.lineTo(px, py + s * 2); x.lineTo(px - s * 0.6, py); x.closePath(); x.fill(); }
    },
    shadow(x, r, t) {
      M.art.backdrop(x, "room", { x: r.x - r.w * 0.2, y: r.y - r.h * 0.35, w: r.w * 1.5, h: r.h * 1.4, time: 0 });
      M.art.prop(x, "door", { cx: r.x + r.w * 0.3, cy: r.y + r.h * 0.6, s: r.h * 0.9 });
      x.fillStyle = "rgba(14,16,30,0.55)"; x.fillRect(r.x, r.y, r.w, r.h);
      // 문틈 빛
      x.fillStyle = "rgba(255,226,170,0.55)"; x.beginPath(); x.moveTo(r.x + r.w * 0.3 + r.h * 0.22, r.y + r.h * 0.6); x.lineTo(r.x + r.w * 0.3 + r.h * 0.25, r.y + r.h * 0.6); x.lineTo(r.x + r.w * 0.95, r.y + r.h); x.lineTo(r.x + r.w * 0.62, r.y + r.h); x.closePath(); x.fill();
      // 벽에 드리운 사람 그림자: 다가올수록 커짐
      const g = 0.75 + 0.35 * Math.min(1, t / 1.6);
      x.save(); x.translate(r.x + r.w * 0.72, r.y + r.h * 0.98); x.scale(g * 1.1, g * 1.45);
      x.fillStyle = "rgba(8,8,14,0.78)";
      x.beginPath(); x.arc(0, -r.h * 0.5, r.h * 0.075, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(-r.h * 0.13, -r.h * 0.38); x.quadraticCurveTo(0, -r.h * 0.45, r.h * 0.13, -r.h * 0.38); x.lineTo(r.h * 0.11, 0); x.lineTo(-r.h * 0.11, 0); x.closePath(); x.fill();
      x.restore();
    },
    sky(kind) {
      return (x, r, t) => {
        M.art.backdrop(x, "park", { ...r, time: t * 1000 });
        const sx = r.x + r.w * 0.74, hgt = kind === "noon" ? 0.16 : kind === "dawn" ? 0.42 : 0.2;
        if (kind === "dawn") { const g = x.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, "rgba(255,170,120,0.35)"); g.addColorStop(1, "rgba(255,140,90,0.12)"); x.fillStyle = g; x.fillRect(r.x, r.y, r.w, r.h); }
        if (kind === "night") { x.fillStyle = "rgba(16,22,52,0.66)"; x.fillRect(r.x, r.y, r.w, r.h); for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(255,250,230,${0.5 + 0.5 * Math.sin(t * 3 + i)})`; x.fillRect(r.x + hash(i) * r.w, r.y + hash(i + 40) * r.h * 0.45, 1.6, 1.6); } }
        const sy = r.y + r.h * (hgt - (kind === "dawn" ? t * 0.04 : 0)), R = r.h * 0.065;
        if (kind === "night") { x.fillStyle = "#f3efd8"; x.beginPath(); x.arc(sx, sy, R, 0, Math.PI * 2); x.fill(); x.fillStyle = "rgba(16,22,52,0.9)"; x.beginPath(); x.arc(sx + R * 0.45, sy - R * 0.2, R * 0.85, 0, Math.PI * 2); x.fill(); }
        else { const gg = x.createRadialGradient(sx, sy, R * 0.6, sx, sy, R * 3); gg.addColorStop(0, "rgba(255,236,170,0.7)"); gg.addColorStop(1, "rgba(255,236,170,0)"); x.fillStyle = gg; x.fillRect(sx - R * 3, sy - R * 3, R * 6, R * 6); x.fillStyle = kind === "dawn" ? "#f3a259" : "#ffe79a"; x.beginPath(); x.arc(sx, sy, R, 0, Math.PI * 2); x.fill(); }
      };
    },
    grow(g) {
      return (x, r, t) => {
        wallBehind(x, r, t); tableTop(x, r, r.y + r.h * 0.74);
        if (g >= 1) M.art.prop(x, "flower", { cx: r.x + r.w * 0.5, cy: r.y + r.h * 0.92, s: r.h * 0.72 });
        else M.art.prop(x, "plant", { cx: r.x + r.w * 0.5, cy: r.y + r.h * 0.92, s: r.h * (0.22 + 0.5 * g) * (1 + Math.min(1, t) * 0.04) });
      };
    },
    runner(x, r, t) {
      const pan = t * 0.5;
      M.art.backdrop(x, "street", { x: r.x - r.w * 0.6 - pan * r.h, y: r.y - r.h * 0.3, w: r.w * 3, h: r.h * 1.35, time: t * 1000 });
      M.art.person(x, { cx: r.x + r.w * 0.46, cy: r.y + r.h * 0.96, h: r.h * 0.72, who: "B", view: "profile-right", pose: "walk", phase: (t * 1.9) % 1, expr: "worried" });
    },
    clock(minLeft) {
      return (x, r, t) => {
        M.art.backdrop(x, "room", { x: r.x - r.w * 1.2, y: r.y - r.h * 0.25, w: r.w * 3.2, h: r.h * 2.2, time: 0 });
        const cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.5, R = r.h * 0.34, c = M.col();
        x.fillStyle = "rgba(60,40,20,0.15)"; x.beginPath(); x.arc(cx + R * 0.06, cy + R * 0.08, R * 1.04, 0, Math.PI * 2); x.fill();
        x.fillStyle = "#3b2f29"; x.beginPath(); x.arc(cx, cy, R * 1.06, 0, Math.PI * 2); x.fill();
        x.fillStyle = "#f6f1e7"; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.2; x.stroke();
        x.strokeStyle = "#2a1d18";
        for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, big = i % 5 === 0; x.lineWidth = big ? 2.2 : 1; x.beginPath(); x.moveTo(cx + Math.sin(a) * R * (big ? 0.8 : 0.88), cy - Math.cos(a) * R * (big ? 0.8 : 0.88)); x.lineTo(cx + Math.sin(a) * R * 0.94, cy - Math.cos(a) * R * 0.94); x.stroke(); }
        const mins = 60 - minLeft + Math.min(t * 0.4, 0.9) * (minLeft > 0 ? 1 : 0), am = (mins / 60) * Math.PI * 2, ah = ((11 + mins / 60) / 12) * Math.PI * 2;
        x.lineCap = "round";
        x.lineWidth = Math.max(3, R * 0.07); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.sin(ah) * R * 0.5, cy - Math.cos(ah) * R * 0.5); x.stroke();
        x.lineWidth = Math.max(2, R * 0.045); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.sin(am) * R * 0.78, cy - Math.cos(am) * R * 0.78); x.stroke();
        const as = t * 2 * Math.PI / 6; x.strokeStyle = "#d9534f"; x.lineWidth = 1.4; x.beginPath(); x.moveTo(cx - Math.sin(as) * R * 0.15, cy + Math.cos(as) * R * 0.15); x.lineTo(cx + Math.sin(as) * R * 0.84, cy - Math.cos(as) * R * 0.84); x.stroke();
        x.fillStyle = "#2a1d18"; x.beginPath(); x.arc(cx, cy, R * 0.05, 0, Math.PI * 2); x.fill();
      };
    },
    rain(x, r, t) {
      M.art.backdrop(x, "room", { x: r.x - r.w * 0.05, y: r.y - r.h * 0.55, w: r.w * 2.4, h: r.h * 2.1, time: 0 });
      const s = r.h * 0.95, wx = r.x + r.w * 0.5, wy = r.y + r.h * 0.98;
      M.art.prop(x, "window", { cx: wx, cy: wy, s });
      x.save(); x.beginPath(); x.rect(wx - s * 0.36, wy - s * 0.94, s * 0.33, s * 0.82); x.rect(wx + s * 0.03, wy - s * 0.94, s * 0.33, s * 0.82); x.clip();
      x.fillStyle = "rgba(70,85,105,0.55)"; x.fillRect(wx - s * 0.4, wy - s, s * 0.8, s);
      x.strokeStyle = "rgba(220,232,245,0.7)"; x.lineWidth = 1.2;
      for (let i = 0; i < 40; i++) { const px = wx - s * 0.4 + hash(i) * s * 0.8, py = wy - s + ((hash(i + 3) + t * 1.4) % 1) * s * 1.1; x.beginPath(); x.moveTo(px, py); x.lineTo(px - 2, py + s * 0.05); x.stroke(); }
      x.restore();
      x.fillStyle = "rgba(30,35,50,0.2)"; x.fillRect(r.x, r.y, r.w, r.h);
    },
  };

  LESSONS.push({
    id: "kuleshov", ch: 10, order: 4,
    title: "몽타주와 쿨레쇼프 효과",
    lede: "관객은 숏 하나를 따로 읽지 않고, 앞뒤 숏과 엮어서 의미를 만듭니다. 이 레슨을 마치면 앞에 붙인 숏이 표정의 의미를 바꾸는 원리와 몽타주·교차 편집·인서트를 언제 쓰는지 알게 됩니다. 가운데 얼굴 숏은 모든 단계에서 똑같은 무표정입니다.",
    key: "숏의 의미는 숏 안이 아니라 숏과 숏 사이에서 생깁니다. 표정을 바꾸고 싶으면 앞에 붙일 숏을 바꿉니다.",
    steps: [
      ["무표정 한 숏", "표정 없는 얼굴 클로즈업 하나입니다. 눈만 가끔 깜박일 뿐, 이것만 보면 이 사람이 무슨 생각을 하는지 알 수 없습니다. 이 얼굴 숏은 다음 단계부터 <b>한 프레임도 바뀌지 않습니다</b>."],
      ["앞 숏이 의미를 바꾼다", "얼굴 앞에 김이 나는 국그릇 숏을 붙이면, 관객은 같은 얼굴에서 <b>배고픔</b>을 읽습니다. 1920년대 소련 감독 레프 쿨레쇼프가 실험으로 보여 준 현상이라 <b>쿨레쇼프 효과</b>(Kuleshov effect)라고 부릅니다. 아래 썸네일 네 개 중 하나를 눌러 앞 숏을 바꿔 보세요. 맨 아래 감정 라벨만 바뀝니다."],
      ["같은 얼굴, 다른 이야기", "세 묶음 모두 아래 얼굴은 같습니다. 위 숏만 다른데, 관객은 각 묶음에서 서로 다른 감정을 읽습니다. 배우의 연기가 모자라도 <b>편집이 감정을 만들어 줄 수 있다</b>는 뜻이고, 반대로 엉뚱한 숏을 붙이면 의도와 다른 의미가 생깁니다."],
      ["몽타주 시퀀스", "짧은 숏 여러 개를 이어 <b>시간을 압축</b>하는 것을 <b>몽타주</b>(montage)라고 합니다. 해가 뜨고 지고, 화분이 자라 꽃이 핍니다. 아래 클립 여섯 개, 약 5초로 며칠이 지나간다는 걸 설명 없이 전달합니다. 훈련, 준비, 계절의 변화를 보여 주는 장면에 흔합니다."],
      ["교차 편집", "다른 장소에서 동시에 벌어지는 두 사건을 번갈아 보여 주는 편집이 <b>교차 편집</b>(cross-cutting)입니다. 위 트랙은 달리는 사람, 아래 트랙은 정각을 향하는 벽시계입니다. 클립이 오른쪽으로 갈수록 짧아지면서 두 줄기가 만나는 순간을 향해 긴장이 쌓입니다."],
      ["인서트와 컷어웨이", "<b>인서트</b>(insert)는 같은 공간의 디테일(벽시계)을 크게 보여 주는 숏, <b>컷어웨이</b>(cutaway)는 잠시 다른 곳(창밖의 비)으로 시선을 돌리는 숏입니다. 둘 다 얼굴 숏 사이에 끼워 정보를 주거나, 대사를 잘라 낸 자리를 자연스럽게 잇는 데 씁니다. 같은 무표정이 이번엔 '기다림'으로 읽힙니다."],
    ],
    terms: [
      ["쿨레쇼프 효과", "Kuleshov effect", "같은 숏도 앞뒤 숏에 따라 다른 의미로 읽히는 현상. 편집이 연기를 보완하는 근거로 자주 인용됩니다."],
      ["몽타주", "Montage", "숏을 이어 붙여 의미를 만드는 편집. 좁게는 시간을 압축하는 짧은 숏 연속을 가리킵니다."],
      ["교차 편집", "Cross-cutting · Parallel editing", "다른 장소의 두 사건을 번갈아 보여 주는 편집. 추격·구출 장면의 긴장을 쌓을 때 씁니다."],
      ["인서트", "Insert shot", "장면 안의 물건·디테일을 크게 보여 주는 숏. 시계, 손, 편지처럼 정보를 전할 때 씁니다."],
      ["컷어웨이", "Cutaway", "주 행동에서 잠시 벗어나 다른 대상을 보여 주는 숏. 시간 경과나 편집 흔적을 가릴 때 씁니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const OPTS = [
        { label: "국그릇", draw: KU.soup, feel: "배고픔" },
        { label: "시든 꽃", draw: KU.flower, feel: "슬픔, 상실" },
        { label: "선물 상자", draw: KU.gift, feel: "기대, 반가움" },
        { label: "문간의 그림자", draw: KU.shadow, feel: "두려움, 경계" },
      ];
      let step = 0, pick = 0, speed = 1, hits = [];
      const ctl = api.controls;
      const chips = M.chips(ctl, { title: "얼굴 앞에 붙일 숏 (2단계)", items: OPTS.map((o) => o.label), value: 0, onPick: (i) => { pick = i; api.restart(); } });
      M.slider(ctl, { id: "kusp", label: "숏 길이", min: 50, max: 200, step: 5, value: 100, fmt: (v) => "× " + (v / 100).toFixed(2), onInput: (v) => (speed = v / 100) });
      const ro = M.readout(ctl);
      const F = KU.face;
      const SEQ = {
        3: [[KU.sky("dawn"), 0.9, "해 뜸", "dawn"], [KU.sky("noon"), 0.8, "한낮", "noon"], [KU.sky("night"), 0.8, "밤", "night"], [KU.grow(0.2), 0.8, "새싹", "g0"], [KU.grow(0.6), 0.8, "자람", "g1"], [KU.grow(1), 1.4, "꽃", "g2"]],
        4: [[KU.runner, 1.5, "달리는 사람", "run", 0], [KU.clock(5), 1.3, "시계 11:55", "c5", 1], [KU.runner, 1.0, "달리는 사람", "run", 0], [KU.clock(4), 0.85, "11:56", "c4", 1], [KU.runner, 0.65, "", "run", 0], [KU.clock(3), 0.5, "", "c3", 1], [KU.runner, 0.4, "", "run", 0], [KU.clock(2), 0.35, "", "c2", 1], [KU.runner, 0.3, "", "run", 0], [KU.clock(0), 0.9, "정각", "c0", 1]],
        5: [[F, 1.4, "얼굴", "face"], [KU.clock(1), 1.1, "인서트 · 벽시계", "c1"], [F, 1.1, "얼굴", "face"], [KU.rain, 1.2, "컷어웨이 · 창밖의 비", "rain"], [F, 1.3, "얼굴", "face"]],
      };
      const thumbOf = (key, draw) => (x, rr) => x.drawImage(cachedThumb("ku-" + key, rr.w, rr.h, (q, r2) => draw(q, r2, 0.5)), rr.x, rr.y, rr.w, rr.h);
      /* 뷰파인더 한 칸 */
      const shot = (x, fx, fy, fw, fh, draw, t, active, label) => {
        const c = M.col();
        const fr = M.art.frame(x, { x: fx, y: fy, w: fw, h: fh, aspect: 16 / 9, label, center: false, draw: (x, r) => draw(x, r, t) });
        fr.overlay();
        if (active) { M.rrect(x, fx - 3, fy - 3, fw + 6, fh + 6, 14); x.strokeStyle = c.key; x.lineWidth = 3; x.stroke(); }
        return fr;
      };
      const fitFrame = (aw, ah) => { const fw = Math.min(aw, (ah - 30) * 16 / 9 + 12); return [fw, (fw - 12) * 9 / 16 + 30]; };
      function readout() {
        ro.innerHTML = step === 1 ? `앞 숏: <b>${OPTS[pick].label}</b> → 관객이 읽는 감정: <b>${OPTS[pick].feel}</b>\n얼굴 숏은 그대로입니다.` :
          step === 0 ? "얼굴 숏 하나 → 감정을 정할 단서가 없습니다." :
          step === 2 ? OPTS.slice(0, 3).map((o) => `${o.label} + 얼굴 → ${o.feel}`).join("\n") :
          step === 3 ? "숏 6개, 약 5초로 며칠을 압축합니다." :
          step === 4 ? "두 장소의 숏이 번갈아 오며 점점 짧아집니다.\n숏 길이: 1.5 → 1.3 → 1.0 → … → 0.3초" : "얼굴 → 인서트 → 얼굴 → 컷어웨이 → 얼굴";
      }
      const onDown = (e) => {
        if (step !== 1) return;
        const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        const hI = hits.findIndex((b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h);
        if (hI >= 0) { pick = hI; chips.set(hI); api.restart(); readout(); }
      };
      const onMove = (e) => {
        if (step !== 1) { cv.style.cursor = ""; return; }
        const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        cv.style.cursor = hits.some((b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) ? "pointer" : "";
      };
      cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove);
      return {
        setStep(s) { step = s; readout(); },
        frame(time) {
          const c = M.col();
          const r0 = cv.getBoundingClientRect(), narrow = r0.width < 600, W0 = r0.width - 8;
          if (!narrow) minH(cv, 0);
          else if (step === 1) minH(cv, ((W0 - 12) * 9 / 16 + 30) * 2 + 34 + 140);
          else if (step === 2) minH(cv, 3 * (((W0 - 24) / 2 - 12) * 9 / 16 + 30 + 40) + 10);
          else if (step >= 3) minH(cv, (W0 - 12) * 9 / 16 + 30 + (step === 4 ? 110 : 80));
          else minH(cv, 0);
          const { x, w, h } = M.fit(cv);
          const tt = time / 1000 / speed;
          hits = [];
          if (step === 0) {
            const [fw, fh] = fitFrame(w - 8, h - 48);
            const fr = shot(x, (w - fw) / 2, 4, fw, fh, F, tt, false, "CU");
            M.callout(x, "표정: 무표정", fr.x + fr.w * 0.53, fr.y + fr.h * 0.5, fr.x + fr.w * 0.72, fr.y + fr.h * 0.5, { size: 11.5, line: "rgba(242,236,226,0.85)" });
            M.tag(x, "단서가 없으면 감정을 읽을 수 없습니다", w / 2, fh + 26, { align: "center", size: 12.5 });
          } else if (step === 1) {
            const loop = 3.4, lt = tt % loop, first = lt < 1.5, o = OPTS[pick];
            const below = 26 + 62 + 52;
            let fw, fh, ax, ay, bx, by;
            if (narrow) { [fw, fh] = fitFrame(w - 8, (h - below - 30) / 2); ax = bx = (w - fw) / 2; ay = 4; by = ay + fh + 30; }
            else { [fw, fh] = fitFrame((w - 56) / 2, h - below - 8); ax = 4; bx = w - 4 - fw; ay = by = Math.max(4, (h - fh - below) / 2); }
            shot(x, ax, ay, fw, fh, o.draw, first ? lt : 1.5, first, "숏 1");
            shot(x, bx, by, fw, fh, F, first ? 0 : lt - 1.5, !first, "숏 2");
            if (narrow) M.arrow(x, w / 2, ay + fh + 6, w / 2, by - 6, c.ink, 2);
            else M.arrow(x, ax + fw + 10, ay + fh / 2, bx - 10, ay + fh / 2, c.ink, 2);
            if (!narrow) { M.tag(x, "앞 숏: " + o.label, ax + fw / 2, ay + fh + 16, { size: 11, align: "center" }); M.tag(x, "같은 얼굴", bx + fw / 2, by + fh + 16, { size: 11, align: "center" }); }
            // 앞 숏 고르기 (썸네일 클릭)
            const py = by + fh + (narrow ? 22 : 44), n = OPTS.length, gap = 8, tw = Math.min(170, (w - 8 - gap * (n - 1)) / n), x0 = (w - (tw * n + gap * (n - 1))) / 2;
            M.text(x, "앞 숏 고르기 · 썸네일을 눌러 보세요", x0, py, { size: 11, weight: 600, color: c.muted });
            OPTS.forEach((op, i) => {
              const bx2 = x0 + i * (tw + gap), cy2 = py + 8;
              const chh = tw > 110 ? 40 : 34;
              M.art.clip(x, { x: bx2, y: cy2, w: tw, h: chh, color: i === pick ? c.key : c.a, label: tw > 110 ? op.label : "", selected: i === pick, thumb: thumbOf(["soup", "flower", "gift", "shadow"][i], op.draw) });
              if (tw <= 110) M.text(x, op.label, bx2 + tw / 2, cy2 + chh + 14, { size: 11, weight: 600, color: i === pick ? c.ink : c.muted, align: "center" });
              hits.push({ x: bx2, y: cy2, w: tw, h: chh + 16 });
            });
            M.tag(x, `관객이 읽는 감정: ${o.feel}`, w / 2, py + 8 + 40 + 28, { align: "center", size: 14, fill: c.key, h: 30, padX: 14 });
          } else if (step === 2) {
            const three = OPTS.slice(0, 3);
            if (narrow) {
              const rowH = (h - 8) / 3, [fw, fh] = fitFrame((w - 24) / 2, rowH - 34);
              three.forEach((o, i) => {
                const y = 4 + i * rowH, ph = (tt + i * 0.7) % 3.2, first = ph < 1.4;
                shot(x, 4, y, fw, fh, o.draw, first ? ph : 1.4, first, null);
                M.text(x, "+", 4 + fw + 8, y + fh / 2 + 6, { size: 16, weight: 700, color: c.ink, align: "center" });
                shot(x, w - 4 - fw, y, fw, fh, F, first ? 0 : ph - 1.4, !first, null);
                M.tag(x, `${o.label} + 얼굴 = ${o.feel}`, w / 2, y + fh + 16, { align: "center", size: 11.5, fill: c.key });
              });
            } else {
              const colW = (w - 8 - 2 * 18) / 3, [fw, fh] = fitFrame(colW, (h - 76) / 2);
              three.forEach((o, i) => {
                const x0 = 4 + i * (colW + 18) + (colW - fw) / 2, ph = (tt + i * 0.7) % 3.2, first = ph < 1.4;
                shot(x, x0, 4, fw, fh, o.draw, first ? ph : 1.4, first, null);
                M.arrow(x, x0 + fw / 2, fh + 8, x0 + fw / 2, fh + 24, c.ink, 1.5);
                shot(x, x0, fh + 30, fw, fh, F, first ? 0 : ph - 1.4, !first, null);
                M.tag(x, o.label + " + 얼굴", x0 + fw / 2, 2 * fh + 46, { align: "center", size: 11 });
                M.tag(x, "= " + o.feel, x0 + fw / 2, 2 * fh + 74 > h - 12 ? h - 14 : 2 * fh + 74, { align: "center", size: 13, fill: c.key, h: 26 });
              });
            }
          } else {
            const seq = SEQ[step];
            const total = seq.reduce((s, q) => s + q[1], 0), loop = total + 0.6;
            const lt = Math.min(total - 1e-3, tt % loop);
            let acc = 0, cur = 0;
            for (let i = 0; i < seq.length; i++) { if (lt < acc + seq[i][1]) { cur = i; break; } acc += seq[i][1]; }
            const inT = lt - acc, q = seq[cur];
            const two = step === 4, laneH = narrow ? 30 : M.clamp(h * 0.09, 30, 44), stripH = two ? laneH * 2 + 6 : laneH;
            const [fw, fh] = fitFrame(w - 8, h - stripH - 44);
            const fr = shot(x, (w - fw) / 2, 4, fw, fh, q[0], inT, false, two ? (q[4] ? "장소 B" : "장소 A") : step === 3 ? "MONTAGE" : (q[0] === F ? "CU" : "INSERT"));
            M.tag(x, q[2] || (q[4] ? "시계" : "달리는 사람"), fr.x + 10, fr.y + fr.h - 18, { size: 11.5, fill: two ? (q[4] ? c.b : c.a) : c.surface });
            // 클립 띠 (길이 비례)
            const sy = 4 + fh + 26, hx = two ? 30 : 0, sx0 = 4 + hx, sw = w - 10 - hx;
            const X = (s) => sx0 + (s / total) * sw;
            if (two) { trackHead(x, "A", 4, sy, 24, laneH, c.a); trackHead(x, "B", 4, sy + laneH + 6, 24, laneH, c.b); }
            let a = 0;
            seq.forEach((z, i) => {
              const x0 = X(a) + 1, x1 = X(a + z[1]) - 1, lane = two ? z[4] : 0;
              const col = two ? (z[4] ? c.b : c.a) : z[0] === F ? c.a : step === 3 ? (i < 3 ? c.key : c.c) : c.c;
              M.art.clip(x, { x: x0, y: sy + lane * (laneH + 6), w: x1 - x0, h: laneH, color: col, label: x1 - x0 > 90 ? (z[2] || "") : "", selected: i === cur, dim: i !== cur && false, thumb: thumbOf(z[3] + "-" + step, z[0]) });
              a += z[1];
            });
            playhead(x, X(lt), sy - 8, sy + stripH + 2);
            if (two) M.text(x, "점점 짧아짐 →", w - 6, sy - 8, { size: 11, color: c.muted, align: "right" });
          }
        },
        destroy() { cv.removeEventListener("pointerdown", onDown); cv.removeEventListener("pointermove", onMove); },
      };
    },
  });

  /* ===== 10-5 색 보정과 그레이딩 ===== */
  LESSONS.push({
    id: "color-grade", ch: 10, order: 5,
    title: "색 보정과 그레이딩",
    lede: "촬영한 그대로의 영상은 대개 흐리거나 색이 틀어져 있습니다. 이 레슨을 마치면 로그 영상을 LUT로 되살리고, 보정으로 바로잡고, 그레이딩으로 분위기를 입히는 순서와 그 판단을 돕는 스코프 읽는 법을 알게 됩니다. 왼쪽은 공원에서 찍은 한 장면, 오른쪽은 그 픽셀로 계산한 스코프입니다.",
    key: "보정이 먼저, 그레이딩은 나중. 판단은 모니터가 아니라 스코프로 하고, 피부는 벡터스코프의 스킨 톤 라인 위에 둡니다.",
    steps: [
      ["로그 촬영", "<b>로그(Log)</b>로 찍은 영상은 일부러 회색빛으로 흐립니다. 밝은 하늘부터 어두운 그늘까지 넓은 밝기 범위를 담으려고 대비를 눌러 저장했기 때문입니다. 오른쪽 <b>웨이브폼</b>(waveform)의 괄호를 보면 모든 값이 가운데 좁은 범위에 몰려 있습니다."],
      ["LUT로 표준 변환", "<b>LUT</b>(Look-Up Table)은 입력 색을 출력 색으로 바꾸는 표입니다. 카메라 제조사의 변환 LUT를 씌우면 로그 영상이 일반 화면(Rec.709)용 대비와 채도로 돌아옵니다. 화면의 흰 세로선 왼쪽이 로그, 오른쪽이 LUT를 씌운 결과이고, 아래 곡선에서 회색 로그 곡선이 S자 곡선으로 바뀝니다."],
      ["보정: 노출·화이트밸런스", "<b>보정</b>(color correction)은 '맞는 상태'로 되돌리는 일입니다. 이 장면은 조금 어둡고 노랗게 찍혔습니다. 왼쪽 회색 카드의 가운데 칸은 R·G·B가 같아야 하는데, <b>RGB 퍼레이드</b>의 표식을 보면 R이 높고 B가 낮습니다. '노출'과 '색온도' 슬라이더로 세 표식의 높이를 맞춰 보세요."],
      ["리프트·감마·게인", "밝기를 세 구역으로 나눠 다룹니다. <b>리프트</b>(lift)는 어두운 부분, <b>감마</b>(gamma)는 중간톤, <b>게인</b>(gain)은 밝은 부분을 주로 움직입니다. 아래 곡선의 세 점이 각 슬라이더가 붙잡는 자리입니다. 색 바퀴 세 개로 된 3-way 컬러 휠이 같은 원리입니다."],
      ["스코프 읽기", "<b>웨이브폼</b>은 화면 가로 위치별 밝기, <b>히스토그램</b>(histogram)은 밝기별 픽셀 수, <b>벡터스코프</b>(vectorscope)는 색상(각도)과 채도(중심에서 거리)를 보여 줍니다. 벡터스코프의 점선이 <b>스킨 톤 라인</b>으로, 사람 피부는 피부색과 관계없이 이 선 근처에 모입니다. '피부' 표식이 선 위에 있는지 보세요."],
      ["그레이딩: 틸 & 오렌지", "<b>그레이딩</b>(color grading)은 분위기를 만드는 일입니다. 대표적인 룩인 <b>틸 & 오렌지</b>(teal & orange)는 그림자를 청록으로, 밝은 부분과 피부를 주황으로 밀어 보색 대비를 만듭니다. 벡터스코프에서 점들이 '틸'과 '오렌지' 두 방향으로 갈라집니다. '룩' 칩으로 다른 분위기도 비교해 보세요."],
    ],
    terms: [
      ["보정 · 그레이딩", "Color correction · Color grading", "맞는 상태로 되돌리기 / 의도한 분위기 입히기. 컬러리스트는 항상 보정을 먼저 합니다."],
      ["로그 · LUT", "Log · LUT", "대비를 눌러 넓은 밝기를 담는 기록 방식 / 색을 다른 색으로 바꾸는 변환표. 촬영 설정과 후반 작업에서 짝으로 씁니다."],
      ["리프트 · 감마 · 게인", "Lift · Gamma · Gain", "어두운 부분 · 중간톤 · 밝은 부분 조정. DaVinci Resolve 같은 프로그램의 3-way 컬러 코렉터 이름입니다."],
      ["웨이브폼 · 벡터스코프", "Waveform · Vectorscope", "가로 위치별 밝기 분포 / 색상과 채도 분포를 보여 주는 스코프. 눈 대신 숫자로 판단할 때 봅니다."],
      ["틸 & 오렌지", "Teal & orange", "그림자는 청록, 피부와 하이라이트는 주황으로 미는 보색 룩. 상업 영화에서 가장 흔한 그레이딩입니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      /* ---- 장면: M.art 로 한 번 그려 선형 값으로 캐시 (크기·테마가 바뀔 때만 다시) ---- */
      const NL = 2048, SW = 256, SH = 144;
      let GW = 0, GH = 0, sceneKey = "", idx = null, tag = null, sIdx = new Int32Array(SW * SH);
      const imgMain = document.createElement("canvas"), imgLog = document.createElement("canvas");
      const toIdx = (lin) => Math.min(NL - 1, Math.round(Math.sqrt(M.clamp(lin, 0, 4) / 4) * (NL - 1)));
      const idxLin = new Float32Array(NL); for (let i = 0; i < NL; i++) { const u = i / (NL - 1); idxLin[i] = u * u * 4; }
      const s2l = new Float32Array(256); for (let i = 0; i < 256; i++) { const v = i / 255; s2l[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
      function buildScene(gw) {
        GW = gw; GH = Math.round(gw * 9 / 16);
        const off = document.createElement("canvas"); off.width = GW; off.height = GH;
        const q = off.getContext("2d"), W = GW, H = GH;
        M.art.backdrop(q, "park", { x: 0, y: 0, w: W, h: H, time: 0, dim: false });
        // 해
        const sx = W * 0.84, sy = H * 0.13, sr = H * 0.05;
        const g = q.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 4); g.addColorStop(0, "rgba(255,248,225,0.9)"); g.addColorStop(1, "rgba(255,248,225,0)");
        q.fillStyle = g; q.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8); q.fillStyle = "#fffaf0"; q.beginPath(); q.arc(sx, sy, sr, 0, Math.PI * 2); q.fill();
        // 회색 카드 (삼각대 위 흰·회색·검정 칸)
        const cx0 = W * 0.07, cw = W * 0.13, cy0 = H * 0.3, ch = H * 0.46, ink = M.col().ink;
        q.strokeStyle = "#3b3f44"; q.lineWidth = Math.max(2, W * 0.004);
        q.beginPath(); q.moveTo(cx0 + cw / 2, cy0 + ch); q.lineTo(cx0 + cw * 0.1, H * 0.98); q.moveTo(cx0 + cw / 2, cy0 + ch); q.lineTo(cx0 + cw * 0.9, H * 0.98); q.moveTo(cx0 + cw / 2, cy0 + ch); q.lineTo(cx0 + cw / 2, H * 0.97); q.stroke();
        q.fillStyle = "#2b2d31"; q.fillRect(cx0 - 3, cy0 - 3, cw + 6, ch + 6);
        [["#ececec", 0], ["#767676", 1], ["#151515", 2]].forEach(([col, i]) => { q.fillStyle = col; q.fillRect(cx0, cy0 + (ch / 3) * i, cw, ch / 3); });
        q.strokeStyle = ink; q.lineWidth = 1; q.strokeRect(cx0 - 3, cy0 - 3, cw + 6, ch + 6);
        // 인물: A 미디엄 숏, B 뒤쪽
        const hB = M.art.person(q, { cx: W * 0.78, cy: H * 1.12, h: H * 0.8, who: "B", view: "three-quarter-left", expr: "smile" });
        const hA = M.art.person(q, { cx: W * 0.47, cy: H * 1.36, h: H * 1.1, who: "A", view: "three-quarter-right", expr: "smile" });
        const D = q.getImageData(0, 0, W, H).data;
        idx = new Uint16Array(W * H * 3); tag = new Uint8Array(W * H);
        const skins = [hexRgb(M.art.PAL.A.skin), hexRgb(M.art.PAL.B.skin)];
        const heads = [hA.head, hB.head];
        const gx0 = cx0 + cw * 0.15, gx1 = cx0 + cw * 0.85, gy0 = cy0 + ch / 3 + ch * 0.05, gy1 = cy0 + (2 * ch) / 3 - ch * 0.05;
        for (let y = 0; y < H; y++) for (let x2 = 0; x2 < W; x2++) {
          const p = y * W + x2, o = p * 4;
          const r = s2l[D[o]], gg = s2l[D[o + 1]], b = s2l[D[o + 2]];
          const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b, boost = l > 0.62 ? 1 + (l - 0.62) * 4.2 : 1;
          idx[p * 3] = toIdx(r * boost); idx[p * 3 + 1] = toIdx(gg * boost); idx[p * 3 + 2] = toIdx(b * boost);
          if (x2 >= gx0 && x2 <= gx1 && y >= gy0 && y <= gy1) tag[p] = 1;
          else for (let k = 0; k < 2; k++) {
            const hd = heads[k]; if (!hd) continue;
            if (Math.hypot(x2 - hd.x, y - hd.y) < hd.r * 1.05) { const s = skins[k]; if (Math.abs(D[o] - s[0]) + Math.abs(D[o + 1] - s[1]) + Math.abs(D[o + 2] - s[2]) < 110 && D[o] > D[o + 2] + 20) { tag[p] = 2; break; } }
          }
        }
        for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) sIdx[j * SW + i] = Math.floor(((j + 0.5) * H) / SH) * W + Math.floor(((i + 0.5) * W) / SW);
        imgMain.width = imgLog.width = W; imgMain.height = imgLog.height = H;
        cardBox = { x: cx0 / W, y: (cy0 + ch / 3) / H, w: cw / W, h: ch / 3 / H };
        skinPt = { x: hA.head.x / W + hA.head.r / W * 0.25, y: hA.head.y / H + hA.head.r / H * 0.4 };
        lastKey = "";
      }
      let cardBox = null, skinPt = null;

      const CAST_T = 35, CAST_EV = -0.6;
      const LOOKS = {
        none: { lift: [0, 0, 0], gamma: [0, 0, 0], gain: [0, 0, 0], sat: 1 },
        teal: { lift: [-0.04, 0.025, 0.08], gamma: [0.02, 0, -0.03], gain: [0.04, -0.01, -0.08], sat: 1.1 },
        cool: { lift: [-0.01, 0.01, 0.05], gamma: [-0.04, 0, 0.05], gain: [-0.06, 0, 0.07], sat: 0.9 },
        faded: { lift: [0.09, 0.085, 0.07], gamma: [0, 0, 0], gain: [-0.08, -0.08, -0.1], sat: 0.7 },
      };
      const LOOKNAME = { none: "", teal: "TEAL & ORANGE", cool: "COOL", faded: "FADED" };
      const P = { ev: 0, temp: 0, lift: 0, gamma: 1, gain: 1, sat: 1, look: "none" };
      let step = 0;
      const ctl = api.controls;
      const sEv = M.slider(ctl, { id: "cgev", label: "노출 (보정)", min: -2, max: 2, step: 0.05, value: 0, fmt: (v) => (v > 0 ? "+" : "") + v.toFixed(2) + " EV", onInput: (v) => (P.ev = v) });
      const sT = M.slider(ctl, { id: "cgtemp", label: "색온도 (보정)", min: -100, max: 100, value: 0, fmt: (v) => (v < 0 ? "차갑게 " : v > 0 ? "따뜻하게 " : "") + v, onInput: (v) => (P.temp = v) });
      const sL = M.slider(ctl, { id: "cglift", label: "리프트 (어두운 부분)", min: -0.2, max: 0.2, step: 0.01, value: 0, fmt: (v) => v.toFixed(2), onInput: (v) => (P.lift = v) });
      const sG = M.slider(ctl, { id: "cggam", label: "감마 (중간톤)", min: 0.5, max: 2, step: 0.01, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => (P.gamma = v) });
      const sN = M.slider(ctl, { id: "cggain", label: "게인 (밝은 부분)", min: 0.5, max: 1.5, step: 0.01, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => (P.gain = v) });
      const sSat = M.slider(ctl, { id: "cgsat", label: "채도", min: 0, max: 2, step: 0.05, value: 1, fmt: (v) => Math.round(v * 100) + "%", onInput: (v) => (P.sat = v) });
      const lookKeys = ["none", "teal", "cool", "faded"];
      const cL = M.chips(ctl, { title: "룩 (그레이딩)", items: ["없음", "틸 & 오렌지", "차갑게", "바랜 필름"], value: 0, onPick: (i) => (P.look = lookKeys[i]) });
      const ro = M.readout(ctl);
      const CODE = [
        "// 프래그먼트 셰이더 한 픽셀의 색 처리 순서",
        "vec3 c = texture(logFootage, uv).rgb;",
        "c = lutLogTo709(c);                 // 1. 변환 LUT",
        "c *= exp2(exposure);                // 2. 보정: 노출",
        "c *= vec3(exp2(t), 1.0, exp2(-t));  //    화이트밸런스",
        "c = gain * (c + lift * (1.0 - c));  // 3. 리프트·게인",
        "c = pow(max(c, 0.0), 1.0 / gamma);  //    감마",
        "float y = dot(c, vec3(0.2126, 0.7152, 0.0722));",
        "c = mix(vec3(y), c, saturation);    // 4. 채도",
        "c = texture(lookLUT, c).rgb;        // 5. 그레이딩 룩",
      ].join("\n");
      const HLS = [[[0, 1]], [[2, 2]], [[3, 4]], [[5, 6]], [[7, 8]], [[5, 6], [9, 9]]];

      const logEnc = (v) => M.clamp((Math.log2(v + 0.01) + 7) / 9.6, 0, 1);
      const disp = (v) => { v = Math.max(0, v); if (v > 0.8) v = 0.8 + 0.25 * (1 - Math.exp(-(v - 0.8) / 0.25)); v = Math.min(1, v); return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; };
      const lggOf = (look) => { const L = LOOKS[look]; return [0, 1, 2].map((i) => ({ lift: P.lift + L.lift[i], gamma: P.gamma * (1 + L.gamma[i] * 3), gain: P.gain * (1 + L.gain[i]) })); };
      const tf = (v, q) => Math.pow(Math.max(0, q.gain * (v + q.lift * (1 - v))), 1 / q.gamma);
      /* 채널별 1D LUT (노출·WB·변환·LGG 를 한 표로) */
      const LUT = [new Float32Array(NL), new Float32Array(NL), new Float32Array(NL)], LOGT = [new Float32Array(NL), new Float32Array(NL), new Float32Array(NL)];
      let SAT = 1, GRADE = false;
      function buildLUT() {
        const ch = lggOf(P.look), tm = [Math.pow(2, (CAST_T + P.temp) / 150), 1, Math.pow(2, -(CAST_T + P.temp) / 150)], ex = Math.pow(2, CAST_EV + P.ev);
        GRADE = step >= 2; SAT = P.sat * LOOKS[P.look].sat;
        for (let k = 0; k < 3; k++) for (let i = 0; i < NL; i++) {
          const v = idxLin[i] * tm[k] * ex;
          LUT[k][i] = GRADE ? tf(disp(v), ch[k]) : disp(v);
          LOGT[k][i] = logEnc(v);
        }
      }
      const px3 = (p, log, o) => {
        const T = log ? LOGT : LUT;
        let r = T[0][idx[p * 3]], g = T[1][idx[p * 3 + 1]], b = T[2][idx[p * 3 + 2]];
        const s = log ? 0.55 : GRADE ? SAT : 1;
        if (s !== 1) { const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; r = y + (r - y) * s; g = y + (g - y) * s; b = y + (b - y) * s; }
        o[0] = M.clamp(r, 0, 1); o[1] = M.clamp(g, 0, 1); o[2] = M.clamp(b, 0, 1);
      };
      let cardRGB = [0, 0, 0], skin = [0, 0, 0];
      function processImage(cvOut, log) {
        const q = cvOut.getContext("2d"), im = q.createImageData(GW, GH), D = im.data, o = [0, 0, 0];
        let cn = 0, sn = 0; const cs = [0, 0, 0], ss = [0, 0, 0];
        for (let p = 0, n = GW * GH; p < n; p++) {
          px3(p, log, o);
          D[p * 4] = o[0] * 255; D[p * 4 + 1] = o[1] * 255; D[p * 4 + 2] = o[2] * 255; D[p * 4 + 3] = 255;
          if (!log) { if (tag[p] === 1) { cs[0] += o[0]; cs[1] += o[1]; cs[2] += o[2]; cn++; } else if (tag[p] === 2) { ss[0] += o[0]; ss[1] += o[1]; ss[2] += o[2]; sn++; } }
        }
        q.putImageData(im, 0, 0);
        if (!log) { cardRGB = cs.map((v) => v / Math.max(1, cn)); skin = ss.map((v) => v / Math.max(1, sn)); }
      }
      /* ---- 스코프 (192×108 표본으로 계산) ---- */
      const SO = new Float32Array(SW * SH * 3), WB = 100;
      const mkC = (w2, h2) => { const q = document.createElement("canvas"); q.width = w2; q.height = h2; return q; };
      const wfL = mkC(SW, WB), wfP = mkC(SW * 3, WB), cnt = new Float32Array(SW * 3 * WB);
      let lumaLo = 0, lumaHi = 1;
      function sampleScopes(wipe) {
        const o = [0, 0, 0], ls = [];
        for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
          const s = j * SW + i; px3(sIdx[s], step === 0 || (step === 1 && i / SW < wipe), o);
          SO[s * 3] = o[0]; SO[s * 3 + 1] = o[1]; SO[s * 3 + 2] = o[2];
          if ((s & 15) === 0) ls.push(0.2126 * o[0] + 0.7152 * o[1] + 0.0722 * o[2]);
        }
        ls.sort((a, b) => a - b); lumaLo = ls[Math.floor(ls.length * 0.02)]; lumaHi = ls[Math.floor(ls.length * 0.98)];
        const c = M.col();
        for (const parade of [false, true]) {
          const nch = parade ? 3 : 1, cw = SW * nch; cnt.fill(0);
          for (let s = 0; s < SW * SH; s++) {
            const i = s % SW;
            if (parade) for (let k = 0; k < 3; k++) cnt[(k * SW + i) * WB + Math.min(WB - 1, Math.floor(SO[s * 3 + k] * WB))]++;
            else { const l = 0.2126 * SO[s * 3] + 0.7152 * SO[s * 3 + 1] + 0.0722 * SO[s * 3 + 2]; cnt[i * WB + Math.min(WB - 1, Math.floor(l * WB))]++; }
          }
          const cols = (parade ? [c.b, c.c, c.a] : [c.c]).map(hexRgb);
          const q = parade ? wfP : wfL, qx = q.getContext("2d"), id = qx.createImageData(cw, WB);
          for (let col = 0; col < cw; col++) {
            const rgb = cols[Math.floor(col / SW)], base = col * WB;
            for (let b = 0; b < WB; b++) {
              const n = cnt[base + b] + 0.45 * ((b > 0 ? cnt[base + b - 1] : 0) + (b < WB - 1 ? cnt[base + b + 1] : 0)); if (n < 0.4) continue;
              const o2 = ((WB - 1 - b) * cw + col) * 4;
              id.data[o2] = rgb[0]; id.data[o2 + 1] = rgb[1]; id.data[o2 + 2] = rgb[2]; id.data[o2 + 3] = Math.min(255, 60 + n * 38);
            }
          }
          qx.putImageData(id, 0, 0);
        }
      }
      const scopeBox = (x, bx, by, bw, bh, title) => { card(x, bx, by, bw, bh, { title }); return { ix: bx + 34, iy: by + 30, iw: bw - 46, ih: bh - 40 }; };
      function waveform(x, c, bx, by, bw, bh, parade) {
        const { ix, iy, iw, ih } = scopeBox(x, bx, by, bw, bh, parade ? "RGB 퍼레이드" : "웨이브폼 (밝기)");
        M.rrect(x, ix, iy, iw, ih, 3); x.fillStyle = M.alpha(c.ink, 0.06); x.fill();
        for (const v of [0, 50, 100]) { const yy = iy + ih - (v / 100) * ih; M.line(x, ix, yy, ix + iw, yy, M.alpha(c.ink, 0.15), 1, [2, 3]); M.text(x, String(v), ix - 6, yy + 4, { size: 11, mono: true, align: "right" }); }
        x.save(); x.imageSmoothingEnabled = true; x.filter = "blur(0.4px)"; x.drawImage(parade ? wfP : wfL, ix, iy, iw, ih); x.restore();
        if (parade) {
          const colW = iw / 3, cols = [c.b, c.c, c.a];
          for (let k = 0; k < 3; k++) {
            M.text(x, "RGB"[k], ix + (k + 0.5) * colW, iy + 13, { size: 11, weight: 700, color: cols[k], align: "center" });
            if (step === 2 && cardBox) {
              const yy = iy + ih - cardRGB[k] * ih, x0 = ix + k * colW + cardBox.x * colW, x1 = x0 + Math.max(10, cardBox.w * colW);
              M.line(x, x0 - 3, yy, x1 + 3, yy, c.ink, 2.5);
              if (k === 2) M.callout(x, `카드 R ${Math.round(cardRGB[0] * 100)} · G ${Math.round(cardRGB[1] * 100)} · B ${Math.round(cardRGB[2] * 100)}`, x1 + 3, yy, ix + iw - 4, iy + ih - 10, { size: 11, align: "right" });
            }
          }
        } else if (step <= 1) {
          const y0 = iy + ih - lumaHi * ih, y1 = iy + ih - lumaLo * ih, bxx = ix + iw - 8;
          x.save(); x.strokeStyle = c.ink; x.lineWidth = 1.5; x.beginPath(); x.moveTo(bxx - 5, y0); x.lineTo(bxx, y0); x.lineTo(bxx, y1); x.lineTo(bxx - 5, y1); x.stroke(); x.restore();
          M.tag(x, `값 범위 ${Math.round(lumaLo * 100)}~${Math.round(lumaHi * 100)}`, bxx - 10, (y0 + y1) / 2, { size: 11, align: "right", fill: step === 0 ? c.key : c.surface });
        }
      }
      function histogram(x, c, bx, by, bw, bh) {
        card(x, bx, by, bw, bh, { title: "히스토그램" });
        const ix = bx + 12, iy = by + 30, iw = bw - 24, ih = bh - 52;
        const N = 64, hs = new Float32Array(N);
        for (let s = 0; s < SW * SH; s++) { const l = 0.2126 * SO[s * 3] + 0.7152 * SO[s * 3 + 1] + 0.0722 * SO[s * 3 + 2]; hs[Math.min(N - 1, Math.floor(l * N))]++; }
        let mx = 0; for (let b = 0; b < N; b++) mx = Math.max(mx, hs[b]);
        x.beginPath(); x.moveTo(ix, iy + ih);
        for (let b = 0; b < N; b++) { const hh = Math.sqrt(hs[b] / mx) * ih; x.lineTo(ix + ((b + 0.5) * iw) / N, iy + ih - hh); }
        x.lineTo(ix + iw, iy + ih); x.closePath(); x.fillStyle = M.alpha(c.a, 0.25); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
        M.line(x, ix, iy + ih, ix + iw, iy + ih, c.ink, 1);
        M.text(x, "어두움", ix, iy + ih + 15, { size: 11 }); M.text(x, "밝음", ix + iw, iy + ih + 15, { size: 11, align: "right" });
      }
      function vectorscope(x, c, bx, by, bw, bh) {
        card(x, bx, by, bw, bh, { title: "벡터스코프" });
        const R = Math.max(20, Math.min(bw - 24, bh - 44) / 2), cx = bx + bw / 2, cy = by + 28 + (bh - 32) / 2;
        M.dot(x, cx, cy, R, M.alpha(c.ink, 0.06), M.alpha(c.ink, 0.6));
        M.dot(x, cx, cy, R * 0.5, null, M.alpha(c.ink, 0.15));
        M.line(x, cx - R, cy, cx + R, cy, M.alpha(c.ink, 0.15), 1); M.line(x, cx, cy - R, cx, cy + R, M.alpha(c.ink, 0.15), 1);
        const SC = R / 0.42;
        const toXY = (r, g, b) => { const cb = -0.1146 * r - 0.3854 * g + 0.5 * b, cr = 0.5 * r - 0.4542 * g - 0.0458 * b; return [cx + cb * SC, cy - cr * SC]; };
        for (const [lab, rgb] of [["R", [1, 0, 0]], ["Y", [1, 1, 0]], ["G", [0, 1, 0]], ["C", [0, 1, 1]], ["B", [0, 0, 1]], ["M", [1, 0, 1]]]) {
          const [px, py] = toXY(...rgb.map((v) => v * 0.75));
          x.strokeStyle = c.muted; x.lineWidth = 1; x.strokeRect(px - 4, py - 4, 8, 8);
          if (R > 46) M.text(x, lab, px + (px > cx ? 8 : -8), py + 4, { size: 11, mono: true, align: px > cx ? "left" : "right" });
        }
        const a = (123 * Math.PI) / 180;
        M.line(x, cx, cy, cx + Math.cos(a) * R, cy - Math.sin(a) * R, c.ink, 1.25, [4, 3]);
        x.fillStyle = M.alpha(c.c, 0.32);
        for (let s = 0; s < SW * SH; s += 3) { const [px, py] = toXY(SO[s * 3], SO[s * 3 + 1], SO[s * 3 + 2]); x.fillRect(px - 0.7, py - 0.7, 1.4, 1.4); }
        const [sx, sy] = toXY(...skin);
        if (step >= 4 && R > 40) M.callout(x, "피부", sx, sy, Math.min(bx + bw - 30, sx + R * 0.55 + 10), sy - R * 0.35, { size: 11, fill: c.key });
        if (R > 70 && step === 4) M.text(x, "스킨 톤 라인", cx + Math.cos(a) * R * 0.95, cy - Math.sin(a) * R * 0.95 - 6, { size: 11, color: c.ink, align: "left" });
        if (step === 5 && P.look === "teal" && R > 40) {
          const tp = toXY(0.1, 0.35, 0.4), op = toXY(0.75, 0.45, 0.2);
          M.tag(x, "틸", tp[0], tp[1], { size: 11, align: "center", fill: c.c });
          M.tag(x, "오렌지", op[0], op[1] - 10, { size: 11, align: "center", fill: c.key });
        }
        M.dot(x, sx, sy, 4, c.key, c.ink);
      }
      function curve(x, c, bx, by, bw, bh) {
        card(x, bx, by, bw, bh, { title: step <= 1 ? "장면 밝기(스톱) → 화면 값" : "입력 → 출력 곡선" });
        const ix = bx + 14, iy = by + 30, iw = bw - 28, ih = bh - 52;
        M.rrect(x, ix, iy, iw, ih, 3); x.fillStyle = M.alpha(c.ink, 0.04); x.fill(); x.strokeStyle = M.alpha(c.ink, 0.3); x.lineWidth = 1; x.stroke();
        M.line(x, ix, iy + ih, ix + iw, iy, M.alpha(c.ink, 0.15), 1, [3, 3]);
        const plot = (f, col, wd = 2) => { x.strokeStyle = col; x.lineWidth = wd; x.beginPath(); for (let k = 0; k <= 64; k++) { const u = k / 64, v = M.clamp(f(u), 0, 1); const px = ix + u * iw, py = iy + ih - v * ih; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); };
        if (step <= 1) {
          const st = (u) => Math.pow(2, M.lerp(-7, 3.5, u)) * 0.18;
          plot((u) => logEnc(st(u)), step === 0 ? c.a : M.alpha(c.ink, 0.35), step === 0 ? 2.5 : 1.5);
          if (step === 1) plot((u) => disp(st(u)), c.b, 2.5);
          M.tag(x, "로그", ix + iw * 0.72, iy + ih * (1 - logEnc(st(0.72))) + 16, { size: 11, fill: step === 0 ? c.a : c.surface });
          if (step === 1) M.tag(x, "LUT 후 · Rec.709", ix + iw * 0.38, iy + ih * (1 - disp(st(0.38))) - 14, { size: 11, fill: c.b, align: "right" });
          M.text(x, iw > 230 ? "어두움 ← 장면 밝기 → 밝음" : "어두움 → 밝음", ix + iw / 2, iy + ih + 15, { size: 11, align: "center" });
        } else {
          const ch = lggOf(P.look), cols = [c.b, c.c, c.a];
          if (P.look === "none") plot((u) => tf(u, ch[0]), c.ink, 2.5);
          else ch.forEach((q, k) => plot((u) => tf(u, q), cols[k], 2));
          if (step === 3) {
            const q = ch[0];
            [[0.08, "리프트"], [0.5, "감마"], [0.92, "게인"]].forEach(([u, n], i) => {
              const px = ix + u * iw, py = iy + ih - M.clamp(tf(u, q), 0, 1) * ih;
              M.dot(x, px, py, 5, c.key, c.ink);
              M.tag(x, n, px, i === 0 ? py - 16 : i === 2 ? py + 16 : py - 18, { size: 11, align: i === 0 ? "left" : i === 2 ? "right" : "center" });
            });
          }
          if (iw > 230) { M.text(x, "어두운 부분", ix, iy + ih + 15, { size: 11 }); M.text(x, "중간톤", ix + iw / 2, iy + ih + 15, { size: 11, align: "center" }); M.text(x, "밝은 부분", ix + iw, iy + ih + 15, { size: 11, align: "right" }); }
          else { M.text(x, "어두움", ix, iy + ih + 15, { size: 11 }); M.text(x, "밝음", ix + iw, iy + ih + 15, { size: 11, align: "right" }); }
        }
      }
      function readout() {
        const d = Math.max(...cardRGB) - Math.min(...cardRGB);
        const sk = Math.atan2(0.5 * skin[0] - 0.4542 * skin[1] - 0.0458 * skin[2], -0.1146 * skin[0] - 0.3854 * skin[1] + 0.5 * skin[2]) * 180 / Math.PI;
        ro.innerHTML = `회색 카드 R/G/B: ${cardRGB.map((v) => Math.round(v * 100)).join(" / ")}\n색 틀어짐: <b>${(d * 100).toFixed(1)}</b> ${d < 0.02 ? "(중립)" : "(0에 가까울수록 중립)"}\n피부 색상각: ${sk.toFixed(0)}° (스킨 톤 라인 123°)`;
      }
      let lastKey = "", lastWipe = -1;
      const SCOPES = [["wave"], ["wave"], ["parade"], ["wave", "hist"], ["wave", "vec", "hist"], ["vec", "parade"]];
      return {
        setStep(s) {
          step = s;
          const fix = s >= 3;
          Object.assign(P, { ev: fix ? -CAST_EV : 0, temp: fix ? -CAST_T : 0, lift: 0, gamma: 1, gain: 1, sat: 1, look: s === 5 ? "teal" : "none" });
          if (s === 3) { P.lift = 0.05; P.gain = 1.08; P.gamma = 1.12; }
          sEv.set(P.ev); sT.set(P.temp); sL.set(P.lift); sG.set(P.gamma); sN.set(P.gain); sSat.set(P.sat); cL.set(lookKeys.indexOf(P.look));
          api.code(CODE, HLS[s], "GLSL · 색 처리 순서");
          lastKey = "";
        },
        frame(time) {
          const c = M.col();
          const r0 = cv.getBoundingClientRect(), narrow = r0.width < 600;
          const scopes = SCOPES[step];
          if (narrow) { const fw = r0.width - 8; minH(cv, (fw - 12) * 9 / 16 + 30 + 12 + Math.ceil((scopes.length + 1) / 2) * 172); } else minH(cv, 0);
          const { x, w, h } = M.fit(cv);
          // 배치
          let fw, fh, fx = 4, fy = 4, colW;
          if (narrow) { fw = w - 8; fh = (fw - 12) * 9 / 16 + 30; colW = fw; }
          else { colW = Math.round(w * 0.6); fw = Math.min(colW, (Math.min(h * 0.64, h - 140) - 30) * 16 / 9 + 12); fh = (fw - 12) * 9 / 16 + 30; fx = 4 + (colW - fw) / 2; }
          // 장면 해상도: 화면 픽셀에 맞춤 (최대 1280)
          const dpr = window.devicePixelRatio || 1, want = Math.round(M.clamp((fw - 12) * dpr, 320, 1280) / 32) * 32;
          const sk = want + "|" + c.ink;
          if (sk !== sceneKey) { sceneKey = sk; buildScene(want); }
          const wipe = step === 1 ? 0.5 + 0.35 * Math.sin(time / 900) : 1;
          const keyS = JSON.stringify(P) + step + c.c + c.b + c.a;
          if (keyS !== lastKey) { lastKey = keyS; buildLUT(); processImage(imgMain, false); if (step <= 1) processImage(imgLog, true); lastWipe = -1; }
          if (Math.abs(wipe - lastWipe) > 0.002) { lastWipe = wipe; sampleScopes(wipe); }
          readout();
          const fr = M.art.frame(x, { x: fx, y: fy, w: fw, h: fh, aspect: 16 / 9, center: false, label: ["LOG", "LOG → LUT", "보정", "LIFT · GAMMA · GAIN", "REC.709", LOOKNAME[P.look] || "GRADE"][step], tc: 754000 + (time % 8000), draw: (x, r) => {
            x.imageSmoothingEnabled = true;
            x.drawImage(step === 0 ? imgLog : imgMain, r.x, r.y, r.w, r.h);
            if (step === 1) { const wx = r.x + wipe * r.w; x.save(); x.beginPath(); x.rect(r.x, r.y, wx - r.x, r.h); x.clip(); x.drawImage(imgLog, r.x, r.y, r.w, r.h); x.restore(); }
          } });
          if (step === 1) {
            const wx = fr.x + wipe * fr.w; M.line(x, wx, fr.y, wx, fr.y + fr.h, "#ffffff", 2);
            M.tag(x, "로그", wx - 8, fr.y + 18, { size: 11, align: "right" }); M.tag(x, "LUT", wx + 8, fr.y + 18, { size: 11 });
          }
          if (step === 2 && cardBox) M.callout(x, "회색 카드: R=G=B 여야 함", fr.x + (cardBox.x + cardBox.w) * fr.w, fr.y + (cardBox.y + cardBox.h / 2) * fr.h, fr.x + (cardBox.x + cardBox.w) * fr.w + 30, fr.y + fr.h * 0.12, { size: 11, fill: c.key, line: "rgba(242,236,226,0.9)" });
          if (step === 4 && skinPt) M.callout(x, "피부", fr.x + skinPt.x * fr.w, fr.y + skinPt.y * fr.h, fr.x + skinPt.x * fr.w + fr.w * 0.12, fr.y + skinPt.y * fr.h - fr.h * 0.1, { size: 11, fill: c.key, line: "rgba(242,236,226,0.9)" });
          const draw = (k, bx, by, bw, bh) => k === "wave" ? waveform(x, c, bx, by, bw, bh, false) : k === "parade" ? waveform(x, c, bx, by, bw, bh, true) : k === "hist" ? histogram(x, c, bx, by, bw, bh) : vectorscope(x, c, bx, by, bw, bh);
          if (narrow) {
            const cells = ["curve", ...scopes], cw = (w - 8 - 10) / 2, y0 = fy + fh + 12;
            cells.forEach((k, i) => { const bx = 4 + (i % 2) * (cw + 10), by = y0 + Math.floor(i / 2) * 172; k === "curve" ? curve(x, c, bx, by, cw, 160) : draw(k, bx, by, cw, 160); });
          } else {
            const right = step === 4 ? ["wave", "vec"] : scopes;
            if (step === 4) histogram(x, c, 4, fy + fh + 12, colW, h - fh - 22); else curve(x, c, 4, fy + fh + 12, colW, h - fh - 22);
            const sx = colW + 18, sw = w - sx - 6, n = right.length, gh = (h - 10 - (n - 1) * 12) / n;
            right.forEach((k, i) => draw(k, sx, 4 + i * (gh + 12), sw, gh));
          }
        },
      };
    },
  });

  /* ===== 10-6 소리 편집의 기본 ===== */
  LESSONS.push({
    id: "sound-edit", ch: 10, order: 6,
    title: "소리 편집의 기본",
    lede: "관객은 흐린 화면은 참아도 거슬리는 소리는 참지 못합니다. 이 레슨을 마치면 영상의 소리를 다섯 층으로 나눠 쌓고, 룸톤·페이드·덕킹·라우드니스로 다듬는 순서를 알게 됩니다. 소리는 나지 않고, 파형과 미터로 봅니다.",
    key: "대사가 언제나 먼저 들려야 합니다. 빈틈은 룸톤으로 메우고, 클립 끝엔 짧은 페이드, 음악은 대사 아래로 덕킹, 마지막에 라우드니스를 목표값에 맞춥니다.",
    steps: [
      ["소리의 층", "영상의 소리는 보통 다섯 층입니다. <b>대사</b>(dialogue), 공간의 바탕 소리인 <b>앰비언스</b>(ambience), 발소리·옷 스치는 소리처럼 화면의 동작을 따로 녹음한 <b>폴리</b>(foley), 문 닫힘 같은 <b>효과음</b>(SFX), 그리고 <b>음악</b>입니다. 왼쪽 트랙 머리의 이름과 아래 미터를 맞춰 보세요. 층을 나눠 두어야 하나만 고치기 쉽습니다."],
      ["룸톤으로 빈틈 메우기", "대사 사이의 숨소리나 실수를 잘라 내면 그 자리가 <b>완전한 무음</b>이 됩니다. 방에 있던 낮은 웅웅거림이 갑자기 사라지면 관객은 '뭔가 끊겼다'고 느낍니다. 촬영장에서 30초쯤 아무도 말하지 않고 녹음한 <b>룸톤</b>(room tone)을 빈 자리에 깔아 메웁니다. 지금 대사 트랙의 빗금 친 '무음' 칸을 보고, '룸톤 깔기'를 켜 보세요."],
      ["페이드로 클릭 없애기", "파형이 0이 아닌 지점에서 클립을 뚝 자르면 스피커가 순간적으로 튀면서 <b>딸깍</b>(click) 소리가 납니다. 아래 확대 그림처럼 클립 끝에 수 ms~수십 ms의 짧은 <b>페이드</b>(fade)를 걸면 파형이 0으로 내려앉아 잡음이 사라집니다. 지금은 페이드가 0ms라 빨간 표시가 보입니다. '페이드 길이'를 10ms 안팎으로 올려 보세요."],
      ["덕킹", "대사가 나오는 동안 음악을 낮췄다가 대사가 끝나면 다시 올리는 것이 <b>덕킹</b>(ducking)입니다. 음악 트랙 위의 노란 선이 볼륨 <b>오토메이션</b>(automation)이고, 지금 점점 깊어집니다. 보통 대사 구간에서 음악을 10~15dB 낮춥니다. 대사를 사이드체인(sidechain) 입력으로 쓰는 컴프레서로 자동화하기도 합니다."],
      ["라우드니스 (LUFS)", "최종 믹스는 순간 최고점(피크)이 아니라 사람이 느끼는 평균 크기, <b>라우드니스</b>(loudness)로 맞춥니다. 단위는 <b>LUFS</b>입니다. 유튜브·스트리밍은 대략 -14 LUFS, 방송은 -23 LUFS(유럽) 또는 -24 LKFS(미국·한국)를 기준으로 삼습니다. 아래 그래프의 '통합' 점선을 '목표' 선에 '마스터 게인'으로 맞춰 보세요."],
    ],
    terms: [
      ["앰비언스 · 룸톤", "Ambience · Room tone", "공간의 바탕 소리 / 그 공간의 '조용함'을 녹음한 소리. 대사 편집의 빈틈을 메울 때 씁니다."],
      ["폴리", "Foley", "발소리·옷 소리 등 화면 속 동작에 맞춰 따로 녹음한 소리. 현장 녹음에서 빠진 디테일을 채웁니다."],
      ["페이드", "Fade in · out", "소리를 0에서 올리거나 0으로 내리는 짧은 볼륨 변화. 클립 경계의 클릭 잡음을 막을 때 씁니다."],
      ["덕킹", "Ducking · Sidechain", "한 소리(대사)가 나올 때 다른 소리(음악)를 자동으로 낮추는 처리. 내레이션 위에 음악을 깔 때 씁니다."],
      ["라우드니스", "Loudness · LUFS", "사람 귀가 느끼는 평균 크기. 플랫폼마다 목표값이 있어 최종 마스터를 맞출 때 씁니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const T = 12;
      const CLIPS = [[0.4, 3.3], [3.9, 6.5], [8.3, 11.4]];
      const PHR = [[0.6, 3.0], [4.1, 6.2], [8.6, 11.1]];
      const GAPS = [[0, 0.4], [3.3, 3.9], [6.5, 8.3], [11.4, T]];
      let step = 0, room = true, fadeMs = 12, duck = 0, master = 0, target = -14, autoDuck = true;
      const ctl = api.controls;
      const cR = M.check(ctl, { id: "serm", label: "룸톤 깔기 (2단계)", checked: true, onChange: (v) => (room = v) });
      const sF = M.slider(ctl, { id: "sefd", label: "페이드 길이 (3단계)", min: 0, max: 40, value: 12, unit: " ms", onInput: (v) => (fadeMs = v) });
      const sD = M.slider(ctl, { id: "sedk", label: "덕킹 깊이 (4단계)", min: -24, max: 0, value: 0, unit: " dB", onInput: (v) => { duck = v; autoDuck = false; } });
      const sM = M.slider(ctl, { id: "semg", label: "마스터 게인 (5단계)", min: -12, max: 12, step: 0.5, value: 0, fmt: (v) => (v > 0 ? "+" : "") + v.toFixed(1) + " dB", onInput: (v) => (master = v) });
      M.chips(ctl, { title: "라우드니스 목표", items: ["스트리밍 -14", "방송 -23"], value: 0, onPick: (i) => (target = i ? -23 : -14) });
      const ro = M.readout(ctl);
      const CODE = [
        "# 1) 대사 클립 앞뒤에 10ms 페이드 (클릭 방지)",
        "ffmpeg -i dia.wav -af \"afade=t=in:d=0.01,afade=t=out:st=2.89:d=0.01\" dia_f.wav",
        "",
        "# 2) 덕킹: 대사(1번 입력)가 나오면 음악(0번)을 누른다",
        "ffmpeg -i music.wav -i dia.wav -filter_complex \\",
        "  \"[0][1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[m]\" \\",
        "  -map \"[m]\" music_ducked.wav",
        "",
        "# 3) 최종 믹스를 -14 LUFS, 트루 피크 -1 dBTP 로",
        "ffmpeg -i mix.wav -af loudnorm=I=-14:TP=-1:LRA=11 master.wav",
      ].join("\n");
      const HLS = [[], [], [[0, 1]], [[3, 6]], [[8, 9]]];
      const TR = [
        { id: "dia", name: "대사", en: "DX", seed: 2, dens: 0.55 },
        { id: "amb", name: "앰비언스", en: "AMB", seed: 5, dens: 0.8 },
        { id: "fol", name: "폴리", en: "FOL", seed: 8, dens: 0.6 },
        { id: "sfx", name: "효과음", en: "SFX", seed: 13, dens: 0.6 },
        { id: "mus", name: "음악", en: "MX", seed: 21, dens: 0.45 },
      ];
      const inC = (t) => CLIPS.find(([a, b]) => t >= a && t < b);
      const fadeEnv = (t) => { const cl = inC(t); if (!cl) return 0; const f = fadeMs / 1000; if (f <= 0) return 1; return Math.min(1, (t - cl[0]) / f, (cl[1] - t) / f); };
      const voice = (t) => { const p = PHR.find(([a, b]) => t >= a && t < b); if (!p) return 0; const e = Math.min(1, (t - p[0]) * 6, (p[1] - t) * 6); return e * (0.35 + 0.5 * Math.abs(Math.sin(t * 9.3)) * (0.6 + 0.4 * Math.sin(t * 2.1))); };
      const duckGain = (t) => {
        if (!duck) return 1;
        const g = Math.pow(10, duck / 20); let m = 0;
        for (const [a, b] of PHR) m = Math.max(m, sstep(a - 0.35, a, t) * (1 - sstep(b, b + 0.6, t)));
        return 1 - (1 - g) * m;
      };
      const env = {
        dia: (t) => { if (inC(t)) return (0.06 + voice(t)) * fadeEnv(t); return room ? 0.06 : 0; },
        amb: (t) => 0.13 + 0.04 * Math.sin(t * 1.7) + 0.02 * Math.sin(t * 5.3),
        fol: (t) => { let a = 0; for (let k = 0; k < 5; k++) { const tk = 6.7 + k * 0.38; if (t >= tk) a = Math.max(a, 0.5 * Math.exp(-(t - tk) * 22)); } return a; },
        sfx: (t) => (t >= 7.9 ? 0.95 * Math.exp(-(t - 7.9) * 5) : 0),
        mus: (t) => 0.5 * (0.75 + 0.25 * Math.exp(-((t % 0.5) * 10))) * duckGain(t),
      };
      const NORM = { dia: 0.85, amb: 0.3, fol: 0.5, sfx: 0.95, mus: 0.55 };
      const W8 = { dia: 1, amb: 0.7, fol: 0.8, sfx: 1, mus: 0.9 };
      const momentary = (t) => { let e = 0; for (let k = 0; k < 8; k++) { const tt = t - k * 0.05; if (tt < 0) continue; for (const tr of TR) { const a = env[tr.id](tt); e += W8[tr.id] * a * a / 8; } } return e; };
      const lufs = (e) => 10 * Math.log10(Math.max(1e-7, e)) - 11 + master;
      function integrated() { let s = 0, n = 0; for (let t = 0; t < T; t += 0.05) { const e = momentary(t); if (lufs(e) > -60) { s += e; n++; } } return lufs(s / Math.max(1, n)); }
      function readout(t) {
        let s;
        if (step === 1) s = !room ? "대사 클립 사이 빈틈: <b>디지털 무음</b> 4곳\n방의 바탕 소리가 뚝 끊겼다 돌아옵니다." : "빈틈 4곳을 룸톤으로 메웠습니다.\n대사 트랙의 바닥 소리가 끊기지 않습니다.";
        else if (step === 2) s = fadeMs < 2 ? "페이드 없음 → 클립 끝마다 <b>딸깍</b> 소리" : `페이드 ${fadeMs}ms → 파형이 0으로 내려앉아 깨끗함`;
        else if (step === 3) { const dd = 20 * Math.log10(0.5 * Math.pow(10, duck / 20) / 0.55); s = `대사 구간 음악: <b>${duck} dB</b>\n대사 대비 음악 크기: 약 ${dd.toFixed(0)} dB` + (duck > -6 ? "\n→ 음악이 대사를 가립니다" : "\n→ 대사가 또렷하게 들립니다"); }
        else if (step === 4) { const I = integrated(), d = I - target; s = `통합 라우드니스 <b>${I.toFixed(1)} LUFS</b> · 목표 ${target}\n` + (Math.abs(d) < 1 ? "목표에 맞음 (±1 LU)" : d > 0 ? `${d.toFixed(1)} LU 큼 → 플랫폼이 자동으로 줄입니다` : `${(-d).toFixed(1)} LU 작음 → 다른 영상보다 작게 들립니다`); }
        else s = `재생 위치 ${t.toFixed(2)}s · 다섯 층이 동시에 섞여 들립니다.`;
        ro.innerHTML = s;
      }
      /* 파형 캐시 (트랙·크기·색이 같으면 재사용). 엔벨로프는 세로로 잘라 늘려 그림 */
      const wcache = new Map();
      const waveImg = (tr, w, h, col) => {
        const d = window.devicePixelRatio || 1, k = `${tr.id}|${Math.round(w)}|${Math.round(h)}|${col}|${d}`;
        let q = wcache.get(k);
        if (!q) {
          if (wcache.size > 20) wcache.clear();
          q = document.createElement("canvas"); q.width = Math.max(1, Math.round(w * d)); q.height = Math.max(1, Math.round(h * d));
          const qx = q.getContext("2d"); qx.scale(d, d); M.art.waveform(qx, { x: 0, y: 0, w, h, seed: tr.seed, density: tr.dens, gain: 1.6, color: col });
          wcache.set(k, q);
        }
        return { img: q, d };
      };
      const drawEnv = (x, W, x0, x1, X0, mid, H, f) => {
        const { img, d } = W;
        for (let px = Math.max(x0, X0); px < x1; px += 2) {
          const g = M.clamp(f(px), 0, 1); if (g < 0.015) continue;
          const sh = H * g, sw = Math.min(2, x1 - px);
          x.drawImage(img, (px - X0) * d, 0, sw * d, img.height, px, mid - sh / 2, sw, sh);
        }
      };
      return {
        setStep(s) {
          step = s; room = s !== 1; cR.set(room);
          fadeMs = s === 2 ? 0 : 12; sF.set(fadeMs);
          duck = s >= 3 ? (s === 3 ? 0 : -12) : 0; sD.set(duck); autoDuck = s === 3;
          master = s === 4 ? 4 : 0; sM.set(master);
          api.code(s >= 2 ? CODE : null, HLS[s], "ffmpeg");
        },
        frame(time) {
          const c = M.col();
          const r0 = cv.getBoundingClientRect(), narrow = r0.width < 600;
          if (narrow) minH(cv, 26 + 5 * (36 + 6) + 12 + 180); else minH(cv, 0);
          const { x, w, h } = M.fit(cv);
          const loop = T + 0.6, t = Math.min(T - 1e-3, (time / 1000) % loop);
          if (step === 3 && autoDuck) { const p = M.cycle(time, 2400, 1e9); duck = Math.round(M.lerp(0, -12, M.ease.inOut(p))); sD.set(duck); }
          readout(t);
          const hx = narrow ? 58 : 98, laneH = narrow ? 36 : M.clamp(Math.floor((h * 0.6 - 26) / 5 - 6), 26, 60);
          const X0 = 4 + hx + 8, X1 = w - 6, X = (s) => X0 + (s / T) * (X1 - X0), y0 = 24;
          ruler(x, X, 0, T, y0 - 20, 1, w);
          const cols = { dia: c.a, amb: c.c, fol: c.key, sfx: c.b, mus: c.muted };
          const HERO = [null, "dia", "dia", "mus", null][step];
          TR.forEach((tr, i) => {
            const y = y0 + i * (laneH + 6), mid = y + laneH / 2, col = cols[tr.id];
            // 트랙 머리
            M.rrect(x, 4, y, hx, laneH, 6); x.fillStyle = c.surface; x.fill(); x.strokeStyle = HERO === tr.id ? c.ink : M.alpha(c.ink, 0.5); x.lineWidth = HERO === tr.id ? 1.5 : 1; x.stroke();
            x.fillStyle = col; x.fillRect(5, y + 5, 4, laneH - 10);
            if (laneH >= 34) { M.text(x, tr.name, 16, mid - 2, { size: 12, weight: 700, color: c.ink }); M.text(x, tr.en, 16, mid + 13, { size: 11, mono: true }); }
            else M.text(x, narrow ? tr.en : `${tr.name} · ${tr.en}`, 16, mid + 4, { size: 11, weight: 700, color: c.ink });
            M.rrect(x, X(0), y, X(T) - X(0), laneH, 5); x.fillStyle = M.alpha(c.ink, 0.04); x.fill();
            x.save(); x.globalAlpha = HERO && HERO !== tr.id ? 0.4 : 1;
            const clipList = tr.id === "dia" ? CLIPS : tr.id === "fol" ? [[6.5, 8.4]] : tr.id === "sfx" ? [[7.6, 9.4]] : [[0, T]];
            const WI = waveImg(tr, X(T) - X(0), laneH - 8, col);
            const fAt = (px) => env[tr.id](((px - X(0)) / (X(T) - X(0))) * T) / NORM[tr.id];
            for (const [a, b] of clipList) {
              M.art.clip(x, { x: X(a) + 1, y, w: X(b) - X(a) - 2, h: laneH, color: col, label: "" });
              drawEnv(x, WI, X(a) + 3, X(b) - 3, X(0), mid + 1, laneH - 10, fAt);
            }
            if (tr.id === "dia") {
              for (const [a, b] of GAPS) {
                const ga = X(a) + 1, gw = X(b) - X(a) - 2; if (gw < 3) continue;
                if (room) {
                  M.art.clip(x, { x: ga, y: y + laneH * 0.22, w: gw, h: laneH * 0.56, color: c.c, label: "" });
                  drawEnv(x, WI, ga + 2, ga + gw - 2, X(0), mid, laneH - 10, () => 0.08);
                  if (gw > 46 && step === 1) M.tag(x, "룸톤", ga + gw / 2, mid, { size: 11, align: "center" });
                } else {
                  x.save(); M.rrect(x, ga, y + 2, gw, laneH - 4, 4); x.clip();
                  for (let k = -laneH; k < gw; k += 6) M.line(x, ga + k, y + laneH, ga + k + laneH, y, M.alpha(c.b, 0.6), 1);
                  x.restore();
                  if (gw > 46 && step === 1) M.tag(x, "무음", ga + gw / 2, mid, { size: 11, align: "center", fill: c.b });
                }
              }
              const fw = Math.max(3, Math.min(18, fadeMs * 0.45));
              for (const [a, b] of CLIPS) {
                if (fadeMs > 0) {
                  x.fillStyle = M.alpha(c.ink, 0.45);
                  x.beginPath(); x.moveTo(X(a) + 1, y + 1); x.lineTo(X(a) + 1 + fw, y + 1); x.lineTo(X(a) + 1, y + 1 + fw); x.fill();
                  x.beginPath(); x.moveTo(X(b) - 1, y + 1); x.lineTo(X(b) - 1 - fw, y + 1); x.lineTo(X(b) - 1, y + 1 + fw); x.fill();
                } else for (const e of [X(a) + 1, X(b) - 1]) { M.line(x, e, y - 2, e, y + laneH + 2, c.b, 2.5); }
              }
              if (fadeMs <= 0 && step === 2) M.tag(x, "딸깍", X(CLIPS[0][1]) + 4, y + laneH / 2, { size: 11, fill: c.b });
            }
            x.restore();
            if (tr.id === "mus" && step >= 3) {
              const Yd = (db) => y + 4 + (-db / 24) * (laneH - 8);
              x.strokeStyle = c.key; x.lineWidth = 2.25; x.beginPath();
              for (let px = X(0); px <= X(T); px += 2) { const tt = ((px - X(0)) / (X(T) - X(0))) * T, yy = Yd(20 * Math.log10(duckGain(tt))); px === X(0) ? x.moveTo(px, yy) : x.lineTo(px, yy); }
              x.stroke();
              if (duck) for (const [a, b] of PHR) for (const tt of [a - 0.35, a, b, b + 0.6]) M.dot(x, X(tt), Yd(20 * Math.log10(duckGain(tt))), 3.5, c.key, c.ink);
              if (duck <= -3) M.tag(x, `${duck} dB`, X((PHR[1][0] + PHR[1][1]) / 2), Yd(duck) - 12 < y ? y + 10 : Yd(duck) - 12, { size: 11, align: "center", fill: c.key, mono: true });
            }
          });
          const tlBot = y0 + TR.length * (laneH + 6) - 6;
          playhead(x, X(t), y0 - 6, tlBot + 3);
          // 아래 패널
          const by = tlBot + 14, bh = h - by - 8;
          if (step === 2) {
            card(x, 4, by, w - 10, bh, { title: "확대: 첫 대사 클립의 끝", note: "3.3s 앞뒤 40ms" });
            const ix = 20, iw = w - 42, mid = by + 28 + (bh - 36) / 2, A = (bh - 44) * 0.42, cutX = ix + iw * 0.5;
            M.line(x, ix, mid, ix + iw, mid, M.alpha(c.ink, 0.2), 1);
            M.line(x, cutX, by + 30, cutX, by + bh - 8, c.muted, 1, [3, 3]);
            M.text(x, "컷", cutX + 5, by + 42, { size: 11, color: c.muted });
            const f = fadeMs / 1000;
            x.strokeStyle = c.a; x.lineWidth = 2; x.beginPath();
            for (let k = 0; k <= iw; k++) {
              const tt = -0.04 + (k / iw) * 0.08;
              let g = tt < 0 ? 1 : 0; if (f > 0 && tt < 0) g = Math.min(1, -tt / f);
              const v = Math.sin(tt * 2 * Math.PI * 180 + 1.1) * g;
              k ? x.lineTo(ix + k, mid - v * A) : x.moveTo(ix + k, mid - v * A);
            }
            x.stroke();
            if (f > 0) {
              const fx0 = cutX - (f / 0.04) * (iw / 2);
              M.line(x, ix, mid - A, fx0, mid - A, c.key, 1.5, [4, 3]); M.line(x, fx0, mid - A, cutX, mid, c.key, 1.5, [4, 3]);
              M.tag(x, `페이드 아웃 ${fadeMs}ms`, Math.max(ix + 70, fx0), mid - A - 2, { size: 11, fill: c.key, align: "right" });
              M.callout(x, "0에서 끝남 → 조용함", cutX, mid, cutX + 26, mid + A * 0.6, { size: 11 });
            } else {
              const v0 = Math.sin(1.1);
              M.line(x, cutX, mid - v0 * A, cutX, mid, c.b, 3);
              if (w > 560) M.callout(x, "0이 아닌 값에서 뚝 끊김 = 딸깍", cutX, mid - v0 * A * 0.5, cutX + 40, mid - v0 * A * 0.5, { size: 11, fill: c.b });
              else M.callout(x, "뚝 끊김 = 딸깍", cutX, mid - v0 * A * 0.5, cutX + 26, mid + A * 0.55, { size: 11, fill: c.b });
            }
          } else if (step === 4) {
            card(x, 4, by, w - 10, bh, { title: "순간 라우드니스 (LUFS)" });
            const ix = X(0), iw = X(T) - X(0), top = by + 30, gh = bh - 40;
            const Y = (l) => top + ((-5 - M.clamp(l, -45, -5)) / 40) * gh;
            for (const l of [-10, -20, -30, -40]) { M.line(x, ix, Y(l), ix + iw, Y(l), M.alpha(c.ink, 0.12), 1, [2, 3]); M.text(x, String(l), ix - 6, Y(l) + 4, { size: 11, mono: true, align: "right" }); }
            x.beginPath(); x.moveTo(ix, top + gh);
            for (let k = 0; k <= 160; k++) { const tt = (k / 160) * T; x.lineTo(ix + (k / 160) * iw, Y(lufs(momentary(tt)))); }
            x.lineTo(ix + iw, top + gh); x.closePath(); x.fillStyle = M.alpha(c.a, 0.18); x.fill();
            x.strokeStyle = c.a; x.lineWidth = 1.75; x.beginPath();
            for (let k = 0; k <= 160; k++) { const tt = (k / 160) * T, l = lufs(momentary(tt)); k ? x.lineTo(ix + (k / 160) * iw, Y(l)) : x.moveTo(ix, Y(l)); }
            x.stroke();
            const I = integrated();
            M.line(x, ix, Y(target), ix + iw, Y(target), c.b, 2);
            M.line(x, ix, Y(I), ix + iw, Y(I), c.ink, 1.75, [6, 4]);
            const tY = Y(target), iY = Y(I), sep = Math.abs(tY - iY) < 22;
            M.tag(x, `목표 ${target}`, ix + iw - 4, tY, { size: 11, align: "right", fill: c.b, mono: true });
            M.tag(x, `통합 ${I.toFixed(1)}`, sep ? ix + iw - 110 : ix + iw - 4, iY, { size: 11, align: "right", mono: true });
          } else {
            card(x, 4, by, w - 10, bh, { title: "재생 위치의 레벨 (dBFS)" });
            const items = [...TR.map((tr) => [tr.name, env[tr.id](t), cols[tr.id], tr.id]), ["믹스", Math.sqrt(TR.reduce((s, tr) => s + env[tr.id](t) ** 2, 0)), c.ink, "mix"]];
            const n = items.length, gx0 = 44, gw = (w - 10 - gx0 - 12) / n, top = by + 34, mh = bh - 66;
            for (const db of [0, -20, -40, -60]) { const yy = top + mh * (-db / 60); M.line(x, gx0 - 2, yy, w - 14, yy, M.alpha(c.ink, 0.1), 1, [2, 3]); M.text(x, String(db), gx0 - 6, yy + 4, { size: 11, mono: true, align: "right" }); }
            items.forEach(([nm, a, col, id], k) => {
              const db = a > 0 ? 20 * Math.log10(a) : -60, f = M.clamp((db + 60) / 60, 0, 1);
              const bw = Math.min(26, gw * 0.42), bx = gx0 + k * gw + (gw - bw) / 2;
              x.save(); x.globalAlpha = HERO && HERO !== id && !(step === 3 && id === "dia") ? 0.4 : 1;
              M.rrect(x, bx, top, bw, mh, 4); x.fillStyle = M.alpha(c.ink, 0.06); x.fill();
              if (f > 0) { M.rrect(x, bx, top + mh * (1 - f), bw, mh * f, 4); x.fillStyle = M.alpha(col, 0.55); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke(); }
              M.rrect(x, bx, top, bw, mh, 4); x.strokeStyle = M.alpha(c.ink, 0.5); x.lineWidth = 1; x.stroke();
              M.text(x, nm, bx + bw / 2, top + mh + 16, { size: 11, weight: 600, color: c.ink, align: "center" });
              x.restore();
            });
            if (step === 3) {
              const dd = 20 * Math.log10(Math.max(1e-4, env.dia(t))) - 20 * Math.log10(Math.max(1e-4, env.mus(t)));
              M.tag(x, voice(t) > 0.05 ? `대사가 음악보다 ${dd.toFixed(0)} dB 큼` : "대사 없음 · 음악이 다시 올라옴", w - 18, by + 18, { size: 11, align: "right", fill: dd > 8 || voice(t) <= 0.05 ? c.surface : c.b });
            }
            if (step === 1 && !room && !inC(t)) M.tag(x, "대사 트랙: 완전한 무음", w - 18, by + 18, { size: 11, align: "right", fill: c.b });
          }
        },
      };
    },
  });
})();
