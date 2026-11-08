// Item view: description, children, comments, and an edit form that PATCHes only the fields that changed.
'use strict';

const ItemView = {
  async render(main, seq, id) {
    const item = await Api.item(id);
    const [children, comments] = await Promise.all([
      Api.all('/items', { parent: item.id }),
      Api.comments(item.id),
    ]);
    if (!App.isCurrent(seq)) return;

    App.crumbs([[item.project, `#/p/${encodeURIComponent(item.project)}?open=true`], [item.id, null]]);
    const ro = App.canWrite() ? '' : 'disabled';
    main.innerHTML = `
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="text-body-secondary small mb-1">${U.esc(item.type)} · ${U.esc(item.id)} · reported by ${U.esc(item.reporter)} · created ${U.esc(U.date(item.createdAt))}</div>
          <h1 class="h4">${U.esc(item.title)} ${U.statusBadge(item.status)}</h1>
          ${item.parent ? `<div class="mb-2 small">Parent: <a href="#/i/${U.esc(item.parent)}">${U.esc(item.parent)}</a></div>` : ''}
          <div class="card mb-4"><div class="card-body text-pre">${item.description ? U.richText(item.description) : '<span class="text-body-secondary">No description.</span>'}</div></div>

          <div class="d-flex align-items-center mb-2">
            <h2 class="h6 mb-0 me-auto">Children (${children.length})</h2>
            <button class="btn btn-outline-primary btn-sm" id="btn-child" ${ro}>Add child</button>
          </div>
          ${ItemView.childrenHtml(children)}

          <h2 class="h6 mt-4">Comments (${comments.length})</h2>
          <div class="mb-3">${comments.map(ItemView.commentHtml).join('') || '<p class="text-body-secondary small">No comments yet.</p>'}</div>
          <form id="comment-form">
            <label class="form-label visually-hidden" for="comment-body">Comment</label>
            <textarea class="form-control mb-2" id="comment-body" rows="3" placeholder="${App.canWrite() ? 'Write a comment' : 'Pick a user to comment'}" required ${ro}></textarea>
            <button class="btn btn-primary btn-sm" type="submit" ${ro}>Comment</button>
          </form>
        </div>
        <div class="col-lg-4">${ItemView.formHtml(item, ro)}</div>
      </div>`;

    main.querySelector('#btn-child').addEventListener('click', () =>
      ItemForm.open({ project: item.project, parent: item.id }));
    main.querySelector('#comment-form').addEventListener('submit', async e => {
      e.preventDefault();
      const body = main.querySelector('#comment-body').value.trim();
      if (!body) return;
      try {
        await Api.addComment(item.id, body);
        App.route();
      } catch (err) { App.error(err); }
    });
    main.querySelector('#edit-form').addEventListener('submit', e => { e.preventDefault(); ItemView.save(item, e.target); });
  },

  childrenHtml(children) {
    if (!children.length) return '<p class="text-body-secondary small">No children.</p>';
    return `<div class="table-responsive"><table class="table table-hover table-sm items-table mb-0"><tbody>${
      children.map(c => `<tr data-href="#/i/${U.esc(c.id)}">
        <td class="col-id"><a href="#/i/${U.esc(c.id)}">${U.esc(c.id)}</a></td>
        <td class="small">${U.esc(c.type)}</td><td class="col-title">${U.esc(c.title)}</td>
        <td>${U.statusBadge(c.status)}</td><td class="small">${U.esc(c.assignee || '')}</td></tr>`).join('')
    }</tbody></table></div>`;
  },

  commentHtml(c) {
    return `<div class="comment py-2">
      <div class="small text-body-secondary"><strong class="text-body">${U.esc(c.author)}</strong> · ${U.esc(U.date(c.createdAt))}</div>
      <div class="text-pre">${U.richText(c.body)}</div>
    </div>`;
  },

  formHtml(item, ro) {
    const sel = (name, values, value, empty) =>
      `<select class="form-select form-select-sm" id="ef-${name}" name="${name}" ${ro}>${U.options(values, value, empty === undefined ? {} : { empty })}</select>`;
    return `
      <form class="card" id="edit-form"><div class="card-body">
        <h2 class="h6">Details</h2>
        <div class="mb-2"><label class="form-label small" for="ef-title">Title</label>
          <input class="form-control form-control-sm" id="ef-title" name="title" value="${U.esc(item.title)}" required ${ro}></div>
        <div class="row g-2 mb-2">
          <div class="col-6"><label class="form-label small" for="ef-status">Status</label>${sel('status', App.meta.statuses, item.status)}</div>
          <div class="col-6"><label class="form-label small" for="ef-priority">Priority</label>${sel('priority', App.meta.priorities, item.priority)}</div>
          <div class="col-6"><label class="form-label small" for="ef-type">Type</label>${sel('type', App.meta.types, item.type)}</div>
          <div class="col-6"><label class="form-label small" for="ef-assignee">Assignee</label>${sel('assignee', App.userNames(), item.assignee || '', '(none)')}</div>
        </div>
        <div class="mb-2"><label class="form-label small" for="ef-parent">Parent</label>
          <input class="form-control form-control-sm" id="ef-parent" name="parent" value="${U.esc(item.parent || '')}" ${ro}></div>
        <div class="mb-2"><label class="form-label small" for="ef-labels">Labels</label>
          <input class="form-control form-control-sm" id="ef-labels" name="labels" value="${U.esc((item.labels || []).join(', '))}" ${ro}></div>
        <div class="mb-3"><label class="form-label small" for="ef-description">Description</label>
          <textarea class="form-control form-control-sm" id="ef-description" name="description" rows="8" ${ro}>${U.esc(item.description)}</textarea></div>
        <button class="btn btn-primary btn-sm" type="submit" ${ro}>Save</button>
        <div class="small text-body-secondary mt-2">Updated ${U.esc(U.date(item.updatedAt))}</div>
      </div></form>`;
  },

  async save(item, form) {
    const d = Object.fromEntries(new FormData(form));
    d.description = d.description.replace(/\r\n/g, '\n');
    const labels = U.splitLabels(d.labels);
    const patch = {};
    for (const f of ['title', 'status', 'priority', 'type', 'description']) {
      if (d[f] !== (item[f] || '').replace(/\r\n/g, '\n')) patch[f] = d[f];
    }
    if (d.assignee !== (item.assignee || '')) patch.assignee = d.assignee; // '' clears
    if (d.parent.trim() !== (item.parent || '')) patch.parent = d.parent.trim(); // '' clears
    if (labels.join(',') !== (item.labels || []).join(',')) patch.labels = labels;
    if (!Object.keys(patch).length) { App.alert('Nothing changed.', 'secondary'); return; }
    try {
      await Api.updateItem(item.id, patch);
      await App.route();
      App.alert(`${item.id} saved.`);
    } catch (e) { App.error(e); }
  },
};
