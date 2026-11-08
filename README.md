# simple-pm-web

A small browser UI for the simple-pm API: projects, a filterable item list, item details with children and
comments, editing and creating items. Plain HTML, CSS and JavaScript with Bootstrap 5.3.3 (stored in
`src/vendor`, so it works without internet). No build step and no Node.

## How it's served

The API serves this folder at **`/app/`** when its `WebApp:Path` setting points at it (`GET /` stays the API's
self-description). The app calls the API on the same origin, so no CORS is needed.

```
dotnet run --project ..\simple-pm-api\src\SimplePm.Api --WebApp:Path=..\..\..\simple-pm-web\src   # dev: http://localhost:5080/app/
```

## Identity

There are no passwords. Pick a user in "Acting as" (top right); it's sent as `X-User` on writes and remembered
in the browser. With "(read-only)" the app only reads. The **+** next to the picker creates a user (lowercase `a-z 0-9 _ . -`, up to 40
characters) and switches to it; creating a name that already exists just switches to it. There are no delete buttons: deleting is irreversible on
shared data, so it stays a deliberate `pm` command.

## Files

| File | Purpose |
|---|---|
| `src/index.html` | Shell: navbar, user picker, main area, "New item" dialog |
| `src/css/app.css` | Additions to Bootstrap (status and priority colours, table tweaks) |
| `src/js/util.js` | `h()` DOM builder, formatting, badges, hash parsing |
| `src/js/api.js` | REST client (`X-User`, `{"error"}` handling, paging) |
| `src/js/app.js` | Startup, user picker, alerts, breadcrumbs, router |
| `src/js/projects.js` | `#/` projects with counts |
| `src/js/project.js` | `#/p/KEY?filters` item list with filters in the URL |
| `src/js/item.js` | `#/i/KEY-N` item detail and edit form |
| `src/js/item-form.js` | "New item" dialog |
| `src/js/user-form.js` | "New user" dialog (the **+** next to "Acting as") |
