// ui.js — 复用 UI 组件：翻卡、AI 问答、闯关、文书模板、卡片、弹窗、Toast
(function () {
  var UI = {};

  /* ====== Toast ====== */
  UI.toast = function (msg, type, ms) {
    type = type || 'info';
    ms = ms || 2000;
    var wrap = document.getElementById('toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toast-wrap';
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var icon = { success: '✓', error: '✕', warn: '!', info: 'i' }[type] || 'i';
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<span>' + icon + '</span><span>' + msg + '</span>';
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
    }, ms);
  };

  /* ====== Modal ====== */
  UI.openModal = function (title, html) {
    var ov = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    ov.classList.add('show');
  };
  UI.closeModal = function () {
    document.getElementById('modal-overlay').classList.remove('show');
  };
  UI.openSheet = function (html) {
    var ov = document.getElementById('sheet-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'sheet-overlay';
      ov.className = 'modal-overlay';
      ov.innerHTML = '<div class="sheet" id="sheet"></div>';
      ov.addEventListener('click', function (e) { if (e.target === ov) UI.closeSheet(); });
      document.body.appendChild(ov);
    }
    document.getElementById('sheet').innerHTML = html;
    ov.classList.add('show');
  };
  UI.closeSheet = function () {
    var ov = document.getElementById('sheet-overlay');
    if (ov) ov.classList.remove('show');
  };

  /* ====== 翻卡 ====== */
  UI.renderFlips = function (container, flips) {
    if (!container) return;
    container.innerHTML = '';
    (flips || []).forEach(function (f) {
      var card = document.createElement('div');
      card.className = 'flip-card';
      card.innerHTML =
        '<div class="flip-inner">' +
        '<div class="flip-front"><div class="ff-icon">' + f.icon + '</div>' +
        '<div class="ff-title">' + f.title + '</div>' +
        '<div class="ff-hint">点击翻面 →</div></div>' +
        '<div class="flip-back"><div class="fb-text">' + f.back + '</div></div>' +
        '</div>';
      card.addEventListener('click', function () { card.classList.toggle('flipped'); });
      container.appendChild(card);
    });
  };

  /* ====== AI 问答 ====== */
  UI.renderAI = function (container, qlist) {
    if (!container) return;
    container.innerHTML = '';
    (qlist || []).forEach(function (q, i) {
      var wrap = document.createElement('div');
      wrap.innerHTML =
        '<div class="ai-q"><div class="ai-q-num">' + (i + 1) + '</div><div>' + q.q + '</div></div>' +
        '<div class="ai-answer"><div>' + q.a + '</div>' +
        '<div class="law-ref">📎 法律依据：' + q.law + '</div></div>';
      var qEl = wrap.querySelector('.ai-q');
      var aEl = wrap.querySelector('.ai-answer');
      qEl.addEventListener('click', function () {
        var open = aEl.classList.toggle('show');
        qEl.style.background = open ? 'var(--blue-soft)' : 'var(--cream)';
        qEl.style.borderColor = open ? 'var(--blue)' : 'var(--hairline)';
        if (open && window.Progress) window.Progress.recordInteract('ai');
      });
      container.appendChild(wrap.firstChild);
      container.appendChild(wrap.firstChild);
    });
  };

  /* ====== 闯关赛 ====== */
  UI.initQuiz = function (container, questions, opts) {
    opts = opts || {};
    var onComplete = opts.onComplete || function () {};
    if (!container) return;
    var qi = 0, score = 0;
    container.innerHTML = '<button class="btn btn-primary btn-block">开始挑战</button>';
    container.querySelector('button').addEventListener('click', render);

    function render() {
      if (qi >= questions.length) {
        var pct = Math.round(score / questions.length * 100);
        var level = pct >= 80 ? '<span style="color:var(--green)">法律达人</span>'
          : pct >= 60 ? '<span style="color:var(--blue)">法律能手</span>'
            : pct >= 40 ? '<span style="color:var(--gold)">入门学员</span>'
              : '<span style="color:var(--red-main)">普法小白</span>';
        var msg = pct >= 60 ? '继续保持，法律就在身边！' : '别灰心，多翻翻手册，法律会保护有准备的人！';
        container.innerHTML =
          '<div class="quiz-result show"><div class="quiz-score">' + score +
          '<span style="font-size:20px;color:var(--muted)">/' + questions.length + '</span></div>' +
          '<div class="quiz-result-msg">正确率 ' + pct + '% · 你是「' + level + '」<br>' + msg + '</div>' +
          '<button class="btn btn-primary" id="retry">再来一次</button></div>';
        container.querySelector('#retry').addEventListener('click', function () {
          UI.initQuiz(container, questions, opts);
          container.querySelector('button').click();
        });
        onComplete(score, questions.length, pct);
        return;
      }
      var q = questions[qi];
      var dots = '';
      for (var i = 0; i < questions.length; i++) {
        dots += '<div class="quiz-dot ' + (i < qi ? 'done' : '') + ' ' + (i === qi ? 'current' : '') + '"></div>';
      }
      var optsHTML = '';
      q.options.forEach(function (o, i) {
        optsHTML += '<div class="quiz-opt" data-idx="' + i + '"><div class="opt-letter">' + 'ABCD'[i] + '</div><div>' + o + '</div></div>';
      });
      container.innerHTML =
        '<div class="quiz-progress">' + dots + '</div>' +
        '<div class="quiz-q">' + (qi + 1) + '. ' + q.q + '</div>' +
        '<div class="quiz-opts">' + optsHTML + '</div>' +
        '<div class="quiz-feedback" id="qz_fb"></div>' +
        '<button class="btn btn-primary quiz-next" id="qz_next" style="display:none">下一题 →</button>';

      var optEls = container.querySelectorAll('.quiz-opt');
      optEls.forEach(function (opt) {
        opt.addEventListener('click', function () {
          var idx = parseInt(opt.dataset.idx, 10);
          optEls.forEach(function (o) { o.style.pointerEvents = 'none'; });
          var fb = container.querySelector('#qz_fb');
          var next = container.querySelector('#qz_next');
          if (idx === q.answer) {
            opt.classList.add('correct');
            score++;
            fb.className = 'quiz-feedback show correct';
            fb.innerHTML = '✅ ' + q.explain;
          } else {
            opt.classList.add('wrong');
            optEls[q.answer].classList.add('correct');
            fb.className = 'quiz-feedback show wrong';
            fb.innerHTML = '❌ ' + q.explain;
          }
          next.style.display = 'inline-block';
          next.addEventListener('click', function () { qi++; render(); });
          if (window.Progress) window.Progress.recordInteract('quiz');
        });
      });
    }
  };

  /* ====== 主题卡（详情弹窗） ====== */
  UI.renderTopicCards = function (container, topics, bannerColor) {
    if (!container) return;
    container.innerHTML = '';
    var completed = (window.Progress && window.Progress.get().completedTopics) || [];
    topics.forEach(function (t) {
      var isDone = completed.indexOf(t.id) >= 0;
      var tagsHTML = (t.tags || []).map(function (g) {
        return '<span class="topic-tag" style="background:' + g.color + '">' + g.text + '</span>';
      }).join('');
      var card = document.createElement('div');
      card.className = 'topic-card' + (isDone ? ' done' : '');
      card.innerHTML =
        '<div class="topic-banner" style="background:' + (t.banner || bannerColor) + '"></div>' +
        '<div class="topic-body">' +
        '<div class="topic-icon">' + t.icon + '</div>' +
        '<h3>' + t.title + (isDone ? ' <span class="topic-done-flag">✓ 已学</span>' : '') + '</h3>' +
        '<div class="topic-tags">' + tagsHTML + '</div>' +
        '<div class="topic-summary">' + t.summary + '</div>' +
        '<div class="topic-arrow" style="color:' + (t.banner || bannerColor) + '">查看详情 →<span class="topic-count">' + (t.cases ? t.cases.length : 0) + ' 案例</span></div>' +
        '</div>';
      card.addEventListener('click', function () { UI.openTopicDetail(t, bannerColor); });
      container.appendChild(card);
    });
  };

  UI.openTopicDetail = function (topic, bannerColor) {
    var casesHTML = '';
    if (topic.cases && topic.cases.length) {
      topic.cases.forEach(function (c, i) {
        var tipsHTML = (c.tips || []).map(function (tp) { return '<li>' + tp + '</li>'; }).join('');
        casesHTML +=
          '<div class="case-acc-item">' +
          '<div class="case-acc-head"><span>📰 案例' + (i + 1) + '：' + c.date + ' · ' + c.location + '</span>' +
          '<span class="ca-tag">当事人：' + c.party + '</span></div>' +
          '<div class="case-acc-body ' + (i === 0 ? 'show' : '') + '">' +
          '<div class="case-story">' + c.story + '</div>' +
          '<div class="case-law">' + c.law + '</div>' +
          '<div class="case-tip"><ul>' + tipsHTML + '</ul></div>' +
          '</div></div>';
      });
    }
    // 加入"标记已学"按钮
    var completed = (window.Progress && window.Progress.get().completedTopics) || [];
    var isDone = completed.indexOf(topic.id) >= 0;
    var actionHTML = '<div class="mt16 center"><button class="btn ' + (isDone ? 'btn-outline' : 'btn-primary') + '" id="topic-mark">' +
      (isDone ? '✓ 已标记完成' : '标记本主题已学') + '</button></div>';
    UI.openModal(topic.icon + ' ' + topic.title, (casesHTML || '<p>暂无案例</p>') + actionHTML);

    // 折叠头绑定
    document.querySelectorAll('.case-acc-head').forEach(function (h) {
      h.addEventListener('click', function () { h.nextElementSibling.classList.toggle('show'); });
    });
    // 标记完成
    var markBtn = document.getElementById('topic-mark');
    if (markBtn) {
      markBtn.addEventListener('click', function () {
        if (!window.Auth || !window.Auth.current()) {
          UI.toast('请先登录再记录学习进度', 'warn');
          return;
        }
        var nowDone = window.Progress.markTopic(topic.id);
        if (nowDone) {
          UI.toast('已完成本主题，+5 积分', 'success');
          if (window.Achievements) window.Achievements.checkAll();
        } else {
          UI.toast('已取消标记', 'info');
        }
        UI.closeModal();
        if (window.App) window.App.refreshCurrent();
      });
    }
    // 进度记录
    if (window.Progress) window.Progress.recordTopicView(topic.id);
  };

  /* ====== 课后大案渲染 ====== */
  UI.renderCases = function (container, cases) {
    if (!container) return;
    container.innerHTML = '';
    cases.forEach(function (c) {
      var lawsHTML = '';
      (c.laws || []).forEach(function (l) {
        lawsHTML += '<div class="ac-law-item"><div class="ac-law-name">📎 ' + l.name + '</div><div class="ac-law-text">' + l.text + '</div></div>';
      });
      var card = document.createElement('div');
      card.className = 'ac-card';
      card.innerHTML =
        '<div class="ac-banner" style="background:' + c.banner + '"></div>' +
        '<div class="ac-body">' +
        '<div class="ac-meta"><span class="ac-badge" style="background:' + c.banner + '">' + c.tag + '</span><span>📅 ' + c.date + '</span><span>📍 ' + c.location + '</span></div>' +
        '<h3>' + c.icon + ' ' + c.title + '</h3>' +
        '<div class="ac-summary">' + c.summary + '</div>' +
        '<div class="case-story" style="margin-bottom:14px">' + c.story + '</div>' +
        '<div class="ac-laws-label">📋 交叉法条解读（' + (c.laws ? c.laws.length : 0) + ' 条）</div>' +
        '<div class="ac-laws">' + lawsHTML + '</div>' +
        '<div class="ac-verdict"><strong>判决结果：</strong>' + c.verdict + '</div>' +
        '<div class="ac-insight">💡 ' + c.insight + '</div>' +
        '<div class="mt16 row between"><button class="btn btn-outline btn-sm" data-case="' + c.id + '">💬 评论此案 (' + (window.Community ? window.Community.countCaseComments(c.id) : 0) + ')</button>' +
        '<button class="btn btn-ghost btn-sm" data-like-case="' + c.id + '">👍 ' + (window.Community ? window.Community.countCaseLikes(c.id) : 0) + '</button></div>' +
        '</div>';
      container.appendChild(card);
    });
    // 绑定评论按钮
    container.querySelectorAll('[data-case]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-case');
        if (window.Community) window.Community.openCaseComment(id);
      });
    });
    container.querySelectorAll('[data-like-case]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-like-case');
        if (window.Community) window.Community.toggleCaseLike(id, b);
      });
    });
    // 记录大案观览
    if (window.Progress) window.Progress.recordCaseViews(cases.map(function (c) { return c.id; }));
  };

  /* ====== 文书模板 ====== */
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function numToChinese(n) {
    if (!n) return '___';
    var d = '零壹贰叁肆伍陆柒捌玖', u = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟'];
    var s = String(n), r = '';
    for (var i = 0; i < s.length; i++) { r += d[parseInt(s[i], 10)] + (u[s.length - 1 - i] || ''); }
    return r || '___';
  }
  UI.genIOU = function () {
    var l = val('iou-lender') || '___', b = val('iou-borrower') || '___';
    var amt = val('iou-amount') || '___', dt = val('iou-date') || '___';
    var rp = val('iou-repay') || '___', id = val('iou-id') || '___';
    var pu = val('iou-purpose') || '___';
    var text = '                            借  条\n\n今借到 ' + l + ' 人民币（大写）' + numToChinese(amt) + '元整（¥' + amt + '元），\n借款用途：' + pu + '。\n借款人：' + b + '\n身份证号：' + id + '\n借款日期：' + dt + '\n约定还款日期：' + rp + '\n\n借款人承诺于约定日期前归还全部借款。如逾期未还，\n出借人有权向借款人住所地人民法院提起诉讼。\n\n                                      借款人（签字/按手印）：' + b + '\n                                      日期：' + dt + '\n\n【温馨提示】\n1. 借条须由借款人亲笔书写并签名，最好按手印。\n2. 金额建议同时写大小写，大写：壹贰叁肆伍陆柒捌玖拾佰仟万亿。\n3. 通过银行/微信转账支付借款，保留转账记录作为辅助证据。\n4. 如有担保人，应在借条上写明担保方式并签字。\n5. 借款人身份证复印件建议附在借条后面。';
    var out = document.getElementById('iou-output');
    if (out) out.textContent = text;
    return text;
  };
  UI.genWill = function () {
    var nm = val('will-name') || '___', id = val('will-id') || '___';
    var addr = val('will-addr') || '___', ct = val('will-content') || '___';
    var today = new Date().toLocaleDateString('zh-CN');
    var text = '                              遗  嘱\n\n立遗嘱人：' + nm + '，身份证号：' + id + '\n住址：' + addr + '\n\n本人神志清醒，具有完全民事行为能力，自愿立此遗嘱，\n对本人名下财产作如下处分：\n\n' + ct + '\n\n本人声明：以上遗嘱内容系本人真实意思表示，\n不存在受胁迫、欺诈等情形。本人此前所立遗嘱如有与本遗嘱\n不一致之处，均以本遗嘱为准。\n\n立遗嘱人（亲笔签名并按手印）：' + nm + '\n\n          ' + today;
    var out = document.getElementById('will-output');
    if (out) out.textContent = text;
    return text;
  };
  UI.copyText = function (elId) {
    var el = document.getElementById(elId);
    if (!el) return;
    var t = el.innerText;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(t).then(function () {
        el.style.background = 'var(--green-soft)';
        setTimeout(function () { el.style.background = ''; }, 1200);
        UI.toast('已复制到剪贴板', 'success');
      });
    } else {
      UI.toast('当前浏览器不支持自动复制', 'warn');
    }
  };

  // 模板渲染入口：在容器内渲染借条/遗嘱表单
  UI.renderTemplate = function (container, tplId) {
    if (!container) return;
    if (tplId === 'iou') {
      container.innerHTML =
        '<p class="small muted mb16">借钱给同学朋友？一张规范的借条能帮你省去无数麻烦。填写信息，自动生成标准借条。</p>' +
        '<div class="tpl-field" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div><label>出借人姓名</label><input id="iou-lender" placeholder="张三"></div>' +
        '<div><label>借款人姓名</label><input id="iou-borrower" placeholder="李四"></div>' +
        '</div>' +
        '<div class="tpl-field" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">' +
        '<div><label>借款金额（元）</label><input id="iou-amount" type="number" placeholder="5000"></div>' +
        '<div><label>借款日期</label><input id="iou-date" type="date"></div>' +
        '</div>' +
        '<div class="tpl-field" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">' +
        '<div><label>约定还款日期</label><input id="iou-repay" type="date"></div>' +
        '<div><label>借款人身份证号</label><input id="iou-id" placeholder="510xxx..."></div>' +
        '</div>' +
        '<div class="tpl-field mt8"><label>借款用途</label><input id="iou-purpose" placeholder="资金周转"></div>' +
        '<div class="tpl-actions"><button class="btn btn-primary" id="iou-gen">生成借条</button><button class="btn btn-outline" id="iou-copy">复制文本</button></div>' +
        '<div class="tpl-output" id="iou-output">填写上方信息后点击"生成借条"，借条文本将显示在这里。</div>';
      container.querySelector('#iou-gen').addEventListener('click', UI.genIOU);
      container.querySelector('#iou-copy').addEventListener('click', function () { UI.copyText('iou-output'); });
    } else if (tplId === 'will') {
      container.innerHTML =
        '<p class="small muted mb16">自书遗嘱须全文亲笔书写、签名、注明年月日。本工具帮你生成参考文本，打印后请全文手抄一遍并签名。</p>' +
        '<div class="tpl-field"><label>立遗嘱人姓名</label><input id="will-name" placeholder="王某某"></div>' +
        '<div class="tpl-field" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">' +
        '<div><label>身份证号</label><input id="will-id" placeholder="510xxx..."></div>' +
        '<div><label>住址</label><input id="will-addr" placeholder="四川省xx市xx区"></div>' +
        '</div>' +
        '<div class="tpl-field mt8"><label>财产分配内容（请写明财产项目及继承人）</label><textarea id="will-content" rows="5" placeholder="例：1. 位于xx市xx区xx路的房产一套，由长子张甲继承；2. 银行存款xx万元，由女儿张乙继承；"></textarea></div>' +
        '<div class="tpl-actions"><button class="btn btn-primary" id="will-gen">生成遗嘱</button><button class="btn btn-outline" id="will-copy">复制文本</button></div>' +
        '<div class="tpl-output" id="will-output">填写上方信息后点击"生成遗嘱"，参考文本将显示在这里。</div>';
      container.querySelector('#will-gen').addEventListener('click', UI.genWill);
      container.querySelector('#will-copy').addEventListener('click', function () { UI.copyText('will-output'); });
    }
  };

  window.UI = UI;
})();
