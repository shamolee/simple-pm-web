// Client for the simple-pm REST API. The web app is served by the API itself (/app/), so calls are same-origin.
// Writes send the chosen user in the X-User header; errors arrive as {"error": "..."}.
'use strict';

const Api = {
  user: '',

  async request(method, path, body) {
    const headers = { Accept: 'application/json' };
    if (Api.user) headers['X-User'] = Api.user;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let res;
    try {
      res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) {
      throw new Error('The simple-pm API is unreachable (' + e.message + ')');
    }
    if (res.status === 204) return null;

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* not JSON: reported below */ }
    if (!res.ok) throw new Error((data && data.error) || `${res.status} ${res.statusText}`);
    if (text && data === null) throw new Error(`Unexpected response from ${path}`);
    return data;
  },

  get: (path, params) => Api.request('GET', path + U.query(params)),
  post: (path, body) => Api.request('POST', path, body),
  patch: (path, body) => Api.request('PATCH', path, body),

  // follows hasMore until every page is loaded (for small lists such as users and projects)
  async all(path, params) {
    const rows = [];
    let offset = 0;
    for (;;) {
      const page = await Api.get(path, { ...params, limit: 1000, offset });
      rows.push(...page.data);
      if (!page.hasMore) return rows;
      offset = page.offset + page.limit;
    }
  },

  root: () => Api.get('/'),
  users: () => Api.all('/users'),
  createUser: name => Api.post('/users', { name }), // idempotent: an existing name returns that user
  projects: () => Api.all('/projects'),
  project: key => Api.get(`/projects/${encodeURIComponent(key)}`),
  stats: key => Api.get(`/projects/${encodeURIComponent(key)}/stats`),
  items: params => Api.get('/items', params),
  item: id => Api.get(`/items/${encodeURIComponent(id)}`),
  createItem: (key, body) => Api.post(`/projects/${encodeURIComponent(key)}/items`, body),
  updateItem: (id, body) => Api.patch(`/items/${encodeURIComponent(id)}`, body),
  comments: id => Api.all(`/items/${encodeURIComponent(id)}/comments`),
  addComment: (id, text) => Api.post(`/items/${encodeURIComponent(id)}/comments`, { body: text }),
};
