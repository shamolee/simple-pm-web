// Small helpers shared by all views: the DOM builder h(), formatting, badges and hash-route parsing.
'use strict';

// h('a', { class: 'x', href: '#/p', onclick: fn }, 'text', child, [more])
// Builds a real element. Strings become text nodes (never parsed as HTML), so values need no escaping.
// null / undefined / false attributes and children are skipped; true gives a bare attribute (disabled).
// Attributes named onXxx are event listeners.
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs || {})) {
    if (value === false || value === null || value === undefined) continue;
    if (name.startsWith('on')) el.addEventListener(name.slice(2), value);
    else el.setAttribute(name, value === true ? '' : value);
  }
  el.append(...children.flat(Infinity).filter(c => c !== null && c !== undefined && c !== false));
  return el;
}

const U = {
  // text with KEY-N item ids turned into links; returns an array of strings and <a> elements
  richText(text) {
    return String(text ?? '').split(/\b([A-Z][A-Z0-9]{1,9}-\d+)\b/).map((part, i) =>
      i % 2 ? h('a', { href: `#/i/${part}` }, part) : part);
  },

  label(enumValue) {
    return String(enumValue ?? '').replace(/_/g, ' ');
  },

  date(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  statusBadge(status) {
    return h('span', { class: `badge st-${status}` }, U.label(status));
  },

  priority(priority) {
    return h('span', { class: `pr-${priority}` }, priority);
  },

  // an array of chips, ready to spread into h()
  labels(labels) {
    return (labels || []).map(l => h('span', { class: 'badge text-bg-light border label-chip' }, l));
  },

  // an array of <option> elements, ready to spread into h() or replaceChildren()
  options(values, selected, { empty } = {}) {
    const head = empty === undefined ? [] : [h('option', { value: '' }, empty)];
    return head.concat(values.map(v => h('option', { value: v, selected: v === selected }, U.label(v))));
  },

  splitLabels(text) {
    return String(text || '').split(',').map(s => s.trim()).filter(Boolean);
  },

  // "#/p/DSE?status=todo" -> { parts: ['p', 'DSE'], query: { status: 'todo' } }
  parseHash(hash) {
    const raw = (hash || '').replace(/^#\/?/, '');
    const [path, search] = raw.split('?');
    const query = Object.fromEntries(new URLSearchParams(search || ''));
    return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query };
  },

  query(params) {
    const clean = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false);
    return clean.length ? '?' + new URLSearchParams(clean).toString() : '';
  },
};
