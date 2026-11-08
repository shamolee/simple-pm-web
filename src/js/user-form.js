// "New user" dialog (markup in index.html), opened by the + next to the user picker.
// The API lowercases and validates the name; creating an existing name just returns that user.
'use strict';

const UserForm = {
  modal: null,

  init() {
    const el = document.getElementById('new-user');
    UserForm.modal = new bootstrap.Modal(el);
    el.addEventListener('shown.bs.modal', () => document.getElementById('nu-name').focus());
    document.getElementById('btn-new-user').addEventListener('click', UserForm.open);
    document.getElementById('nu-name').addEventListener('input', e => e.target.classList.remove('is-invalid'));
    document.getElementById('new-user-form').addEventListener('submit', e => { e.preventDefault(); UserForm.submit(); });
  },

  open() {
    document.getElementById('new-user-form').reset();
    document.getElementById('nu-name').classList.remove('is-invalid');
    UserForm.modal.show();
  },

  async submit() {
    const input = document.getElementById('nu-name');
    input.value = input.value.trim().toLowerCase();
    if (!input.checkValidity()) { input.classList.add('is-invalid'); input.focus(); return; }
    const existed = App.userNames().includes(input.value);
    try {
      const user = await Api.createUser(input.value);
      App.users = await Api.users();
      UserForm.modal.hide();
      App.setUser(user.name);
      App.alert(existed ? `User ${user.name} already existed; now acting as ${user.name}.` : `User ${user.name} created; now acting as ${user.name}.`);
    } catch (e) { App.error(e); }
  },
};
