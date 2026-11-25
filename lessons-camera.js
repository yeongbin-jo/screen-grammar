/* 카메라와 편집 (1): camera-moves, cuts
   + 영상 레슨 공용 도구 CamKit (lessons-camera2.js 도 사용). 인물·소품·배경은 M.art(art.js). */

/* ---------- CamKit: 도면 패널, 카메라 기호, 탑뷰 인물, 2.5D 빌보드 장면 ---------- */
window.CamKit = (() => {
  const K = {};
  const TAU = Math.PI * 2;
  K.approach = (cur, tgt, dt, ms = 140) => cur + (tgt - cur) * (1 - Math.exp(-(dt || 16) / ms));
  K.dark = () => {
    const bg = M.col().bg || "#fff";
    if (bg[0] !== "#") return false;
    const n = parseInt(bg.slice(1), 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 < 0.4;
  };
  /* 알약 태그: 진한 색(key, b) 바탕이면 다크 모드에서도 글자를 어둡게 */
  K.tag = (x, str, px, py, o = {}) => {
    const c = M.col(), hot = o.fill && (o.fill === c.key || o.fill === c.b);
    return M.tag(x, str, px, py, hot ? { ...o, color: K.dark() ? c.bg : c.ink } : o);
  };
  /* 도면 패널: 옅은 면 + 잉크 1px + 오프셋 그림자 + 모눈 + 왼쪽 위 알약 제목 */
  K.panel = (x, X, Y, W, H, title, o = {}) => {
    const c = M.col();
    x.save();
    M.rrect(x, X + 2, Y + 3, W, H, 10); x.fillStyle = c.ink; x.fill();
    M.rrect(x, X, Y, W, H, 10); x.fillStyle = c.surface; x.fill();
    if (o.grid !== false) {
      x.save(); x.clip();
      x.strokeStyle = M.alpha(c.ink, 0.05); x.lineWidth = 1; x.beginPath();
      for (let gx = X + 16; gx < X + W; gx += 16) { x.moveTo(gx + 0.5, Y); x.lineTo(gx + 0.5, Y + H); }
      for (let gy = Y + 16; gy < Y + H; gy += 16) { x.moveTo(X, gy + 0.5); x.lineTo(X + W, gy + 0.5); }
      x.stroke(); x.restore();
    }
    M.rrect(x, X + 0.5, Y + 0.5, W - 1, H - 1, 10); x.lineWidth = 1; x.strokeStyle = c.ink; x.stroke();
    x.restore();
    if (title) K.tag(x, title, X + 10, Y + 17, { size: 11 });
  };
  /* 카메라 기호: (px,py) 에 놓고 ang 방향(화면 각도)을 봄 */
  K.cam = (x, px, py, ang, o = {}) => {
    const c = M.col(), col = o.color || c.key, s = o.s || 1;
    x.save(); x.translate(px, py); x.rotate(ang); x.scale(s, s);
    if (o.alpha != null) x.globalAlpha *= o.alpha;
    x.lineWidth = 1 / s; x.strokeStyle = c.ink; x.lineJoin = "round";
    M.rrect(x, -12, -7, 16, 14, 3); x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(col, 0.55); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(4, -3.5); x.lineTo(10, -6); x.lineTo(10, 6); x.lineTo(4, 3.5); x.closePath();
    x.fillStyle = c.surface; x.fill(); x.fillStyle = M.alpha(col, 0.3); x.fill(); x.stroke();
    x.beginPath(); x.arc(-6, -7, 3, Math.PI, 0); x.arc(0, -7, 3, Math.PI, 0); x.stroke();
    x.restore();
  };
  /* 화각 쐐기 */
  K.wedge = (x, px, py, ang, half, L, col, a = 0.14) => {
    const c = M.col(); col = col || c.key;
    x.save();
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(ang - half) * L, py + Math.sin(ang - half) * L);
    x.lineTo(px + Math.cos(ang + half) * L, py + Math.sin(ang + half) * L); x.closePath();
    x.fillStyle = M.alpha(col, a); x.fill();
    x.strokeStyle = M.alpha(col, 0.9); x.lineWidth = 1.2; x.setLineDash([5, 4]);
    x.beginPath(); x.moveTo(px + Math.cos(ang - half) * L, py + Math.sin(ang - half) * L); x.lineTo(px, py); x.lineTo(px + Math.cos(ang + half) * L, py + Math.sin(ang + half) * L); x.stroke();
    x.restore();
  };
  /* 탑뷰 인물: 어깨 타원 + 머리 + 코(바라보는 방향). ang = 바라보는 화면 각도 */
  K.topPerson = (x, px, py, ang, who, r, o = {}) => {
    const c = M.col(), P = M.art.PAL[who === "B" ? "B" : "A"];
    x.save(); x.translate(px, py); x.rotate(ang);
    if (o.alpha != null) x.globalAlpha *= o.alpha;
    x.lineWidth = 1; x.strokeStyle = c.ink;
    x.beginPath(); x.ellipse(1.5, 0, r * 0.5, r * 1.12, 0, 0, TAU); x.fillStyle = M.alpha(c.ink, 0.18); x.fill();
    x.beginPath(); x.ellipse(0, 0, r * 0.5, r * 1.12, 0, 0, TAU); x.fillStyle = P.top; x.fill(); x.stroke();
    x.beginPath(); x.ellipse(r * 0.52, 0, r * 0.2, r * 0.24, 0, 0, TAU); x.fillStyle = P.skin; x.fill(); x.stroke();
    x.beginPath(); x.arc(0, 0, r * 0.56, 0, TAU); x.fillStyle = P.hair; x.fill(); x.stroke();
    x.restore();
  };
  /* 탑뷰 소품 기호 */
  K.topTree = (x, px, py, r, o = {}) => {
    const c = M.col();
    x.save(); if (o.alpha != null) x.globalAlpha *= o.alpha;
    x.beginPath(); x.arc(px, py, r, 0, TAU); x.fillStyle = M.alpha(c.c, 0.22); x.fill();
    x.lineWidth = 1; x.strokeStyle = M.alpha(c.ink, 0.8); x.stroke();
    x.beginPath(); x.arc(px, py, Math.max(1.5, r * 0.18), 0, TAU); x.fillStyle = M.alpha(c.ink, 0.5); x.fill();
    x.restore();
  };
  K.topBox = (x, px, py, w, h, col, o = {}) => {
    const c = M.col();
    x.save(); if (o.alpha != null) x.globalAlpha *= o.alpha;
    M.rrect(x, px - w / 2, py - h / 2, w, h, Math.min(4, w / 4, h / 4)); x.fillStyle = M.alpha(col || c.key, 0.22); x.fill();
    x.lineWidth = 1; x.strokeStyle = M.alpha(c.ink, 0.8); x.stroke();
    x.restore();
  };
  /* 카메라에서 본 인물 방향 이름. facing = [fx, fy, fz] (월드) */
  const VIEWS = [[-180, "back"], [-90, "profile-left"], [-45, "three-quarter-left"], [0, "front"], [45, "three-quarter-right"], [90, "profile-right"], [180, "back"]];
  K.viewOf = (cam, f) => {
    const cy = Math.cos(-cam.yaw), sy = Math.sin(-cam.yaw);
    const vx = f[0] * cy + f[2] * sy, vz = -f[0] * sy + f[2] * cy;
    const a = (Math.atan2(vx, -vz) * 180) / Math.PI;
    let best = VIEWS[0], bd = 1e9;
    for (const v of VIEWS) { const d = Math.abs(a - v[0]); if (d < bd) { bd = d; best = v; } }
    return best[1];
  };
  const wrapPI = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  /* 흐림: 벡터를 바로 blur 하면 경로마다 따로 흐려져 매우 느림 → 오프스크린에 그린 뒤 한 번에 흐림 */
  let LAY = null;
  const blurred = (x, r, b, fn) => {
    if (!(b > 0.4)) { fn(x); return; }
    const T = x.getTransform(), W = Math.ceil(r.w * T.a) + 2, H = Math.ceil(r.h * T.d) + 2;
    if (!LAY) LAY = document.createElement("canvas");
    if (LAY.width !== W || LAY.height !== H) { LAY.width = W; LAY.height = H; }
    const l = LAY.getContext("2d");
    l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(0, 0, W, H);
    l.setTransform(T.a, 0, 0, T.d, -r.x * T.a, -r.y * T.d);
    fn(l);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.filter = `blur(${(Math.min(40, b) * T.a).toFixed(1)}px)`;
    x.drawImage(LAY, T.e + r.x * T.a, T.f + r.y * T.d); x.restore();
  };
  K.blurred = blurred;
  const HOR = { park: 0.62, street: 0.74, room: 0.68, studio: 0.7 };
  const GROUND = { park: ["#b3cd9c", "#93b97d"], street: ["#d8cfc1", "#c9bfae"], room: ["#c9a37f", "#b58e69"], studio: ["#d9d2c7", "#cbc3b7"] };
  /* 2.5D 장면: 무한 원경(backdrop) + 바닥 + 빌보드(인물·소품). 카메라는 M.cam 형식.
     items: {kind:"person"|"prop", p:[x,0,z], hgt(m), who, face:[fx,0,fz], view, pose, expr, name, flip}
     o: {backdrop, yawRef, grid, time, blur(z)->px}. 반환: 각 item 에 .scr = {x,y,h,z,ret} 기록 */
  K.world = (x, r, cam, items, o = {}) => {
    const c = M.col();
    const f = (r.h / 2) / Math.tan((cam.fov * Math.PI) / 360);
    const hor = r.y + r.h / 2 + Math.tan(cam.pitch) * f;
    let kind = o.backdrop || "park", ref = o.yawRef || 0;
    if (o.backdrops) { const fwd = Math.cos(cam.yaw); kind = fwd >= 0 ? o.backdrops[0] : o.backdrops[1]; ref = fwd >= 0 ? 0 : Math.PI; }
    const dy = wrapPI(cam.yaw - ref);
    x.save(); x.beginPath(); x.rect(r.x, r.y, r.w, r.h); x.clip();
    x.fillStyle = kind === "street" ? "#d3e3e8" : kind === "room" ? "#efe3d1" : "#d4e5ea"; x.fillRect(r.x, r.y, r.w, r.h);
    const Hb = r.h * (o.bh || 1.1), Wb = r.w + 2 * f * (o.span || 1.7) + 40;
    const fr = HOR[kind] || 0.65, by = hor - fr * Hb, bx = r.x + r.w / 2 - Wb / 2 - dy * f;
    const cut = hor + Hb * (kind === "park" ? 0.04 : 0.01);
    const bl = o.blur ? o.blur(1e6) : 0;
    blurred(x, r, bl, (x) => {
      x.save(); x.beginPath(); x.rect(r.x, r.y, r.w, Math.max(0, cut - r.y)); x.clip();
      if (bl > 0.4) { x.fillStyle = kind === "street" ? "#d3e3e8" : "#d4e5ea"; x.fillRect(r.x, r.y, r.w, r.h); }
      M.art.backdrop(x, kind, { x: bx, y: by, w: Wb, h: Hb, time: o.time, lit: o.lit });
      x.restore();
      if (cut < r.y + r.h) {
        const G = GROUND[kind] || GROUND.park, g = x.createLinearGradient(0, cut, 0, r.y + r.h);
        g.addColorStop(0, G[0]); g.addColorStop(1, G[1]);
        x.fillStyle = g; x.fillRect(r.x, cut, r.w, r.y + r.h - cut);
        if (K.dark()) { x.fillStyle = "rgba(12,10,8,0.16)"; x.fillRect(r.x, cut, r.w, r.y + r.h - cut); }
        x.strokeStyle = M.alpha(c.ink, 0.45); x.lineWidth = 1; x.beginPath(); x.moveTo(r.x, cut + 0.5); x.lineTo(r.x + r.w, cut + 0.5); x.stroke();
      }
    });
    if (o.grid) {
      x.save(); x.beginPath(); x.rect(r.x, Math.max(r.y, cut), r.w, r.y + r.h - Math.max(r.y, cut)); x.clip();
      x.translate(r.x, r.y); M.drawGround(x, cam, r.w, r.h, "rgba(60,45,30,0.16)", 40, 2); x.restore();
    }
    if (o.mid) o.mid(x, f, hor);
    const vis = [];
    for (const it of items) {
      it.scr = null;
      const v = M.cam.toView(cam, it.p);
      if (v[2] < (it.near || 0.35)) continue;
      const s = M.cam.project(cam, v, r.w, r.h);
      vis.push({ it, z: v[2], sx: r.x + s[0], sy: r.y + s[1], px: (it.hgt * f) / v[2] });
    }
    vis.sort((a, b) => b.z - a.z);
    for (const q of vis) {
      const it = q.it;
      if (q.px < 2 || q.px > r.h * 40) continue;
      const b = o.blur ? o.blur(q.z) : 0;
      let ret = null;
      blurred(x, r, b, (x) => {
        if (it.squash) { x.save(); x.translate(q.sx, q.sy); x.scale(1, it.squash); x.translate(-q.sx, -q.sy); }
        if (it.kind === "person") {
          const view = it.view || (it.face ? K.viewOf(cam, it.face) : "front");
          ret = M.art.person(x, { cx: q.sx, cy: q.sy, h: q.px, who: it.who, view, pose: it.pose, phase: it.phase, expr: it.expr, mouth: it.mouth, alpha: it.alpha });
          it.view_ = view;
        } else M.art.prop(x, it.name, { cx: q.sx, cy: q.sy, s: q.px, time: o.time, flip: it.flip, lit: it.lit, alpha: it.alpha });
        if (it.squash) x.restore();
      });
      it.scr = { x: q.sx, y: q.sy, h: q.px, z: q.z, ret };
    }
    x.restore();
    return { f, hor };
  };
  /* 프레임 + 오른쪽(또는 아래) 패널 배치. 반환 {F, P, S(아래 띠|null), wide} */
  K.layout = (w, h, o = {}) => {
    const ar = o.aspect || 16 / 9, extra = 30, gap = 14, ratio = o.ratio || 0.62, strip = o.strip || 0;
    if (w / h >= (o.wideAt || 1.2)) {
      let fw = w * ratio, fh = fw / ar + extra;
      const room = h - (strip ? strip + gap : 0);
      if (fh > room) { fh = room; fw = (fh - extra) * ar; }
      const ph = Math.max(fh, Math.min(h - (strip ? strip + gap : 0), fh * (o.pk || 1.25)));
      const top = Math.max(0, (h - ph - (strip ? strip + gap : 0)) / 2);
      const F = { x: 0, y: top + (ph - fh) / 2, w: fw, h: fh };
      const P = { x: fw + gap, y: top, w: w - fw - gap, h: ph };
      const S = strip ? { x: 0, y: top + ph + gap, w, h: strip } : null;
      return { F, P, S, wide: true };
    }
    let fw = w, fh = fw / ar + extra;
    const minP = o.minPanel || 170;
    if (fh > h - minP - gap) { fh = Math.max(140, h - minP - gap); fw = Math.min(w, (fh - extra) * ar); }
    const F = { x: (w - fw) / 2, y: 0, w: fw, h: fh };
    const P = { x: 0, y: fh + gap, w, h: h - fh - gap };
    return { F, P, S: null, wide: false };
  };
  /* 썸네일 띠: 각 칸을 오프스크린에 한 번 그려 두고 재사용. items: [{k, sub}] */
  const CACHE = {};
  K.strip = (x, S, items, active, draw, key) => {
    const c = M.col(), n = items.length, g = 8, labH = 18;
    const tw = (S.w - 3 - g * (n - 1)) / n, th = Math.max(10, Math.min(S.h - labH - 4, (tw * 9) / 16));
    const ch = CACHE[key] || (CACHE[key] = {});
    const d = window.devicePixelRatio || 1, sig = `${Math.round(tw)}x${Math.round(th)}|${c.bg}|${d}`;
    if (ch.sig !== sig) {
      ch.sig = sig;
      ch.imgs = items.map((_, i) => {
        const cv = document.createElement("canvas"); cv.width = Math.ceil(tw * d); cv.height = Math.ceil(th * d);
        const cx = cv.getContext("2d"); cx.scale(d, d); cx.save(); cx.beginPath(); cx.rect(0, 0, tw, th); cx.clip();
        draw(i, cx, { x: 0, y: 0, w: tw, h: th }); cx.restore(); return cv;
      });
    }
    const y0 = S.y + (S.h - th - labH) / 2;
    items.forEach((it, i) => {
      const X = S.x + i * (tw + g), on = i === active;
      x.save(); if (!on) x.globalAlpha = 0.5;
      if (on) { M.rrect(x, X + 2, y0 + 3, tw, th, 6); x.fillStyle = c.ink; x.fill(); }
      x.save(); M.rrect(x, X, y0, tw, th, 6); x.clip(); x.drawImage(ch.imgs[i], X, y0, tw, th); x.restore();
      M.rrect(x, X + 0.5, y0 + 0.5, tw - 1, th - 1, 6); x.lineWidth = on ? 2.5 : 1; x.strokeStyle = on ? c.key : c.ink; x.stroke();
      M.text(x, it.k, X + tw / 2, y0 + th + 14, { size: 11, mono: true, weight: 700, align: "center", color: on ? c.ink : c.muted });
      x.restore();
    });
    return { tw, th, y0, g };
  };
  /* 좁은 화면에서 fill 캔버스 최소 높이 키우기 */
  K.minH = (cv, px) => { const v = px ? Math.round(px) + "px" : ""; if (cv.style.minHeight !== v) cv.style.minHeight = v; };
  return K;
})();

