// App shell: loads metadata and users, runs the user picker, alerts, breadcrumbs and the hash router.
// Routes: #/ projects | #/p/KEY?filters project items | #/i/KEY-N item detail
'use strict';

const USER_KEY = 'simple-pm.user';

const App = {
  meta: { types: [], statuses: [], priorities: [] },
  users: [],
  seq: 0, // bumped on every navigation, so a slow load can't paint over a newer view

  async start() {
    // opened from disk (file://): the API calls can't work, so point to the served address instead
    if (location.protocol === 'file:') {
      document.getElementById('main').replaceChildren(h('div', { class: 'alert alert-warning' },
        'This page must be opened through the simple-pm API, not from disk. Open ',
        h('a', { href: 'http://localhost:5080/app/' }, 'http://localhost:5080/app/'), '.'));
      return;
    }
    try {
      [App.meta, App.users] = await Promise.all([Api.root(), Api.users()]);
    } catch (e) {
      App.error(e);
      return;
    }
    App.initUserPicker();
    ItemForm.init();
    UserForm.init();
    // a click anywhere on a row follows its data-href (links and controls inside the row keep their own behaviour)
    document.getElementById('main').addEventListener('click', e => {
      if (e.target.closest('a, button, input, select, textarea')) return;
      const row = e.target.closest('tr[data-href]');
      if (row) location.hash = row.dataset.href;
    });
    window.addEventListener('hashchange', App.route);
    App.route();
  },

  initUserPicker() {
    let saved = '';
    try { saved = localStorage.getItem(USER_KEY) || ''; } catch { /* storage blocked: start read-only */ }
    if (!App.users.some(u => u.name === saved)) saved = '';
    Api.user = saved;
    App.fillUserPicker();
    const picker = document.getElementById('user-picker');
    picker.addEventListener('change', () => App.setUser(picker.value));
  },

  fillUserPicker() {
    document.getElementById('user-picker').replaceChildren(...U.options(App.userNames(), Api.user, { empty: '(read-only)' }));
  },

  // switches the acting user, remembers it and redraws the view (buttons depend on it)
  setUser(name) {
    Api.user = name;
    try { localStorage.setItem(USER_KEY, name); } catch { /* remembered for this page only */ }
    App.fillUserPicker();
    App.route();
  },

  canWrite: () => Boolean(Api.user),
  userNames: () => App.users.map(u => u.name),

  async route() {
    const seq = ++App.seq;
    const { parts, query } = U.parseHash(location.hash);
    const main = document.getElementById('main');
    App.clearAlerts();
    main.replaceChildren(h('div', { class: 'text-body-secondary' }, 'Loading…'));
    try {
      if (parts[0] === 'p' && parts[1]) await ProjectView.render(main, seq, parts[1], query);
      else if (parts[0] === 'i' && parts[1]) await ItemView.render(main, seq, parts[1]);
      else await ProjectsView.render(main, seq);
    } catch (e) {
      if (App.isCurrent(seq)) { main.replaceChildren(); App.error(e); }
    }
  },

  isCurrent: seq => seq === App.seq,

  crumbs(list) {
    document.getElementById('crumbs').replaceChildren(...list.map(([text, href]) => href
      ? h('li', { class: 'breadcrumb-item' }, h('a', { href }, text))
      : h('li', { class: 'breadcrumb-item active', 'aria-current': 'page' }, text)));
    document.title = list.length ? list[list.length - 1][0] + ' · simple-pm' : 'simple-pm';
  },

  error(e) { App.alert(e.message || String(e), 'danger'); },

  alert(text, kind = 'success') {
    const box = h('div', { class: `alert alert-${kind} alert-dismissible`, role: 'alert' }, text,
      h('button', { type: 'button', class: 'btn-close', 'data-bs-dismiss': 'alert', 'aria-label': 'Close' }));
    document.getElementById('alerts').append(box);
    if (kind !== 'danger') setTimeout(() => box.remove(), 3000);
  },

  // errors belong to the view that caused them; confirmations ("saved", "created") outlive the navigation
  clearAlerts() { document.querySelectorAll('#alerts .alert-danger').forEach(a => a.remove()); },
};

App.start();
