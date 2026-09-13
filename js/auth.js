// auth.js — 注册/登录/登出/会话
// 演示用：明文存 localStorage，UI 注明"仅供比赛演示"
(function () {
  var Auth = {};

  // {username, password, createdAt, ageGroup, points}
  Auth.current = function () {
    var s = window.Store.getSession();
    if (!s || !s.username) return null;
    var users = window.Store.getUsers();
    return users[s.username] || null;
  };

  Auth.isLoggedIn = function () { return !!Auth.current(); };

  Auth.register = function (username, password, ageGroup) {
    username = (username || '').trim();
    if (username.length < 2) return { ok: false, msg: '用户名至少 2 个字符' };
    if (username.length > 16) return { ok: false, msg: '用户名不超过 16 个字符' };
    if (!/^[A-Za-z0-9_\u4e00-\u9fa5]+$/.test(username)) return { ok: false, msg: '用户名仅限中英文/数字/下划线' };
    if (!password || password.length < 4) return { ok: false, msg: '密码至少 4 位' };
    if (['youth', 'mid', 'old'].indexOf(ageGroup) < 0) return { ok: false, msg: '请选择年龄段' };

    var users = window.Store.getUsers();
    if (users[username]) return { ok: false, msg: '用户名已存在' };

    users[username] = {
      username: username,
      password: password,
      createdAt: new Date().toISOString(),
      ageGroup: ageGroup,
      points: 0
    };
    window.Store.setUsers(users);

    // 初始化进度
    window.Store.setProgress(username, window.Progress.default());
    window.Store.setBadges(username, []);
    window.Store.setDocs(username, []);

    // 自动登录
    window.Store.setSession({ username: username, loginAt: new Date().toISOString() });
    return { ok: true, user: users[username] };
  };

  Auth.login = function (username, password) {
    username = (username || '').trim();
    var users = window.Store.getUsers();
    var u = users[username];
    if (!u) return { ok: false, msg: '用户不存在' };
    if (u.password !== password) return { ok: false, msg: '密码错误' };
    window.Store.setSession({ username: username, loginAt: new Date().toISOString() });
    return { ok: true, user: u };
  };

  Auth.logout = function () {
    window.Store.clearSession();
  };

  // 年龄段中文标签
  Auth.ageGroupLabel = function (g) {
    return { youth: '青年 (18-30)', mid: '中年 (30-55)', old: '老年 (55+)' }[g] || '未设置';
  };

  // 游客也能浏览的检查：未登录时给出提示
  Auth.requireLogin = function (action) {
    if (Auth.isLoggedIn()) return true;
    window.UI.toast('请先登录以' + (action || '继续'), 'warn', 2500);
    return false;
  };

  // 加分
  Auth.addPoints = function (n) {
    var u = Auth.current();
    if (!u) return 0;
    u.points = (u.points || 0) + n;
    var users = window.Store.getUsers();
    users[u.username].points = u.points;
    window.Store.setUsers(users);
    return u.points;
  };

  window.Auth = Auth;
})();
