# Bar Orders

Offline order-tracking PWA for a bar, designed for a single iPad in landscape mode.
Not a POS / eKasa / payment system — internal order tracking and per-table totals only.

## Features

- **Indoor / Outdoor** floor plans with freely arrangeable table cards
- **Normal mode**: tap a table → order screen (tables can't move accidentally)
- **Edit layout mode**: add, drag, rename, delete (empty) tables
- **Orders**: tap products to add, +/− quantities, per-table total, two-tap "Mark as paid"
- **Menu**: product CRUD with categories (Beer, Soft drinks, Spirits, Food, Other)
- **Summary**: revenue + paid-order history per day, CSV export
- **Fully offline**: all data in IndexedDB on the iPad, service worker caches the app

## Development

Requires Node.js 20+ (this machine has it in `~/.local/node/bin`).

```sh
export PATH="$HOME/.local/node/bin:$PATH"   # if node isn't on PATH
npm install
npm run dev        # dev server
npm run build      # production build → dist/
npm run icons      # regenerate PWA icons (public/icons)
```

## Deploying to the iPad

iOS Safari only registers the offline service worker over **HTTPS** (plain HTTP on
LAN will load the app but it won't work offline). The simplest zero-cert-warning path:

1. Host the `dist/` folder on any free static host with HTTPS
   (GitHub Pages, Netlify Drop — drag & drop `dist/`, done).
2. On the iPad, open the URL in Safari once.
3. Share button → **Add to Home Screen**.
4. Launch from the home screen icon — from now on it runs fully offline,
   full-screen, and keeps all data locally on the iPad.

Updates: redeploy `dist/`, then open the app once while online — the service
worker updates itself automatically.

## Data & storage notes

- All state (tables, layout, menu, open orders, paid history) lives in a single
  IndexedDB record on the device. No backend, no accounts, no sync.
- Writes are debounced and flushed when the app is backgrounded, so data survives
  Safari suspending the PWA.
- **Important iOS quirk**: if the app is *never opened for many weeks*, iOS may
  reclaim its website data. Opening the app regularly (daily bar use) keeps it safe.
  Export CSV periodically if the history matters long-term.
