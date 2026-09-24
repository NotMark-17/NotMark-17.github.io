/* UniExplore chance model, shared by /uniexplore/ and the markpatel.in portfolio. Load data.js first. */
(function () {
  'use strict';
  var U = (window.UE_DATA || []).slice();

  /* ---------- constants ---------- */
  var FX = { USD: 86, GBP: 115, AUD: 57, CAD: 63, SGD: 66 };              /* approximate INR rates */
  var LIVING = { US: 18000, UK: 15000, Australia: 27000, Canada: 20000, Singapore: 15000 };
  var CUR = { US: 'USD', UK: 'GBP', Australia: 'AUD', Canada: 'CAD', Singapore: 'SGD' };
  /* Model heuristic, not data: a stand-in selectivity for a school that publishes neither an admit rate
     nor an Indian-board bar. Never shown as an admit rate. */
  var BASE = { US: 0.5, UK: 0.6, Australia: 0.85, Canada: 0.55, Singapore: 0.15 };
  /* Model heuristic: how far from a school's typical Indian-board bar toward its published "high" bar we aim
     (0 = typical, 1 = high). Competitive majors go halfway; a subject the school is known for (its
     `strengths` in data.js) adds FLAGSHIP_W. Both together use the high bar. */
  var COMPETITIVE = { cs: 0.5, eng: 0.5, biz: 0.5, health: 0.5 };
  var FLAGSHIP_W = 0.5;
  var MAJOR_RX = {
    cs: /comput|informatic|software|data|\bai\b|cyber/i, eng: /engineer|aeronaut|electronic/i,
    biz: /business|commerce|econom|financ|accountan|actuar|\bmba\b/i, health: /medic|health|nurs|pharm|dent|veterinar/i,
    sci: /natural sci|math|physic|chem|life sci|^science$/i, soc: /social|politic|law\b|history|philosoph|linguist|international rel|\bppe\b|humanit|asia-pacific/i,
    design: /architect|design|\bart\b|media/i
  };
  var ACTS = [
    ['leadership', 'Leadership role'],
    ['competition', 'Olympiads & competitions'],
    ['research', 'Research or paper'],
    ['project', 'Built a product or project'],
    ['internship', 'Internship or work'],
    ['service', 'Sustained community work'],
    ['arts', 'Sport, music or art']
  ];
  var ALEVELS = ['A*A*A*', 'A*A*A', 'A*AA', 'AAA', 'AAB', 'ABB', 'BBB', 'BBC', 'BCC', 'CCC'];
  var ALEVEL_PCT = [98, 96, 94, 91, 88, 85, 81, 78, 75, 72];
  var ENG = {
    ielts: { min: 4, max: 9, step: 0.5, label: 'Overall band', key: 'ieltsMin', top: 7.5 },
    toefl: { min: 40, max: 120, step: 1, label: 'Total score', key: 'toeflMin', top: 105 },
    duolingo: { min: 60, max: 160, step: 5, label: 'Overall score', key: 'duolingoMin', top: 130 }
  };
  /* Mark's own application year: applied to these; admitted where marked. */
  var MARK = {
    applied: ['arizona state', 'massachusetts amherst', 'penn', 'purdue', 'rutgers', 'washington', 'ohio state', 'michigan state', 'illinois', "king's college", 'leeds', 'manchester', 'warwick', 'university of sydney', 'swinburne', 'monash', 'adelaide', 'macquarie'],
    admitted: ['penn', 'university of sydney']
  };
  var EXAMPLE = {
    board: 'cbse', score: 88, alevel: 'AAB', stream: 'pcm', hist: { m9: 86, m10: 91, m11: 84 },
    sat: 1380, act: null, apN: null, ap45: null, engType: 'ielts', eng: 7,
    acts: { leadership: 2, competition: 1, research: 0, project: 3, internship: 2, service: 1, arts: 0 },
    major: 'cs', countries: ['US', 'UK', 'Australia', 'Canada', 'Singapore'],
    budget: 60, needAid: false, intake: new Date().getFullYear() + 1, example: true
  };
  var FRESH = {
    board: 'cbse', score: 80, alevel: 'ABB', stream: 'pcm', hist: { m9: null, m10: null, m11: null },
    sat: null, act: null, apN: null, ap45: null, engType: 'none', eng: null,
    acts: { leadership: 0, competition: 0, research: 0, project: 0, internship: 0, service: 0, arts: 0 },
    major: 'cs', countries: ['US', 'UK', 'Australia', 'Canada', 'Singapore'],
    budget: 50, needAid: false, intake: new Date().getFullYear() + 1, example: false
  };

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sig(x) { return 1 / (1 + Math.exp(-x)); }
  function logit(p) { p = clamp(p, 0.01, 0.99); return Math.log(p / (1 - p)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lakh(inr) { var l = inr / 1e5; return '₹' + (l >= 100 ? (l / 100).toFixed(2).replace(/\.?0+$/, '') + 'Cr' : Math.round(l) + 'L'); }
  function norm(s) { return String(s || '').toLowerCase(); }
  /* US GPAs run higher than Indian board marks: 4.0 ~ 93%, 3.5 ~ 82%, 3.0 ~ 72%, 2.5 ~ 64% */
  function gpaToPct(g) { return g >= 3 ? 72 + (g - 3) * 21 : 72 - (3 - g) * 16; }
  function pctToGpa(p) { return p >= 72 ? 3 + (p - 72) / 21 : 3 - (72 - p) / 16; }
  function actToSat(a) { var t = { 36: 1590, 35: 1550, 34: 1520, 33: 1490, 32: 1450, 31: 1420, 30: 1390, 29: 1350, 28: 1310, 27: 1280, 26: 1240, 25: 1210, 24: 1180, 23: 1140, 22: 1110, 21: 1080, 20: 1040, 19: 1010, 18: 970 }; return t[a] || (a > 36 ? 1600 : a < 18 ? 950 : null); }

  /* normalise the three research files into one shape */
  U = U.map(function (u) {
    var c = u.country;
    var cur = u.currency || CUR[c] || 'USD';
    var tuition = u.tuitionUSD != null ? u.tuitionUSD : u.tuitionGBP != null ? u.tuitionGBP : u.tuition;
    var living = u.livingUSD != null ? u.livingUSD : u.livingGBP != null ? u.livingGBP : u.living;
    var livingEst = living == null;
    if (livingEst) living = LIVING[c] || 18000;
    var cost = tuition != null ? Math.round((tuition + living) * (FX[cur] || 86)) : null;
    var n = norm(u.name);
    return Object.assign({}, u, {
      cur: cur, tuitionN: tuition, livingN: living, livingEst: livingEst, costINR: cost,
      markApplied: MARK.applied.some(function (k) { return n.indexOf(k) !== -1 && !(k === 'penn' && n.indexOf('pennsylvania') === -1 && n.indexOf('penn state') === -1) && !(k === 'washington' && n.indexOf('university of washington') === -1); }),
      markAdmitted: MARK.admitted.some(function (k) { return (k === 'penn' ? /penn state|pennsylvania state/.test(n) : n.indexOf(k) !== -1); })
    });
  });

  /* ---------- the model ---------- */
  /* How much each year counts when you apply from an Indian board.
     US: the whole transcript, 11th heaviest (12th finals aren't out yet).
     UK / Australia / Singapore: predicted 12th leads; 10th boards matter for UK and Singapore.
     Canada: final 11th plus predicted 12th. */
  var YEAR_W = {
    US: { m9: .15, m10: .25, m11: .35, m12: .25 },
    UK: { m10: .25, m11: .15, m12: .6 },
    Australia: { m11: .3, m12: .7 },
    Canada: { m10: .1, m11: .4, m12: .5 },
    Singapore: { m10: .3, m11: .1, m12: .6 },
    all: { m9: .1, m10: .25, m11: .3, m12: .35 }
  };
  var INDIAN = { cbse: 1, isc: 1, state: 1 };
  /* AP exams as a rigor signal. Model heuristics, not any university's published policy.
     cap: the most AP can add to z (4 marks points = 1.0 in z), per country. The US reads AP as
     course rigor; elsewhere it is supplementary to Indian-board marks, so it barely moves.
     half: how many 4s and 5s get you halfway to the cap (diminishing returns after that).
     Scores of 1-3 add nothing and cost nothing: applicants choose which scores to report. */
  var AP_W = { cap: { US: 0.4, UK: 0.12, Canada: 0.12, Singapore: 0.1, Australia: 0.08 }, half: 3 };
  function apHi(P) {
    var hi = +P.ap45 || 0, n = +P.apN || 0;
    return n ? Math.min(hi, n) : hi;
  }
  function apLift(P, country) {
    var k = apHi(P), cap = AP_W.cap[country] || 0;
    return k > 0 ? cap * (1 - Math.pow(0.5, k / AP_W.half)) : 0;
  }
  function hv(P, k) { var v = P.hist && P.hist[k]; return v == null || v === '' || isNaN(v) ? null : clamp(+v, 0, 100); }
  /* Model heuristics. A predicted 12th far above your record is discounted: past `gap` points above the
     anchor, only `keep` of the excess counts. The anchor is your 11th, or your weakest earlier year if 11th
     is blank, so leaving 11th out can't dodge it. The US reads the whole transcript, so its discount is milder. */
  var PRED_DISCOUNT = { US: { gap: 12, keep: 0.75 }, other: { gap: 8, keep: 0.5 } };
  /* Model heuristic: state-board percentages aren't normalised against CBSE/ISC. We take off a token 2 points
     (smaller than the gaps some universities publish in data.js, e.g. Leeds and Adelaide) and say so. */
  var STATE_ADJ = -2;
  /* Board score ranges; scores are clamped to these inside the model. */
  var BOARD_RANGE = { ib: [24, 45], gpa: [0, 4], pct: [33, 100] };
  function ibToPct(pts) { return 60 + (pts - 24) * (38 / 21); }
  function predInfo(P, country) {
    var raw = clamp(+P.score || 0, BOARD_RANGE.pct[0], BOARD_RANGE.pct[1]), m11 = hv(P, 'm11');
    var early = ['m9', 'm10'].map(function (k) { return hv(P, k); }).filter(function (v) { return v != null; });
    var anchor = m11 != null ? m11 : early.length ? Math.min.apply(null, early) : null;
    var d = country ? PRED_DISCOUNT[country === 'US' ? 'US' : 'other'] : null, pred = raw;
    if (d && anchor != null && raw > anchor + d.gap) pred = anchor + d.gap + (raw - anchor - d.gap) * d.keep;
    return { raw: raw, pred: pred, anchor: anchor, from11: m11 != null, discounted: pred < raw };
  }
  function toPct(P, country) {
    if (P.board === 'ib') return ibToPct(clamp(+P.score || 0, BOARD_RANGE.ib[0], BOARD_RANGE.ib[1]));
    if (P.board === 'gpa') return gpaToPct(clamp(+P.score || 0, BOARD_RANGE.gpa[0], BOARD_RANGE.gpa[1]));
    if (P.board === 'alevel') { var i = ALEVELS.indexOf(P.alevel); return i < 0 ? 85 : ALEVEL_PCT[i]; }
    var w = YEAR_W[country] || YEAR_W.all, pred = predInfo(P, country).pred;
    var known = {}, sum = 0, wt = 0, all = 0, low = null;
    ['m9', 'm10', 'm11'].forEach(function (k) { var v = hv(P, k); if (v != null) low = low == null ? v : Math.min(low, v); });
    Object.keys(w).forEach(function (k) {
      var v = k === 'm12' ? pred : hv(P, k); all += w[k];
      if (v != null) { known[k] = v; sum += v * w[k]; wt += w[k]; }
    });
    /* weights renormalised over the years you gave, except that a blank year never counts for more than
       your weakest reported year: leaving a weak year out can't score above reporting it */
    var fill = low == null ? sum / wt : Math.min(low, sum / wt), tot = 0;
    Object.keys(w).forEach(function (k) { tot += (k in known ? known[k] : fill) * w[k]; });
    return tot / all + (P.board === 'state' ? STATE_ADJ : 0);
  }
  function missingYears(P) {
    if (!INDIAN[P.board]) return [];
    var need = {};
    P.countries.forEach(function (c) { Object.keys(YEAR_W[c] || {}).forEach(function (k) { if (k !== 'm12') need[k] = 1; }); });
    return ['m9', 'm10', 'm11'].filter(function (k) { return need[k] && hv(P, k) == null; });
  }
  var YEAR_NAME = { m9: 'Class 9', m10: 'Class 10', m11: 'Class 11' };
  function joinAnd(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  /* Rising marks read well in the US. Model heuristic: 11th against the average of your earlier years you
     gave, TREND_W per point, capped at TREND_CAP in z. TREND_W stays under the smallest weight a single
     earlier year gets in the blend (US m9 .15 / 4), so raising any year's mark never lowers a chance. */
  var TREND_W = 0.035, TREND_CAP = 0.3;
  function trend(P) {
    var b = hv(P, 'm11'), e = ['m9', 'm10'].map(function (k) { return hv(P, k); }).filter(function (v) { return v != null; });
    return b == null || !e.length ? 0 : b - e.reduce(function (s, v) { return s + v; }, 0) / e.length;
  }
  /* US bar when a school publishes no average GPA: a least-squares line of gpaToPct(gpaAvg) against
     acceptanceRate over the US schools in data.js that publish both, fitted at load (not hand-set). */
  var US_FIT = (function () {
    var pts = U.filter(function (u) { return u.country === 'US' && u.gpaAvg && u.acceptanceRate != null; });
    var n = pts.length, mx = 0, my = 0, sxy = 0, sxx = 0;
    pts.forEach(function (u) { mx += u.acceptanceRate / n; my += gpaToPct(u.gpaAvg) / n; });
    pts.forEach(function (u) { var dx = u.acceptanceRate - mx; sxy += dx * (gpaToPct(u.gpaAvg) - my); sxx += dx * dx; });
    var b = n > 1 && sxx ? sxy / sxx : 0;
    return { a: my - b * mx, b: b, n: n };
  })();
  function compW(u, P) {
    var rx = MAJOR_RX[P.major], flag = !!(rx && (u.strengths || []).some(function (s) { return rx.test(s); }));
    return { w: Math.min(1, (COMPETITIVE[P.major] || 0) + (flag ? FLAGSHIP_W : 0)), comp: !!COMPETITIVE[P.major], flag: flag };
  }
  /* Model heuristic: a published average GPA (and US_FIT) is the mean of ADMITTED students, not a pass bar.
     The more a school admits, the further below that mean its bar sits and the flatter the slope:
     bar = mean - drop x admit rate, and the marks gap counts 1 / (1 + widen x admit rate) as much. */
  var ADMIT_MEAN = { drop: 8, widen: 1 };
  /* the most a board's score can reach on our scale: a bar above it could never be met */
  function maxPct(P) {
    return P.board === 'ib' ? ibToPct(BOARD_RANGE.ib[1]) : P.board === 'gpa' ? gpaToPct(BOARD_RANGE.gpa[1]) : P.board === 'alevel' ? ALEVEL_PCT[0] : 100 + (P.board === 'state' ? STATE_ADJ : 0);
  }
  function reqInfo(u, P) {
    var cw = compW(u, P), top = maxPct(P), ir = u.indiaReq;
    var ib = P.board === 'ib' && u.ibReq && (u.ibReq.typical || u.ibReq.high);
    /* a per-course figure from the university's own table beats the typical/high blend */
    var bm = !ib && ir && ((P.board === 'isc' && ir.byMajorISC && ir.byMajorISC[P.major]) || (ir.byMajor && ir.byMajor[P.major]));
    if (bm) return { v: Math.min(bm, top), raw: bm, src: 'india', t: bm, h: bm, cw: cw, course: true };
    var r = ib ? u.ibReq : ir;
    if (r && (r.typical || r.high)) {
      var t = r.typical || r.high, h = r.high || t, raw = t + (h - t) * cw.w;
      return { v: Math.min(ib ? ibToPct(raw) : raw, top), raw: raw, src: ib ? 'ib' : 'india', t: t, h: h, cw: cw };
    }
    var bump = 3 * cw.w;   /* no separate bar published: competitive courses still sit a little higher */
    var ar = u.acceptanceRate != null ? u.acceptanceRate : BASE[u.country];
    if (u.country === 'US') {
      var mean = u.gpaAvg ? gpaToPct(u.gpaAvg) : US_FIT.a + US_FIT.b * ar;
      return { v: Math.min(mean - ADMIT_MEAN.drop * ar + bump, top), src: u.gpaAvg ? 'gpa' : 'est', cw: cw, flat: 1 + ADMIT_MEAN.widen * ar };
    }
    if (u.gpaAvg) return { v: Math.min(gpaToPct(u.gpaAvg) + bump, top), src: 'gpa', cw: cw };
    return { v: Math.min(97 - ar * 20 + bump, top), src: 'est', cw: cw };
  }
  function reqPct(u, P) { return reqInfo(u, P).v; }
  /* Selectivity for schools without a published admit rate. Model heuristic, never shown as an admit rate:
     a higher Indian-board bar means a more selective school. We interpolate in log-odds from the country's
     BASE at IMPLIED_FLOOR_BAR up to the schools in data.js that publish both a bar and a real admit rate
     (Oxford, Cambridge), and never go below them. No bar published: BASE. */
  var IMPLIED_FLOOR_BAR = 70;
  var ANCHOR = (function () {
    var s = 0, l = 0, n = 0;
    U.forEach(function (u) { if (u.acceptanceRate != null && u.indiaReq && u.indiaReq.typical) { s += u.indiaReq.typical; l += logit(u.acceptanceRate); n++; } });
    return n ? { bar: s / n, lo: l / n, n: n } : null;
  })();
  function selectivity(u) {
    if (u.acceptanceRate != null) return { ar: u.acceptanceRate, real: true };
    var base = BASE[u.country] || 0.5, t = u.indiaReq && (u.indiaReq.typical || u.indiaReq.high);
    if (!t || !ANCHOR || ANCHOR.bar <= IMPLIED_FLOOR_BAR) return { ar: base, real: false };
    var f = clamp((t - IMPLIED_FLOOR_BAR) / (ANCHOR.bar - IMPLIED_FLOOR_BAR), 0, 1), lb = logit(base);
    return { ar: sig(lb + (Math.min(lb, ANCHOR.lo) - lb) * f), real: false, implied: true };
  }
  /* Model heuristic: selective schools turn down most applicants whatever their numbers, so a chance can't
     exceed 1 - (1 - ar)^CEIL_K. That is about CEIL_K x the admit rate at the very selective end and fades
     smoothly: 13% admit -> 37% max, 25% -> 60%, 30% -> 68%, 50% -> 89%. */
  var CEIL_K = 3.2;
  function ceilingFor(ar) { return 1 - Math.pow(1 - ar, CEIL_K); }
  function actScore(P) {
    var w = { leadership: 1.1, competition: 1.3, research: 1.3, project: 1.2, internship: 0.9, service: 0.8, arts: 0.8 };
    var s = 0, max = 0;
    Object.keys(w).forEach(function (k) { s += (P.acts[k] || 0) * w[k]; max += 3 * w[k]; });
    return clamp(s / (max * 0.55), 0, 1);   /* strong at ~55% of the maximum: nobody does everything */
  }
  /* Beyond marks, model heuristics. ACT_W.avg (about four school-level activities, or two at city level) is
     neutral. Above it the US reads activities heavily and elsewhere lightly; below it the penalty tapers to
     `floor` at a blank section, since a blank form mostly means "not filled in yet". */
  var ACT_W = { avg: 0.35, up: { US: 2.2, other: 0.5 }, floor: { US: -0.3, other: -0.1 } };
  function actZ(P, country) {
    var a = actScore(P), k = country === 'US' ? 'US' : 'other';
    return a >= ACT_W.avg ? (a - ACT_W.avg) * ACT_W.up[k] : (ACT_W.avg - a) / ACT_W.avg * ACT_W.floor[k];
  }
  function satOf(P) { return P.sat || (P.act ? actToSat(P.act) : null); }
  /* SAT/ACT, model heuristics: a score moves z by `slope` per middle-50% width from the midpoint. Test-optional:
     you'd withhold a weak score, so it never costs more than not sending (`optional`). No published middle 50%:
     nothing to compare against, so a score is neutral and so is not sending one (a required test still counts). */
  var TEST_W = { slope: 1.2, minSpread: 60, optional: -0.25, required: -1.6 };
  function engCheck(u, P) {
    if (P.engType === 'none' || P.eng == null || P.eng === '') return { state: 'missing' };
    var need = u[ENG[P.engType].key];
    if (need == null) return { state: 'unknown' };
    return P.eng >= need ? { state: 'ok', need: need } : { state: 'short', need: need, gap: +(need - P.eng).toFixed(1) };
  }
  /* English, model heuristics. A published minimum is a hard requirement: below it, z drops with the gap
     (`perRange` per full test range, at most `max`) and the chance is capped at `cap`, a reach. No test yet: a
     small `missing` penalty. */
  var ENG_W = { missing: -0.15, perRange: 4, max: 2, cap: 0.3 };
  /* Hard gates. Each caps the chance at GATE_CAP (the same as a published minimum) and tags the card:
     a required test you haven't taken, a missing Class 12 subject, a board the university doesn't accept,
     Cambridge's AP rule for CBSE. Subject needs are model heuristics from the stream you picked. */
  var GATE_CAP = 0.05;
  var STREAM_HAS = { maths: { pcm: 1, pcmb: 1, com: 1 }, bio: { pcb: 1, pcmb: 1 } };
  var MAJOR_NEEDS = { cs: 'maths', eng: 'maths', sci: 'maths', health: 'bio' };
  /* Model heuristic: medicine and health courses add admissions tests and interviews, and schools without a
     published admit rate or bar are guesses; neither is ever called safe. */
  var NOT_SAFE_CAP = 0.67;
  function hasHealth(u) {
    return (u.strengths || []).some(function (s) { return MAJOR_RX.health.test(s); }) || !!(u.tuitionByMajor && u.tuitionByMajor.health) ||
      !!(u.indiaReq && u.indiaReq.byMajor && u.indiaReq.byMajor.health) || /medicine|mbchb|nursing|pharmacy/i.test([u.tuitionNote, u.indiaReqNote, u.note].join(' '));
  }
  function chance(u, P) {
    var A = toPct(P, u.country), rq = reqInfo(u, P), req = rq.v;
    var z = (A - req) / (4 * (rq.flat || 1));
    if (u.country === 'US' && INDIAN[P.board]) z += clamp(trend(P) * TREND_W, -TREND_CAP, TREND_CAP) / (rq.flat || 1);   /* rising marks read well; scaled with the marks gap so it stays monotone */
    var sat = satOf(P), notes = [];
    if (u.country === 'US') {
      if (u.testPolicy === 'blind') { notes.push('blind'); }
      else if (!u.satMid50) {
        if (!sat && u.testPolicy === 'required') { z += TEST_W.required; notes.push('needs-test'); }
        else if (sat) notes.push('sat-neutral');
      } else if (sat) {
        var mid = (u.satMid50[0] + u.satMid50[1]) / 2, spread = Math.max(TEST_W.minSpread, u.satMid50[1] - u.satMid50[0]);
        var eff = (sat - mid) / spread * TEST_W.slope;
        if (u.testPolicy !== 'required') { eff = Math.max(eff, TEST_W.optional); if (sat < u.satMid50[0]) notes.push('withhold'); }   /* you'd simply not send it */
        z += eff;
      } else if (u.testPolicy === 'required') { z += TEST_W.required; notes.push('needs-test'); }
      else z += TEST_W.optional;
    } else if (sat && u.satUsed) z += Math.max(0, (sat - 1300) / 200) * 0.4;
    z += actZ(P, u.country);
    var ap = apLift(P, u.country);
    z += ap;
    var e = engCheck(u, P), cfg = ENG[P.engType];
    if (e.state === 'missing') z += ENG_W.missing;
    else if (e.state === 'short') { z -= clamp(e.gap / (cfg.max - cfg.min) * ENG_W.perRange, 0, ENG_W.max); notes.push('eng-short'); }
    var sel = selectivity(u), ar = sel.ar;
    var p = sig(logit(ar) + z * 0.9);
    /* the ceiling uses the admit rate for applicants like you where the university publishes one */
    var ceil = ceilingFor(u.intlAdmitRate != null ? Math.min(ar, u.intlAdmitRate) : ar);
    if (p > ceil) { p = ceil; notes.push('ceiling'); }
    if (e.state === 'short') p = Math.min(p, ENG_W.cap);
    var gate = function (n) { p = Math.min(p, GATE_CAP); notes.push(n); };
    if (u.indiaReqMin && INDIAN[P.board] && predInfo(P).raw < u.indiaReqMin) gate('below-min');   /* published hard minimum, on your Class 12 score */
    if (notes.indexOf('needs-test') !== -1) p = Math.min(p, GATE_CAP);
    var need = MAJOR_NEEDS[P.major];
    if (need && P.stream && STREAM_HAS[need] && !STREAM_HAS[need][P.stream]) gate(need === 'bio' ? 'needs-bio' : 'needs-maths');
    if (INDIAN[P.board] && u.boards && u.boards.indexOf(P.board) === -1) gate('board-not-accepted');
    if (P.board === 'cbse' && u.cbseRule && (u.cbseRule.okMajors || []).indexOf(P.major) === -1 && apHi(P) < u.cbseRule.apMin) gate('cbse-ap');
    if (P.major === 'health') { notes.push('health'); if (!hasHealth(u)) notes.push('no-med'); p = Math.min(p, NOT_SAFE_CAP); }
    if (!sel.real && !sel.implied && rq.src === 'est') { notes.push('no-bar'); p = Math.min(p, NOT_SAFE_CAP); }
    p = clamp(p, 0.02, 0.97);
    var band = p >= 0.68 ? 'safe' : p >= 0.35 ? 'target' : 'reach';
    return { p: p, band: band, A: A, req: req, rq: rq, sel: sel, ceil: ceil, sat: sat, ap: ap, notes: notes };
  }
  var RANK = { reach: 0, target: 1, safe: 2 };

  function evaluate(P) {
    return U.filter(function (u) { return P.countries.indexOf(u.country) !== -1; }).map(function (u) {
      var c = chance(u, P);
      var e = engCheck(u, P);
      var k = costFor(u, P);
      var over = k.cost != null && Math.round(k.cost / 1e5) > P.budget;   /* compared as shown, in whole lakh */
      /* need-blind, full-need universities: if you need aid, the sticker price isn't what you'd pay */
      var aidCover = P.needAid && over && u.aidPolicy === 'need-blind-full';
      if (aidCover) over = false;
      var aid = !P.needAid ? null : u.intlAid === 'none' ? 'none' : u.intlAid === 'limited' ? 'limited' : u.intlAid == null ? 'unknown' : null;
      return { u: u, c: c, e: e, cost: k.cost, tuition: k.tuition, over: over, aidCover: aidCover, aid: aid, aidRisk: aid === 'none' || aid === 'limited' };
    }).sort(function (a, b) { return b.c.p - a.c.p; });
  }
  /* yearly cost in INR for your major: the per-course fee where the university lists one, plus any college fee */
  function costFor(u, P) {
    var t = u.tuitionByMajor && u.tuitionByMajor[P.major] != null ? u.tuitionByMajor[P.major] : u.tuitionN;
    return { tuition: t, cost: t == null ? null : Math.round((t + (u.collegeFee || 0) + u.livingN) * (FX[u.cur] || 86)) };
  }

  window.UEM = {
    U: U, FX: FX, LIVING: LIVING, CUR: CUR, BASE: BASE, COMPETITIVE: COMPETITIVE,
    FLAGSHIP_W: FLAGSHIP_W, MAJOR_RX: MAJOR_RX, ACTS: ACTS, ALEVELS: ALEVELS, ALEVEL_PCT: ALEVEL_PCT, ENG: ENG,
    MARK: MARK, EXAMPLE: EXAMPLE, FRESH: FRESH, clamp: clamp, sig: sig, logit: logit,
    clone: clone, esc: esc, lakh: lakh, norm: norm, gpaToPct: gpaToPct, pctToGpa: pctToGpa,
    actToSat: actToSat, YEAR_W: YEAR_W, INDIAN: INDIAN, AP_W: AP_W, apHi: apHi, apLift: apLift,
    hv: hv, PRED_DISCOUNT: PRED_DISCOUNT, STATE_ADJ: STATE_ADJ, BOARD_RANGE: BOARD_RANGE, ibToPct: ibToPct, predInfo: predInfo,
    toPct: toPct, missingYears: missingYears, YEAR_NAME: YEAR_NAME, joinAnd: joinAnd, TREND_W: TREND_W, TREND_CAP: TREND_CAP,
    trend: trend, US_FIT: US_FIT, compW: compW, ADMIT_MEAN: ADMIT_MEAN, maxPct: maxPct, reqInfo: reqInfo,
    reqPct: reqPct, IMPLIED_FLOOR_BAR: IMPLIED_FLOOR_BAR, ANCHOR: ANCHOR, selectivity: selectivity, CEIL_K: CEIL_K, ceilingFor: ceilingFor,
    actScore: actScore, ACT_W: ACT_W, actZ: actZ, satOf: satOf, TEST_W: TEST_W, engCheck: engCheck,
    ENG_W: ENG_W, GATE_CAP: GATE_CAP, STREAM_HAS: STREAM_HAS, MAJOR_NEEDS: MAJOR_NEEDS, NOT_SAFE_CAP: NOT_SAFE_CAP, hasHealth: hasHealth,
    chance: chance, RANK: RANK, evaluate: evaluate, costFor: costFor
  };
})();