/* ===== 카메라 무브 사전 ===== */
LESSONS.push({
  id: "camera-moves", ch: 9, order: 1,
  title: "카메라 무브 사전",
  lede: "팬, 트럭, 달리, 줌처럼 카메라 움직임을 부르는 이름 여덟 가지를 익힙니다. 왼쪽은 카메라에 찍히는 화면, 오른쪽은 촬영장 도면, 아래는 무엇이 바뀌고 무엇이 그대로인지 정리한 카드입니다.",
  key: "회전(팬·틸트)은 원근이 그대로, 이동(트럭·페데스탈·달리)은 시차가 생기고, 줌은 렌즈만 바꿉니다. 무엇을 움직이는지부터 말하면 오해가 없습니다.",
  steps: [
    ["팬 Pan", "카메라는 제자리에서 <b>고개만 좌우로</b> 돌립니다. 아래 카드에서 '방향'만 노랗게 바뀌는 것을 보세요. 화면 속 가까운 나무와 먼 건물이 <b>같은 속도</b>로 흘러가서 앞뒤 겹침이 변하지 않습니다. 두 인물 사이로 시선을 옮기거나 풍경을 훑을 때 씁니다."],
    ["틸트 Tilt", "제자리에서 <b>고개를 위아래로</b> 돌립니다. 오른쪽 도면은 옆에서 본 모습이고, 노란 부채꼴이 아래에서 위로 들립니다. 인물 발끝에서 뒤 건물 꼭대기까지 훑어 올리면 높이와 규모가 강조됩니다."],
    ["트럭 Truck", "카메라 <b>몸통이 옆으로</b> 이동합니다. 화면의 화살표 길이를 비교해 보세요. 가까운 나무는 빨리, 먼 건물은 거의 안 움직입니다. 이 속도 차이가 <b>시차(패럴랙스)</b>이고, 평면 화면에 입체감을 만듭니다."],
    ["페데스탈 Pedestal", "카메라 몸통이 <b>위아래로</b> 이동합니다. 틸트와 달리 시선 방향(부채꼴 각도)은 그대로입니다. 오른쪽 도면에서 카메라가 기둥을 타듯 오르내리는 것을 보세요. 크레인으로 크게 오르내리면 '크레인 숏'이라고 부릅니다."],
    ["달리 Dolly", "카메라가 <b>앞뒤로</b> 다가가거나 물러납니다. 화면 태그를 보면 A는 크게 커지지만 먼 건물은 거의 그대로입니다. 거리 비율이 바뀌어 공간 속으로 들어가는 느낌이 납니다. 물러나는 쪽은 달리 아웃입니다."],
    ["줌 Zoom", "카메라는 가만히 있고 <b>렌즈의 화각만</b> 좁힙니다. 태그를 보면 A와 건물이 <b>같은 배율</b>로 커집니다. 원근이 그대로라 사진을 확대한 느낌이고, 달리와 달리 앞뒤 겹침이 전혀 바뀌지 않습니다."],
    ["달리 줌 Dolly zoom", "다가가면서(달리 인) 동시에 화각을 넓혀(줌 아웃) <b>A 크기를 고정</b>합니다. 태그에서 A는 ×1.0 인데 뒤 건물만 작아지며 멀어집니다. 공간이 늘어나는 듯한 어지러운 효과로, 영화 「현기증」 이후 '버티고 효과'라고도 부릅니다."],
    ["오빗 Orbit", "A를 중심에 두고 <b>원을 그리며</b> 돕니다. '아크 숏'이라고도 합니다. A의 얼굴 방향이 3/4 → 정면 → 3/4로 바뀌고 배경이 크게 돌아가서, A가 무대의 중심이라는 인상을 줍니다. 제품 영상과 주인공 등장 장면에 흔합니다."],
  ],
  terms: [
    ["팬 · 틸트", "Pan · Tilt", "제자리 회전. 좌우가 팬, 위아래가 틸트. 원근은 변하지 않습니다."],
    ["트럭 · 페데스탈", "Truck · Pedestal", "몸통 이동. 좌우가 트럭, 위아래가 페데스탈. 시차가 생깁니다."],
    ["달리", "Dolly in · out", "앞뒤 이동. 레일 위 수레(dolly)에서 온 이름. 피사체를 따라가면 트래킹 숏이라고 합니다."],
    ["줌", "Zoom", "렌즈 화각(초점거리)만 바꿈. 카메라는 움직이지 않아 원근이 그대로입니다."],
    ["시차", "Parallax", "이동할 때 가까운 것은 빨리, 먼 것은 느리게 움직이는 현상. 웹의 패럴랙스 스크롤도 이것을 흉내 냅니다."],
    ["화각", "Field of view", "렌즈가 담는 각도. 좁으면 망원, 넓으면 광각. 도면의 노란 부채꼴입니다."],
  ],
  mount(api) {
    const CK = window.CamKit;
    const cv = api.canvas("fill");
    const S = [0, 0, 6];
    const MOVES = ["pan", "tilt", "truck", "pedestal", "dolly", "zoom", "dollyzoom", "orbit"];
    const CODE = ["PAN", "TILT", "TRUCK", "PEDESTAL", "DOLLY IN", "ZOOM IN", "DOLLY ZOOM", "ORBIT"];
    // 무엇이 바뀌는가: [위치, 방향, 화각]
    const CHG = { pan: [0, 1, 0], tilt: [0, 1, 0], truck: [1, 0, 0], pedestal: [1, 0, 0], dolly: [1, 0, 0], zoom: [0, 0, 1], dollyzoom: [1, 0, 1], orbit: [1, 1, 0] };
    let step = 0, dur = 2600, auto = true, manualP = 0, prevCam = null, lastCam = null;
    M.slider(api.controls, { id: "cmdur", label: "움직임 길이", min: 1200, max: 5000, step: 100, value: 2600, unit: " ms", onInput: (v) => (dur = v) });
    const scrub = M.slider(api.controls, { id: "cmscrub", label: "진행 (끌면 직접 움직임)", min: 0, max: 100, value: 0, unit: "%", onInput: (v) => { auto = false; manualP = v / 100; autoChk.set(false); } });
    const autoChk = M.check(api.controls, { id: "cmauto", label: "자동 왕복 재생", checked: true, onChange: (v) => { auto = v; api.restart(); } });
    const grid = M.check(api.controls, { id: "cmgrid", label: "바닥 격자 보기", checked: true });
    const ro = M.readout(api.controls);

    const tree = (X, Z, hgt) => ({ kind: "prop", name: "tree", p: [X, 0, Z], hgt });
    const items = [
      { kind: "prop", name: "building", p: [-2.5, 0, 27], hgt: 12, tag: "far" },
      tree(-6.5, 18, 4.5), tree(6.5, 20, 5), tree(2.4, 17, 4.2), tree(-9, 13, 4.4), tree(8.5, 11, 4),
      { kind: "prop", name: "car", p: [3.6, 0, 10.5], hgt: 1.45 },
      tree(-4, 9.5, 3.8),
      { kind: "person", who: "A", p: S, hgt: 1.75, face: [0, 0, -1], expr: "smile", tag: "subj" },
      { ...tree(3.4, 3.2, 2.7), tag: "near2" }, { ...tree(-3.2, 3.6, 2.9), tag: "near" },
    ];
    function camAt(move, p) {
      const cam = { pos: [0, 1.5, 0], yaw: 0, pitch: -0.03, fov: 52 };
      const e = M.ease.inOut(p);
      switch (move) {
        case "pan": cam.yaw = M.lerp(-0.45, 0.45, e); break;
        case "tilt": cam.pitch = M.lerp(-0.2, 0.42, e); cam.pos[2] = 1.5; break;
        case "truck": cam.pos[0] = M.lerp(-2.6, 2.6, e); break;
        case "pedestal": cam.pos[1] = M.lerp(0.5, 4.4, e); cam.pitch = -0.1; break;
        case "dolly": cam.pos[2] = M.lerp(0, 3.7, e); break;
        case "zoom": cam.fov = M.lerp(52, 19, e); break;
        case "dollyzoom": {
          cam.pos[2] = M.lerp(0, 3.9, e);
          const d = S[2] - cam.pos[2];
          cam.fov = (2 * Math.atan((Math.tan((52 * Math.PI) / 360) * S[2]) / d) * 180) / Math.PI;
          break;
        }
        case "orbit": { const a = M.lerp(-0.85, 0.85, e), R = 6; cam.yaw = a; cam.pos = [S[0] - R * Math.sin(a), 1.5, S[2] - R * Math.cos(a)]; cam.pitch = -0.03; break; }
      }
      return cam;
    }
    const lerpCam = (a, b, t) => ({ pos: a.pos.map((v, i) => M.lerp(v, b.pos[i], t)), yaw: M.lerp(a.yaw, b.yaw, t), pitch: M.lerp(a.pitch, b.pitch, t), fov: M.lerp(a.fov, b.fov, t) });
    const base = {}, prevX = {};
    const FAR = items[0];
    return {
      setStep(s) { step = s; prevCam = lastCam; auto = true; autoChk.set(true); for (const k in prevX) delete prevX[k]; },
      frame(time, dt) {
        const c = M.col();
        const r0 = cv.getBoundingClientRect();
        CK.minH(cv, r0.width < 560 ? r0.width * 9 / 16 + 30 + 14 + 230 : 0);
        const { x, w, h } = M.fit(cv);
        const move = MOVES[step];
        const T0 = 380;
        let p;
        if (auto) { const pp = M.pingpong(Math.max(0, time - T0), dur, 700); p = pp.back ? 1 - pp.p : pp.p; scrub.set(Math.round(p * 100)); }
        else p = manualP;
        let cam = camAt(move, p);
        if (prevCam && time < T0) cam = lerpCam(prevCam, cam, M.ease.out(time / T0));
        lastCam = cam;
        const L = CK.layout(w, h, { ratio: 0.63, pk: 1.05, strip: h > 330 ? Math.min(78, h * 0.17) : 0 });
        // ---- 카메라 화면 ----
        const fr = M.art.frame(x, { ...L.F, aspect: 16 / 9, label: CODE[step], rec: true, time, draw: (x, r) => {
          CK.world(x, r, cam, move === "orbit" ? items.filter((i) => i.tag !== "near" && i.tag !== "near2") : items, { backdrop: "park", bh: 0.9, grid: grid.get(), time });
        } });
        // 기준 크기(시작 프레임)
        const r = fr;
        if (!base[step] || base[step].w !== r.w) {
          const c0 = camAt(move, 0), f0 = (r.h / 2) / Math.tan((c0.fov * Math.PI) / 360);
          const sz = (P, hg) => { const v = M.cam.toView(c0, P); return (hg * f0) / v[2]; };
          base[step] = { w: r.w, subj: sz(S, 1.75), far: sz(FAR.p, FAR.hgt) };
        }
        fr.overlay();
        const subj = items.find((i) => i.tag === "subj"), far = FAR, near = items.find((i) => i.tag === "near");
        x.save(); x.beginPath(); x.rect(r.x, r.y, r.w, r.h); x.clip();
        const fsz = 11.5;
        if (move === "pan" || move === "truck") {
          for (const it of [near, far]) {
            if (!it.scr) continue;
            const key = it.tag, px = prevX[key];
            prevX[key] = it.scr.x;
            if (px == null || !dt) continue;
            const v = ((it.scr.x - px) / dt) * 260;
            it.vel = it.vel == null ? v : M.lerp(it.vel, v, 0.25);
            const ay = it === far ? Math.max(r.y + 40, it.scr.y - it.scr.h * 0.7) : Math.max(r.y + 70, it.scr.y - it.scr.h * 0.55);
            const ax = M.clamp(it.scr.x, r.x + 50, r.x + r.w - 50);
            if (Math.abs(it.vel) > 2) M.arrow(x, ax, ay, ax + M.clamp(it.vel, -r.w * 0.3, r.w * 0.3), ay, c.key, 3);
            CK.tag(x, it === near ? (move === "truck" ? "가까운 나무: 빠름" : "가까운 나무") : (move === "truck" ? "먼 건물: 느림" : "먼 건물"), ax, ay - 18, { align: "center", size: fsz });
          }
          if (move === "pan") CK.tag(x, "앞뒤가 같은 속도로 흐름", r.x + r.w / 2, r.y + r.h - 22, { align: "center", size: fsz, fill: c.key, color: c.ink });
        } else if (subj.scr && (move === "dolly" || move === "zoom" || move === "dollyzoom")) {
          const ks = subj.scr.h / base[step].subj, kf = far.scr ? far.scr.h / base[step].far : 1;
          const t1 = `A ×${ks.toFixed(1)}`, t2 = `먼 건물 ×${kf.toFixed(1)}`;
          CK.tag(x, t1, r.x + 12, r.y + r.h - 22, { size: fsz, mono: true, fill: c.key });
          CK.tag(x, t2, r.x + 12 + 86, r.y + r.h - 22, { size: fsz, mono: true });
        } else if (move === "orbit" && subj.view_) {
          const nm = { front: "정면", "three-quarter-left": "3/4", "three-quarter-right": "3/4", "profile-left": "옆모습", "profile-right": "옆모습" }[subj.view_] || subj.view_;
          M.callout(x, `A 얼굴: ${nm}`, subj.scr.x, subj.scr.y - subj.scr.h * 0.93, M.clamp(subj.scr.x + 60, r.x + 10, r.x + r.w - 110), r.y + 24, { size: fsz });
        } else if (move === "tilt" || move === "pedestal") {
          const deg = Math.round((cam.pitch * 180) / Math.PI);
          CK.tag(x, move === "tilt" ? `틸트 ${deg > 0 ? "+" : ""}${deg}°` : `높이 ${cam.pos[1].toFixed(1)}m`, r.x + 12, r.y + r.h - 22, { size: fsz, mono: true, fill: c.key });
        }
        x.restore();

        // ---- 촬영장 도면 ----
        const P = L.P;
        const side = move === "tilt" || move === "pedestal";
        CK.panel(x, P.x, P.y, P.w, P.h, side ? "옆에서 본 촬영장" : "위에서 본 촬영장");
        x.save(); M.rrect(x, P.x, P.y, P.w, P.h, 10); x.clip();
        const pathPts = Array.from({ length: 31 }, (_, i) => camAt(move, i / 30));
        if (!side) {
          const xr = [-8.5, 8.5], zr = [-2.5, 29];
          const sc = Math.min((P.w - 24) / (xr[1] - xr[0]), (P.h - 46) / (zr[1] - zr[0]));
          const PX = (wx) => P.x + P.w / 2 + wx * sc, PZ = (wz) => P.y + P.h - 12 - (wz - zr[0]) * sc;
          for (const it of items) {
            const qx = PX(it.p[0]), qz = PZ(it.p[2]);
            if (it.name === "tree") CK.topTree(x, qx, qz, Math.max(3, 1.1 * sc), { alpha: it.tag === "near" ? 1 : 0.6 });
            else if (it.name === "building") { CK.topBox(x, qx, qz, 5 * sc, 3.5 * sc, c.key); CK.tag(x, "먼 건물", qx + 3 * sc, qz, { size: 11 }); }
            else if (it.name === "car") CK.topBox(x, qx, qz, 4 * sc, 1.8 * sc, c.a, { alpha: 0.55 });
          }
          CK.topPerson(x, PX(S[0]), PZ(S[2]), Math.PI / 2, "A", Math.max(5, 0.55 * sc));
          CK.tag(x, "A", PX(S[0]) + 9, PZ(S[2]) - 8, { size: 11 });
          // 경로
          x.save(); x.setLineDash([3, 4]); x.strokeStyle = c.ink; x.lineWidth = 1.2; x.beginPath();
          pathPts.forEach((cc, i) => (i ? x.lineTo(PX(cc.pos[0]), PZ(cc.pos[2])) : x.moveTo(PX(cc.pos[0]), PZ(cc.pos[2]))));
          x.stroke(); x.restore();
          const hf = Math.atan(Math.tan((cam.fov * Math.PI) / 360) * 16 / 9), ang = cam.yaw - Math.PI / 2;
          const cx0 = PX(cam.pos[0]), cz0 = PZ(cam.pos[2]);
          CK.wedge(x, cx0, cz0, ang, hf, Math.min(P.h * 0.75, 18 * sc));
          CK.cam(x, cx0, cz0, ang, { s: 1.1 });
          CK.tag(x, `화각 ${cam.fov.toFixed(0)}°`, P.x + P.w - 10, P.y + 17, { align: "right", size: 11, mono: true, fill: CHG[move][2] ? c.key : c.surface });
        } else {
          const zr = [-1.2, 13];
          const sc = (P.w - 20) / (zr[1] - zr[0]);
          const PZ = (wz) => P.x + 12 + (wz - zr[0]) * sc, PY = (wy) => P.y + P.h * 0.78 - wy * sc;
          x.fillStyle = M.alpha(c.c, 0.1); x.fillRect(P.x, PY(0), P.w, P.y + P.h - PY(0));
          M.line(x, P.x, PY(0), P.x + P.w, PY(0), c.ink, 1);
          for (const it of items) {
            if (it.kind === "person" || it.p[2] > zr[1] + 2) continue;
            M.art.prop(x, it.name, { cx: PZ(it.p[2]), cy: PY(0), s: it.hgt * sc, alpha: 0.35 });
          }
          CK.tag(x, "먼 건물 →", P.x + P.w - 10, PY(0) + 16, { align: "right", size: 11 });
          M.art.person(x, { cx: PZ(S[2]), cy: PY(0), h: 1.75 * sc, who: "A", view: "profile-left", shadow: false });
          x.save(); x.setLineDash([3, 4]); x.strokeStyle = c.ink; x.lineWidth = 1.2; x.beginPath();
          pathPts.forEach((cc, i) => (i ? x.lineTo(PZ(cc.pos[2]), PY(cc.pos[1])) : x.moveTo(PZ(cc.pos[2]), PY(cc.pos[1]))));
          x.stroke(); x.restore();
          const vf = (cam.fov * Math.PI) / 360, cz0 = PZ(cam.pos[2]), cy0 = PY(cam.pos[1]);
          M.line(x, cz0, PY(0), cz0, cy0, M.alpha(c.ink, 0.5), 2);
          CK.wedge(x, cz0, cy0, -cam.pitch, vf, Math.min(P.w * 0.8, 30 * sc));
          CK.cam(x, cz0, cy0, -cam.pitch, { s: 1.1 });
          CK.tag(x, move === "tilt" ? `틸트 ${Math.round((cam.pitch * 180) / Math.PI)}°` : `높이 ${cam.pos[1].toFixed(1)}m`, P.x + P.w - 10, P.y + 17, { align: "right", size: 11, mono: true, fill: c.key });
        }
        x.restore();

        // ---- 바뀌는 것 / 그대로인 것 ----
        if (L.S) {
          const S2 = L.S, n = 3, g = 10, cw = (S2.w - g * (n - 1)) / n;
          const deg = (a) => Math.round((a * 180) / Math.PI);
          const vals = [
            ["위치", `x ${cam.pos[0].toFixed(1)}  y ${cam.pos[1].toFixed(1)}  z ${cam.pos[2].toFixed(1)} m`],
            ["방향", `좌우 ${deg(cam.yaw)}°  상하 ${deg(cam.pitch)}°`],
            ["화각", `${cam.fov.toFixed(0)}°  (${(18 / Math.tan((cam.fov * Math.PI) / 360)).toFixed(0)}mm)`],
          ];
          vals.forEach(([k, v], i) => {
            const X = S2.x + i * (cw + g), on = CHG[move][i];
            x.save(); if (!on) x.globalAlpha = 0.5;
            M.rrect(x, X + 2, S2.y + 3, cw, S2.h, 10); x.fillStyle = c.ink; x.fill();
            M.rrect(x, X, S2.y, cw, S2.h, 10); x.fillStyle = c.surface; x.fill();
            if (on) { x.fillStyle = M.alpha(c.key, 0.22); x.fill(); }
            x.lineWidth = 1; x.strokeStyle = c.ink; x.stroke();
            M.text(x, k, X + 12, S2.y + 22, { size: 12.5, weight: 700, color: c.ink });
            CK.tag(x, on ? "바뀜" : "그대로", X + cw - 10, S2.y + 17, { align: "right", size: 11, fill: on ? c.key : c.surface });
            x.font = M.font(11.5, "mono", 500);
            const vv = x.measureText(v).width > cw - 24 ? v.replace(/  +/g, " ") : v;
            M.text(x, vv, X + 12, S2.y + Math.min(S2.h - 14, 48), { size: 11.5, mono: true, color: c.ink });
            x.restore();
          });
        }
        ro.innerHTML = `<b>${CODE[step]}</b> · 진행 ${Math.round(p * 100)}%\n위치 ${CHG[move][0] ? "바뀜" : "그대로"} · 방향 ${CHG[move][1] ? "바뀜" : "그대로"} · 화각 ${CHG[move][2] ? "바뀜" : "그대로"}`;
      },
    };
  },
});

