# ggsql browser

A fully client-side prototype that runs [ggsql](https://ggsql.org) queries in the
browser, rendering results as Vega-Lite charts. No server, no network calls after
the initial asset load.

**Live demo:** <https://ggsql.preview.egov.theflywheel.in/>

ggsql version: **0.2.7** (alpha, released 2026-04-20).

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Browser (React + Vite SPA)                                   │
│                                                              │
│  ┌─────────────┐                            ┌──────────────┐ │
│  │  Editor /   │─────▶ ggsql-wasm ────────▶ │ vega-embed   │ │
│  │  Dashboard  │       (GgsqlContext)       │ (Vega-Lite)  │ │
│  └─────────────┘       internal SQLite      └──────────────┘ │
│                        + Polars                              │
│                        + builtin datasets                    │
│                        (ggsql:penguins,                      │
│                         ggsql:airquality)                    │
└──────────────────────────────────────────────────────────────┘
```

One data engine. ~12 MB WebAssembly bundle. SQLite is compiled into
ggsql-wasm, so no separate DuckDB-WASM is needed — see RECON.md for the
Phase 0 findings that drove this decision.

## Running locally

This app depends on a locally-built `ggsql-wasm` package at
`../ggsql/ggsql-wasm/pkg/`. You have to build ggsql-wasm from source: there
is no published npm package.

### Prereqs

- Node ≥ 20 and pnpm
- Rust stable + `rustup target add wasm32-unknown-unknown`
- `wasm-pack` (`curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`
  or `cargo install wasm-pack`)
- Clang/LLVM with wasm32 backend (`apt-get install clang lld llvm` on Debian/Ubuntu)
- `tree-sitter-cli` (`npm install -g tree-sitter-cli`)
- `binaryen` (optional, for `wasm-opt`)

Verify: `echo "int main(){return 0;}" | clang -target wasm32-unknown-unknown -c -o /dev/null -x c -`

### Build ggsql-wasm

```bash
cd ..
git clone --depth 1 https://github.com/posit-dev/ggsql.git
cd ggsql

# Work around upstream: ggsql-python is listed in workspace.members but the
# directory isn't committed. Drop it from Cargo.toml's members list.
#   members = [ "tree-sitter-ggsql", "src", "ggsql-jupyter", "ggsql-wasm" ]

# Build the JS helper library that ggsql-wasm embeds via include_str!
(cd ggsql-wasm/library && npm install && npm run build)

# Build the wasm-pack package
cd ggsql-wasm
AR_wasm32_unknown_unknown=/usr/bin/llvm-ar \
CC_wasm32_unknown_unknown=/usr/bin/clang \
  wasm-pack build --target web --profile wasm --no-opt

# (optional) shrink from ~13MB to ~12MB
wasm-opt --enable-nontrapping-float-to-int --enable-bulk-memory \
         --enable-mutable-globals --enable-sign-ext \
         pkg/ggsql_wasm_bg.wasm -o pkg/ggsql_wasm_bg.wasm -Oz

# Upstream's package.json omits `snippets/` from the `files` list — add it,
# otherwise pnpm won't copy the JS helper into node_modules.
# Edit ggsql-wasm/pkg/package.json and add "snippets" to the "files" array.
```

### Build and run the app

```bash
cd ../../ggsql-browser      # (this directory)
pnpm install
pnpm dev                    # http://localhost:5173
pnpm build                  # dist/
pnpm preview                # serve dist/ locally
```

No wasm file needs to be copied manually — `ggsql_wasm.js` resolves the
binary via `new URL('ggsql_wasm_bg.wasm', import.meta.url)`, and Vite rewrites
that to a hashed asset in `dist/assets/` at build time.

## Project layout

```
src/
├── App.tsx            # Header, tab routing, dashboard + editor
├── App.css            # All styles
├── components/
│   └── Chart.tsx      # ggsql-wasm → vega-embed, 300ms debounce, error handling
├── ggsql/
│   └── index.ts       # Thin typed wrapper over GgsqlContext
└── queries.ts         # Preset ggsql queries for dashboard + editor
```

## Features

- **Dashboard** — 2×2 grid, four ggsql queries on `ggsql:penguins`:
  scatter+smooth, stacked bar, boxplot, histogram.
- **Editor** — textarea + live chart, 300 ms debounce, reset button, preset loader.
- **Ready indicator** — shows "Loading…" until ggsql-wasm has initialised,
  then "Ready · tables: ..." with the list of registered tables.
- **Error handling** — parse or runtime errors render in a `<pre>` inside
  the chart area; the app does not crash.

## Known limits

- WASM bundle is ~12 MB (~3.3 MB gzip). First paint is bound by that
  download. The spec budgeted 10 MB (§13.3); we overshot by ~20%. Upstream
  ships 9.85 MB because they use a newer `wasm-opt`. No action needed for a
  prototype.
- ggsql is alpha; VISUALIZE/DRAW syntax can change, and some Vega-Lite
  specs emit harmless warnings (`x-scale's "zero" is dropped…`,
  `y2 dropped as it is incompatible with "point"`). Charts render correctly.
- Astronauts parquet from the blog post is **not** bundled as a builtin. The
  dashboard uses `ggsql:penguins` throughout. To use astronauts, add an
  upload-your-own-Parquet button that calls `ggsql.registerParquet(name, bytes)`.
- No chart interactivity (tooltips, zoom, brush) — intentional non-goal.

## Deployment (current)

Built artifacts are served by nginx at
`ggsql.preview.egov.theflywheel.in` from `/var/www/ggsql-browser/`. Nginx
config: `/etc/nginx/sites-available/ggsql.preview.egov.theflywheel.in`. It
serves `.wasm` with `Content-Type: application/wasm` and immutable caching
on `/assets/*`.

To redeploy after a code change:

```bash
cd ~/repos/ggsql-browser
pnpm build
rm -rf /var/www/ggsql-browser/* && cp -r dist/. /var/www/ggsql-browser/
```
