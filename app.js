/* ==========================================================
   Agua para Fernanda
   Secciones: CONFIG · Fechas · Almacenamiento · Estado ·
              Mensajes · Efectos · Interfaz · Arranque
   ========================================================== */
(() => {
  "use strict";

  /* ---------- CONFIG: lo único que normalmente querrás tocar ---------- */

  const CONFIG = {
    name: "Fernanda",
    goalMl: 2000,
    quickAmounts: [250, 500],
    maxEntryMl: 3000,
    storageKey: "agua-fernanda-v1",
    historyDays: 120, // días de historial que se conservan
  };

  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Fechas (siempre en hora local del dispositivo) ---------- */

  const Dates = {
    /** "2026-09-22" según el calendario local, no UTC. */
    key(date = new Date()) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    },

    /** Los últimos `n` días terminando hoy, del más antiguo al más reciente. */
    lastDays(n, today = new Date()) {
      const days = [];
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        days.push(d);
      }
      return days;
    },

    shortName(date) {
      return ["D", "L", "M", "X", "J", "V", "S"][date.getDay()];
    },

    longName(date) {
      return date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric" });
    },
  };

  /* ---------- Almacenamiento (localStorage con respaldo en memoria) ---------- */

  const Store = (() => {
    let memory = null; // por si localStorage no está disponible (modo privado estricto)

    const read = () => {
      try {
        const raw = localStorage.getItem(CONFIG.storageKey);
        return raw ? JSON.parse(raw) : memory;
      } catch {
        return memory;
      }
    };

    const write = (data) => {
      memory = data;
      try {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
      } catch {
        /* sin almacenamiento persistente: seguimos en memoria */
      }
    };

    return { read, write };
  })();

  /* ---------- Estado ---------- */

  /*
    Forma de los datos guardados:
    {
      version: 1,
      today:   { date: "2026-09-22", total: 750, celebrated: false,
                 entries: [{ ml: 250, at: 1758560000000 }, ...] },
      history: { "2026-09-21": { total: 2100, goalMet: true, entries: 6 }, ... }
    }
  */

  const State = (() => {
    const emptyDay = (date) => ({ date, total: 0, entries: [], celebrated: false });

    let data = null;

    const sanitize = (raw) => {
      const todayKey = Dates.key();
      if (!raw || typeof raw !== "object" || !raw.today) {
        return { version: 1, today: emptyDay(todayKey), history: {} };
      }
      const entries = Array.isArray(raw.today.entries)
        ? raw.today.entries.filter((e) => e && Number.isFinite(e.ml) && e.ml > 0)
        : [];
      return {
        version: 1,
        today: {
          date: typeof raw.today.date === "string" ? raw.today.date : todayKey,
          entries,
          total: entries.reduce((sum, e) => sum + e.ml, 0),
          celebrated: Boolean(raw.today.celebrated),
        },
        history: raw.history && typeof raw.history === "object" ? raw.history : {},
      };
    };

    const archive = (day) => {
      if (!day || day.total <= 0) return;
      data.history[day.date] = {
        total: day.total,
        goalMet: day.total >= CONFIG.goalMl,
        entries: day.entries.length,
      };
      // Poda de días muy antiguos
      const keys = Object.keys(data.history).sort();
      while (keys.length > CONFIG.historyDays) delete data.history[keys.shift()];
    };

    const save = () => Store.write(data);

    return {
      load() {
        data = sanitize(Store.read());
        this.rollover();
      },

      /** Si cambió el día calendario, guarda el anterior y empieza en 0. */
      rollover() {
        const todayKey = Dates.key();
        if (data.today.date === todayKey) return false;
        archive(data.today);
        data.today = emptyDay(todayKey);
        save();
        return true;
      },

      add(ml) {
        const before = data.today.total;
        data.today.entries.push({ ml, at: Date.now() });
        data.today.total += ml;
        save();
        return { before, after: data.today.total };
      },

      undo() {
        const last = data.today.entries.pop();
        if (!last) return null;
        data.today.total = Math.max(0, data.today.total - last.ml);
        // Si vuelve a quedar por debajo de la meta, la celebración podrá repetirse al alcanzarla de nuevo.
        if (data.today.total < CONFIG.goalMl) data.today.celebrated = false;
        save();
        return last;
      },

      markCelebrated() {
        data.today.celebrated = true;
        save();
      },

      /** Total de un día concreto (hoy desde el estado vivo, el resto desde el historial). */
      totalFor(dateKey) {
        if (dateKey === data.today.date) return data.today.total;
        return data.history[dateKey]?.total ?? 0;
      },

      get today() {
        return data.today;
      },
      get total() {
        return data.today.total;
      },
      get lastEntry() {
        return data.today.entries[data.today.entries.length - 1] ?? null;
      },
      get goalReached() {
        return data.today.total >= CONFIG.goalMl;
      },
    };
  })();

  /* ---------- Mensajes ---------- */

  const Messages = {
    cheers: [
      "Muy bien 💧",
      "Vas súper bien",
      "Un poquito más cerca ✨",
      "Hidratación +1 💧",
      "Así se hace",
    ],
    lastCheer: -1,

    randomCheer() {
      let i;
      do {
        i = Math.floor(Math.random() * this.cheers.length);
      } while (i === this.lastCheer && this.cheers.length > 1);
      this.lastCheer = i;
      return this.cheers[i];
    },

    /** Mensaje tranquilo según el avance del día. */
    contextual(total) {
      const p = total / CONFIG.goalMl;
      if (total <= 0) return "Un vasito para empezar el día 💧";
      if (p < 0.25) return "Buen comienzo";
      if (p < 0.5) return "Vas tomando ritmo ✨";
      if (p < 0.75) return "Ya pasaste la mitad";
      if (p < 1) return "¡Ya casi! Un poquito más";
      return "Todo lo que sigue es extra 💙";
    },
  };

  /* ---------- Formato ---------- */

  const Format = {
    percent(total) {
      const p = Math.round((total / CONFIG.goalMl) * 1000) / 10;
      return `${Number.isInteger(p) ? p : p.toFixed(1)}%`;
    },
    liters(ml) {
      const l = Math.round((ml / 1000) * 100) / 100;
      return `${String(l)} L`;
    },
  };

  /* ---------- Efectos y animaciones ---------- */

  const Effects = (() => {
    const SVG_NS = "http://www.w3.org/2000/svg";

    // Geometría interior del vaso (unidades del viewBox del SVG)
    const INNER_TOP = 31;
    const INNER_BOTTOM = 315;
    const WAVE_AMP = 5;
    const WAVELENGTH = 110;

    /** Onda senoidal suave que se extiende hacia abajo para formar el cuerpo del agua. */
    const wavePath = (amp, offset = 0) => {
      const width = WAVELENGTH * 4;
      let d = `M${-offset} 0 Q${WAVELENGTH / 4 - offset} ${-amp} ${WAVELENGTH / 2 - offset} 0`;
      for (let x = WAVELENGTH - offset; x <= width; x += WAVELENGTH / 2) d += ` T${x} 0`;
      return `${d} V400 H${-offset} Z`;
    };

    /** Altura (y) de la superficie del agua para un progreso 0–1. */
    const surfaceY = (progress) => {
      const p = Math.min(Math.max(progress, 0), 1);
      const empty = INNER_BOTTOM + WAVE_AMP; // oculta por completo
      const full = INNER_TOP - WAVE_AMP - 2; // cubre el borde incluso en el valle de la onda
      return empty - p * (empty - full);
    };

    const setupWaves = () => {
      document.getElementById("wave-front").setAttribute("d", wavePath(WAVE_AMP));
      document.getElementById("wave-back").setAttribute("d", wavePath(WAVE_AMP * 0.8, WAVELENGTH / 2));
    };

    const setLevel = (progress, water) => {
      water.style.transform = `translateY(${surfaceY(progress)}px)`;
    };

    /** Número que cuenta hacia el nuevo valor. */
    let countFrame = 0;
    const countTo = (el, from, to) => {
      cancelAnimationFrame(countFrame);
      if (prefersReducedMotion() || from === to) {
        el.textContent = String(to);
        return;
      }
      const duration = 700;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(from + (to - from) * eased));
        if (t < 1) countFrame = requestAnimationFrame(step);
      };
      countFrame = requestAnimationFrame(step);
    };

    /** Burbujas que suben desde el fondo del vaso. */
    const bubbles = (group, progress) => {
      if (prefersReducedMotion()) return;
      const top = Math.max(surfaceY(progress) + 10, INNER_TOP + 10);
      const count = 5;
      for (let i = 0; i < count; i++) {
        const c = document.createElementNS(SVG_NS, "circle");
        const r = 2 + Math.random() * 3;
        const x = 80 + Math.random() * 60;
        c.setAttribute("cx", String(x));
        c.setAttribute("cy", String(INNER_BOTTOM - 8));
        c.setAttribute("r", String(r));
        c.setAttribute("class", "bubble");
        group.appendChild(c);
        const rise = INNER_BOTTOM - 8 - top;
        const drift = (Math.random() - 0.5) * 16;
        c.animate(
          [
            { transform: "translate(0, 0)", opacity: 0 },
            { opacity: 0.9, offset: 0.2 },
            { transform: `translate(${drift}px, ${-rise}px)`, opacity: 0 },
          ],
          { duration: 1400 + Math.random() * 700, delay: i * 120, easing: "ease-out", fill: "forwards" }
        ).finished.then(() => c.remove(), () => c.remove());
      }
    };

    /** Pequeña onda al tocar un botón. */
    const ripple = (button, event) => {
      if (prefersReducedMotion()) return;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const span = document.createElement("span");
      span.className = "ripple";
      const x = (event.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
      const y = (event.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
      Object.assign(span.style, { width: `${size}px`, height: `${size}px`, left: `${x}px`, top: `${y}px` });
      button.appendChild(span);
      span
        .animate([{ transform: "scale(0)", opacity: 1 }, { transform: "scale(2.2)", opacity: 0 }], {
          duration: 600,
          easing: "ease-out",
        })
        .finished.then(() => span.remove(), () => span.remove());
    };

    const SPARKLE_SVG =
      '<svg viewBox="0 0 24 24"><path d="M12 0c.6 5.6 2.4 7.4 12 12-9.6 4.6-11.4 6.4-12 12-.6-5.6-2.4-7.4-12-12C9.6 7.4 11.4 5.6 12 0Z"/></svg>';

    /** Celebración sutil: brillo del vaso, destellos y un poco de confeti. */
    const celebrate = ({ stage, sparkles, confetti }) => {
      if (prefersReducedMotion()) return;

      stage.classList.remove("is-celebrating");
      void stage.offsetWidth; // reinicia la animación si se repite
      stage.classList.add("is-celebrating");
      setTimeout(() => stage.classList.remove("is-celebrating"), 2600);

      const spots = [
        [8, 18], [88, 12], [4, 55], [94, 48], [16, 86], [84, 82], [50, 2], [70, 30],
      ];
      const colors = ["#7dc6f3", "#b3a8ef", "#a9d0f2", "#f3c6dc"];
      spots.forEach(([x, y], i) => {
        const s = document.createElement("span");
        s.className = "sparkle";
        s.innerHTML = SPARKLE_SVG;
        const size = 10 + Math.random() * 10;
        Object.assign(s.style, {
          left: `${x}%`,
          top: `${y}%`,
          width: `${size}px`,
          height: `${size}px`,
          color: colors[i % colors.length],
        });
        sparkles.appendChild(s);
        s.animate(
          [
            { opacity: 0, transform: "scale(0) rotate(0deg)" },
            { opacity: 1, transform: "scale(1) rotate(45deg)", offset: 0.35 },
            { opacity: 0, transform: "scale(0.4) rotate(90deg)" },
          ],
          { duration: 1500, delay: 150 + i * 110, easing: "ease-out", fill: "forwards" }
        ).finished.then(() => s.remove(), () => s.remove());
      });

      const pieces = 26;
      const palette = ["#a9d0f2", "#7dc6f3", "#cfc8f7", "#f6cfe0", "#bfe6dc"];
      for (let i = 0; i < pieces; i++) {
        const p = document.createElement("span");
        p.className = "confetti__piece";
        const w = 5 + Math.random() * 5;
        Object.assign(p.style, {
          left: `${10 + Math.random() * 80}%`,
          width: `${w}px`,
          height: `${w * (Math.random() > 0.5 ? 1 : 1.8)}px`,
          background: palette[i % palette.length],
          borderRadius: Math.random() > 0.5 ? "50%" : "3px",
        });
        confetti.appendChild(p);
        const fall = window.innerHeight * (0.55 + Math.random() * 0.35);
        const sway = (Math.random() - 0.5) * 80;
        p.animate(
          [
            { transform: "translate(0, 0) rotate(0deg)", opacity: 0 },
            { opacity: 0.95, offset: 0.1 },
            { transform: `translate(${sway}px, ${fall}px) rotate(${Math.random() * 360}deg)`, opacity: 0 },
          ],
          { duration: 2600 + Math.random() * 1200, delay: Math.random() * 500, easing: "cubic-bezier(.3,.6,.5,1)", fill: "forwards" }
        ).finished.then(() => p.remove(), () => p.remove());
      }
    };

    return { setupWaves, setLevel, countTo, bubbles, ripple, celebrate };
  })();

  /* ---------- Interfaz ---------- */

  const UI = (() => {
    const $ = (id) => document.getElementById(id);
    const el = {
      greeting: $("greeting"),
      congrats: $("congrats"),
      goalLabel: $("goal-label"),
      goalMl: $("goal-ml"),
      stage: $("vessel"),
      water: $("water"),
      bubbles: $("bubbles"),
      sparkles: $("sparkles"),
      confetti: $("confetti"),
      amount: $("amount"),
      percent: $("percent"),
      note: $("note"),
      toast: $("toast"),
      quick: $("quick"),
      customToggle: $("custom-toggle"),
      customForm: $("custom-form"),
      customInput: $("custom-input"),
      customError: $("custom-error"),
      customCancel: $("custom-cancel"),
      undo: $("undo"),
      undoLabel: $("undo-label"),
      weekToggle: $("week-toggle"),
      weekPanel: $("week-panel"),
      weekDays: $("week-days"),
      weekSummary: $("week-summary"),
    };

    const DROP_SVG =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5c-.3 0-.6.2-.8.4C9.4 5.2 5.5 10 5.5 14a6.5 6.5 0 0 0 13 0c0-4-3.9-8.8-5.7-11.1-.2-.2-.5-.4-.8-.4Z"/></svg>';

    const applyConfig = () => {
      document.querySelectorAll("[data-name]").forEach((n) => (n.textContent = CONFIG.name));
      document.title = `Agua para ${CONFIG.name}`;
      el.goalLabel.textContent = Format.liters(CONFIG.goalMl);
      el.goalMl.textContent = String(CONFIG.goalMl);
      el.stage.setAttribute("aria-valuemax", String(CONFIG.goalMl));
      el.customInput.max = String(CONFIG.maxEntryMl);

      el.quick.innerHTML = "";
      CONFIG.quickAmounts.forEach((ml) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn-quick";
        b.dataset.ml = String(ml);
        b.setAttribute("aria-label", `Agregar ${ml} mililitros`);
        b.innerHTML = `${DROP_SVG}<span>+${ml}</span><small>ml</small>`;
        el.quick.appendChild(b);
      });
    };

    let toastTimer = 0;
    const toast = (text) => {
      clearTimeout(toastTimer);
      el.toast.textContent = text;
      el.toast.classList.add("is-visible");
      toastTimer = setTimeout(() => el.toast.classList.remove("is-visible"), 2200);
    };

    const showHeader = (goalReached) => {
      el.greeting.hidden = goalReached;
      el.congrats.hidden = !goalReached;
    };

    /** Pinta todo el estado. `previousTotal` permite animar el contador. */
    const render = (previousTotal = State.total) => {
      const total = State.total;
      const progress = total / CONFIG.goalMl;

      Effects.setLevel(progress, el.water);
      Effects.countTo(el.amount, previousTotal, total);

      el.percent.textContent = Format.percent(total);
      el.note.textContent = Messages.contextual(total);
      el.stage.classList.toggle("is-full", State.goalReached);
      el.stage.setAttribute("aria-valuenow", String(Math.min(total, CONFIG.goalMl)));
      el.stage.setAttribute("aria-valuetext", `${total} ml de ${CONFIG.goalMl} ml, ${Format.percent(total)}`);

      showHeader(State.goalReached);

      const last = State.lastEntry;
      el.undo.hidden = !last;
      if (last) {
        el.undoLabel.textContent = `Deshacer +${last.ml} ml`;
        el.undo.setAttribute("aria-label", `Deshacer el último registro de ${last.ml} mililitros`);
      }

      if (el.weekPanel.classList.contains("is-open")) renderWeek();
    };

    const renderWeek = () => {
      const todayKey = Dates.key();
      let met = 0;
      el.weekDays.innerHTML = "";

      Dates.lastDays(7).forEach((date) => {
        const key = Dates.key(date);
        const total = State.totalFor(key);
        const reached = total >= CONFIG.goalMl;
        if (reached) met++;

        const li = document.createElement("li");
        li.className = "day";
        if (key === todayKey) li.classList.add("day--today");
        if (reached) li.classList.add("day--met");
        if (total === 0) li.classList.add("day--empty");

        const status = reached ? "meta cumplida" : total > 0 ? `${total} ml` : "sin registro";
        li.setAttribute("aria-label", `${Dates.longName(date)}: ${status}`);

        const pct = Math.min(total / CONFIG.goalMl, 1) * 100;
        li.innerHTML = `
          <span class="day__mark" aria-hidden="true">${reached ? "✓" : ""}</span>
          <span class="day__cup" aria-hidden="true"><span class="day__fill"></span></span>
          <span class="day__label" aria-hidden="true">${Dates.shortName(date)}</span>`;
        el.weekDays.appendChild(li);

        // Se aplica tras insertar para que la altura se anime
        const fill = li.querySelector(".day__fill");
        requestAnimationFrame(() => (fill.style.height = `${pct}%`));
      });

      el.weekSummary.textContent =
        met === 0
          ? "Aquí verás tus días con meta cumplida."
          : met === 1
          ? "1 día con meta cumplida esta semana 💧"
          : `${met} días con meta cumplida esta semana 💧`;
    };

    const openCustom = (open) => {
      el.customForm.hidden = !open;
      el.customToggle.setAttribute("aria-expanded", String(open));
      el.customError.textContent = "";
      if (open) {
        el.customInput.value = "";
        el.customInput.focus();
      } else {
        el.customToggle.focus();
      }
    };

    const toggleWeek = () => {
      const open = !el.weekPanel.classList.contains("is-open");
      el.weekPanel.classList.toggle("is-open", open);
      el.weekToggle.setAttribute("aria-expanded", String(open));
      if (open) renderWeek();
    };

    return { el, applyConfig, render, renderWeek, toast, openCustom, toggleWeek };
  })();

  /* ---------- Acciones (unen estado, interfaz y efectos) ---------- */

  const Actions = {
    add(ml) {
      State.rollover();
      const { before, after } = State.add(ml);
      UI.render(before);
      Effects.bubbles(UI.el.bubbles, after / CONFIG.goalMl);

      const crossedGoal = before < CONFIG.goalMl && after >= CONFIG.goalMl;
      if (crossedGoal && !State.today.celebrated) {
        State.markCelebrated();
        // Lleva la felicitación a la vista y espera a que el agua termine de subir
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
        setTimeout(() => Effects.celebrate(UI.el), prefersReducedMotion() ? 0 : 900);
      } else {
        UI.toast(Messages.randomCheer());
      }
    },

    undo() {
      const before = State.total;
      const removed = State.undo();
      if (!removed) return;
      UI.render(before);
      UI.toast(`Se quitaron ${removed.ml} ml`);
    },

    /** Revisa el cambio de día (p. ej. si la app quedó abierta pasada la medianoche). */
    checkDay() {
      if (State.rollover()) UI.render(0);
    },
  };

  /* ---------- Arranque ---------- */

  const bindEvents = () => {
    const { el } = UI;

    el.quick.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-quick");
      if (!btn) return;
      Effects.ripple(btn, e);
      Actions.add(Number(btn.dataset.ml));
    });

    el.customToggle.addEventListener("click", () => UI.openCustom(true));
    el.customCancel.addEventListener("click", () => UI.openCustom(false));

    el.customForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = Math.round(Number(el.customInput.value));
      if (!Number.isFinite(value) || value < 1 || value > CONFIG.maxEntryMl) {
        el.customError.textContent = `Escribe una cantidad entre 1 y ${CONFIG.maxEntryMl} ml.`;
        el.customInput.focus();
        return;
      }
      UI.openCustom(false);
      Actions.add(value);
    });

    el.customInput.addEventListener("input", () => (el.customError.textContent = ""));
    el.customForm.addEventListener("keydown", (e) => {
      if (e.key === "Escape") UI.openCustom(false);
    });

    el.undo.addEventListener("click", Actions.undo);
    el.weekToggle.addEventListener("click", UI.toggleWeek);

    // Cambio de día: al volver a la app y cada minuto mientras está abierta
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) Actions.checkDay();
    });
    window.addEventListener("focus", Actions.checkDay);
    window.addEventListener("pageshow", Actions.checkDay);
    setInterval(Actions.checkDay, 60 * 1000);

    // Si se abre en dos pestañas, mantenerlas sincronizadas
    window.addEventListener("storage", (e) => {
      if (e.key !== CONFIG.storageKey) return;
      const before = State.total;
      State.load();
      UI.render(before);
    });
  };

  const registerServiceWorker = () => {
    if (!("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {
        /* sin modo offline; la app funciona igual */
      });
    });
  };

  const init = () => {
    Effects.setupWaves();
    UI.applyConfig();
    State.load();

    // Primer pintado sin animar el llenado; después se activan las transiciones
    UI.el.water.style.transition = "none";
    UI.render(State.total);
    void UI.el.water.getBoundingClientRect();
    requestAnimationFrame(() => (UI.el.water.style.transition = ""));

    // Si se alcanzó la meta pero la celebración no se mostró (p. ej. desde otra pestaña)
    if (State.goalReached && !State.today.celebrated) {
      State.markCelebrated();
      setTimeout(() => Effects.celebrate(UI.el), 500);
    }

    bindEvents();
    registerServiceWorker();
  };

  init();
})();
