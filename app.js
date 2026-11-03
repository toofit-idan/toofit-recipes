(function () {
  const recipes = window.RECIPES || [];
  const MEAL_TYPES = ["ארוחת בוקר", "צהריים", "ערב", "נשנושים", "מתוקים", "ארוחת שישי", "רטבים וממרחים"];
  const PROTEINS = ["עוף", "בשר", "דגים", "צמחוני"];
  const SCALE = [
    "ממש ריקים, גוועים ברעב - לא אכלנו כמה שעות",
    "רעבים מאוד - חייבים לאכול",
    "רעבים, הבטן מקרקרת ומאותתת על הצורך שלנו באוכל",
    "מרגישים רעב - זה הזמן לאכול",
    "הרעב התעורר - אפשר עוד לא לאכול, אבל צריך בקרוב",
    "מאוזנים - כבר לא ממש רעבים, אפשר לנשנש",
    "מסופקים - כבר לא רעבים",
    "לגמרי מסופקים - הגענו לתחושת השובע האמיתי שלנו",
    "מלאים - אכלנו מעל השובע האמיתי שלנו",
    "מפוצצים - אכלנו מעל הצורך, מרגישים כובד בגוף",
    "ממש מפוצצים - מרגישים מועקה, חייבים לנוח"
  ];
  const STORAGE_KEY = "toofit-week";
  const LOGO_ICON = "assets/logo-icon.svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = { query: "", meal: null, protein: null, maxCal: null };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // localStorage can throw (private mode, blocked storage) - the page must still work without it.
  function loadWeek() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
  }
  let week = loadWeek().filter((id) => recipes.some((r) => r.id === id));
  function saveWeek() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(week)); } catch (e) { /* stays in memory only */ }
  }

  function imageHtml(r, cls) {
    if (r.image) return `<img src="${esc(r.image)}" alt="${esc(r.name)}" loading="lazy"${cls ? ` class="${cls}"` : ""}>`;
    return `<div class="placeholder"><img src="${LOGO_ICON}" alt=""></div>`;
  }
  function kcalText(r) {
    return r.nutrition.calories == null ? "ללא נתון" : `${r.nutrition.calories} קק"ל`;
  }

  // Scroll reveal
  const revealer = "IntersectionObserver" in window && !reduceMotion
    ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.remove("pre");
        e.target.classList.add("in");
        revealer.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" })
    : null;
  function observe(el) {
    if (revealer) revealer.observe(el); else { el.classList.remove("pre"); el.classList.add("in"); }
  }

  function renderChips(el, values, key) {
    el.innerHTML = values.map((v) => `<button type="button" class="chip" aria-pressed="false" data-value="${esc(v)}">${esc(v)}</button>`).join("");
    el.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const v = btn.dataset.value;
      state[key] = state[key] === v ? null : v;
      el.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === state[key])));
      renderGrid();
    });
  }

  function matches(r) {
    if (state.meal && !r.mealTypes.includes(state.meal)) return false;
    if (state.protein && r.protein !== state.protein) return false;
    if (state.maxCal && (r.nutrition.calories == null || r.nutrition.calories > state.maxCal)) return false;
    if (state.query) {
      const hay = [r.name, r.description, r.protein, r.taste, ...r.mealTypes, ...r.ingredients].join(" ");
      const words = state.query.trim().split(/\s+/);
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  }

  function renderGrid() {
    const list = recipes.filter(matches);
    $("grid").innerHTML = list.map((r) => `
      <article class="card pre${week.includes(r.id) ? " is-saved" : ""}" data-id="${esc(r.id)}">
        <div class="card-img">
          ${imageHtml(r)}
          <span class="kcal-badge">${kcalText(r)}</span>
          <span class="saved-dot" title="שמור לשבוע">✓</span>
        </div>
        <div class="card-body">
          <div class="tags">${r.mealTypes.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
          <h3>${esc(r.name)}</h3>
          <p class="card-serving">${esc(r.servingLabel)}</p>
          <button type="button" class="pill pill-primary">יאללה, למתכון</button>
        </div>
      </article>`).join("");
    $("grid").querySelectorAll(".card").forEach((card, i) => {
      card.style.transitionDelay = `${(i % 2) * 70}ms`;
      observe(card);
    });
    $("empty").hidden = list.length > 0;
    $("resultCount").textContent = list.length === 1 ? "מתכון אחד" : list.length ? `${list.length} מתכונים` : "";
  }

  function renderRecipe(r) {
    const saved = week.includes(r.id);
    const n = r.nutrition;
    const num = (v) => (v == null ? "-" : `<span data-count="${v}">${v}</span>`);
    $("recipeBody").innerHTML = `
      <div class="recipe-hero"${r.image ? ` style="--hero-bg:url('${esc(r.image)}')"` : ""}>${imageHtml(r, "hero-img")}</div>
      <div class="sheet-inner">
        <div class="recipe-head">
          <div class="tags">${r.mealTypes.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
          <h2 id="recipeTitle">${esc(r.name)}</h2>
          <p class="desc">${esc(r.description)}</p>
        </div>
        <div class="actions">
          ${r.video ? `<a class="pill pill-primary" href="${esc(r.video)}" target="_blank" rel="noopener">לסרטון ההכנה</a>` : ""}
          <button type="button" class="pill pill-save" data-save="${esc(r.id)}" aria-pressed="${saved}">${saved ? "נשמר לשבוע ✓" : "שמירה לשבוע"}</button>
        </div>
        <section class="nutrition">
          <h3>ערכים תזונתיים</h3>
          <p class="per">הערכים ל-${esc(r.servingLabel)}</p>
          <div class="nutri-grid">
            <div class="main"><strong>${num(n.calories)}</strong><span>קלוריות</span></div>
            <div><strong>${num(n.protein)}</strong><span>חלבון (גרם)</span></div>
            <div><strong>${num(n.carbs)}</strong><span>פחמימה (גרם)</span></div>
            <div><strong>${num(n.fat)}</strong><span>שומן (גרם)</span></div>
          </div>
        </section>
        <section class="recipe-section">
          <h3>מצרכים</h3>
          ${r.servings ? `<p class="yield">יוצא: ${esc(r.servings)}</p>` : ""}
          <p class="check-hint">לוחצים על מצרך כדי לסמן שיש לכם אותו</p>
          <ul class="ingredients">${r.ingredients.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
        </section>
        <section class="recipe-section">
          <h3>אופן הכנה</h3>
          <ol class="method">${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        </section>
        ${r.tip ? `<section class="recipe-tip"><h3>טיפ</h3><p>${esc(r.tip)}</p></section>` : ""}
        <p class="source">מתוך ספר המתכונים, עמוד ${r.page}</p>
      </div>`;
  }

  function countUp(root) {
    if (reduceMotion) return;
    root.querySelectorAll("[data-count]").forEach((el) => {
      const target = Number(el.dataset.count);
      const decimals = String(el.dataset.count).includes(".") ? 1 : 0;
      const start = performance.now();
      const dur = 700;
      const step = (t) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function renderWeek(bump) {
    const list = week.map((id) => recipes.find((r) => r.id === id)).filter(Boolean);
    $("weekList").innerHTML = list.map((r) => `
      <li class="week-item" data-id="${esc(r.id)}">
        <div class="thumb">${imageHtml(r)}</div>
        <div><strong>${esc(r.name)}</strong><small>${kcalText(r)} · ${esc(r.servingLabel)}</small></div>
        <button type="button" class="remove" data-remove="${esc(r.id)}" aria-label="הסרה מהשבוע שלי">הסרה</button>
      </li>`).join("");
    $("weekEmpty").hidden = list.length > 0;
    const c = $("weekCount");
    c.textContent = list.length;
    if (bump) { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
  }

  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  async function flyToWeek(fromImg) {
    if (reduceMotion || !fromImg || !fromImg.getBoundingClientRect) return;
    const a = fromImg.getBoundingClientRect();
    const b = $("openWeek").getBoundingClientRect();
    const f = document.createElement("img");
    f.src = fromImg.src; f.className = "flyer"; f.alt = "";
    const size = 72;
    Object.assign(f.style, { width: size + "px", height: size + "px", left: a.left + a.width / 2 - size / 2 + "px", top: a.top + a.height / 2 - size / 2 + "px" });
    document.body.appendChild(f);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    await f.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1, borderRadius: "14px" },
      { transform: `translate(${dx * .5}px, ${dy * .5 - 60}px) scale(.7)`, opacity: 1, offset: .55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.2)`, opacity: .2, borderRadius: "50%" }
    ], { duration: 750, easing: "cubic-bezier(.5,0,.3,1)" }).finished.catch(() => {});
    f.remove();
  }

  function toggleSave(id, btn) {
    const adding = !week.includes(id);
    week = adding ? [...week, id] : week.filter((x) => x !== id);
    saveWeek();
    const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
    if (card) card.classList.toggle("is-saved", adding);
    const saveBtn = document.querySelector(`[data-save="${CSS.escape(id)}"]`);
    if (saveBtn) {
      saveBtn.setAttribute("aria-pressed", String(adding));
      saveBtn.textContent = adding ? "נשמר לשבוע ✓" : "שמירה לשבוע";
      saveBtn.classList.remove("burst"); void saveBtn.offsetWidth; saveBtn.classList.add("burst");
    }
    if (adding) {
      const img = document.querySelector("#recipeSheet .hero-img");
      flyToWeek(img).then(() => renderWeek(true));
      toast("נוסף לשבוע שלי");
    } else {
      renderWeek(true);
      if (btn && btn.matches("[data-save]")) toast("הוסר מהשבוע שלי");
    }
  }

  // Sheets
  let openSheet = null;
  let lastFocus = null;
  function open(sheet, fromEl) {
    const c = fromEl ? fromEl.getBoundingClientRect() : null;
    if (openSheet && openSheet !== sheet) close(true);
    lastFocus = document.activeElement;
    const bd = $("backdrop");
    bd.hidden = false; sheet.hidden = false;
    sheet.scrollTop = 0;
    document.body.classList.add("locked");
    openSheet = sheet;

    if (c && c.width && !reduceMotion && sheet.animate) {
      // Expand from the tapped card: clip the full sheet down to the card's box, then open it up.
      sheet.classList.add("no-slide", "open");
      const s = sheet.getBoundingClientRect();
      const inset = `inset(${Math.max(0, c.top - s.top)}px ${Math.max(0, s.right - c.right)}px ${Math.max(0, s.bottom - c.bottom)}px ${Math.max(0, c.left - s.left)}px round 22px)`;
      sheet.animate([{ clipPath: inset }, { clipPath: "inset(0px 0px 0px 0px round 26px)" }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" })
        .finished.catch(() => {}).then(() => sheet.classList.remove("no-slide"));
      requestAnimationFrame(() => bd.classList.add("open"));
    } else {
      requestAnimationFrame(() => { bd.classList.add("open"); sheet.classList.add("open"); });
    }
    sheet.querySelector(".close").focus({ preventScroll: true });
  }
  function close(instant) {
    if (!openSheet) return;
    const sheet = openSheet, bd = $("backdrop");
    sheet.classList.remove("open"); bd.classList.remove("open");
    openSheet = null;
    document.body.classList.remove("locked");
    const done = () => { if (!sheet.classList.contains("open")) { sheet.hidden = true; if (!openSheet) bd.hidden = true; } };
    instant ? done() : setTimeout(done, 450);
    if (lastFocus && !instant) lastFocus.focus({ preventScroll: true });
  }
  function openRecipe(id, fromEl) {
    const r = recipes.find((x) => x.id === id);
    if (!r) return;
    renderRecipe(r);
    open($("recipeSheet"), fromEl);
    countUp($("recipeBody"));
  }

  // Gentle 3D tilt on cards, only for a real mouse
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
    $("grid").addEventListener("pointermove", (e) => {
      const card = e.target.closest(".card");
      if (!card || card.classList.contains("pre")) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transitionDelay = "0ms";
      card.style.transform = `perspective(700px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
    });
    $("grid").addEventListener("pointerout", (e) => {
      const card = e.target.closest(".card");
      if (card && !card.contains(e.relatedTarget)) card.style.transform = "";
    });
  }

  // Hunger scale slider
  function renderScale(v, animate) {
    const zone = v === 3 || v === 7 ? "key" : v > 3 && v < 7 ? "ok" : "far";
    $("scaleReadout").dataset.zone = zone;
    $("scaleText").textContent = SCALE[v];
    const n = $("scaleNum");
    n.textContent = v;
    if (animate) { n.classList.remove("tick"); void n.offsetWidth; n.classList.add("tick"); }
  }
  $("scaleTicks").innerHTML = SCALE.map((_, i) => `<span class="${i === 3 || i === 7 ? "key" : ""}">${i}</span>`).join("");
  $("scaleRange").addEventListener("input", (e) => {
    const v = Number(e.target.value);
    renderScale(v, true);
    renderAdvice(v);
    markFeeling(v, true);
    if (navigator.vibrate && (v === 3 || v === 7)) navigator.vibrate(12);
  });

  // Hunger check (copy.md: "בדיקת רעב"). Options are the scale's own descriptions, so 0 = hungriest.
  const HUNGER_ADVICE = [
    { upTo: 2, msg: "אתם רעבים מדי. אוכלים עכשיו, ובפעם הבאה לא מחכים עד שזה מגיע לכאן.", cta: { label: "לכל המתכונים", meal: null } },
    { upTo: 4, msg: "זה הזמן לאכול.", cta: { label: "לכל המתכונים", meal: null } },
    { upTo: 6, msg: "לא צריך ארוחה עכשיו. אם בא לכם - נשנוש קטן.", cta: { label: "לנשנושים", meal: "נשנושים" } },
    { upTo: 7, msg: "הגעתם לשובע האמיתי. זה הזמן לעצור.", cta: null },
    { upTo: 10, msg: "אכלתם מעל השובע. לא נורא - פשוט מקשיבים לגוף בארוחה הבאה.", cta: null }
  ];

  function showRecipes(meal) {
    state.query = ""; state.protein = null; state.maxCal = null; state.meal = meal;
    $("search").value = ""; $("calories").value = "";
    document.querySelectorAll("#mealChips .chip, #proteinChips .chip").forEach((c) => {
      c.setAttribute("aria-pressed", String(c.closest("#mealChips") !== null && c.dataset.value === meal));
    });
    renderGrid();
    window.scrollTo({ top: $("grid").getBoundingClientRect().top + window.scrollY - 140, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function renderAdvice(v) {
    const advice = HUNGER_ADVICE.find((a) => v <= a.upTo);
    const res = $("feelResult");
    res.innerHTML = `
      <p class="msg">${esc(advice.msg)}</p>
      ${advice.cta ? `<button type="button" class="pill" data-feel-cta="${esc(advice.cta.meal || "")}">${esc(advice.cta.label)}</button>` : ""}`;
    res.style.animation = "none"; void res.offsetWidth; res.style.animation = "";
  }

  function markFeeling(v, collapse) {
    $("feelOptions").querySelectorAll(".feel").forEach((b) => {
      const on = Number(b.dataset.v) === v;
      b.setAttribute("aria-pressed", String(on));
      b.hidden = collapse && !on;
    });
  }

  // First the feeling in their words, then the scale opens with the matching step and the advice.
  function pickFeeling(v) {
    markFeeling(v, true);
    const box = $("scaleBox");
    box.hidden = false;
    box.classList.remove("opening"); void box.offsetWidth; box.classList.add("opening");
    $("scaleRange").value = v;
    renderScale(v, true);
    renderAdvice(v);
    window.scrollTo({ top: $("hungerCheck").getBoundingClientRect().top + window.scrollY - 70, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function resetFeeling() {
    $("feelOptions").querySelectorAll(".feel").forEach((b) => { b.hidden = false; b.setAttribute("aria-pressed", "false"); });
    $("scaleBox").hidden = true;
    window.scrollTo({ top: $("hungerCheck").getBoundingClientRect().top + window.scrollY - 70, behavior: reduceMotion ? "auto" : "smooth" });
  }

  $("feelOptions").innerHTML = SCALE.map((t, i) => `<button type="button" class="feel" data-v="${i}" aria-pressed="false"><span class="n">${i}</span><span>${esc(t)}</span></button>`).join("");
  $("tips").addEventListener("click", (e) => {
    const opt = e.target.closest(".feel");
    if (opt) return pickFeeling(Number(opt.dataset.v));
    const cta = e.target.closest("[data-feel-cta]");
    if (cta) return showRecipes(cta.dataset.feelCta || null);
    if (e.target.closest("[data-feel-again]")) resetFeeling();
  });

  // Events
  $("search").addEventListener("input", (e) => { state.query = e.target.value; renderGrid(); });
  $("calories").addEventListener("change", (e) => { state.maxCal = e.target.value ? Number(e.target.value) : null; renderGrid(); });
  $("grid").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) openRecipe(card.dataset.id, card);
  });
  $("openWeek").addEventListener("click", () => open($("weekSheet")));
  $("backdrop").addEventListener("click", () => close());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.addEventListener("click", (e) => {
    const save = e.target.closest("[data-save]");
    if (save) return toggleSave(save.dataset.save, save);
    const rm = e.target.closest("[data-remove]");
    if (rm) { e.stopPropagation(); return toggleSave(rm.dataset.remove, rm); }
    if (e.target.closest("[data-close]")) return close();
    const ing = e.target.closest(".ingredients li");
    if (ing) return ing.classList.toggle("done");
    const item = e.target.closest(".week-item");
    if (item) openRecipe(item.dataset.id, item);
  });

  document.querySelectorAll(".reveal").forEach(observe);
  renderChips($("mealChips"), MEAL_TYPES, "meal");
  renderChips($("proteinChips"), PROTEINS, "protein");
  renderScale(3, false);
  renderGrid();
  renderWeek(false);
})();
