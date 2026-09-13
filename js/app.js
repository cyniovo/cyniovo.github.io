// app.js — 主程序：路由、屏幕渲染、初始化
(function () {
  var App = {};
  App.currentTab = 'home';
  App.learnCtx = { modKey: null, sub: 'topics' };  // 当前学习板块与子视图

  // ============ 初始化 ============
  App.init = function () {
    // 关闭弹窗事件
    var ov = document.getElementById('modal-overlay');
    if (ov) ov.addEventListener('click', function (e) { if (e.target === ov) window.UI.closeModal(); });
    var closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', function () { window.UI.closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { window.UI.closeModal(); window.UI.closeSheet(); } });

    // 底部 Tab 绁定
    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        App.switchTab(t.dataset.tab);
      });
    });

    // 顶部返回按钮（动态注入）
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-back]');
      if (b) App.switchTab(b.dataset.back);
    });

    // PWA 安装提示
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      window.__szchInstallPrompt = e;
    });

    // 检查登录状态
    if (window.Auth.isLoggedIn()) {
      App.enterApp();
    } else {
      App.showSplash();
    }
  };

  // ============ 启动/登录 ============
  App.showSplash = function () {
    document.getElementById('splash').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    App.bindSplash('login');
  };

  App.bindSplash = function (mode) {
    var splash = document.getElementById('splash');
    // 切换 tab
    splash.querySelectorAll('.sp-tab').forEach(function (t) {
      t.onclick = function () {
        splash.querySelectorAll('.sp-tab').forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        App.bindSplash(t.dataset.mode);
      };
    });
    var errEl = splash.querySelector('.sp-err');
    errEl.textContent = '';

    var submitBtn = splash.querySelector('.sp-submit');
    submitBtn.onclick = function () {
      var u = splash.querySelector('#sp-username').value;
      var p = splash.querySelector('#sp-password').value;
      var ag = splash.querySelector('#sp-agegroup').value;
      if (mode === 'register') {
        if (!ag) { errEl.textContent = '请选择年龄段'; return; }
        var r = window.Auth.register(u, p, ag);
        if (!r.ok) { errEl.textContent = r.msg; return; }
        window.UI.toast('注册成功，已自动登录', 'success');
        App.enterApp();
      } else {
        var l = window.Auth.login(u, p);
        if (!l.ok) { errEl.textContent = l.msg; return; }
        window.UI.toast('欢迎回来，' + l.user.username, 'success');
        App.enterApp();
      }
    };

    var guestBtn = splash.querySelector('.sp-guest');
    guestBtn.onclick = function () {
      App.enterApp();
      window.UI.toast('游客模式：浏览无障碍，记录进度需登录', 'info', 3000);
    };

    // 根据模式显隐年龄字段
    var agField = splash.querySelector('#sp-agegroup-field');
    agField.classList.toggle('hidden', mode !== 'register');
    submitBtn.textContent = mode === 'register' ? '注 册 并 登 录' : '登 录';
  };

  App.enterApp = function () {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    App.learnCtx.modKey = window.Auth.current() ? window.Auth.current().ageGroup : 'youth';
    App.switchTab('home');
  };

  // ============ 路由 ============
  App.switchTab = function (tab) {
    App.currentTab = tab;
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === tab); });
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById('screen-' + tab).classList.add('active');
    // 顶部栏
    App.renderAppBar(tab);
    // 渲染对应内容
    if (tab === 'home') App.renderHome();
    else if (tab === 'courses') App.renderCourses();
    else if (tab === 'learn') App.renderLearn();
    else if (tab === 'community') App.renderCommunity();
    else if (tab === 'profile') App.renderProfile();
    window.scrollTo(0, 0);
  };

  App.renderAppBar = function (tab) {
    var titles = {
      home: '数智传红<span class="gold">，</span>AI润法',
      courses: '课程中心',
      learn: '沉浸学习',
      community: '普法社区',
      profile: '我的'
    };
    var subs = {
      home: '法治生活 · 贴身懂你',
      courses: '三大模块 · 分众普法',
      learn: '当前板块：' + (App.learnCtx.modKey ? window.COURSES.getModule(App.learnCtx.modKey).title : '—'),
      community: '笔记 · 问答 · 评论',
      profile: '进度 · 徽章 · 等级'
    };
    var bar = document.getElementById('appbar-title');
    bar.innerHTML = titles[tab] || '';
    var sub = document.getElementById('appbar-sub');
    sub.textContent = subs[tab] || '';
    // 右侧
    var right = document.getElementById('appbar-right');
    var u = window.Auth.current();
    if (u) {
      right.innerHTML = '<div class="ab-avatar">' + u.username.charAt(0).toUpperCase() + '</div>';
    } else {
      right.innerHTML = '<button class="ab-action" data-action="login">🔒</button>';
      right.querySelector('[data-action="login"]').onclick = function () { App.showSplash(); };
    }
  };

  // 重新渲染当前屏（用于数据变化后）
  App.refreshCurrent = function () { App.switchTab(App.currentTab); };

  // ============ 首页 ============
  App.renderHome = function () {
    var el = document.getElementById('home-content');
    var u = window.Auth.current();
    var p = window.Progress.get();
    var overall = window.Progress.overallPct();
    var totalDone = p.completedTopics.length;
    var totalTopics = window.COURSES.allModules().reduce(function (s, m) { return s + m.topics.length; }, 0);
    var casesViewed = p.caseViews.length;
    var totalCases = window.COURSES.CASES.length;

    var html = '';
    // Hero
    html += '<div class="home-hero"><h2>你好，' + (u ? u.username : '朋友') + (u ? ' · ' + window.Auth.ageGroupLabel(u.ageGroup) : '') + '</h2>' +
      '<p>法治生活手册 · 分众普法，贴身懂你</p></div>';

    // 推荐卡
    var rec = window.Recommend.recommend();
    html += '<div class="recommend-card" id="rec-card"><div class="rc-label">★ 为你推荐</div>' +
      '<div class="rc-title">' + rec.icon + ' ' + rec.title + '</div>' +
      '<div class="rc-desc">' + rec.desc + '</div></div>';

    // 统计三宫格
    html += '<div class="home-stat-row">' +
      '<div class="home-stat"><div class="hs-num">' + totalDone + '/' + totalTopics + '</div><div class="hs-label">完成主题</div></div>' +
      '<div class="home-stat"><div class="hs-num">' + overall + '%</div><div class="hs-label">总进度</div></div>' +
      '<div class="home-stat"><div class="hs-num">' + (p.streak || 0) + '</div><div class="hs-label">连续天数</div></div>' +
      '</div>';

    // 继续学习：最近浏览
    var recent = (p.topicViews || []).slice(-3).reverse();
    if (recent.length) {
      html += '<div class="section-title"><span class="st-bar"></span>继续学习</div>';
      recent.forEach(function (v) {
        var t = window.COURSES.findTopic(v.id);
        if (!t) return;
        html += '<div class="card tappable card-body" data-open-topic="' + t.id + '" style="display:flex;align-items:center;gap:10px">' +
          '<div style="font-size:22px">' + t.icon + '</div><div style="flex:1"><div style="font-weight:700;font-size:14px">' + t.title + '</div>' +
          '<div class="small muted">' + window.COURSES.getModule(t.mod).title + '</div></div>' +
          '<div style="color:var(--gold)">→</div></div>';
      });
    }

    // 三大模块入口
    html += '<div class="section-title"><span class="st-bar"></span>三大模块</div>';
    html += '<div class="grid cols-2">';
    window.COURSES.allModules().forEach(function (m) {
      var done = window.Progress.moduleDoneCount(m.key);
      var pct = window.Progress.modulePct(m.key);
      html += '<div class="card tappable card-body" data-open-module="' + m.key + '">' +
        '<div class="me-icon">' + m.icon + '</div>' +
        '<div class="me-title" style="color:' + m.badge + '">' + m.title + '</div>' +
        '<div class="small muted">' + done + '/' + m.topics.length + ' · ' + m.topics.length + ' 主题</div>' +
        '<div class="me-bar"><div class="me-bar-fill" style="width:' + pct + '%;background:' + m.badge + '"></div></div>' +
        '</div>';
    });
    html += '</div>';

    // 课后大案入口
    html += '<div class="section-title"><span class="st-bar"></span>课后大案要案</div>';
    html += '<div class="card tappable card-body" data-open-cases style="display:flex;align-items:center;gap:10px">' +
      '<div style="font-size:22px">⚔️</div><div style="flex:1"><div style="font-weight:700;font-size:14px">大案要案交叉普法</div>' +
      '<div class="small muted">' + casesViewed + '/' + totalCases + ' 已读 · 真实案件学法</div></div>' +
      '<div style="color:var(--purple)">→</div></div>';

    // 文书模板入口
    html += '<div class="section-title"><span class="st-bar"></span>实用工具</div>';
    html += '<div class="grid cols-2">';
    window.COURSES.TEMPLATES.forEach(function (t) {
      html += '<div class="card tappable card-body" data-open-template="' + t.id + '" style="text-align:center">' +
        '<div style="font-size:22px">' + t.icon + '</div>' +
        '<div class="me-title" style="color:' + t.accent + ';font-size:14px">' + t.title + '</div>' +
        '</div>';
    });
    html += '</div>';

    el.innerHTML = html;

    // 绑定
    el.querySelector('#rec-card').onclick = function () { App.handleRecommend(rec); };
    el.querySelectorAll('[data-open-topic]').forEach(function (c) {
      c.onclick = function () { App.openTopic(c.getAttribute('data-open-topic')); };
    });
    el.querySelectorAll('[data-open-module]').forEach(function (c) {
      c.onclick = function () { App.openModule(c.getAttribute('data-open-module')); };
    });
    el.querySelector('[data-open-cases]').onclick = function () { App.openCases(); };
    el.querySelectorAll('[data-open-template]').forEach(function (c) {
      c.onclick = function () { App.openTemplate(c.getAttribute('data-open-template')); };
    });
  };

  App.handleRecommend = function (rec) {
    if (rec.kind === 'topic') {
      App.openTopic(rec.topicId);
    } else if (rec.kind === 'case') {
      App.openCase(rec.caseId);
    } else if (rec.kind === 'done') {
      App.switchTab('community');
    }
  };

  // ============ 课程 Tab ============
  App.renderCourses = function () {
    var el = document.getElementById('courses-content');
    var p = window.Progress.get();
    var html = '<div class="sec-header"><div class="sec-badge" style="background:var(--red-main)"></div><div class="sec-title">分众普法课程</div></div>' +
      '<div class="sec-desc">三大年龄段 · 一一对应你的生活场景。每个板块含主题卡、速查翻卡、AI 问答、闯关赛与文书模板。</div>';

    window.COURSES.allModules().forEach(function (m) {
      var done = window.Progress.moduleDoneCount(m.key);
      var pct = window.Progress.modulePct(m.key);
      var qScore = p.quizScores[m.key];
      var qInfo = qScore ? '闯关最高 ' + qScore.pct + '%' : '未闯关';
      html += '<div class="module-entry" data-open-module="' + m.key + '">' +
        '<div class="me-go">›</div>' +
        '<div class="me-icon">' + m.icon + '</div>' +
        '<div class="me-title" style="color:' + m.badge + '">' + m.title + ' · ' + m.subtitle + '</div>' +
        '<div class="me-desc">' + m.desc + '</div>' +
        '<div class="me-bar"><div class="me-bar-fill" style="width:' + pct + '%;background:' + m.badge + '"></div></div>' +
        '<div class="me-meta"><span>' + done + '/' + m.topics.length + ' 主题完成</span><span>' + qInfo + '</span></div>' +
        '</div>';
    });

    // 课后大案
    var casesViewed = p.caseViews.length;
    html += '<div class="module-entry" data-open-cases>' +
      '<div class="me-go">›</div>' +
      '<div class="me-icon">⚔️</div>' +
      '<div class="me-title" style="color:var(--purple)">课后板块 · 大案要案</div>' +
      '<div class="me-desc">六个社会知名度高、案情复杂的真实大案，每个案件附多条交叉法条解读。学法不只是背条文，更要看法律如何在真实案件中"活起来"。</div>' +
      '<div class="me-bar"><div class="me-bar-fill" style="width:' + (casesViewed / window.COURSES.CASES.length * 100) + '%;background:var(--purple)"></div></div>' +
      '<div class="me-meta"><span>' + casesViewed + '/' + window.COURSES.CASES.length + ' 已读</span><span>含交叉法条</span></div>' +
      '</div>';

    el.innerHTML = html;
    el.querySelectorAll('[data-open-module]').forEach(function (c) {
      c.onclick = function () { App.openModule(c.getAttribute('data-open-module')); };
    });
    el.querySelector('[data-open-cases]').onclick = function () { App.openCases(); };
  };

  // ============ 学习 Tab（当前模块详情） ============
  App.renderLearn = function () {
    var el = document.getElementById('learn-content');
    var m = window.COURSES.getModule(App.learnCtx.modKey);
    if (!m) { el.innerHTML = '<div class="empty">请先选择一个板块</div>'; return; }

    var sub = App.learnCtx.sub || 'topics';
    var p = window.Progress.get();
    var done = window.Progress.moduleDoneCount(m.key);

    var html = '<div class="sec-header"><div class="sec-badge" style="background:' + m.badge + '"></div><div class="sec-title">' + m.title + '</div></div>' +
      '<div class="sec-desc">' + m.desc + '</div>';

    // 子 Tab
    html += '<div class="sub-tabs">' +
      '<div class="sub-tab ' + (sub === 'topics' ? 'active' : '') + '" data-sub="topics">主题卡 (' + done + '/' + m.topics.length + ')</div>' +
      '<div class="sub-tab ' + (sub === 'flips' ? 'active' : '') + '" data-sub="flips">速查卡</div>' +
      '<div class="sub-tab ' + (sub === 'ai' ? 'active' : '') + '" data-sub="ai">AI 问答</div>' +
      '<div class="sub-tab ' + (sub === 'quiz' ? 'active' : '') + '" data-sub="quiz">闯关赛</div>' +
      '</div>';

    if (sub === 'topics') {
      html += '<div id="learn-topics"></div>';
    } else if (sub === 'flips') {
      html += '<h3 class="mb8" style="font-size:14px">💡 速查卡（点击翻面看详解）</h3><div class="flip-grid" id="learn-flips"></div>';
    } else if (sub === 'ai') {
      html += '<div class="panel"><div class="panel-head" style="background:' + m.accent + '"><div class="ph-icon">🤖</div><div><h3>AI法治问答</h3><div class="ph-sub">' + m.title + ' · 点击问题获取通俗解答</div></div></div>' +
        '<div class="panel-body"><div class="ai-welcome">你好！我是"润法小助手"。点击下方问题即可获得答案。</div><div id="learn-ai"></div></div></div>';
      // 老年板块附加意定监护
      if (m.key === 'old') {
        html += '<div class="panel"><div class="panel-head" style="background:var(--teal)"><div class="ph-icon">📋</div><div><h3>意定监护知多少</h3><div class="ph-sub">点击问题了解这项重要制度</div></div></div>' +
          '<div class="panel-body"><div id="learn-guardian"></div></div></div>';
      }
    } else if (sub === 'quiz') {
      html += '<div class="panel"><div class="panel-head" style="background:' + m.badge + '"><div class="ph-icon">🎮</div><div><h3>' + m.title.replace('板块', '') + '普法闯关赛</h3><div class="ph-sub">10 道题，测测你的法律段位</div></div></div>' +
        '<div class="panel-body" id="learn-quiz"></div></div>';
      var prev = p.quizScores[m.key];
      if (prev) {
        html += '<div class="center muted small mb16">历史最高：' + prev.score + '/' + prev.total + ' (' + prev.pct + '%)</div>';
      }
    }

    el.innerHTML = html;

    // 渲染对应内容
    if (sub === 'topics') {
      window.UI.renderTopicCards(document.getElementById('learn-topics'), m.topics, m.badge);
    } else if (sub === 'flips') {
      window.UI.renderFlips(document.getElementById('learn-flips'), m.flips);
    } else if (sub === 'ai') {
      window.UI.renderAI(document.getElementById('learn-ai'), m.ai);
      if (m.key === 'old') window.UI.renderAI(document.getElementById('learn-guardian'), window.COURSES.GUARDIAN_AI);
    } else if (sub === 'quiz') {
      window.UI.initQuiz(document.getElementById('learn-quiz'), m.quiz, {
        onComplete: function (score, total, pct) {
          window.Progress.recordQuizScore(m.key, score, total);
          if (window.Achievements) window.Achievements.checkAll();
        }
      });
    }

    // 子 Tab 绑定
    el.querySelectorAll('.sub-tab').forEach(function (t) {
      t.onclick = function () {
        App.learnCtx.sub = t.dataset.sub;
        App.renderLearn();
      };
    });
  };

  // ============ 社区 Tab ============
  App.renderCommunity = function () {
    var el = document.getElementById('community-content');
    var sub = App._cmSub || 'note';
    var html = '<div class="sec-header"><div class="sec-badge" style="background:var(--purple)"></div><div class="sec-title">普法社区</div></div>' +
      '<div class="sec-desc">分享学习心得 · 提问互助 · 评论大案。共建法治学习共同体。</div>';

    html += '<div class="sub-tabs">' +
      '<div class="sub-tab ' + (sub === 'note' ? 'active' : '') + '" data-cmsub="note">学习笔记</div>' +
      '<div class="sub-tab ' + (sub === 'qa' ? 'active' : '') + '" data-cmsub="qa">问答区</div>' +
      '<div class="sub-tab ' + (sub === 'case' ? 'active' : '') + '" data-cmsub="case">案例评论</div>' +
      '</div>';

    // 发帖按钮（笔记/问答）
    if (sub !== 'case') {
      html += '<button class="btn btn-primary btn-block mb16" id="cm-new">' + (sub === 'qa' ? '❓ 我要提问' : '📝 发表学习笔记') + '</button>';
    }

    var list = window.Community.list(sub);
    if (list.length === 0) {
      html += '<div class="empty"><div class="em-icon">' + (sub === 'qa' ? '❓' : '📝') + '</div>' +
        (sub === 'qa' ? '还没有人提问，来抛出第一个问题吧' : '还没有笔记，分享你的第一条学习心得吧') + '</div>';
    } else {
      list.forEach(function (p) {
        html += App.renderPostCard(p);
      });
    }

    // 案例评论：列出可评论的案例
    if (sub === 'case') {
      html += '<div class="small muted mb16">点击案例进入评论区，可发表评论并点赞。</div>';
      window.COURSES.CASES.forEach(function (c) {
        var cnt = window.Community.countCaseComments(c.id);
        var lk = window.Community.countCaseLikes(c.id);
        html += '<div class="card tappable card-body" data-case-comment="' + c.id + '" style="display:flex;align-items:center;gap:10px">' +
          '<div style="font-size:22px">' + c.icon + '</div>' +
          '<div style="flex:1"><div style="font-weight:700;font-size:14px">' + c.title + '</div>' +
          '<div class="small muted">' + c.tag + ' · ' + c.date + '</div></div>' +
          '<div style="text-align:right;font-size:12px;color:var(--muted)">💬 ' + cnt + '<br>👍 ' + lk + '</div></div>';
      });
    }

    el.innerHTML = html;

    el.querySelectorAll('.sub-tab').forEach(function (t) {
      t.onclick = function () { App._cmSub = t.dataset.cmsub; App.renderCommunity(); };
    });
    var newBtn = el.querySelector('#cm-new');
    if (newBtn) newBtn.onclick = function () { App.openComposer(sub); };
    el.querySelectorAll('[data-case-comment]').forEach(function (c) {
      c.onclick = function () { window.Community.openCaseComment(c.getAttribute('data-case-comment')); };
    });

    // 帖子交互绑定
    el.querySelectorAll('[data-like-post]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-like-post');
        var r = window.Community.toggleLike(id);
        if (r) { App.renderCommunity(); }
      };
    });
    el.querySelectorAll('[data-open-post]').forEach(function (c) {
      c.onclick = function () { App.openPostDetail(c.getAttribute('data-open-post')); };
    });
  };

  App.renderPostCard = function (p) {
    var typeColor = window.Community.TYPE_COLOR[p.type] || '#888';
    var refHTML = '';
    if (p.refTopicId) {
      var t = window.COURSES.findTopic(p.refTopicId);
      if (t) refHTML = '<div class="pc-ref">📎 关联主题：' + t.title + '</div>';
    } else if (p.refCaseId) {
      var c = window.COURSES.CASES.filter(function (x) { return x.id === p.refCaseId; })[0];
      if (c) refHTML = '<div class="pc-ref">⚖ 关联案例：' + c.title + '</div>';
    }
    var body = p.body || '';
    if (body.length > 120) body = body.slice(0, 120) + '…';
    var ansCount = p.answers ? p.answers.length : 0;
    return '<div class="post-card">' +
      '<div class="pc-head">' +
      '<div class="pc-avatar">' + p.author.charAt(0).toUpperCase() + '</div>' +
      '<div><div class="pc-author">' + p.author + '</div>' +
      '<span class="pc-type" style="background:' + typeColor + '">' + window.Community.TYPE_LABEL[p.type] + '</span></div>' +
      '<div class="pc-time">' + window.Community.fmtTime(p.createdAt) + '</div>' +
      '</div>' +
      '<div class="pc-title" data-open-post="' + p.id + '">' + window.Community.escapeHTML(p.title) + '</div>' +
      '<div class="pc-body" data-open-post="' + p.id + '">' + window.Community.escapeHTML(body) + '</div>' +
      refHTML +
      '<div class="pc-foot">' +
      '<div class="pf-item ' + (p.likes.length ? 'liked' : '') + '" data-like-post="' + p.id + '">👍 ' + p.likes.length + '</div>' +
      (p.type === 'qa' ? '<div class="pf-item">💬 ' + ansCount + ' 回答</div>' : '') +
      '</div>' +
      '</div>';
  };

  App.openComposer = function (type) {
    if (!window.Auth.requireLogin('发帖')) return;
    var title = type === 'qa' ? '❓ 提一个法律问题' : '📝 发表学习笔记';
    window.UI.openSheet(
      '<h3>' + title + '</h3>' +
      '<div class="form-group"><label>标题</label><input id="cm-title" placeholder="' + (type === 'qa' ? '一句话描述你的问题' : '给笔记起个标题') + '"></div>' +
      '<div class="form-group"><label>' + (type === 'qa' ? '问题详情' : '正文内容') + '</label><textarea id="cm-body" rows="5" placeholder="' + (type === 'qa' ? '尽量说清背景和你已了解的法律点' : '分享你的学习心得、案例联想、生活法律点…') + '"></textarea></div>' +
      '<button class="btn btn-primary btn-block" id="cm-submit">发布</button>'
    );
    document.getElementById('cm-submit').onclick = function () {
      var t = document.getElementById('cm-title').value.trim();
      var b = document.getElementById('cm-body').value.trim();
      if (!t || !b) { window.UI.toast('标题和正文不能为空', 'warn'); return; }
      window.Community.create({ type: type, title: t, body: b });
      window.UI.closeSheet();
      window.UI.toast('发布成功，+3 积分', 'success');
      App.renderCommunity();
    };
  };

  App.openPostDetail = function (postId) {
    var posts = window.Community.list();
    var p = posts.filter(function (x) { return x.id === postId; })[0];
    if (!p) return;
    var typeColor = window.Community.TYPE_COLOR[p.type] || '#888';
    var answersHTML = '';
    if (p.answers && p.answers.length) {
      p.answers.forEach(function (a) {
        answersHTML += '<div class="answer-block ' + (a.adopted ? 'adopted' : '') + '">' +
          '<div class="ab-head"><div style="display:flex;gap:4px;align-items:center"><span style="font-weight:700">' + a.author + '</span><span class="muted small"> · ' + window.Community.fmtTime(a.createdAt) + '</span></div>' +
          (a.adopted ? '<span class="ab-adopted">已采纳</span>' : (p.author === (window.Auth.current() || {}).username ? '<button class="btn btn-outline btn-sm" data-adopt="' + a.id + '" data-post="' + p.id + '">采纳</button>' : '')) +
          '</div><div class="ab-body">' + window.Community.escapeHTML(a.body) + '</div></div>';
      });
    }
    var ansForm = p.type === 'qa' ?
      '<div class="form-group mt16"><label>你的回答</label><textarea id="ans-body" rows="3" placeholder="耐心、专业地回答这个问题…"></textarea></div>' +
      '<button class="btn btn-primary btn-block" id="ans-submit">提交回答</button>' : '';
    window.UI.openModal(
      (p.type === 'qa' ? '❓ ' : '📝 ') + p.title,
      '<div class="post-card" style="box-shadow:none;border:none;margin-bottom:12px">' +
      '<div class="pc-head"><div class="pc-avatar">' + p.author.charAt(0).toUpperCase() + '</div><div><div class="pc-author">' + p.author + '</div>' +
      '<span class="pc-type" style="background:' + typeColor + '">' + window.Community.TYPE_LABEL[p.type] + '</span></div>' +
      '<div class="pc-time">' + window.Community.fmtTime(p.createdAt) + '</div></div>' +
      '<div class="pc-body" style="margin-bottom:8px">' + window.Community.escapeHTML(p.body) + '</div>' +
      '<div class="pc-foot"><div class="pf-item ' + (p.likes.length ? 'liked' : '') + '" data-modal-like="' + p.id + '">👍 ' + p.likes.length + '</div></div>' +
      '</div>' +
      (p.type === 'qa' ? '<h3 class="ac-laws-label">💬 ' + p.answers.length + ' 个回答</h3>' : '') +
      answersHTML + ansForm
    );
    var ansBtn = document.getElementById('ans-submit');
    if (ansBtn) {
      ansBtn.onclick = function () {
        var b = document.getElementById('ans-body').value.trim();
        if (!b) { window.UI.toast('回答不能为空', 'warn'); return; }
        window.Community.addAnswer(p.id, b);
        window.UI.toast('回答已提交', 'success');
        App.openPostDetail(p.id);
      };
    }
    document.querySelectorAll('[data-adopt]').forEach(function (b) {
      b.onclick = function () {
        window.Community.adoptAnswer(b.dataset.post, b.dataset.adopt);
        App.openPostDetail(p.id);
      };
    });
    var likeBtn = document.querySelector('[data-modal-like]');
    if (likeBtn) {
      likeBtn.onclick = function () {
        window.Community.toggleLike(p.id);
        App.openPostDetail(p.id);
      };
    }
  };

  // ============ 我的 Tab ============
  App.renderProfile = function () {
    var el = document.getElementById('profile-content');
    var u = window.Auth.current();
    if (!u) {
      el.innerHTML = '<div class="empty"><div class="em-icon">🔒</div>登录后查看个人进度、徽章与等级</div>' +
        '<button class="btn btn-primary btn-block mt16" id="to-login">立即登录</button>';
      el.querySelector('#to-login').onclick = function () { App.showSplash(); };
      return;
    }

    var p = window.Progress.get();
    var lvl = window.Achievements.currentLevel();
    var overall = window.Progress.overallPct();
    var earned = window.Achievements.getEarned();
    var cal = window.Progress.calendar();

    var html = '';
    // 头部
    html += '<div class="profile-header"><div class="ph-avatar">' + u.username.charAt(0).toUpperCase() + '</div>' +
      '<div class="ph-name">' + u.username + '</div>' +
      '<div class="ph-level">' + lvl.cur.icon + ' Lv.' + lvl.cur.lv + ' ' + lvl.cur.name + '</div>' +
      '<div class="ph-points">累计积分 ' + (u.points || 0) + (lvl.next ? ' · 距 ' + lvl.next.name + ' 还差 ' + (lvl.next.min - u.points) : ' · 满级') + '</div></div>';

    // 进度环 + 三模块
    html += '<div class="card card-body" style="display:flex;align-items:center;gap:16px">' +
      '<div class="progress-ring" style="--p:' + overall + '"><div style="text-align:center"><div class="pr-num">' + overall + '%</div><div class="pr-label">总进度</div></div></div>' +
      '<div style="flex:1">';
    window.COURSES.allModules().forEach(function (m) {
      html += '<div style="margin-bottom:6px"><div class="small" style="font-weight:700;color:' + m.badge + '">' + m.title + '</div>' +
        '<div class="me-bar"><div class="me-bar-fill" style="width:' + window.Progress.modulePct(m.key) + '%;background:' + m.badge + '"></div></div></div>';
    });
    html += '</div></div>';

    // 统计四宫格
    var totalCases = window.COURSES.CASES.length;
    var totalTopics = window.COURSES.allModules().reduce(function (s, m) { return s + m.topics.length; }, 0);
    html += '<div class="stat-grid mt16">' +
      '<div class="stat-box"><div class="sb-num">' + p.completedTopics.length + '/' + totalTopics + '</div><div class="sb-label">完成主题</div></div>' +
      '<div class="stat-box"><div class="sb-num">' + p.caseViews.length + '/' + totalCases + '</div><div class="sb-label">阅读大案</div></div>' +
      '<div class="stat-box"><div class="sb-num">' + (p.streak || 0) + '</div><div class="sb-label">连续天数</div></div>' +
      '<div class="stat-box"><div class="sb-num">' + (p.studyMinutes || 0) + '</div><div class="sb-label">累计学习分钟</div></div>' +
      '</div>';

    // 学习日历
    html += '<div class="card card-body mt16"><div class="row between"><div style="font-weight:700">📅 近 35 天学习</div><div class="small muted">' + (p.streak || 0) + ' 天连续</div></div>' +
      '<div class="cal-grid">';
    cal.forEach(function (d) {
      html += '<div class="cal-cell ' + (d.level ? 'l' + d.level : '') + '" title="' + d.date + '"></div>';
    });
    html += '</div><div class="cal-legend"><span>少</span>' +
      '<div class="lg-cell" style="background:var(--hairline)"></div>' +
      '<div class="lg-cell" style="background:var(--green-soft)"></div>' +
      '<div class="lg-cell" style="background:rgba(45,134,89,.5)"></div>' +
      '<div class="lg-cell" style="background:var(--green)"></div><span>多</span></div></div>';

    // 徽章墙
    html += '<div class="section-title"><span class="st-bar"></span>徽章墙（' + earned.length + '/' + window.Achievements.BADGES.length + '）</div>';
    html += '<div class="badge-grid">';
    window.Achievements.BADGES.forEach(function (b) {
      var got = earned.indexOf(b.id) >= 0;
      html += '<div class="badge ' + (got ? '' : 'locked') + '">' +
        '<div class="bd-icon" style="' + (got ? 'background:linear-gradient(135deg,' + b.color + ',' + b.color + 'CC)' : '') + '">' + b.icon + '</div>' +
        '<div class="bd-name">' + b.name + '</div>' +
        '<div class="bd-desc">' + b.desc + '</div>' +
        '</div>';
    });
    html += '</div>';

    // 我的文书
    var docs = window.Store.getDocs(u.username);
    html += '<div class="section-title"><span class="st-bar"></span>我的文书（' + docs.length + '）</div>';
    if (docs.length === 0) {
      html += '<div class="empty"><div class="em-icon">📄</div>暂无保存的文书，可在文书模板中生成并保存</div>';
    } else {
      docs.forEach(function (d) {
        html += '<div class="card card-body" style="display:flex;align-items:center;gap:10px">' +
          '<div style="font-size:22px">' + d.icon + '</div><div style="flex:1"><div style="font-weight:700;font-size:14px">' + d.title + '</div>' +
          '<div class="small muted">' + window.Community.fmtTime(d.at) + '</div></div>' +
          '<button class="btn btn-outline btn-sm" data-doc-view="' + d.id + '">查看</button>' +
          '<button class="btn btn-ghost btn-sm" data-doc-del="' + d.id + '">删除</button></div>';
      });
    }

    // PWA 安装 + 账号操作
    var promptEvt = window.Store.getPromptEvent();
    html += '<div class="section-title"><span class="st-bar"></span>应用</div>';
    html += '<div class="card card-body">';
    if (promptEvt) {
      html += '<button class="btn btn-gold btn-block mb8" id="install-btn">📲 安装到桌面 / 离线使用</button>';
    }
    html += '<button class="btn btn-outline btn-block mb8" id="refresh-badge">🔄 重新检测徽章</button>' +
      '<button class="btn btn-outline btn-block" id="logout-btn">退出登录</button>';
    html += '<div class="small muted center mt8">演示用账号体系（localStorage）· 多端数据不互通</div></div>';

    el.innerHTML = html;

    // 绑定
    var instBtn = el.querySelector('#install-btn');
    if (instBtn) {
      instBtn.onclick = function () {
        var e = window.Store.getPromptEvent();
        if (e) {
          e.prompt();
          e.userChoice.then(function () { window.Store.setPromptEvent(null); App.renderProfile(); });
        }
      };
    }
    el.querySelector('#refresh-badge').onclick = function () {
      window.Achievements.checkAll();
      App.renderProfile();
    };
    el.querySelector('#logout-btn').onclick = function () {
      if (!confirm('确定退出登录？')) return;
      window.Auth.logout();
      App.showSplash();
    };
    el.querySelectorAll('[data-doc-view]').forEach(function (b) {
      b.onclick = function () {
        var d = docs.filter(function (x) { return x.id === b.getAttribute('data-doc-view'); })[0];
        if (d) window.UI.openModal(d.title, '<pre style="white-space:pre-wrap;font-size:12px;line-height:1.8">' + window.Community.escapeHTML(d.text) + '</pre>');
      };
    });
    el.querySelectorAll('[data-doc-del]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('删除这份文书？')) return;
        var docs2 = window.Store.getDocs(u.username).filter(function (x) { return x.id !== b.getAttribute('data-doc-del'); });
        window.Store.setDocs(u.username, docs2);
        App.renderProfile();
      }
    });
  };

  // ============ 跳转入口 ============
  App.openModule = function (modKey) {
    App.learnCtx.modKey = modKey;
    App.learnCtx.sub = 'topics';
    App.switchTab('learn');
  };

  App.openTopic = function (topicId) {
    var t = window.COURSES.findTopic(topicId);
    if (!t) return;
    // 跳转到对应模块学习页，再打开弹窗
    App.learnCtx.modKey = t.mod;
    App.learnCtx.sub = 'topics';
    App.switchTab('learn');
    setTimeout(function () { window.UI.openTopicDetail(t, window.COURSES.getModule(t.mod).badge); }, 50);
  };

  App.openCase = function (caseId) {
    // 在社区/课后板块打开；这里通过模态层打开
    var c = window.COURSES.CASES.filter(function (x) { return x.id === caseId; })[0];
    if (!c) return;
    // 用临时容器渲染（仅取 HTML，事件在下方重新绑定，避免 innerHTML 序列化丢失监听）
    var container = document.createElement('div');
    window.UI.renderCases(container, [c]);
    window.UI.openModal(c.icon + ' ' + c.title, container.innerHTML);
    // 重新绑定案例评论与点赞按钮（在 modal-body 内）
    var mb = document.getElementById('modal-body');
    if (mb) {
      mb.querySelectorAll('[data-case]').forEach(function (b) {
        b.addEventListener('click', function () {
          window.Community.openCaseComment(b.getAttribute('data-case'));
        });
      });
      mb.querySelectorAll('[data-like-case]').forEach(function (b) {
        b.addEventListener('click', function () {
          window.Community.toggleCaseLike(b.getAttribute('data-like-case'), b);
        });
      });
    }
    window.Progress.recordCaseViews([c.id]);
    if (window.Achievements) window.Achievements.checkAll();
  };

  App.openCases = function () {
    // 进入课后大案：切到 courses tab？不，我们用专门的 modal 列出所有案例
    var html = '';
    window.COURSES.CASES.forEach(function (c) {
      var viewed = window.Progress.isCaseViewed(c.id);
      html += '<div class="card tappable card-body" data-case-open="' + c.id + '" style="display:flex;align-items:center;gap:10px">' +
        '<div style="font-size:22px">' + c.icon + '</div>' +
        '<div style="flex:1"><div style="font-weight:700;font-size:14px">' + c.title + '</div>' +
        '<div class="small muted">' + c.tag + ' · ' + c.date + ' · ' + c.location + (viewed ? ' · 已读' : '') + '</div></div>' +
        '<div style="color:var(--purple)">›</div></div>';
    });
    window.UI.openModal('⚔️ 大案要案 · 交叉普法', html);
    document.querySelectorAll('[data-case-open]').forEach(function (c) {
      c.onclick = function () {
        window.UI.closeModal();
        App.openCase(c.getAttribute('data-case-open'));
      };
    });
  };

  App.openTemplate = function (tplId) {
    var tpl = window.COURSES.TEMPLATES.filter(function (x) { return x.id === tplId; })[0];
    if (!tpl) return;
    var container = document.createElement('div');
    window.UI.renderTemplate(container, tplId);
    // 增加"保存到我的文书"按钮
    var saveBtn = document.createElement('div');
    saveBtn.className = 'tpl-actions';
    saveBtn.innerHTML = '<button class="btn btn-gold btn-block" id="tpl-save">💾 保存到我的文书</button>';
    window.UI.openModal(tpl.icon + ' ' + tpl.title, container.innerHTML + saveBtn.outerHTML);
    // 重新绑定生成按钮（因为 innerHTML 替换）
    var out = document.getElementById(tplId + '-output');
    var genBtn = document.getElementById(tplId + '-gen');
    var copyBtn = document.getElementById(tplId + '-copy');
    var svBtn = document.getElementById('tpl-save');
    if (genBtn) genBtn.onclick = function () { tplId === 'iou' ? window.UI.genIOU() : window.UI.genWill(); };
    if (copyBtn) copyBtn.onclick = function () { window.UI.copyText(tplId + '-output'); };
    if (svBtn) {
      svBtn.onclick = function () {
        if (!window.Auth.requireLogin('保存文书')) return;
        var text = out ? out.innerText : '';
        if (!text || text.indexOf('填写上方信息') >= 0) { window.UI.toast('请先生成文书后再保存', 'warn'); return; }
        var u = window.Auth.current();
        var docs = window.Store.getDocs(u.username);
        docs.push({
          id: window.Store.uid(),
          title: tpl.title + ' · ' + new Date().toLocaleDateString('zh-CN'),
          icon: tpl.icon,
          text: text,
          at: new Date().toISOString()
        });
        window.Store.setDocs(u.username, docs);
        window.UI.toast('已保存到我的文书', 'success');
      };
    }
  };

  window.App = App;
  document.addEventListener('DOMContentLoaded', App.init);
})();
