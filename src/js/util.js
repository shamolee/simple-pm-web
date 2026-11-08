// Small helpers shared by all views: HTML escaping, formatting, badges and hash-route parsing.
'use strict';

const U = {
  esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  // escaped text with KEY-N item ids turned into links
  richText(text) {
    return U.esc(text).replace(/\b([A-Z][A-Z0-9]{1,9}-\d+)\b/g, '<a href="#/i/$1">$1</a>');
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
    return `<span class="badge st-${U.esc(status)}">${U.esc(U.label(status))}</span>`;
  },

  priority(priority) {
    return `<span class="pr-${U.esc(priority)}">${U.esc(priority)}</span>`;
  },

  labels(labels) {
    return (labels || []).map(l => `<span class="badge text-bg-light border label-chip">${U.esc(l)}</span>`).join('');
  },

  options(values, selected, { empty } = {}) {
    const head = empty === undefined ? '' : `<option value="">${U.esc(empty)}</option>`;
    return head + values.map(v =>
      `<option value="${U.esc(v)}"${v === selected ? ' selected' : ''}>${U.esc(U.label(v))}</option>`).join('');
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
