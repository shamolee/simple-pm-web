// "New item" dialog (markup in index.html). Opened with a project and optionally a parent.
'use strict';

const ItemForm = {
  modal: null,
  project: '',

  init() {
    const el = document.getElementById('new-item');
    ItemForm.modal = new bootstrap.Modal(el);
    el.addEventListener('shown.bs.modal', () => document.getElementById('ni-title').focus());
    document.getElementById('new-item-form').addEventListener('submit', e => { e.preventDefault(); ItemForm.submit(); });
  },

  open({ project, parent = '' }) {
    const form = document.getElementById('new-item-form');
    form.reset();
    ItemForm.project = project;
    document.getElementById('ni-type').replaceChildren(...U.options(App.meta.types, parent ? 'task' : 'story'));
    document.getElementById('ni-priority').replaceChildren(...U.options(App.meta.priorities, 'medium'));
    document.getElementById('ni-assignee').replaceChildren(...U.options(App.userNames(), '', { empty: '(none)' }));
    document.getElementById('ni-parent').value = parent;
    document.getElementById('ni-project').textContent = `Project ${project}`;
    ItemForm.modal.show();
  },

  async submit() {
    const d = Object.fromEntries(new FormData(document.getElementById('new-item-form')));
    if (!d.title.trim()) { document.getElementById('ni-title').focus(); return; }
    const body = {
      title: d.title.trim(),
      type: d.type,
      priority: d.priority,
      description: d.description,
      labels: U.splitLabels(d.labels),
    };
    if (d.assignee) body.assignee = d.assignee;
    if (d.parent.trim()) body.parent = d.parent.trim();
    try {
      const item = await Api.createItem(ItemForm.project, body);
      ItemForm.modal.hide();
      location.hash = `#/i/${encodeURIComponent(item.id)}`;
      App.alert(`${item.id} created.`);
    } catch (e) { App.error(e); }
  },
};
