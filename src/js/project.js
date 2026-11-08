// Project view: filterable item list. Filters live in the URL (#/p/KEY?status=todo&type=task), so views can be linked.
'use strict';

const PAGE_SIZE = 100;
const FILTER_KEYS = ['type', 'status', 'open', 'priority', 'assignee', 'label', 'parent', 'q'];
const ITEM_COLUMNS = ['Id', 'Type', 'Title', 'Status', 'Priority', 'Assignee', 'Labels', 'Parent', 'Updated'];

const ProjectView = {
  async render(main, seq, key, query) {
    const filter = Object.fromEntries(FILTER_KEYS.filter(k => query[k]).map(k => [k, query[k]]));
    const [project, page] = await Promise.all([
      Api.project(key),
      Api.items({ ...filter, project: key, limit: PAGE_SIZE, offset: 0 }),
    ]);
    if (!App.isCurrent(seq)) return;

    App.crumbs([[project.key, null]]);
    const state = {
      loaded: 0,
      rows: h('tbody'),
      count: h('div', { class: 'small text-body-secondary mb-2' }),
      more: h('button', {
        class: 'btn btn-outline-secondary btn-sm d-none',
        onclick: async () => {
          try {
            const next = await Api.items({ ...filter, project: key, limit: PAGE_SIZE, offset: state.loaded });
            if (App.isCurrent(seq)) ProjectView.append(state, next);
          } catch (e) { App.error(e); }
        },
      }, 'Load more'),
    };

    main.replaceChildren(
      h('div', { class: 'd-flex flex-wrap align-items-center gap-2 mb-3' },
        h('h1', { class: 'h4 mb-0 me-auto' }, project.name, ' ', h('small', { class: 'text-body-secondary' }, project.key)),
        h('button', {
          class: 'btn btn-primary btn-sm',
          disabled: !App.canWrite(),
          title: App.canWrite() ? null : 'Pick a user to make changes',
          onclick: () => ItemForm.open({ project: key }),
        }, 'New item')),
      ProjectView.filters(filter, key),
      state.count,
      h('div', { class: 'table-responsive' },
        h('table', { class: 'table table-hover table-sm items-table' },
          h('thead', {}, h('tr', {}, ITEM_COLUMNS.map(c => h('th', {}, c)))),
          state.rows)),
      state.more);
    ProjectView.append(state, page);
  },

  append(state, page) {
    state.rows.append(...page.data.map(ProjectView.row));
    state.loaded += page.data.length;
    state.count.textContent = page.total
      ? `Showing ${state.loaded} of ${page.total} items`
      : 'No items match these filters.';
    state.more.classList.toggle('d-none', !page.hasMore);
  },

  row(i) {
    const href = `#/i/${i.id}`;
    return h('tr', { 'data-href': href },
      h('td', { class: 'col-id' }, h('a', { href }, i.id)),
      h('td', { class: 'small' }, i.type),
      h('td', { class: 'col-title' }, i.title),
      h('td', {}, U.statusBadge(i.status)),
      h('td', { class: 'small' }, U.priority(i.priority)),
      h('td', { class: 'small' }, i.assignee),
      h('td', {}, U.labels(i.labels)),
      h('td', { class: 'col-id' }, i.parent && h('a', { href: `#/i/${i.parent}` }, i.parent)),
      h('td', { class: 'small text-nowrap text-body-secondary' }, U.date(i.updatedAt)));
  },

  // "open" is offered as a pseudo-status: it maps to the API's open=true filter
  filters(f, key) {
    const status = f.open === 'true' ? 'open' : (f.status || '');
    const col = child => h('div', { class: 'col-auto' }, child);
    const select = (name, label, options) =>
      col(h('select', { class: 'form-select form-select-sm', name, 'aria-label': label, onchange: apply }, options));
    const input = (name, label, placeholder) =>
      col(h('input', { class: 'form-control form-control-sm', name, placeholder, value: f[name] || '', 'aria-label': label }));

    const apply = () => {
      const data = Object.fromEntries(new FormData(form));
      const query = { ...data, open: data.status === 'open' ? 'true' : '' };
      if (data.status === 'open') query.status = '';
      location.hash = `#/p/${encodeURIComponent(key)}${U.query(query)}`;
    };
    const form = h('form', { class: 'filters row g-2 align-items-end mb-3', onsubmit: e => { e.preventDefault(); apply(); } },
      select('type', 'Type', U.options(App.meta.types, f.type || '', { empty: 'any type' })),
      select('status', 'Status', [
        h('option', { value: '' }, 'any status'),
        h('option', { value: 'open', selected: status === 'open' }, 'open'),
        ...U.options(App.meta.statuses, status),
      ]),
      select('priority', 'Priority', U.options(App.meta.priorities, f.priority || '', { empty: 'any priority' })),
      select('assignee', 'Assignee', U.options(['none', ...App.userNames()], f.assignee || '', { empty: 'any assignee' })),
      input('label', 'Label', 'label'),
      input('parent', 'Parent', 'parent id or none'),
      input('q', 'Search', 'search text'),
      col([
        h('button', { class: 'btn btn-sm btn-outline-primary', type: 'submit' }, 'Apply'),
        h('a', { class: 'btn btn-sm btn-link', href: `#/p/${encodeURIComponent(key)}` }, 'Clear'),
      ]));
    return form;
  },
};
