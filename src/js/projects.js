// Projects list: every project with its open / total item counts.
'use strict';

const OPEN_STATUSES = ['todo', 'in_progress', 'blocked', 'review'];

const ProjectsView = {
  async render(main, seq) {
    App.crumbs([]);
    const projects = await Api.projects();
    const stats = await Promise.all(projects.map(p => Api.stats(p.key)));
    if (!App.isCurrent(seq)) return;

    if (!projects.length) {
      main.replaceChildren(h('p', { class: 'text-body-secondary' },
        'No projects yet. Create one with ', h('code', {}, 'pm project add KEY "Name"'), '.'));
      return;
    }

    const rows = projects.map((p, i) => {
      const s = stats[i];
      const open = OPEN_STATUSES.reduce((sum, st) => sum + (s.byStatus[st] || 0), 0);
      const href = `#/p/${p.key}?open=true`;
      return h('tr', { 'data-href': href },
        h('td', { class: 'fw-semibold' }, h('a', { href }, p.key)),
        h('td', {}, p.name, h('div', { class: 'small text-body-secondary' }, p.description)),
        h('td', { class: 'text-end' }, open),
        h('td', { class: 'text-end' }, s.byStatus.in_progress || 0),
        h('td', { class: 'text-end' }, s.byStatus.done || 0),
        h('td', { class: 'text-end' }, s.total));
    });

    const heading = (text, end) => h('th', { class: end ? 'text-end' : null }, text);
    main.replaceChildren(
      h('h1', { class: 'h4 mb-3' }, 'Projects'),
      h('div', { class: 'table-responsive' },
        h('table', { class: 'table table-hover align-middle' },
          h('thead', {}, h('tr', {},
            heading('Key'), heading('Name'), heading('Open', true), heading('In progress', true),
            heading('Done', true), heading('Total', true))),
          h('tbody', {}, rows))));
  },
};
