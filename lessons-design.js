/* 1~3장: 보는 법, 글자, 색 */
(() => {
  /* 값을 목표 쪽으로 부드럽게(약 300ms, ease-out 느낌) */
  const follow = (cur, tgt, dt, ms = 300) => cur + (tgt - cur) * (1 - Math.pow(0.004, (dt || 16) / ms));
  /* 불투명 틴트: 표면색에 색을 t 만큼 섞음 (태그 바탕용) */
  const tint = (col, t) => {
    const hx = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((q) => q + q).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const a = hx(M.col().surface), b = hx(col);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
  };

  /* ===== 1-1 시각 위계 ===== */
  LESSONS.push({
    id: "hierarchy", ch: 0, order: 1,
    title: "시각 위계",
    lede: "이 레슨을 마치면 크기·굵기·대비·여백 네 가지 도구로 '눈이 먼저 갈 곳'과 '나중에 갈 곳'을 정하는 법을 알게 됩니다. 사람은 화면을 읽기 전에 먼저 훑습니다.",
    key: "위계는 크기 → 굵기 → 대비 → 여백으로 만듭니다. 흐리게 봐도 순서가 보여야 하고, 한 화면에 가장 센 것은 하나입니다.",
    steps: [
      ["모두 같으면 아무것도 안 보인다", "가운데는 일부러 <b>잘못 만든 예시 카드</b>입니다(빨간 '고치기 전' 표시). 여섯 줄이 모두 14px, 보통 굵기, 같은 색이라 오른쪽 <b>시선 순서</b> 막대도 전부 같은 길이입니다. 눈이 어디서 출발할지 정할 수 없습니다. 이 카드를 위쪽 순서대로 한 단계씩 고쳐 갑니다."],
      ["크기", "가장 강한 신호는 <b>크기</b>입니다. 제목을 14px에서 26px로, 분량(8개 장)을 20px로 키우자 막대에서 제목이 1위, 분량이 2위로 올라섰습니다. 카드 왼쪽의 번호가 눈이 도는 순서입니다. 크기 단계는 보통 3~4개(예: 26 · 20 · 14 · 12px)면 충분합니다."],
      ["굵기", "<b>굵기</b>(font-weight)는 크기를 더 키우지 않고 무게를 더합니다. 제목을 800, 분량을 700으로 올리자 두 막대가 한 번 더 길어졌습니다. 실무에서는 크기 단계를 적게 두고 400 · 600 · 800 같은 굵기로 미세 조정합니다."],
      ["색과 대비", "메타 정보와 설명은 글자색을 회색으로 바꿔 <b>대비를 낮췄습니다</b>. 지운 게 아니라 순위를 내린 것이라 막대가 짧아졌을 뿐 그대로 남아 있습니다. 행동을 부르는 버튼(CTA)만 면 색과 진한 테두리를 받아 3위로 올라옵니다."],
      ["간격으로 묶기", "관련된 것은 붙이고 다른 것은 뗍니다. 카드 안 호박색 띠가 덩어리 사이 여백(24px)이고, 덩어리 안 간격은 4px입니다. 선이나 상자 없이 여백만으로 <b>소개 · 설명 · 행동</b> 세 덩어리가 생깁니다. 덩어리 사이는 안쪽 간격의 2~3배 이상 벌리는 것이 보통입니다."],
      ["흐리게 보기 테스트", "눈을 가늘게 뜨면 글자는 사라지고 <b>덩어리와 무게</b>만 남습니다. 흐려진 카드에서도 제목 → 분량 → 버튼 순서가 보이면 위계가 잡힌 것입니다. 1단계로 돌아가 '흐리게 보기'를 켜 두면 차이가 분명합니다."],
    ],
    terms: [
      ["시각 위계", "Visual hierarchy", "중요도에 따라 눈이 이동하는 순서. 디자인 리뷰에서 \"위계가 약하다\"는 말은 먼저 볼 곳이 분명하지 않다는 뜻입니다."],
      ["강조점", "Focal point", "화면에서 가장 먼저 눈이 닿는 곳. 한 화면에 하나가 원칙이고, 보통 제목이나 주요 버튼입니다."],
      ["스퀸트 테스트", "Squint test", "눈을 가늘게 뜨거나 화면을 흐리게 해 덩어리의 무게만으로 위계를 점검하는 방법. 시안을 넘기기 전에 자주 씁니다."],
      ["CTA", "Call to action", "사용자에게 행동을 요청하는 요소(시작하기, 구매, 가입). 보통 화면에서 대비가 가장 높습니다."],
    ],
    mount(api) {
      const ITEMS = [
        ["tag", "분류", "입문 코스", "p"], ["title", "제목", "디자인을 배워볼까요", "p"], ["meta", "메타", "보는 법 · 글자 · 색 · 움직임", "p"],
        ["desc", "설명", "화면을 훑는 눈의 순서부터 차근차근 기본기를 익힙니다.", "p"], ["count", "분량", "8개 장", "p"], ["btn", "버튼", "시작하기", "button"],
      ];
      /* 단계별 눈대중 무게(크기² × 굵기 × 대비로 매긴 점수) */
      const W = [
        [1, 1, 1, 1, 1, 1],
        [1, 3.4, 1, 1, 2.1, 1],
        [1, 4.6, 1, 1, 2.9, 1],
        [0.8, 4.6, 0.45, 0.45, 2.9, 2.6],
        [0.8, 4.6, 0.45, 0.45, 2.9, 2.6],
        [0.8, 4.6, 0.45, 0.45, 2.9, 2.6],
      ];
      const root = M.el("div", { class: "dom-stage hierarchy-stage" });
      const card = M.el("div", { class: "hierarchy-card" });
      const els = {};
      const groups = [["tag", "title", "meta"], ["desc"], ["count", "btn"]].map((g) => {
        const ge = M.el("div", { class: "hierarchy-grp" });
        g.forEach((k) => { const it = ITEMS.find((i) => i[0] === k); const e = M.el(it[3], { class: "hierarchy-" + k, type: it[3] === "button" ? "button" : null }, it[2]); els[k] = e; ge.append(e); });
        card.append(ge);
        return ge;
      });
      const badges = [1, 2, 3].map((n) => { const b = M.el("span", { class: "hierarchy-badge" }, String(n)); card.append(b); return b; });
      const panel = M.el("div", { class: "hierarchy-panel" });
      const cap = M.el("p", { class: "hierarchy-cap" });
      const list = M.el("div", { class: "hierarchy-list" });
      const rows = ITEMS.map(([k, name]) => {
        const bar = M.el("i"), rank = M.el("span", { class: "hierarchy-rank" }), val = M.el("span", { class: "hierarchy-val" });
        const r = M.el("div", { class: "hierarchy-row" }, rank, M.el("b", {}, name), M.el("span", { class: "hierarchy-track" }, bar), val);
        list.append(r);
        return { k, r, bar, rank, val };
      });
      const foot = M.el("p", { class: "hierarchy-foot" }, "점수 ≈ 크기² × 굵기 × 대비");
      panel.append(cap, list, foot);
      /* 카드를 '예시 화면' 안에 넣어 팝업이 아니라 고칠 대상(표본)임을 분명히 */
      const STAGES = ["고치기 전", "크기", "굵기", "대비", "여백", "점검"];
      const flow = M.el("ol", { class: "hierarchy-flow", "aria-label": "고치는 순서" });
      const flowItems = STAGES.map((t, i) => { const li = M.el("li", {}, M.el("span", { class: "n" }, i === 0 ? "✕" : String(i)), M.el("span", {}, t)); flow.append(li); return li; });
      const stamp = M.el("div", { class: "hierarchy-stamp" }, M.el("b"), M.el("small"));
      const bracket = M.el("div", { class: "hierarchy-bracket" });
      const spec = M.el("div", { class: "hierarchy-spec" },
        M.el("div", { class: "hierarchy-spec__bar" }, M.el("i"), M.el("i"), M.el("i"), M.el("span", {}, "예시 화면 · 코스 소개 카드"), stamp),
        M.el("div", { class: "hierarchy-spec__body" }, M.el("div", { class: "hierarchy-cardbox" }, card, bracket)));
      const wrap = M.el("div", { class: "hierarchy-wrap" }, spec, panel);
      root.append(flow, wrap); api.stage.append(root);

      let step = 0, blurOn = false, view = 0; /* view: 0 지금 단계, 1 고치기 전, 2 고친 후 */
      const viewChips = M.chips(api.controls, { title: "비교해서 보기", items: ["지금 단계", "고치기 전", "고친 후"], value: 0, onPick: (i) => { view = i; render(); } });
      const blur = M.check(api.controls, { id: "hierBlur", label: "흐리게 보기 (스퀸트 테스트)", onChange: (v) => { blurOn = v; card.classList.toggle("blur", v); } });
      api.controls.append(M.el("p", { class: "hint" }, "흐리게 보기를 켠 채 1단계부터 단계를 넘겨 보세요. 글자를 읽지 않아도 덩어리의 무게 순서가 생기는 과정이 보입니다."));
      const CODE = ".card  { display: flex; flex-direction: column;\n         gap: 24px; }          /* 덩어리 사이: 멀게 */\n.group { gap: 4px; }           /* 덩어리 안: 가깝게 */\n\n.title { font-size: 26px; font-weight: 800; }\n.count { font-size: 20px; font-weight: 700; }\nbody   { font-size: 14px; font-weight: 400; }\n\n.meta, .desc { color: var(--color-text-muted); }\n.cta {\n  background: var(--color-accent);\n  border: 1px solid var(--color-ink);\n  font-weight: 700;\n}";
      const HL = [[[6, 6]], [[4, 5]], [[4, 5]], [[8, 13]], [[0, 2]], "all"];

      const shown = () => (view === 1 ? 0 : view === 2 ? 4 : step);
      const STAMP = [
        ["bad", "고치기 전", "6줄 모두 14px · 보통 굵기 · 같은 색"],
        ["mid", "1/4 적용", "크기: 제목·분량을 키움"],
        ["mid", "2/4 적용", "굵기: 제목·분량을 굵게"],
        ["mid", "3/4 적용", "대비: 보조는 흐리게, 버튼은 진하게"],
        ["good", "고친 후", "크기 · 굵기 · 대비 · 여백 모두 적용"],
        ["good", "고친 후 · 점검", "흐려도 제목 → 분량 → 버튼"],
      ];
      function render() {
        const st = shown();
        ["s-size", "s-weight", "s-color", "s-space"].forEach((c, i) => card.classList.toggle(c, st >= i + 1));
        card.classList.toggle("show-gaps", st === 4 && view === 0);
        card.classList.toggle("is-before", st === 0);
        bracket.classList.toggle("on", st === 0);
        const sv = view === 2 ? 5 : st, [kind, head, sub] = STAMP[view === 2 ? 4 : sv];
        stamp.className = "hierarchy-stamp " + kind; stamp.firstChild.textContent = head; stamp.lastChild.textContent = sub;
        stamp.classList.remove("swap"); void stamp.offsetWidth; stamp.classList.add("swap");
        const fs = view === 2 ? 4 : st;
        flowItems.forEach((li, i) => { li.className = i === 0 ? (fs === 0 ? "cur bad" : "fixed") : i < fs ? "done" : i === fs ? "cur" : ""; });
        spec.classList.toggle("is-compare", view !== 0);
        const w = W[st], mx = 5;
        const order = w.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
        const flat = st === 0;
        order.forEach(([v, i], r) => {
          const row = rows[i];
          row.r.style.transform = `translateY(${(flat ? i : r) * 100}%)`;
          row.bar.style.width = (v / mx) * 100 + "%";
          row.rank.textContent = flat ? "–" : String(r + 1);
          row.val.textContent = v.toFixed(1);
          row.r.classList.toggle("top", !flat && r < 3);
          row.r.classList.toggle("low", !flat && v < 0.7);
        });
        cap.textContent = flat ? "시선 순서 · 모두 같은 무게" : st === 4 && view === 0 ? "시선 순서 · 무게는 그대로, 덩어리 3개" : "시선 순서 · 무게가 큰 순";
        api.code(CODE, HL[step], "CSS");
      }
      return {
        setStep(s) {
          step = s; view = 0; viewChips.set(0);
          if (s === 5) { blur.set(true); blurOn = true; card.classList.add("blur"); }
          render();
        },
        frame() {
          /* 순위 번호를 카드 요소 옆에 붙임 */
          const w = W[shown()];
          const top = w.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, 3);
          badges.forEach((b, n) => {
            if (shown() === 0) { b.style.opacity = 0; return; }
            const e = els[ITEMS[top[n][1]][0]];
            const cr = card.getBoundingClientRect(), er = e.getBoundingClientRect();
            b.style.opacity = 1;
            b.style.transform = `translate(0, ${er.top - cr.top + er.height / 2 - 11}px)`;
          });
        },
      };
    },
  });

  /* ===== 1-2 근접과 유사성 (게슈탈트) ===== */
  LESSONS.push({
    id: "gestalt", ch: 0, order: 2,
    title: "근접과 유사성",
    lede: "이 레슨을 마치면 선이나 상자 없이 간격과 색만으로 '무엇이 한 덩어리로 보이는지' 조절하는 법을 알게 됩니다. 게슈탈트 원리는 사람이 무리 지어 보는 규칙입니다.",
    key: "선이나 상자보다 여백이 먼저 구조를 만듭니다. 간격은 색보다 강하고, 상자는 여백으로 부족할 때만 씁니다.",
    steps: [
      ["고른 간격", "가로·세로 간격이 같은 점 24개입니다. 점선 테두리처럼 <b>한 덩어리</b>로 보이고, 행과 열 어느 쪽도 먼저 읽히지 않습니다. 아래·왼쪽 치수선이 지금의 열 간격과 행 간격입니다."],
      ["가로 간격을 벌리면", "열 사이만 2.4배로 벌렸더니 <b>세로 줄 6개</b>로 보입니다. 가까운 것끼리 묶어 보는 성질, 즉 <b>근접성</b>(proximity)입니다. 폼에서 라벨을 입력창에 4px로 붙이고 필드 사이는 24px로 떼는 이유가 이것입니다."],
      ["세로 간격을 벌리면", "이번엔 행 사이만 벌렸습니다. 점은 그대로인데 <b>가로 줄 4개</b>로 구조가 뒤집혔습니다. 무대를 위아래·좌우로 끌어 두 간격을 직접 바꿔 보세요."],
      ["색으로 묶기", "간격은 다시 고르게 두고, 열마다 색을 번갈아 칠했습니다. 같은 색끼리 세로 줄로 묶여 보입니다. 모양·색·크기가 같은 것끼리 묶어 보는 성질이 <b>유사성</b>(similarity)입니다. 링크 색을 한 가지로 통일하는 이유입니다."],
      ["근접 vs 유사성", "간격은 '가로 줄'이라 하고(행 간격 ×2.4), 색은 '세로 줄'이라 합니다. 대부분의 사람에게 <b>간격이 이깁니다</b>. 진한 테두리가 실제로 보이는 묶음, 흐린 점선이 색이 만들려던 묶음입니다. 레이아웃에서 색보다 여백이 구조를 강하게 만드는 이유입니다."],
      ["공통 영역", "두 열씩 같은 배경판 위에 올렸더니 <b>세 묶음</b>으로 보입니다. 같은 경계 안에 있으면 한 무리로 보는 성질, 즉 <b>공통 영역</b>(common region)이고 카드 UI가 하는 일입니다. 다만 상자는 여백보다 무거우니, 여백으로 충분하면 상자는 생략합니다."],
    ],
    terms: [
      ["게슈탈트", "Gestalt", "부분이 아니라 전체 모양으로 지각한다는 심리학 이론. 디자인에서는 근접·유사·폐합·연속·공통 영역 같은 '묶어 보기 규칙'을 가리킬 때 씁니다."],
      ["근접성", "Proximity", "가까운 요소를 한 무리로 봄. 라벨은 입력창 가까이, 섹션 사이는 넓게 둘 때 근거가 됩니다."],
      ["유사성", "Similarity", "색·모양·크기가 같은 요소를 한 무리로 봄. 링크·버튼 스타일을 통일하는 이유입니다."],
      ["공통 영역", "Common region", "같은 경계(배경, 테두리) 안의 요소를 한 무리로 봄. 카드와 패널이 이 원리를 씁니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      const T = [
        { gx: 1, gy: 1, color: 0, region: 0 }, { gx: 2.4, gy: 1, color: 0, region: 0 }, { gx: 1, gy: 2.4, color: 0, region: 0 },
        { gx: 1, gy: 1, color: 1, region: 0 }, { gx: 1, gy: 2.4, color: 1, region: 0 }, { gx: 1, gy: 1, color: 0, region: 1 },
      ];
      const cur = { gx: 1, gy: 1, color: 0, region: 0 };
      let tgt = { ...T[0] }, step = 0;
      const sx = M.slider(api.controls, { id: "gsGx", label: "열 사이 간격", min: 1, max: 3, step: 0.05, value: 1, fmt: (v) => "×" + v.toFixed(2), onInput: (v) => (tgt = { ...tgt, gx: v }) });
      const sy = M.slider(api.controls, { id: "gsGy", label: "행 사이 간격", min: 1, max: 3, step: 0.05, value: 1, fmt: (v) => "×" + v.toFixed(2), onInput: (v) => (tgt = { ...tgt, gy: v }) });
      M.check(api.controls, { id: "gsColor", label: "열마다 색 번갈아 칠하기", onChange: (v) => (tgt = { ...tgt, color: v ? 1 : 0 }) });
      api.controls.append(M.el("p", { class: "hint" }, "무대를 좌우로 끌면 열 간격, 위아래로 끌면 행 간격이 바뀝니다."));
      let drag = null;
      cv.style.cursor = "grab";
      cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, gx: tgt.gx, gy: tgt.gy }; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; });
      cv.addEventListener("pointermove", (e) => {
        if (!drag) return;
        tgt = { ...tgt, gx: M.clamp(drag.gx + (e.clientX - drag.x) / 120, 1, 3), gy: M.clamp(drag.gy + (e.clientY - drag.y) / 90, 1, 3) };
        sx.set(tgt.gx.toFixed(2)); sy.set(tgt.gy.toFixed(2));
      });
      const end = () => { drag = null; cv.style.cursor = "grab"; };
      cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
      const CODE = "/* 근접: 라벨은 입력창에 붙이고, 필드끼리는 뗀다 */\n.field { display: grid; gap: 4px; }\n.form  { display: grid; gap: 24px; }\n\n/* 유사성: 같은 역할은 같은 모양 */\na { color: var(--color-link); }\n\n/* 공통 영역: 배경판으로 묶기 */\n.card {\n  background: var(--color-surface);\n  border-radius: 12px;\n  padding: 16px;\n}";
      const HL = [[[1, 2]], [[1, 2]], [[1, 2]], [[4, 5]], [[0, 5]], [[7, 12]]];
      return {
        setStep(s) { step = s; tgt = { ...T[s] }; sx.set(tgt.gx); sy.set(tgt.gy); api.code(CODE, HL[s], "CSS"); },
        frame(time, dt) {
          for (const p of ["gx", "gy", "color", "region"]) cur[p] = follow(cur[p], tgt[p], dt, 350);
          const { x, w, h } = M.fit(cv), c = M.col();
          const cols = 6, rows = 4;
          const padT = 46, padB = 52, padL = 70, padR = 24;
          const aw = w - padL - padR, ah = h - padT - padB;
          const u0 = Math.min(aw / 7.2, ah / 4.6, 58);
          const u = Math.min(u0, aw / (5 * cur.gx + 1.2), ah / (3 * cur.gy + 1.2));
          const r = Math.max(5, u0 * 0.22);
          const gw = 5 * u * cur.gx, gh = 3 * u * cur.gy;
          const ox = padL + (aw - gw) / 2, oy = padT + (ah - gh) / 2;
          const P = (i, j) => [ox + i * u * cur.gx, oy + j * u * cur.gy];
          const pad = r + Math.min(u * 0.32, 14);

          // 공통 영역 배경판
          if (cur.region > 0.01) {
            x.save(); x.globalAlpha = cur.region;
            const pp = Math.min(pad, u * cur.gx * 0.36);
            for (let i = 0; i < cols; i += 2) {
              const [a0, b0] = P(i, 0), [a1, b1] = P(i + 1, rows - 1);
              M.rrect(x, a0 - pp + 2, b0 - pp + 3, a1 - a0 + pp * 2, b1 - b0 + pp * 2, 12); x.fillStyle = M.alpha(c.ink, 0.9); x.fill();
              M.rrect(x, a0 - pp, b0 - pp, a1 - a0 + pp * 2, b1 - b0 + pp * 2, 12); x.fillStyle = c.surface; x.fill();
              x.fillStyle = M.alpha(c.c, 0.16); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
            }
            x.restore();
          }

          // 보이는 묶음(지각) 계산
          const ratio = cur.gx / cur.gy;
          const sp = ratio > 1.3 ? "cols" : ratio < 1 / 1.3 ? "rows" : "one";
          const strength = M.clamp(Math.abs(Math.log(ratio)) / Math.log(2), 0, 1);
          const hull = (i0, j0, i1, j1, col, a, dash, lw) => {
            const [a0, b0] = P(i0, j0), [a1, b1] = P(i1, j1);
            x.save(); x.globalAlpha = a; x.setLineDash(dash || []);
            M.rrect(x, a0 - pad, b0 - pad, a1 - a0 + pad * 2, b1 - b0 + pad * 2, pad);
            x.strokeStyle = col; x.lineWidth = lw; x.stroke(); x.restore();
          };
          let label = "", sub = null;
          if (cur.region > 0.5) label = "공통 영역 → 3묶음";
          else if (cur.color > 0.5 && sp !== "rows") {
            for (let i = 0; i < cols; i++) hull(i, 0, i, rows - 1, c.b, 0.85, [5, 4], 1.5);
            label = "같은 색끼리 → 세로 줄 6개";
          } else if (sp === "one") {
            hull(0, 0, cols - 1, rows - 1, c.ink, 0.55, [5, 4], 1.25);
            label = "한 덩어리 (24개)";
          } else if (sp === "cols") {
            for (let i = 0; i < cols; i++) hull(i, 0, i, rows - 1, c.a, 0.35 + strength * 0.6, null, 1.75);
            label = "가까운 것끼리 → 세로 줄 6개";
          } else {
            for (let j = 0; j < rows; j++) hull(0, j, cols - 1, j, c.a, 0.35 + strength * 0.6, null, 1.75);
            label = "가까운 것끼리 → 가로 줄 4개";
            if (cur.color > 0.5) {
              for (let i = 0; i < cols; i++) hull(i, 0, i, rows - 1, c.b, 0.4, [3, 5], 1.25);
              label = "간격이 이김 → 가로 줄 4개"; sub = "색이 만들려던 세로 줄";
            }
          }

          // 점
          for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
            const [px, py] = P(i, j);
            const colored = cur.color > 0.01 && i % 2 === 1;
            M.dot(x, px, py, r, c.ink);
            if (colored) { x.save(); x.globalAlpha = cur.color; M.dot(x, px, py, r, c.b); x.restore(); }
          }

          // 치수선
          const emX = step === 1 || (step === 0), emY = step === 2 || step === 4 || step === 0;
          const [c0x, c0y] = P(0, rows - 1), [c1x] = P(1, rows - 1);
          const by = Math.min(h - padB + 18, c0y + pad + 18);
          const colX = emX ? c.a : M.alpha(c.muted, 0.7);
          M.line(x, c0x, by, c1x, by, colX, 1.5); M.line(x, c0x, by - 5, c0x, by + 5, colX, 1.5); M.line(x, c1x, by - 5, c1x, by + 5, colX, 1.5);
          M.text(x, `열 간격 ${Math.round(u * cur.gx)}px`, (c0x + c1x) / 2, by + 18, { size: 11.5, weight: 700, align: "center", color: emX ? c.ink : c.muted });
          const [r0x, r0y] = P(0, 0), [, r1y] = P(0, 1);
          const bx = r0x - pad - 12;
          const colY = emY ? c.a : M.alpha(c.muted, 0.7);
          M.line(x, bx, r0y, bx, r1y, colY, 1.5); M.line(x, bx - 5, r0y, bx + 5, r0y, colY, 1.5); M.line(x, bx - 5, r1y, bx + 5, r1y, colY, 1.5);
          M.text(x, "행 간격", bx - 8, (r0y + r1y) / 2 - 2, { size: 11, weight: 700, align: "right", color: emY ? c.ink : c.muted });
          M.text(x, `${Math.round(u * cur.gy)}px`, bx - 8, (r0y + r1y) / 2 + 12, { size: 11, mono: true, align: "right", color: emY ? c.ink : c.muted });

          // 지각 결과 태그
          M.tag(x, "보이는 구조: " + label, w / 2, 20, { align: "center", size: 12, fill: tint(c.key, 0.28) });
          if (sub) M.tag(x, sub, w - 12, h - 18, { align: "right", size: 11, color: c.b, weight: 600 });
        },
      };
    },
  });

  /* ===== 2-1 글자의 해부 ===== */
  LESSONS.push({
    id: "type-anatomy", ch: 1, order: 1,
    title: "글자의 해부",
    lede: "이 레슨을 마치면 글자가 서 있는 보이지 않는 선들(베이스라인, 엑스하이트, 캡하이트)의 이름과, 서체를 섞고 줄 간격을 정할 때 그 선들을 어떻게 쓰는지 알게 됩니다.",
    key: "서체를 섞을 땐 글자 크기가 아니라 엑스하이트와 베이스라인을 맞춥니다. 본문 행간은 1.5~1.8, 큰 제목은 1.1~1.3.",
    steps: [
      ["베이스라인", "글자가 올라앉는 보이지 않는 선, <b>베이스라인</b>(baseline)입니다. 그림에서 호박색 실선입니다. 크기가 다른 글자를 한 줄에 놓을 때(예: 가격의 큰 숫자와 작은 단위) 위나 가운데가 아니라 베이스라인을 맞춰야 가지런해 보입니다."],
      ["엑스하이트", "소문자 x의 높이, <b>엑스하이트</b>(x-height)입니다. 오른쪽 치수가 글자 크기(em)에 대한 비율입니다. 같은 14px라도 이 비율이 큰 서체가 더 커 보이고 작은 화면에서 잘 읽힙니다. 두 서체를 섞을 땐 글자 크기보다 엑스하이트를 맞추세요."],
      ["캡하이트", "대문자 H의 높이, <b>캡하이트</b>(cap height)입니다. 버튼 안 글자를 세로 가운데에 놓거나 아이콘 높이를 글자에 맞출 때 기준이 됩니다. 아이콘을 캡하이트와 같은 높이로 두면 글자와 한 줄로 읽힙니다."],
      ["어센더와 디센더", "d·h처럼 엑스하이트 위로 솟은 부분이 <b>어센더</b>(ascender), p·g처럼 베이스라인 아래로 내려온 부분이 <b>디센더</b>(descender)입니다. 그림의 빨간 띠 두 곳입니다. 줄 간격이 너무 좁으면 윗줄 디센더와 아랫줄 어센더가 부딪힙니다."],
      ["한글은 네모 안에", "글자 크기(font-size)는 정사각 틀, <b>가상 바디</b>(em 박스)의 높이입니다. 한글은 이 틀을 거의 꽉 채우지만 라틴 대문자는 약 0.7만 씁니다. 그래서 같은 크기로 섞으면 한글이 커 보입니다. 혼용할 때 영문을 5~10% 키우거나 한글 전용 서체의 영문을 쓰는 이유입니다."],
      ["행간", "CSS <code>line-height</code>는 글자 크기에 위아래 여백을 더한 <b>줄 상자</b>의 높이입니다. 남는 여백은 반으로 나뉘어 위아래에 붙는데, 이것이 그림의 호박색 <b>하프 레딩</b>입니다. 본문은 1.5~1.8, 큰 제목은 1.1~1.3이 보통입니다. 무대를 위아래로 끌어 바꿔 보세요."],
    ],
    terms: [
      ["베이스라인", "Baseline", "글자가 놓이는 기준선. 크기가 다른 글자를 한 줄에 정렬할 때 맞추는 선입니다."],
      ["엑스하이트", "x-height", "소문자 x의 높이. 서체의 체감 크기를 좌우해, 서체를 고르거나 섞을 때 비교합니다."],
      ["캡하이트", "Cap height", "대문자 높이. 아이콘·버튼 글자를 세로로 맞출 때 기준입니다."],
      ["어센더 · 디센더", "Ascender · Descender", "엑스하이트 위로, 베이스라인 아래로 나가는 획. 행간이 좁을 때 서로 부딪히는 부분입니다."],
      ["가상 바디", "Em box", "글자를 설계하는 정사각 틀. CSS font-size는 이 틀의 높이입니다."],
      ["행간", "Leading · line-height", "줄과 줄 사이 거리. 금속활자 시절 줄 사이에 끼운 납(lead) 띠에서 온 말입니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      let step = 0, lh = 1.6;
      const sl = M.slider(api.controls, { id: "taLh", label: "line-height", min: 1, max: 2.2, step: 0.05, value: 1.6, fmt: (v) => v.toFixed(2), onInput: (v) => (lh = v) });
      const hint = M.el("p", { class: "hint" }, "무대를 위아래로 끌어도 line-height가 바뀝니다.");
      api.controls.append(hint);
      let drag = null;
      cv.addEventListener("pointerdown", (e) => { if (step !== 5) return; drag = { y: e.clientY, v: lh }; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener("pointermove", (e) => { if (!drag) return; lh = Math.round(M.clamp(drag.v + (e.clientY - drag.y) / 120, 1, 2.2) * 20) / 20; sl.set(lh); });
      const end = () => (drag = null);
      cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
      const SAMPLE = "Hxdp", KO = "한글";
      const LINES = [["베이스라인", 0], ["엑스하이트", 1], ["캡하이트", 2], ["어센더", 3], ["디센더", 3]];
      const show = {};
      const CODE = "/* 서체를 섞을 때: 크기보다 엑스하이트를 맞춘다 */\n:root {\n  font-family: \"Pretendard Variable\", sans-serif;\n  font-size-adjust: ex-height 0.53;\n}\n.icon { height: 1cap; }   /* 캡하이트 단위 */\n\n/* 행간 */\np  { line-height: 1.6; }\nh1 { line-height: 1.2; }";
      const HL = [[[0, 0]], [[1, 4]], [[5, 5]], [[7, 7]], [[2, 3]], [[7, 8]]];
      return {
        setStep(s) {
          step = s; sl.el.style.display = s === 5 ? "" : "none"; hint.style.display = s === 5 ? "" : "none";
          cv.style.cursor = s === 5 ? "ns-resize" : "default";
          api.code(CODE, HL[s], "CSS");
        },
        frame(time, dt) {
          const { x, w, h } = M.fit(cv), c = M.col();
          if (step === 5) return drawLeading(x, w, h, c);
          for (let i = 0; i < 5; i++) show[i] = follow(show[i] ?? 0, step >= LINES[i][1] ? 1 : 0, dt, 250);
          const nar = w < 520, lab = nar ? 0 : 96, padR = nar ? 74 : 92;
          x.font = M.font(100, "ui", 600);
          const wRef = x.measureText(SAMPLE + KO).width + 100 * 0.35;
          const size = Math.min(200, h * 0.38, (w - lab - padR - 16) / (wRef / 100));
          x.font = M.font(size, "ui", 600);
          const m = (s) => x.measureText(s);
          const xh = m("x").actualBoundingBoxAscent, cap = m("H").actualBoundingBoxAscent;
          const asc = m("d").actualBoundingBoxAscent, desc = m("p").actualBoundingBoxDescent;
          const ko = m(KO), koA = ko.actualBoundingBoxAscent, koD = ko.actualBoundingBoxDescent;
          const lw = m(SAMPLE).width, kw = ko.width, gap = size * 0.35;
          const ox = lab + (w - lab - padR - (lw + gap + kw)) / 2;
          const base = h * 0.52 + size * 0.3;
          const emA = ko.emHeightAscent ?? size * 0.8;
          const emTop = base - emA, emBot = emTop + size; // em 박스: 높이 = font-size
          const x0 = lab ? lab - 6 : 8, x1 = w - 10;

          // 어센더·디센더 띠
          if (step === 3) {
            x.fillStyle = M.alpha(c.b, 0.14); x.fillRect(x0, base - asc, x1 - x0, asc - xh); x.fillRect(x0, base, x1 - x0, desc);
          }
          // em 박스
          if (step === 4) {
            const boxes = [[ox - 4, lw + 8, "라틴"], [ox + lw + gap, kw, "한글"]];
            boxes.forEach(([bx, bw]) => {
              x.fillStyle = M.alpha(c.key, 0.16); x.fillRect(bx, emTop, bw, size);
              x.save(); x.setLineDash([5, 4]); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.strokeRect(bx + 0.5, emTop + 0.5, bw - 1, size - 1); x.restore();
            });
            M.tag(x, `em 박스 = font-size ${Math.round(size)}px`, ox + lw + gap / 2, Math.max(emBot, base + desc) + 18, { align: "center", size: 11.5 });
          }
          // 기준선
          const labels = [];
          LINES.forEach(([name, at], i) => {
            const a = show[i]; if (a < 0.02) return;
            const y = [base, base - xh, base - cap, base - asc, base + desc][i];
            const on = step === at && step !== 4;
            x.save(); x.globalAlpha = a;
            M.line(x, x0, y, x1, y, on ? c.key : M.alpha(c.ink, 0.28), on ? 2 : 1, on ? null : [4, 4]);
            x.restore();
            labels.push({ y, name, on, a });
          });
          // 라벨 겹침 풀기
          labels.sort((p, q) => p.y - q.y);
          const ly = labels.map((l) => l.y);
          for (let k = 1; k < ly.length; k++) if (ly[k] - ly[k - 1] < 20) ly[k] = ly[k - 1] + 20;
          labels.forEach((l, k) => {
            x.save(); x.globalAlpha = l.a;
            if (nar) {
              if (l.on && step !== 3) M.tag(x, l.name, x1 - 2, l.y - 14, { align: "right", size: 11.5, fill: tint(c.key, 0.35) });
            } else {
              if (Math.abs(ly[k] - l.y) > 1) M.line(x, lab - 10, ly[k], lab - 4, l.y, M.alpha(c.ink, 0.4), 1);
              if (l.on) M.tag(x, l.name, lab - 10, ly[k], { align: "right", size: 11.5, fill: tint(c.key, 0.35) });
              else M.text(x, l.name, lab - 12, ly[k] + 4, { size: 11, align: "right", color: c.muted });
            }
            x.restore();
          });
          // 글자
          x.font = M.font(size, "ui", 600); x.textBaseline = "alphabetic"; x.textAlign = "left";
          x.fillStyle = c.ink; x.fillText(SAMPLE, ox, base);
          x.fillStyle = step >= 4 ? c.ink : M.alpha(c.ink, 0.2); x.fillText(KO, ox + lw + gap, base);
          // 치수
          const dim = (top, bot, txt, ax) => {
            M.arrow(x, ax, bot - 1, ax, top + 2, c.ink, 1.5); M.arrow(x, ax, top + 1, ax, bot - 2, c.ink, 1.5);
            M.tag(x, txt, ax + 8, (top + bot) / 2, { size: 11.5, mono: true, fill: tint(c.key, 0.3) });
          };
          const ax = w - padR + 10;
          if (step === 0 && !nar) M.tag(x, "글자가 앉는 선", ax - 4, base - 16, { size: 11.5 });
          if (step === 1) dim(base - xh, base, (xh / size).toFixed(2) + "em", ax);
          if (step === 2) dim(base - cap, base, (cap / size).toFixed(2) + "em", ax);
          if (step === 3) {
            M.tag(x, "어센더 영역", x1 - 4, base - (asc + xh) / 2, { align: "right", size: 11.5, fill: tint(c.b, 0.25) });
            M.tag(x, "디센더 영역", x1 - 4, base + desc / 2, { align: "right", size: 11.5, fill: tint(c.b, 0.25) });
          }
          if (step === 4) {
            dim(base - koA, base + koD, ((koA + koD) / size).toFixed(2) + "em", ax);
            M.callout(x, `대문자 ${(cap / size).toFixed(2)}em`, ox + m("H").width / 2, base - cap, ox - 6, emTop - 14, { size: 11.5 });
          }
        },
      };
      function drawLeading(x, w, h, c) {
        const text = ["화면의 글은 읽히기 전에 먼저 보입니다.", "줄 사이가 좁으면 덩어리가 무겁고,", "너무 넓으면 줄이 서로 흩어집니다.", "본문은 1.5에서 1.8 사이가 편합니다."];
        const nar = w < 520, ox = nar ? 12 : 128, boxW = w - ox - (nar ? 12 : 24);
        x.font = M.font(20, "ui", 500);
        const maxW = Math.max(...text.map((t) => x.measureText(t).width));
        const size = Math.max(12, Math.min(30, ((boxW - 24) / maxW) * 20, (h - 100) / (text.length * 2.2)));
        const L = size * lh;
        const oy = Math.max(34, (h - L * text.length) / 2 + 6);
        x.font = M.font(size, "ui", 500);
        const asc = x.measureText("한").fontBoundingBoxAscent ?? size * 0.9;
        const dsc = x.measureText("한").fontBoundingBoxDescent ?? size * 0.25;
        const content = asc + dsc, half = (L - content) / 2;
        text.forEach((t, i) => {
          const top = oy + i * L, on = i === 1;
          x.fillStyle = M.alpha(c.a, on ? 0.12 : 0.05); x.fillRect(ox, top, boxW, L);
          if (half > 0) { x.fillStyle = M.alpha(c.key, on ? 0.45 : 0.2); x.fillRect(ox, top, boxW, half); x.fillRect(ox, top + L - half, boxW, half); }
          x.strokeStyle = on ? c.ink : M.alpha(c.ink, 0.25); x.lineWidth = on ? 1.25 : 1; x.strokeRect(ox + 0.5, top + 0.5, boxW - 1, L - 1);
          x.font = M.font(size, "ui", 500); x.fillStyle = on ? c.ink : M.alpha(c.ink, 0.75); x.textBaseline = "alphabetic"; x.textAlign = "left";
          x.fillText(t, ox + 12, top + half + asc);
        });
        const top = oy + L;
        M.tag(x, `line-height ${lh.toFixed(2)} → ${size.toFixed(0)}px × ${lh.toFixed(2)} = ${L.toFixed(0)}px`, ox, oy - 18, { size: 11.5, mono: true, fill: tint(c.a, 0.18) });
        if (!nar) {
          const bx = ox - 14;
          M.line(x, bx, top, bx, top + L, c.ink, 1.5); M.line(x, bx - 4, top, bx + 4, top, c.ink, 1.5); M.line(x, bx - 4, top + L, bx + 4, top + L, c.ink, 1.5);
          M.text(x, "줄 상자", bx - 8, top + L / 2 - 2, { size: 11.5, weight: 700, color: c.ink, align: "right" });
          M.text(x, `${L.toFixed(0)}px`, bx - 8, top + L / 2 + 12, { size: 11, mono: true, align: "right" });
          if (half > 1) M.callout(x, `하프 레딩 ${half.toFixed(1)}px`, ox + boxW - 30, top + half / 2, ox + boxW - 60, oy + L * 4 + 22, { size: 11.5, fill: tint(c.key, 0.35) });
          else M.tag(x, "여백 없음 → 줄이 붙음", ox + boxW, oy + L * 4 + 22, { size: 11.5, align: "right", color: c.b });
        } else {
          M.tag(x, half > 1 ? `하프 레딩 ${half.toFixed(1)}px (호박색)` : "여백 없음 → 줄이 붙음", ox, Math.min(h - 14, oy + L * 4 + 20), { size: 11.5, fill: tint(c.key, 0.35) });
        }
      }
    },
  });

  /* ===== 3-1 지각 균일 색 ===== */
  const PC = {
    hsl(h, s, l) {
      const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
      const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [f(0), f(8), f(4)];
    },
    toLin: (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)),
    toGam: (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055),
    oklabL(rgb) {
      const [r, g, b] = rgb.map(PC.toLin);
      const l = Math.cbrt(0.4122214708 * r + 0.5363288035 * g + 0.0514459929 * b);
      const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
      const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
      return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    },
    oklchRaw(L, Ch, h) {
      const a = Ch * Math.cos((h * Math.PI) / 180), b = Ch * Math.sin((h * Math.PI) / 180);
      const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
      return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    },
    oklch(L, Ch, h) {
      let lo = 0, hi = Ch, lin = PC.oklchRaw(L, Ch, h);
      const ok = (v) => v.every((x) => x >= -1e-4 && x <= 1 + 1e-4);
      if (!ok(lin)) { for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (ok(PC.oklchRaw(L, mid, h))) lo = mid; else hi = mid; } lin = PC.oklchRaw(L, lo, h); }
      return lin.map((v) => PC.toGam(M.clamp(v, 0, 1)));
    },
    gray(rgb) { const L = PC.oklabL(rgb); const g = PC.toGam(M.clamp(L ** 3, 0, 1)); return [g, g, g]; },
    css: (rgb) => `rgb(${rgb.map((v) => Math.round(M.clamp(v, 0, 1) * 255)).join(",")})`,
    Y: (rgb) => { const [r, g, b] = rgb.map(PC.toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; },
    ratio: (a, b) => { const A = PC.Y(a), B = PC.Y(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); },
  };

  LESSONS.push({
    id: "perceptual-color", ch: 2, order: 1,
    title: "숫자가 같아도 밝기는 다르다",
    lede: "이 레슨을 마치면 HSL의 '명도 50%'가 왜 눈에는 같은 밝기가 아닌지, 그리고 색을 숫자로 계산할 때 OKLCH를 쓰면 무엇이 달라지는지 알게 됩니다.",
    key: "HSL의 L은 눈이 느끼는 밝기가 아닙니다. 팔레트·상태 색·다크 모드처럼 색을 계산으로 만들 땐 OKLCH로 L을 고정합니다.",
    steps: [
      ["HSL, 명도 50%", "<code>hsl(색상 90% 50%)</code>에서 색상(hue)만 45°씩 돌린 8색입니다. 숫자로는 모두 명도 50%라서, 아래 그래프에도 '숫자상 밝기'가 한 줄로 평평하게 그려집니다. 정말 같은 밝기로 보이는지 다음 단계에서 확인합니다."],
      ["흑백으로 보면", "각 색에서 눈이 느끼는 밝기만 남겨 회색으로 바꿨습니다. 노랑·하늘색은 거의 흰색, 파랑·보라는 짙은 회색입니다. 그래프의 실제 밝기 선이 크게 출렁이고, 가장 밝은 색과 어두운 색의 차이(편차)가 표시됩니다. <b>HSL의 L은 지각 밝기가 아닙니다.</b>"],
      ["OKLCH", "<code>oklch(L C H)</code>는 사람 눈의 반응에 맞춰 만든 색 공간입니다. 밝기(L)와 채도(C)를 고정하고 색상(H)만 돌린 8색입니다. 위 HSL 줄과 견주면 색이 덜 쨍하지만 고르게 보입니다."],
      ["흑백으로 보면", "이번엔 회색이 거의 같고, 그래프의 선도 평평합니다. 편차가 HSL의 수십 분의 일입니다. 차트 팔레트, 버튼의 상태별 색, 다크 모드 색을 <b>계산으로 만들 때</b> 결과를 예측할 수 있다는 뜻입니다. CSS에서 <code>oklch()</code>를 바로 쓸 수 있습니다."],
      ["명도 대비", "글자와 바탕의 <b>대비율</b>(contrast ratio)입니다. WCAG 기준으로 본문은 4.5:1, 큰 글자는 3:1 이상이어야 합니다. 같은 'L 50%'라도 노랑에는 검은 글자만, 파랑에는 흰 글자만 통과합니다. 칸마다 ✓가 기준을 넘은 조합입니다."],
    ],
    terms: [
      ["색상 · 채도 · 명도", "Hue · Chroma · Lightness", "색의 종류, 선명함, 밝기. 색을 고르거나 설명할 때 쓰는 세 축입니다."],
      ["지각 균일성", "Perceptual uniformity", "숫자가 같은 만큼 변하면 눈에도 같은 만큼 변해 보이는 성질. 색을 계산으로 만들 때 필요한 조건이고, OKLCH가 HSL보다 훨씬 가깝습니다."],
      ["색역", "Gamut", "화면이 표현할 수 있는 색의 범위(sRGB, Display P3). OKLCH 값 일부는 sRGB 밖이라 채도를 깎아 표시합니다."],
      ["대비율", "Contrast ratio", "두 색의 상대 휘도 비. 1:1(같은 색)~21:1(흑백). 접근성 검사에서 글자 대비를 잴 때 씁니다."],
    ],
    mount(api) {
      const cv = api.canvas("fill");
      let step = 0, hl = 0.5, oL = 0.72, oC = 0.13;
      M.slider(api.controls, { id: "pcHslL", label: "HSL 명도", min: 0.2, max: 0.8, step: 0.01, value: 0.5, fmt: (v) => Math.round(v * 100) + "%", onInput: (v) => (hl = v) });
      M.slider(api.controls, { id: "pcOkL", label: "OKLCH 밝기 L", min: 0.3, max: 0.95, step: 0.01, value: 0.72, fmt: (v) => v.toFixed(2), onInput: (v) => (oL = v) });
      M.slider(api.controls, { id: "pcOkC", label: "OKLCH 채도 C", min: 0, max: 0.3, step: 0.005, value: 0.13, fmt: (v) => v.toFixed(3), onInput: (v) => (oC = v) });
      const hues = [0, 45, 90, 135, 180, 225, 270, 315];
      const an = { hslReal: 0, ok: 0, okLine: 0, hslDim: 0 };
      const CODE = "/* HSL: 숫자는 같아도 밝기가 들쭉날쭉 */\n--yellow: hsl(45 90% 50%);\n--blue:   hsl(225 90% 50%);\n\n/* OKLCH: L(밝기)과 C(채도)를 고정, H만 돌림 */\n--yellow: oklch(0.72 0.13 90);\n--blue:   oklch(0.72 0.13 260);\n\n/* 상태 색도 같은 L로 → 무게가 고르다 */\n--ok:   oklch(0.72 0.13 155);\n--warn: oklch(0.72 0.13 75);\n--err:  oklch(0.72 0.13 25);";
      const HL = [[[0, 2]], [[0, 2]], [[4, 6]], [[8, 11]], []];
      return {
        setStep(s) { step = s; api.code(CODE, HL[s], "CSS"); },
        frame(time, dt) {
          an.hslReal = follow(an.hslReal, step >= 1 ? 1 : 0, dt, 400);
          an.ok = follow(an.ok, step >= 2 ? 1 : 0, dt, 300);
          an.okLine = follow(an.okLine, step >= 3 ? 1 : 0, dt, 400);
          an.hslDim = follow(an.hslDim, step >= 2 ? 1 : 0, dt, 300);
          const { x, w, h } = M.fit(cv), c = M.col();
          const hslC = hues.map((hh) => PC.hsl(hh, 0.9, hl)), okC = hues.map((hh) => PC.oklch(oL, oC, hh));
          if (step === 4) return contrast(x, w, h, c, hslC);
          const nar = w < 520, pad = nar ? 10 : 16, lab = nar ? 0 : 74, gap = nar ? 4 : 6;
          const sw = (w - pad * 2 - lab - gap * 7) / 8;
          const rowH = M.clamp(h * 0.11, 26, 56);
          // 줄 구성
          const rows = [];
          if (step <= 1) { rows.push({ name: "HSL", cols: hslC, a: 1 }); if (step === 1) rows.push({ name: "흑백", cols: hslC.map(PC.gray), a: 1, gray: true }); }
          if (step === 2) { rows.push({ name: "HSL", cols: hslC, a: 0.35 }); rows.push({ name: "OKLCH", cols: okC, a: 1 }); }
          if (step === 3) { rows.push({ name: "OKLCH", cols: okC, a: 1 }); rows.push({ name: "흑백", cols: okC.map(PC.gray), a: 1, gray: true }); }
          let y = nar ? 30 : 28;
          rows.forEach((r, ri) => {
            x.save(); x.globalAlpha = r.a;
            if (lab) M.text(x, r.name, pad, y + rowH / 2 + 4, { size: 12, weight: 700, color: r.gray ? c.muted : c.ink, mono: !r.gray });
            else M.text(x, r.name, pad, y - 5, { size: 11, weight: 700, color: c.ink });
            r.cols.forEach((rgb, i) => {
              const px = pad + lab + i * (sw + gap);
              M.rrect(x, px, y, sw, rowH, 7); x.fillStyle = PC.css(rgb); x.fill(); x.strokeStyle = M.alpha(c.ink, 0.8); x.lineWidth = 1; x.stroke();
              if (ri === 0 && (!nar || i % 2 === 0)) M.text(x, hues[i] + "°", px + sw / 2, y - 6, { mono: true, size: 11, align: "center" });
            });
            x.restore();
            y += rowH + (nar ? 20 : 12);
          });
          // 그래프: 눈이 느끼는 밝기
          const gb = { x: pad + lab, y: y + 18, w: w - pad * 2 - lab, h: 0 };
          gb.h = h - gb.y - 34;
          if (gb.h < 60) return;
          const L0 = 0.3, L1 = 1.0;
          const GY = (v) => gb.y + gb.h - ((v - L0) / (L1 - L0)) * gb.h;
          const GX = (i) => gb.x + sw / 2 + i * (sw + gap);
          x.fillStyle = M.alpha(c.surface, 0.9); M.rrect(x, gb.x, gb.y, gb.w, gb.h, 8); x.fill(); x.strokeStyle = M.alpha(c.ink, 0.5); x.lineWidth = 1; x.stroke();
          for (const v of [0.4, 0.6, 0.8, 1.0]) { if (GY(v) < gb.y + 4) continue; M.line(x, gb.x + 4, GY(v), gb.x + gb.w - 4, GY(v), c.grid, 1); if (lab) M.text(x, v.toFixed(1), gb.x - 6, GY(v) + 4, { size: 11, mono: true, align: "right" }); }
          if (lab) { M.text(x, "눈이 느끼는", pad, gb.y + 14, { size: 11, weight: 600 }); M.text(x, "밝기", pad, gb.y + 28, { size: 11, weight: 600 }); }
          const hslL = hslC.map(PC.oklabL), okLv = okC.map(PC.oklabL);
          const mean = hslL.reduce((s, v) => s + v, 0) / 8;
          const series = (vals, cols, col, a, lw) => {
            x.save(); x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = lw; x.lineJoin = "round"; x.beginPath();
            vals.forEach((v, i) => (i ? x.lineTo(GX(i), GY(v)) : x.moveTo(GX(i), GY(v)))); x.stroke();
            vals.forEach((v, i) => { M.dot(x, GX(i), GY(v), 6, PC.css(cols[i])); x.beginPath(); x.arc(GX(i), GY(v), 6, 0, Math.PI * 2); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke(); });
            x.restore();
          };
          // HSL: 숫자상(평평) → 실제(출렁)
          const hv = hslL.map((v) => M.lerp(mean, v, an.hslReal));
          series(hv, hslC, c.b, 1 - an.hslDim * 0.6, 2);
          const hmax = Math.max(...hv), hmin = Math.min(...hv);
          const ix = hv.indexOf(hmax), in_ = hv.indexOf(hmin);
          if (step === 0) M.tag(x, "숫자상 밝기: 모두 L 50%", gb.x + gb.w - 8, GY(mean) - 22, { align: "right", size: 11.5, fill: tint(c.b, 0.18) });
          if (step === 1) {
            M.callout(x, `가장 밝음 ${hmax.toFixed(2)}`, GX(ix), GY(hmax), GX(ix) + (ix < 4 ? 30 : -30), GY(hmax) - 6 < gb.y + 14 ? gb.y + 14 : GY(hmax) - 6, { size: 11.5 });
            M.callout(x, `가장 어두움 ${hmin.toFixed(2)}`, GX(in_), GY(hmin), GX(in_) + (in_ < 4 ? 30 : -30), Math.min(gb.y + gb.h - 12, GY(hmin) + 8), { size: 11.5 });
          }
          if (an.ok > 0.02) {
            if (an.okLine > 0.02) series(okLv, okC, c.a, an.okLine, 2.5);
          }
          // 편차 요약
          const spread = (v) => Math.max(...v) - Math.min(...v);
          const s1 = spread(hslL), s2 = spread(okLv);
          const yS = h - 14;
          if (step >= 1) M.tag(x, `HSL 편차 ${(s1 * an.hslReal).toFixed(2)}`, gb.x, yS, { size: 11.5, mono: true, fill: tint(c.b, 0.2) });
          if (step >= 3) M.tag(x, `OKLCH 편차 ${s2.toFixed(2)}`, gb.x + (nar ? 130 : 150), yS, { size: 11.5, mono: true, fill: tint(c.a, 0.22) });
          if (step === 2) M.text(x, "다음 단계에서 OKLCH의 밝기 선을 그립니다", gb.x + gb.w / 2, gb.y + gb.h / 2 + 4, { size: 11.5, align: "center" });
        },
      };
      function contrast(x, w, h, c, cols) {
        const per = (w - 24 - 56) / 8 >= 120 ? 8 : 4, rowsN = 8 / per, nar = w < 520;
        const pad = 12, gap = nar ? 8 : 8;
        const cw = (w - pad * 2 - gap * (per - 1)) / per;
        const ch = Math.min((h - 40 - (rowsN - 1) * 14) / rowsN, cw * 1.25, 170);
        const oy = Math.max(28, (h - 26 - ch * rowsN - (rowsN - 1) * 14) / 2);
        cols.forEach((rgb, i) => {
          const r = Math.floor(i / per), k = i % per;
          const px = pad + k * (cw + gap), py = oy + r * (ch + 14);
          M.rrect(x, px + 1.5, py + 2.5, cw, ch, 10); x.fillStyle = c.ink; x.fill();
          M.rrect(x, px, py, cw, ch, 10); x.fillStyle = PC.css(rgb); x.fill(); x.strokeStyle = c.ink; x.lineWidth = 1.25; x.stroke();
          const wr = PC.ratio(rgb, [1, 1, 1]), br = PC.ratio(rgb, [0, 0, 0]);
          const fs = M.clamp(cw * 0.26, 14, 30);
          M.text(x, "가", px + cw * 0.3, py + ch * 0.46, { size: fs, weight: 800, color: "#fff", align: "center" });
          M.text(x, "가", px + cw * 0.7, py + ch * 0.46, { size: fs, weight: 800, color: "#000", align: "center" });
          const pill = (txt, cx, okk) => {
            x.font = M.font(11, "mono", 700); const tw = x.measureText(txt).width + 10;
            M.rrect(x, cx - tw / 2, py + ch - 26, tw, 18, 9); x.fillStyle = c.surface; x.fill(); x.strokeStyle = okk ? c.ink : M.alpha(c.ink, 0.35); x.lineWidth = 1; x.stroke();
            M.text(x, txt, cx, py + ch - 13, { size: 11, mono: true, weight: 700, align: "center", color: okk ? c.ink : c.muted });
          };
          if (cw > 110) { pill((wr >= 4.5 ? "✓" : "✕") + wr.toFixed(1), px + cw * 0.27, wr >= 4.5); pill((br >= 4.5 ? "✓" : "✕") + br.toFixed(1), px + cw * 0.73, br >= 4.5); }
          else { pill(wr >= 4.5 ? "흰 ✓" : br >= 4.5 ? "검 ✓" : "✕", px + cw / 2, wr >= 4.5 || br >= 4.5); }
          M.text(x, hues[i] + "°", px + 6, py + 15, { size: 11, mono: true, color: PC.Y(rgb) > 0.3 ? "#000" : "#fff" });
        });
        M.tag(x, w < 520 ? "왼쪽 흰 글자 · 오른쪽 검은 글자 · 기준 4.5:1" : "왼쪽 = 흰 글자, 오른쪽 = 검은 글자 · 기준 4.5 : 1 (WCAG AA 본문)", w / 2, h - 16, { align: "center", size: 11.5 });
      }
    },
  });
})();
