// 버전 표시·정보 창·새 버전 확인 (모든 앱 공통 방식)
// GitHub 공개 릴리스 정보만 읽고, 아무것도 보내지 않아요.
(function () {
  'use strict';
  var I = window.APP_INFO;
  var el = null, latest = null, layer = null, statusEl = null;
  var APK = 'https://github.com/' + I.repo + '/releases/latest/download/' + I.apkName;
  var PAGE = 'https://' + I.repo.split('/')[0] + '.github.io/' + I.repo.split('/')[1] + '/';

  function num(v) { return String(v).replace(/^v/, '').split('.').map(function (x) { return parseInt(x, 10) || 0; }); }
  function newer(a, b) { var x = num(a), y = num(b); for (var i = 0; i < Math.max(x.length, y.length); i++) { var p = x[i] || 0, q = y[i] || 0; if (p !== q) return p > q; } return false; }
  function hasNew() { return latest && newer(latest, I.version); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function isApp() { return !!(window.Bridge && window.Bridge.isApp && window.Bridge.isApp()); }

  function paint() {
    if (!el) return;
    el.textContent = 'v' + I.version;
    el.classList.toggle('new', !!hasNew());
    el.setAttribute('aria-label', hasNew() ? '새 버전 v' + latest + '이 나왔어요' : '버전 정보 v' + I.version);
    if (statusEl) statusEl.textContent = statusText();
  }
  function statusText() {
    if (!I.online) return '미리보기에서는 새 버전을 확인하지 않아요';
    if (hasNew()) return '새 버전 v' + latest + '이 나왔어요';
    return '지금 쓰는 버전이 최신이에요';
  }

  function update() {
    if (isApp()) { window.Bridge.openUrl(APK); }
    else { location.reload(); }
  }

  function check(manual) {
    if (!I.online) { if (manual && statusEl) statusEl.textContent = statusText(); return; }
    if (manual && statusEl) statusEl.textContent = '확인하는 중…';
    fetch('https://api.github.com/repos/' + I.repo + '/releases/latest', { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && typeof j.tag_name === 'string' && /^v?\d+(\.\d+)*$/.test(j.tag_name)) latest = j.tag_name.replace(/^v/, '');
        paint();
        if (!manual && hasNew()) promptOnce();
        if (manual && statusEl) render();
      })
      .catch(function () { if (manual && statusEl) statusEl.textContent = '인터넷 연결을 확인해 주세요'; });
  }

  function promptOnce() {
    var k = 'appinfo.prompted';
    try { if (localStorage.getItem(k) === latest) return; localStorage.setItem(k, latest); } catch (e) {}
    open(true);
  }

  function close() { if (layer) { layer.remove(); layer = null; statusEl = null; return true; } return false; }

  var sheetBox = null;
  function render() {
    if (!sheetBox) return;
    sheetBox.replaceChildren();
    var h3 = mk('h3'); h3.append(I.name + ' '); h3.append(mk('span', 'pill', 'v' + I.version));
    statusEl = mk('p', null, statusText());
    sheetBox.append(h3, statusEl);
    if (hasNew()) {
      var up = mk('button', 'btn pri', isApp() ? '업데이트 받기 (v' + latest + ')' : '새로고침해서 업데이트');
      up.type = 'button'; up.onclick = update; sheetBox.append(up);
      if (isApp()) sheetBox.append(mk('p', null, '받은 파일을 열어 설치하면 돼요. 적어 둔 할 일은 그대로 남아요.'));
    }
    var ck = mk('button', 'btn', '새 버전 확인'); ck.type = 'button'; ck.onclick = function () { check(true); };
    sheetBox.append(ck);
    sheetBox.append(mk('div', 'sec', '업데이트 내용'));
    I.notes.forEach(function (n) { var d = mk('div', 'note'); d.append(mk('b', null, 'v' + n[0] + ' · ' + n[1])); d.append(n[2]); sheetBox.append(d); });
    sheetBox.append(mk('div', 'sec', '개인정보'));
    sheetBox.append(mk('p', null, I.privacy));
    var pg = mk('p', null, '다운로드 페이지: ' + PAGE); pg.style.userSelect = 'text'; sheetBox.append(pg);
  }

  function open() {
    close();
    layer = mk('div', 'dim');
    sheetBox = mk('div', 'sheet'); sheetBox.setAttribute('role', 'dialog');
    layer.append(sheetBox);
    layer.addEventListener('click', function (e) { if (e.target === layer) close(); });
    document.body.append(layer);
    render();
  }

  window.AppInfo = {
    close: close,
    isOpen: function () { return !!layer; },
    native: function (v) { if (/^v?\d+(\.\d+)*$/.test(String(v))) { latest = String(v).replace(/^v/, ''); paint(); } },
    init: function () {
      el = document.querySelector(I.mount);
      if (!el) return;
      el.addEventListener('click', open);
      paint();
      check(false);
    }
  };
})();
