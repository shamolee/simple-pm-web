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
      main.innerHTML = '<p class="text-body-secondary">No projects yet. Create one with <code>pm project add KEY "Name"</code>.</p>';
      return;
    }

    const rows = projects.map((p, i) => {
      const s = stats[i];
      const open = OPEN_STATUSES.reduce((sum, st) => sum + (s.byStatus[st] || 0), 0);
      const inProgress = s.byStatus.in_progress || 0;
      return `<tr data-href="#/p/${U.esc(p.key)}?open=true">
        <td class="fw-semibold"><a href="#/p/${U.esc(p.key)}?open=true">${U.esc(p.key)}</a></td>
        <td>${U.esc(p.name)}<div class="small text-body-secondary">${U.esc(p.description)}</div></td>
        <td class="text-end">${open}</td>
        <td class="text-end">${inProgress}</td>
        <td class="text-end">${s.byStatus.done || 0}</td>
        <td class="text-end">${s.total}</td>
      </tr>`;
    }).join('');

    main.innerHTML = `
      <h1 class="h4 mb-3">Projects</h1>
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead><tr><th>Key</th><th>Name</th><th class="text-end">Open</th><th class="text-end">In progress</th>
            <th class="text-end">Done</th><th class="text-end">Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },
};
