// achievements.js — 徽章、积分、等级
(function () {
  var A = {};

  // 等级阶梯（按累计积分）
  A.LEVELS = [
    { lv: 1, name: '普法小白', min: 0, icon: '🌱' },
    { lv: 2, name: '入门学员', min: 20, icon: '📖' },
    { lv: 3, name: '法律学徒', min: 60, icon: '⚖️' },
    { lv: 4, name: '法律能手', min: 120, icon: '🛡️' },
    { lv: 5, name: '法律达人', min: 200, icon: '🏅' },
    { lv: 6, name: '法治宣讲员', min: 320, icon: '📣' },
    { lv: 7, name: '普法先锋', min: 500, icon: '⭐' },
    { lv: 8, name: '法治守护者', min: 750, icon: '🏆' },
    { lv: 9, name: '法治播种人', min: 1200, icon: '👑' }
  ];

  // 徽章定义（id 唯一；desc 触发条件说明）
  A.BADGES = [
    { id: 'first_topic', name: '初入法门', icon: '🚪', desc: '完成首个学习主题', color: '#2D8659',
      test: function () { return window.Progress.get().completedTopics.length >= 1; } },
    { id: 'module_quiz_80', name: '段位学徒', icon: '🎓', desc: '任一板块闯关正确率 ≥ 80%', color: '#1F5FA8',
      test: function () {
        var p = window.Progress.get();
        return ['youth', 'mid', 'old'].some(function (k) {
          return p.quizScores[k] && p.quizScores[k].pct >= 80;
        });
      } },
    { id: 'all_modules', name: '三段通晓', icon: '🛡️', desc: '完成三大板块全部主题', color: '#8E1626',
      test: function () {
        var p = window.Progress.get();
        return window.COURSES.allModules().every(function (m) {
          return m.topics.every(function (t) { return p.completedTopics.indexOf(t.id) >= 0; });
        });
      } },
    { id: 'all_cases', name: '大案观览者', icon: '⚖️', desc: '阅读完全部 6 个大案', color: '#7B2D8E',
      test: function () {
        var p = window.Progress.get();
        return window.COURSES.CASES.every(function (c) { return p.caseViews.indexOf(c.id) >= 0; });
      } },
    { id: 'streak_7', name: '连勤之星', icon: '🔥', desc: '连续学习 7 天', color: '#D97706',
      test: function () { return (window.Progress.get().streak || 0) >= 7; } },
    { id: 'first_post', name: '发声者', icon: '📝', desc: '在社区发表首条帖子', color: '#0D7377',
      test: function () { return window.Community.list().length > 0; } },
    { id: 'adopted_3', name: '普法先锋', icon: '⭐', desc: '回答被采纳 3 次', color: '#B8862D',
      test: function () {
        var u = window.Auth.current();
        if (!u) return false;
        var n = 0;
        window.Community.list('qa').forEach(function (p) {
          (p.answers || []).forEach(function (a) {
            if (a.author === u.username && a.adopted) n++;
          });
        });
        return n >= 3;
      } },
    { id: 'level_5', name: '法律达人', icon: '🏅', desc: '累计积分达 200 分', color: '#E3B458',
      test: function () {
        var u = window.Auth.current();
        return u && u.points >= 200;
      } }
  ];

  A.currentLevel = function () {
    var u = window.Auth.current();
    var pts = u ? (u.points || 0) : 0;
    var cur = A.LEVELS[0];
    for (var i = 0; i < A.LEVELS.length; i++) {
      if (pts >= A.LEVELS[i].min) cur = A.LEVELS[i];
    }
    var next = null;
    for (var j = 0; j < A.LEVELS.length; j++) {
      if (pts < A.LEVELS[j].min) { next = A.LEVELS[j]; break; }
    }
    return { cur: cur, next: next, points: pts };
  };

  // 已获徽章列表
  A.getEarned = function () {
    var u = window.Auth.current();
    if (!u) return [];
    return window.Store.getBadges(u.username);
  };

  // 检测全部徽章，新解锁则提示并加分
  A.checkAll = function () {
    var u = window.Auth.current();
    if (!u) return [];
    var earned = window.Store.getBadges(u.username);
    var newly = [];
    A.BADGES.forEach(function (b) {
      if (earned.indexOf(b.id) < 0 && b.test()) {
        earned.push(b.id);
        newly.push(b);
      }
    });
    if (newly.length) {
      window.Store.setBadges(u.username, earned);
      newly.forEach(function (b) {
        window.UI.toast('🏅 解锁徽章：' + b.name + ' +10 积分', 'success', 3000);
        window.Auth.addPoints(10);
      });
    }
    return newly;
  };

  // 等级跃迁检测（用于界面提示）
  A.checkLevelUp = function (prevPts) {
    var u = window.Auth.current();
    if (!u) return false;
    var now = u.points || 0;
    var curLv = A.currentLevel().cur.lv;
    var prevLv = 1;
    for (var i = 0; i < A.LEVELS.length; i++) {
      if ((prevPts || 0) >= A.LEVELS[i].min) prevLv = A.LEVELS[i].lv;
    }
    if (curLv > prevLv) {
      window.UI.toast('🎉 升级！现在等级：' + A.currentLevel().cur.name, 'success', 3000);
      return true;
    }
    return false;
  };

  window.Achievements = A;
})();
