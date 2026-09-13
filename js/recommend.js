// recommend.js — 个性化学习路径推荐（规则驱动）
// 规则优先级（首条命中即返回）：
// 1. 有未完成主题 → 推荐当前模块下一未完成主题
// 2. 当前模块已 100% 完成 → 推荐下一模块"入门测评"
// 3. 三模块均完成 → 推荐课后大案要案"进阶学习"
// 4. 新用户无进度 → 推荐年龄段对应模块第 1 主题
// 5. 默认 → 青年板块第 1 主题
(function () {
  var R = {};

  // 返回 {kind:'topic'|'quiz'|'case'|'module', title, desc, target:{modKey,topicId?|caseId?}, color, icon}
  R.recommend = function () {
    var p = window.Progress.get();
    var modules = window.COURSES.allModules();
    var user = window.Auth.current();
    var ageGroup = user ? user.ageGroup : 'youth';

    // 规则 1：当前年龄段模块有未完成主题 → 推荐第一个未完成
    var curMod = window.COURSES.getModule(ageGroup) || modules[0];
    var nextTopic = curMod.topics.filter(function (t) {
      return p.completedTopics.indexOf(t.id) < 0;
    })[0];
    if (nextTopic) {
      return {
        kind: 'topic',
        modKey: curMod.key,
        topicId: nextTopic.id,
        title: '继续学习：' + nextTopic.title,
        desc: curMod.title + ' · 下一节未完成主题',
        color: curMod.badge,
        icon: nextTopic.icon
      };
    }

    // 规则 2：当前模块已 100% 完成，寻找下一个有未完成主题的模块
    for (var i = 0; i < modules.length; i++) {
      var m = modules[i];
      var firstUndone = m.topics.filter(function (t) { return p.completedTopics.indexOf(t.id) < 0; })[0];
      if (firstUndone) {
        return {
          kind: 'topic',
          modKey: m.key,
          topicId: firstUndone.id,
          title: '继续学习：' + firstUndone.title,
          desc: m.title + ' · 已切换至新板块',
          color: m.badge,
          icon: firstUndone.icon
        };
      }
    }

    // 规则 3：三模块全部主题完成 → 看是否所有大案都已读
    var cases = window.COURSES.CASES;
    var unreadCase = cases.filter(function (c) { return p.caseViews.indexOf(c.id) < 0; })[0];
    if (unreadCase) {
      return {
        kind: 'case',
        caseId: unreadCase.id,
        title: '进阶学习：' + unreadCase.title,
        desc: '课后大案要案 · 交叉法条解读',
        color: unreadCase.banner,
        icon: unreadCase.icon
      };
    }

    // 全部完成
    if (cases.every(function (c) { return p.caseViews.indexOf(c.id) >= 0; }) &&
        window.COURSES.allModules().every(function (m) { return m.topics.every(function (t) { return p.completedTopics.indexOf(t.id) >= 0; }); })) {
      return {
        kind: 'done',
        title: '🎉 你已学完全部课程！',
        desc: '试试在社区分享你的学习心得，或重新挑战闯关赛',
        color: '#2D8659',
        icon: '🏆'
      };
    }

    // 规则 4/5：兜底
    return {
      kind: 'topic',
      modKey: 'youth',
      topicId: modules[0].topics[0].id,
      title: '开始你的第一课',
      desc: '青年板块 · ' + modules[0].topics[0].title,
      color: modules[0].badge,
      icon: modules[0].topics[0].icon
    };
  };

  // 入门测评：从对应模块取 3 题做快速测评
  R.quickAssessment = function () {
    var user = window.Auth.current();
    var modKey = user ? user.ageGroup : 'youth';
    var m = window.COURSES.getModule(modKey);
    var sample = (m.quiz || []).slice(0, 3);
    return { modKey: modKey, modTitle: m.title, questions: sample };
  };

  window.Recommend = R;
})();
