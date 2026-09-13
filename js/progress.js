// progress.js — 学习进度追踪
// 数据模型（每用户）:
// { completedTopics:[], quizScores:{youth:{score,total,pct},...},
//   studyMinutes:0, lastStudyAt:null, streak:0, caseViews:[],
//   topicViews:[{id,at}], interactions:{ai:0,quiz:0,flip:0},
//   todayMinutes:0, todayDate:'YYYY-MM-DD' }
(function () {
  var Progress = {};

  Progress.default = function () {
    return {
      completedTopics: [],
      quizScores: {},
      studyMinutes: 0,
      lastStudyAt: null,
      streak: 0,
      caseViews: [],
      topicViews: [],
      interactions: { ai: 0, quiz: 0, flip: 0 },
      todayMinutes: 0,
      todayDate: Progress.today()
    };
  };

  Progress.today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  Progress.get = function () {
    var u = window.Auth && window.Auth.current();
    if (!u) return Progress.default();
    var p = window.Store.getProgress(u.username);
    if (!p) {
      p = Progress.default();
      window.Store.setProgress(u.username, p);
    }
    // 跨日重置 todayMinutes
    if (p.todayDate !== Progress.today()) {
      p.todayDate = Progress.today();
      p.todayMinutes = 0;
    }
    return p;
  };

  Progress.save = function (p) {
    var u = window.Auth && window.Auth.current();
    if (!u) return;
    window.Store.setProgress(u.username, p);
  };

  // 标记主题完成（toggle）；返回 true 表示标记为完成，false 表示取消
  Progress.markTopic = function (topicId) {
    var u = window.Auth.current();
    if (!u) return false;
    var p = Progress.get();
    var i = p.completedTopics.indexOf(topicId);
    var marked;
    if (i >= 0) {
      p.completedTopics.splice(i, 1);
      marked = false;
    } else {
      p.completedTopics.push(topicId);
      marked = true;
      // 加分
      if (window.Auth) window.Auth.addPoints(5);
      Progress.touchStreak(p);
    }
    p.lastStudyAt = new Date().toISOString();
    Progress.save(p);
    return marked;
  };

  Progress.isTopicDone = function (topicId) {
    return Progress.get().completedTopics.indexOf(topicId) >= 0;
  };

  // 记录主题浏览（每次 +2 分钟学习时间，单主题每日上限 10 分钟）
  Progress.recordTopicView = function (topicId) {
    var u = window.Auth.current();
    if (!u) return;
    var p = Progress.get();
    var today = Progress.today();
    var todayViews = p.topicViews.filter(function (v) { return v.id === topicId && v.at.indexOf(today) === 0; });
    if (todayViews.length < 5) {  // 每日每主题最多记 5 次
      p.topicViews.push({ id: topicId, at: new Date().toISOString() });
      p.todayMinutes += 2;
      p.studyMinutes += 2;
      Progress.touchStreak(p);
      Progress.save(p);
    }
  };

  Progress.recordInteract = function (type) {
    var u = window.Auth.current();
    if (!u) return;
    var p = Progress.get();
    p.interactions[type] = (p.interactions[type] || 0) + 1;
    Progress.save(p);
  };

  Progress.recordQuizScore = function (modKey, score, total) {
    var u = window.Auth.current();
    if (!u) return;
    var p = Progress.get();
    var pct = Math.round(score / total * 100);
    var prev = p.quizScores[modKey];
    p.quizScores[modKey] = { score: score, total: total, pct: pct };
    // 仅在超越历史最佳或首次完成时加分；满分 +20
    if (!prev || pct > prev.pct) {
      if (pct === 100) window.Auth.addPoints(20);
      else if (!prev) window.Auth.addPoints(5);
    }
    Progress.touchStreak(p);
    p.lastStudyAt = new Date().toISOString();
    Progress.save(p);
  };

  Progress.recordCaseViews = function (caseIds) {
    var u = window.Auth.current();
    if (!u) return;
    var p = Progress.get();
    var changed = false;
    (caseIds || []).forEach(function (id) {
      if (p.caseViews.indexOf(id) < 0) {
        p.caseViews.push(id);
        changed = true;
      }
    });
    if (changed) {
      Progress.touchStreak(p);
      Progress.save(p);
    }
  };

  Progress.isCaseViewed = function (caseId) {
    return Progress.get().caseViews.indexOf(caseId) >= 0;
  };

  // 连续学习天数：今日有学习记录则保留；昨日的 streak 顺延；中断则归 1
  Progress.touchStreak = function (p) {
    var today = Progress.today();
    if (p.lastStudyAt && p.lastStudyAt.indexOf(today) === 0) return; // 今日已计
    var y = new Date(); y.setDate(y.getDate() - 1);
    var yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    if (p.lastStudyAt && p.lastStudyAt.indexOf(yd) === 0) p.streak = (p.streak || 0) + 1;
    else p.streak = 1;
    // 连续 7 天奖励（仅在第 7 天触发）
    if (p.streak === 7) {
      if (window.Auth) window.Auth.addPoints(30);
      if (window.UI) window.UI.toast('连续学习 7 天！+30 积分', 'success');
    }
    p.lastStudyAt = new Date().toISOString();
  };

  // 完成度统计
  Progress.modulePct = function (modKey) {
    var p = Progress.get();
    var m = window.COURSES.getModule(modKey);
    if (!m || !m.topics.length) return 0;
    var done = m.topics.filter(function (t) { return p.completedTopics.indexOf(t.id) >= 0; }).length;
    return Math.round(done / m.topics.length * 100);
  };

  Progress.overallPct = function () {
    var p = Progress.get();
    var all = window.COURSES.allModules().reduce(function (s, m) { return s + m.topics.length; }, 0);
    if (!all) return 0;
    return Math.round(p.completedTopics.length / all * 100);
  };

  Progress.moduleDoneCount = function (modKey) {
    var p = Progress.get();
    var m = window.COURSES.getModule(modKey);
    return m.topics.filter(function (t) { return p.completedTopics.indexOf(t.id) >= 0; }).length;
  };

  // 学习日历（最近 35 天，每日学习强度 0-3）
  Progress.calendar = function () {
    var p = Progress.get();
    var days = [];
    for (var i = 34; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var mins = 0;
      // 估算：topicViews/at 命中当日 → 2 分钟/次
      p.topicViews.forEach(function (v) { if (v.at.indexOf(ds) === 0) mins += 2; });
      var lvl = 0;
      if (mins >= 10) lvl = 3; else if (mins >= 6) lvl = 2; else if (mins > 0) lvl = 1;
      days.push({ date: ds, level: lvl });
    }
    return days;
  };

  window.Progress = Progress;
})();