/* ===== 컷의 종류 ===== */
LESSONS.push({
  id: "cuts", ch: 10, order: 2,
  title: "J컷, L컷, 그리고 컷의 종류",
  lede: "편집에서는 그림과 소리를 따로 자를 수 있습니다. 이 레슨을 마치면 스트레이트 컷, J컷, L컷, 디졸브, 매치 컷, 점프 컷을 타임라인 모양만 보고 구별할 수 있습니다. 위는 모니터, 아래는 편집 타임라인입니다.",
  key: "소리를 그림보다 먼저(J) 또는 나중까지(L) 걸치면 컷이 부드러워집니다. 컷 지점마다 '그림과 소리 중 무엇이 먼저 넘어가는가'를 정합니다.",
  steps: [
    ["스트레이트 컷", "그림과 소리가 <b>같은 순간에</b> 바뀝니다. 타임라인에서 영상 트랙과 소리 트랙의 경계가 한 줄로 맞아 있습니다. 가장 기본적인 컷이지만 장면이 뚝 끊기는 느낌이 날 수 있습니다."],
    ["J컷", "다음 장면의 <b>소리가 먼저</b> 들어옵니다. 소리 클립이 영상보다 왼쪽으로 튀어나온 모양이 알파벳 J 같아서 J컷입니다. 노란 구간 동안 화면은 아직 B의 인터뷰인데 거리 소음이 먼저 들립니다. 관객은 귀로 다음 장면을 예감합니다."],
    ["L컷", "그림은 거리로 바뀌었는데 <b>B의 목소리가 이어집니다</b>. 모양이 L. 인터뷰 대답을 들려주면서 그 내용을 보여 주는 보조 영상(B롤)으로 넘어갈 때 가장 흔한 편집입니다. 아래 '직접 해보기'의 어긋남 슬라이더로 J와 L을 오가 보세요."],
    ["크로스 디졸브", "앞 장면이 서서히 사라지며 다음 장면과 <b>겹칩니다</b>. 타임라인의 두 클립이 겹친 구간(노란 띠)이 디졸브 길이입니다. 시간이 흘렀거나 장소가 바뀌었다는 신호로 읽힙니다. 1초 안팎이 보통이고, 남용하면 낡아 보입니다."],
    ["매치 컷", "앞 장면 끝과 다음 장면 시작의 <b>모양·위치·크기를 맞춰</b> 자릅니다. 모니터에서 밤하늘의 보름달이 같은 자리의 둥근 접시로 바뀝니다. 서로 다른 두 장면이 모양 하나로 이어집니다."],
    ["점프 컷", "같은 구도에서 <b>시간만 건너뛰어</b> 자릅니다. B가 순간 이동하듯 자리가 튀는 것을 보세요. 불안감이나 속도감을 주거나, 토크 영상에서 군더더기를 잘라 낼 때 씁니다."],
  ],
  terms: [
    ["B롤", "B-roll", "인터뷰 같은 메인 촬영(A롤) 위에 덮어 쓰는 보조 영상. 말하는 내용을 그림으로 보여 줄 때 씁니다."],
    ["J컷 · L컷", "Split edit", "소리와 그림의 컷 지점을 어긋나게 하는 편집. 둘을 합쳐 스플릿 에디트라고 부릅니다."],
    ["크로스 디졸브", "Cross dissolve", "두 장면을 겹쳐 서서히 바꾸는 트랜지션. 시간 경과를 알릴 때 씁니다."],
    ["매치 컷", "Match cut", "형태·동작·소리를 맞춰 두 장면을 잇는 컷."],
    ["점프 컷", "Jump cut", "같은 숏 안에서 시간을 건너뛰는 컷. 튀는 느낌 자체를 쓰거나 군더더기를 덜어 낼 때 씁니다."],
  ],
  mount(api) {
    const CK = window.CamKit;
    const cv = api.canvas("fill");
    const T = 10, CUT = 5;
    const KIND = ["straight", "j", "l", "dissolve", "match", "jump"];
    const OFF0 = [0, -1.6, 1.6, 0, 0, 0];
    let step = 0, off = 0, offShown = 0, manual = null, drag = false, lay = null;
    const offS = M.slider(api.controls, { id: "cutoff", label: "소리 컷 어긋남 (J ← → L)", min: -25, max: 25, value: 0, fmt: (v) => (v === 0 ? "0 초 (스트레이트)" : `${v > 0 ? "+" : ""}${(v / 10).toFixed(1)} 초 (${v < 0 ? "J컷" : "L컷"})`), onInput: (v) => { off = v / 10; } });
    const ro = M.readout(api.controls);
    const tip = M.el("p", { class: "lbl", style: "margin:6px 0 0;font-size:12px;color:var(--muted)" }, "타임라인을 끌면 재생 위치를 직접 옮길 수 있습니다.");
    api.controls.append(tip);
    const toT = (e) => {
      if (!lay) return null;
      const r = cv.getBoundingClientRect(), ex = e.clientX - r.left, ey = e.clientY - r.top;
      if (ey < lay.ty0 - 10 || ey > lay.ty1 + 10) return null;
      return M.clamp(((ex - lay.tx) / lay.tw) * T, 0, T);
    };
    const pd = (e) => { const t = toT(e); if (t == null) return; drag = true; manual = t; cv.setPointerCapture(e.pointerId); };
    const pm = (e) => { if (drag) { const r = cv.getBoundingClientRect(); manual = M.clamp(((e.clientX - r.left - lay.tx) / lay.tw) * T, 0, T); } };
    const pu = () => { drag = false; };
    cv.addEventListener("pointerdown", pd); cv.addEventListener("pointermove", pm);
    cv.addEventListener("pointerup", pu); cv.addEventListener("pointercancel", pu);

    const kindNow = () => KIND[step];
    const clipsOf = () => {
      const k = kindNow();
      if (k === "dissolve") return { v: [[0, 6], [4, 10]], a: [[0, 6], [4, 10]], xf: [4, 6] };
      const ac = CUT + (step <= 2 ? offShown : 0);
      return { v: [[0, CUT], [CUT, T]], a: [[0, ac], [ac, T]] };
    };
    const NAMES = {
      base: [["B 인터뷰", "실내 · MCU"], ["B롤: 거리", "걷는 B"]],
      match: [["밤하늘", "보름달"], ["식탁", "둥근 접시"]],
      jump: [["B 토크", "0:12"], ["B 토크", "0:47"]],
    };
    const SOUND = { base: ["B 목소리", "거리 소음"], match: ["풀벌레 소리", "그릇 소리"], jump: ["말소리", "말소리 (35초 뒤)"] };
    const grp = () => (kindNow() === "match" ? "match" : kindNow() === "jump" ? "jump" : "base");

    /* 장면 그리기 */
    function sceneA(x, r, time) {
      const g = grp();
      if (g === "match") {
        x.fillStyle = "#1c2238"; x.fillRect(r.x, r.y, r.w, r.h);
        for (let i = 0; i < 40; i++) { const sx = r.x + ((i * 97) % 101) / 101 * r.w, sy = r.y + ((i * 53) % 61) / 61 * r.h * 0.7; x.fillStyle = "rgba(255,250,230,0.7)"; x.fillRect(sx, sy, 1.5, 1.5); }
        const mr = r.h * 0.24, mx = r.x + r.w * 0.5, my = r.y + r.h * 0.44;
        const gl = x.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 2); gl.addColorStop(0, "rgba(243,231,181,0.35)"); gl.addColorStop(1, "rgba(243,231,181,0)");
        x.fillStyle = gl; x.fillRect(r.x, r.y, r.w, r.h);
        x.beginPath(); x.arc(mx, my, mr, 0, Math.PI * 2); x.fillStyle = "#f3e7b5"; x.fill();
        x.fillStyle = "rgba(180,165,120,0.35)"; for (const [a, b, s] of [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.12], [-0.05, 0.35, 0.1]]) { x.beginPath(); x.arc(mx + a * mr, my + b * mr, s * mr, 0, Math.PI * 2); x.fill(); }
        x.fillStyle = "#11141f"; x.beginPath(); x.moveTo(r.x, r.y + r.h);
        for (let i = 0; i <= 12; i++) x.lineTo(r.x + (i / 12) * r.w, r.y + r.h * (0.86 - 0.06 * Math.sin(i * 1.7)));
        x.lineTo(r.x + r.w, r.y + r.h); x.fill();
        return { circle: [mx, my, mr] };
      }
      // 인터뷰: 방, B 가 말하고 A 의 어깨가 앞에
      M.art.backdrop(x, "room", { ...r, time });
      const dx = g === "jump" ? -r.w * 0.06 : 0;
      M.art.head(x, { cx: r.x + r.w * 0.56 + dx, cy: r.y + r.h * 0.4, r: r.h * 0.17, who: "B", view: "three-quarter-left", expr: "talk", mouth: 0.5 + 0.5 * Math.sin(time / 95), cut: -50 });
      if (g !== "jump") M.art.head(x, { cx: r.x + r.w * 0.1, cy: r.y + r.h * 0.55, r: r.h * 0.22, who: "A", view: "back", cut: -50 });
      return {};
    }
    function sceneB(x, r, time) {
      const g = grp();
      if (g === "match") {
        x.fillStyle = "#b98a5f"; x.fillRect(r.x, r.y, r.w, r.h);
        x.strokeStyle = "rgba(90,60,35,0.25)"; x.lineWidth = 1;
        for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(r.x, r.y + (i / 8) * r.h); x.lineTo(r.x + r.w, r.y + (i / 8) * r.h + 6); x.stroke(); }
        const mr = r.h * 0.24, mx = r.x + r.w * 0.5, my = r.y + r.h * 0.44;
        x.fillStyle = "rgba(40,25,15,0.25)"; x.beginPath(); x.arc(mx + 5, my + 7, mr * 1.3, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(mx, my, mr * 1.3, 0, Math.PI * 2); x.fillStyle = "#f4f1ec"; x.fill(); x.strokeStyle = "#1d1b18"; x.lineWidth = 1.2; x.stroke();
        x.beginPath(); x.arc(mx, my, mr, 0, Math.PI * 2); x.strokeStyle = "rgba(0,0,0,0.18)"; x.stroke();
        x.fillStyle = "#8b8f93"; M.rrect(x, mx + mr * 1.55, my - mr * 1.1, mr * 0.12, mr * 2.2, 3); x.fill();
        return { circle: [mx, my, mr] };
      }
      if (g === "jump") {
        M.art.backdrop(x, "room", { ...r, time });
        M.art.head(x, { cx: r.x + r.w * 0.62, cy: r.y + r.h * 0.42, r: r.h * 0.17, who: "B", view: "three-quarter-left", expr: "smile", cut: -50 });
        return {};
      }
      M.art.backdrop(x, "street", { ...r, time });
      const wx = r.x + ((r.w * 0.15 + time * 0.035) % (r.w * 1.1)) - r.w * 0.05;
      M.art.person(x, { cx: wx, cy: r.y + r.h * 0.9, h: r.h * 0.55, who: "B", view: "profile-right", pose: "walk", phase: (time / 1000) % 1 });
      return {};
    }

    let lastStep = -1;
    return {
      setStep(s) { step = s; off = OFF0[s]; offS.set(Math.round(off * 10)); manual = null; lastStep = -1; },
      frame(time, dt) {
        const c = M.col();
        const r0 = cv.getBoundingClientRect();
        CK.minH(cv, r0.width < 560 ? r0.width * 9 / 16 + 30 + 250 : 0);
        const { x, w, h } = M.fit(cv);
        offShown = CK.approach(offShown, step <= 2 ? off : 0, dt, 90);
        const unit = 560, loop = T * unit + 900;
        const t = manual != null ? manual : Math.min(T, (time % loop) / unit);
        const cl = clipsOf(), g = grp(), names = NAMES[g], snd = SOUND[g];
        // 배치: 위 모니터 + 오른쪽 '지금' 카드, 아래 타임라인
        const tlH = Math.max(140, Math.min(190, h * 0.38));
        const topH = h - tlH - 12;
        const wideTop = w > 520;
        const cardW = wideTop ? Math.min(230, w * 0.3) : 0;
        let fw = Math.min(w - (wideTop ? cardW + 14 : 0), (topH - 30) * 16 / 9 + 0), fh = fw * 9 / 16 + 30;
        if (fh > topH) { fh = topH; fw = (fh - 30) * 16 / 9; }
        const fx = wideTop ? (w - fw - cardW - 14) / 2 : (w - fw) / 2, fy = (topH - fh) / 2;
        // 지금 보이는 것
        const [vs1] = cl.v[1], [, ve0] = cl.v[0];
        let ob = t < vs1 ? 0 : t >= ve0 ? 1 : (t - vs1) / Math.max(0.001, ve0 - vs1);
        if (ve0 <= vs1) ob = t >= vs1 ? 1 : 0;
        const fr = M.art.frame(x, { x: fx, y: fy, w: fw, h: fh, aspect: 16 / 9, label: "PROGRAM", tc: M.art.timecode(t * 1000), center: false, draw: (x, r) => {
          let ia = {}, ib = {};
          if (ob < 1) ia = sceneA(x, r, time);
          if (ob > 0) { x.save(); x.globalAlpha = ob; ib = sceneB(x, r, time); x.restore(); }
          if (g === "match" && (t > CUT - 1.2 && t < CUT + 1.2)) {
            const ci = (ob > 0.5 ? ib : ia).circle;
            if (ci) {
              x.save(); x.strokeStyle = c.key; x.lineWidth = 2.5; x.setLineDash([6, 4]);
              x.beginPath(); x.arc(ci[0], ci[1], ci[2] * (ob > 0.5 ? 1.3 : 1) + 6, 0, Math.PI * 2); x.stroke(); x.restore();
              CK.tag(x, "같은 위치 · 같은 크기의 원", ci[0], r.y + r.h - 20, { align: "center", size: 11.5, fill: c.key });
            }
          }
          if (g === "jump" && Math.abs(t - CUT) < 1.3) {
            const a1 = r.x + r.w * 0.5, a2 = r.x + r.w * 0.62;
            M.arrow(x, a1, r.y + r.h * 0.1, a2, r.y + r.h * 0.1, c.key, 3);
            CK.tag(x, "같은 구도 · 35초 건너뜀", r.x + r.w / 2, r.y + r.h - 20, { align: "center", size: 11.5, fill: c.key });
          }
        } });
        // 오른쪽 카드
        const on = cl.a.map(([s, e], i) => (t >= s && t < e ? i : -1)).filter((i) => i >= 0);
        const picIdx = ob >= 1 ? [1] : ob <= 0 ? [0] : [0, 1];
        const colOf = (i) => (i === 0 ? c.b : c.c);
        const drawCard = (X, Y, W, H, title, list, kind) => {
          CK.panel(x, X, Y, W, H, title, { grid: false });
          list.forEach((i, j) => {
            const yy = Y + 44 + j * 26;
            M.rrect(x, X + 12, yy - 8, 16, 16, 4); x.fillStyle = M.alpha(colOf(i), 0.35); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1; x.stroke();
            M.text(x, kind === "v" ? names[i][0] : snd[i], X + 36, yy + 4.5, { size: 12.5, weight: 650, color: c.ink });
          });
          if (kind === "a" && list.length) M.art.waveform(x, { x: X + 12, y: Y + H - 34, w: W - 24, h: 24, seed: list[0] * 5 + 2, density: 0.5, color: colOf(list[list.length - 1]), gain: 0.6 + 0.4 * Math.abs(Math.sin(time / 300)) });
        };
        const mismatch = picIdx.length === 1 && on.length === 1 && picIdx[0] !== on[0];
        if (wideTop) {
          const X = fx + fw + 14, ch = (fh - 15) / 2;
          drawCard(X, fy, cardW, ch, "지금 보이는 그림", picIdx, "v");
          drawCard(X, fy + ch + 12, cardW, ch, "지금 들리는 소리", on, "a");
          if (mismatch) CK.tag(x, "그림 ≠ 소리", X + cardW - 8, fy + ch + 12 + 17, { align: "right", size: 11, fill: c.key });
        }
        // 타임라인
        const ty = topH + 12;
        CK.panel(x, 0, ty, w - 3, tlH - 3, null, { grid: false });
        const tx = 58, tw = w - tx - 26, rowH = Math.min(50, (tlH - 70) / 2);
        const vy = ty + 30, ay = vy + rowH + 8;
        lay = { tx, tw, ty0: ty, ty1: ty + tlH };
        const X = (s) => tx + (s / T) * tw;
        for (let s = 0; s <= T; s++) {
          M.line(x, X(s), ty + 12, X(s), ty + (s % 5 ? 17 : 20), M.alpha(c.ink, 0.5), 1);
          if (s % 5 === 0 || w > 600) M.text(x, s + "s", X(s) + (s === T ? -3 : 3), ty + 22, { size: 11, mono: true, color: c.muted, align: s === T ? "right" : "left" });
        }
        M.text(x, "영상", 12, vy + rowH / 2 + 4, { size: 11.5, weight: 700, color: c.ink });
        M.text(x, "소리", 12, ay + rowH / 2 + 4, { size: 11.5, weight: 700, color: c.ink });
        // 어긋난 구간 강조
        const vc = cl.v[1][0], ac = cl.a[1][0];
        if (Math.abs(vc - ac) > 0.05 && step <= 2) {
          const a0 = Math.min(vc, ac), a1 = Math.max(vc, ac);
          x.fillStyle = M.alpha(c.key, 0.28); x.fillRect(X(a0), vy - 4, X(a1) - X(a0), ay + rowH - vy + 8);
          CK.tag(x, `${ac < vc ? "J" : "L"} · 소리 ${(Math.abs(vc - ac)).toFixed(1)}초 ${ac < vc ? "먼저" : "더 길게"}`, X((a0 + a1) / 2), ay + rowH + 14, { align: "center", size: 11, fill: c.key });
        }
        if (cl.xf) { x.fillStyle = M.alpha(c.key, 0.28); x.fillRect(X(cl.xf[0]), vy - 4, X(cl.xf[1]) - X(cl.xf[0]), ay + rowH - vy + 8); CK.tag(x, "디졸브 2초 겹침", X(5), ay + rowH + 14, { align: "center", size: 11, fill: c.key }); }
        cl.v.forEach(([s, e], i) => {
          const yy = cl.xf && i === 1 ? vy + rowH * 0.5 : vy, hh = cl.xf ? rowH * 0.5 : rowH;
          M.art.clip(x, { x: X(s), y: cl.xf && i === 0 ? vy : yy, w: X(e) - X(s), h: hh, color: colOf(i), label: names[i][0], sub: names[i][1], thumb: rowH >= 30 && !cl.xf ? (x, rr) => (i === 0 ? sceneA(x, rr, 0) : sceneB(x, rr, 2000)) : null });
        });
        cl.a.forEach(([s, e], i) => {
          const W = X(e) - X(s);
          M.art.clip(x, { x: X(s), y: cl.xf && i === 1 ? ay + rowH * 0.5 : ay, w: W, h: cl.xf ? rowH * 0.5 : rowH, color: colOf(i), label: "" });
          M.art.waveform(x, { x: X(s) + 4, y: (cl.xf && i === 1 ? ay + rowH * 0.5 : ay) + 5, w: Math.max(4, W - 8), h: (cl.xf ? rowH * 0.5 : rowH) - 9, seed: i * 5 + 2, density: 0.35, color: colOf(i), gain: 0.85 });
          if (W > 70) CK.tag(x, "♪ " + snd[i], X(s) + 6, (cl.xf && i === 1 ? ay + rowH * 0.5 : ay) + 12, { size: 11 });
        });
        // 플레이헤드
        const phx = X(t);
        M.line(x, phx, ty + 8, phx, ay + rowH + 4, c.b, 2);
        x.beginPath(); x.moveTo(phx - 6, ty + 6); x.lineTo(phx + 6, ty + 6); x.lineTo(phx, ty + 14); x.closePath(); x.fillStyle = c.b; x.fill();
        if (!wideTop) {
          const txt = `그림: ${picIdx.map((i) => names[i][0]).join(" → ")} · 소리: ${on.map((i) => snd[i]).join(" + ") || "—"}`;
          CK.tag(x, txt, w / 2, topH + 2, { align: "center", size: 11, fill: mismatch ? c.key : c.surface });
        }
        const kname = ["스트레이트 컷", "J컷", "L컷", "크로스 디졸브", "매치 컷", "점프 컷"][step];
        const sk = step <= 2 ? (Math.abs(off) < 0.05 ? "스트레이트 컷" : off < 0 ? "J컷" : "L컷") : kname;
        ro.innerHTML = `<b>${sk}</b>\n영상 컷 ${vc.toFixed(1)}초 · 소리 컷 ${ac.toFixed(1)}초`;
      },
      destroy() {},
    };
  },
});
