/* 6장: 브라우저가 그리는 법 — 레이어, View Transitions, 스크롤 연동, SVG 선 그리기 */
(() => {
  const SVGNS = "http://www.w3.org/2000/svg";
  const sv = (tag, attrs = {}) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  /* 단계마다 다시 채우는 조작 영역 */
  const ctlBox = (api) => { const b = M.el("div", { class: "webl-ctl" }); api.controls.append(b); return b; };

  /* ===== 6-2 레이어와 합성 ===== */
  LESSONS.push({
    id: "layers", ch: 5, order: 2,
    title: "레이어와 합성",
    lede: "브라우저는 화면을 늘 한 장으로 칠하지 않습니다. 필요한 부분을 여러 장의 레이어로 나눠 칠한 뒤 GPU가 겹칩니다. 화면을 기울여 판을 펼쳐 보는 분해도로, 레슨을 마치면 레이어가 언제 생기는지, 왜 움직임을 가볍게 만드는지, 너무 많으면 무엇이 문제인지 설명할 수 있습니다.",
    key: "움직일 요소만 움직이는 동안 레이어로 올리고, 끝나면 내립니다. will-change는 필요한 곳에만 쓰는 처방입니다.",
    steps: [
      ["한 장으로 칠한 화면", "기본적으로 페이지는 <b>레이어 한 장</b>에 칠해집니다. 잠시 뒤 화면이 기울어 펼쳐져도 판은 #document 하나뿐이고, 오른쪽 레이어 목록도 1장입니다. 이 상태로 카드를 <code>left</code>로 움직이면 카드가 지나는 자리를 매 프레임 다시 칠해야 합니다. 초록으로 깜박이는 띠가 다시 칠하는 영역(페인트 플래싱)입니다."],
      ["레이어로 승격", "카드에 <code>will-change: transform</code>을 주면 브라우저가 카드를 <b>자기만의 합성 레이어</b>로 떼어 냅니다. 분해도에서 카드가 페이지 판 위로 떠올랐고, 목록도 2장이 됐습니다. 카드는 한 번만 칠해 두고 움직일 땐 GPU가 판을 옮기기만 하니 초록 깜박임이 사라집니다. 체크를 꺼서 비교해 보세요."],
      ["레이어가 생기는 경우", "will-change 말고도 레이어가 생기는 경우가 여럿입니다. 오른쪽 목록의 회색 글씨가 판마다 승격된 이유입니다. <code>position: fixed</code> 헤더, <code>video</code>·<code>canvas</code>, transform이나 opacity를 애니메이션하는 중인 요소가 대표적입니다. 크롬 개발자 도구의 <b>Layers</b> 패널을 열면 실제 사이트의 판과 이유를 이렇게 볼 수 있습니다."],
      ["레이어 폭발", "레이어 한 장은 <b>가로 × 세로 × 4바이트</b>짜리 비트맵이고, 레티나(DPR 2) 화면에선 그 네 배가 듭니다. 목록 항목 40개에 모두 will-change를 걸자 판이 41장으로 늘고 아래 메모리 막대가 차올랐습니다. 모바일에선 이 정도면 오히려 버벅이거나 화면이 깨집니다. 슬라이더로 항목 수를 줄여 보세요."],
      ["쌓임 맥락과 z-index", "<code>z-index</code>는 같은 <b>쌓임 맥락</b>(stacking context, z-index끼리 비교되는 묶음) 안에서만 비교됩니다. A가 <code>z-index: 1</code>로 맥락을 만들면 그 안의 툴팁은 999여도 A와 한 묶음이 되어 B(2) 아래에 깔립니다. 펼친 그림에서 노란 툴팁이 A 판 바로 위에 갇혀 있는 걸 보세요. '포털로 꺼내기'를 켜면 맨 위로 올라갑니다."],
    ],
    terms: [
      ["합성 레이어", "Compositor layer", "따로 칠해 GPU 텍스처로 올려 둔 판. 옮기거나 투명도만 바꿀 땐 다시 칠하지 않습니다."],
      ["레이어 승격", "Layer promotion", "요소를 자기 레이어로 떼어 내는 일. will-change, 3D transform, 진행 중인 transform·opacity 애니메이션 등이 원인입니다."],
      ["페인트 플래싱", "Paint flashing", "다시 칠한 영역을 초록으로 표시하는 개발자 도구 기능(Rendering 탭)."],
      ["레이어 폭발", "Layer explosion", "레이어가 지나치게 많아져 메모리와 합성 비용이 커지는 상태."],
      ["쌓임 맥락", "Stacking context", "z-index가 비교되는 범위. position+z-index, opacity < 1, transform, isolation: isolate 등이 새로 만듭니다."],
    ],
    mount(api) {
      const PW = 240, PH = 170, DEG = Math.PI / 180;
      const root = M.el("div", { class: "dom-stage webl-fill" });
      const wrap = M.el("div", { class: "layers-wrap" });
      const view = M.el("div", { class: "layers-view" });
      const world = M.el("div", { class: "layers-world" });
      const legend = M.el("div", { class: "layers-legend" });
      const list = M.el("ul", { class: "layers-list" });
      const foot = M.el("div", { class: "layers-foot" });
      const meter = M.el("div", { class: "layers-meter" }, M.el("i"));
      legend.append(M.el("div", { class: "layers-lh" }, "레이어 목록"), list, foot, meter);
      view.append(world); wrap.append(view, legend); root.append(wrap); api.stage.append(root);
      const ctl = ctlBox(api);

      let step = 0, gapK = 1, will = false, nItems = 40, portal = false;
      let plates = [], card = null, cardInRoot = false, flash = null, toast = null, bob = null;

      const page = (el) => {
        el.append(M.el("div", { class: "layers-hdr" }));
        for (let i = 0; i < 3; i++) el.append(M.el("i", { class: "layers-ln", style: `top:${118 + i * 13}px;width:${[70, 55, 62][i]}%;left:12px` }));
      };
      const cardFace = (el) => { el.append(M.el("b", { class: "layers-cimg" }), M.el("i", { class: "layers-cl" }), M.el("i", { class: "layers-cl s" })); };

      function defs() {
        const R = { id: "root", name: "#document", why: "루트 레이어", x: 0, y: 0, w: PW, h: PH, tone: "root" };
        const CARD = { id: "card", name: ".card", why: "will-change: transform", x: 16, y: 34, w: 84, h: 64, tone: "a" };
        if (step <= 1) return will ? [R, CARD] : [R];
        if (step === 2) return [R,
          { id: "video", name: "<video>", why: "비디오·캔버스", x: 12, y: 32, w: 96, h: 70, tone: "c" },
          { id: "bob", name: ".card", why: "transform 애니메이션 중", x: 126, y: 36, w: 90, h: 56, tone: "a" },
          { id: "toast", name: ".toast", why: "opacity 애니메이션 중", x: 118, y: 116, w: 108, h: 34, tone: "key" },
          { id: "hdr", name: "header", why: "position: fixed", x: 0, y: 0, w: PW, h: 22, tone: "b" }];
        if (step === 3) {
          const out = [R];
          for (let i = 0; i < nItems; i++) {
            const col = i % 4, row = Math.floor(i / 4);
            out.push({ id: "it" + i, name: ".item", why: "will-change", x: 10 + col * 56, y: 28 + row * 13.6, w: 52, h: 11, tone: ["a", "b", "c", "key"][col], small: true });
          }
          return out;
        }
        const A = { id: "A", name: "A", why: "z-index: 1 → 맥락 생성", x: 14, y: 30, w: 128, h: 92, tone: "a" };
        const T = { id: "tip", name: "툴팁", why: portal ? "z-index: 999 (body 끝)" : "z-index: 999 (A 안)", x: 104, y: 52, w: 92, h: 32, tone: "key", indent: !portal };
        const B = { id: "B", name: "B", why: "z-index: 2", x: 94, y: 70, w: 132, h: 84, tone: "b" };
        return portal ? [R, A, B, T] : [R, A, T, B];
      }

      function build() {
        world.innerHTML = ""; list.innerHTML = "";
        card = flash = toast = bob = null; cardInRoot = false;
        plates = defs().map((d, i) => {
          const el = M.el("div", { class: `layers-plate t-${d.tone}${d.small ? " small" : ""}`, style: `left:${d.x}px;top:${d.y}px;width:${d.w}px;height:${d.h}px` });
          if (d.id === "root") { page(el); flash = M.el("div", { class: "layers-flash" }); el.append(flash); }
          if (d.id === "card" || d.id === "bob") cardFace(el);
          if (d.id === "video") el.append(M.el("b", { class: "layers-play" }));
          if (!d.small) el.append(M.el("span", { class: "layers-tag" }, d.name));
          world.append(el);
          if (d.id === "card") card = el;
          if (d.id === "toast") toast = el;
          if (d.id === "bob") bob = el;
          return { d, el, lv: i };
        });
        if (step <= 1 && !will) {
          card = M.el("div", { class: "layers-plate t-a inroot", style: "left:16px;top:34px;width:84px;height:64px" });
          cardFace(card); card.append(M.el("span", { class: "layers-tag" }, ".card"));
          plates[0].el.append(card); cardInRoot = true;
        }
        const shown = step === 3 ? plates.slice(0, 4) : plates;
        shown.slice().reverse().forEach(({ d }) => list.append(M.el("li", { class: d.indent ? "in" : "" }, M.el("i", { class: `layers-sw t-${d.tone}` }), M.el("span", {}, M.el("b", {}, d.name), M.el("small", {}, d.why)))));
        if (step === 3 && plates.length > 4) list.prepend(M.el("li", { class: "more" }, `… .item ${plates.length - 4}개 더`));
        // 메모리: 1440×900 화면, DPR 2 가정
        const mb = plates.reduce((s, { d }) => s + (d.w / PW) * 1440 * (d.h / PH) * 900 * 4 * 4, 0) / 1048576;
        foot.innerHTML = `<b>${plates.length}장</b> · GPU 메모리 약 <b>${mb.toFixed(1)} MB</b><small>1440×900 화면, DPR 2 가정</small>`;
        meter.firstChild.style.width = Math.min(100, (mb / 64) * 100) + "%";
        meter.classList.toggle("hot", mb > 40);
      }

      const CODE = [
        ".card {\n  position: relative;\n  animation: slide 2s infinite alternate;\n}\n@keyframes slide {\n  from { left: 0; }\n  to   { left: 110px; }  /* 매 프레임 페인트 */\n}",
        ".card {\n  will-change: transform;  /* 미리 레이어로 승격 */\n  animation: slide 2s infinite alternate;\n}\n@keyframes slide {\n  to { transform: translateX(110px); } /* 합성만 */\n}",
        "/* 레이어가 되는 흔한 이유 */\nheader { position: fixed; }        /* 스크롤과 따로 움직임 */\nvideo, canvas { }                  /* 자체 버퍼 */\n.card  { animation: bob 1s; }      /* transform 애니메이션 */\n.toast { animation: fade 1s; }     /* opacity 애니메이션 */\n.box   { transform: translateZ(0); } /* 3D 강제 승격 */",
        "/* 나쁨: 항목마다 상시 레이어 */\n.item { will-change: transform; }\n\n/* 좋음: 움직이기 직전에만 올리고 끝나면 내림 */\nel.style.willChange = 'transform';\nel.animate(frames, opts).finished\n  .then(() => { el.style.willChange = 'auto'; });",
        ".a   { position: relative; z-index: 1; } /* 맥락 생성 */\n.tip { position: absolute; z-index: 999; }\n.b   { position: relative; z-index: 2; }\n\n/* .tip 의 999 는 .a 안에서만 유효.\n   밖에서는 .a(1) < .b(2) 로 비교됩니다. */\n/* 해결: 툴팁을 .a 밖(body 끝)으로 포털 */",
      ];
      const HL = [[[5, 6]], [[1, 1], [5, 5]], "all", [[0, 1]], [[0, 2]]];

      function controls() {
        ctl.innerHTML = "";
        M.slider(ctl, { id: "lyr-gap", label: "펼침 간격", min: 0, max: 100, value: Math.round(gapK * 100), unit: "%", onInput: (v) => (gapK = v / 100) });
        if (step <= 1) M.check(ctl, { id: "lyr-will", label: "카드에 will-change: transform", checked: will, onChange: (v) => { will = v; build(); } });
        if (step === 3) M.slider(ctl, { id: "lyr-n", label: "will-change 건 항목", min: 0, max: 40, value: nItems, unit: "개", onInput: (v) => { nItems = v; build(); } });
        if (step === 4) M.check(ctl, { id: "lyr-portal", label: "툴팁을 A 밖으로 꺼내기 (포털)", checked: portal, onChange: (v) => { portal = v; build(); api.code(CODE[4], v ? [[6, 6]] : [[0, 2]], "CSS"); } });
      }

      return {
        setStep(s) {
          step = s; will = s === 1; portal = false; nItems = 40;
          controls(); build();
          api.code(CODE[s], HL[s], "CSS");
        },
        frame(time) {
          // 기울기: 0 = 정면(평소 화면), 1 = 분해도
          let t = 1;
          if (step === 0) t = M.ease.inOut(M.clamp((time - 900) / 1100, 0, 1));
          if (step === 4) { const { p, back } = M.pingpong(time, 1100, 1700); const e = M.ease.inOut(p); t = back ? 1 - e : e; }
          const vw = view.clientWidth, vh = view.clientHeight;
          const n = plates.length;
          const g = (step === 3 ? Math.min(36, 150 / Math.max(1, n - 1)) : 36) * gapK;
          const rz = 38 * t * DEG, rx = 55 * t * DEG;
          const Wf = PW * Math.cos(rz) + PH * Math.sin(rz), Hf = (PW * Math.sin(rz) + PH * Math.cos(rz)) * Math.cos(rx);
          const stack = (n - 1) * g * t * Math.sin(rx);
          const sc = Math.min(1.5, (vw - 16) / Wf, (vh - 24) / (Hf + stack));
          world.style.transform = `translateY(${(stack * sc) / 2}px) scale(${sc}) rotateX(${55 * t}deg) rotateZ(${-38 * t}deg)`;
          const pr = (Math.sin(time / 520) + 1) / 2;
          plates.forEach(({ el, lv, d }) => {
            let tx = 0, ty = 0;
            if (d.id === "card") tx = pr * 110;
            if (d.id === "bob") ty = -pr * 10;
            el.style.transform = `translate3d(${tx}px, ${ty}px, ${lv * (g * t + 0.6)}px)`;
          });
          if (toast) toast.style.opacity = 0.35 + 0.65 * pr;
          if (cardInRoot && card) card.style.left = 16 + pr * 110 + "px";
          if (flash) {
            const on = cardInRoot;
            flash.style.cssText = on ? `left:12px;top:30px;width:${84 + 118}px;height:72px;opacity:${0.35 + 0.3 * (Math.floor(time / 50) % 2)}` : "opacity:0";
          }
        },
      };
    },
  });

  /* ===== 6-4 View Transitions ===== */
  LESSONS.push({
    id: "view-transitions", ch: 5, order: 4,
    title: "View Transitions API",
    lede: "화면 상태가 바뀔 때 브라우저가 전후 모습을 찍어 두고 그 사이를 애니메이션해 주는 API입니다. 목록에서 상세로 넘어가는 작은 앱으로, 레슨을 마치면 스냅숏 두 장이 어떻게 겹치는지, 이름 하나로 공유 요소 전환을 만드는 법을 알게 됩니다.",
    key: "DOM 변경을 startViewTransition으로 감싸고, 이어 보일 요소에만 고유한 view-transition-name을 붙입니다. 미지원 브라우저에선 그냥 바뀌게 둡니다.",
    steps: [
      ["그냥 바꾸면", "목록 항목을 누르면 자바스크립트가 DOM을 상세 화면으로 갈아 끼웁니다. 아무 처리도 하지 않으면 다음 프레임에 <b>뚝 바뀝니다</b>. 왼쪽 앱이 목록과 상세를 오가는 걸 보세요. 눌렀던 항목이 어디로 갔는지 눈이 따라가지 못합니다."],
      ["startViewTransition", "DOM을 바꾸는 함수를 <code>document.startViewTransition()</code>에 넘기면 브라우저가 ① 바꾸기 전 화면을 찍고 ② 함수를 실행하고 ③ 바뀐 화면과의 사이를 애니메이션합니다. 기본값은 <b>크로스페이드</b>(두 화면이 겹쳐 흐려지며 바뀜)입니다. 오른쪽 트리의 opacity 숫자가 0과 1 사이를 오가는 걸 보세요."],
      ["구 스냅숏, 신 스냅숏", "전환 중에는 진짜 요소 대신 그림 두 장이 겹쳐 그려집니다. <code>::view-transition-old</code>는 바꾸기 전의 <b>정지 이미지</b>, <code>::view-transition-new</code>는 바뀐 뒤의 <b>실시간 화면</b>입니다. 1.4초로 느리게 돌려 빨간 점선(구)과 초록 실선(신) 테두리가 엇갈리는 모습을 보세요."],
      ["공유 요소: view-transition-name", "목록의 썸네일과 상세의 큰 이미지에 <b>같은 이름</b>을 붙이면, 브라우저가 둘을 한 요소로 보고 위치와 크기를 이어 붙여 움직입니다. 작은 썸네일이 커지며 상세 이미지가 되는 게 보이죠. 오른쪽 트리에도 group(vtd-thumb)이 생겼습니다. 같은 이름은 한 화면에 하나만 있어야 합니다."],
      ["꾸미기와 다른 문서 전환", "의사 요소는 보통 CSS 애니메이션으로 꾸밉니다. '직접 해보기'에서 밀어내기를 골라 보세요. 페이지 자체를 이동하는 사이트(MPA)도 양쪽 CSS에 <code>@view-transition { navigation: auto; }</code> 한 줄이면 같은 전환이 됩니다. 이제 항목을 직접 눌러 보고, 미지원 브라우저용 폴백도 켜 보세요."],
    ],
    terms: [
      ["View Transitions API", "View Transitions API", "상태 변경 전후를 스냅숏으로 찍어 그 사이를 애니메이션하는 브라우저 API."],
      ["스냅숏", "Old / New snapshot", "구 화면은 정지 이미지, 신 화면은 실시간 렌더링으로 의사 요소에 그려집니다."],
      ["공유 요소 전환", "Shared element transition", "두 화면의 같은 이름을 가진 요소가 위치·크기를 이어 받으며 바뀌는 전환."],
      ["교차 문서 전환", "Cross-document (MPA) transition", "페이지 이동 사이에 일어나는 전환. @view-transition 규칙으로 켭니다."],
      ["점진적 향상", "Progressive enhancement", "지원하면 애니메이션, 안 하면 그냥 바뀌는 방식으로 기능을 덧붙이는 태도."],
    ],
    mount(api) {
      const ITEMS = [["디자인 기초", "단계 5개", "a"], ["글자와 위계", "단계 4개", "b"], ["색의 대비", "단계 6개", "c"], ["움직임의 문법", "단계 5개", "key"]];
      const SUP = typeof document.startViewTransition === "function";
      const html = document.documentElement;
      const root = M.el("div", { class: "dom-stage webl-fill" });
      const wrap = M.el("div", { class: "vtd-wrap" });
      const app = M.el("div", { class: "vtd-app" });
      const screen = M.el("div", { class: "vtd-screen" });
      app.append(screen);
      const side = M.el("div", { class: "vtd-side" });
      const tree = M.el("div", { class: "vtd-tree" });
      const status = M.el("div", { class: "vtd-status" });
      side.append(M.el("div", { class: "vtd-lh" }, "전환 중 의사 요소 트리"), tree, status);
      wrap.append(app, side); root.append(wrap); api.stage.append(root);
      const ctl = ctlBox(api);

      let step = 0, view = "list", sel = 0, dur = 600, force = false, slide = false;
      let vt = null, t0 = -1, nextAt = 900, touched = false, ghosts = [], vals = [];

      const mark = (th, ti) => {
        if (step < 3) return;
        th.style.viewTransitionName = "vtd-thumb"; ti.style.viewTransitionName = "vtd-title"; th.dataset.shared = "1";
      };
      function render() {
        screen.innerHTML = "";
        screen.style.viewTransitionName = step >= 1 ? "vtd-screen" : "";
        if (view === "list") {
          screen.append(M.el("div", { class: "vtd-bar" }, M.el("b", {}, "레슨"), M.el("small", {}, "4개")));
          ITEMS.forEach(([t, m, tone], i) => {
            const th = M.el("i", { class: "vtd-thumb t-" + tone }), ti = M.el("b", { class: "vtd-title" }, t);
            screen.append(M.el("button", { class: "vtd-row", onclick: () => { touched = true; go("detail", i); } }, th, M.el("span", {}, ti, M.el("small", {}, m))));
            if (i === sel) mark(th, ti);
          });
        } else {
          const [t, m, tone] = ITEMS[sel];
          const th = M.el("i", { class: "vtd-hero t-" + tone }), ti = M.el("b", { class: "vtd-htitle" }, t);
          screen.append(M.el("button", { class: "vtd-back", onclick: () => { touched = true; go("list", sel); } }, "← 목록"), th, ti,
            M.el("small", { class: "vtd-meta" }, m), M.el("p", { class: "vtd-lines" }, M.el("i"), M.el("i"), M.el("i")));
          mark(th, ti);
        }
      }
      const cleanup = () => { html.classList.remove("vtd-on", "vtd-show", "vtd-slide"); html.style.removeProperty("--vtd-dur"); };
      function fallback(update) {
        const thOld = screen.querySelector("[data-shared]");
        const r0 = thOld && thOld.getBoundingClientRect();
        const old = screen.cloneNode(true);
        old.classList.add("vtd-ghost"); old.removeAttribute("style");
        old.querySelectorAll("[style]").forEach((e) => (e.style.viewTransitionName = ""));
        update();
        app.append(old); ghosts.push(old);
        const opt = { duration: dur, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" };
        const outK = slide ? [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-30%)" }] : [{ opacity: 1 }, { opacity: 0 }];
        const inK = slide ? [{ opacity: 0, transform: "translateX(30%)" }, { opacity: 1, transform: "none" }] : [{ opacity: 0 }, { opacity: 1 }];
        const thNew = screen.querySelector("[data-shared]");
        old.animate(outK, opt).finished.then(() => { old.remove(); ghosts = ghosts.filter((g) => g !== old); }).catch(() => {});
        [...screen.children].forEach((ch) => { if (ch !== thNew) ch.animate(inK, { ...opt, fill: "none" }); });
        if (thNew && r0) {
          const r1 = thNew.getBoundingClientRect();
          const oldTh = old.querySelector("[data-shared]"); if (oldTh) oldTh.style.visibility = "hidden";
          thNew.animate([{ transformOrigin: "0 0", transform: `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px) scale(${r0.width / r1.width}, ${r0.height / r1.height})` }, { transformOrigin: "0 0", transform: "none" }], { duration: dur, easing: "cubic-bezier(.16,1,.3,1)" });
        }
        t0 = performance.now();
      }
      function go(v, i) {
        if (v === "detail" && view === "list" && i !== sel) { sel = i; render(); } // 바꾸기 전 화면에서 고른 항목에 이름을 붙여 둔다
        const update = () => { view = v; sel = i; render(); };
        if (step === 0) { update(); return; }
        if (SUP && !force) {
          if (vt) vt.skipTransition();
          html.classList.add("vtd-on");
          html.classList.toggle("vtd-show", step === 2);
          html.classList.toggle("vtd-slide", step === 4 && slide);
          html.style.setProperty("--vtd-dur", dur + "ms");
          let my;
          try { my = document.startViewTransition(update); } catch { update(); cleanup(); return; }
          vt = my; t0 = performance.now();
          my.finished.catch(() => {}).finally(() => { if (vt === my) { vt = null; cleanup(); } });
        } else fallback(update);
      }

      function buildTree() {
        tree.innerHTML = ""; vals = [];
        const line = (txt, kind, val) => {
          const v = M.el("em", {}, val || ""); v.dataset.l = val || "";
          tree.append(M.el("div", { class: "vtd-tl " + (kind || "") }, M.el("span", {}, txt), v));
          if (kind) vals.push({ v, kind });
        };
        if (step === 0) {
          line("(전환 없음)", "", "");
          line("상태 변경 → 다음 프레임에", "", "");
          line("새 DOM 이 바로 그려짐", "", "");
          return;
        }
        line("::view-transition", "", "");
        const grp = (n, label) => {
          line(`└ group(${n})`, "grp", label);
          line(`  └ image-pair(${n})`, "", "");
          line(`    ├ old(${n})`, "old", "1 → 0");
          line(`    └ new(${n})`, "new", "0 → 1");
        };
        grp("vtd-screen", "");
        if (step >= 3) { grp("vtd-thumb", "위치·크기"); line("└ group(vtd-title) …", "grp", "위치"); }
      }
      function statusText() {
        const live = SUP && !force;
        status.innerHTML = SUP ? `startViewTransition <b>지원</b> · ${live ? "실제 API 사용" : "폴백 강제(Web Animations)"}` : "startViewTransition <b>미지원</b> · 폴백(Web Animations)";
        status.classList.toggle("fb", !live);
      }

      const CODE = [
        "row.addEventListener('click', () => {\n  showDetail(item);   // DOM 을 바로 바꾼다\n});",
        "row.addEventListener('click', () => {\n  if (!document.startViewTransition) {\n    showDetail(item);           // 미지원: 그냥 바꾼다\n    return;\n  }\n  document.startViewTransition(() => showDetail(item));\n});",
        "/* 전환 중에만 존재하는 의사 요소 */\n::view-transition-old(root) {  /* 바꾸기 전: 정지 이미지 */\n  animation: 1.4s both fade-out;\n}\n::view-transition-new(root) {  /* 바꾼 뒤: 실시간 */\n  animation: 1.4s both fade-in;\n}",
        "/* 목록의 썸네일 (누른 항목에만) */\n.row.selected .thumb { view-transition-name: lesson-thumb; }\n/* 상세의 큰 이미지 */\n.detail .hero        { view-transition-name: lesson-thumb; }\n\n::view-transition-group(lesson-thumb) {\n  animation-duration: .6s;\n  animation-timing-function: cubic-bezier(.16, 1, .3, 1);\n}",
        "/* 다른 문서 사이 전환 (양쪽 페이지에) */\n@view-transition { navigation: auto; }\n\n/* 밀어내기로 꾸미기 */\n::view-transition-old(root) { animation: .5s both slide-out; }\n::view-transition-new(root) { animation: .5s both slide-in; }\n@keyframes slide-out { to   { transform: translateX(-30%); opacity: 0; } }\n@keyframes slide-in  { from { transform: translateX(30%);  opacity: 0; } }",
      ];
      const HL = [[[1, 1]], [[5, 5]], [[1, 6]], [[1, 4]], [[1, 1]]];

      function controls() {
        ctl.innerHTML = "";
        M.slider(ctl, { id: "vtd-dur", label: "전환 시간", min: 200, max: 2000, step: 50, value: dur, unit: " ms", onInput: (v) => (dur = v) });
        if (step === 4) M.chips(ctl, { title: "전환 모양", items: ["크로스페이드", "밀어내기"], value: slide ? 1 : 0, onPick: (i) => { slide = i === 1; } });
        if (step >= 1) M.check(ctl, { id: "vtd-force", label: "API 끄고 폴백으로 보기", checked: force, onChange: (v) => { force = v; statusText(); } });
        const r = M.readout(ctl); r.textContent = step === 4 ? "목록 항목이나 '← 목록'을 눌러 보세요." : "자동으로 목록 ↔ 상세를 오갑니다. 항목을 눌러도 됩니다.";
      }

      return {
        setStep(s) {
          if (vt) vt.skipTransition();
          ghosts.forEach((g) => g.remove()); ghosts = [];
          step = s; view = "list"; sel = 0; touched = false; nextAt = 900; t0 = -1;
          dur = s === 2 ? 1400 : 600; slide = false;
          controls(); render(); buildTree(); statusText();
          api.code(CODE[s], HL[s], s === 0 || s === 1 ? "JavaScript" : "CSS");
        },
        frame(time) {
          if (!touched && time >= nextAt) {
            nextAt = time + dur + 1500;
            if (view === "list") go("detail", (sel + (time > 1000 ? 1 : 0)) % ITEMS.length);
            else go("list", sel);
          }
          const p = t0 < 0 ? 1 : M.clamp((performance.now() - t0) / dur, 0, 1);
          const e = M.ease.out(p);
          for (const { v, kind } of vals) {
            if (p >= 1) { v.textContent = kind === "old" ? "1 → 0" : kind === "new" ? "0 → 1" : v.dataset.l; v.parentNode.classList.remove("on"); continue; }
            v.parentNode.classList.add("on");
            if (kind === "old") v.textContent = "opacity " + (1 - e).toFixed(2);
            else if (kind === "new") v.textContent = "opacity " + e.toFixed(2);
            else v.textContent = Math.round(e * 100) + "%";
          }
        },
        destroy() {
          if (vt) vt.skipTransition();
          vt = null; cleanup();
          ghosts.forEach((g) => g.remove());
        },
      };
    },
  });

  /* ===== 6-5 스크롤 연동 애니메이션 ===== */
  LESSONS.push({
    id: "scroll-driven", ch: 5, order: 5,
    title: "스크롤 연동 애니메이션",
    lede: "시간 대신 스크롤 위치로 애니메이션을 진행시키는 방법입니다. 무대 안의 작은 화면을 스크롤하며, 스크롤 위치가 진행도로 바뀌는 모습을 오른쪽 그래프로 함께 봅니다. 레슨을 마치면 scroll()·view() 타임라인과 animation-range를 골라 쓸 수 있습니다.",
    key: "스크롤에 묶을 땐 scroll()·view() 타임라인과 animation-range로 CSS에 맡기고, 한 번 재생할 등장 효과는 IntersectionObserver로 트리거합니다.",
    steps: [
      ["스크롤 = 진행도", "스크롤할 수 있는 거리 중 얼마나 내려왔는지가 곧 <b>0~100%의 진행도</b>입니다. 왼쪽 작은 화면이 저절로 스크롤되는 동안, 맨 위 파란 막대와 그래프의 점이 같은 비율로 움직입니다. <code>animation-timeline: scroll()</code>을 쓰면 시간이 아니라 스크롤 위치가 재생 헤드가 됩니다. 화면을 직접 스크롤해도 됩니다."],
      ["view() 타임라인", "<code>view()</code>는 페이지 전체가 아니라 <b>요소 하나가 화면을 지나가는 구간</b>을 진행도로 씁니다. 빨간 테두리의 카드 3 아래쪽이 화면에 들어오는 순간 0%, 위쪽이 완전히 나가는 순간 100%입니다. 그래프에서 세로 점선 두 개 사이의 비탈이 그 구간이고, 회색 띠가 지금 화면에 보이는 범위입니다."],
      ["animation-range", "<code>animation-range</code>로 그 구간 중 어디를 쓸지 고릅니다. <b>entry</b>는 들어오는 동안, <b>exit</b>는 나가는 동안, <b>contain</b>은 완전히 보이는 동안, <b>cover</b>는 처음부터 끝까지입니다. 칩을 바꾸면 그래프의 진한 띠와 비탈이 옮겨 갑니다. 등장 효과에는 보통 <code>entry 0% entry 100%</code>를 씁니다."],
      ["패럴랙스", "멀리 있는 층은 스크롤보다 느리게, 가까운 층은 빠르게 움직이면 깊이가 생깁니다(패럴랙스). 세 층에 같은 view() 타임라인을 주고 <b>이동 거리만 다르게</b> 했습니다. 그래프의 선 세 개의 기울기가 곧 세 층의 속도입니다. 세기를 너무 키우면 어지러우니 층마다 ±40px 안쪽이 무난합니다."],
      ["스크럽 vs 트리거", "<b>스크럽</b>(scrub)은 진행도가 스크롤에 묶여 있어 거꾸로 올리면 되감깁니다(그래프의 실선). <b>트리거</b>는 문턱을 넘는 순간 정해진 시간 동안 한 번 재생되고, 스크롤 속도와는 상관이 없습니다(점선, 켜짐과 꺼짐뿐). 읽는 흐름을 보여 줄 땐 스크럽, 카드 등장 효과엔 트리거가 맞습니다."],
    ],
    terms: [
      ["스크롤 타임라인", "Scroll progress timeline · scroll()", "스크롤 컨테이너의 스크롤 위치를 0~100% 진행도로 쓰는 타임라인."],
      ["뷰 타임라인", "View progress timeline · view()", "요소가 스크롤 영역을 지나가는 구간을 진행도로 쓰는 타임라인."],
      ["애니메이션 범위", "animation-range", "타임라인의 어느 구간(entry·exit·contain·cover)에서 재생할지 정하는 속성."],
      ["스크럽", "Scrub", "진행도를 스크롤 위치에 직접 묶는 방식. 거꾸로 스크롤하면 되감깁니다."],
      ["패럴랙스", "Parallax", "층마다 다른 속도로 움직여 깊이감을 만드는 기법."],
    ],
    mount(api) {
      const SUP = typeof CSS !== "undefined" && CSS.supports && CSS.supports("animation-timeline: scroll()");
      const root = M.el("div", { class: "dom-stage webl-fill" });
      const wrap = M.el("div", { class: "sd-wrap" + (SUP ? " sd-live" : "") });
      const vp = M.el("div", { class: "sd-vp", tabindex: "0", "aria-label": "스크롤 데모 화면" });
      const track = M.el("div", { class: "sd-track" }), thumb = M.el("i");
      track.append(thumb);
      const gbox = M.el("div", { class: "sd-graph" });
      wrap.append(vp, track, gbox); root.append(wrap); api.stage.append(root);
      const cv = M.canvas(gbox, 260);
      const ctl = ctlBox(api);

      const RANGES = [["cover", "cover 0% cover 100%"], ["contain", "contain 0% contain 100%"], ["entry", "entry 0% entry 100%"], ["exit", "exit 0% exit 100%"]];
      let step = 0, rng = 0, auto = true, parK = 1, th = 0.5, lastUser = -1e9;
      let bar, cards = [], pick = null, layers = [], hero = null, scrub = null, trig = null, io = null, readout = null;

      const user = () => (lastUser = performance.now());
      ["wheel", "pointerdown", "touchstart", "keydown"].forEach((ev) => vp.addEventListener(ev, user, { passive: true }));

      function sizes() {
        const narrow = root.clientWidth < 560;
        wrap.classList.toggle("narrow", narrow);
        // 뷰포트 고정 레이아웃이면 무대 높이를 그대로 씀
        const fixed = matchMedia("(min-width: 1241px) and (min-height: 640px)").matches;
        const RH = root.clientHeight - 10;
        const H = fixed && !narrow ? M.clamp(RH, 220, 320) : narrow ? 210 : 280;
        const want = H + "px";
        if (vp.style.height !== want) { vp.style.height = want; if (vp.childElementCount) build(); }
        cv.style.height = (narrow ? 200 : fixed ? M.clamp(RH, 220, 420) : H) + "px";
        track.style.height = narrow ? "" : H + "px";
      }
      const para = () => M.el("div", { class: "sd-para" }, M.el("i"), M.el("i"), M.el("i"));
      const spacer = (h) => M.el("div", { class: "sd-space", style: `height:${h}px` });
      const cardEl = (label, extra = "") => {
        const fill = M.el("i", { class: "sd-fill" }), pct = M.el("em", {}, "0%");
        const el = M.el("div", { class: "sd-card " + extra }, M.el("b", {}, label), pct, M.el("div", { class: "sd-meter" }, fill));
        return { el, fill, pct };
      };

      function build() {
        if (io) { io.disconnect(); io = null; }
        vp.innerHTML = ""; vp.scrollTop = 0;
        cards = []; pick = null; layers = []; hero = scrub = trig = null;
        bar = M.el("i", { class: "sd-bar" });
        vp.append(M.el("div", { class: "sd-sticky" }, bar), M.el("p", { class: "sd-hint" }, "↓ 스크롤해 보세요"));
        const H = parseFloat(vp.style.height);
        if (step === 0) { for (let i = 0; i < 7; i++) vp.append(para()); return; }
        vp.append(spacer(step >= 3 ? H * 0.9 : H * 0.55));
        if (step <= 2) {
          for (let i = 0; i < 5; i++) {
            const c = cardEl(i === 2 ? "카드 3 · 관찰 대상" : `카드 ${i + 1}`, i === 2 ? "pick" : "");
            c.fill.style.animationRange = RANGES[step === 1 ? 0 : rng][1];
            vp.append(c.el); cards.push(c);
          }
          pick = cards[2];
        } else if (step === 3) {
          hero = M.el("div", { class: "sd-hero" });
          const L = [["far", -40, "먼 층"], ["mid", -14, "중간 층"], ["near", 30, "가까운 층"]];
          layers = L.map(([k, d, name]) => {
            const el = M.el("div", { class: "sd-layer sd-" + k }, M.el("span", {}, name));
            el.dataset.d = d; hero.append(el); return el;
          });
          vp.append(hero);
          applyPar();
        } else {
          const row = M.el("div", { class: "sd-pair" });
          scrub = cardEl("스크럽", "scrub"); trig = cardEl("트리거", "sd-trig");
          row.append(scrub.el, trig.el); vp.append(row);
          io = new IntersectionObserver(([en]) => trig.el.classList.toggle("sd-on", en.isIntersecting), { root: vp, threshold: th });
          io.observe(trig.el);
        }
        vp.append(spacer(step >= 3 ? H * 0.9 : H * 0.55));
      }
      function applyPar() {
        layers.forEach((el) => {
          const d = +el.dataset.d * parK;
          el.style.setProperty("--sd-from", d + "px"); el.style.setProperty("--sd-to", -d + "px");
        });
      }
      // 스크롤 위치(px) 기준 구간 [시작, 끝]
      function range(el, kind) {
        const top = el.offsetTop, hc = el.offsetHeight, H = vp.clientHeight;
        return { cover: [top - H, top + hc], contain: [top + hc - H, top], entry: [top - H, top + hc - H], exit: [top, top + hc] }[kind];
      }
      const prog = (S, [a, b]) => (b === a ? (S >= b ? 1 : 0) : M.clamp((S - a) / (b - a), 0, 1));

      const CODE = [
        ".progress {\n  position: sticky; top: 0;\n  transform-origin: left;\n  animation: grow linear both;\n  animation-timeline: scroll(nearest block);\n}\n@keyframes grow { from { transform: scaleX(0); } }",
        ".card {\n  animation: fill linear both;\n  animation-timeline: view();   /* 이 요소가 지나가는 구간 */\n}\n@keyframes fill {\n  from { --p: 0%; } to { --p: 100%; }\n}",
        ".card {\n  animation: reveal linear both;\n  animation-timeline: view();\n  animation-range: entry 0% entry 100%;\n  /* cover | contain | entry | exit */\n}",
        ".hero { view-timeline: --hero block; }\n.layer {\n  animation: drift linear both;\n  animation-timeline: --hero;\n}\n.far  { --d: -40px; }  /* 반대로 → 느려 보임 */\n.near { --d:  30px; }  /* 같은 쪽 → 빨라 보임 */\n@keyframes drift {\n  from { translate: 0 var(--d); }\n  to   { translate: 0 calc(var(--d) * -1); }\n}",
        "/* 스크럽: 스크롤에 묶임 */\n.scrub { animation: fill linear both; animation-timeline: view(); }\n\n/* 트리거: 문턱을 넘으면 시간으로 재생 */\nnew IntersectionObserver(([e]) => {\n  el.classList.toggle('in', e.isIntersecting);\n}, { threshold: 0.5 }).observe(el);\n.trigger.in { transition: transform .6s ease-out; }",
      ];
      const HL = [[[3, 4]], [[1, 2]], [[3, 4]], [[0, 3]], "all"];

      function controls() {
        ctl.innerHTML = "";
        M.check(ctl, { id: "sd-auto", label: "자동 스크롤", checked: auto, onChange: (v) => (auto = v) });
        if (step === 2) M.chips(ctl, { title: "animation-range", items: RANGES.map((r) => r[0]), value: rng, onPick: (i) => {
          rng = i; cards.forEach((c) => (c.fill.style.animationRange = RANGES[i][1]));
          api.code(CODE[2].replace("entry 0% entry 100%", RANGES[i][1]), [[3, 3]], "CSS");
        } });
        if (step === 3) M.slider(ctl, { id: "sd-par", label: "패럴랙스 세기", min: 0, max: 150, value: Math.round(parK * 100), unit: "%", onInput: (v) => { parK = v / 100; applyPar(); } });
        if (step === 4) M.slider(ctl, { id: "sd-th", label: "트리거 문턱 (보이는 비율)", min: 10, max: 100, step: 5, value: Math.round(th * 100), unit: "%", onInput: (v) => {
          th = v / 100; if (io) { io.disconnect(); io = new IntersectionObserver(([en]) => trig.el.classList.toggle("sd-on", en.isIntersecting), { root: vp, threshold: th }); io.observe(trig.el); }
        } });
        readout = M.readout(ctl);
      }

      const ro = new ResizeObserver(() => sizes());
      ro.observe(root);

      return {
        setStep(s) {
          step = s; rng = 2; parK = 1; th = 0.5; lastUser = -1e9;
          sizes(); controls(); build();
          api.code(CODE[s], HL[s], s === 4 ? "CSS · JS" : "CSS");
        },
        frame(time) {
          const H = vp.clientHeight, max = Math.max(1, vp.scrollHeight - H);
          if (auto && performance.now() - lastUser > 2500) {
            const { p, back } = M.pingpong(time, 5200, 900);
            const e = M.ease.inOut(p);
            vp.scrollTop = (back ? 1 - e : e) * max;
          }
          const S = vp.scrollTop, f = M.clamp(S / max, 0, 1);
          const thH = Math.max(18, track.clientHeight * (H / vp.scrollHeight));
          thumb.style.height = thH + "px"; thumb.style.transform = `translateY(${f * (track.clientHeight - thH)}px)`;
          if (!SUP) bar.style.transform = `scaleX(${f})`;
          const kind = step === 1 ? "cover" : RANGES[rng][0];
          cards.forEach((c) => {
            const pr = prog(S, range(c.el, kind));
            c.pct.textContent = Math.round(pr * 100) + "%";
            if (!SUP) c.fill.style.transform = `scaleX(${pr})`;
          });
          let heroR = null, scrubR = null, trigR = null;
          if (hero) {
            heroR = range(hero, "cover");
            const hp = prog(S, heroR);
            if (!SUP) layers.forEach((el) => { const d = +el.dataset.d * parK; el.style.transform = `translateY(${M.lerp(d, -d, hp)}px)`; });
          }
          if (scrub) {
            scrubR = range(scrub.el, "cover");
            const sp = prog(S, scrubR);
            scrub.pct.textContent = Math.round(sp * 100) + "%";
            if (!SUP) scrub.fill.style.transform = `scaleX(${sp})`;
            const top = trig.el.offsetTop, hc = trig.el.offsetHeight;
            const need = Math.min(hc, H) * th;
            trigR = [top + need - H, top + hc - need];
            trig.pct.textContent = trig.el.classList.contains("sd-on") ? "재생됨" : "대기";
          }
          readout.textContent = `scrollTop ${Math.round(S)} / ${Math.round(max)}px → 진행도 ${Math.round(f * 100)}%`;

          // 그래프
          const { x, w, h } = M.fit(cv), c = M.col();
          const b = { x: 46, y: 26, w: w - 60, h: h - 56 };
          const at = (t) => t * max;
          let curves = [], o = { t: f, xl: "스크롤 위치 →", yl: "진행도" };
          const late = []; // 그래프 바탕 위에 올릴 글자
          M.text(x, ["scroll() 진행도", "카드 3의 view() 진행도", `카드 3 · animation-range: ${kind}`, "층별 이동 거리", "스크럽(실선) · 트리거(점선)"][step], b.x, 14, { size: 11.5, weight: 700, color: c.ink });
          if (step === 0) curves = [{ f: (t) => t, color: c.a }];
          else if (step <= 2 && pick) {
            const R = range(pick.el, kind);
            curves = [{ f: (t) => prog(at(t), R), color: c.b }];
            if (step === 2) {
              const C = range(pick.el, "cover"), cn = range(pick.el, "contain");
              const X = (s) => b.x + M.clamp(s / max, 0, 1) * b.w;
              const bands = [["entry", C[0], cn[0], c.a], ["contain", cn[0], cn[1], c.c], ["exit", cn[1], C[1], c.key]];
              x.save();
              bands.forEach(([n, s0, s1, col]) => {
                x.fillStyle = M.alpha(col, n === kind ? 0.22 : 0.08); x.fillRect(X(s0), b.y, X(s1) - X(s0), b.h);
                if (X(s1) - X(s0) > 30) late.push(() => M.text(x, n, (X(s0) + X(s1)) / 2, b.y + b.h - 8, { size: 11, mono: true, align: "center", weight: n === kind ? 700 : 500, color: n === kind ? c.ink : c.muted }));
              });
              x.restore();
            } else {
              const X = (s) => b.x + M.clamp(s / max, 0, 1) * b.w;
              R.forEach((s, i) => late.push(() => { M.line(x, X(s), b.y, X(s), b.y + b.h, c.ink, 1, [4, 3]); M.text(x, i ? "위쪽이 나감 100%" : "아래쪽이 들어옴 0%", X(s) + (i ? -5 : 5), b.y + b.h - 8, { size: 11, weight: 600, align: i ? "right" : "left", color: c.ink }); }));
            }
          } else if (step === 3 && heroR) {
            o = { ...o, ymin: 0, ymax: 1, top: "+60px", bottom: "−60px", yl: "translateY" };
            const cols = [c.muted, c.c, c.b];
            curves = layers.map((el, i) => { const d = +el.dataset.d * parK; return { f: (t) => (M.lerp(d, -d, prog(at(t), heroR)) + 60) / 120, color: cols[i] }; });
          } else if (step === 4 && scrubR) {
            curves = [{ f: (t) => prog(at(t), scrubR), color: c.a }, { f: (t) => (at(t) >= trigR[0] && at(t) <= trigR[1] ? 1 : 0), color: c.b, dash: [5, 4], noDot: true }];
          }
          if (step >= 1 && step !== 3) {
            const X = (s) => b.x + M.clamp(s / max, 0, 1) * b.w;
            x.save(); x.fillStyle = M.alpha(c.ink, 0.09); x.fillRect(X(S), b.y, X(S + H) - X(S), b.h); x.restore();
          }
          M.graph(x, b, curves, o);
          late.forEach((fn) => fn());
          if (step === 3) ["먼 층", "중간 층", "가까운 층"].forEach((n, i) => M.text(x, n, b.x + b.w - 4, b.y + 14 + i * 15, { size: 11, weight: 600, align: "right", color: [c.muted, c.c, c.b][i] }));
        },
        destroy() { ro.disconnect(); if (io) io.disconnect(); },
      };
    },
  });

  /* ===== 6-6 SVG 선 그리기와 패스 ===== */
  LESSONS.push({
    id: "svg-draw", ch: 5, order: 6,
    title: "SVG 선 그리기와 패스",
    lede: "아이콘과 일러스트의 선이 저절로 그려지는 효과는 점선 속성 두 개로 만듭니다. 패스 명령을 읽는 법부터 선 그리기, 모핑, 아이콘 애니메이션까지 실제 SVG로 보며, 레슨을 마치면 '선 그리기' 효과를 CSS 몇 줄로 직접 만들 수 있습니다.",
    key: "선 그리기는 pathLength=\"1\"과 dasharray·dashoffset으로, 모핑은 명령과 점 개수가 같은 두 패스 사이에서만 합니다.",
    steps: [
      ["패스 명령", "<code>&lt;path d&gt;</code> 속성은 펜을 어떻게 움직일지 적은 목록입니다. <b>M</b> 펜을 들어 옮기기, <b>L</b> 직선, <b>Q</b> 조절점 하나짜리 곡선, <b>C</b> 조절점 둘짜리 곡선, <b>Z</b> 시작점으로 닫기. 노란 펜이 지나는 동안 오른쪽 목록에서 그 명령이 초록으로 켜집니다. 빨간 네모가 곡선을 끌어당기는 조절점입니다."],
      ["점선 두 속성", "<code>stroke-dasharray</code>는 '선 길이, 빈칸 길이' 무늬이고, <code>stroke-dashoffset</code>은 그 무늬를 패스를 따라 미는 거리입니다. 오프셋을 계속 바꾸면 개미 행렬처럼 흐릅니다. 아래 띠는 패스를 곧게 펴서 무늬만 본 모습입니다. 슬라이더로 대시와 빈칸 길이를 바꿔 보세요."],
      ["선 그리기", "대시 하나를 <b>패스 전체 길이 L</b>(여기선 약 704)만큼, 빈칸도 L만큼 주면 무늬 한 칸이 패스를 다 덮습니다. 이제 오프셋을 L에서 0으로 줄이면 빈칸이 밀려나며 선이 드러나 <b>그려지는 것처럼</b> 보입니다. 아래 띠의 파란 막대가 드러난 선의 길이입니다. L은 <code>path.getTotalLength()</code>로 잽니다."],
      ["pathLength", "<code>pathLength=\"1\"</code>을 주면 실제 길이와 상관없이 패스 길이를 1로 칩니다. 길이 704인 언덕과 125인 원이 dasharray 1, dashoffset 1 → 0 한 줄로 <b>같이 시작해 같이 끝납니다</b>. 아래 띠의 파랑과 초록 막대가 똑같이 자라는 걸 보세요. 자바스크립트로 길이를 잴 필요가 없어집니다."],
      ["패스 모핑", "두 패스의 숫자를 하나씩 보간(사이값 계산)하면 모양이 변합니다. 이것이 <b>모핑</b>입니다. 단, <b>명령 순서와 점 개수가 같아야</b> 짝이 맞습니다. 점 4개짜리 원에서 점 4개짜리 별로는 매끄럽게 변하지만, 점 6개짜리 육각형으로는 보간이 안 돼 50%에서 뚝 바뀝니다. 칩으로 비교해 보세요."],
      ["아이콘 애니메이션", "실무에선 이 기법들을 섞어 씁니다. 체크는 원을 먼저 그리고 체크 표시를 <b>시차를 두고</b> 그리며, 메뉴 ↔ 닫기는 선 세 개짜리 두 패스를 모핑하고, 로딩은 짧은 대시를 회전시킵니다. 아이콘 전환은 200~400ms면 충분합니다."],
    ],
    terms: [
      ["패스 데이터", "Path data · d", "M·L·Q·C·Z 같은 명령과 좌표로 모양을 적은 문자열. 대문자는 절대, 소문자는 상대 좌표."],
      ["베지어 곡선", "Bézier curve", "끝점과 조절점으로 정하는 곡선. Q는 조절점 1개(2차), C는 2개(3차)."],
      ["점선 배열 · 오프셋", "stroke-dasharray · stroke-dashoffset", "선을 대시와 빈칸으로 나누는 무늬와, 그 무늬의 시작 위치."],
      ["패스 길이 정규화", "pathLength", "패스 길이를 임의의 값(보통 1)으로 간주하게 하는 속성."],
      ["모핑", "Morphing · Shape tweening", "같은 구조의 두 모양 사이를 점마다 보간해 변형하는 애니메이션."],
    ],
    mount(api) {
      const root = M.el("div", { class: "dom-stage webl-fill" });
      const wrap = M.el("div", { class: "svgd-wrap" });
      const box = M.el("div", { class: "svgd-box" });
      const svg = sv("svg", { viewBox: "0 0 320 190", class: "svgd-svg", role: "img", "aria-label": "SVG 패스 데모" });
      const tape = sv("svg", { viewBox: "0 0 320 44", class: "svgd-tape" });
      const panel = M.el("div", { class: "svgd-panel" });
      box.append(svg, tape); wrap.append(box, panel); root.append(wrap); api.stage.append(root);
      const ctl = ctlBox(api);

      const SEG = [
        ["M", "30 160", "펜을 들어 시작점으로", [[30, 160, -10, 14]], []],
        ["L", "30 80", "직선", [[30, 80, -10, 4]], []],
        ["Q", "90 10 160 80", "2차 곡선 · 조절점 1", [[160, 80, 4, 22]], [[90, 10]]],
        ["C", "200 120 250 40 290 90", "3차 곡선 · 조절점 2", [[290, 90, 10, 4]], [[200, 120], [250, 40]]],
        ["L", "290 160", "직선", [[290, 160, 10, 14]], []],
        ["Z", "", "시작점으로 닫기", [], []],
      ];
      const D = SEG.map(([c, a]) => (a ? c + " " + a : c)).join(" ");
      const CIRC_A = [160, 35, 193.1, 35, 220, 61.9, 220, 95, 220, 128.1, 193.1, 155, 160, 155, 126.9, 155, 100, 128.1, 100, 95, 100, 61.9, 126.9, 35, 160, 35];
      const STAR_B = [160, 22, 171, 84, 171, 84, 233, 95, 171, 106, 171, 106, 160, 168, 149, 106, 149, 106, 87, 95, 149, 84, 149, 84, 160, 22];
      const HEX = "M 160 30 L 216 62 L 216 128 L 160 160 L 104 128 L 104 62 Z";
      const cubicD = (n) => { let s = `M ${n[0].toFixed(1)} ${n[1].toFixed(1)}`; for (let i = 2; i < n.length; i += 6) s += ` C ${n.slice(i, i + 6).map((v) => v.toFixed(1)).join(" ")}`; return s + " Z"; };
      const MENU = [[140, 80, 180, 80], [140, 95, 180, 95], [140, 110, 180, 110]];
      const CLOSE = [[146, 81, 174, 109], [160, 95, 160, 95], [146, 109, 174, 81]];
      const linesD = (L) => L.map(([a, b, c, d]) => `M ${a.toFixed(1)} ${b.toFixed(1)} L ${c.toFixed(1)} ${d.toFixed(1)}`).join(" ");

      // 장면 요소
      const gPath = sv("g"), gGuide = sv("g", { class: "svgd-guide" }), gMorph = sv("g"), gIcons = sv("g");
      const base = sv("path", { d: D, class: "svgd-base" });
      const main = sv("path", { d: D, class: "svgd-main" });
      const trace = sv("path", { d: D, class: "svgd-trace" });
      const circ = sv("circle", { cx: 262, cy: 40, r: 20, class: "svgd-main alt" });
      const pen = sv("circle", { r: 5, class: "svgd-pen" });
      gPath.append(base, main, trace, circ, pen);
      SEG.forEach(([cmd, , , anchors, ctrls], i) => {
        const prev = i ? SEG.slice(0, i).reverse().find((s) => s[3].length)[3][0] : null;
        if (ctrls.length) {
          const end = anchors[0];
          gGuide.append(sv("line", { x1: prev[0], y1: prev[1], x2: ctrls[0][0], y2: ctrls[0][1] }));
          gGuide.append(sv("line", { x1: end[0], y1: end[1], x2: ctrls[ctrls.length - 1][0], y2: ctrls[ctrls.length - 1][1] }));
          ctrls.forEach(([cx, cy]) => gGuide.append(sv("rect", { x: cx - 4, y: cy - 4, width: 8, height: 8, class: "ctrl" })));
        }
        anchors.forEach(([ax, ay, lx, ly]) => {
          gGuide.append(sv("circle", { cx: ax, cy: ay, r: 4, class: "anchor" }));
          const lab = sv("text", { x: ax + lx, y: ay + ly, "text-anchor": lx < 0 ? "end" : lx > 6 ? "start" : "middle" }); lab.textContent = cmd; gGuide.append(lab);
        });
      });
      const mPath = sv("path", { class: "svgd-morph" }), mPts = sv("g", { class: "svgd-pts" });
      gMorph.append(mPath, mPts);
      // 아이콘 세 개
      const tile = (cx, label) => { gIcons.append(sv("rect", { x: cx - 42, y: 48, width: 84, height: 94, rx: 12, class: "svgd-tile" })); const t = sv("text", { x: cx, y: 166, "text-anchor": "middle", class: "svgd-cap" }); t.textContent = label; gIcons.append(t); };
      tile(60, "체크 그리기"); tile(160, "메뉴 ↔ 닫기"); tile(260, "로딩");
      const ckC = sv("circle", { cx: 60, cy: 95, r: 26, pathLength: 1, class: "svgd-icon", transform: "rotate(-90 60 95)" });
      const ckT = sv("path", { d: "M 47 96 L 56 105 L 74 86", pathLength: 1, class: "svgd-icon" });
      const menu = sv("path", { d: linesD(MENU), class: "svgd-icon" });
      const spin = sv("circle", { cx: 260, cy: 95, r: 22, pathLength: 1, class: "svgd-icon" });
      gIcons.append(ckC, ckT, menu, spin);
      svg.append(gPath, gGuide, gMorph, gIcons);
      const ghostT = sv("g"); tape.append(ghostT);

      const L = main.getTotalLength(), LC = circ.getTotalLength();
      const cum = []; { let acc = ""; SEG.forEach(([c, a]) => { acc += (acc ? " " : "") + (a ? c + " " + a : c); const t = sv("path", { d: acc }); svg.append(t); cum.push(t.getTotalLength()); t.remove(); }); }

      let step = 0, auto = true, manual = 0.5, dash = 24, gap = 12, morphSame = true;
      let rows = [], live = {};
      const show = (el, on) => el.setAttribute("display", on ? "inline" : "none");

      function setPanel(title, items) {
        panel.innerHTML = ""; rows = []; live = {};
        panel.append(M.el("div", { class: "svgd-ph" }, title));
        items.forEach(([k, v, note, id]) => {
          const val = M.el("code", {}, v);
          const row = M.el("div", { class: "svgd-row" }, M.el("b", {}, k), val, note ? M.el("small", {}, note) : null);
          panel.append(row); rows.push(row);
          if (id) live[id] = val;
        });
      }

      const CODE = [
        `<path d="M 30 160\n         L 30 80\n         Q 90 10 160 80\n         C 200 120 250 40 290 90\n         L 290 160\n         Z" />`,
        ".path {\n  stroke-dasharray: 24 12;   /* 선 24, 빈칸 12 */\n  animation: march 1s linear infinite;\n}\n@keyframes march {\n  to { stroke-dashoffset: -36; }   /* 무늬 한 칸만큼 */\n}",
        "const L = path.getTotalLength();\npath.style.strokeDasharray = L;   // 선 L, 빈칸 L\npath.style.strokeDashoffset = L;  // 전부 빈칸 → 안 보임\npath.animate(\n  [{ strokeDashoffset: L }, { strokeDashoffset: 0 }],\n  { duration: 1600, easing: 'ease-in-out', fill: 'forwards' });",
        "<path d=\"…\" pathLength=\"1\" class=\"draw\" />\n<circle r=\"20\" pathLength=\"1\" class=\"draw\" />\n\n.draw {\n  stroke-dasharray: 1;\n  stroke-dashoffset: 1;\n  animation: draw 1.6s ease-in-out forwards;\n}\n@keyframes draw { to { stroke-dashoffset: 0; } }",
        "/* 같은 구조: M + C 네 번 + Z  ↔  M + C 네 번 + Z */\n.blob { transition: d .6s cubic-bezier(.65, 0, .35, 1); }\n.blob.star {\n  d: path('M 160 22 C 171 84 171 84 233 95 C …');\n}\n/* 구조가 다르면 보간 불가 → 중간에 뚝 바뀜.\n   flubber 같은 도구로 점 개수를 맞춰 줍니다. */",
        "/* 체크: 원 먼저, 체크 표시는 시차를 두고 */\n.ring { stroke-dasharray: 1; animation: draw .5s ease-out both; }\n.tick { stroke-dasharray: 1; animation: draw .35s .35s ease-out both; }\n\n/* 메뉴 ↔ 닫기: 같은 구조의 두 d 를 모핑 */\n.menu.open { d: path('M 6 6 L 18 18 M 12 12 L 12 12 M 6 18 L 18 6'); }\n\n/* 로딩: 짧은 대시를 회전 */\n.spin { stroke-dasharray: .25 .75; animation: rot 1s linear infinite; }",
      ];
      const HL = [[[0, 5]], [[1, 1], [5, 5]], [[0, 2]], [[0, 1], [4, 5]], [[0, 3]], "all"];

      function controls() {
        ctl.innerHTML = "";
        if (step === 1) {
          M.slider(ctl, { id: "svgd-dash", label: "대시 길이", min: 2, max: 120, value: dash, onInput: (v) => (dash = v) });
          M.slider(ctl, { id: "svgd-gap", label: "빈칸 길이", min: 0, max: 80, value: gap, onInput: (v) => (gap = v) });
          return;
        }
        let sl;
        const ck = M.check(ctl, { id: "svgd-auto", label: "자동 재생", checked: auto, onChange: (v) => (auto = v) });
        sl = M.slider(ctl, { id: "svgd-p", label: "진행도", min: 0, max: 100, value: Math.round(manual * 100), unit: "%", onInput: (v) => { manual = v / 100; auto = false; ck.set(false); } });
        live.slider = sl;
        if (step === 4) M.chips(ctl, { title: "두 모양의 구조", items: ["같음 (점 4 ↔ 4)", "다름 (점 4 ↔ 6)"], value: morphSame ? 0 : 1, onPick: (i) => { morphSame = i === 0; panelFor(); } });
      }
      function panelFor() {
        const s = step;
        if (s === 0) setPanel("d 속성 읽기", SEG.map(([c, a, n]) => [c, a || "—", n]));
        if (s === 1) setPanel("점선 무늬", [["stroke-dasharray", "", "선 · 빈칸", "da"], ["stroke-dashoffset", "", "무늬를 미는 거리", "do"], ["패스 길이 L", L.toFixed(1), "getTotalLength()"]]);
        if (s === 2) setPanel("선 그리기", [["L", L.toFixed(1), "getTotalLength()"], ["stroke-dasharray", `${L.toFixed(0)} ${L.toFixed(0)}`, "선 L · 빈칸 L"], ["stroke-dashoffset", "", "L → 0", "do"]]);
        if (s === 3) setPanel("pathLength=\"1\"", [["언덕 실제 길이", L.toFixed(1), "→ 1로 간주"], ["원 실제 길이", LC.toFixed(1), "→ 1로 간주"], ["stroke-dashoffset", "", "1 → 0 (둘 다)", "do"]]);
        if (s === 4) setPanel("모핑 조건", morphSame
          ? [["모양 A", "M C C C C Z", "점 4개"], ["모양 B", "M C C C C Z", "점 4개"], ["보간", "", "숫자 26개를 하나씩", "do"]]
          : [["모양 A", "M C C C C Z", "점 4개"], ["모양 B", "M L L L L L Z", "점 6개"], ["보간", "", "짝이 안 맞음 → 50%에서 교체", "do"]]);
        if (s === 5) setPanel("아이콘 세 개", [["체크", "dashoffset", "원 → 체크 표시 시차"], ["메뉴 ↔ 닫기", "d 모핑", "선 3개 ↔ 선 3개"], ["로딩", "dasharray .25 .75", "회전 + 길이 변화"]]);
      }

      return {
        setStep(s) {
          step = s; auto = true; manual = 0.5; morphSame = true; dash = 24; gap = 12;
          show(gPath, s <= 3); show(gGuide, s === 0); show(gMorph, s === 4); show(gIcons, s === 5);
          show(tape, s >= 1 && s <= 3); show(base, s <= 3); show(trace, s === 0); show(pen, s === 0); show(circ, s === 3);
          main.removeAttribute("pathLength"); main.style.cssText = "";
          if (s === 3) main.setAttribute("pathLength", "1");
          main.classList.toggle("dim", s === 0);
          controls(); panelFor();
          api.code(CODE[s], HL[s], s === 2 ? "JavaScript" : s === 0 || s === 3 ? "SVG · CSS" : "CSS");
        },
        frame(time) {
          const p = auto ? M.cycle(time, 2000, 900) : manual;
          if (auto && live.slider && step !== 1) live.slider.set(Math.round(p * 100));
          const e = M.ease.inOut(p);
          const T = 300 / (step === 3 ? 1 : L); // 띠: 길이 → 픽셀
          ghostT.innerHTML = "";
          const bandY = 13, bandH = 10;
          const tl = (str) => { const t = sv("text", { x: 10, y: 41, class: "svgd-tl" }); t.textContent = str; ghostT.append(t); };
          const tapeRect = (x0, x1, cls) => { const a = Math.max(10, x0), b = Math.min(310, x1); if (b > a) ghostT.append(sv("rect", { x: a, y: bandY, width: b - a, height: bandH, rx: 2, class: cls })); };
          if (step === 0) {
            const len = p * L;
            const pt = main.getPointAtLength(len);
            pen.setAttribute("cx", pt.x); pen.setAttribute("cy", pt.y);
            trace.style.strokeDasharray = `${len} ${L}`;
            const k = Math.max(1, cum.findIndex((c) => c >= len - 0.01));
            [...panel.querySelectorAll(".svgd-row")].forEach((r, i) => r.classList.toggle("on", i === k || (k === 1 && i === 0 && len < 1)));
          } else if (step === 1) {
            const per = dash + gap, off = -((time * 0.03) % per);
            main.style.strokeDasharray = `${dash} ${gap}`; main.style.strokeDashoffset = off;
            live.da.textContent = `${dash} ${gap}`; live.do.textContent = off.toFixed(1);
            ghostT.append(sv("rect", { x: 10, y: bandY - 3, width: 300, height: bandH + 6, rx: 4, class: "svgd-win" }));
            for (let s0 = off; s0 < L; s0 += per) tapeRect(10 + s0 * T, 10 + (s0 + dash) * T, "svgd-dash");
            tl(`곧게 편 패스 · 대시 ${dash} + 빈칸 ${gap} 반복`);
          } else if (step === 2) {
            const off = L * (1 - e);
            main.style.strokeDasharray = `${L} ${L}`; main.style.strokeDashoffset = off;
            live.do.textContent = off.toFixed(1);
            ghostT.append(sv("rect", { x: 10, y: bandY - 3, width: 300, height: bandH + 6, rx: 4, class: "svgd-win" }));
            tapeRect(10 - off * T, 10 + (L - off) * T, "svgd-dash");
            tl(`dashoffset ${off.toFixed(0)} · 빈칸이 빠지는 만큼 선이 드러남`);
          } else if (step === 3) {
            const off = 1 - e;
            main.style.strokeDasharray = "1"; main.style.strokeDashoffset = off;
            circ.style.strokeDasharray = "1"; circ.style.strokeDashoffset = off;
            live.do.textContent = off.toFixed(2);
            ghostT.append(sv("rect", { x: 10, y: 4, width: 300, height: 26, rx: 4, class: "svgd-win" }));
            ghostT.append(sv("rect", { x: 10, y: 7, width: 300 * e, height: 9, rx: 2, class: "svgd-dash" }));
            ghostT.append(sv("rect", { x: 10, y: 18, width: 300 * e, height: 9, rx: 2, class: "svgd-dash alt" }));
            tl(`언덕(파랑)과 원(초록) 모두 ${Math.round(e * 100)}% 그려짐`);
          } else if (step === 4) {
            let d, pts;
            if (morphSame) {
              const n = CIRC_A.map((a, i) => M.lerp(a, STAR_B[i], e));
              d = cubicD(n); pts = [0, 6, 12, 18].map((i) => [n[i], n[i + 1]]);
              live.do.textContent = Math.round(e * 100) + "%";
            } else {
              d = p < 0.5 ? cubicD(CIRC_A) : HEX;
              pts = p < 0.5 ? [0, 6, 12, 18].map((i) => [CIRC_A[i], CIRC_A[i + 1]]) : [[160, 30], [216, 62], [216, 128], [160, 160], [104, 128], [104, 62]];
              live.do.textContent = p < 0.5 ? "A" : "B";
            }
            mPath.setAttribute("d", d);
            mPts.innerHTML = "";
            pts.forEach(([px, py]) => mPts.append(sv("circle", { cx: px, cy: py, r: 3.5 })));
          } else if (step === 5) {
            const ring = M.ease.out(M.clamp(p / 0.55, 0, 1)), tick = M.ease.out(M.clamp((p - 0.45) / 0.4, 0, 1));
            ckC.style.strokeDasharray = "1"; ckC.style.strokeDashoffset = 1 - ring;
            ckT.style.strokeDasharray = "1"; ckT.style.strokeDashoffset = 1 - tick;
            const { p: mp, back } = M.pingpong(time, 600, 900), me = M.ease.inOut(mp), k = back ? 1 - me : me;
            menu.setAttribute("d", linesD(MENU.map((l, i) => l.map((v, j) => M.lerp(v, CLOSE[i][j], k)))));
            const sp = (time % 1400) / 1400;
            spin.style.strokeDasharray = `${0.12 + 0.18 * Math.sin(sp * Math.PI)} 1`;
            spin.setAttribute("transform", `rotate(${sp * 360 - 90} 260 95)`);
          }
        },
      };
    },
  });
})();
