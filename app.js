(() => {
  "use strict";
  const PH = window.PH;
  const { THINGS, SHAPES, MAP, GAME_NAMES, P, T } = PH;

  // ================= Tiện ích =================
  const $ = (id) => document.getElementById(id);
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fill = (n, v) => Array(n).fill(v);
  const ROUND_LEN = 10;

  // ================= Lưu tiến trình =================
  const SAVE_KEY = "bht_v2";
  const DEF = { coins: 0, earned: 0, best: {}, level: {}, review: {}, owned: [], guide: "bear", voice: true, music: true, sfx: true };
  let S = (() => {
    try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch { return Object.assign({}, DEF); }
  })();
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} };

  const friends = () => MAP.filter((m) => S.earned >= m.need).map((m) => m.friend);
  const guide = () => (friends().find((f) => f.id === S.guide) || MAP[0].friend);

  // ================= Âm thanh =================
  let ac = null;
  function ctx() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); }
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  }
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
    const c = ctx(); if (!c) return;
    try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch {}
  }
  document.addEventListener("pointerdown", unlockAudio, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!ac) return;
    if (document.hidden) ac.suspend().catch(() => {}); else ac.resume().catch(() => {});
  });

  function tone(freq, start, dur, type = "sine", vol = 0.25) {
    if (!S.sfx) return;
    const c = ctx(); if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      const t = c.currentTime + start;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch {}
  }
  const sfx = {
    tap() { tone(660, 0, 0.08, "triangle", 0.15); },
    pop() { tone(880 + Math.random() * 200, 0, 0.07, "sine", 0.12); },
    good() { tone(523, 0, 0.15); tone(659, 0.1, 0.15); tone(784, 0.2, 0.3); },
    bad() { tone(220, 0, 0.18, "square", 0.07); tone(196, 0.15, 0.25, "square", 0.07); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.25, "triangle", 0.2)); },
    up() { [523, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.2, "triangle", 0.18)); },
  };

  // ---------- Nhạc nền nhẹ (tự tạo) ----------
  const MEL = [64, 0, 67, 0, 69, 67, 64, 0, 62, 0, 64, 0, 67, 0, 0, 0, 64, 0, 67, 0, 72, 69, 67, 0, 69, 0, 67, 64, 62, 0, 60, 0];
  const BASS = [48, 53, 55, 48];
  const MUSIC_VOL = 0.05;
  let musicTimer = null, musicGain = null, nextT = 0, step = 0;
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function note(m, t, d, type, v) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = midi(m);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(musicGain); o.start(t); o.stop(t + d + 0.05);
  }
  function scheduleMusic() {
    if (!musicGain) return;
    const spb = 60 / 96 / 2;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.4) {
      const m = MEL[step % MEL.length];
      if (m) note(m, nextT, spb * 1.8, "triangle", 0.6);
      if (step % 8 === 0) note(BASS[Math.floor(step / 8) % BASS.length], nextT, spb * 7, "sine", 0.7);
      nextT += spb; step++;
    }
  }
  function startMusic() {
    if (!S.music || musicTimer) return;
    const c = ctx(); if (!c) return;
    musicGain = c.createGain(); musicGain.gain.value = MUSIC_VOL; musicGain.connect(c.destination);
    nextT = c.currentTime + 0.1; step = 0;
    musicTimer = setInterval(scheduleMusic, 120);
  }
  function stopMusic() {
    clearInterval(musicTimer); musicTimer = null;
    if (musicGain) { try { musicGain.disconnect(); } catch {} musicGain = null; }
  }
  function duckMusic(sec) {
    if (!musicGain) return;
    const t = ac.currentTime, g = musicGain.gain;
    g.cancelScheduledValues(t); g.setTargetAtTime(MUSIC_VOL * 0.3, t, 0.05); g.setTargetAtTime(MUSIC_VOL, t + sec + 0.2, 0.3);
  }

  // ---------- Giọng đọc ----------
  const bufCache = new Map();
  let voiceToken = 0, voiceSrc = null;
  function loadBuf(text) {
    const url = "voice/" + PH.hash(text) + ".mp3";
    if (!bufCache.has(url)) {
      const c = ctx();
      const p = fetch(url)
        .then((r) => { if (!r.ok) throw new Error("missing"); return r.arrayBuffer(); })
        .then((ab) => new Promise((res, rej) => c.decodeAudioData(ab, res, rej)));
      p.catch(() => bufCache.delete(url));
      bufCache.set(url, p);
    }
    return bufCache.get(url);
  }
  const preload = (text) => { if (S.voice && text && ctx()) loadBuf(text).catch(() => {}); };
  function stopVoice() {
    voiceToken++;
    if (voiceSrc) { try { voiceSrc.stop(); } catch {} voiceSrc = null; }
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch {}
  }
  function fallbackTTS(text) {
    return new Promise((res) => {
      try {
        const v = speechSynthesis.getVoices().find((v) => /^vi/i.test(v.lang));
        if (!v) return res();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = v; u.lang = v.lang; u.rate = 0.9;
        u.onend = u.onerror = () => res();
        setTimeout(res, 1500 + text.length * 120);
        speechSynthesis.speak(u);
      } catch { res(); }
    });
  }
  function speakOne(text, tok) {
    return new Promise((resolve) => {
      const c = ctx();
      if (!c) return fallbackTTS(text).then(resolve);
      loadBuf(text).then((buf) => {
        if (tok !== voiceToken) return resolve();
        const s = c.createBufferSource(); s.buffer = buf; s.connect(c.destination);
        s.onended = () => { if (voiceSrc === s) voiceSrc = null; resolve(); };
        voiceSrc = s; duckMusic(buf.duration); s.start();
      }).catch(() => { if (tok !== voiceToken) return resolve(); fallbackTTS(text).then(resolve); });
    });
  }
  async function sayList(list) {
    stopVoice();
    if (!S.voice) return;
    const tok = voiceToken;
    for (const t of list.filter(Boolean)) { if (tok !== voiceToken) return; await speakOne(t, tok); }
  }
  const say = (text) => sayList([text]);

  // ================= Hình vẽ =================
  const COLORS = ["#ff6b6b", "#4cc9f0", "#ffb703", "#80c342", "#9b5de5", "#f15bb5", "#fb8500"];
  function starPts(cx, cy, R, r) {
    const p = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; p.push((cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1)); }
    return p.join(" ");
  }
  function shapeSVG(id, color, size) {
    const st = `fill="${color}" stroke="rgba(0,0,0,.18)" stroke-width="3"`;
    const body = {
      circle: `<circle cx="50" cy="50" r="42" ${st}/>`,
      square: `<rect x="12" y="12" width="76" height="76" rx="4" ${st}/>`,
      triangle: `<polygon points="50,8 94,90 6,90" ${st} stroke-linejoin="round"/>`,
      rect: `<rect x="3" y="26" width="94" height="48" rx="4" ${st}/>`,
      star: `<polygon points="${starPts(50, 53, 46, 19)}" ${st} stroke-linejoin="round"/>`,
      heart: `<path d="M50 88 C20 65 4 48 4 30 C4 15 16 6 28 6 C38 6 46 12 50 20 C54 12 62 6 72 6 C84 6 96 15 96 30 C96 48 80 65 50 88Z" ${st}/>`,
      diamond: `<polygon points="50,3 88,50 50,97 12,50" ${st} stroke-linejoin="round"/>`,
      oval: `<ellipse cx="50" cy="50" rx="47" ry="30" ${st}/>`,
    }[id];
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
  }
  function clockSVG(h, half) {
    const hourA = ((h % 12) + (half ? 0.5 : 0)) * 30, minA = half ? 180 : 0;
    let nums = "", ticks = "";
    for (let i = 1; i <= 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180;
      nums += `<text x="${(100 + 72 * Math.cos(a)).toFixed(1)}" y="${(100 + 72 * Math.sin(a)).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="800" fill="#3d2c1e" stroke="#fff" stroke-width="4" paint-order="stroke">${i}</text>`;
    }
    for (let i = 0; i < 60; i++) {
      const a = i * 6 * Math.PI / 180, r1 = i % 5 ? 88 : 84;
      ticks += `<line x1="${(100 + r1 * Math.sin(a)).toFixed(1)}" y1="${(100 - r1 * Math.cos(a)).toFixed(1)}" x2="${(100 + 92 * Math.sin(a)).toFixed(1)}" y2="${(100 - 92 * Math.cos(a)).toFixed(1)}" stroke="#bba58c" stroke-width="${i % 5 ? 1.5 : 3}"/>`;
    }
    return `<svg viewBox="0 0 200 200" class="clock" aria-label="đồng hồ">
      <circle cx="100" cy="100" r="97" fill="#fff" stroke="#ffb703" stroke-width="6"/>
      ${ticks}
      <line x1="100" y1="100" x2="100" y2="48" stroke="#fb8500" stroke-width="9" stroke-linecap="round" transform="rotate(${hourA} 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="24" stroke="#4361ee" stroke-width="5" stroke-linecap="round" transform="rotate(${minA} 100 100)"/>
      ${nums}
      <circle cx="100" cy="100" r="7" fill="#3d2c1e"/>
    </svg>`;
  }
  const NOTE_COLOR = { 1: "#c8b6e2", 2: "#d9b48f", 5: "#8ecae6", 10: "#e9c46a" };
  const noteHTML = (v) => `<div class="note" style="--c:${NOTE_COLOR[v]}"><span class="nv">${v}</span><span class="nu">nghìn</span></div>`;

  // ================= Các trò chơi =================
  const LV = (lv, arr) => arr[Math.min(lv, arr.length) - 1];
  function numberChoices(correct, min, max, count = 3) {
    const set = new Set([correct]);
    let guard = 0;
    while (set.size < count && guard++ < 100) {
      const v = correct + pick([-2, -1, 1, 2]);
      if (v >= min && v <= max) set.add(v);
    }
    while (set.size < count) set.add(rand(min, max));
    return shuffle([...set]);
  }
  const numAnswers = (correct, min, max) => numberChoices(correct, min, max).map((v) => ({ label: v, value: v }));

  const GAMES = [
    {
      id: "count", ico: "🔢", color: "#fb8500", maxLevel: 4,
      gen(lv) { const [lo, hi] = LV(lv, [[1, 5], [1, 10], [6, 15], [11, 20]]); return { n: rand(lo, hi), t: rand(0, THINGS.length - 1) }; },
      build(p) {
        const t = THINGS[p.t];
        return {
          say: P.count(t), q: `Có mấy ${t.e}?`, sub: "Chạm vào từng cái để đếm nhé",
          stage: [{ box: fill(p.n, t.e), tap: true }],
          answers: numAnswers(p.n, 1, 20), correct: p.n, reveal: P.num(p.n), hint: "count",
        };
      },
    },
    {
      id: "find", ico: "🔍", color: "#4cc9f0", maxLevel: 3,
      gen(lv) { const [lo, hi] = LV(lv, [[1, 5], [1, 10], [5, 15]]); return { n: rand(lo, hi), t: rand(0, THINGS.length - 1) }; },
      build(p) {
        const t = THINGS[p.t];
        return {
          say: P.find(p.n, t), q: `Nhóm nào có <b class="hl">${p.n}</b> ${t.e}?`,
          boxes: numberChoices(p.n, 1, 20).map((k) => ({ items: fill(k, t.e), value: k })),
          correct: p.n, reveal: P.num(p.n), hint: "look",
        };
      },
    },
    {
      id: "more", ico: "⚖️", color: "#9b5de5", maxLevel: 4,
      gen(lv) {
        const [hi, minDiff, lessRate] = LV(lv, [[6, 2, 0], [10, 1, 0], [10, 1, 0.5], [15, 1, 0.5]]);
        let a, b;
        do { a = rand(1, hi); b = rand(1, hi); } while (Math.abs(a - b) < minDiff);
        return { a, b, t: rand(0, THINGS.length - 1), less: Math.random() < lessRate };
      },
      build(p) {
        const t = THINGS[p.t];
        return {
          say: p.less ? P.less(t) : P.more(t),
          q: p.less ? `Bên nào <b class="hl">ít</b> ${t.e} hơn?` : `Bên nào <b class="hl">nhiều</b> ${t.e} hơn?`,
          boxes: [{ items: fill(p.a, t.e), value: p.a }, { items: fill(p.b, t.e), value: p.b }],
          correct: p.less ? Math.min(p.a, p.b) : Math.max(p.a, p.b), hint: "look",
        };
      },
    },
    {
      id: "add", ico: "➕", color: "#80c342", maxLevel: 4,
      gen(lv) {
        const [lo, hi] = LV(lv, [[2, 5], [3, 10], [6, 15], [10, 20]]);
        const sum = rand(lo, hi), a = rand(1, sum - 1);
        return { a, b: sum - a, t: rand(0, THINGS.length - 1) };
      },
      build(p) {
        const t = THINGS[p.t], sum = p.a + p.b;
        return {
          say: P.add(p.a, p.b), q: `${p.a} + ${p.b} = ?`,
          stage: [{ box: fill(p.a, t.e) }, { op: "+" }, { box: fill(p.b, t.e) }],
          answers: numAnswers(sum, 0, 20), correct: sum, reveal: P.num(sum), hint: "count",
        };
      },
    },
    {
      id: "sub", ico: "➖", color: "#f15bb5", maxLevel: 4,
      gen(lv) {
        const [lo, hi] = LV(lv, [[2, 5], [3, 10], [6, 15], [10, 20]]);
        const a = rand(lo, hi);
        return { a, b: rand(1, a - 1), t: rand(0, THINGS.length - 1) };
      },
      build(p) {
        const t = THINGS[p.t], r = p.a - p.b;
        return {
          say: P.sub(p.a, p.b), q: `${p.a} − ${p.b} = ?`, sub: `${t.go} ${p.b} ${t.unit}, còn lại mấy ${t.unit}?`,
          stage: [{ box: fill(p.a, t.e), gone: p.b }],
          answers: numAnswers(r, 0, 20), correct: r, reveal: P.num(r), hint: "count",
        };
      },
    },
    {
      id: "trace", ico: "✏️", color: "#ef476f", maxLevel: 3,
      gen(lv) { const [lo, hi] = LV(lv, [[1, 5], [0, 9], [10, 20]]); return { n: rand(lo, hi) }; },
      build(p) { return { kind: "trace", say: P.trace(p.n), q: `Tô số <b class="hl">${p.n}</b>`, sub: "Dùng ngón tay tô theo nét số", n: p.n, reveal: P.num(p.n) }; },
    },
    {
      id: "shapes", ico: "🔷", color: "#06d6a0", maxLevel: 3,
      gen(lv) {
        if (lv >= 3) {
          const s = rand(0, SHAPES.length - 1), cnt = rand(1, 5), total = rand(Math.max(cnt + 2, 6), 9);
          const items = shuffle([...fill(cnt, s), ...Array.from({ length: total - cnt }, () => { let o; do { o = rand(0, SHAPES.length - 1); } while (o === s); return o; })]);
          return { mode: "count", s, items };
        }
        const pool = lv === 1 ? [0, 1, 2, 3] : SHAPES.map((_, i) => i);
        const opts = shuffle(pool).slice(0, 3);
        return { mode: "find", s: pick(opts), opts };
      },
      build(p) {
        const s = SHAPES[p.s];
        if (p.mode === "count") {
          const cnt = p.items.filter((i) => i === p.s).length;
          return {
            say: P.shapeCount(s), q: `Có mấy ${s.n}? ${shapeSVG(s.id, "#ffb703", 34)}`,
            stage: [{ html: `<div class="shape-row">${p.items.map((i) => shapeSVG(SHAPES[i].id, pick(COLORS), 86)).join("")}</div>` }],
            answers: numAnswers(cnt, 1, 9), correct: cnt, reveal: P.num(cnt), hint: "look",
          };
        }
        return {
          say: P.shapeFind(s), q: `Đâu là <b class="hl">${s.n}</b>?`,
          boxes: p.opts.map((i) => ({ html: shapeSVG(SHAPES[i].id, pick(COLORS), 124), value: i })),
          correct: p.s, reveal: s.n, hint: "look",
        };
      },
    },
    {
      id: "pattern", ico: "🧩", color: "#118ab2", maxLevel: 4,
      gen(lv) {
        if (lv >= 4) {
          const down = Math.random() < 0.3, stepN = down ? -1 : pick([1, 1, 2]);
          const start = down ? rand(8, 15) : rand(1, 8), seq = [0, 1, 2, 3].map((k) => start + k * stepN);
          return { num: true, seq, ans: start + 4 * stepN };
        }
        const POOLS = [["🔴", "🔵", "🟡", "🟢"], ["🍎", "🍌", "🍇", "🍊"], ["🐶", "🐱", "🐰", "🐻"], ["⭐", "🌙", "☁️", "🌈"]];
        const unit = pick(LV(lv, [["AB"], ["AAB", "ABB", "ABC"], ["AABB", "ABCD", "ABCC"]]));
        const pool = shuffle(pick(POOLS)), map = {};
        [...new Set(unit)].forEach((ch, i) => { map[ch] = pool[i]; });
        const len = unit.length * 2 + rand(0, unit.length - 1);
        const full = Array.from({ length: len + 1 }, (_, i) => map[unit[i % unit.length]]);
        return { num: false, seq: full.slice(0, len), ans: full[len], pool };
      },
      build(p) {
        const cells = p.seq.map((x) => `<div class="cell">${x}</div>`).join("") + `<div class="cell q">?</div>`;
        const answers = p.num
          ? numAnswers(p.ans, 0, 30)
          : shuffle([p.ans, ...shuffle(p.pool.filter((x) => x !== p.ans)).slice(0, 2)]).map((x) => ({ label: x, value: x, emoji: true }));
        return {
          say: p.num ? P.patternNum() : P.pattern(), q: p.num ? "Số tiếp theo là số mấy?" : "Tiếp theo là gì nhỉ?",
          stage: [{ html: `<div class="seq">${cells}</div>` }],
          answers, correct: p.ans, reveal: p.num ? P.num(p.ans) : null, hint: "look",
          onCorrect() { const c = document.querySelector("#stage .cell.q"); if (c) { c.textContent = p.ans; c.classList.remove("q"); c.classList.add("done"); } },
        };
      },
    },
    {
      id: "clock", ico: "⏰", color: "#ffb703", maxLevel: 2,
      gen(lv) { return { h: rand(1, 12), half: lv >= 2 && Math.random() < 0.5 }; },
      build(p) {
        const key = (h, half) => `${h}:${half ? 30 : 0}`;
        const opts = [{ h: p.h, half: p.half }];
        if (p.half) opts.push({ h: p.h, half: false });
        while (opts.length < 3) {
          const o = { h: rand(1, 12), half: p.half ? Math.random() < 0.5 : false };
          if (!opts.some((x) => key(x.h, x.half) === key(o.h, o.half))) opts.push(o);
        }
        return {
          say: P.clock(), q: "Đồng hồ chỉ mấy giờ?", sub: "Kim ngắn chỉ giờ, kim dài chỉ phút",
          stage: [{ html: clockSVG(p.h, p.half) }],
          answers: shuffle(opts).map((o) => ({ label: P.time(o.h, o.half), value: key(o.h, o.half), text: true })),
          correct: key(p.h, p.half), reveal: P.time(p.h, p.half), hint: "look",
        };
      },
    },
    {
      id: "money", ico: "💵", color: "#2a9d8f", maxLevel: 4,
      gen(lv) {
        const [kinds, max] = LV(lv, [[[1], 5], [[1, 2], 10], [[1, 2, 5], 15], [[1, 2, 5, 10], 20]]);
        const notes = []; let sum = 0;
        const want = lv === 1 ? rand(1, 5) : rand(2, 4);
        for (let i = 0; i < want; i++) {
          const ok = kinds.filter((k) => sum + k <= max);
          if (!ok.length) break;
          const k = pick(ok); notes.push(k); sum += k;
        }
        return { notes: notes.sort((a, b) => b - a) };
      },
      build(p) {
        const sum = p.notes.reduce((a, b) => a + b, 0);
        return {
          say: P.money(), q: "Có tất cả bao nhiêu tiền?",
          stage: [{ html: `<div class="notes">${p.notes.map(noteHTML).join("")}</div>` }],
          answers: numberChoices(sum, 1, 20).map((v) => ({ label: `${v} nghìn`, value: v, text: true })),
          correct: sum, reveal: P.moneyVal(sum), hint: "look",
        };
      },
    },
  ];
  GAMES.forEach((g) => { g.name = GAME_NAMES[g.id]; });

  // ================= Màn hình =================
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    window.scrollTo(0, 0);
  }

  function renderHome() {
    const g = guide();
    $("homeGuide").textContent = g.e;
    $("coins").textContent = S.coins;
    const box = $("games"); box.innerHTML = "";
    GAMES.forEach((gm, i) => {
      const s = S.best[gm.id] || 0, lv = S.level[gm.id] || 1;
      const b = document.createElement("button");
      b.className = "game-card"; b.style.background = gm.color; b.style.setProperty("--i", i);
      b.innerHTML = `<div class="lv">Cấp ${lv}/${gm.maxLevel}</div><div class="ico">${gm.ico}</div><div class="name">${gm.name}</div>
        <div class="best">${"⭐".repeat(s)}${'<span class="off">⭐</span>'.repeat(3 - s)}</div>`;
      b.onclick = () => { sfx.tap(); startGame(gm); };
      box.appendChild(b);
    });
    show("home");
  }

  // ---------- Vòng chơi ----------
  let game = null, idx = 0, score = 0, results = [], lvl = 1, startLvl = 1, streakOK = 0, streakBad = 0;
  let q = null, curP = null, wrongCount = 0, locked = false, correctEl = null;

  function startGame(gm) {
    game = gm; idx = 0; score = 0; results = [];
    lvl = Math.min(S.level[gm.id] || 1, gm.maxLevel); startLvl = lvl; streakOK = 0; streakBad = 0;
    $("gameGuide").textContent = guide().e;
    show("game");
    nextQuestion();
  }

  function renderDots() {
    const d = $("dots"); d.innerHTML = "";
    for (let i = 0; i < ROUND_LEN; i++) {
      const el = document.createElement("div");
      el.className = "dot" + (i === idx ? " cur" : results[i] === true ? " ok" : results[i] === false ? " retry" : "");
      d.appendChild(el);
    }
    $("lvChip").textContent = "Cấp " + lvl;
  }

  // Số cột trong một nhóm: ít đồ thì xếp gọn thành khối, 7+ thì theo hàng 5 (dễ đếm)
  const colsFor = (n) => (n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 5);
  // Tính cỡ hình lớn nhất vừa màn hình. counts = số đồ vật mỗi nhóm, across = số nhóm đặt cạnh nhau
  function fitSize(counts, across, extraH = 0, cap = 130) {
    const W = Math.min(window.innerWidth, 920) - 32;
    const availH = Math.max(240, window.innerHeight - 400 - extraH);
    const boxW = (W - (across - 1) * 14) / across - 28;
    const maxN = Math.max(1, ...counts);
    const cols = colsFor(maxN);
    const stacks = Math.ceil(counts.length / across);
    const rows = Math.ceil(maxN / cols);
    const byW = (boxW - (cols - 1) * 6) / cols / 1.35; // emoji rộng hơn cỡ chữ khoảng 1.2 lần
    const byH = (availH - stacks * 30) / (stacks * rows) - 6;
    return Math.floor(Math.max(24, Math.min(cap, byW, byH)));
  }
  // Thử mọi cách xếp (1 hàng dọc, 2 cột, 3 cột...) và chọn cách cho hình to nhất
  function bestFit(counts, extraH1, extraH, cap) {
    let best = { isz: 0, across: 1 };
    counts.forEach((_, i) => {
      const isz = fitSize(counts, i + 1, i === 0 ? extraH1 : extraH, cap);
      if (isz > best.isz) best = { isz, across: i + 1 };
    });
    return best;
  }

  function makeBox(items, gone = 0, tap = false) {
    const box = document.createElement("div");
    box.className = "box";
    box.style.gridTemplateColumns = `repeat(${colsFor(items.length)}, auto)`;
    items.forEach((e, k) => {
      const it = document.createElement("div");
      it.className = "item" + (k >= items.length - gone ? " gone" : "");
      it.style.setProperty("--i", k);
      it.innerHTML = `<span>${e}</span>`;
      if (tap) it.onclick = (ev) => { ev.stopPropagation(); tapCount(it); };
      box.appendChild(it);
    });
    return box;
  }

  let tapped = 0;
  function tapCount(it) {
    if (it.dataset.n) return;
    tapped++;
    it.dataset.n = tapped; it.classList.add("counted");
    sfx.pop(); say(P.num(tapped));
  }
  function clearCounts() {
    tapped = 0;
    document.querySelectorAll("#stage .item.counted").forEach((it) => { it.classList.remove("counted"); delete it.dataset.n; });
  }

  async function countAlong() {
    clearCounts();
    const items = [...document.querySelectorAll("#stage .item:not(.gone)")];
    const myQ = q;
    await sayList([T.hintCount]);
    for (const it of items) {
      if (q !== myQ) return;
      tapped++; it.dataset.n = tapped; it.classList.add("counted");
      await Promise.all([say(P.num(tapped)), sleep(550)]);
    }
  }

  function setBubble(qq) {
    $("question").innerHTML = qq.q + (qq.sub ? `<div class="sub">${qq.sub}</div>` : "");
  }

  function nextQuestion() {
    locked = false; wrongCount = 0; correctEl = null; tapped = 0;
    let p = null;
    const rv = S.review[game.id] || [];
    if (idx % 3 === 1 && rv.length) { p = rv.shift(); save(); }
    if (!p) p = game.gen(lvl);
    curP = p; q = game.build(p);
    renderDots();
    setBubble(q);
    const stage = $("stage"), ans = $("answers");
    stage.innerHTML = ""; ans.innerHTML = "";
    stage.className = "stage"; stage.style.flexDirection = "";

    if (q.kind === "trace") { renderTrace(q); say(q.say); return; }

    if (q.stage) {
      const boxes = q.stage.filter((s) => s.box);
      const ops = q.stage.filter((s) => s.op).length;
      const counts = boxes.map((s) => s.box.length);
      const { isz, across } = bestFit(counts, ops * 80, 0);
      stage.style.flexDirection = across === 1 ? "column" : "row";
      q.stage.forEach((s) => {
        if (s.box) {
          const b = makeBox(s.box, s.gone, s.tap);
          b.style.setProperty("--isz", isz + "px");
          stage.appendChild(b);
        } else if (s.op) {
          const o = document.createElement("div"); o.className = "op"; o.textContent = s.op; stage.appendChild(o);
        } else if (s.html) {
          const d = document.createElement("div"); d.className = "html-wrap"; d.innerHTML = s.html; stage.appendChild(d);
        }
      });
    }

    if (q.boxes) {
      const wrap = document.createElement("div");
      wrap.className = "choice-boxes" + (q.boxes.length === 2 ? " two" : "");
      // các nhóm chính là đáp án nên không cần chừa chỗ cho hàng nút; chọn cách xếp cho hình to nhất
      const counts = q.boxes.map((b) => (b.items ? b.items.length : 1));
      const { isz, across } = bestFit(counts, -150, -150, 90);
      wrap.style.gridTemplateColumns = `repeat(${across}, auto)`;
      q.boxes.forEach((bx) => {
        let b;
        if (bx.items) {
          b = makeBox(bx.items);
          b.style.setProperty("--isz", isz + "px");
        } else {
          b = document.createElement("div"); b.className = "box shape-box"; b.innerHTML = bx.html;
        }
        b.classList.add("tap");
        b.onclick = () => answer(bx.value === q.correct, b);
        if (bx.value === q.correct) correctEl = b;
        wrap.appendChild(b);
      });
      stage.appendChild(wrap);
    }

    if (q.answers) {
      q.answers.forEach((a, k) => {
        const b = document.createElement("button");
        b.className = "ans" + (a.text ? " txt" : "") + (a.emoji ? " emo" : "");
        b.textContent = a.label;
        b.style.background = COLORS[(k + idx) % COLORS.length];
        b.style.setProperty("--i", k);
        b.onclick = () => answer(a.value === q.correct, b);
        if (a.value === q.correct) correctEl = b;
        ans.appendChild(b);
      });
    }

    say(q.say);
    // tải trước giọng các câu sắp dùng
    preload(q.reveal);
  }

  function mascot(kind) {
    const m = $("gameGuide");
    m.classList.remove("happy", "sad"); void m.offsetWidth; m.classList.add(kind);
  }

  function pushReview(p) {
    const list = S.review[game.id] || (S.review[game.id] = []);
    const k = JSON.stringify(p);
    if (!list.some((x) => JSON.stringify(x) === k)) list.push(p);
    while (list.length > 8) list.shift();
    save();
  }

  function recordResult(first) {
    results[idx] = first;
    if (first) {
      score++; streakOK++; streakBad = 0;
      if (streakOK >= 3 && lvl < game.maxLevel) { lvl++; streakOK = 0; levelUpFx(); }
    } else {
      streakBad++; streakOK = 0;
      if (streakBad >= 2 && lvl > 1) { lvl--; streakBad = 0; }
    }
  }

  function levelUpFx() {
    const c = $("lvChip");
    c.classList.remove("up"); void c.offsetWidth; c.classList.add("up");
    setTimeout(() => sfx.up(), 400);
  }

  async function answer(ok, el, opts = {}) {
    if (locked) return;
    if (ok) {
      locked = true;
      const first = wrongCount === 0;
      el.classList.add("good");
      mascot("happy");
      sfx.good();
      if (first) recordResult(true); // câu sai đã được ghi khi bé chọn sai lần đầu
      if (q.onCorrect) q.onCorrect();
      const pr = opts.praise || (first ? pick(T.praise) : T.okAfterRetry);
      praise(pr);
      if (first) confetti(18);
      const myQ = q;
      await Promise.race([Promise.all([sayList([pr, q.reveal]), sleep(1100)]), sleep(4500)]);
      if (q !== myQ) return;
      await sleep(250);
      idx++;
      if (idx >= ROUND_LEN) finish(); else nextQuestion();
      return;
    }
    // Sai: bé được thử lại, câu này không tính điểm và sẽ được ôn lại sau
    wrongCount++;
    if (wrongCount === 1) { recordResult(false); pushReview(curP); renderDots(); }
    sfx.bad(); mascot("sad");
    if (el) {
      el.classList.remove("wrong"); void el.offsetWidth; el.classList.add("wrong");
      if (!opts.keep) { if (el.tagName === "BUTTON") el.disabled = true; else el.onclick = null; }
    }
    const wrongLine = opts.wrongSay || pick(T.wrong);
    if (wrongCount === 2 && q.hint === "count") {
      await sayList([wrongLine]);
      countAlong();
    } else if (wrongCount === 2 && correctEl) {
      sayList([wrongLine, T.hintLook]);
      correctEl.classList.add("hint");
    } else {
      say(wrongLine);
    }
  }

  function praise(text) {
    const p = $("praise");
    p.textContent = text + " 🎉";
    p.classList.remove("show"); void p.offsetWidth; p.classList.add("show");
  }

  function confetti(n) {
    const colors = ["#ffb703", "#4cc9f0", "#9b5de5", "#80c342", "#f15bb5", "#fb8500"];
    for (let i = 0; i < n; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = rand(0, 100) + "vw";
      c.style.background = pick(colors);
      document.body.appendChild(c);
      const anim = c.animate(
        [{ transform: "translateY(0) rotate(0deg)" },
         { transform: `translateY(${window.innerHeight + 40}px) translateX(${rand(-80, 80)}px) rotate(${rand(360, 900)}deg)` }],
        { duration: rand(1200, 2200), easing: "cubic-bezier(.25,.6,.5,1)" });
      anim.onfinish = () => c.remove();
    }
  }

  // ---------- Tô số ----------
  function renderTrace(qq) {
    const stage = $("stage");
    stage.classList.add("trace-stage");
    const size = Math.floor(Math.min(window.innerWidth - 40, window.innerHeight * 0.62, 600));
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const wrap = document.createElement("div"); wrap.className = "trace-wrap";
    const cv = document.createElement("canvas");
    cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + "px";
    wrap.appendChild(cv); stage.appendChild(wrap);
    const g = cv.getContext("2d"); g.scale(dpr, dpr);

    const txt = String(qq.n);
    const FONT = (px) => `900 ${px}px "Arial Rounded MT Bold","Arial Black","Helvetica Neue",Arial,sans-serif`;
    let fs = size * 0.8;
    g.font = FONT(fs);
    const w = g.measureText(txt).width;
    if (w > size * 0.88) fs *= (size * 0.88) / w;
    const brush = fs * 0.12;

    function drawGuide() {
      g.clearRect(0, 0, size, size);
      g.font = FONT(fs); g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = "#f3e7d6"; g.fillText(txt, size / 2, size * 0.53);
      g.setLineDash([8, 8]); g.lineWidth = 3; g.strokeStyle = "#c9ae8c";
      g.strokeText(txt, size / 2, size * 0.53); g.setLineDash([]);
    }
    drawGuide();

    // Lưới nhỏ để chấm điểm: mask = nét số, wide = nét số nới rộng, ink = nét bé tô
    const R = 100, k = R / size;
    const mk = () => { const c = document.createElement("canvas"); c.width = c.height = R; return c.getContext("2d"); };
    const mask = mk(), wide = mk(), ink = mk();
    [mask, wide].forEach((m, i) => {
      m.font = FONT(fs * k); m.textAlign = "center"; m.textBaseline = "middle"; m.fillStyle = "#000";
      m.fillText(txt, R / 2, R * 0.53);
      if (i) { m.lineWidth = brush * k * 1.6; m.lineJoin = "round"; m.strokeStyle = "#000"; m.strokeText(txt, R / 2, R * 0.53); }
    });
    const alpha = (c) => c.getImageData(0, 0, R, R).data;
    const mA = alpha(mask), wA = alpha(wide);
    let maskN = 0; for (let i = 3; i < mA.length; i += 4) if (mA[i] > 128) maskN++;

    ink.lineCap = ink.lineJoin = "round"; ink.lineWidth = brush * k; ink.strokeStyle = "#000";
    const hue = rand(0, 360);
    let drawing = false, last = null, strokes = 0;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * size / r.width, y: (e.clientY - r.top) * size / r.height }; };
    cv.addEventListener("pointerdown", (e) => {
      if (locked) return;
      drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); strokes++;
      dot(last);
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drawing) return;
      const p = pos(e); line(last, p); last = p;
    });
    const end = () => { if (!drawing) return; drawing = false; check(); };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);

    function line(a, b) {
      g.lineCap = g.lineJoin = "round"; g.lineWidth = brush;
      g.strokeStyle = `hsl(${(hue + strokes * 40) % 360} 85% 55%)`;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      ink.beginPath(); ink.moveTo(a.x * k, a.y * k); ink.lineTo(b.x * k, b.y * k); ink.stroke();
    }
    const dot = (p) => line(p, { x: p.x + 0.1, y: p.y + 0.1 });

    function check() {
      const iA = alpha(ink);
      let cover = 0, inkN = 0, inside = 0;
      for (let i = 3; i < iA.length; i += 4) {
        const on = iA[i] > 128;
        if (on) { inkN++; if (wA[i] > 128) inside++; }
        if (on && mA[i] > 128) cover++;
      }
      const coverage = cover / maskN, accuracy = inkN ? inside / inkN : 1;
      if (coverage >= 0.62 && accuracy >= 0.7) {
        answer(true, wrap, { praise: T.traceOk });
      } else if (inkN > maskN * 0.6 && accuracy < 0.6) {
        answer(false, wrap, { wrongSay: T.traceBad, keep: true });
        setTimeout(clear, 600);
      }
    }
    function clear() { drawGuide(); ink.clearRect(0, 0, R, R); strokes = 0; }

    const btn = document.createElement("button");
    btn.className = "big-btn small"; btn.style.background = "#8ecae6"; btn.textContent = "🧽 Xóa";
    btn.onclick = () => { sfx.tap(); clear(); };
    $("answers").appendChild(btn);
  }

  // ---------- Kết thúc vòng ----------
  function finish() {
    const stars = score >= 9 ? 3 : score >= 6 ? 2 : score >= 3 ? 1 : 0;
    const before = S.earned;
    S.level[game.id] = lvl;
    if (stars > (S.best[game.id] || 0)) S.best[game.id] = stars;
    S.coins += stars; S.earned += stars;
    save();
    const leveled = lvl > startLvl;
    $("resGuide").textContent = guide().e;
    $("resTitle").textContent = ["Mình chơi lại nhé! 🤗", "Cố lên nhé! 💪", "Giỏi lắm! 🎉", "Siêu giỏi! 🏆"][stars];
    $("resStars").innerHTML = [0, 1, 2].map((k) => `<span class="${k < stars ? "" : "off"}">⭐</span>`).join("");
    $("resScore").innerHTML = `Đúng ngay lần đầu: <b>${score}/${ROUND_LEN}</b> câu` +
      (stars ? `<br>+${stars} ⭐ &nbsp;·&nbsp; Bé đang có <b>${S.coins}</b> ⭐` : "") +
      (leveled ? `<br><span class="lvup">⬆️ Lên Cấp ${lvl}!</span>` : "");
    show("result");
    sfx.win();
    if (stars >= 2) confetti(60);
    sayList([T.result[stars], leveled ? T.levelUp : null]).then(() => {
      const unlocked = MAP.filter((m) => m.need > before && m.need <= S.earned);
      if (unlocked.length && $("result").classList.contains("active")) showUnlock(unlocked[unlocked.length - 1]);
    });
  }

  // ---------- Hộp thoại ----------
  function modal(html, onClose) {
    const m = $("modal");
    $("modalBody").innerHTML = html;
    m.classList.add("open");
    m.onclick = (e) => { if (e.target === m || e.target.dataset.close != null) { sfx.tap(); m.classList.remove("open"); onClose && onClose(); } };
  }
  function showUnlock(stop) {
    modal(`<div class="unlock-bg">${stop.bg}</div><div class="unlock-friend">${stop.friend.e}</div>
      <h2>Bé đã đến ${stop.place}!</h2><p>Bạn mới: <b>${stop.friend.n}</b></p>
      <button class="big-btn" style="background:var(--ok)" data-close>Tuyệt quá! 🎉</button>`);
    S.guide = stop.friend.id; save();
    sfx.win(); confetti(80); say(P.unlock(stop));
  }

  // ---------- Hành trình ----------
  function renderMap() {
    const el = $("mapList"); el.innerHTML = "";
    const next = MAP.find((m) => m.need > S.earned);
    $("mapInfo").innerHTML = next
      ? `Bé có <b>${S.earned}</b> ⭐. Còn <b>${next.need - S.earned}</b> ⭐ nữa để đến <b>${next.place}</b> ${next.bg}`
      : `Bé đã đi hết hành trình! 🏆`;
    MAP.forEach((m, i) => {
      const open = S.earned >= m.need;
      const d = document.createElement("button");
      d.className = "stop" + (open ? " open" : "") + (S.guide === m.friend.id ? " chosen" : "") + (i % 2 ? " right" : "");
      d.innerHTML = `<div class="stop-ico">${open ? m.friend.e : "🔒"}</div>
        <div class="stop-txt"><b>${m.bg} ${m.place}</b><span>${open ? m.friend.n + (S.guide === m.friend.id ? " · đang đi cùng bé" : " · chạm để chọn") : "Cần " + m.need + " ⭐"}</span></div>`;
      d.onclick = () => {
        sfx.tap();
        if (!open) { say(T.shopNeed); d.classList.remove("wrong"); void d.offsetWidth; d.classList.add("wrong"); return; }
        S.guide = m.friend.id; save(); say(T.guide); renderMap();
      };
      el.appendChild(d);
    });
    show("map");
  }

  // ---------- Sticker ----------
  const STICKERS = [
    ["🦖", 2], ["🐙", 2], ["🦀", 2], ["🐳", 3], ["🦒", 3], ["🦓", 3], ["🐘", 3], ["🦩", 4],
    ["🦜", 4], ["🌻", 2], ["🍉", 2], ["🍩", 3], ["🧁", 3], ["🍦", 3], ["🎂", 5], ["🚂", 4],
    ["🚁", 4], ["⛵", 4], ["🏰", 6], ["🎠", 6], ["🪁", 3], ["⚽", 3], ["🧸", 5], ["🦕", 6],
    ["🚀", 8], ["👑", 10], ["🌈", 8], ["🏆", 12],
  ];
  function renderShop() {
    $("shopCoins").textContent = S.coins;
    const el = $("stickers"); el.innerHTML = "";
    STICKERS.forEach(([e, price]) => {
      const own = S.owned.includes(e);
      const b = document.createElement("button");
      b.className = "sticker" + (own ? " own" : "");
      b.innerHTML = `<div class="st-e">${e}</div><div class="st-p">${own ? "✓ Của bé" : price + " ⭐"}</div>`;
      b.onclick = () => {
        if (own) { sfx.pop(); b.classList.remove("wiggle"); void b.offsetWidth; b.classList.add("wiggle"); return; }
        if (S.coins < price) { sfx.bad(); say(T.shopNeed); b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong"); return; }
        S.coins -= price; S.owned.push(e); save();
        sfx.win(); confetti(40); say(T.shopOk);
        renderShop();
      };
      el.appendChild(b);
    });
    show("shop");
  }

  // ---------- Cài đặt ----------
  function renderSettings() {
    const row = (key, label) => `<label class="tog"><span>${label}</span><input type="checkbox" data-k="${key}" ${S[key] ? "checked" : ""}><i></i></label>`;
    modal(`<h2>⚙️ Cài đặt</h2>${row("voice", "🗣️ Giọng đọc")}${row("music", "🎵 Nhạc nền")}${row("sfx", "🔔 Âm thanh")}
      <button class="big-btn" style="background:var(--sky)" data-close>Xong</button>`);
    $("modalBody").querySelectorAll("input[data-k]").forEach((inp) => {
      inp.onchange = () => {
        S[inp.dataset.k] = inp.checked; save();
        if (inp.dataset.k === "music") { if (inp.checked) startMusic(); else stopMusic(); }
        if (inp.dataset.k === "voice" && !inp.checked) stopVoice();
      };
    });
  }

  // ================= Nút =================
  $("btnStart").onclick = () => {
    unlockAudio(); sfx.tap(); startMusic();
    renderHome(); say(T.welcome);
  };
  $("homeGuide").onclick = () => { $("homeGuide").classList.remove("happy"); void $("homeGuide").offsetWidth; $("homeGuide").classList.add("happy"); say(T.welcome); };
  $("btnMap").onclick = () => { sfx.tap(); renderMap(); };
  $("btnShop").onclick = () => { sfx.tap(); renderShop(); };
  $("btnSettings").onclick = () => { sfx.tap(); renderSettings(); };
  document.querySelectorAll("[data-home]").forEach((b) => { b.onclick = () => { sfx.tap(); stopVoice(); q = null; renderHome(); }; });
  $("btnAgain").onclick = () => { sfx.tap(); startGame(game); };
  const repeatQ = () => { if (q) { mascot("happy"); say(q.say); } };
  $("gameGuide").onclick = repeatQ;
  $("question").onclick = repeatQ;
  $("btnRepeat").onclick = repeatQ;

  $("splashGuide").textContent = guide().e;

  // Dùng cho kiểm thử tự động
  window.__bht = { get q() { return q; }, get correctEl() { return correctEl; }, get state() { return S; }, GAMES };

  // ================= Chạy offline =================
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
