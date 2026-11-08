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
    const ro = !App.canWrite();
    const commentBody = h('textarea', {
      class: 'form-control mb-2', id: 'comment-body', rows: 3, required: true, disabled: ro,
      placeholder: ro ? 'Pick a user to comment' : 'Write a comment',
    });
    const commentForm = h('form', { onsubmit: e => { e.preventDefault(); ItemView.comment(item, commentBody); } },
      h('label', { class: 'form-label visually-hidden', for: 'comment-body' }, 'Comment'),
      commentBody,
      h('button', { class: 'btn btn-primary btn-sm', type: 'submit', disabled: ro }, 'Comment'));

    main.replaceChildren(h('div', { class: 'row g-4' },
      h('div', { class: 'col-lg-8' },
        h('div', { class: 'text-body-secondary small mb-1' },
          `${item.type} · ${item.id} · reported by ${item.reporter} · created ${U.date(item.createdAt)}`),
        h('h1', { class: 'h4' }, item.title, ' ', U.statusBadge(item.status)),
        item.parent && h('div', { class: 'mb-2 small' }, 'Parent: ', h('a', { href: `#/i/${item.parent}` }, item.parent)),
        h('div', { class: 'card mb-4' }, h('div', { class: 'card-body text-pre' },
          item.description
            ? U.richText(item.description)
            : h('span', { class: 'text-body-secondary' }, 'No description.'))),

        h('div', { class: 'd-flex align-items-center mb-2' },
          h('h2', { class: 'h6 mb-0 me-auto' }, `Children (${children.length})`),
          h('button', {
            class: 'btn btn-outline-primary btn-sm', disabled: ro,
            onclick: () => ItemForm.open({ project: item.project, parent: item.id }),
          }, 'Add child')),
        ItemView.children(children),

        h('h2', { class: 'h6 mt-4' }, `Comments (${comments.length})`),
        h('div', { class: 'mb-3' },
          comments.length ? comments.map(ItemView.commentBlock)
            : h('p', { class: 'text-body-secondary small' }, 'No comments yet.')),
        commentForm),
      h('div', { class: 'col-lg-4' }, ItemView.form(item, ro))));
  },

  async comment(item, textarea) {
    const body = textarea.value.trim();
    if (!body) return;
    try {
      await Api.addComment(item.id, body);
      App.route();
    } catch (err) { App.error(err); }
  },

  children(children) {
    if (!children.length) return h('p', { class: 'text-body-secondary small' }, 'No children.');
    return h('div', { class: 'table-responsive' },
      h('table', { class: 'table table-hover table-sm items-table mb-0' },
        h('tbody', {}, children.map(c => h('tr', { 'data-href': `#/i/${c.id}` },
          h('td', { class: 'col-id' }, h('a', { href: `#/i/${c.id}` }, c.id)),
          h('td', { class: 'small' }, c.type),
          h('td', { class: 'col-title' }, c.title),
          h('td', {}, U.statusBadge(c.status)),
          h('td', { class: 'small' }, c.assignee))))));
  },

  commentBlock(c) {
    return h('div', { class: 'comment py-2' },
      h('div', { class: 'small text-body-secondary' },
        h('strong', { class: 'text-body' }, c.author), ` · ${U.date(c.createdAt)}`),
      h('div', { class: 'text-pre' }, U.richText(c.body)));
  },

  form(item, ro) {
    const field = (name, label, control, cls) =>
      h('div', { class: cls || 'mb-2' }, h('label', { class: 'form-label small', for: `ef-${name}` }, label), control);
    const sel = (name, values, value, empty) =>
      h('select', { class: 'form-select form-select-sm', id: `ef-${name}`, name, disabled: ro },
        U.options(values, value, empty === undefined ? {} : { empty }));
    const input = (name, value, required) =>
      h('input', { class: 'form-control form-control-sm', id: `ef-${name}`, name, value, required, disabled: ro });

    const form = h('form', { class: 'card', onsubmit: e => { e.preventDefault(); ItemView.save(item, form); } },
      h('div', { class: 'card-body' },
        h('h2', { class: 'h6' }, 'Details'),
        field('title', 'Title', input('title', item.title, true)),
        h('div', { class: 'row g-2 mb-2' },
          field('status', 'Status', sel('status', App.meta.statuses, item.status), 'col-6'),
          field('priority', 'Priority', sel('priority', App.meta.priorities, item.priority), 'col-6'),
          field('type', 'Type', sel('type', App.meta.types, item.type), 'col-6'),
          field('assignee', 'Assignee', sel('assignee', App.userNames(), item.assignee || '', '(none)'), 'col-6')),
        field('parent', 'Parent', input('parent', item.parent || '')),
        field('labels', 'Labels', input('labels', (item.labels || []).join(', '))),
        field('description', 'Description',
          h('textarea', { class: 'form-control form-control-sm', id: 'ef-description', name: 'description', rows: 8, disabled: ro },
            item.description), 'mb-3'),
        h('button', { class: 'btn btn-primary btn-sm', type: 'submit', disabled: ro }, 'Save'),
        h('div', { class: 'small text-body-secondary mt-2' }, `Updated ${U.date(item.updatedAt)}`)));
    return form;
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
