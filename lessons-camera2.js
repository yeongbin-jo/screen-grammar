/* 카메라와 편집 (2): shot-sizes, angles, composition, axis-180, focus-dof
   인물·소품·배경은 M.art(art.js), 도면·2.5D 장면은 CamKit(lessons-camera.js). */
(() => {
  const CK = () => window.CamKit;
  const TAU = Math.PI * 2;

  /* 인물 A 의 기준 좌표(키 100 단위, 발 y=0) — M.art.person 반환값에서 얻음 */
  let REF = null;
  const ref = () => {
    if (REF) return REF;
    const off = document.createElement("canvas"); off.width = off.height = 4;
    const o = off.getContext("2d");
    REF = M.art.person(o, { cx: 0, cy: 0, h: 100, who: "A", view: "front" });
    return REF;
  };

  /* ===== 숏 크기 ===== */
  const SHOTS = [
    { k: "ECU", ko: "익스트림 클로즈업", en: "Extreme close-up", short: "눈", dist: "아주 가까움", use: "눈빛, 손끝, 버튼 하나. 감정의 절정이나 결정적 단서를 강조합니다." },
    { k: "CU", ko: "클로즈업", en: "Close-up", short: "얼굴", dist: "친밀함", use: "얼굴 전체. 표정이 곧 내용이 됩니다." },
    { k: "MCU", ko: "미디엄 클로즈업", en: "Medium close-up", short: "가슴 위", dist: "대화 상대", use: "가슴 위. 인터뷰와 대화의 기본 크기입니다." },
    { k: "MS", ko: "미디엄 숏", en: "Medium shot", short: "허리 위", dist: "사회적 거리", use: "허리 위. 손짓과 표정이 함께 보여 설명 영상의 표준입니다." },
    { k: "MLS", ko: "미디엄 롱 숏", en: "Medium long · Knee shot", short: "무릎 위", dist: "관찰 시작", use: "무릎 위. '카우보이 숏'이라고도 합니다. 자세와 행동이 함께 읽힙니다." },
    { k: "FS", ko: "풀 숏", en: "Full shot", short: "전신", dist: "무대 위 인물", use: "머리부터 발끝까지. 자세, 걸음, 춤처럼 몸 전체가 말할 때 씁니다." },
    { k: "LS", ko: "롱 숏", en: "Long shot · Wide", short: "인물+공간", dist: "멀리서 봄", use: "인물과 그가 선 장소. 누가 어디에 있는지 보여 줍니다." },
    { k: "ELS", ko: "익스트림 롱 숏", en: "Extreme long shot", short: "풍경", dist: "아주 멀리", use: "장소를 알려 주는 설정 숏. 인물은 풍경 속 작은 점입니다." },
  ];
  /* 숏 → 크롭(키 100 단위): {cx, cy, fh} */
  function cropOf(i) {
    const R = ref(), hy = R.head.y, hr = R.head.r, ey = R.eyes.y;
    const tb = (top, bot) => ({ cx: 0, cy: (top + bot) / 2, fh: bot - top });
    switch (SHOTS[i].k) {
      case "ECU": return { cx: 0, cy: ey + hr * 0.08, fh: hr * 1.3 };
      case "CU": return tb(hy - hr * 1.32, hy + hr * 1.55);
      case "MCU": return tb(hy - hr * 1.55, -64);
      case "MS": return tb(hy - hr * 1.75, -45);
      case "MLS": return tb(hy - hr * 1.9, -25);
      case "FS": return tb(-110, 7);
      case "LS": return { cx: 60, cy: -70, fh: 280 };
      default: return { cx: 330, cy: -260, fh: 1000 };
    }
  }
  /* 크롭 상태로 장면 그리기 (r: 화면 사각형) */
  function drawShot(x, r, cur, time) {
    const sc = r.h / cur.fh;
    const X = (u) => r.x + r.w / 2 + (u - cur.cx) * sc, Y = (u) => r.y + r.h / 2 + (u - cur.cy) * sc;
    const hor = -72, Hb = 1300, Wb = 4200;
    x.fillStyle = "#d4e5ea"; x.fillRect(r.x, r.y, r.w, r.h);
    M.art.backdrop(x, "park", { x: X(-Wb / 2 + 400), y: Y(hor - 0.62 * Hb), w: Wb * sc, h: Hb * sc, time });
    const gb = Y(hor + 0.38 * Hb);
    if (gb < r.y + r.h) { x.fillStyle = "#9fc289"; x.fillRect(r.x, gb, r.w, r.y + r.h - gb); }
    const bottom = cur.cy + cur.fh / 2;
    const R = ref(), expr = cur.fh < 60 ? "worried" : "neutral";
    if (bottom < -62) return M.art.head(x, { cx: X(R.head.x), cy: Y(R.head.y), r: R.head.r * sc, who: "A", view: "front", expr, cut: -58 });
    return M.art.person(x, { cx: X(0), cy: Y(0), h: 100 * sc, who: "A", view: "front", expr });
  }

  LESSONS.push({
    id: "shot-sizes", ch: 8, order: 1,
    title: "숏 크기와 감정의 거리",
    lede: "같은 인물이라도 프레임이 몸의 어디를 자르느냐에 따라 관객이 느끼는 거리가 달라집니다. 이 레슨을 마치면 ECU부터 ELS까지 여덟 가지 숏 크기의 이름과 쓰임을 구별할 수 있습니다.",
    key: "장소를 먼저 넓게 보여 주고(설정 숏), 감정이 커질수록 한 단계씩 다가갑니다. 숏 크기는 관객과 인물 사이의 거리입니다.",
    steps: [
      ["롱 숏: 여기는 어디인가", "<b>익스트림 롱 숏(ELS)</b>은 A를 풍경 속 작은 점으로 담습니다. 장면 첫머리에서 장소를 알려 주는 <b>설정 숏</b>으로 씁니다. 조금 다가간 <b>롱 숏(LS)</b>은 A와 그가 선 공원을 함께 보여 줍니다. 오른쪽 몸 그림의 노란 띠가 화면에 담기는 범위입니다."],
      ["풀 숏: 온몸", "머리부터 발끝까지 들어오는 <b>풀 숏(FS)</b>입니다. 표정보다 <b>자세와 동작</b>이 정보입니다. 화면 위아래에 여유를 조금 두어 머리와 발이 모서리에 닿지 않게 합니다."],
      ["미디엄 숏: 대화의 거리", "무릎 위에서 자르면 <b>미디엄 롱 숏(MLS)</b>, 허리 아래에서 자르면 <b>미디엄 숏(MS)</b>입니다. 손짓과 표정이 함께 보여 설명·대화 장면의 기본이 됩니다. 관절 바로 위가 아니라 <b>관절 사이</b>를 자르면 안정적입니다. 노란 띠의 아래 끝이 어디에 걸리는지 보세요."],
      ["클로즈업: 감정의 거리", "가슴 위 <b>미디엄 클로즈업(MCU)</b>, 얼굴 전체 <b>클로즈업(CU)</b>입니다. 이제 표정이 곧 내용입니다. A의 걱정스러운 눈썹이 화면의 주인공이 되고, 관객은 그 감정을 자기 것처럼 느끼기 시작합니다."],
      ["익스트림 클로즈업", "눈, 입술, 손끝처럼 <b>한 부분만</b> 담습니다. 일상에서 이렇게 가까이 보는 일은 거의 없어서 강한 긴장이나 강조로 읽힙니다. 한 장면에 한두 번이면 충분합니다. 자주 쓰면 힘이 빠집니다."],
      ["감정의 사다리", "멀리서 가까이로 한 칸씩 내려오면 관객도 A에게 한 걸음씩 다가갑니다. 대화 장면은 보통 <b>넓게 시작해 감정이 커질수록 좁혀 갑니다</b>. '직접 해보기'의 칩으로 숏을 골라 보세요."],
    ],
    terms: [
      ["숏 크기", "Shot size", "프레임이 인물을 어디까지 담는지. ECU · CU · MCU · MS · MLS · FS · LS · ELS 순으로 넓어집니다."],
      ["설정 숏", "Establishing shot", "장면 첫머리에서 장소와 상황을 알려 주는 넓은 숏."],
      ["카우보이 숏", "Cowboy shot", "허벅지·무릎 근처에서 자르는 미디엄 롱 숏. 니 숏(knee shot)이라고도 합니다."],
      ["인서트", "Insert shot", "손, 화면, 물건처럼 디테일을 보여 주려고 끼워 넣는 짧은 클로즈업."],
      ["커버리지", "Coverage", "한 장면을 여러 숏 크기로 나눠 찍어 두는 것. 편집에서 고를 재료가 됩니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const STEP_SHOTS = [[7, 6], [5], [4, 3], [2, 1], [0], [7, 6, 5, 4, 3, 2, 1, 0]];
      let step = 0, pick = null, shown = 7, lastShown = -1;
      const c0 = cropOf(7), cur = { cx: c0.cx, cy: c0.cy, lf: Math.log(c0.fh) };
      const chips = M.chips(api.controls, { title: "숏 고르기", items: SHOTS.map((s) => s.k), value: 7, onPick: (i) => { pick = i; } });
      const ro = M.readout(api.controls);
      const show = (i) => {
        if (i === lastShown) return; lastShown = i;
        const s = SHOTS[i]; chips.set(i);
        ro.innerHTML = `<b>${s.k} · ${s.ko}</b>\n${s.en}\n거리감: ${s.dist}\n${s.use}`;
      };
      return {
        setStep(s) { step = s; pick = null; },
        frame(time, dt) {
          const c = M.col();
          const r0 = cv.getBoundingClientRect();
          CK().minH(cv, r0.width < 560 ? r0.width * 9 / 16 + 30 + 110 : 0);
          const { x, w, h } = M.fit(cv);
          const list = STEP_SHOTS[step], per = step === 5 ? 1500 : 2600;
          shown = pick != null ? pick : list[Math.floor(time / per) % list.length];
          show(shown);
          const T = cropOf(shown);
          cur.cx = CK().approach(cur.cx, T.cx, dt, 150); cur.cy = CK().approach(cur.cy, T.cy, dt, 150); cur.lf = CK().approach(cur.lf, Math.log(T.fh), dt, 150);
          const st = { cx: cur.cx, cy: cur.cy, fh: Math.exp(cur.lf) };
          const S = SHOTS[shown];
          const wide = w / h > 1.15;
          const stripH = wide && h > 380 ? Math.min(96, h * 0.21) : 0;
          const hTop = h - (stripH ? stripH + 12 : 0);
          let F;
          if (wide) { let fw = w * 0.7, fh = fw * 9 / 16 + 30; if (fh > hTop) { fh = hTop; fw = (hTop - 30) * 16 / 9; } F = { x: 0, y: (hTop - fh) / 2, w: fw, h: fh }; }
          else { const fw = w, fh = Math.min(h - 100, fw * 9 / 16 + 30); F = { x: 0, y: 0, w: fw, h: fh }; }
          const fr = M.art.frame(x, { ...F, aspect: 16 / 9, label: S.k, rec: true, time, draw: (x, r) => drawShot(x, r, st, time) });
          CK().tag(x, `${S.k} · ${S.ko}`, fr.x + 10, fr.y + fr.h - 20, { size: 12, fill: c.key });
          if (stripH) CK().strip(x, { x: 0, y: h - stripH, w, h: stripH }, SHOTS.slice().reverse(), 7 - shown, (i, cx, rr) => { const j = 7 - i, cp = cropOf(j); drawShot(cx, rr, { cx: cp.cx, cy: cp.cy, fh: cp.fh }, 0); }, "shot-sizes");
          if (wide) {
            // 몸 그림 + 크롭 띠 + 목록
            const P = { x: F.w + 16, y: F.y, w: w - F.w - 19, h: F.h - 3 };
            CK().panel(x, P.x, P.y, P.w, P.h, "어디서 자르나");
            const R = ref();
            const figTop = P.y + 58, figBot = P.y + P.h - 14, figH = (figBot - figTop) / 1.1, fx = P.x + 34;
            const s = figH / 100, U = (u) => figBot + u * s;
            M.art.person(x, { cx: fx, cy: figBot, h: figH, who: "A", view: "front", shadow: false, alpha: 0.9 });
            const t0 = st.cy - st.fh / 2, t1 = st.cy + st.fh / 2;
            const yA = M.clamp(U(t0), figTop - 12, figBot + 4), yB = M.clamp(U(t1), figTop - 12, figBot + 4);
            x.fillStyle = M.alpha(c.key, 0.3); x.fillRect(fx - 30, yA, 60, yB - yA);
            M.line(x, fx - 32, yA, fx + 32, yA, c.ink, 1.5); M.line(x, fx - 32, yB, fx + 32, yB, c.ink, 1.5);
            if (st.fh > 140) CK().tag(x, "+ 풍경", fx - 22, P.y + 44, { size: 11, fill: c.key });
            const lx = P.x + 76, rh = Math.min(30, (P.h - 92) / 8);
            SHOTS.forEach((sh, i) => {
              const yy = P.y + 38 + i * rh + rh / 2, on = i === shown;
              if (on) { M.rrect(x, lx - 6, yy - rh / 2 + 2, P.w - 82, rh - 4, 7); x.fillStyle = M.alpha(c.key, 0.35); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke(); }
              M.text(x, sh.k, lx + 2, yy + 1, { mono: true, size: 11.5, weight: 700, color: on ? c.ink : c.muted, base: "middle" });
              if (P.w > 170) M.text(x, sh.short, lx + 42, yy + 1, { size: 11.5, color: on ? c.ink : c.muted, base: "middle", weight: on ? 650 : 500 });
            });
            M.text(x, "↑ 가까이 · 친밀", lx, P.y + P.h - 26, { size: 11, color: c.muted });
            M.text(x, "↓ 멀리 · 관찰", lx, P.y + P.h - 10, { size: 11, color: c.muted });
          } else {
            const ly = F.h + 14, cw = (w - 3) / 8;
            SHOTS.forEach((sh, i) => {
              const on = i === shown, cx0 = i * cw;
              M.rrect(x, cx0 + 2, ly, cw - 4, 30, 7); x.fillStyle = on ? M.alpha(c.key, 0.4) : c.surface; x.fill();
              x.strokeStyle = on ? c.ink : M.alpha(c.ink, 0.3); x.lineWidth = 1; x.stroke();
              M.text(x, sh.k, cx0 + cw / 2, ly + 15.5, { mono: true, size: 11, weight: 700, align: "center", base: "middle", color: on ? c.ink : c.muted });
            });
            M.text(x, "← 가까이 · 친밀", 2, ly + 50, { size: 11, weight: 600 });
            M.text(x, "멀리 · 관찰 →", w - 2, ly + 50, { size: 11, weight: 600, align: "right" });
          }
        },
      };
    },
  });

  /* ===== 카메라 앵글 ===== */
  const ANG = [
    { k: "EYE LEVEL", ko: "아이 레벨", feel: "중립 · 대등함", pos: [0, 1.6, 2.2], tgt: [0, 1.5, 6], roll: 0 },
    { k: "HIGH ANGLE", ko: "하이 앵글", feel: "내려다봄 · 작고 약해 보임", pos: [0, 5.2, 2.8], tgt: [0, 0.7, 6], roll: 0 },
    { k: "LOW ANGLE", ko: "로우 앵글", feel: "올려다봄 · 크고 위압적", pos: [0, 0.3, 3.4], tgt: [0, 1.6, 6], roll: 0 },
    { k: "BIRD'S-EYE", ko: "버즈아이 (탑 숏)", feel: "바로 위 · 패턴과 고립", pos: [0, 9, 5.98], tgt: [0, 0, 6], roll: 0 },
    { k: "DUTCH", ko: "더치 앵글", feel: "기운 수평선 · 불안", pos: [0, 1.6, 2.2], tgt: [0, 1.5, 6], roll: 0.32 },
  ];
  /* 버즈아이: 위에서 본 횡단보도 */
  function drawTop(x, r, time, alpha) {
    x.save(); x.globalAlpha *= alpha;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, u = r.h / 6;
    x.fillStyle = "#b9b2a8"; x.fillRect(r.x, r.y, r.w, r.h);
    x.fillStyle = "#ddd4c7"; x.fillRect(r.x, r.y, r.w, r.h * 0.16); x.fillRect(r.x, r.y + r.h * 0.84, r.w, r.h * 0.16);
    x.strokeStyle = "rgba(60,50,40,0.5)"; x.lineWidth = 1;
    x.beginPath(); x.moveTo(r.x, r.y + r.h * 0.16); x.lineTo(r.x + r.w, r.y + r.h * 0.16); x.moveTo(r.x, r.y + r.h * 0.84); x.lineTo(r.x + r.w, r.y + r.h * 0.84); x.stroke();
    x.fillStyle = "#f4f0e8";
    for (let i = -6; i <= 6; i++) { x.fillRect(cx + i * u * 0.55 - u * 0.17, r.y + r.h * 0.2, u * 0.34, r.h * 0.6); }
    for (const [tx, ty, tr] of [[0.08, 0.06, 0.7], [0.9, 0.05, 0.8], [0.12, 0.95, 0.75], [0.85, 0.93, 0.7]]) {
      const px = r.x + r.w * tx, py = r.y + r.h * ty, rr = u * tr;
      x.fillStyle = "rgba(40,30,20,0.2)"; x.beginPath(); x.arc(px + rr * 0.2, py + rr * 0.25, rr, 0, TAU); x.fill();
      x.fillStyle = "#7fa57a"; x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill(); x.strokeStyle = "#1d1b18"; x.stroke();
      x.fillStyle = "#93b98c"; x.beginPath(); x.arc(px - rr * 0.25, py - rr * 0.25, rr * 0.5, 0, TAU); x.fill();
    }
    x.fillStyle = "rgba(40,30,20,0.22)"; x.beginPath(); x.ellipse(cx + u * 0.25, cy + u * 0.3, u * 0.55, u * 1.0, 0, 0, TAU); x.fill();
    CK().topPerson(x, cx, cy, -Math.PI / 2, "A", u * 0.85);
    if (CK().dark()) { x.fillStyle = "rgba(12,10,8,0.16)"; x.fillRect(r.x, r.y, r.w, r.h); }
    x.restore();
  }
  LESSONS.push({
    id: "angles", ch: 8, order: 2,
    title: "카메라 앵글이 주는 인상",
    lede: "카메라를 어느 높이에 두고 어느 쪽으로 기울이느냐에 따라 같은 인물이 강해 보이기도, 약해 보이기도 합니다. 왼쪽은 카메라 화면, 오른쪽은 촬영장을 옆에서 본 도면입니다.",
    key: "기본은 눈높이. 내려다보면 약해 보이고 올려다보면 강해 보입니다. 앵글을 바꿀 땐 그 인상이 장면의 의도와 맞는지 먼저 확인합니다.",
    steps: [
      ["아이 레벨", "카메라를 A의 <b>눈높이</b>(약 1.6m)에 둡니다. 도면의 점선이 눈높이이고 카메라가 그 위에 있습니다. 관객은 A와 대등한 위치에서 바라봅니다. 대부분의 대화와 인터뷰가 이 높이이고, 다른 앵글은 여기서 얼마나 벗어나느냐로 읽힙니다."],
      ["하이 앵글", "카메라를 5m 높이로 올려 <b>내려다봅니다</b>. 화면에서 하늘이 사라지고 바닥이 배경이 되며, A의 몸이 짧게 눌려 보입니다. <b>취약하거나 위축된</b> 인상이라, 길을 잃은 인물이나 패배한 순간에 씁니다."],
      ["로우 앵글", "무릎보다 낮은 곳에서 <b>올려다봅니다</b>. A의 다리가 길어 보이고 건물과 하늘이 배경이 되어 <b>힘, 위엄, 위협</b>이 느껴집니다. 영웅의 등장이나 악역의 압박감에 흔합니다."],
      ["버즈아이 (탑 숏)", "바로 위에서 수직으로 내려다봅니다. A는 정수리만 보이고 대신 <b>횡단보도 줄무늬 같은 바닥 패턴</b>이 화면을 채웁니다. 감정보다 상황을 객관적으로 보여 주거나, 넓은 공간에 혼자인 인물을 강조합니다. 요리 영상의 '탑 숏'도 같은 앵글입니다."],
      ["더치 앵글", "카메라를 렌즈 축으로 <b>굴려(롤)</b> 수평선을 기울입니다. 도면에서 높이는 아이 레벨과 같지만, 오른쪽 위 롤 게이지가 18° 기울어 있습니다. 세상이 비뚤어진 듯한 <b>불안, 혼란</b>을 표현합니다. 10~25°가 흔한 범위입니다."],
    ],
    terms: [
      ["아이 레벨", "Eye level", "인물의 눈높이에서 수평으로 찍는 기본 앵글."],
      ["하이 · 로우 앵글", "High · Low angle", "내려다보는 앵글과 올려다보는 앵글. 인물을 약하게, 또는 강하게 보이게 합니다."],
      ["버즈아이", "Bird's-eye · Top shot", "바로 위에서 수직으로 내려다보는 앵글. 오버헤드 숏이라고도 합니다."],
      ["더치 앵글", "Dutch angle · Canted", "카메라를 롤(roll) 축으로 기울여 수평선이 비스듬한 앵글. 불안을 표현할 때 씁니다."],
      ["롤", "Roll", "렌즈 방향을 축으로 카메라가 도는 회전. 팬(yaw), 틸트(pitch)와 함께 회전 축 세 가지."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      let step = 0, from = null, now = null, custom = null;
      const chips = M.chips(api.controls, { title: "앵글", items: ANG.map((a) => a.ko.replace(/ \(.*\)/, "")), value: 0, onPick: (i) => { from = now; custom = null; idx = i; api.restart(); syncCtl(); } });
      let idx = 0;
      const hS = M.slider(api.controls, { id: "anghgt", label: "카메라 높이", min: 2, max: 60, value: 16, fmt: (v) => (v / 10).toFixed(1) + " m", onInput: (v) => { from = now; custom = { ...(custom || ANG[idx]), pos: [0, v / 10, v > 30 ? 2.8 : 2.4], tgt: [0, 1.1, 6] }; api.restart(); } });
      const rS = M.slider(api.controls, { id: "angroll", label: "롤 (더치)", min: 0, max: 30, value: 0, unit: "°", onInput: (v) => { from = now; custom = { ...(custom || ANG[idx]), roll: (v * Math.PI) / 180 }; api.restart(); } });
      const ro = M.readout(api.controls);
      const syncCtl = () => { const a = ANG[idx]; chips.set(idx); hS.set(Math.round(a.pos[1] * 10)); rS.set(Math.round((a.roll * 180) / Math.PI)); };
      const CODE = [
        "// three.js: 앵글은 카메라 위치 + 바라보는 점",
        "camera.position.set(0, 1.6, -4);      // 아이 레벨",
        "camera.lookAt(hero.position);",
        "",
        "camera.position.y = 5.2;              // 하이 앵글",
        "camera.position.y = 0.3;              // 로우 앵글",
        "camera.lookAt(hero.position);",
        "",
        "camera.position.set(0, 9, 0);         // 탑 숏",
        "camera.up.set(0, 0, 1);               // 화면 위쪽 = 앞",
        "camera.lookAt(0, 0, 0);",
        "",
        "camera.rotateZ(THREE.MathUtils.degToRad(18)); // 더치(롤)",
      ];
      const HL = [[[1, 2]], [[4, 4], [6, 6]], [[5, 6]], [[8, 10]], [[12, 12]]];
      const mkItems = () => [
        { kind: "prop", name: "tree", p: [-3.2, 0, 10], hgt: 4.2 }, { kind: "prop", name: "tree", p: [3.6, 0, 11.5], hgt: 4.6 },
        { kind: "prop", name: "car", p: [2.6, 0, 8.6], hgt: 1.45 },
        { kind: "person", who: "A", p: [0, 0, 6], hgt: 1.75, face: [0, 0, -1], expr: "neutral", tag: "A" },
      ];
      const items = mkItems();
      const toCam = (s) => {
        const d = M.v3.sub(s.tgt, s.pos);
        return { pos: s.pos, yaw: Math.atan2(d[0], d[2]), pitch: Math.atan2(d[1], Math.hypot(d[0], d[2])), fov: 46, roll: s.roll };
      };
      /* 앵글 상태 → 화면. 원근 눌림은 이해를 돕게 피치에 비례해 과장(squash) */
      const render = (x, r, st, time, its, grid = true) => {
        const cam = toCam(st), A = its[3];
        const top = M.clamp((-cam.pitch - 1.05) / 0.4, 0, 1);
        if (top < 1) {
          x.save();
          x.translate(r.x + r.w / 2, r.y + r.h / 2); x.rotate(st.roll); const k = 1 + Math.abs(Math.sin(st.roll)) * 0.9; x.scale(k, k); x.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
          A.squash = M.clamp(1 + cam.pitch * 0.55, 0.62, 1.25);
          CK().world(x, r, cam, its, { backdrop: "street", bh: 0.85, grid, time });
          x.restore();
        }
        if (top > 0) drawTop(x, r, time, top);
        return cam;
      };
      let thumbItems = mkItems();
      return {
        setStep(s) { step = s; from = now; idx = s; custom = null; syncCtl(); api.code(CODE.join("\n"), HL[s], "three.js 카메라"); },
        frame(time) {
          const c = M.col();
          const r0 = cv.getBoundingClientRect();
          CK().minH(cv, r0.width < 560 ? r0.width * 9 / 16 + 30 + 14 + 200 : 0);
          const { x, w, h } = M.fit(cv);
          const target = custom || ANG[idx];
          const e = M.ease.inOut(M.clamp(time / 700, 0, 1)), f0 = from || target;
          now = { pos: f0.pos.map((v, i) => M.lerp(v, target.pos[i], e)), tgt: f0.tgt.map((v, i) => M.lerp(v, target.tgt[i], e)), roll: M.lerp(f0.roll, target.roll, e) };
          const cam = toCam(now);
          const L = CK().layout(w, h, { ratio: 0.64, pk: 1, strip: h > 380 ? Math.min(96, h * 0.21) : 0 });
          const A = items[3];
          const fr = M.art.frame(x, { ...L.F, aspect: 16 / 9, label: target === custom ? "CUSTOM" : ANG[idx].k, rec: true, time, draw: (x, r) => render(x, r, now, time, items) });
          if (L.S) CK().strip(x, L.S, ANG.map((a) => ({ k: a.ko.replace(/ \(.*\)/, "") })), target === custom ? -1 : idx, (i, cx, rr) => render(cx, rr, ANG[i], 0, thumbItems, false), "angles");
          const a0 = target === custom ? { k: "CUSTOM", feel: now.pos[1] > 2.2 ? "내려다봄" : now.pos[1] < 1.1 ? "올려다봄" : "눈높이 근처" } : ANG[idx];
          CK().tag(x, a0.feel, fr.x + 10, fr.y + fr.h - 20, { size: 12, fill: c.key });
          if (A.scr && A.squash && Math.abs(A.squash - 1) > 0.08 && -cam.pitch < 1.05 && Math.abs(now.roll) < 0.01) {
            const sx = A.scr.x, sy = A.scr.y - A.scr.h * A.squash * 0.5;
            if (sx > fr.x && sx < fr.x + fr.w) M.callout(x, A.squash < 1 ? `몸이 눌려 보임 ×${A.squash.toFixed(2)}` : `몸이 길어 보임 ×${A.squash.toFixed(2)}`, sx + 10, sy, Math.min(fr.x + fr.w - 160, sx + 50), Math.max(fr.y + 20, sy - 40), { size: 11.5 });
          }
          // 측면 도면
          const P = L.P;
          CK().panel(x, P.x, P.y, P.w - 3, P.h - 3, "옆에서 본 촬영장");
          x.save(); M.rrect(x, P.x, P.y, P.w, P.h, 10); x.clip();
          const zr = [1.4, 7.4], ymax = Math.max(5.6, now.pos[1] + 1.2);
          const sc = Math.min((P.w - 30) / (zr[1] - zr[0]), (P.h - 64) / ymax);
          const ox = P.x + (P.w - (zr[1] - zr[0]) * sc) / 2;
          const PZ = (z) => ox + (z - zr[0]) * sc, PY = (y) => P.y + P.h - 18 - y * sc;
          x.fillStyle = M.alpha(c.c, 0.1); x.fillRect(P.x, PY(0), P.w, 30);
          M.line(x, P.x, PY(0), P.x + P.w, PY(0), c.ink, 1);
          M.line(x, P.x, PY(1.6), P.x + P.w, PY(1.6), M.alpha(c.ink, 0.45), 1, [4, 4]);
          M.text(x, "눈높이 1.6m", P.x + P.w - 12, PY(1.6) - 6, { size: 11, align: "right", color: c.muted });
          M.art.person(x, { cx: PZ(6), cy: PY(0), h: 1.75 * sc, who: "A", view: "profile-left", shadow: false });
          const vf = (cam.fov * Math.PI) / 360, cz0 = PZ(now.pos[2]), cy0 = PY(now.pos[1]);
          M.line(x, cz0, PY(0), cz0, cy0, M.alpha(c.ink, 0.35), 2);
          CK().wedge(x, cz0, cy0, -cam.pitch, vf, Math.hypot(P.w, P.h));
          M.line(x, cz0, cy0, PZ(now.tgt[2]), PY(now.tgt[1]), M.alpha(c.ink, 0.6), 1, [2, 3]);
          CK().cam(x, cz0, cy0, -cam.pitch, { s: 1.15 });
          const deg = Math.round((cam.pitch * 180) / Math.PI);
          CK().tag(x, `높이 ${now.pos[1].toFixed(1)}m · 틸트 ${deg > 0 ? "+" : ""}${deg}°`, P.x + 10, P.y + 42, { size: 11, mono: true, fill: c.key });
          if (Math.abs(now.roll) > 0.01) {
            const ix = P.x + P.w - 40, iy = P.y + 50;
            M.dot(x, ix, iy, 22, c.surface, c.ink);
            M.line(x, ix - 22, iy, ix + 22, iy, M.alpha(c.ink, 0.25), 1, [2, 2]);
            x.save(); x.translate(ix, iy); x.rotate(now.roll); M.line(x, -18, 0, 18, 0, c.b, 2.5); x.restore();
            CK().tag(x, `롤 ${Math.round((now.roll * 180) / Math.PI)}°`, ix, iy + 38, { size: 11, mono: true, align: "center", fill: c.key });
          }
          x.restore();
          ro.innerHTML = `<b>${a0.k}</b> · ${a0.feel}\n높이 ${now.pos[1].toFixed(1)}m · 틸트 ${deg}° · 롤 ${Math.round((now.roll * 180) / Math.PI)}°`;
        },
      };
    },
  });

  /* ===== 구도 ===== */
  const COMP_CAP = [
    ["중앙: 안정적이지만 정적", "삼분할 교차점: 시선이 흐름"],
    ["헤드룸 과다: 인물이 가라앉음", "적당한 헤드룸: 눈이 위 1/3 선", "헤드룸 없음: 압박감(의도할 때만)"],
    ["시선 앞 여백: 어딘가를 바라봄", "시선이 끝에 막힘: 답답함"],
    ["중앙 대칭: 소실점과 인물이 한가운데"],
    ["문틀이 인물을 한 번 더 가둠"],
    ["길과 울타리가 시선을 A로 데려감"],
  ];
  LESSONS.push({
    id: "composition", ch: 8, order: 3,
    title: "구도: 프레임 안에 놓는 법",
    lede: "무엇을 찍을지 정했다면 다음은 프레임 안 어디에 둘지입니다. 이 레슨을 마치면 삼분할, 헤드룸, 리드룸, 대칭, 프레임 안의 프레임, 리딩 라인으로 시선의 출발점과 흐름을 정할 수 있습니다. 웹의 히어로 이미지를 자를 때도 원리는 같습니다.",
    key: "피사체는 삼분할 선 위에, 시선 앞에는 여백을. 반응형으로 크롭할 땐 object-position 을 피사체 위치에 맞춥니다.",
    steps: [
      ["삼분할", "화면을 가로세로 3등분한 선이 만나는 <b>네 교차점</b>에 피사체를 둡니다. A가 한가운데에서 왼쪽 교차점으로 옮겨 가면 남은 공간이 배경 이야기를 합니다. '직접 해보기'의 비율 칩으로 모바일 크롭을 바꿔 봐도 A는 같은 선 위에 남습니다."],
      ["헤드룸", "머리 위 여백(노란 띠)이 <b>헤드룸</b>입니다. 너무 크면 B가 아래로 가라앉아 보이고, 없으면 답답합니다. 클로즈업일수록 헤드룸을 줄이고 <b>눈이 위쪽 1/3 선</b> 근처에 오게 맞추는 것이 출발점입니다."],
      ["리드룸 (시선 여백)", "A가 보는 방향 앞에 여백을 둡니다. 이것이 <b>리드룸</b>(노즈룸)입니다. 초록 띠가 넓으면 A가 어딘가를 바라보는 화면이 되고, 시선이 프레임 끝에 막히면(빨간 띠) 갇힌 느낌이 납니다. 불안을 만들려고 일부러 막기도 합니다."],
      ["중앙 대칭", "규칙을 깨는 강한 선택지입니다. 복도처럼 공간이 대칭일 때 인물을 <b>정중앙</b>에 두면 엄격하고 의식적인 화면이 됩니다. 노란 중심선 양쪽이 거울처럼 같은지 보세요. 조금 어긋난 대칭은 실수처럼 보이니 확실하게 맞춥니다."],
      ["프레임 안의 프레임", "문틀, 창문, 거울로 인물을 담으면 <b>틀이 한 번 더</b> 생깁니다. 노란 사각형이 문틀입니다. 시선이 안쪽 B에게 모이고, 갇힘이나 엿보는 느낌, 깊이감이 생깁니다."],
      ["리딩 라인", "길, 난간, 울타리처럼 화면을 가로지르는 선은 시선을 끌고 갑니다. 노란 화살표처럼 선들이 <b>피사체로 모이게</b> 배치하면, A가 작아도 눈이 먼저 그곳에 도착합니다. 웹 레이아웃에서 시선 흐름을 설계하는 것과 같습니다."],
    ],
    terms: [
      ["삼분할 법칙", "Rule of thirds", "화면을 3×3으로 나눠 선과 교차점에 주요 요소를 놓는 구도 규칙."],
      ["헤드룸", "Headroom", "인물 머리 위와 프레임 위 끝 사이의 여백. 클로즈업일수록 줄입니다."],
      ["리드룸 · 노즈룸", "Lead room · Nose room", "인물의 시선이나 움직임 방향 앞에 두는 여백. 루킹룸(looking room)이라고도 합니다."],
      ["리딩 라인", "Leading lines", "시선을 피사체로 이끄는 화면 속 선. 길, 난간, 그림자 등."],
      ["초점 위치", "Focal point · object-position", "크롭해도 남겨야 할 지점. CSS 에서는 object-position 으로 지정합니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      let step = 0, ratio = 0;
      const RATIOS = [{ label: "16:9", r: 16 / 9 }, { label: "4:5", r: 4 / 5 }, { label: "9:16 모바일", r: 9 / 16 }];
      M.chips(api.controls, { title: "화면 비율 (히어로 크롭)", items: RATIOS.map((r) => r.label), value: 0, onPick: (i) => { ratio = i; } });
      const thirds = M.check(api.controls, { id: "cmpthirds", label: "삼분할 격자", checked: true });
      const guide = M.check(api.controls, { id: "cmpguide", label: "구도 가이드", checked: true });
      const ro = M.copyRow(api.controls);
      let lastCode = "";
      const code = (fx) => {
        const pos = `${Math.round(fx * 100)}% 50%`;
        const t = [
          ".hero img {",
          "  width: 100%;",
          `  aspect-ratio: ${RATIOS[ratio].label.split(" ")[0].replace(":", " / ")};`,
          "  object-fit: cover;            /* 잘라서 채움 */",
          `  object-position: ${pos};    /* 피사체 위치 */`,
          "}",
          "@media (max-width: 600px) {",
          "  .hero img { aspect-ratio: 9 / 16; }",
          "}",
        ].join("\n");
        if (t !== lastCode) { lastCode = t; api.code(t, [[2, 4]], "히어로 이미지 크롭"); ro.textContent = `object-position: ${pos};`; }
      };
      /* 장면 (r: 화면 사각형, 160×90 단위를 U 로 변환). 반환 {focal, cap, G(픽셀)} */
      function scene(x, r, c, time) {
        const k = r.w / 160, U = (u) => u * k, PX = (u) => r.x + u * k, PY = (u) => r.y + u * k;
        const pp = M.pingpong(time, 1100, 1500), e = M.ease.inOut(pp.back ? 1 - pp.p : pp.p);
        let focal = 0.5, cap = COMP_CAP[step][0], G = {};
        if (step === 0) {
          M.art.backdrop(x, "park", { ...r, time });
          const px = M.lerp(80, 53.3, e);
          const ret = M.art.person(x, { cx: PX(px), cy: PY(80), h: U(44), who: "A", view: "three-quarter-right", expr: "smile" });
          focal = px / 160; cap = COMP_CAP[0][e > 0.5 ? 1 : 0];
          G = { eye: [ret.eyes.x, ret.eyes.y] };
        } else if (step === 1) {
          const n = Math.floor(time / 1900) % 3, tt = (time % 1900) / 450;
          const TOPS = [34, 11, -6], prev = TOPS[(n + 2) % 3];
          const top = M.lerp(prev, TOPS[n], M.ease.inOut(M.clamp(tt, 0, 1)));
          M.art.backdrop(x, "studio", { ...r });
          const hr = U(15);
          const ret = M.art.head(x, { cx: PX(80), cy: PY(top) + hr * 1.12, r: hr, who: "B", view: "front", expr: "neutral", cut: -45 });
          cap = COMP_CAP[1][n];
          G = { top: PY(top), eye: ret.eyes.y };
        } else if (step === 2) {
          const px = M.lerp(50, 112, e);
          M.art.backdrop(x, "street", { ...r, time });
          const ret = M.art.person(x, { cx: PX(px), cy: PY(12) + U(210), h: U(210), who: "A", view: "profile-right", expr: "neutral" });
          focal = px / 160; cap = COMP_CAP[2][e > 0.5 ? 1 : 0];
          G = { ex: ret.eyes.x, ey: ret.eyes.y };
        } else if (step === 3) {
          // 대칭 복도
          const vx0 = PX(66), vx1 = PX(94), vy0 = PY(28), vy1 = PY(60);
          x.fillStyle = "#efe3d1"; x.fillRect(r.x, r.y, r.w, r.h);
          const quad = (pts, fill) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fillStyle = fill; x.fill(); x.strokeStyle = "rgba(29,27,24,0.55)"; x.lineWidth = 1; x.stroke(); };
          quad([[r.x, r.y], [vx0, vy0], [vx1, vy0], [r.x + r.w, r.y]], "#f6efe3");
          quad([[r.x, r.y + r.h], [vx0, vy1], [vx1, vy1], [r.x + r.w, r.y + r.h]], "#c9a37f");
          quad([[r.x, r.y], [vx0, vy0], [vx0, vy1], [r.x, r.y + r.h]], "#e6d6bf");
          quad([[r.x + r.w, r.y], [vx1, vy0], [vx1, vy1], [r.x + r.w, r.y + r.h]], "#e6d6bf");
          x.fillStyle = "#cfe0e4"; x.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
          M.art.prop(x, "window", { cx: (vx0 + vx1) / 2, cy: vy0 + (vy1 - vy0) * 0.72, s: (vy1 - vy0) * 0.6 });
          for (const t of [0.15, 0.45, 0.7]) for (const sg of [-1, 1]) {
            const ex = (sg < 0 ? r.x : r.x + r.w), ix = sg < 0 ? vx0 : vx1;
            const xa = M.lerp(ex, ix, t), xb = M.lerp(ex, ix, t + 0.1);
            const ya = M.lerp(r.y, vy0, t) + (M.lerp(r.y + r.h, vy1, t) - M.lerp(r.y, vy0, t)) * 0.3, yb = M.lerp(r.y + r.h, vy1, t);
            const ya2 = M.lerp(r.y, vy0, t + 0.1) + (M.lerp(r.y + r.h, vy1, t + 0.1) - M.lerp(r.y, vy0, t + 0.1)) * 0.3, yb2 = M.lerp(r.y + r.h, vy1, t + 0.1);
            quad([[xa, ya], [xb, ya2], [xb, yb2], [xa, yb]], "#b98a5f");
          }
          if (CK().dark()) { x.fillStyle = "rgba(12,10,8,0.16)"; x.fillRect(r.x, r.y, r.w, r.h); }
          M.art.person(x, { cx: PX(80), cy: PY(66), h: U(27), who: "A", view: "front" });
        } else if (step === 4) {
          M.art.backdrop(x, "park", { ...r, time });
          M.art.person(x, { cx: PX(111), cy: PY(82), h: U(46), who: "B", view: "three-quarter-left", expr: "neutral" });
          const D = [PX(92), PY(14), U(38), U(76)];
          x.fillStyle = "#d9c7ae";
          x.beginPath(); x.rect(r.x, r.y, r.w, r.h); x.rect(D[0] + D[2], D[1], -D[2], D[3]); x.fill("evenodd");
          if (CK().dark()) { x.fillStyle = "rgba(12,10,8,0.22)"; x.beginPath(); x.rect(r.x, r.y, r.w, r.h); x.rect(D[0] + D[2], D[1], -D[2], D[3]); x.fill("evenodd"); }
          x.fillStyle = "#8e6441"; x.strokeStyle = "#1d1b18"; x.lineWidth = 1;
          x.fillRect(D[0] - U(3), D[1] - U(3), D[2] + U(6), U(3)); x.strokeRect(D[0] - U(3), D[1] - U(3), D[2] + U(6), U(3));
          x.fillRect(D[0] - U(3), D[1], U(3), D[3]); x.strokeRect(D[0] - U(3), D[1], U(3), D[3]);
          x.fillRect(D[0] + D[2], D[1], U(3), D[3]); x.strokeRect(D[0] + D[2], D[1], U(3), D[3]);
          M.art.prop(x, "window", { cx: PX(34), cy: PY(52), s: U(30) });
          M.art.prop(x, "plant", { cx: PX(62), cy: PY(90), s: U(26) });
          M.art.prop(x, "lamp", { cx: PX(10), cy: PY(90), s: U(56) });
          focal = 111 / 160; cap = COMP_CAP[4][0];
          G = { rect: D };
        } else {
          M.art.backdrop(x, "park", { ...r, time });
          const vp = [PX(88), PY(60.5)];
          for (let i = 0; i < 9; i++) {
            const t = 1 - Math.pow(i / 9, 0.6);
            for (const sg of [-1, 1]) {
              const bx = M.lerp(vp[0] + sg * U(5), r.x + r.w / 2 + sg * U(70), t), by = M.lerp(vp[1], r.y + r.h + U(6), t), ht = M.lerp(U(1), U(16), t);
              M.line(x, bx, by, bx, by - ht, "#6b5a4c", M.lerp(0.6, 3.5, t));
            }
          }
          for (const sg of [-1, 1]) {
            x.strokeStyle = "#6b5a4c"; x.lineWidth = 1.5;
            for (const hh of [0.45, 0.8]) { x.beginPath(); x.moveTo(r.x + r.w / 2 + sg * U(70), r.y + r.h + U(6) - U(16) * hh); x.lineTo(vp[0] + sg * U(5), vp[1] - U(1) * hh); x.stroke(); }
          }
          M.art.person(x, { cx: vp[0], cy: vp[1] + U(1.5), h: U(12), who: "A", view: "front", pose: "wave", phase: (time / 1000) % 1 });
          focal = 88 / 160; cap = COMP_CAP[5][0];
          G = { vp, lines: [[r.x + r.w / 2 - U(70), r.y + r.h - U(12)], [r.x + r.w / 2 + U(70), r.y + r.h - U(12)], [PX(40), r.y + r.h], [PX(140), r.y + r.h]] };
        }
        return { focal, cap, G };
      }
      return {
        setStep(s) { step = s; lastCode = ""; },
        frame(time) {
          const c = M.col();
          const { x, w, h } = M.fit(cv);
          let fw = Math.min(w - 3, ((h - 46) - 30) * 16 / 9), fh = fw * 9 / 16 + 30;
          const F = { x: (w - fw) / 2, y: Math.max(0, (h - fh - 40) / 2), w: fw, h: fh };
          let info = null;
          M.art.frame(x, { ...F, aspect: 16 / 9, center: false, label: ["THIRDS", "HEADROOM", "LEAD ROOM", "SYMMETRY", "FRAMING", "LINES"][step], draw: (x, r) => {
            info = scene(x, r, c, time);
            const { focal, G } = info;
            const R = RATIOS[ratio].r;
            const W0 = R >= 16 / 9 ? r.w : r.h * R, X0 = r.x + (r.w - W0) * focal;
            info.X0 = X0; info.W0 = W0;
            if (W0 < r.w) { x.fillStyle = M.alpha(c.surface, 0.8); x.fillRect(r.x, r.y, X0 - r.x, r.h); x.fillRect(X0 + W0, r.y, r.x + r.w - X0 - W0, r.h); }
            if (thirds.get()) {
              for (let i = 1; i < 3; i++) {
                M.line(x, X0 + (W0 * i) / 3, r.y, X0 + (W0 * i) / 3, r.y + r.h, "rgba(255,255,255,0.85)", 1, [5, 4]);
                M.line(x, X0, r.y + (r.h * i) / 3, X0 + W0, r.y + (r.h * i) / 3, "rgba(255,255,255,0.85)", 1, [5, 4]);
              }
              for (const i of [1, 2]) for (const j of [1, 2]) M.dot(x, X0 + (W0 * i) / 3, r.y + (r.h * j) / 3, 3.5, "#ffffff", "rgba(0,0,0,0.5)");
            }
            if (guide.get()) {
              if (step === 0) {
                M.dot(x, G.eye[0], G.eye[1], 10, null, c.key); x.lineWidth = 2;
                M.callout(x, "시선이 머무는 점", G.eye[0] + 8, G.eye[1], Math.min(r.x + r.w - 130, G.eye[0] + 60), r.y + 26, { size: 11.5 });
              } else if (step === 1) {
                const ok = G.top > r.y;
                if (ok) {
                  x.fillStyle = M.alpha(c.key, 0.3); x.fillRect(X0, r.y, W0, G.top - r.y);
                  M.line(x, X0, G.top, X0 + W0, G.top, c.key, 2);
                  if (G.top - r.y > 24) CK().tag(x, `헤드룸 ${Math.round(((G.top - r.y) / r.h) * 100)}%`, X0 + W0 - 10, (r.y + G.top) / 2, { align: "right", size: 11.5, fill: c.key });
                } else CK().tag(x, "머리가 잘림", X0 + W0 - 10, r.y + 18, { align: "right", size: 11.5, fill: c.b });
                M.line(x, X0, G.eye, X0 + W0, G.eye, c.b, 2, [3, 3]);
                CK().tag(x, "눈높이", X0 + 10, G.eye - 16, { size: 11 });
              } else if (step === 2) {
                const edge = X0 + W0, room = edge - G.ex, good = room > W0 * 0.38;
                x.fillStyle = M.alpha(good ? c.c : c.b, 0.25); x.fillRect(G.ex, r.y, Math.max(0, room), r.h);
                M.arrow(x, G.ex + 6, G.ey, Math.max(G.ex + 16, edge - 8), G.ey, good ? c.c : c.b, 2.5);
                CK().tag(x, good ? "리드룸" : "막힘", Math.min(G.ex + 14, edge - 60), G.ey - 22, { size: 11.5, fill: good ? c.surface : c.b, color: c.ink });
              } else if (step === 3) {
                M.line(x, r.x + r.w / 2, r.y, r.x + r.w / 2, r.y + r.h, c.key, 2, [6, 4]);
                CK().tag(x, "중심선", r.x + r.w / 2 + 8, r.y + 18, { size: 11, fill: c.key });
              } else if (step === 4) {
                const [rx, ry, rw, rh] = G.rect;
                x.strokeStyle = c.key; x.lineWidth = 3; x.strokeRect(rx, ry, rw, rh);
                CK().tag(x, "두 번째 틀", rx + rw / 2, ry - 2, { align: "center", size: 11, fill: c.key });
              } else if (step === 5) {
                for (const [lx, ly] of G.lines) M.arrow(x, lx, ly, M.lerp(lx, G.vp[0], 0.82), M.lerp(ly, G.vp[1], 0.82), c.key, 2.5);
                M.dot(x, G.vp[0], G.vp[1] - 6, 14, null, c.key);
              }
            }
            if (W0 < r.w) { x.strokeStyle = c.ink; x.lineWidth = 2; x.strokeRect(X0, r.y + 1, W0, r.h - 2); CK().tag(x, RATIOS[ratio].label.split(" ")[0] + " 크롭", X0 + 8, r.y + r.h - 18, { size: 11, mono: true }); }
          } });
          if (info) {
            CK().tag(x, info.cap, w / 2, F.y + F.h + 22, { align: "center", size: 12.5, fill: c.key });
            code(info.focal);
          }
        },
      };
    },
  });

  /* ===== 180도 규칙 ===== */
  const PA = [-1.2, 0], PB = [1.2, 0], MID = [0, 0];
  const PROPS = [{ name: "tree", p: [3.6, -3.4], hgt: 4.2 }, { name: "building", p: [-4, -4.2], hgt: 6 }, { name: "car", p: [-3.4, 3.8], hgt: 1.45 }, { name: "tree", p: [3.8, 4.2], hgt: 3.8 }];
  LESSONS.push({
    id: "axis-180", ch: 10, order: 1,
    title: "180도 규칙과 시선 일치",
    lede: "두 사람이 마주 보는 장면을 여러 숏으로 나눠 찍어도 관객이 헷갈리지 않는 이유는 카메라가 한쪽 편에만 머물기 때문입니다. 왼쪽 도면에서 카메라를 끌어 보고, 오른쪽 화면에서 A와 B의 시선 방향이 어떻게 되는지 보세요.",
    key: "두 인물을 잇는 선의 한쪽에서만 찍습니다. 넘어야 한다면 선 위를 지나가는 숏을 보여 주고 넘고, 컷할 땐 앵글을 30도 이상 바꿉니다.",
    steps: [
      ["액션 라인", "말하는 A와 듣는 B를 잇는 가상의 선(노란 점선)이 <b>액션 라인</b>, 즉 180도 선입니다. 카메라가 선의 한쪽(초록 영역)에 있으면 A는 늘 화면 <b>오른쪽을 보고</b>, B는 <b>왼쪽을 봅니다</b>. 도면의 카메라를 끌어 보세요."],
      ["숏 / 리버스 숏", "대화는 보통 어깨 너머로 한 사람씩 번갈아 찍습니다. 두 카메라가 <b>같은 쪽</b>에 있으면 A는 오른쪽, B는 왼쪽을 보는 관계가 유지되어 <b>시선이 서로 이어집니다</b>(아이라인 매치). 화면 앞쪽에 걸린 어깨가 상대가 어디 있는지 알려 줍니다."],
      ["선을 넘으면", "리버스 숏을 선 <b>반대편</b>(분홍 영역)에서 찍으면 B도 오른쪽을 보게 됩니다. 두 사람이 같은 방향을 보는 것처럼 보여 대화가 끊기고, 배경도 공원에서 거리로 갑자기 바뀝니다. 이것이 <b>180도 규칙 위반</b>입니다."],
      ["30도 규칙", "같은 쪽이라도 앵글을 <b>조금만</b> 바꿔 자르면 화면이 툭 튀는 <b>점프 컷</b>처럼 보입니다. 도면의 노란 부채꼴이 기준에서 ±30° 범위입니다. 12°만 옮긴 컷과 45° 옮긴 컷을 비교해 보세요. 컷할 때는 30° 이상 바꾸거나 숏 크기를 확실히 바꿉니다."],
      ["직접 옮겨 보기", "카메라를 선 너머로 끌어 보세요. 회색 기준 카메라와 비교해 시선 방향이 뒤집히는지, 각도 차이가 30°를 넘는지 화면 아래 태그에 표시됩니다. 선을 넘어야 한다면 카메라가 <b>선 위를 지나가는 움직임</b>이나 정면 숏을 사이에 넣어 새 기준을 만듭니다."],
    ],
    terms: [
      ["180도 규칙", "180-degree rule", "두 인물을 잇는 액션 라인의 한쪽에만 카메라를 두는 규칙. 화면 속 방향을 일정하게 지킵니다."],
      ["액션 라인", "Axis of action", "인물 사이 또는 움직임 방향을 따라 긋는 가상의 선. 180도 선이라고도 합니다."],
      ["숏 / 리버스 숏", "Shot / reverse shot", "대화 상대를 번갈아 보여 주는 편집. 흔히 어깨 너머 숏(OTS)으로 찍습니다."],
      ["아이라인 매치", "Eyeline match", "앞 숏의 시선 방향과 다음 숏의 대상 위치가 맞는 것."],
      ["30도 규칙", "30-degree rule", "같은 피사체를 이어 자를 땐 카메라 각도를 30도 이상 바꿔 점프 컷을 피하는 규칙."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      let step = 0, manual = null, drag = false;
      const pol = (deg, R = 4) => [Math.cos((deg * Math.PI) / 180) * R, Math.sin((deg * Math.PI) / 180) * R];
      const SEQ = [
        [{ cam: pol(90), tgt: MID, label: "투 숏" }],
        [{ cam: [-2.4, 1.6], tgt: PB, label: "숏: A 어깨 너머로 B" }, { cam: [2.4, 1.6], tgt: PA, label: "리버스: B 어깨 너머로 A" }],
        [{ cam: [-2.4, 1.6], tgt: PB, label: "숏: 선 이쪽" }, { cam: [2.4, -1.6], tgt: PA, label: "리버스: 선을 넘음" }],
        [{ cam: pol(90), tgt: MID, label: "기준 0°" }, { cam: pol(102), tgt: MID, label: "+12°" }, { cam: pol(90), tgt: MID, label: "기준 0°" }, { cam: pol(135), tgt: MID, label: "+45°" }],
        [{ cam: pol(90), tgt: MID, label: "기준" }],
      ];
      const angS = M.slider(api.controls, { id: "ax180ang", label: "카메라 위치 (각도)", min: 0, max: 359, value: 90, unit: "°", onInput: (v) => { const r = manual ? Math.hypot(...manual.cam) : 4; manual = { cam: pol(v, r), tgt: MID, label: "직접 배치" }; } });
      const ro = M.readout(api.controls);
      let G = null;
      const toWorld = (e) => {
        if (!G) return null;
        const r = cv.getBoundingClientRect();
        return [(e.clientX - r.left - G.cx) / G.sc, (e.clientY - r.top - G.cy) / G.sc];
      };
      const place = (p) => {
        const d = Math.hypot(p[0], p[1]), R = M.clamp(d, 2.2, 4.8), a = Math.atan2(p[1], p[0]);
        manual = { cam: [Math.cos(a) * R, Math.sin(a) * R], tgt: MID, label: "직접 배치" };
        angS.set(Math.round(((a * 180) / Math.PI + 360) % 360));
      };
      const pd = (e) => { const p = toWorld(e); if (!p || !G.inPlan(e)) return; drag = true; cv.setPointerCapture(e.pointerId); place(p); };
      const pm = (e) => { if (drag) { const p = toWorld(e); if (p) place(p); } };
      const end = () => (drag = false);
      cv.addEventListener("pointerdown", pd); cv.addEventListener("pointermove", pm);
      cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);

      const angOf = (p) => ((Math.atan2(p[1], p[0]) * 180) / Math.PI + 360) % 360;
      /* 평면(px,py) → 월드 [x, y, z=-py] */
      const W3 = (p, y = 0) => [p[0], y, -p[1]];
      const items = [
        ...PROPS.map((q) => ({ kind: "prop", name: q.name, p: W3(q.p), hgt: q.hgt })),
        { kind: "person", who: "A", p: W3(PA), hgt: 1.75, face: [1, 0, 0], expr: "talk", near: 0.5 },
        { kind: "person", who: "B", p: W3(PB), hgt: 1.7, face: [-1, 0, 0], expr: "neutral", near: 0.5 },
      ];
      const camOf = (s) => {
        const tgt = s.tgt === MID ? MID : s.tgt;
        const pos = [s.cam[0], 1.55, -s.cam[1]], t = [tgt[0], 1.45, -tgt[1]];
        const d = M.v3.sub(t, pos);
        return { pos, yaw: Math.atan2(d[0], d[2]), pitch: Math.atan2(d[1], Math.hypot(d[0], d[2])), fov: s.tgt === MID ? 50 : 40 };
      };
      /* 화면에서 인물이 보는 방향: 상대 쪽 화면 x 부호 */
      const lookDir = (cam, who) => {
        const me = who === "A" ? PA : PB, other = who === "A" ? PB : PA;
        const a = M.cam.toView(cam, W3(me, 1.5)), sa = a[0] / Math.max(0.1, a[2]);
        const v = M.cam.toView(cam, [me[0] + (other[0] - me[0]) * 0.5, 1.5, -me[1]]);
        const dx = v[0] / Math.max(0.1, v[2]) - sa;
        return Math.abs(dx) < 0.02 ? 0 : Math.sign(dx);
      };
      let lastIdx = -1, cutAt = 0;
      return {
        setStep(s) { step = s; manual = s === 4 ? { cam: pol(55), tgt: MID, label: "직접 배치" } : null; angS.set(s === 4 ? 55 : 90); lastIdx = -1; },
        frame(time, dt) {
          const c = M.col();
          const r0 = cv.getBoundingClientRect();
          CK().minH(cv, r0.width < 560 ? r0.width * 9 / 16 + 30 + 60 + Math.min(300, r0.width * 0.8) : 0);
          const { x, w, h } = M.fit(cv);
          const seq = SEQ[step], per = step === 3 ? 1500 : 2000;
          const si = Math.floor(time / per) % seq.length;
          if (si !== lastIdx) { lastIdx = si; cutAt = time; }
          const shot = manual || seq[si];
          const ref = manual ? SEQ[step][0] : seq.length > 1 ? seq[(si + seq.length - 1) % seq.length] : null;
          const cam = camOf(shot);
          const wide = w / h > 1.25;
          let Pp, F;
          if (wide) {
            const pw = Math.min(w * 0.42, h - 3);
            Pp = { x: 0, y: (h - Math.min(h - 3, pw * 1.05)) / 2, w: pw, h: Math.min(h - 3, pw * 1.05) };
            let fw = w - pw - 16, fh = fw * 9 / 16 + 30;
            if (fh > h - 64) { fh = h - 64; fw = (fh - 30) * 16 / 9; }
            F = { x: pw + 16, y: Math.max(0, (h - fh - 60) / 2), w: fw, h: fh };
          } else {
            const fw = w, fh = fw * 9 / 16 + 30;
            F = { x: 0, y: 0, w: fw, h: fh };
            Pp = { x: 0, y: fh + 62, w: w - 3, h: h - fh - 65 };
          }
          // ---- 도면 ----
          CK().panel(x, Pp.x, Pp.y, Pp.w - 3, Pp.h - 3, "위에서 본 촬영장", { grid: false });
          x.save(); M.rrect(x, Pp.x, Pp.y, Pp.w - 3, Pp.h - 3, 10); x.clip();
          const sc = Math.min((Pp.w - 20) / 10.6, (Pp.h - 30) / 10.6), cx = Pp.x + Pp.w / 2, cy = Pp.y + Pp.h / 2 + 6;
          G = { cx, cy, sc, inPlan: (e) => { const r = cv.getBoundingClientRect(), ex = e.clientX - r.left, ey = e.clientY - r.top; return ex >= Pp.x && ex <= Pp.x + Pp.w && ey >= Pp.y && ey <= Pp.y + Pp.h; } };
          const PX = (p) => [cx + p[0] * sc, cy + p[1] * sc];
          x.fillStyle = M.alpha(c.c, 0.12); x.fillRect(Pp.x, cy, Pp.w, Pp.h);
          x.fillStyle = M.alpha(c.b, 0.1); x.fillRect(Pp.x, Pp.y, Pp.w, cy - Pp.y);
          CK().tag(x, "↓ 카메라 쪽", Pp.x + Pp.w - 16, cy + 18, { align: "right", size: 11 });
          CK().tag(x, "↑ 선 너머", Pp.x + Pp.w - 16, cy - 18, { align: "right", size: 11 });
          if (step === 3 || step === 4) {
            const R = 4.4 * sc, a0 = ((ref ? angOf(ref.cam) : 90) * Math.PI) / 180;
            x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a0 - Math.PI / 6, a0 + Math.PI / 6); x.closePath();
            x.fillStyle = M.alpha(c.key, 0.25); x.fill(); x.strokeStyle = M.alpha(c.ink, 0.5); x.lineWidth = 1; x.stroke();
            M.text(x, "±30°", cx + Math.cos(a0) * R * 0.75 + 4, cy + Math.sin(a0) * R * 0.75, { size: 11, mono: true, color: c.ink, weight: 600 });
          }
          M.line(x, Pp.x, cy, Pp.x + Pp.w, cy, c.key, 2.5, [8, 5]);
          CK().tag(x, "액션 라인", Pp.x + 10, cy - 14, { size: 11, fill: c.key });
          for (const q of PROPS) {
            const [qx, qy] = PX(q.p);
            if (q.name === "tree") CK().topTree(x, qx, qy, 0.75 * sc, { alpha: 0.7 });
            else if (q.name === "building") CK().topBox(x, qx, qy, 2.2 * sc, 1.5 * sc, c.key, { alpha: 0.7 });
            else CK().topBox(x, qx, qy, 1.8 * sc, 0.85 * sc, c.a, { alpha: 0.7 });
          }
          for (const [p, ang, who] of [[PA, 0, "A"], [PB, Math.PI, "B"]]) {
            const [ax, ay] = PX(p);
            CK().topPerson(x, ax, ay, ang, who, Math.max(8, 0.5 * sc));
            CK().tag(x, who === "A" ? "A 말함" : "B 들음", ax, ay + 0.5 * sc + 20, { align: "center", size: 11 });
          }
          const drawCam = (s, col, alpha) => {
            const cc = camOf(s), [qx, qy] = PX(s.cam), ang = Math.atan2(-Math.cos(cc.yaw), Math.sin(cc.yaw));
            CK().wedge(x, qx, qy, ang, ((cc.fov / 2) * Math.PI) / 180 * 1.6, 2.6 * sc, col, alpha * 0.18);
            CK().cam(x, qx, qy, ang, { color: col, alpha, s: 1.15 });
          };
          if (ref && ref !== shot) drawCam(ref, c.muted, 0.6);
          drawCam(shot, c.key, 1);
          if (step === 4 || manual) CK().tag(x, "끌어서 이동", PX(shot.cam)[0], PX(shot.cam)[1] + 22, { align: "center", size: 11 });
          x.restore();
          // ---- 화면 ----
          const crossed = shot.cam[1] < -0.05;
          const fr = M.art.frame(x, { ...F, aspect: 16 / 9, label: crossed ? "선 너머" : "카메라 쪽", time, tc: time, draw: (x, r) => {
            items[4].mouth = 0.5 + 0.5 * Math.sin(time / 95);
            CK().world(x, r, cam, items, { backdrops: ["park", "street"], bh: 0.9, time });
            for (const it of items.slice(4)) if (it.scr && it.scr.h < r.h * 1.2) {
              const tx = M.clamp(it.scr.x, r.x + 20, r.x + r.w - 20), ty = Math.max(r.y + 14, it.scr.y - it.scr.h - 14);
              CK().tag(x, it.who, tx, ty, { align: "center", size: 11.5, weight: 700 });
            }
            const since = time - cutAt;
            if (!manual && seq.length > 1 && since < 140) { x.fillStyle = `rgba(255,255,255,${0.5 * (1 - since / 140)})`; x.fillRect(r.x, r.y, r.w, r.h); }
          } });
          CK().tag(x, shot.label, fr.x + 10, fr.y + 18, { size: 11.5 });
          // ---- 상태 ----
          const la = lookDir(cam, "A"), lb = lookDir(cam, "B");
          const arrowTxt = (d) => (d > 0 ? "→ 오른쪽" : d < 0 ? "← 왼쪽" : "정면");
          let rule = crossed ? "선을 넘음: 화면 방향이 뒤집힘" : "같은 쪽: 시선 방향 유지";
          let da = 0;
          if (ref && (step === 3 || step === 4)) {
            da = Math.abs(angOf(shot.cam) - angOf(ref.cam)); if (da > 180) da = 360 - da;
            if (!crossed && step === 3) rule = da < 1 ? "기준 숏" : da < 30 ? `${Math.round(da)}° 차이: 점프 컷처럼 튐` : `${Math.round(da)}° 차이: 새 숏으로 읽힘`;
            if (step === 4) rule += da < 30 ? ` · 기준과 ${Math.round(da)}°: 너무 가까움` : ` · 기준과 ${Math.round(da)}°`;
          }
          const bad = crossed || /튐|가까움/.test(rule);
          const sy = F.y + F.h + 18;
          const t1 = CK().tag(x, `A 시선 ${arrowTxt(la)}`, F.x + 2, sy, { size: 11.5, color: c.ink });
          CK().tag(x, `B 시선 ${arrowTxt(lb)}`, F.x + 2 + t1.w + 8, sy, { size: 11.5, color: c.ink });
          CK().tag(x, rule, F.x + 2, sy + 28, { size: 11.5, fill: bad ? c.b : c.key, color: c.ink });
          ro.innerHTML = `카메라 ${Math.round(angOf(shot.cam))}° · ${crossed ? "<b>선 너머</b>" : "카메라 쪽"}\nA는 화면 ${arrowTxt(la)}, B는 화면 ${arrowTxt(lb)}을 봅니다.`;
        },
        destroy() { cv.removeEventListener("pointerdown", pd); cv.removeEventListener("pointermove", pm); },
      };
    },
  });

  /* ===== 렌즈와 피사계 심도 ===== */
  const STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16];
  LESSONS.push({
    id: "focus-dof", ch: 9, order: 2,
    title: "렌즈와 피사계 심도",
    lede: "렌즈의 초점거리는 얼마나 넓게 담을지와 원근감을, 조리개는 앞뒤로 얼마나 선명할지를 정합니다. 이 레슨을 마치면 '85mm, f/1.8'이 어떤 화면을 뜻하는지 읽고, 흐림으로 관객의 시선을 원하는 곳에 데려갈 수 있습니다.",
    key: "보여 줄 곳만 선명하게. 얕은 심도는 망원 + 낮은 f값 + 가까운 초점에서 생기고, 웹에서는 레이어별 filter: blur 로 흉내 냅니다.",
    steps: [
      ["초점거리: 광각에서 망원으로", "초점거리(mm)가 짧으면 <b>광각</b>, 50mm 안팎이 <b>표준</b>, 길면 <b>망원</b>입니다. 여기서는 가운데 B의 크기가 같도록 카메라가 물러납니다. 망원일수록 뒤의 A와 거리 풍경이 <b>크게 당겨져 보이는 압축</b>이 생기고, 광각은 거리감이 과장됩니다."],
      ["조리개와 심도", "조리개 f값이 <b>작을수록(f/1.4) 구멍이 크고 심도가 얕아</b> 초점 앞뒤가 빠르게 흐려집니다. f/11처럼 크면 앞의 꽃부터 뒤의 A까지 다 선명합니다. 오른쪽 도면의 초록 띠가 선명하게 보이는 범위, 즉 <b>피사계 심도</b>입니다."],
      ["얕은 심도로 시선 유도", "85mm, f/2로 B에 초점을 맞추면 앞의 꽃과 뒤의 A가 녹아 사라집니다. 관객은 생각할 틈 없이 <b>선명한 곳을 먼저</b> 봅니다. 인물 사진과 제품 영상의 기본 문법입니다."],
      ["랙 포커스", "숏 안에서 초점을 <b>앞의 꽃에서 B, 다시 뒤의 A로</b> 옮깁니다. 카메라는 그대로인데 관객의 주의가 넘어갑니다. 컷 없이 이야기의 주인공을 바꾸는 방법이고, 초점 링을 돌리는 사람을 포커스 풀러라고 부릅니다."],
      ["보케", "135mm, f/1.4로 B에 맞추면 뒤쪽 작은 전구들이 점이 아니라 <b>둥근 원</b>으로 번집니다. 이 흐림의 질감이 <b>보케</b>입니다. 망원, 낮은 f값, 피사체와 배경 사이 거리가 멀수록 원이 커집니다."],
      ["웹에서의 심도", "웹에서는 장면을 <b>레이어로 나누고</b> 거리에 비례해 <code>filter: blur()</code> 를 줍니다. 화면 오른쪽 태그가 각 레이어의 blur 값입니다. 초점을 옮길 땐 <code>transition</code> 으로 랙 포커스를 만들고, 뒤를 흐리는 유리 패널은 <code>backdrop-filter</code> 로 만듭니다. 블러는 비싼 연산이라 넓은 영역에 남용하지 않습니다."],
    ],
    terms: [
      ["초점거리", "Focal length", "렌즈 중심에서 센서까지의 거리(mm). 짧으면 광각, 길면 망원. 화각과 원근감을 정합니다."],
      ["조리개 · f값", "Aperture · f-stop", "빛이 들어오는 구멍의 크기. f/1.4가 크고 f/16이 작습니다. 숫자가 작을수록 심도가 얕습니다."],
      ["피사계 심도", "Depth of field (DoF)", "초점 앞뒤로 선명하게 보이는 거리 범위. '심도가 얕다'는 이 범위가 좁다는 뜻입니다."],
      ["랙 포커스", "Rack focus · Focus pull", "한 숏 안에서 초점을 다른 피사체로 옮기는 기법."],
      ["보케", "Bokeh", "초점 밖 영역이 흐려지는 모양과 질감. 일본어 '흐림(ボケ)'에서 왔습니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      let step = 0, manual = false;
      const st = { f: 50, ni: 5, fp: 50 };
      const fS = M.slider(api.controls, { id: "dofmm", label: "초점거리", min: 18, max: 200, value: 50, unit: "mm", onInput: (v) => { manual = true; st.f = v; } });
      const nS = M.slider(api.controls, { id: "dofstop", label: "조리개", min: 0, max: 7, value: 5, fmt: (v) => "f/" + STOPS[v], onInput: (v) => { manual = true; st.ni = v; } });
      const pS = M.slider(api.controls, { id: "doffocus", label: "초점 위치 (앞 ↔ 뒤)", min: 0, max: 100, value: 50, fmt: (v) => (v < 20 ? "앞의 꽃" : v > 80 ? "뒤의 A" : v > 35 && v < 65 ? "가운데 B" : "사이"), onInput: (v) => { manual = true; st.fp = v; } });
      const ro = M.readout(api.controls);
      const HL = [[[0, 4]], [[0, 4]], [[2, 3]], [[6, 10]], [[0, 4]], "all"];
      let lastCode = "";
      const OBJ = [
        { z: -2.4, x: -0.5, lab: "꽃", item: [{ kind: "prop", name: "table", hgt: 0.75, dx: 0 }, { kind: "prop", name: "flower", hgt: 0.42, dx: 0.15, y: 0.75 }] },
        { z: 0, x: 0.2, lab: "B", item: [{ kind: "person", who: "B", hgt: 1.7, view: "three-quarter-left", expr: "neutral" }] },
        { z: 5, x: 1.35, lab: "A", item: [{ kind: "person", who: "A", hgt: 1.75, view: "three-quarter-left", expr: "smile" }] },
      ];
      const LIGHTS = Array.from({ length: 22 }, (_, i) => [-7 + i * 0.66, 1.75 + 0.22 * Math.sin(i * 0.9), 10 + (i % 3) * 1.2, i % 3]);
      const LCOL = ["#f5d78e", "#f3b57a", "#fbe7b8"];
      return {
        setStep(s) { step = s; manual = false; lastCode = ""; },
        frame(time) {
          const c = M.col();
          const r0 = cv.getBoundingClientRect();
          CK().minH(cv, r0.width < 560 ? r0.width * 2 / 3 + 30 + 14 + 200 : 0);
          const { x, w, h } = M.fit(cv);
          if (!manual) {
            const pp = M.pingpong(time, 2600, 900), e = M.ease.inOut(pp.back ? 1 - pp.p : pp.p);
            if (step === 0) { st.f = Math.round(Math.exp(M.lerp(Math.log(20), Math.log(135), e))); st.ni = 5; st.fp = 50; }
            else if (step === 1) { st.f = 85; st.ni = Math.round(M.lerp(0, 6, e)); st.fp = 50; }
            else if (step === 2) { st.f = 85; st.ni = 1; st.fp = 50; }
            else if (step === 3) { st.f = 85; st.ni = 1; st.fp = Math.round(M.lerp(0, 100, e)); }
            else if (step === 4) { st.f = 135; st.ni = 0; st.fp = 50; }
            else { st.f = 85; st.ni = 1; st.fp = 50; }
            fS.set(st.f); nS.set(st.ni); pS.set(st.fp);
          }
          const f = st.f, N = STOPS[st.ni];
          const Dm = Math.max(1.8, (4.4 * f) / 50);
          OBJ[0].z = -0.42 * Dm;
          const dist = (z) => Dm + z;
          const dN = dist(OBJ[0].z), dF = dist(OBJ[2].z), dM = dist(0), u = st.fp / 50;
          const s = u <= 1 ? Math.exp(M.lerp(Math.log(dN), Math.log(dM), u)) : Math.exp(M.lerp(Math.log(dM), Math.log(dF), u - 1));
          const fm = f / 1000;
          const L = CK().layout(w, h, { aspect: 1.5, ratio: 0.6, pk: 1 });
          const fw = L.F.w;
          const coc = (d) => Math.min(36, ((fm * fm) / (N * (s - fm))) * (Math.abs(d - s) / d) / 0.036 * fw);
          const cam = { pos: [0, 1.45, -Dm], yaw: 0, pitch: -0.06, fov: (2 * Math.atan(12 / f) * 180) / Math.PI };
          const items = [];
          for (const o of OBJ) for (const it of o.item) items.push({ ...it, p: [o.x + (it.dx || 0), it.y || 0, o.z] });
          let rr = null;
          M.art.frame(x, { ...L.F, aspect: 1.5, label: `${f}mm f/${N}`, rec: true, time, draw: (x, r) => {
            rr = r;
            CK().world(x, r, cam, items, {
              backdrop: "street", bh: 0.55 * (f / 50), span: 1.2, lit: true, time,
              blur: (z) => (z > 1e5 ? coc(dist(30)) * 0.6 : coc(z)),
              mid: (x, F) => {
                const bb = coc(dist(11));
                for (const [lx, ly, lz, k] of LIGHTS) {
                  const v = M.cam.toView(cam, [lx, ly, lz]); if (v[2] < 1) continue;
                  const q = M.cam.project(cam, v, r.w, r.h), qx = r.x + q[0], qy = r.y + q[1];
                  if (qx < r.x - 60 || qx > r.x + r.w + 60) continue;
                  const r0 = Math.max(1.6, (0.07 * F) / v[2]), R = r0 + bb * 1.1;
                  x.beginPath(); x.arc(qx, qy, R, 0, TAU);
                  x.fillStyle = M.alpha(LCOL[k], M.clamp(0.95 * (r0 * r0 + 6) / (R * R + 6), 0.32, 0.95)); x.fill();
                  if (R > 5) { x.strokeStyle = M.alpha(LCOL[k], 0.85); x.lineWidth = 1.2; x.stroke(); }
                }
              },
            });
            x.fillStyle = "rgba(40,30,60,0.12)"; x.fillRect(r.x, r.y, r.w, r.h);
          } });
          if (rr) {
            // 대상마다 태그: 초점이 맞으면 노랑, 웹 단계에서는 레이어 blur 값
            const LAYER = { "꽃": ".near", B: ".mid", A: ".far" };
            for (const o of OBJ) {
              const it = items.find((q) => (o.lab === "꽃" ? q.name === "flower" : q.who === o.lab));
              if (!it || !it.scr) continue;
              const b = coc(dist(o.z)), sharp = b < 1.2;
              if (!sharp && step !== 5 && step !== 3) continue;
              const txt = step === 5 ? `${LAYER[o.lab]} ${sharp ? "선명" : `blur(${b.toFixed(0)}px)`}` : sharp ? `초점: ${o.lab}` : o.lab;
              const tx = M.clamp(it.scr.x, rr.x + 60, rr.x + rr.w - 60), ty = M.clamp(o.lab === "A" ? it.scr.y - it.scr.h * 0.5 : it.scr.y - it.scr.h - 14, rr.y + 14, rr.y + rr.h - 14);
              CK().tag(x, txt, tx, ty, { align: "center", size: 11.5, mono: step === 5, fill: sharp ? c.key : c.surface });
            }
          }
          // ---- 거리 도면 ----
          const P = L.P;
          CK().panel(x, P.x, P.y, P.w - 3, P.h - 3, "옆에서 본 거리");
          x.save(); M.rrect(x, P.x, P.y, P.w - 3, P.h - 3, 10); x.clip();
          const maxD = Math.max(dF * 1.15, 8), L0 = P.x + 34, L1 = P.x + P.w - 16, gy = P.y + P.h - 40;
          const DX = (d) => L0 + (d / maxD) * (L1 - L0);
          const H_ = (fm * fm) / (N * 0.00003) + fm;
          const nearL = (s * (H_ - fm)) / (H_ + s - 2 * fm), farL = s < H_ ? (s * (H_ - fm)) / (H_ - s) : Infinity;
          const top = P.y + 60, pxPerM = Math.min(42, (gy - top - 14) / 2), camY = gy - 1.45 * pxPerM;
          x.fillStyle = M.alpha(c.c, 0.22); x.fillRect(DX(nearL), top, Math.min(L1, DX(Math.min(farL, maxD * 2))) - DX(nearL), gy - top);
          M.line(x, P.x + 6, gy, P.x + P.w - 6, gy, c.ink, 1);
          const ha = Math.atan(12 / f);
          x.beginPath(); x.moveTo(L0 - 12, camY); x.lineTo(L0 - 12 + P.w, camY - Math.tan(ha) * P.w); x.lineTo(L0 - 12 + P.w, camY + Math.tan(ha) * P.w); x.closePath(); x.fillStyle = M.alpha(c.key, 0.1); x.fill();
          OBJ.forEach((o) => {
            const d = dist(o.z), qx = DX(d), sharp = coc(d) < 1;
            for (const it of o.item) {
              if (it.kind === "person") M.art.person(x, { cx: qx, cy: gy, h: it.hgt * pxPerM, who: it.who, view: "profile-left", shadow: false, alpha: sharp ? 1 : 0.4 });
              else M.art.prop(x, it.name, { cx: qx + (it.dx || 0) * pxPerM, cy: gy - (it.y || 0) * pxPerM, s: it.hgt * pxPerM, alpha: sharp ? 1 : 0.4 });
            }
          });
          M.line(x, DX(s), top - 6, DX(s), gy, c.key, 2);
          CK().tag(x, "초점면", DX(s), top - 14, { align: DX(s) > P.x + P.w - 70 ? "right" : "center", size: 11, fill: c.key });
          M.line(x, L0 - 12, camY, L0 - 12, gy, M.alpha(c.ink, 0.4), 2); CK().cam(x, L0 - 12, camY, 0, { s: 1.1 });
          M.text(x, `심도 ${nearL.toFixed(1)}m ~ ${farL === Infinity ? "∞" : farL.toFixed(1) + "m"}`, P.x + 12, gy + 22, { size: 11, mono: true, color: c.ink });
          M.text(x, `카메라~B ${dM.toFixed(1)}m`, P.x + P.w - 14, gy + 22, { size: 11, mono: true, align: "right", color: c.muted });
          x.restore();
          const fov = (2 * Math.atan(18 / f) * 180) / Math.PI;
          const kind = f < 35 ? "광각" : f <= 70 ? "표준" : "망원";
          const dofTxt = farL === Infinity ? "∞" : farL.toFixed(1) + "m";
          ro.innerHTML = `<b>${f}mm (${kind})</b> · 가로 화각 ${fov.toFixed(0)}°\n<b>f/${N}</b> · 초점 ${s.toFixed(1)}m\n선명한 범위: ${nearL.toFixed(1)}m ~ ${dofTxt}`;
          const bf = coc(dist(OBJ[2].z)), bn = coc(dist(OBJ[0].z)), bm = coc(dist(0));
          const t = [
            "/* 거리만큼 흐리게: 웹의 피사계 심도 */",
            `.layer--far  { filter: blur(${bf.toFixed(0)}px); }`,
            `.layer--mid  { filter: ${bm < 0.5 ? "none" : `blur(${bm.toFixed(0)}px)`}; }`,
            `.layer--near { filter: blur(${bn.toFixed(0)}px); }`,
            "",
            "/* 랙 포커스: 초점을 옮기는 전환 */",
            ".layer { transition: filter .8s ease-in-out; }",
            ".scene.rack .layer--near { filter: none; }",
            ".scene.rack .layer--mid  { filter: blur(6px); }",
            ".scene.rack .layer--far  { filter: blur(12px); }",
            "",
            "/* 뒤를 흐리는 유리 패널 */",
            ".sheet { backdrop-filter: blur(16px); }",
          ].join("\n");
          if (t !== lastCode) { lastCode = t; api.code(t, HL[step], "CSS 심도"); }
        },
      };
    },
  });
})();
