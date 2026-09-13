// courses.js — 将 SZCH_RAW 规范化为应用使用的 MODULES / CASES 结构
// 依赖：courses.raw.js（已抽取自 法治生活手册.html，逐字保留法条/案例/提示）
(function () {
  var R = window.SZCH_RAW || {};
  var raw = R || {};

  // 模块元数据（标题/描述/主色来自原 HTML 各板块的 sec-header 与 sec-desc）
  var META = {
    youth: {
      key: 'youth',
      title: '青年板块',
      subtitle: '职场租房消费避坑指南',
      desc: '求职、租房、兼职、网购、校园贷——青年生活中最容易踩坑的场景，22个法律知识点，用案例说法，让法律成为你的保护伞。',
      badge: '#C8102E',     // red-main
      accent: '#8E1626',    // red-deep
      audience: '青年（18-30岁）',
      icon: '💼'
    },
    mid: {
      key: 'mid',
      title: '中年板块',
      subtitle: '婚姻借贷邻里维权手册',
      desc: '婚姻财产、借钱借条、邻里纠纷、子女抚养——上有老下有小的年纪，22个法律知识点就是家庭护城河。',
      badge: '#B8862D',     // gold
      accent: '#E3B458',    // gold-bright
      audience: '中年（30-55岁）',
      icon: '🏠'
    },
    old: {
      key: 'old',
      title: '老年板块',
      subtitle: '防诈继承安养守护宝典',
      desc: '诈骗防范、遗产继承、子女赡养、意定监护——22个法律知识点，守护银发权益，让法律为晚年生活撑起保护伞。',
      badge: '#1F5FA8',     // blue
      accent: '#0D7377',    // teal
      audience: '老年（55岁以上）',
      icon: '🛡️'
    }
  };

  // 把原 topics 数组（含 t/i/b/tg/s/c）规范化，附加稳定 id
  function normTopics(topics, modKey) {
    if (!topics) return [];
    return topics.map(function (t, idx) {
      return {
        id: modKey + '_t' + (idx + 1),
        mod: modKey,
        idx: idx,
        title: t.t,
        icon: t.i,
        banner: t.b,
        tags: (t.tg || []).map(function (g) { return { text: g.t, color: g.c }; }),
        summary: t.s,
        cases: (t.c || []).map(function (c, ci) {
          return {
            date: c.d,
            location: c.l,
            party: c.p,
            story: c.st,
            law: c.lw,
            tips: c.tp || []
          };
        })
      };
    });
  }

  function normFlips(flips) {
    if (!flips) return [];
    return flips.map(function (f) {
      return { icon: f[0], title: f[1], back: f[2] };
    });
  }

  function normAI(ai) {
    return ai || [];
  }

  function normQuiz(quiz, modKey) {
    if (!quiz) return [];
    return quiz.map(function (q, idx) {
      return {
        id: modKey + '_q' + (idx + 1),
        q: q.q,
        options: q.options,
        answer: q.answer,
        explain: q.explain
      };
    });
  }

  var MODULES = {};
  ['youth', 'mid', 'old'].forEach(function (k) {
    var cap = k.charAt(0).toUpperCase() + k.slice(1);
    MODULES[k] = Object.assign({}, META[k], {
      topics: normTopics(raw[k + 'Topics'], k),
      flips: normFlips(raw[k + 'Flips']),
      ai: normAI(raw[k + 'AI']),
      quiz: normQuiz(raw[k + 'Quiz'], k)
    });
  });

  var CASES = (raw.afterClassCases || []).map(function (c, idx) {
    return {
      id: 'case_' + (idx + 1),
      idx: idx,
      title: c.title,
      icon: c.icon,
      banner: c.banner,
      tag: c.tag,
      date: c.date,
      location: c.location,
      summary: c.summary,
      story: c.story,
      laws: c.laws || [],
      verdict: c.verdict,
      insight: c.insight
    };
  });

  var GUARDIAN_AI = raw.guardianAI || [];

  // 文书模板原数据（借条/遗嘱）——文本生成函数在 ui.js，这里仅暴露元信息
  var TEMPLATES = [
    {
      id: 'iou',
      title: '借条模板生成器',
      icon: '📝',
      desc: '借钱给同学朋友？一张规范的借条能帮你省去无数麻烦。填写信息，自动生成标准借条。',
      accent: '#B8862D'
    },
    {
      id: 'will',
      title: '自书遗嘱模板生成器',
      icon: '📜',
      desc: '自书遗嘱须全文亲笔书写、签名、注明年月日。本工具帮你生成参考文本，打印后请全文手抄一遍并签名。',
      accent: '#8E1626'
    }
  ];

  // 暴露
  window.COURSES = { MODULES: MODULES, CASES: CASES, GUARDIAN_AI: GUARDIAN_AI, TEMPLATES: TEMPLATES };

  // 便捷访问
  window.COURSES.getModule = function (k) { return MODULES[k]; };
  window.COURSES.allModules = function () { return ['youth', 'mid', 'old'].map(function (k) { return MODULES[k]; }); };
  window.COURSES.findTopic = function (id) {
    for (var k in MODULES) {
      var f = MODULES[k].topics.filter(function (t) { return t.id === id; })[0];
      if (f) return f;
    }
    return null;
  };
})();
