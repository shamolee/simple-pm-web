// Project view: filterable item list. Filters live in the URL (#/p/KEY?status=todo&type=task), so views can be linked.
'use strict';

const PAGE_SIZE = 100;
const FILTER_KEYS = ['type', 'status', 'open', 'priority', 'assignee', 'label', 'parent', 'q'];

const ProjectView = {
  async render(main, seq, key, query) {
    const filter = Object.fromEntries(FILTER_KEYS.filter(k => query[k]).map(k => [k, query[k]]));
    const [project, page] = await Promise.all([
      Api.project(key),
      Api.items({ ...filter, project: key, limit: PAGE_SIZE, offset: 0 }),
    ]);
    if (!App.isCurrent(seq)) return;

    App.crumbs([[project.key, null]]);
    main.innerHTML = `
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 class="h4 mb-0 me-auto">${U.esc(project.name)} <small class="text-body-secondary">${U.esc(project.key)}</small></h1>
        <button class="btn btn-primary btn-sm" id="btn-new" ${App.canWrite() ? '' : 'disabled title="Pick a user to make changes"'}>New item</button>
      </div>
      ${ProjectView.filtersHtml(filter, key)}
      <div class="small text-body-secondary mb-2" id="item-count"></div>
      <div class="table-responsive">
        <table class="table table-hover table-sm items-table">
          <thead><tr><th>Id</th><th>Type</th><th>Title</th><th>Status</th><th>Priority</th><th>Assignee</th>
            <th>Labels</th><th>Parent</th><th>Updated</th></tr></thead>
          <tbody id="item-rows"></tbody>
        </table>
      </div>
      <button class="btn btn-outline-secondary btn-sm d-none" id="btn-more">Load more</button>`;

    const state = { key, filter, loaded: 0 };
    ProjectView.append(main, state, page);

    main.querySelector('#btn-new').addEventListener('click', () => ItemForm.open({ project: key }));
    main.querySelector('#btn-more').addEventListener('click', async () => {
      try {
        const next = await Api.items({ ...filter, project: key, limit: PAGE_SIZE, offset: state.loaded });
        if (App.isCurrent(seq)) ProjectView.append(main, state, next);
      } catch (e) { App.error(e); }
    });
    ProjectView.bindFilters(main, key);
  },

  append(main, state, page) {
    main.querySelector('#item-rows').insertAdjacentHTML('beforeend', page.data.map(ProjectView.rowHtml).join(''));
    state.loaded += page.data.length;
    main.querySelector('#item-count').textContent = page.total
      ? `Showing ${state.loaded} of ${page.total} items`
      : 'No items match these filters.';
    main.querySelector('#btn-more').classList.toggle('d-none', !page.hasMore);
  },

  rowHtml(i) {
    const href = `#/i/${U.esc(i.id)}`;
    return `<tr data-href="${href}">
      <td class="col-id"><a href="${href}">${U.esc(i.id)}</a></td>
      <td class="small">${U.esc(i.type)}</td>
      <td class="col-title">${U.esc(i.title)}</td>
      <td>${U.statusBadge(i.status)}</td>
      <td class="small">${U.priority(i.priority)}</td>
      <td class="small">${U.esc(i.assignee || '')}</td>
      <td>${U.labels(i.labels)}</td>
      <td class="col-id">${i.parent ? `<a href="#/i/${U.esc(i.parent)}">${U.esc(i.parent)}</a>` : ''}</td>
      <td class="small text-nowrap text-body-secondary">${U.esc(U.date(i.updatedAt))}</td>
    </tr>`;
  },

  // "open" is offered as a pseudo-status: it maps to the API's open=true filter
  filtersHtml(f, key) {
    const status = f.open === 'true' ? 'open' : (f.status || '');
    const statusOptions = `<option value="">any status</option><option value="open"${status === 'open' ? ' selected' : ''}>open</option>`
      + U.options(App.meta.statuses, status);
    const assignees = U.options(['none', ...App.userNames()], f.assignee || '', { empty: 'any assignee' });
    return `
      <form class="filters row g-2 align-items-end mb-3" id="filters">
        <div class="col-auto"><select class="form-select form-select-sm" name="type" aria-label="Type">${U.options(App.meta.types, f.type || '', { empty: 'any type' })}</select></div>
        <div class="col-auto"><select class="form-select form-select-sm" name="status" aria-label="Status">${statusOptions}</select></div>
        <div class="col-auto"><select class="form-select form-select-sm" name="priority" aria-label="Priority">${U.options(App.meta.priorities, f.priority || '', { empty: 'any priority' })}</select></div>
        <div class="col-auto"><select class="form-select form-select-sm" name="assignee" aria-label="Assignee">${assignees}</select></div>
        <div class="col-auto"><input class="form-control form-control-sm" name="label" placeholder="label" value="${U.esc(f.label || '')}" aria-label="Label"></div>
        <div class="col-auto"><input class="form-control form-control-sm" name="parent" placeholder="parent id or none" value="${U.esc(f.parent || '')}" aria-label="Parent"></div>
        <div class="col-auto"><input class="form-control form-control-sm" name="q" placeholder="search text" value="${U.esc(f.q || '')}" aria-label="Search"></div>
        <div class="col-auto"><button class="btn btn-sm btn-outline-primary" type="submit">Apply</button>
          <a class="btn btn-sm btn-link" href="#/p/${U.esc(encodeURIComponent(key))}">Clear</a></div>
      </form>`;
  },

  bindFilters(main, key) {
    const form = main.querySelector('#filters');
    const apply = () => {
      const data = Object.fromEntries(new FormData(form));
      const query = { ...data, open: data.status === 'open' ? 'true' : '' };
      if (data.status === 'open') query.status = '';
      location.hash = `#/p/${encodeURIComponent(key)}${U.query(query)}`;
    };
    form.addEventListener('submit', e => { e.preventDefault(); apply(); });
    form.querySelectorAll('select').forEach(s => s.addEventListener('change', apply));
  },
};
