/* Rutina Full Body — app liviana, sin dependencias.
   Datos: window.EXERCISES (data.js). Persistencia: localStorage. */
(function () {
  "use strict";
  var EX = window.EXERCISES || [];
  var GIF_BASE = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/";

  // --- almacenamiento ---
  var K_LOGS = "gym.logs.v1";
  var K_SESSIONS = "gym.sessions.v1";
  function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); scheduleCloudSync(); }

  // --- sincronización con Firebase (opcional, requiere iniciar sesión) ---
  var currentUser = null;
  var cloudSyncTimer = null;
  function scheduleCloudSync(immediate) {
    if (!currentUser || !window.fb) return;
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    var run = function () {
      window.fb.saveData(currentUser.uid, {
        logs: load(K_LOGS, {}),
        sessions: load(K_SESSIONS, {})
      }).catch(function () { toast("No se pudo sincronizar"); });
    };
    if (immediate) run(); else cloudSyncTimer = setTimeout(run, 800);
  }

  var byId = {};
  var translations = {
    'chest': 'pecho', 'flat': 'plano', 'incline': 'inclinado', 'decline': 'declinado',
    'dumbbell': 'mancuerna', 'barbell': 'barra', 'machine': 'máquina', 'cable': 'polea',
    'press': 'press', 'fly': 'volada', 'flye': 'volada', 'pullover': 'pullover',
    'back': 'espalda', 'row': 'remo', 'pull': 'jalón', 'pulldown': 'jalón',
    'shoulder': 'hombro', 'raise': 'levantamiento', 'lateral': 'lateral', 'front': 'frontal',
    'bicep': 'bíceps', 'curl': 'curl', 'tricep': 'tríceps', 'extension': 'extensión',
    'leg': 'pierna', 'press': 'press', 'squat': 'sentadilla', 'lunge': 'estocada',
    'deadlift': 'peso muerto', 'hack': 'hack', 'extension': 'extensión', 'curl': 'curl',
    'calf': 'gemelo', 'raise': 'levantamiento', 'crunch': 'crunch', 'sit': 'sit up',
    'core': 'core', 'ab': 'abdominal', 'plank': 'plancha', 'hollow': 'hueca'
  };

  function translateEx(name) {
    var lower = name.toLowerCase();
    var words = lower.split(' ');
    return words.map(function (w) {
      return translations[w] || w;
    }).join(' ').replace(/^\w/, function (c) { return c.toUpperCase(); });
  }

  EX.forEach(function (e) {
    byId[e.id] = e;
    e.displayName = translateEx(e.name);
  });

  var GRP_LABEL = {
    piernas: "Piernas", pecho: "Pecho", espalda: "Espalda", hombros: "Hombros",
    biceps: "Bíceps", triceps: "Tríceps", core: "Core"
  };

  // Rutina fija de 4 semanas: Superior / Piernas, siempre los mismos ejercicios.
  var PLAN_SUPERIOR = [
    { id: "0025", scheme: "4 × 6-10", rest: "2-3 min" },
    { id: "0818", scheme: "4 × 8-12", rest: "2-3 min" },
    { id: "3545", scheme: "3 × 8-12", rest: "90 s" },
    { id: "0180", scheme: "3 × 8-12", rest: "90 s" },
    { id: "0869", scheme: "3 × 8-12", rest: "90 s" },
    { id: "0178", scheme: "3 × 12-15", rest: "60 s" },
    { id: "0391", scheme: "3 × 8-12", rest: "60 s" },
    { id: "0186", scheme: "3 × 10-15", rest: "60 s" }
  ];
  var PLAN_PIERNA = [
    { id: "0770", scheme: "4 × 6-10", rest: "2-3 min" },
    { id: "0739", scheme: "3 × 10-12", rest: "2-3 min" },
    { id: "0768", scheme: "3 × 8-12 (por pierna)", rest: "90 s" },
    { id: "0586", scheme: "4 × 8-12", rest: "90 s" },
    { id: "0585", scheme: "3 × 12-15", rest: "60 s" },
    { id: "0228", scheme: "3 × 12-15 (por pierna)", rest: "60 s" },
    { id: "0594", scheme: "4 × 12-20", rest: "60 s" }
  ];

  function pools() {
    var p = {};
    EX.forEach(function (e) { (p[e.grp] = p[e.grp] || []).push(e); });
    return p;
  }

  // --- registro de pesos ---
  function logsFor(id) { return load(K_LOGS, {})[id] || []; }
  function addLog(id, w, r, s, d) {
    d = d || new Date().toISOString().slice(0, 10);
    var all = load(K_LOGS, {});
    all[id] = all[id] || [];
    var existing = all[id].find(function (x) { return x.d === d; });
    if (existing) { existing.w = w; existing.r = r; existing.s = s; }
    else { all[id].push({ d: d, w: w, r: r, s: s }); }
    save(K_LOGS, all);
  }
  function lastLog(id) { var l = logsFor(id); return l.length ? l[l.length - 1] : null; }
  function fmtLast(x) {
    return fmtW(x.w) + " × " + (x.r != null ? x.r : "-") + " reps" + (x.s != null ? " × " + x.s + " series" : "");
  }
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
    Object.keys(GRP_LABEL).forEach(function (g) { counts[g] = 0; });

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
  var PLAN_DAYS = [["Superior", PLAN_SUPERIOR], ["Piernas", PLAN_PIERNA]];
  function renderRoutine() {
    var html = '<div class="card"><h2 style="margin:0 0 10px; font-size:15px;">Progresión · 4 semanas</h2>' +
      '<div style="font-size:13px; color:var(--dim); line-height:1.6;">' +
      '<b style="color:var(--txt);">Semana 1:</b> peso con el que llegás al rango bajo dejando 2 repes en reserva. Anotá todo.<br>' +
      '<b style="color:var(--txt);">Semana 2:</b> mismo peso, sumá 1-2 repes por serie.<br>' +
      '<b style="color:var(--txt);">Semana 3:</b> seguí sumando repes, con 1 repe en reserva.<br>' +
      '<b style="color:var(--txt);">Semana 4:</b> si llegaste al tope del rango, subí peso (+2,5 kg máquina, +1-2,5 kg mancuerna) y volvé al rango bajo.' +
      '</div></div>';
    PLAN_DAYS.forEach(function (pair) {
      var label = pair[0], plan = pair[1];
      html += '<h2 class="day-title"><span>Día</span> ' + esc(label) + '</h2><div class="card day-card" data-day="' + esc(label) + '">';
      plan.forEach(function (item) {
        var e = byId[item.id]; if (!e) return;
        var last = lastLog(item.id);
        var defaultSets = (item.scheme.match(/^(\d+)/) || [])[1] || "";
        html += '<div class="ex" data-id="' + item.id + '">' +
          '<div class="ex-head"><div><div class="ex-name">' + esc(e.displayName) + '</div>' +
          '<div class="ex-meta"><span class="badge grp">' + GRP_LABEL[e.grp] + '</span>' +
          '<span class="badge">' + esc(e.eq) + '</span>' +
          '<span class="badge">Descanso ' + item.rest + '</span></div></div>' +
          '<div class="scheme">' + item.scheme + '</div></div>' +
          '<div class="last">' + (last ? "Última vez: " + fmtLast(last) + " · " + last.d : "") + '</div>' +
          '<div class="log">' +
          '<input type="number" inputmode="decimal" class="w" placeholder="kg" value="' + (last ? last.w : "") + '">' +
          '<input type="number" inputmode="numeric" class="r" placeholder="reps" value="' + (last ? (last.r || "") : "") + '">' +
          '<input type="number" inputmode="numeric" class="s" placeholder="series" value="' + (last && last.s != null ? last.s : defaultSets) + '">' +
          '<button class="save">Guardar</button>' +
          '<button class="linkbtn togif">ver ejercicio</button>' +
          '</div>' +
          '<div class="gifbox"></div>' +
          '</div>';
      });
      html += '<button class="primary save-day-btn" style="margin-top:10px;">Guardar sesión ' + esc(label) + ' completa</button>';
      html += "</div>";
    });
    elRoutine.innerHTML = html;
  }

  // --- render sesiones ---
  var elSessionsList = document.getElementById("sessions-list");
  // Quita del histórico (K_LOGS) las entradas de un ejercicio en una fecha dada.
  function removeLogEntriesOn(id, date) {
    var all = load(K_LOGS, {});
    if (!all[id]) return;
    all[id] = all[id].filter(function (x) { return x.d !== date; });
    save(K_LOGS, all);
  }
  function renderSessionsList() {
    var sessions = getSessions();
    var dates = Object.keys(sessions).sort().reverse();
    if (!dates.length) { elSessionsList.innerHTML = '<p class="empty">Aún no registraste sesiones. Guardalas desde la pestaña Rutina.</p>'; return; }
    var html = '';
    dates.slice(0, 10).forEach(function (d) {
      html += '<div class="card" style="margin-top: 14px;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
        '<div style="font-weight: 600; font-size: 14px;">' + d + '</div>' +
        '<button class="session-delete-btn" data-date="' + d + '" style="background: none; border: none; color: var(--dim); cursor: pointer; font-size: 14px; padding: 4px 8px;">🗑️</button>' +
        '</div>';
      sessions[d].forEach(function (ex, idx) {
        var e = byId[ex.id];
        if (!e) return;
        html += '<div style="font-size: 13px; padding: 8px; background: var(--bg); border-radius: 6px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">' +
          '<div><span style="color: var(--txt);">' + esc(e.displayName) + '</span> <b style="color: var(--acc);">' + fmtW(ex.w) + ' × ' + (ex.r || '-') + '</b></div>' +
          '<div style="display:flex; gap:4px;">' +
          '<button class="exercise-edit-btn" data-date="' + d + '" data-index="' + idx + '" style="background: none; border: none; color: var(--dim); cursor: pointer; font-size: 12px; padding: 0 6px;">✏️</button>' +
          '<button class="exercise-delete-btn" data-date="' + d + '" data-index="' + idx + '" style="background: none; border: none; color: var(--dim); cursor: pointer; font-size: 12px; padding: 0 6px;">🗑️</button>' +
          '</div>' +
          '</div>';
      });
      html += '</div>';
    });
    elSessionsList.innerHTML = html;

    document.querySelectorAll(".session-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var date = this.dataset.date;
        if (confirm("¿Eliminar toda la sesión del " + date + "?")) {
          var sessions = getSessions();
          (sessions[date] || []).forEach(function (ex) { removeLogEntriesOn(ex.id, date); });
          delete sessions[date];
          save(K_SESSIONS, sessions);
          toast("Sesión eliminada");
          renderSessionsList();
          renderHistory();
        }
      });
    });

    document.querySelectorAll(".exercise-edit-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var date = this.dataset.date;
        var idx = parseInt(this.dataset.index, 10);
        var sessions = getSessions();
        var ex = sessions[date][idx];
        var e = byId[ex.id];
        var newW = prompt("Peso (kg) para " + e.displayName + ":", ex.w || "");
        if (newW !== null) {
          var newR = prompt("Reps:", ex.r || "");
          var w2 = isNaN(parseFloat(newW)) ? null : parseFloat(newW);
          var r2 = isNaN(parseInt(newR, 10)) ? null : parseInt(newR, 10);
          sessions[date][idx] = { id: ex.id, w: w2, r: r2 };
          save(K_SESSIONS, sessions);
          removeLogEntriesOn(ex.id, date);
          if (w2 != null) addLog(ex.id, w2, r2, null, date);
          toast("Ejercicio modificado");
          renderSessionsList();
          renderHistory();
        }
      });
    });

    document.querySelectorAll(".exercise-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var date = this.dataset.date;
        var idx = parseInt(this.dataset.index, 10);
        var sessions = getSessions();
        var ex = sessions[date][idx];
        var e = byId[ex.id];
        if (confirm("¿Eliminar " + (e ? e.displayName : "este ejercicio") + " del " + date + "?")) {
          removeLogEntriesOn(ex.id, date);
          sessions[date].splice(idx, 1);
          if (!sessions[date].length) delete sessions[date];
          save(K_SESSIONS, sessions);
          toast("Ejercicio eliminado");
          renderSessionsList();
          renderHistory();
        }
      });
    });
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
  var historyViewMode = "exercise";
  function renderHistory() {
    if (historyViewMode === "day") { renderHistoryByDay(); return; }
    renderHistoryByExercise();
  }
  function renderHistoryByExercise() {
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
        return '<div class="hrow"><span>' + x.d + isPr + '</span><b>' + fmtLast(x) + '</b></div>';
      }).join("");
      html += '<div class="card hgroup"><div class="hname">' + esc(e.displayName) + '</div>' +
        '<div class="ex-meta"><span class="badge grp">' + GRP_LABEL[e.grp] + '</span>' +
        '<span class="badge">Récord: ' + fmtW(pr) + '</span></div>' +
        '<div class="spark">' + bars + '</div>' + rows + '</div>';
    });
    elHistory.innerHTML = html;
  }
  function renderHistoryByDay() {
    var all = load(K_LOGS, {});
    var byDate = {};
    Object.keys(all).forEach(function (id) {
      if (!byId[id]) return;
      all[id].forEach(function (x) {
        (byDate[x.d] = byDate[x.d] || []).push({ id: id, w: x.w, r: x.r, s: x.s });
      });
    });
    var dates = Object.keys(byDate).sort().reverse();
    if (!dates.length) { elHistory.innerHTML = '<p class="empty">Aún no registraste pesos.<br>Guarda el peso de un ejercicio y aparecerá aquí tu progreso 📈</p>'; return; }
    var html = "";
    dates.forEach(function (d) {
      html += '<div class="card hgroup"><div class="hname">' + d + '</div>';
      byDate[d].forEach(function (x) {
        var e = byId[x.id]; if (!e) return;
        html += '<div class="hrow"><span>' + esc(e.displayName) + '</span><b>' + fmtLast(x) + '</b></div>';
      });
      html += '</div>';
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
      if (b.dataset.view === "sesiones") renderSessionsList();
      if (b.dataset.view === "analisis") renderAnalysis();
    });
  });

  document.getElementById("hist-by-exercise").addEventListener("click", function () {
    historyViewMode = "exercise";
    document.getElementById("hist-by-exercise").classList.add("active");
    document.getElementById("hist-by-day").classList.remove("active");
    renderHistory();
  });
  document.getElementById("hist-by-day").addEventListener("click", function () {
    historyViewMode = "day";
    document.getElementById("hist-by-day").classList.add("active");
    document.getElementById("hist-by-exercise").classList.remove("active");
    renderHistory();
  });


  // Guarda un ejercicio en el histórico y en la sesión de hoy (actualiza si ya estaba).
  function saveExerciseToday(id, w, r, s, sessions, today) {
    addLog(id, w, r, s);
    sessions[today] = sessions[today] || [];
    var exists = sessions[today].find(function (ex) { return ex.id === id; });
    if (exists) { exists.w = w; exists.r = r; exists.s = s; }
    else { sessions[today].push({ id: id, w: w, r: r, s: s }); }
  }

  elRoutine.addEventListener("click", function (ev) {
    if (ev.target.classList.contains("save-day-btn")) {
      var dayCard = ev.target.closest(".day-card");
      var today0 = new Date().toISOString().slice(0, 10);
      var sessions0 = getSessions();
      var count = 0;
      dayCard.querySelectorAll(".ex").forEach(function (exEl2) {
        var w2 = parseFloat(exEl2.querySelector(".w").value);
        if (isNaN(w2)) return;
        var r2 = parseInt(exEl2.querySelector(".r").value, 10);
        var s2 = parseInt(exEl2.querySelector(".s").value, 10);
        r2 = isNaN(r2) ? null : r2;
        s2 = isNaN(s2) ? null : s2;
        saveExerciseToday(exEl2.dataset.id, w2, r2, s2, sessions0, today0);
        exEl2.querySelector(".last").textContent = "Última vez: " + fmtLast({ w: w2, r: r2, s: s2 }) + " · hoy";
        count++;
      });
      if (!count) { toast("Completa el peso de al menos un ejercicio"); return; }
      save(K_SESSIONS, sessions0);
      toast("Sesión " + dayCard.dataset.day + " guardada: " + count + " ejercicio(s) ✔");
      return;
    }
    var exEl = ev.target.closest(".ex"); if (!exEl) return;
    var id = exEl.dataset.id;
    if (ev.target.classList.contains("save")) {
      var w = parseFloat(exEl.querySelector(".w").value);
      var r = parseInt(exEl.querySelector(".r").value, 10);
      var s = parseInt(exEl.querySelector(".s").value, 10);
      if (isNaN(w)) { toast("Escribe el peso"); return; }
      s = isNaN(s) ? null : s;
      r = isNaN(r) ? null : r;
      var today = new Date().toISOString().slice(0, 10);
      var sessions = getSessions();
      saveExerciseToday(id, w, r, s, sessions, today);
      save(K_SESSIONS, sessions);
      exEl.querySelector(".last").textContent = "Última vez: " + fmtLast({ w: w, r: r, s: s }) + " · hoy";
      toast("Guardado ✔");
    } else if (ev.target.classList.contains("togif")) {
      var box = exEl.querySelector(".gifbox"), e = byId[id];
      if (box.dataset.on) { box.innerHTML = ""; box.dataset.on = ""; ev.target.textContent = "ver ejercicio"; return; }
      box.innerHTML = (e.gif ? '<img class="gif" loading="lazy" src="' + GIF_BASE + e.gif + '" alt="">' : "") +
        (e.ins ? '<p class="ins">' + esc(e.ins) + '</p>' : "");
      box.dataset.on = "1"; ev.target.textContent = "ocultar";
    }
  });

  // --- autenticación / sincronización en la nube ---
  function updateAuthUI() {
    var status = document.getElementById("auth-status");
    var btn = document.getElementById("auth-btn");
    if (currentUser) {
      status.textContent = currentUser.email;
      btn.textContent = "Cerrar sesión";
    } else {
      status.textContent = "Invitado (sin sincronizar)";
      btn.textContent = "Iniciar sesión";
    }
  }

  function refreshAllViews() {
    renderRoutine();
    renderSessionsList();
    renderHistory();
    renderAnalysis();
  }

  function handleAuthChange(user) {
    currentUser = user;
    updateAuthUI();
    if (!user) return;
    window.fb.loadData(user.uid).then(function (cloudData) {
      if (cloudData) {
        if (cloudData.logs) save(K_LOGS, cloudData.logs);
        if (cloudData.sessions) save(K_SESSIONS, cloudData.sessions);
        dedupeSameDateEntries();
        refreshAllViews();
        toast("Datos sincronizados ☁️");
      } else {
        scheduleCloudSync(true);
      }
    }).catch(function () { toast("No se pudo cargar la nube"); });
  }

  if (window.fb) { window.fb.onAuthChange(handleAuthChange); }
  else { window.addEventListener("fb-ready", function () { window.fb.onAuthChange(handleAuthChange); }); }

  document.getElementById("auth-btn").addEventListener("click", function () {
    if (currentUser) {
      window.fb.signOut();
      toast("Sesión cerrada");
    } else {
      document.getElementById("auth-modal").style.display = "flex";
    }
  });
  document.getElementById("auth-close").addEventListener("click", function () {
    document.getElementById("auth-modal").style.display = "none";
  });
  document.getElementById("auth-signin").addEventListener("click", function () {
    var email = document.getElementById("auth-email").value;
    var pw = document.getElementById("auth-password").value;
    if (!email || !pw) { toast("Completa email y contraseña"); return; }
    window.fb.signIn(email, pw).then(function () {
      document.getElementById("auth-modal").style.display = "none";
      toast("Sesión iniciada ✔");
    }).catch(function (e) { toast("Error: " + e.message); });
  });
  document.getElementById("auth-signup").addEventListener("click", function () {
    var email = document.getElementById("auth-email").value;
    var pw = document.getElementById("auth-password").value;
    if (!email || !pw) { toast("Completa email y contraseña"); return; }
    window.fb.signUp(email, pw).then(function () {
      document.getElementById("auth-modal").style.display = "none";
      toast("Cuenta creada ✔");
    }).catch(function (e) { toast("Error: " + e.message); });
  });

  // Limpia duplicados que hayan quedado guardados antes de este arreglo
  // (mismo ejercicio, misma fecha, más de una entrada). Conserva la última.
  function dedupeSameDateEntries() {
    var logs = load(K_LOGS, {});
    var logsChanged = false;
    Object.keys(logs).forEach(function (id) {
      var seen = {}, deduped = [];
      logs[id].forEach(function (x) {
        if (seen.hasOwnProperty(x.d)) { deduped[seen[x.d]] = x; logsChanged = true; }
        else { seen[x.d] = deduped.length; deduped.push(x); }
      });
      logs[id] = deduped;
    });
    if (logsChanged) save(K_LOGS, logs);

    var sessions = load(K_SESSIONS, {});
    var sessionsChanged = false;
    Object.keys(sessions).forEach(function (d) {
      var seen = {}, deduped = [];
      sessions[d].forEach(function (ex) {
        if (seen.hasOwnProperty(ex.id)) { deduped[seen[ex.id]] = ex; sessionsChanged = true; }
        else { seen[ex.id] = deduped.length; deduped.push(ex); }
      });
      sessions[d] = deduped;
    });
    if (sessionsChanged) save(K_SESSIONS, sessions);
  }

  // --- init ---
  dedupeSameDateEntries();
  renderRoutine();
})();
