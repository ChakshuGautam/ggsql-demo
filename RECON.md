# Phase 0 — Recon findings

Recorded 2026-04-21 during the handover from local Mac to the egov server.
Copied verbatim from the original handover doc so it travels with the repo.

## 1. No official npm package

`npm view ggsql` returns an unrelated package (JSON→MSSQL converter by
`burakgazi`). `@posit/ggsql`, `ggsql-wasm`, `@ggsql/wasm` all 404. ggsql
is not on any npm/crates registry as of alpha v0.2.7.

## 2. Repo ships a `ggsql-wasm/` crate

`github.com/posit-dev/ggsql/ggsql-wasm/`:

```bash
cd ggsql-wasm && ./build-wasm.sh
```

runs `wasm-pack build --target web --profile wasm --no-opt` then
`wasm-opt -Oz`. Output: `ggsql-wasm/pkg/{ggsql_wasm_bg.wasm,
ggsql_wasm.js, ggsql_wasm.d.ts, snippets/}`. A demo bundle copies it into
`doc/wasm/` which is what <https://ggsql.org/wasm/> serves.

## 3. ggsql-wasm uses SQLite, not DuckDB

`ggsql-wasm/Cargo.toml` pulls:

```toml
ggsql = { features = ["vegalite", "sqlite", "builtin-data"] }
# target wasm32:
sqlite-wasm-rs = "0.5.2"
```

The `GgsqlContext` owns an in-memory SQLite VFS compiled to wasm32. Parquet
ingestion uses the polars/hyparquet pipeline from ggsql-wasm's companion JS
library.

**Consequence**: DuckDB-WASM in the browser would be redundant. The project
spec originally planned to use DuckDB-WASM for data loading but Phase 0
concluded that ggsql-wasm already embeds everything needed. This app uses
ggsql-wasm as the single data engine.

## 4. Public WASM API

From `ggsql-wasm/src/lib.rs`:

```ts
import init, { GgsqlContext } from "ggsql-wasm";
await init();
const ctx = new GgsqlContext();
await ctx.register_builtin_datasets();          // registers ggsql:penguins, ggsql:airquality
await ctx.register_parquet("astronauts", u8arr); // Uint8Array
ctx.register_csv(name, u8arr);                   // sync
const vegaLiteJson = ctx.execute(query);         // → string (VegaLite JSON spec)
const resultJson   = ctx.execute_sql(query);     // → {columns, rows, total_rows, truncated}
ctx.has_visual(query); ctx.list_tables(); ctx.unregister(name);
```

`GgsqlContext` is `new()` — persistent; reuse across queries. `execute` and
`execute_sql` are sync; `register_parquet` and `register_builtin_datasets`
are async.

## 5. Upstream playground

<https://ggsql.org/wasm/> serves `ggsql_wasm_bg.wasm` at **10,328,000
bytes (~9.85 MB)**. Our locally-built + `wasm-opt`'d binary is ~12 MB;
the difference is attributable to a newer `wasm-opt` version upstream
(they use `--all-features` which our local `binaryen` 108 doesn't support).

The playground's `bundle.js` is a Quarto-embedded monolith (Monaco + vega-embed
+ app code) — not cleanly extractable.

## 6. Builtin datasets

`ctx.register_builtin_datasets()` registers **`ggsql:penguins`** and
**`ggsql:airquality`**. **Astronauts is NOT a builtin** — the ggsql blog
post uses a separately-hosted parquet. We swapped the spec's astronauts
examples for penguins variants to keep the demo fully self-contained.

## 7. Build gotchas discovered during Phase 1

- `ggsql/Cargo.toml` lists `ggsql-python` as a workspace member but the
  `ggsql-python/` directory is not present in the git tree. Drop it from
  `workspace.members` to make cargo parse the manifest.
- wasm-pack needs `tree-sitter-cli` on PATH (for `tree-sitter-ggsql`'s
  build.rs). `npm install -g tree-sitter-cli`.
- The `cc-rs` crate invokes `llvm-ar` during sqlite-wasm-rs compilation.
  Install `llvm` (gives you `/usr/bin/llvm-ar`) and export
  `AR_wasm32_unknown_unknown=/usr/bin/llvm-ar` (plus
  `CC_wasm32_unknown_unknown=/usr/bin/clang`).
- `ggsql-wasm/library/dist/lib.js` is `include_str!`'d into the Rust crate.
  Run `(cd ggsql-wasm/library && npm install && npm run build)` before
  `wasm-pack build`, or use the bundled `build-wasm.sh`.
- `ggsql-wasm/pkg/package.json`'s `files` list omits `snippets/`. Add
  `"snippets"` to `files` or pnpm/npm will drop the JS helper at install
  time and the wasm crate will fail to import at runtime.
- `wasm-opt -Oz` without feature flags fails to validate
  `i32.trunc_sat_f64_s`. On binaryen 108, pass
  `--enable-nontrapping-float-to-int --enable-bulk-memory
  --enable-mutable-globals --enable-sign-ext`. On binaryen ≥121, use
  `--all-features`.

## 8. Decision

Path B (build from Rust source) was the only viable option. No npm package,
and the playground's `bundle.js` was too tangled to vendor cleanly. egov
had the toolchain headroom (49 GB free, 16 cores) that the local Mac
lacked (~480 MiB free root partition).
