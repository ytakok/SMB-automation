/*!
 * SMB Automation website chat widget.
 * Paste on a customer's website (before </body>):
 *   <script src="https://<agency-site>/embed/chat-widget.js" data-site-key="site_..." data-lang="he" defer></script>
 * Optional: data-title, data-greeting, data-color="#4f46e5", data-position="left|right",
 *           data-mode="bubble|inline" (inline fills data-target or the page), data-target="#id",
 *           data-endpoint (defaults to <script origin>/webhook/site-chat).
 * The site key is public; n8n only answers on the customer's registered websites.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;
  var siteKey = script.getAttribute('data-site-key') || '';
  if (!/^site_[a-f0-9]{24,64}$/.test(siteKey)) {
    console.warn('[chat-widget] Missing or invalid data-site-key.');
    return;
  }
  if (window.__smbChatWidgets && window.__smbChatWidgets[siteKey]) return;
  window.__smbChatWidgets = window.__smbChatWidgets || {};
  window.__smbChatWidgets[siteKey] = true;

  var TEXT = {
    he: {
      dir: 'rtl',
      title: 'צ׳אט',
      greeting: 'שלום! אפשר לשאול אותי על העסק, לקבוע פגישה או להשאיר פרטים.',
      placeholder: 'כתבו הודעה…',
      inputLabel: 'הודעה',
      send: 'שליחה',
      open: 'פתיחת צ׳אט',
      close: 'סגירת הצ׳אט',
      typing: 'כותב…',
      error: 'ההודעה לא נשלחה. נסו שוב.',
      timeout: 'התשובה מתעכבת. נסו שוב.',
      newChat: 'שיחה חדשה',
    },
    en: {
      dir: 'ltr',
      title: 'Chat',
      greeting: 'Hi! Ask me about the business, book a meeting, or leave your details.',
      placeholder: 'Type a message…',
      inputLabel: 'Message',
      send: 'Send',
      open: 'Open chat',
      close: 'Close chat',
      typing: 'Typing…',
      error: "The message wasn't sent. Please try again.",
      timeout: 'The reply is taking too long. Please try again.',
      newChat: 'New chat',
    },
  };

  var attr = function (name, fallback) {
    var value = script.getAttribute('data-' + name);
    return value === null || value === '' ? fallback : value;
  };
  var pageLang = (document.documentElement.lang || '').toLowerCase();
  var lang = attr('lang', pageLang.indexOf('he') === 0 ? 'he' : 'en');
  var t = TEXT[lang] || TEXT.en;
  var title = attr('title', t.title);
  var greeting = attr('greeting', t.greeting);
  var color = attr('color', '#4f46e5');
  if (!/^#[0-9a-f]{3,8}$/i.test(color)) color = '#4f46e5';
  var mode = attr('mode', 'bubble');
  var position = attr('position', t.dir === 'rtl' ? 'left' : 'right') === 'left' ? 'left' : 'right';
  var endpoint = attr('endpoint', new URL(script.src, location.href).origin + '/webhook/site-chat');
  var TIMEOUT_MS = 90000;

  // ---- Conversation kept for this browser tab
  var storeKey = 'smbChat:' + siteKey;
  var load = function () {
    try {
      return JSON.parse(sessionStorage.getItem(storeKey) || 'null');
    } catch (e) {
      return null;
    }
  };
  var newSessionId = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  };
  var state = load() || { sessionId: newSessionId(), messages: [], open: false };
  var save = function () {
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(state));
    } catch (e) {
      /* storage blocked: keep the chat in memory only */
    }
  };

  // ---- DOM (shadow root so the customer's CSS can't break it, and ours can't break theirs)
  var host = document.createElement('div');
  host.setAttribute('data-smb-chat', '');
  var target =
    mode === 'inline'
      ? document.querySelector(attr('target', 'body')) || document.body
      : document.body;
  target.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var css =
    ':host{all:initial}' +
    '*{box-sizing:border-box}' +
    '.w{--c:' +
    color +
    ';font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1f2330}' +
    '.w.bubble{position:fixed;bottom:20px;' +
    position +
    ':20px;z-index:2147483000;display:flex;flex-direction:column;align-items:' +
    (position === 'left' ? 'flex-start' : 'flex-end') +
    ';gap:12px}' +
    '.w.inline{position:fixed;inset:0;display:flex}' +
    '.toggle{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 18px;background:var(--c);color:#fff;font:inherit;font-weight:600;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.18)}' +
    '.toggle:focus-visible,.send:focus-visible,.x:focus-visible,.new:focus-visible{outline:3px solid #111;outline-offset:2px}' +
    '.panel{width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 110px));background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden}' +
    '.inline .panel{width:100%;height:100%;border-radius:0;box-shadow:none}' +
    '.head{display:flex;align-items:center;gap:8px;padding:12px 14px;background:var(--c);color:#fff}' +
    '.head h2{flex:1;margin:0;font-size:16px;font-weight:700}' +
    '.x,.new{border:0;background:rgba(255,255,255,.18);color:#fff;border-radius:8px;padding:4px 10px;font:inherit;font-size:13px;cursor:pointer}' +
    '.x{font-size:20px;line-height:1;padding:2px 10px}' +
    '.log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#f6f7fb}' +
    '.m{max-width:85%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}' +
    '.m.a{align-self:flex-start;background:#fff;border:1px solid #e3e5ee}' +
    '.m.u{align-self:flex-end;background:var(--c);color:#fff}' +
    '.m.typing{color:#5b6070;font-style:italic}' +
    '.err{margin:0;padding:8px 14px;background:#fdecec;color:#8a1c1c;font-size:13px}' +
    '.form{display:flex;gap:8px;padding:10px;border-top:1px solid #e3e5ee;background:#fff}' +
    '.form input{flex:1;min-width:0;border:1px solid #c9ccd8;border-radius:10px;padding:10px 12px;font:inherit;color:inherit;background:#fff}' +
    '.form input:focus{outline:2px solid var(--c);outline-offset:1px}' +
    '.send{border:0;border-radius:10px;padding:0 16px;background:var(--c);color:#fff;font:inherit;font-weight:600;cursor:pointer}' +
    '.send[disabled],.form input[disabled]{opacity:.6;cursor:default}' +
    '.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '@media (max-width:480px){.w.bubble{bottom:12px;' +
    position +
    ':12px}.bubble .panel{width:calc(100vw - 24px);height:calc(100vh - 90px)}}' +
    '@media (prefers-reduced-motion:no-preference){.panel{animation:pop .16s ease-out}}' +
    '@keyframes pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}';

  var el = function (tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  var style = el('style');
  style.textContent = css;
  var wrap = el('div', 'w ' + (mode === 'inline' ? 'inline' : 'bubble'));
  wrap.setAttribute('dir', t.dir);
  wrap.setAttribute('lang', lang);

  var panel = el('section', 'panel');
  panel.setAttribute('role', mode === 'inline' ? 'region' : 'dialog');
  panel.setAttribute('aria-label', title);
  var head = el('div', 'head');
  var h2 = el('h2', '', title);
  var newBtn = el('button', 'new', t.newChat);
  newBtn.type = 'button';
  head.appendChild(h2);
  head.appendChild(newBtn);
  var closeBtn = el('button', 'x', '×');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', t.close);
  if (mode !== 'inline') head.appendChild(closeBtn);

  var log = el('div', 'log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  var err = el('p', 'err');
  err.setAttribute('role', 'alert');
  err.hidden = true;

  var form = el('form', 'form');
  var inputId = 'smb-chat-input';
  var label = el('label', 'vh', t.inputLabel);
  label.setAttribute('for', inputId);
  var input = el('input');
  input.id = inputId;
  input.type = 'text';
  input.autocomplete = 'off';
  input.maxLength = 1000;
  input.placeholder = t.placeholder;
  input.setAttribute('dir', 'auto');
  var sendBtn = el('button', 'send', t.send);
  sendBtn.type = 'submit';
  form.appendChild(label);
  form.appendChild(input);
  form.appendChild(sendBtn);

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(err);
  panel.appendChild(form);

  var toggle = el('button', 'toggle');
  toggle.type = 'button';
  var toggleIcon = el('span', '', '💬');
  toggleIcon.setAttribute('aria-hidden', 'true');
  var toggleText = el('span', '', t.open);
  toggle.appendChild(toggleIcon);
  toggle.appendChild(toggleText);

  root.appendChild(style);
  root.appendChild(wrap);

  // ---- Rendering (text only; **bold** is the only formatting kept)
  var renderText = function (node, text) {
    var parts = String(text).split('**');
    parts.forEach(function (part, i) {
      if (!part) return;
      node.appendChild(i % 2 ? el('strong', '', part) : document.createTextNode(part));
    });
  };
  var addMessage = function (role, text, extraClass) {
    var m = el('div', 'm ' + (role === 'user' ? 'u' : 'a') + (extraClass ? ' ' + extraClass : ''));
    m.setAttribute('dir', 'auto');
    renderText(m, text);
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  };
  var renderLog = function () {
    log.textContent = '';
    addMessage('assistant', greeting);
    state.messages.forEach(function (m) {
      addMessage(m.role, m.text);
    });
  };

  var setOpen = function (open) {
    state.open = open;
    save();
    wrap.textContent = '';
    if (mode === 'inline') {
      wrap.appendChild(panel);
    } else {
      if (open) wrap.appendChild(panel);
      wrap.appendChild(toggle);
      toggle.setAttribute('aria-expanded', String(open));
      toggleIcon.textContent = open ? '×' : '💬';
      toggleText.textContent = open ? t.close : t.open;
    }
    if (open || mode === 'inline') {
      renderLog();
      setTimeout(function () {
        input.focus();
      }, 0);
    } else {
      toggle.focus();
    }
  };

  var sending = false;
  var setSending = function (value) {
    sending = value;
    input.disabled = value;
    sendBtn.disabled = value;
  };

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text || sending) return;
    input.value = '';
    err.hidden = true;
    state.messages.push({ role: 'user', text: text });
    save();
    addMessage('user', text);
    var typing = addMessage('assistant', t.typing, 'typing');
    setSending(true);

    var controller = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, TIMEOUT_MS);

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendMessage',
        siteKey: siteKey,
        sessionId: state.sessionId,
        chatInput: text,
      }),
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            return { ok: res.ok, data: data };
          });
      })
      .then(function (result) {
        var reply =
          result.data && typeof result.data.output === 'string' ? result.data.output.trim() : '';
        typing.remove();
        if (!reply) throw new Error('empty');
        state.messages.push({ role: 'assistant', text: reply });
        state.messages = state.messages.slice(-60);
        save();
        addMessage('assistant', reply);
      })
      .catch(function (e) {
        typing.remove();
        err.textContent = e && e.name === 'AbortError' ? t.timeout : t.error;
        err.hidden = false;
      })
      .then(function () {
        clearTimeout(timer);
        setSending(false);
        input.focus();
      });
  });

  toggle.addEventListener('click', function () {
    setOpen(!state.open);
  });
  closeBtn.addEventListener('click', function () {
    setOpen(false);
  });
  newBtn.addEventListener('click', function () {
    state = { sessionId: newSessionId(), messages: [], open: true };
    save();
    err.hidden = true;
    renderLog();
    input.focus();
  });
  panel.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && mode !== 'inline') setOpen(false);
  });

  setOpen(mode === 'inline' ? true : !!state.open);
})();
