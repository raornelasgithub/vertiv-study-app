/* Thermal Tech Study - application code.
   You normally do NOT need to edit this file. Study content lives in the data/ folder:
     data/questions.json   - practice / exam questions
     data/scenarios.json   - troubleshooting scenarios
     data/topics.json      - study guide topics
     data/references.json  - reference library
*/
(function () {
  'use strict';

  var APP_VERSION = '1.0.0';
  var EXAM_SIZE = 25;
  var EXAM_MINUTES = 60;
  var STORE_KEY = 'thermalStudy.v1';

  // ---------------------------------------------------------------- data
  var DATA = { questions: [], scenarios: [], topics: [], references: [] };
  var Q = {};      // question by id
  var TOPIC = {};  // topic by id
  var REF = {};    // reference by id

  // ---------------------------------------------------------------- storage
  function defaultStore() {
    return { stats: {}, bookmarks: [], flags: [], exams: [], activeExam: null, scenariosDone: {}, practiceFilters: null };
  }
  var store = defaultStore();
  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        var d = defaultStore();
        for (var k in d) { if (s[k] === undefined) s[k] = d[k]; }
        store = s;
      }
    } catch (e) { store = defaultStore(); }
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
    catch (e) { toast('Could not save progress on this device.'); }
  }
  function recordAnswer(qid, ok) {
    var s = store.stats[qid] || { r: 0, w: 0, last: null };
    if (ok) s.r++; else s.w++;
    s.last = ok ? 'r' : 'w';
    s.t = Date.now();
    store.stats[qid] = s;
  }
  function isMissed(qid) { var s = store.stats[qid]; return !!(s && s.last === 'w'); }
  function inList(list, id) { return list.indexOf(id) !== -1; }
  function toggleList(name, id) {
    var list = store[name];
    var i = list.indexOf(id);
    if (i === -1) list.push(id); else list.splice(i, 1);
    saveStore();
    return i === -1;
  }

  // ---------------------------------------------------------------- helpers
  var app = document.getElementById('app');
  var titleEl = document.getElementById('topTitle');
  var backBtn = document.getElementById('backBtn');
  var rightEl = document.getElementById('topRight');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Very small formatter for study text: **bold** and line breaks. Everything else is escaped.
  function fmt(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  function answerIndex(q) { return LETTERS.indexOf(String(q.answer).trim().toUpperCase()); }
  function choiceOrder(q, randomize) {
    var idx = q.choices.map(function (_, i) { return i; });
    return (randomize && !q.noShuffle) ? shuffle(idx) : idx;
  }
  function topicName(id) { return TOPIC[id] ? TOPIC[id].title : id; }
  function diffLabel(d) { return { basic: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced' }[d] || d; }
  function confLabel(c) {
    return { verified: 'Verified in source', general: 'General technical principle', 'model-specific': 'Model-specific' }[c] || c;
  }
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }
  function setTop(title, showBack, backLabel, backTo) {
    titleEl.textContent = title;
    backBtn.hidden = !showBack;
    backBtn.innerHTML = '&#8249; ' + esc(backLabel || 'Home');
    backBtn.onclick = function () { go(backTo || '#/'); };
    rightEl.innerHTML = '';
  }
  function go(hash) {
    if (location.hash === hash) render(); else location.hash = hash;
  }
  function view(html) {
    app.innerHTML = html;
    window.scrollTo(0, 0);
  }
  function on(sel, ev, fn) {
    var els = app.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) els[i].addEventListener(ev, fn);
  }
  function modal(title, bodyHtml, actions) {
    var m = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    var box = document.getElementById('modalActions');
    box.innerHTML = '';
    actions.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (a.cls || '');
      b.textContent = a.label;
      b.onclick = function () { m.hidden = true; if (a.fn) a.fn(); };
      box.appendChild(b);
    });
    m.hidden = false;
  }
  function refLinks(ids) {
    if (!ids || !ids.length) return '';
    var parts = ids.map(function (id) {
      var r = REF[id];
      if (!r) return '';
      return '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title) + '</a> <span class="muted">(' + esc(r.org) + ')</span></li>';
    }).filter(Boolean);
    return parts.length ? '<div class="refs"><strong>Source / further reading:</strong><ul>' + parts.join('') + '</ul></div>' : '';
  }

  // ---------------------------------------------------------------- router
  var timerHandle = null;
  function stopTimer() { if (timerHandle) { clearInterval(timerHandle); timerHandle = null; } }

  function render() {
    stopTimer();
    var h = (location.hash || '#/').replace(/^#\/?/, '');
    var parts = h.split('/').map(decodeURIComponent);
    var r = parts[0] || '';
    // An exam in progress always takes priority so the timer is never lost.
    if (store.activeExam && r !== 'exam') {
      if (Date.now() >= store.activeExam.endsAt) { submitExam(true); return; }
    }
    switch (r) {
      case '': return renderHome();
      case 'practice': return parts[1] === 'run' ? renderPracticeQuestion() : renderPracticeSetup();
      case 'exam':
        if (parts[1] === 'run') return renderExamQuestion();
        if (parts[1] === 'results') return renderExamResults(parts[2]);
        return renderExamStart();
      case 'topics': return parts[1] ? renderTopic(parts[1]) : renderTopics();
      case 'trouble': return parts[1] ? renderScenario(parts[1]) : renderScenarios();
      case 'library': return renderLibrary();
      case 'progress': return renderProgress();
      case 'saved': return renderSaved();
      case 'about': return renderAbout();
      default: return renderHome();
    }
  }
  window.addEventListener('hashchange', render);

  // ---------------------------------------------------------------- home
  function overall() {
    var r = 0, w = 0, seen = 0;
    Object.keys(store.stats).forEach(function (id) {
      if (!Q[id]) return;
      seen++; r += store.stats[id].r; w += store.stats[id].w;
    });
    return { r: r, w: w, seen: seen };
  }
  function renderHome() {
    setTop('Thermal Tech Study', false);
    var o = overall();
    var lastExam = store.exams.length ? store.exams[store.exams.length - 1] : null;
    var resume = store.activeExam ? '<div class="card" style="border-left:6px solid var(--amber)"><strong>You have an exam in progress.</strong><p class="small muted">The timer keeps running while you are away.</p><a class="btn block" href="#/exam/run">Return to exam</a></div>' : '';
    var tiles = [
      ['#/practice', '1', 'Practice Questions', 'Study one question at a time. See the answer and explanation right away. No timer.', ''],
      ['#/exam', '2', 'Take Practice Exam', EXAM_SIZE + ' random questions, ' + EXAM_MINUTES + '-minute timer. Answers shown at the end.', 'exam'],
      ['#/topics', '3', 'Study Topics', 'Read study notes organized by subject.', ''],
      ['#/trouble', '4', 'Troubleshooting Practice', 'Work through real-world service calls step by step.', ''],
      ['#/library', '5', 'Reference Library', 'Search manuals, safety documents and study notes.', '']
    ];
    view(
      '<div class="hero"><h2>What do you want to do?</h2><p class="muted small">Pick one of the five sections below. Your progress is saved on this device automatically.</p></div>' +
      resume +
      '<div class="stat-strip">' +
        '<div class="stat"><b>' + o.seen + '/' + DATA.questions.length + '</b><span>questions tried</span></div>' +
        '<div class="stat"><b>' + (o.r + o.w ? pct(o.r, o.r + o.w) + '%' : '&ndash;') + '</b><span>practice accuracy</span></div>' +
        '<div class="stat"><b>' + (lastExam ? lastExam.pct + '%' : '&ndash;') + '</b><span>last exam</span></div>' +
      '</div>' +
      '<nav class="home-grid">' + tiles.map(function (t) {
        return '<a class="home-tile ' + t[4] + '" href="' + t[0] + '"><span class="num">' + t[1] + '</span><span><span class="t">' + t[2] + '</span><span class="d">' + t[3] + '</span></span></a>';
      }).join('') + '</nav>' +
      '<div class="quick-links">' +
        '<a class="btn secondary" href="#/progress">My Progress</a>' +
        '<a class="btn secondary" href="#/saved">Saved Questions</a>' +
        '<button class="btn secondary" id="missedBtn" type="button">Retry Missed (' + countMissed() + ')</button>' +
        '<a class="btn secondary" href="#/about">About &amp; Help</a>' +
      '</div>' +
      '<p class="disclaimer">Independent study aid. Not affiliated with or endorsed by Vertiv. These are original practice questions, not actual certification exam questions.</p>'
    );
    on('#missedBtn', 'click', function () {
      var ids = DATA.questions.filter(function (q) { return isMissed(q.id); }).map(function (q) { return q.id; });
      if (!ids.length) { toast('No missed questions yet. Nice!'); return; }
      startPractice(ids, 'Missed questions');
    });
  }
  function countMissed() { return DATA.questions.filter(function (q) { return isMissed(q.id); }).length; }

  // ---------------------------------------------------------------- practice
  var practice = null; // { ids, i, label, answered: {qid: chosenOriginalIndex}, order: {qid: [..]}, right, wrong }

  function startPractice(ids, label) {
    if (!ids.length) { toast('No questions match those choices.'); return; }
    var shuffled = shuffle(ids);
    practice = { ids: shuffled, i: 0, label: label, answered: {}, order: {}, right: 0, wrong: 0 };
    shuffled.forEach(function (id) { practice.order[id] = choiceOrder(Q[id], true); });
    go('#/practice/run');
  }

  function renderPracticeSetup() {
    setTop('Practice Questions', true);
    var f = store.practiceFilters || { topic: 'all', diff: 'all', set: 'all' };
    function chips(name, opts, cur) {
      return '<div class="chips" data-name="' + name + '">' + opts.map(function (o) {
        return '<button type="button" class="chip' + (o[0] === cur ? ' on' : '') + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>';
      }).join('') + '</div>';
    }
    var topicOpts = '<option value="all">All topics</option>' + DATA.topics.map(function (t) {
      var n = DATA.questions.filter(function (q) { return q.topic === t.id; }).length;
      return '<option value="' + esc(t.id) + '"' + (f.topic === t.id ? ' selected' : '') + '>' + esc(t.title) + ' (' + n + ')</option>';
    }).join('');
    view(
      '<div class="card">' +
        '<h2>Choose what to practice</h2>' +
        '<p class="muted small">Or just press <strong>Start practicing</strong> to get a mix of everything.</p>' +
        '<label class="field" for="fTopic">Topic</label><select id="fTopic">' + topicOpts + '</select>' +
        '<label class="field">Difficulty</label>' +
        chips('diff', [['all', 'All'], ['basic', 'Basic'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']], f.diff) +
        '<label class="field">Which questions</label>' +
        chips('set', [['all', 'All questions'], ['new', 'Not tried yet'], ['missed', 'Missed before'], ['bookmarked', 'Bookmarked'], ['flagged', 'Flagged']], f.set) +
        '<p class="result-count" id="matchCount"></p>' +
        '<button class="btn block" id="startBtn" type="button">Start practicing</button>' +
      '</div>'
    );
    function current() {
      var sel = {};
      sel.topic = app.querySelector('#fTopic').value;
      ['diff', 'set'].forEach(function (n) {
        var on = app.querySelector('.chips[data-name="' + n + '"] .chip.on');
        sel[n] = on ? on.getAttribute('data-v') : 'all';
      });
      return sel;
    }
    function matches(sel) {
      return DATA.questions.filter(function (q) {
        if (sel.topic !== 'all' && q.topic !== sel.topic) return false;
        if (sel.diff !== 'all' && q.difficulty !== sel.diff) return false;
        if (sel.set === 'new' && store.stats[q.id]) return false;
        if (sel.set === 'missed' && !isMissed(q.id)) return false;
        if (sel.set === 'bookmarked' && !inList(store.bookmarks, q.id)) return false;
        if (sel.set === 'flagged' && !inList(store.flags, q.id)) return false;
        return true;
      }).map(function (q) { return q.id; });
    }
    function update() {
      var n = matches(current()).length;
      app.querySelector('#matchCount').textContent = n + ' question' + (n === 1 ? '' : 's') + ' match.';
      app.querySelector('#startBtn').disabled = n === 0;
    }
    on('.chip', 'click', function (e) {
      var b = e.currentTarget;
      var group = b.parentNode.querySelectorAll('.chip');
      for (var i = 0; i < group.length; i++) group[i].classList.remove('on');
      b.classList.add('on');
      update();
    });
    on('#fTopic', 'change', update);
    on('#startBtn', 'click', function () {
      var sel = current();
      store.practiceFilters = sel; saveStore();
      var label = sel.topic === 'all' ? 'All topics' : topicName(sel.topic);
      startPractice(matches(sel), label);
    });
    update();
  }

  function questionMeta(q) {
    return '<div class="q-meta"><span class="tag">' + esc(topicName(q.topic)) + '</span>' +
      '<span class="tag ' + esc(q.difficulty) + '">' + esc(diffLabel(q.difficulty)) + '</span>' +
      '<span class="tag conf">' + esc(confLabel(q.confidence)) + '</span></div>';
  }
  function explanationHtml(q) {
    var h = '<div class="explain-box"><h4>Why</h4><p>' + fmt(q.explanation) + '</p>';
    if (q.whyWrong) h += '<h4>The other choices</h4><p>' + fmt(q.whyWrong) + '</p>';
    if (q.applies) h += '<p class="small muted"><strong>Applies to:</strong> ' + esc(q.applies) + '</p>';
    h += refLinks(q.refs) + '</div>';
    return h;
  }

  function renderPracticeQuestion() {
    if (!practice) { go('#/practice'); return; }
    setTop('Practice', true, 'End', '#/practice');
    backBtn.onclick = function () { practiceSummary(); };
    if (practice.i >= practice.ids.length) { practiceSummary(); return; }
    var id = practice.ids[practice.i], q = Q[id];
    var order = practice.order[id];
    var chosen = practice.answered[id];
    var done = chosen !== undefined;
    var correctIdx = answerIndex(q);
    var answers = order.map(function (orig, pos) {
      var cls = 'answer';
      if (done) {
        if (orig === correctIdx) cls += ' correct';
        else if (orig === chosen) cls += ' wrong';
      }
      return '<button type="button" class="' + cls + '" data-orig="' + orig + '"' + (done ? ' disabled' : '') + '>' +
        '<span class="letter">' + LETTERS[pos] + '</span><span class="atext">' + esc(q.choices[orig]) + '</span></button>';
    }).join('');
    var fb = '';
    if (done) {
      var ok = chosen === correctIdx;
      var correctPos = order.indexOf(correctIdx);
      fb = '<div class="feedback ' + (ok ? 'good' : 'bad') + '"><div class="verdict">' + (ok ? '&#10003; Correct' : '&#10007; Not quite') + '</div>' +
        (ok ? '' : '<p>The correct answer is <strong>' + LETTERS[correctPos] + '. ' + esc(q.choices[correctIdx]) + '</strong></p>') +
        explanationHtml(q) + '</div>';
    }
    var n = practice.ids.length;
    var bm = inList(store.bookmarks, id), fl = inList(store.flags, id);
    view(
      '<div class="session-line"><span>' + esc(practice.label) + '</span><span>Question ' + (practice.i + 1) + ' of ' + n + '</span></div>' +
      '<div class="progressbar"><span style="width:' + pct(practice.i + (done ? 1 : 0), n) + '%"></span></div>' +
      '<div class="session-line" style="margin-bottom:10px"><span>&#10003; ' + practice.right + ' right</span><span>&#10007; ' + practice.wrong + ' wrong</span></div>' +
      '<div class="card">' + questionMeta(q) +
        '<div class="q-text">' + esc(q.question) + '</div>' +
        (done ? '' : '<p class="small muted" style="margin-top:-6px">Tap the best answer.</p>') +
        '<div class="answers">' + answers + '</div>' + fb +
        '<div class="tool-row">' +
          '<button type="button" class="btn ghost small-btn toggle' + (bm ? ' on' : '') + '" id="bmBtn">' + (bm ? '&#9733; Bookmarked' : '&#9734; Bookmark') + '</button>' +
          '<button type="button" class="btn ghost small-btn toggle' + (fl ? ' on' : '') + '" id="flBtn">' + (fl ? '&#9873; Flagged' : '&#9872; Flag for review') + '</button>' +
        '</div>' +
      '</div>' +
      (done ? '<div class="btn-row"><button type="button" class="btn block" id="nextBtn">' + (practice.i + 1 < n ? 'Next question &#8250;' : 'Finish &amp; see summary') + '</button></div>' :
        '<div class="btn-row"><button type="button" class="btn ghost" id="skipBtn">Skip this question</button></div>')
    );
    on('.answer', 'click', function (e) {
      var orig = parseInt(e.currentTarget.getAttribute('data-orig'), 10);
      practice.answered[id] = orig;
      var ok = orig === correctIdx;
      if (ok) practice.right++; else practice.wrong++;
      recordAnswer(id, ok); saveStore();
      renderPracticeQuestion();
      var fbEl = app.querySelector('.feedback');
      if (fbEl && fbEl.scrollIntoView) fbEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    on('#nextBtn', 'click', function () { practice.i++; renderPracticeQuestion(); });
    on('#skipBtn', 'click', function () { practice.i++; renderPracticeQuestion(); });
    on('#bmBtn', 'click', function () { toast(toggleList('bookmarks', id) ? 'Bookmarked' : 'Bookmark removed'); renderPracticeKeepScroll(); });
    on('#flBtn', 'click', function () { toast(toggleList('flags', id) ? 'Flagged for review' : 'Flag removed'); renderPracticeKeepScroll(); });
  }
  function renderPracticeKeepScroll() {
    var y = window.scrollY; renderPracticeQuestion(); window.scrollTo(0, y);
  }
  function practiceSummary() {
    if (!practice) { go('#/practice'); return; }
    setTop('Practice summary', true);
    var answered = practice.right + practice.wrong;
    var missed = practice.ids.filter(function (id) {
      return practice.answered[id] !== undefined && practice.answered[id] !== answerIndex(Q[id]);
    });
    view(
      '<div class="card center"><h2>Session complete</h2>' +
        '<div class="score-big' + (pct(practice.right, answered) >= 70 ? ' pass' : '') + '">' + (answered ? pct(practice.right, answered) + '%' : '&ndash;') + '</div>' +
        '<p class="muted">' + practice.right + ' right, ' + practice.wrong + ' wrong out of ' + answered + ' answered</p></div>' +
      (missed.length ? '<button class="btn block" id="redo" type="button">Practice the ' + missed.length + ' I missed</button><div class="spacer"></div>' : '') +
      '<a class="btn block secondary" href="#/practice">Start a new practice set</a><div class="spacer"></div>' +
      '<a class="btn block ghost" href="#/">Home</a>'
    );
    on('#redo', 'click', function () { startPractice(missed, 'Missed this session'); });
    practice.i = practice.ids.length; // keeps summary on back
  }

  // ---------------------------------------------------------------- exam
  function topicWeights() {
    var w = {};
    DATA.topics.forEach(function (t) { w[t.id] = t.examWeight || 1; });
    return w;
  }
  function pickExamQuestions() {
    var byTopic = {};
    DATA.questions.forEach(function (q) { (byTopic[q.topic] = byTopic[q.topic] || []).push(q.id); });
    var w = topicWeights(), topics = Object.keys(byTopic);
    var total = topics.reduce(function (s, t) { return s + (w[t] || 1); }, 0);
    var alloc = topics.map(function (t) {
      var exact = EXAM_SIZE * (w[t] || 1) / total;
      return { t: t, n: Math.min(Math.floor(exact), byTopic[t].length), rem: exact - Math.floor(exact) };
    });
    var used = alloc.reduce(function (s, a) { return s + a.n; }, 0);
    alloc.sort(function (a, b) { return b.rem - a.rem; });
    var guard = 0;
    while (used < EXAM_SIZE && guard++ < 1000) {
      for (var i = 0; i < alloc.length && used < EXAM_SIZE; i++) {
        if (alloc[i].n < byTopic[alloc[i].t].length) { alloc[i].n++; used++; }
      }
    }
    var picked = [];
    alloc.forEach(function (a) { picked = picked.concat(shuffle(byTopic[a.t]).slice(0, a.n)); });
    return shuffle(picked);
  }

  function renderExamStart() {
    setTop('Practice Exam', true);
    if (store.activeExam) { go('#/exam/run'); return; }
    view(
      '<div class="card"><h2>Timed practice exam</h2>' +
        '<ul><li><strong>' + EXAM_SIZE + ' questions</strong>, chosen at random from every topic.</li>' +
        '<li><strong>' + EXAM_MINUTES + ' minutes.</strong> The timer starts when you press Start.</li>' +
        '<li>Answers and explanations are shown <strong>after</strong> you submit.</li>' +
        '<li>You can go back and change answers, and leave questions blank.</li>' +
        '<li>The exam submits itself automatically when time runs out.</li>' +
        '<li>The real exam is open book, so you may use the Study Topics and Reference Library while you take this one.</li></ul>' +
        '<button class="btn block" id="beginBtn" type="button">Start exam</button></div>' +
      (store.exams.length ? '<a class="btn block secondary" href="#/progress">See past exam scores</a>' : '')
    );
    on('#beginBtn', 'click', function () {
      if (DATA.questions.length < EXAM_SIZE) { toast('Not enough questions in the bank.'); return; }
      var ids = pickExamQuestions(), order = {};
      ids.forEach(function (id) { order[id] = choiceOrder(Q[id], true); });
      var now = Date.now();
      store.activeExam = { id: 'E' + now, startedAt: now, endsAt: now + EXAM_MINUTES * 60000, ids: ids, order: order, answers: {}, marked: [], i: 0 };
      saveStore();
      go('#/exam/run');
    });
  }

  function examTick() {
    var ex = store.activeExam;
    if (!ex) { stopTimer(); return; }
    var left = (ex.endsAt - Date.now()) / 1000;
    rightEl.innerHTML = '<span class="timer' + (left < 300 ? ' low' : '') + '" aria-label="Time remaining">&#9201; ' + fmtTime(left) + '</span>';
    if (left <= 0) { stopTimer(); submitExam(true); }
  }

  function renderExamQuestion() {
    var ex = store.activeExam;
    if (!ex) { go('#/exam'); return; }
    if (Date.now() >= ex.endsAt) { submitExam(true); return; }
    setTop('Exam', true, 'Home', '#/');
    examTick();
    timerHandle = setInterval(examTick, 1000);
    var id = ex.ids[ex.i], q = Q[id];
    if (!q) { // a question was removed from the bank mid-exam
      ex.ids.splice(ex.i, 1); if (ex.i >= ex.ids.length) ex.i = ex.ids.length - 1; saveStore(); renderExamQuestion(); return;
    }
    var order = ex.order[id];
    var answeredCount = ex.ids.filter(function (x) { return ex.answers[x] !== undefined; }).length;
    var marked = inList(ex.marked, id);
    var answers = order.map(function (orig, pos) {
      var sel = ex.answers[id] === orig;
      return '<button type="button" class="answer' + (sel ? ' selected' : '') + '" data-orig="' + orig + '" aria-pressed="' + sel + '">' +
        '<span class="letter">' + LETTERS[pos] + '</span><span class="atext">' + esc(q.choices[orig]) + '</span></button>';
    }).join('');
    var grid = ex.ids.map(function (x, n) {
      var c = [];
      if (ex.answers[x] !== undefined) c.push('answered');
      if (n === ex.i) c.push('current');
      if (inList(ex.marked, x)) c.push('marked');
      return '<button type="button" class="' + c.join(' ') + '" data-n="' + n + '" aria-label="Question ' + (n + 1) + '">' + (n + 1) + '</button>';
    }).join('');
    view(
      '<div class="exam-status"><span>Question <b>' + (ex.i + 1) + '</b> of ' + ex.ids.length + '</span>' +
        '<span><b>' + answeredCount + '</b> answered &middot; <b>' + (ex.ids.length - answeredCount) + '</b> blank</span></div>' +
      '<div class="progressbar"><span style="width:' + pct(answeredCount, ex.ids.length) + '%"></span></div>' +
      '<div class="card">' +
        '<div class="q-meta"><span class="tag">' + esc(topicName(q.topic)) + '</span></div>' +
        '<div class="q-text">' + esc(q.question) + '</div>' +
        '<div class="answers">' + answers + '</div>' +
        '<div class="tool-row">' +
          '<button type="button" class="btn ghost small-btn toggle' + (marked ? ' on' : '') + '" id="markBtn">' + (marked ? '&#9873; Marked for review' : '&#9872; Mark for review') + '</button>' +
          (ex.answers[id] !== undefined ? '<button type="button" class="btn ghost small-btn" id="clearBtn">Clear answer</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn secondary" id="prevBtn"' + (ex.i === 0 ? ' disabled' : '') + '>&#8249; Previous</button>' +
        (ex.i < ex.ids.length - 1 ? '<button type="button" class="btn" id="nextBtn">Next &#8250;</button>' :
          '<button type="button" class="btn navy" id="submitBtn2">Review &amp; submit</button>') +
      '</div>' +
      '<div class="card" style="margin-top:14px"><strong>Jump to a question</strong>' +
        '<div class="qgrid">' + grid + '</div>' +
        '<div class="legend"><span><i style="background:var(--navy)"></i>Answered</span><span><i></i>Blank</span><span><i style="background:#f0a400;border-radius:50%"></i>Marked</span></div>' +
      '</div>' +
      '<button type="button" class="btn block navy" id="submitBtn">Submit exam</button>' +
      '<p class="small muted center">You can submit at any time. Blank questions count as incorrect.</p>'
    );
    on('.answer', 'click', function (e) {
      ex.answers[id] = parseInt(e.currentTarget.getAttribute('data-orig'), 10);
      saveStore();
      var y = window.scrollY; renderExamQuestion(); window.scrollTo(0, y);
    });
    on('#clearBtn', 'click', function () { delete ex.answers[id]; saveStore(); var y = window.scrollY; renderExamQuestion(); window.scrollTo(0, y); });
    on('#markBtn', 'click', function () {
      var k = ex.marked.indexOf(id);
      if (k === -1) ex.marked.push(id); else ex.marked.splice(k, 1);
      saveStore(); var y = window.scrollY; renderExamQuestion(); window.scrollTo(0, y);
    });
    on('#prevBtn', 'click', function () { ex.i--; saveStore(); renderExamQuestion(); });
    on('#nextBtn', 'click', function () { ex.i++; saveStore(); renderExamQuestion(); });
    on('.qgrid button', 'click', function (e) { ex.i = parseInt(e.currentTarget.getAttribute('data-n'), 10); saveStore(); renderExamQuestion(); });
    on('#submitBtn, #submitBtn2', 'click', confirmSubmit);
  }

  function confirmSubmit() {
    var ex = store.activeExam;
    var blank = ex.ids.filter(function (x) { return ex.answers[x] === undefined; }).length;
    var body = '<p>' + (blank ? '<strong>' + blank + ' question' + (blank === 1 ? ' is' : 's are') + ' still blank.</strong> Blank questions count as incorrect.' : 'All questions are answered.') + '</p>' +
      (ex.marked.length ? '<p>' + ex.marked.length + ' question(s) are marked for review.</p>' : '') +
      '<p>Time left: ' + fmtTime((ex.endsAt - Date.now()) / 1000) + '</p>';
    modal('Submit your exam?', body, [
      { label: 'Keep working', cls: 'secondary' },
      { label: 'Submit', cls: 'navy', fn: function () { submitExam(false); } }
    ]);
  }

  function submitExam(auto) {
    var ex = store.activeExam;
    if (!ex) return;
    stopTimer();
    var now = Math.min(Date.now(), ex.endsAt);
    var items = [], byTopic = {}, correct = 0, unanswered = 0;
    ex.ids.forEach(function (id) {
      var q = Q[id]; if (!q) return;
      var chosen = ex.answers[id];
      var ok = chosen !== undefined && chosen === answerIndex(q);
      if (chosen === undefined) unanswered++;
      if (ok) correct++;
      var bt = byTopic[q.topic] = byTopic[q.topic] || { c: 0, n: 0 };
      bt.n++; if (ok) bt.c++;
      items.push({ id: id, chosen: chosen === undefined ? null : chosen, ok: ok, order: ex.order[id] });
      if (chosen !== undefined) recordAnswer(id, ok);
      else { var s = store.stats[id] || { r: 0, w: 0 }; s.w++; s.last = 'w'; s.t = Date.now(); store.stats[id] = s; }
    });
    var total = items.length;
    var result = {
      id: ex.id, date: ex.startedAt, usedSec: Math.round((now - ex.startedAt) / 1000), auto: !!auto,
      total: total, correct: correct, unanswered: unanswered, incorrect: total - correct - unanswered,
      pct: pct(correct, total), byTopic: byTopic, items: items
    };
    store.exams.push(result);
    if (store.exams.length > 50) store.exams = store.exams.slice(-50);
    store.activeExam = null;
    saveStore();
    if (auto) toast('Time is up. Your exam was submitted.');
    go('#/exam/results/' + result.id);
  }

  function renderExamResults(rid) {
    setTop('Exam results', true);
    var res = null;
    for (var i = store.exams.length - 1; i >= 0; i--) if (store.exams[i].id === rid) res = store.exams[i];
    if (!res) res = store.exams[store.exams.length - 1];
    if (!res) { go('#/exam'); return; }
    var topicRows = Object.keys(res.byTopic).sort(function (a, b) {
      return pct(res.byTopic[a].c, res.byTopic[a].n) - pct(res.byTopic[b].c, res.byTopic[b].n);
    }).map(function (t) {
      var b = res.byTopic[t], p = pct(b.c, b.n);
      return '<div class="bar-row"><div class="lbl"><span>' + esc(topicName(t)) + '</span><span>' + b.c + '/' + b.n + '</span></div>' +
        '<div class="bar ' + (p >= 70 ? 'good' : 'bad') + '"><span style="width:' + Math.max(p, 3) + '%"></span></div></div>';
    }).join('');
    var wrongItems = res.items.filter(function (it) { return !it.ok && Q[it.id]; });
    var review = wrongItems.map(function (it, n) {
      var q = Q[it.id], ci = answerIndex(q);
      var order = it.order || choiceOrder(q, false);
      var yours = it.chosen === null ? '<span class="yours">You left this blank.</span>' :
        '<span class="yours">Your answer: ' + LETTERS[order.indexOf(it.chosen)] + '. ' + esc(q.choices[it.chosen]) + '</span>';
      return '<div class="review-item"><div class="small muted">Missed ' + (n + 1) + ' of ' + wrongItems.length + ' &middot; ' + esc(topicName(q.topic)) + '</div>' +
        '<p><strong>' + esc(q.question) + '</strong></p><p>' + yours + '<br><span class="right">Correct answer: ' + LETTERS[order.indexOf(ci)] + '. ' + esc(q.choices[ci]) + '</span></p>' +
        explanationHtml(q) + '</div>';
    }).join('');
    var grid = res.items.map(function (it, n) {
      return '<button type="button" class="' + (it.ok ? 'res-right' : 'res-wrong') + '" disabled>' + (n + 1) + '</button>';
    }).join('');
    view(
      '<div class="card center">' + (res.auto ? '<p class="small muted">Submitted automatically when time ran out.</p>' : '') +
        '<div class="score-big' + (res.pct >= 70 ? ' pass' : '') + '">' + res.pct + '%</div>' +
        '<p class="muted">' + res.correct + ' of ' + res.total + ' correct &middot; ' + fmtDate(res.date) + '</p>' +
        '<div class="grid-stats">' +
          '<div><b style="color:var(--green)">' + res.correct + '</b>Correct</div>' +
          '<div><b style="color:var(--red)">' + res.incorrect + '</b>Incorrect</div>' +
          '<div><b>' + res.unanswered + '</b>Blank</div>' +
          '<div><b>' + fmtTime(res.usedSec) + '</b>Time used</div>' +
        '</div>' +
        '<p class="small muted" style="margin-top:10px">This app does not know the real exam\'s passing score. 70%+ is shown in green as a practice target only.</p>' +
      '</div>' +
      '<div class="card"><h2>Results by subject</h2>' + topicRows + '</div>' +
      '<div class="card"><h2>Question by question</h2><div class="qgrid">' + grid + '</div></div>' +
      (wrongItems.length ? '<button class="btn block" id="redoBtn" type="button">Practice my ' + wrongItems.length + ' missed questions</button><div class="spacer"></div>' : '') +
      '<div class="btn-row"><a class="btn secondary" href="#/exam">New exam</a><a class="btn ghost" href="#/">Home</a></div>' +
      (wrongItems.length ? '<div class="card" style="margin-top:14px"><h2>Review of missed questions</h2>' + review + '</div>' :
        '<div class="card" style="margin-top:14px"><h2>Perfect score!</h2><p>Every question was answered correctly.</p></div>')
    );
    on('#redoBtn', 'click', function () { startPractice(wrongItems.map(function (it) { return it.id; }), 'Missed on exam'); });
  }

  // ---------------------------------------------------------------- study topics
  function renderTopics() {
    setTop('Study Topics', true);
    view(
      '<p class="muted small">Tap a subject to read the study notes. Each subject has a button to practice its questions.</p>' +
      DATA.topics.map(function (t) {
        var n = DATA.questions.filter(function (q) { return q.topic === t.id; }).length;
        return '<a class="list-btn" href="#/topics/' + encodeURIComponent(t.id) + '"><span><span class="lt">' + esc(t.title) + '</span><span class="ld">' + esc(t.summary) + ' &middot; ' + n + ' questions</span></span><span class="arrow">&#8250;</span></a>';
      }).join('')
    );
  }
  function renderBlock(b) {
    if (typeof b === 'string') return '<p>' + fmt(b) + '</p>';
    if (b.list) return '<ul>' + b.list.map(function (x) { return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul>';
    if (b.note) return '<div class="note' + (b.kind ? ' ' + esc(b.kind) : '') + '">' + fmt(b.note) + '</div>';
    if (b.table) {
      return '<div class="table-wrap"><table class="simple"><thead><tr>' + b.table[0].map(function (c) { return '<th>' + fmt(c) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + b.table.slice(1).map(function (r) {
          return '<tr>' + r.map(function (c) { return '<td>' + fmt(c) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }
    return '';
  }
  function renderTopic(tid) {
    var t = TOPIC[tid];
    if (!t) { go('#/topics'); return; }
    setTop(t.title, true, 'Topics', '#/topics');
    var toc = t.sections.map(function (s, i) { return '<a href="#" data-sec="sec' + i + '">' + esc(s.heading) + '</a>'; }).join('');
    var body = t.sections.map(function (s, i) {
      return '<h3 id="sec' + i + '">' + esc(s.heading) + '</h3>' + s.body.map(renderBlock).join('') + refLinks(s.refs);
    }).join('');
    var n = DATA.questions.filter(function (q) { return q.topic === tid; }).length;
    view(
      '<div class="card"><p>' + fmt(t.intro || t.summary) + '</p>' +
        '<button class="btn block" id="practiceTopic" type="button">Practice ' + n + ' ' + esc(t.title) + ' questions</button></div>' +
      '<div class="card toc"><strong>In this topic</strong>' + toc + '</div>' +
      '<div class="card study">' + body + '</div>' +
      '<button class="btn block secondary" id="practiceTopic2" type="button">Practice these questions</button>'
    );
    on('.toc a', 'click', function (e) {
      e.preventDefault();
      var el = document.getElementById(e.currentTarget.getAttribute('data-sec'));
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70);
    });
    on('#practiceTopic, #practiceTopic2', 'click', function () {
      startPractice(DATA.questions.filter(function (q) { return q.topic === tid; }).map(function (q) { return q.id; }), t.title);
    });
    var want = sessionStorage.getItem('jumpSection');
    if (want) {
      sessionStorage.removeItem('jumpSection');
      var el = document.getElementById(want);
      if (el) setTimeout(function () { window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70); }, 30);
    }
  }

  // ---------------------------------------------------------------- troubleshooting
  var scen = null; // { id, step, answers: [] }
  function renderScenarios() {
    setTop('Troubleshooting', true);
    view(
      '<div class="card"><h2>How this works</h2><p>Each scenario is a service call. You will be asked what to check first, what information to collect, and what to investigate. There is feedback after every step.</p>' +
        '<div class="note safety">Always follow site safety rules, lockout/tagout, and the equipment manual. Never bypass safety devices. Refrigerant work requires EPA 608 certification and proper authorization.</div></div>' +
      DATA.scenarios.map(function (s) {
        var done = store.scenariosDone[s.id];
        return '<a class="list-btn" href="#/trouble/' + encodeURIComponent(s.id) + '"><span><span class="lt">' + esc(s.title) + '</span><span class="ld">' + esc(s.summary) + '</span></span>' +
          (done ? '<span class="done-badge">Done ' + done.score + '/' + done.of + '</span>' : '<span class="arrow">&#8250;</span>') + '</a>';
      }).join('')
    );
  }
  function renderScenario(sid) {
    var s = null;
    DATA.scenarios.forEach(function (x) { if (x.id === sid) s = x; });
    if (!s) { go('#/trouble'); return; }
    if (!scen || scen.id !== sid) scen = { id: sid, step: 0, answers: [] };
    setTop('Troubleshooting', true, 'Scenarios', '#/trouble');
    var situation = '<div class="situation"><h2>' + esc(s.title) + '</h2><p>' + fmt(s.situation) + '</p>' +
      (s.observations ? '<ul>' + s.observations.map(function (o) { return '<li>' + fmt(o) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
    if (scen.step >= s.steps.length) {
      var score = 0;
      s.steps.forEach(function (st, i) { if (scen.answers[i] === answerIndex(st)) score++; });
      store.scenariosDone[sid] = { score: score, of: s.steps.length, t: Date.now() }; saveStore();
      view(situation +
        '<div class="card"><h2>Scenario complete: ' + score + ' of ' + s.steps.length + ' steps correct</h2>' +
          '<h3>Key takeaways</h3><ul>' + s.takeaways.map(function (x) { return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul>' +
          (s.safety ? '<div class="note safety">' + fmt(s.safety) + '</div>' : '') +
          (s.applies ? '<p class="small muted"><strong>Applies to:</strong> ' + esc(s.applies) + '</p>' : '') +
          refLinks(s.refs) + '</div>' +
        '<div class="btn-row"><button class="btn secondary" id="again" type="button">Try again</button><a class="btn" href="#/trouble">More scenarios</a></div>');
      on('#again', 'click', function () { scen = { id: sid, step: 0, answers: [] }; renderScenario(sid); });
      return;
    }
    var st = s.steps[scen.step];
    var chosen = scen.answers[scen.step];
    var done = chosen !== undefined && chosen !== null;
    var ci = answerIndex(st);
    if (!scen.order) scen.order = {};
    if (!scen.order[scen.step]) scen.order[scen.step] = choiceOrder(st, true);
    var order = scen.order[scen.step];
    var answers = order.map(function (orig, pos) {
      var cls = 'answer';
      if (done) { if (orig === ci) cls += ' correct'; else if (orig === chosen) cls += ' wrong'; }
      return '<button type="button" class="' + cls + '" data-orig="' + orig + '"' + (done ? ' disabled' : '') + '><span class="letter">' + LETTERS[pos] + '</span><span class="atext">' + esc(st.choices[orig]) + '</span></button>';
    }).join('');
    var fb = '';
    if (done) {
      var ok = chosen === ci;
      fb = '<div class="feedback ' + (ok ? 'good' : 'bad') + '"><div class="verdict">' + (ok ? '&#10003; Good call' : '&#10007; Not the best next step') + '</div>' +
        (ok ? '' : '<p>Best answer: <strong>' + esc(st.choices[ci]) + '</strong></p>') +
        '<div class="explain-box"><p>' + fmt(st.explanation) + '</p></div></div>';
    }
    view(situation +
      '<div class="card"><div class="step-label">Step ' + (scen.step + 1) + ' of ' + s.steps.length + ' &middot; ' + esc(st.kind || 'Decide') + '</div>' +
        '<div class="q-text">' + esc(st.prompt) + '</div>' +
        '<div class="answers">' + answers + '</div>' + fb + '</div>' +
      (done ? '<button class="btn block" id="nextStep" type="button">' + (scen.step + 1 < s.steps.length ? 'Next step &#8250;' : 'Finish scenario') + '</button>' : ''));
    on('.answer', 'click', function (e) {
      scen.answers[scen.step] = parseInt(e.currentTarget.getAttribute('data-orig'), 10);
      var y = window.scrollY; renderScenario(sid); window.scrollTo(0, y);
      var f = app.querySelector('.feedback'); if (f && f.scrollIntoView) f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    on('#nextStep', 'click', function () { scen.step++; renderScenario(sid); });
  }

  // ---------------------------------------------------------------- library
  var libState = { q: '', cat: 'all' };
  function renderLibrary() {
    setTop('Reference Library', true);
    var cats = ['all'];
    DATA.references.forEach(function (r) { if (cats.indexOf(r.category) === -1) cats.push(r.category); });
    view(
      '<label class="field" for="libSearch">Search manuals, documents and study notes</label>' +
      '<input type="search" id="libSearch" placeholder="Try: superheat, iCOM, lockout, Mini-Mate" value="' + esc(libState.q) + '" autocomplete="off">' +
      '<label class="field" for="libCat">Show</label><select id="libCat">' + cats.map(function (c) {
        return '<option value="' + esc(c) + '"' + (c === libState.cat ? ' selected' : '') + '>' + esc(c === 'all' ? 'All categories' : c) + '</option>';
      }).join('') + '</select>' +
      '<div id="libResults"></div>' +
      '<p class="small muted">Links open the original document on the publisher\'s website and need an internet connection. Manuals are copyrighted by their publishers and are linked, not copied. The study notes in this app work offline.</p>'
    );
    var input = app.querySelector('#libSearch');
    input.addEventListener('input', function () { libState.q = input.value; drawLib(); });
    on('#libCat', 'change', function (e) { libState.cat = e.currentTarget.value; drawLib(); });
    drawLib();
  }
  function hl(text, terms) {
    var h = esc(text);
    terms.forEach(function (t) {
      if (t.length < 2) return;
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '&amp;') + ')', 'gi');
      h = h.replace(re, '<mark>$1</mark>');
    });
    return h;
  }
  function blockText(b) {
    if (typeof b === 'string') return b;
    if (b.list) return b.list.join(' ');
    if (b.note) return b.note;
    if (b.table) return b.table.map(function (r) { return r.join(' '); }).join(' ');
    return '';
  }
  function drawLib() {
    var out = app.querySelector('#libResults');
    var terms = libState.q.toLowerCase().split(/\s+/).filter(Boolean);
    function matchAll(hay) { hay = hay.toLowerCase(); return terms.every(function (t) { return hay.indexOf(t) !== -1; }); }
    var refs = DATA.references.filter(function (r) {
      if (libState.cat !== 'all' && r.category !== libState.cat) return false;
      if (!terms.length) return true;
      return matchAll([r.title, r.org, r.models || '', r.description, (r.topics || []).map(topicName).join(' '), r.category].join(' '));
    });
    var notes = [];
    if (terms.length && libState.cat === 'all') {
      DATA.topics.forEach(function (t) {
        t.sections.forEach(function (s, i) {
          var text = s.body.map(blockText).join(' ');
          if (matchAll(t.title + ' ' + s.heading + ' ' + text)) {
            var plain = text.replace(/\*\*/g, '');
            var pos = plain.toLowerCase().indexOf(terms[0]);
            var start = Math.max(0, pos - 60);
            var snippet = (start > 0 ? '…' : '') + plain.substr(start, 170) + '…';
            notes.push({ t: t, i: i, s: s, snippet: snippet });
          }
        });
      });
    }
    var html = '';
    if (notes.length) {
      html += '<h3>Study notes (' + notes.length + ')</h3>' + notes.slice(0, 30).map(function (n) {
        return '<a class="list-btn" href="#/topics/' + encodeURIComponent(n.t.id) + '" data-jump="sec' + n.i + '"><span><span class="lt">' + hl(n.s.heading, terms) + '</span><span class="ld">' + esc(n.t.title) + ' &middot; ' + hl(n.snippet, terms) + '</span></span><span class="arrow">&#8250;</span></a>';
      }).join('');
    }
    html += '<h3>Documents and links (' + refs.length + ')</h3>';
    html += refs.length ? refs.map(function (r) {
      return '<div class="card ref-card"><h3>' + hl(r.title, terms) + '</h3>' +
        '<div class="org">' + hl(r.org, terms) + ' &middot; ' + esc(r.category) + (r.models ? ' &middot; ' + hl(r.models, terms) : '') + '</div>' +
        '<p class="desc">' + hl(r.description, terms) + '</p>' +
        (r.topics && r.topics.length ? '<div class="q-meta">' + r.topics.map(function (t) { return '<span class="tag">' + esc(topicName(t)) + '</span>'; }).join('') + '</div>' : '') +
        '<a class="open" href="' + esc(r.url) + '" target="_blank" rel="noopener">Open original &#8599;</a></div>';
    }).join('') : '<p class="muted">No documents match. Try a shorter search word.</p>';
    out.innerHTML = html;
    var jumps = out.querySelectorAll('[data-jump]');
    for (var i = 0; i < jumps.length; i++) jumps[i].addEventListener('click', function (e) {
      sessionStorage.setItem('jumpSection', e.currentTarget.getAttribute('data-jump'));
    });
  }

  // ---------------------------------------------------------------- progress / saved / about
  function renderProgress() {
    setTop('My Progress', true);
    var rows = DATA.topics.map(function (t) {
      var r = 0, w = 0, seen = 0, total = 0;
      DATA.questions.forEach(function (q) {
        if (q.topic !== t.id) return; total++;
        var s = store.stats[q.id]; if (s) { seen++; r += s.r; w += s.w; }
      });
      var p = pct(r, r + w);
      return '<div class="bar-row"><div class="lbl"><span>' + esc(t.title) + '</span><span>' + (r + w ? p + '% &middot; ' : '') + seen + '/' + total + ' tried</span></div>' +
        '<div class="bar ' + (r + w ? (p >= 70 ? 'good' : 'bad') : '') + '"><span style="width:' + (r + w ? Math.max(p, 3) : 0) + '%"></span></div></div>';
    }).join('');
    var exams = store.exams.slice().reverse().map(function (e) {
      return '<a class="list-btn" href="#/exam/results/' + esc(e.id) + '"><span><span class="lt">' + e.pct + '% &middot; ' + e.correct + '/' + e.total + ' correct</span><span class="ld">' + fmtDate(e.date) + ' &middot; ' + fmtTime(e.usedSec) + ' used' + (e.auto ? ' (time ran out)' : '') + '</span></span><span class="arrow">&#8250;</span></a>';
    }).join('');
    var trend = '';
    if (store.exams.length > 1) {
      var last = store.exams.slice(-10);
      trend = '<div style="display:flex;align-items:flex-end;gap:6px;height:90px;margin:10px 0 4px">' + last.map(function (e) {
        return '<div title="' + e.pct + '%" style="flex:1;background:' + (e.pct >= 70 ? 'var(--green)' : 'var(--blue)') + ';height:' + Math.max(e.pct, 4) + '%;border-radius:4px 4px 0 0"></div>';
      }).join('') + '</div><p class="small muted">Last ' + last.length + ' exams, oldest on the left.</p>';
    }
    var o = overall();
    view(
      '<div class="card"><h2>Practice by subject</h2><p class="small muted">' + o.seen + ' of ' + DATA.questions.length + ' questions tried, ' + (o.r + o.w) + ' total answers.</p>' + rows + '</div>' +
      '<div class="card"><h2>Exam history</h2>' + (store.exams.length ? trend + exams : '<p class="muted">No exams taken yet.</p><a class="btn block" href="#/exam">Take a practice exam</a>') + '</div>' +
      '<div class="card"><h2>Back up or move your progress</h2><p class="small muted">Progress is stored only in this browser. Use these to make a backup file or move progress to another device.</p>' +
        '<div class="btn-row"><button class="btn secondary" id="exportBtn" type="button">Save backup file</button><label class="btn secondary" style="margin:0">Load backup file<input type="file" id="importFile" accept=".json,application/json" hidden></label></div>' +
        '<div class="spacer"></div><button class="btn danger block" id="resetBtn" type="button">Erase all my progress</button></div>'
    );
    on('#exportBtn', 'click', function () {
      var blob = new Blob([JSON.stringify(store, null, 1)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'thermal-study-progress-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
    });
    on('#importFile', 'change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var s = JSON.parse(rd.result);
          if (!s || typeof s.stats !== 'object') throw new Error('bad');
          modal('Replace progress?', '<p>This replaces the progress on this device with the backup file.</p>', [
            { label: 'Cancel', cls: 'secondary' },
            { label: 'Replace', fn: function () { store = s; var d = defaultStore(); for (var k in d) if (store[k] === undefined) store[k] = d[k]; saveStore(); toast('Progress loaded'); renderProgress(); } }
          ]);
        } catch (err) { toast('That file is not a progress backup.'); }
      };
      rd.readAsText(f);
    });
    on('#resetBtn', 'click', function () {
      modal('Erase all progress?', '<p>This deletes your practice history, bookmarks, flags and exam scores on this device. It cannot be undone.</p>', [
        { label: 'Cancel', cls: 'secondary' },
        { label: 'Erase', cls: 'danger', fn: function () { store = defaultStore(); saveStore(); toast('Progress erased'); renderProgress(); } }
      ]);
    });
  }

  function renderSaved() {
    setTop('Saved Questions', true);
    function section(title, list, name) {
      var qs = list.filter(function (id) { return Q[id]; });
      return '<div class="card"><h2>' + title + ' (' + qs.length + ')</h2>' +
        (qs.length ? '<button class="btn block" data-practice="' + name + '" type="button">Practice these</button>' +
          qs.map(function (id) {
            return '<div class="review-item"><div class="small muted">' + esc(topicName(Q[id].topic)) + '</div><p>' + esc(Q[id].question) + '</p>' +
              '<button class="btn ghost small-btn" data-remove="' + name + '" data-id="' + esc(id) + '" type="button">Remove</button></div>';
          }).join('') : '<p class="muted">None yet. Use the buttons under a practice question to add one.</p>') + '</div>';
    }
    view(section('&#9733; Bookmarked', store.bookmarks, 'bookmarks') + section('&#9873; Flagged for review', store.flags, 'flags'));
    on('[data-practice]', 'click', function (e) {
      var name = e.currentTarget.getAttribute('data-practice');
      startPractice(store[name].filter(function (id) { return Q[id]; }), name === 'bookmarks' ? 'Bookmarked' : 'Flagged');
    });
    on('[data-remove]', 'click', function (e) {
      toggleList(e.currentTarget.getAttribute('data-remove'), e.currentTarget.getAttribute('data-id'));
      renderSaved();
    });
  }

  function renderAbout() {
    setTop('About & Help', true);
    var counts = { basic: 0, intermediate: 0, advanced: 0 };
    DATA.questions.forEach(function (q) { counts[q.difficulty] = (counts[q.difficulty] || 0) + 1; });
    view(
      '<div class="card"><h2>About this app</h2>' +
        '<p>An independent study aid for technicians preparing for the Vertiv / Liebert Level 1 Thermal Management Technician exam (25 questions, 60 minutes, multiple choice, open book).</p>' +
        '<div class="note"><strong>Important:</strong> This app is not made, endorsed or reviewed by Vertiv. The questions are original practice questions written from public technical documents and general HVAC principles. They are <strong>not</strong> actual exam questions, and the exact exam content is unknown.</div>' +
        '<p>Every question is labeled:</p><ul>' +
          '<li><strong>Verified in source</strong> &ndash; the fact was checked in a linked public document.</li>' +
          '<li><strong>General technical principle</strong> &ndash; standard refrigeration / electrical / safety knowledge true for most equipment.</li>' +
          '<li><strong>Model-specific</strong> &ndash; true for the equipment named; other models or software versions may differ. Always check the unit\'s own manual.</li></ul>' +
        '<p class="small muted">Question bank: ' + DATA.questions.length + ' questions (' + counts.basic + ' basic, ' + counts.intermediate + ' intermediate, ' + counts.advanced + ' advanced), ' + DATA.scenarios.length + ' troubleshooting scenarios, ' + DATA.references.length + ' references. App version ' + APP_VERSION + '.</p></div>' +
      '<div class="card"><h2>Install on iPhone</h2><ol><li>Open this page in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> button (square with an up arrow).</li><li>Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li><li>Open it from the new Home Screen icon. After the first open it works without internet.</li></ol>' +
        '<p class="small muted">Note: on iPhone the Home Screen app keeps its own progress, separate from Safari. Use one or the other, or move progress with the backup button on My Progress.</p></div>' +
      '<div class="card"><h2>Offline</h2><p id="offlineStatus" class="small">Checking&hellip;</p><button class="btn secondary block" id="updBtn" type="button">Check for new questions now</button></div>'
    );
    var st = app.querySelector('#offlineStatus');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(function (reg) {
        st.textContent = reg && reg.active ? 'Ready for offline use. The app and study notes are saved on this device.' : 'Offline support is still setting up. Keep the app open for a few seconds while online.';
      });
    } else st.textContent = 'This browser does not support offline mode.';
    on('#updBtn', 'click', function () {
      if (!navigator.onLine) { toast('You are offline. Connect to the internet first.'); return; }
      if ('caches' in window) {
        caches.keys().then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
          .then(function () { location.reload(); });
      } else location.reload();
    });
  }

  // ---------------------------------------------------------------- startup
  function getJSON(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' (' + r.status + ')');
      return r.json().catch(function (e) { throw new Error(path + ' has a formatting error: ' + e.message); });
    });
  }
  function start() {
    loadStore();
    Promise.all(['data/questions.json', 'data/scenarios.json', 'data/topics.json', 'data/references.json'].map(getJSON))
      .then(function (res) {
        DATA.questions = res[0].questions || res[0];
        DATA.scenarios = res[1].scenarios || res[1];
        DATA.topics = res[2].topics || res[2];
        DATA.references = res[3].references || res[3];
        DATA.questions = DATA.questions.filter(function (q) { return q && q.id && q.choices && answerIndex(q) >= 0; });
        DATA.questions.forEach(function (q) { Q[q.id] = q; });
        DATA.topics.forEach(function (t) { TOPIC[t.id] = t; });
        DATA.references.forEach(function (r) { REF[r.id] = r; });
        render();
      })
      .catch(function (err) {
        app.innerHTML = '<div class="card"><h2>Could not load the study material</h2><p>' + esc(err.message) + '</p>' +
          '<p class="small muted">If you just edited a file in the data folder, open <strong>tools/check-questions.html</strong> to find the mistake. If you are offline and have never opened the app before, connect to the internet once.</p></div>';
      });
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('service-worker.js').catch(function () { /* offline mode unavailable */ });
    }
  }
  // Re-check the exam clock when the phone wakes up or the tab becomes visible.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && store.activeExam && Date.now() >= store.activeExam.endsAt) submitExam(true);
  });
  start();
})();
