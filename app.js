/* Rutina Full Body — app liviana, sin dependencias.
   Datos: window.EXERCISES (data.js). Persistencia: localStorage. */
(function () {
  "use strict";
  var EX = window.EXERCISES || [];
  var GIF_BASE = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/";

  // --- almacenamiento ---
  var K_ROUTINE = "gym.routine.v1";
  var K_LOGS = "gym.logs.v1";
  var K_DAYS = "gym.days.v1";
  var K_SESSIONS = "gym.sessions.v1";
  function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  var byId = {};
  EX.forEach(function (e) { byId[e.id] = e; });

  // --- estructura del día full body ---
  var TEMPLATE = ["piernas", "piernas", "pecho", "espalda", "hombros", "biceps", "triceps", "core"];
  var SCHEME = {
    piernas: "4 × 8-12", pecho: "4 × 8-12", espalda: "4 × 8-12",
    hombros: "4 × 10-12", biceps: "3 × 10-15", triceps: "3 × 10-15", core: "3 × 15-20"
  };
  var GRP_LABEL = {
    piernas: "Piernas", pecho: "Pecho", espalda: "Espalda", hombros: "Hombros",
    biceps: "Bíceps", triceps: "Tríceps", core: "Core"
  };

  function pools() {
    var p = {};
    EX.forEach(function (e) { (p[e.grp] = p[e.grp] || []).push(e); });
    return p;
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // Genera N días sin repetir ejercicios dentro de la rutina.
  function generate(nDays) {
    var p = pools(), need = {}, queues = {};
    TEMPLATE.forEach(function (g) { need[g] = (need[g] || 0) + 1; });
    Object.keys(need).forEach(function (g) {
      var want = need[g] * nDays;
      var q = shuffle(p[g] || []);
      while (q.length < want) q = q.concat(shuffle(p[g] || []));
      queues[g] = q.slice(0, want);
    });
    var days = [];
    for (var d = 0; d < nDays; d++) {
      days.push({ name: "Día " + (d + 1), items: TEMPLATE.map(function (g) { return queues[g].shift().id; }) });
    }
    return { days: days, createdAt: new Date().toISOString() };
  }

  // --- registro de pesos ---
  function logsFor(id) { return load(K_LOGS, {})[id] || []; }
  function addLog(id, w, r) {
    var all = load(K_LOGS, {});
    (all[id] = all[id] || []).push({ d: new Date().toISOString().slice(0, 10), w: w, r: r });
    save(K_LOGS, all);
  }
  function lastLog(id) { var l = logsFor(id); return l.length ? l[l.length - 1] : null; }
  function prWeight(id) { return logsFor(id).reduce(function (m, x) { return Math.max(m, x.w || 0); }, 0); }

  // --- sesiones ---
  function getSessions() { return load(K_SESSIONS, {}); }
  function addSessionExercise(date, exId, w, r) {
    var all = getSessions();
    (all[date] = all[date] || []).push({ id: exId, w: w, r: r });
    save(K_SESSIONS, all);
  }
  function getSessionExercises(date) { return getSessions()[date] || []; }

  // --- análisis ---
  function getAnalysis() {
    var sessions = getSessions();
    var dates = Object.keys(sessions).sort().reverse();
    var twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    var cutoff = twoWeeksAgo.toISOString().slice(0, 10);

    var counts = {};
    TEMPLATE.forEach(function (g) { counts[g] = 0; });

    dates.forEach(function (d) {
      if (d < cutoff) return;
      sessions[d].forEach(function (ex) {
        var e = byId[ex.id];
        if (e) counts[e.grp] = (counts[e.grp] || 0) + 1;
      });
    });

    return counts;
  }

  function recommendExercises(groupName) {
    var pool = pools()[groupName] || [];
    if (!pool.length) return [];
    var allExercises = Object.keys(load(K_LOGS, {}));
    var unused = pool.filter(function (e) { return allExercises.indexOf(e.id) === -1; });
    var recommended = unused.length ? unused : pool;
    return recommended.slice(0, 3);
  }

  // --- render rutina ---
  var elRoutine = document.getElementById("routine");
  function renderRoutine() {
    var r = load(K_ROUTINE, null);
    if (!r) { elRoutine.innerHTML = '<p class="empty">Elige los días y pulsa <b>Generar rutina</b> para empezar 💪</p>'; return; }
    var html = "";
    r.days.forEach(function (day) {
      html += '<h2 class="day-title"><span>' + day.name + "</span> Full body</h2><div class='card'>";
      day.items.forEach(function (id) {
        var e = byId[id]; if (!e) return;
        var last = lastLog(id);
        html += '<div class="ex" data-id="' + id + '">' +
          '<div class="ex-head"><div><div class="ex-name">' + esc(e.name) + '</div>' +
          '<div class="ex-meta"><span class="badge grp">' + GRP_LABEL[e.grp] + '</span>' +
          '<span class="badge">' + esc(e.eq) + '</span></div></div>' +
          '<div class="scheme">' + SCHEME[e.grp] + '</div></div>' +
          '<div class="last">' + (last ? "Última vez: " + fmtW(last.w) + " × " + (last.r || "-") + " reps · " + last.d : "") + '</div>' +
          '<div class="log">' +
          '<input type="number" inputmode="decimal" class="w" placeholder="kg" value="' + (last ? last.w : "") + '">' +
          '<input type="number" inputmode="numeric" class="r" placeholder="reps" value="' + (last ? (last.r || "") : "") + '">' +
          '<button class="save">Guardar</button>' +
          '<button class="linkbtn togif">ver ejercicio</button>' +
          '</div>' +
          '<div class="gifbox"></div>' +
          '</div>';
      });
      html += "</div>";
    });
    elRoutine.innerHTML = html;
  }

  // --- render sesiones ---
  var elSessionForm = document.getElementById("session-form");
  var elSessionsList = document.getElementById("sessions-list");
  var sessionFilterState = {};
  function renderSessionForm() {
    var today = new Date().toISOString().slice(0, 10);
    document.getElementById("session-date").value = today;
    var html = '<div class="card">' +
      '<input type="text" id="session-search" placeholder="Buscar ejercicio..." style="width: 100%; margin-bottom: 10px; padding: 9px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--card2); color: var(--txt); font-size: 14px;">' +
      '<div id="session-list"></div></div>';
    elSessionForm.innerHTML = html;

    document.getElementById("session-search").addEventListener("input", function (e) {
      var filter = e.target.value.toLowerCase();
      var list = document.getElementById("session-list");
      var grouped = {};
      var filtered = EX.filter(function (ex) { return ex.name.toLowerCase().includes(filter) || GRP_LABEL[ex.grp].toLowerCase().includes(filter); });

      filtered.forEach(function (e) {
        if (!grouped[e.grp]) grouped[e.grp] = [];
        grouped[e.grp].push(e);
      });

      var html = '';
      Object.keys(grouped).sort().forEach(function (grp) {
        html += '<div style="margin-top: 12px;"><div style="font-size: 12px; font-weight: 600; color: var(--acc); margin-bottom: 6px;">' + GRP_LABEL[grp] + '</div>';
        grouped[grp].forEach(function (ex) {
          html += '<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 400; margin: 0 0 6px; font-size: 13px;">' +
            '<input type="checkbox" class="ex-checkbox" value="' + ex.id + '">' +
            '<span>' + esc(ex.name) + '</span></label>';
        });
        html += '</div>';
      });
      list.innerHTML = html || '<p style="color: var(--dim); font-size: 13px;">Sin resultados</p>';
    });

    document.getElementById("session-search").dispatchEvent(new Event("input"));
  }
  function renderSessionsList() {
    var sessions = getSessions();
    var dates = Object.keys(sessions).sort().reverse();
    if (!dates.length) { elSessionsList.innerHTML = '<p class="empty">Aún no registraste sesiones.</p>'; return; }
    var html = '';
    dates.slice(0, 10).forEach(function (d) {
      html += '<div class="card" style="margin-top: 14px;"><div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">' + d + '</div>';
      sessions[d].forEach(function (ex) {
        var e = byId[ex.id];
        if (!e) return;
        html += '<div style="font-size: 13px; padding: 4px 0; color: var(--dim);">' + esc(e.name) +
          ' <b style="color: var(--txt);">' + fmtW(ex.w) + ' × ' + (ex.r || '-') + '</b></div>';
      });
      html += '</div>';
    });
    elSessionsList.innerHTML = html;
  }

  // --- render análisis ---
  var elAnalysis = document.getElementById("analysis");
  function renderAnalysis() {
    var counts = getAnalysis();
    var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var total = Object.keys(counts).reduce(function (s, g) { return s + counts[g]; }, 0);
    if (total === 0) { elAnalysis.innerHTML = '<p class="empty">Registra sesiones para ver análisis.</p>'; return; }

    var html = '<div class="card"><h3 style="margin: 0 0 14px; font-size: 15px;">Últimas 2 semanas</h3>';
    html += '<div style="display: flex; flex-direction: column; gap: 10px;">';
    sorted.forEach(function (g) {
      var pct = Math.round((counts[g] / total) * 100);
      html += '<div><div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">' +
        '<span>' + GRP_LABEL[g] + '</span><span><b>' + counts[g] + '</b> veces (' + pct + '%)</span></div>' +
        '<div style="height: 8px; background: var(--card2); border-radius: 4px; overflow: hidden;">' +
        '<div style="height: 100%; width: ' + pct + '%; background: var(--acc);"></div></div></div>';
    });
    html += '</div></div>';

    var least = sorted[sorted.length - 1];
    html += '<div class="card" style="margin-top: 14px;"><h3 style="margin: 0 0 10px; font-size: 15px;">💡 Recomendaciones</h3>';
    html += '<p style="font-size: 13px; color: var(--dim); margin: 0 0 10px; line-height: 1.4;">Trabajaste poco <b>' + GRP_LABEL[least] + '</b>. ';
    html += 'Para 2 días/semana: <b>Día 1: pecho, espalda, hombros, brazos</b> | <b>Día 2: piernas y core</b></p>';

    var recs = recommendExercises(least);
    if (recs.length) {
      html += '<p style="font-size: 12px; color: var(--dim); margin: 0; font-weight: 600;">Sugerencias:</p>';
      recs.forEach(function (e) {
        html += '<div style="font-size: 13px; padding: 6px 0; border-top: 1px solid var(--line); color: var(--txt);">' + esc(e.name) + '</div>';
      });
    }
    html += '</div>';
    elAnalysis.innerHTML = html;
  }

  // --- render histórico ---
  var elHistory = document.getElementById("history");
  function renderHistory() {
    var all = load(K_LOGS, {});
    var ids = Object.keys(all).filter(function (id) { return byId[id] && all[id].length; });
    if (!ids.length) { elHistory.innerHTML = '<p class="empty">Aún no registraste pesos.<br>Guarda el peso de un ejercicio y aparecerá aquí tu progreso 📈</p>'; return; }
    ids.sort(function (a, b) { return all[b][all[b].length - 1].d.localeCompare(all[a][all[a].length - 1].d); });
    var html = "";
    ids.forEach(function (id) {
      var e = byId[id], logs = all[id], pr = prWeight(id);
      var max = Math.max.apply(null, logs.map(function (x) { return x.w || 0; })) || 1;
      var bars = logs.slice(-14).map(function (x) {
        return '<i style="height:' + Math.max(8, Math.round((x.w / max) * 100)) + '%" title="' + x.d + ': ' + x.w + 'kg"></i>';
      }).join("");
      var rows = logs.slice().reverse().slice(0, 8).map(function (x) {
        var isPr = (x.w === pr) ? ' <span class="pr">PR</span>' : "";
        return '<div class="hrow"><span>' + x.d + isPr + '</span><b>' + fmtW(x.w) + " × " + (x.r || "-") + '</b></div>';
      }).join("");
      html += '<div class="card hgroup"><div class="hname">' + esc(e.name) + '</div>' +
        '<div class="ex-meta"><span class="badge grp">' + GRP_LABEL[e.grp] + '</span>' +
        '<span class="badge">Récord: ' + fmtW(pr) + '</span></div>' +
        '<div class="spark">' + bars + '</div>' + rows + '</div>';
    });
    elHistory.innerHTML = html;
  }

  // --- utilidades ---
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmtW(w) { return (w || w === 0) ? w + " kg" : "-"; }
  var toastT;
  function toast(msg) {
    var t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 1600);
  }

  // --- eventos ---
  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("active"); });
      document.querySelectorAll(".view").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      var view = "view-" + b.dataset.view;
      document.getElementById(view).classList.add("active");
      if (b.dataset.view === "historico") renderHistory();
      if (b.dataset.view === "sesiones") { renderSessionForm(); renderSessionsList(); }
      if (b.dataset.view === "analisis") renderAnalysis();
    });
  });

  var daysSel = document.getElementById("days");
  daysSel.value = load(K_DAYS, "3");
  daysSel.addEventListener("change", function () { save(K_DAYS, daysSel.value); });

  document.getElementById("generate").addEventListener("click", function () {
    save(K_ROUTINE, generate(parseInt(daysSel.value, 10)));
    renderRoutine();
    toast("Rutina generada 💪");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  elRoutine.addEventListener("click", function (ev) {
    var exEl = ev.target.closest(".ex"); if (!exEl) return;
    var id = exEl.dataset.id;
    if (ev.target.classList.contains("save")) {
      var w = parseFloat(exEl.querySelector(".w").value);
      var r = parseInt(exEl.querySelector(".r").value, 10);
      if (isNaN(w)) { toast("Escribe el peso"); return; }
      addLog(id, w, isNaN(r) ? null : r);
      exEl.querySelector(".last").textContent = "Última vez: " + fmtW(w) + " × " + (isNaN(r) ? "-" : r) + " reps · hoy";
      toast("Guardado ✔");
    } else if (ev.target.classList.contains("togif")) {
      var box = exEl.querySelector(".gifbox"), e = byId[id];
      if (box.dataset.on) { box.innerHTML = ""; box.dataset.on = ""; ev.target.textContent = "ver ejercicio"; return; }
      box.innerHTML = (e.gif ? '<img class="gif" loading="lazy" src="' + GIF_BASE + e.gif + '" alt="">' : "") +
        (e.ins ? '<p class="ins">' + esc(e.ins) + '</p>' : "");
      box.dataset.on = "1"; ev.target.textContent = "ocultar";
    }
  });

  // --- sesiones eventos ---
  document.getElementById("session-save").addEventListener("click", function () {
    var date = document.getElementById("session-date").value;
    var checkboxes = document.querySelectorAll(".ex-checkbox:checked");
    if (!checkboxes.length) { toast("Selecciona al menos un ejercicio"); return; }

    var sessions = getSessions();
    sessions[date] = [];
    checkboxes.forEach(function (cb) {
      sessions[date].push({ id: cb.value, w: null, r: null });
    });
    save(K_SESSIONS, sessions);
    toast("Sesión guardada ✔");
    renderSessionsList();
    document.querySelectorAll(".ex-checkbox").forEach(function (cb) { cb.checked = false; });
  });

  // --- init ---
  renderRoutine();
})();
