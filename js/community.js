// community.js — 学习笔记/问答/案例评论 + 点赞/采纳
// 全局共享 szch_posts 数组；案例评论用 szch_case_inter
(function () {
  var Community = {};

  function getPosts() { return window.Store.getPosts(); }
  function savePosts(p) { window.Store.setPosts(p); }

  function caseInter() { return window.Store.getCaseInteractions(); }
  function saveCaseInter(c) { window.Store.setCaseInteractions(c); }

  function me() {
    var u = window.Auth && window.Auth.current();
    return u ? u.username : null;
  }

  Community.TYPE_LABEL = { note: '笔记', qa: '问答', case: '案例评论' };
  Community.TYPE_COLOR = { note: '#1F5FA8', qa: '#7B2D8E', case: '#B8862D' };

  // 列出帖子（可选类型过滤）
  Community.list = function (type) {
    var posts = getPosts();
    if (type) posts = posts.filter(function (p) { return p.type === type; });
    // 排序：置顶 > 最新
    return posts.sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  };

  Community.create = function (data) {
    if (!window.Auth.requireLogin('发帖')) return null;
    var u = window.Auth.current();
    var post = {
      id: window.Store.uid(),
      type: data.type,         // note | qa
      title: data.title,
      body: data.body,
      author: u.username,
      createdAt: new Date().toISOString(),
      likes: [],
      answers: data.type === 'qa' ? [] : null,
      refTopicId: data.refTopicId || null,
      refCaseId: data.refCaseId || null
    };
    var posts = getPosts();
    posts.push(post);
    savePosts(posts);
    if (window.Auth) window.Auth.addPoints(3);
    if (window.Achievements) window.Achievements.checkAll();
    return post;
  };

  Community.toggleLike = function (postId) {
    var u = window.Auth.current();
    if (!u) { window.UI.toast('请先登录再点赞', 'warn'); return null; }
    var posts = getPosts();
    var p = posts.filter(function (x) { return x.id === postId; })[0];
    if (!p) return null;
    var i = p.likes.indexOf(u.username);
    if (i >= 0) p.likes.splice(i, 1);
    else p.likes.push(u.username);
    savePosts(posts);
    return { liked: i < 0, count: p.likes.length };
  };

  Community.addAnswer = function (postId, body) {
    var u = window.Auth.current();
    if (!u) { window.UI.toast('请先登录再回答', 'warn'); return null; }
    var posts = getPosts();
    var p = posts.filter(function (x) { return x.id === postId; })[0];
    if (!p) return null;
    if (p.type !== 'qa') return null;
    var ans = {
      id: window.Store.uid(),
      body: body,
      author: u.username,
      createdAt: new Date().toISOString(),
      adopted: false
    };
    p.answers.push(ans);
    savePosts(posts);
    return ans;
  };

  // 提问者采纳答案：双方各 +10
  Community.adoptAnswer = function (postId, answerId) {
    var u = window.Auth.current();
    if (!u) { window.UI.toast('请先登录', 'warn'); return false; }
    var posts = getPosts();
    var p = posts.filter(function (x) { return x.id === postId; })[0];
    if (!p) return false;
    if (p.author !== u.username) { window.UI.toast('仅提问者可采纳', 'warn'); return false; }
    // 取消其他已采纳
    var ans = p.answers.filter(function (a) { return a.id === answerId; })[0];
    if (!ans) return false;
    if (ans.adopted) return false;
    p.answers.forEach(function (a) { a.adopted = false; });
    ans.adopted = true;
    savePosts(posts);
    // 加分：提问者 +10，被采纳者 +10
    window.Auth.addPoints(10);
    var answerer = ans.author;
    if (answerer) {
      var users = window.Store.getUsers();
      if (users[answerer]) {
        users[answerer].points = (users[answerer].points || 0) + 10;
        window.Store.setUsers(users);
      }
    }
    window.UI.toast('已采纳，双方各 +10 积分', 'success');
    if (window.Achievements) window.Achievements.checkAll();
    return true;
  };

  // 案例评论
  Community.countCaseComments = function (caseId) {
    var ci = caseInter();
    return (ci.comments[caseId] || []).length;
  };
  Community.countCaseLikes = function (caseId) {
    var ci = caseInter();
    return (ci.likes[caseId] || []).length;
  };
  Community.toggleCaseLike = function (caseId, btnEl) {
    var u = window.Auth.current();
    if (!u) { window.UI.toast('请先登录再点赞', 'warn'); return; }
    var ci = caseInter();
    ci.likes[caseId] = ci.likes[caseId] || [];
    var i = ci.likes[caseId].indexOf(u.username);
    if (i >= 0) ci.likes[caseId].splice(i, 1);
    else ci.likes[caseId].push(u.username);
    saveCaseInter(ci);
    if (btnEl) btnEl.innerHTML = '👍 ' + ci.likes[caseId].length + (i < 0 ? ' ❤' : '');
  };
  Community.openCaseComment = function (caseId) {
    if (!window.Auth.requireLogin('查看/发表评论')) return;
    var ci = caseInter();
    ci.comments[caseId] = ci.comments[caseId] || [];
    var list = ci.comments[caseId];
    var listHTML = list.length ? '' : '<div class="empty"><div class="em-icon">💬</div>暂无评论，发表第一条吧</div>';
    list.forEach(function (c) {
      listHTML +=
        '<div class="answer-block">' +
        '<div class="ab-head"><div class="post-card .pc-avatar" style="display:inline-flex;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,var(--red-deep),var(--red-main));color:#fff;align-items:center;justify-content:center;font-size:11px;font-weight:700">' + c.author.charAt(0) + '</div>' +
        '<span style="font-weight:700">' + c.author + '</span><span> · ' + Community.fmtTime(c.at) + '</span></div>' +
        '<div class="ab-body">' + Community.escapeHTML(c.body) + '</div></div>';
    });
    window.UI.openSheet(
      '<h3>💬 案例评论</h3>' +
      '<div style="max-height:40vh;overflow-y:auto;margin-bottom:14px">' + listHTML + '</div>' +
      '<div class="form-group"><label>发表你的评论</label><textarea id="case-comment-input" rows="3" placeholder="说说你对这个案例的看法、疑问或联想的法律点…"></textarea></div>' +
      '<button class="btn btn-primary btn-block" id="case-comment-submit">发表评论</button>'
    );
    document.getElementById('case-comment-submit').addEventListener('click', function () {
      var ta = document.getElementById('case-comment-input');
      var v = ta.value.trim();
      if (!v) { window.UI.toast('评论不能为空', 'warn'); return; }
      var u = window.Auth.current();
      ci.comments[caseId].push({ id: window.Store.uid(), author: u.username, body: v, at: new Date().toISOString() });
      saveCaseInter(ci);
      window.UI.closeSheet();
      window.UI.toast('评论已发表，+3 积分', 'success');
      window.Auth.addPoints(3);
      if (window.Achievements) window.Achievements.checkAll();
      if (window.App) window.App.refreshCurrent();
    });
  };

  Community.fmtTime = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var now = new Date();
    var diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
    return d.toLocaleDateString('zh-CN');
  };

  Community.escapeHTML = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  window.Community = Community;
})();
