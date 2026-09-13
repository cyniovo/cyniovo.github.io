// storage.js — localStorage 抽象层（命名空间 szch_）
// 所有持久化数据统一通过此模块读写
(function () {
  var PREFIX = 'szch_';
  var Store = {};

  function key(name) { return PREFIX + name; }

  Store.get = function (name, def) {
    try {
      var raw = localStorage.getItem(key(name));
      if (raw === null || raw === undefined) return def;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('storage.get failed:', name, e);
      return def;
    }
  };

  Store.set = function (name, value) {
    try {
      localStorage.setItem(key(name), JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('storage.set failed:', name, e);
      return false;
    }
  };

  Store.remove = function (name) {
    localStorage.removeItem(key(name));
  };

  // 用户列表 { username: {username, password, createdAt, ageGroup, points} }
  Store.getUsers = function () { return Store.get('users', {}); };
  Store.setUsers = function (u) { return Store.set('users', u); };

  // 当前会话 { username, loginAt }
  Store.getSession = function () { return Store.get('session', null); };
  Store.setSession = function (s) { return Store.set('session', s); };
  Store.clearSession = function () { Store.remove('session'); };

  // 每用户进度，键名 progress_<username>
  Store.getProgress = function (username) { return Store.get('progress_' + username, null); };
  Store.setProgress = function (username, p) { return Store.set('progress_' + username, p); };

  // 每用户文书，键名 docs_<username>
  Store.getDocs = function (username) { return Store.get('docs_' + username, []); };
  Store.setDocs = function (username, d) { return Store.set('docs_' + username, d); };

  // 每用户已得徽章
  Store.getBadges = function (username) { return Store.get('badges_' + username, []); };
  Store.setBadges = function (username, b) { return Store.set('badges_' + username, b); };

  // 全局社区数据（所有用户共享）
  Store.getPosts = function () { return Store.get('posts', []); };
  Store.setPosts = function (p) { return Store.set('posts', p); };

  // 案例评论 + 点赞（全局）
  Store.getCaseInteractions = function () { return Store.get('case_inter', { comments: {}, likes: {} }); };
  Store.setCaseInteractions = function (c) { return Store.set('case_inter', c); };

  // PWA 安装提示事件缓存
  Store.getPromptEvent = function () { return window.__szchInstallPrompt || null; };
  Store.setPromptEvent = function (e) { window.__szchInstallPrompt = e; };

  // 唯一 ID
  Store.uid = function () {
    return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  };

  window.Store = Store;
})();
