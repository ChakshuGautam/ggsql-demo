import init, { GgsqlContext } from "ggsql-wasm";
import { EXTRA_DATASETS, fetchAsCsv } from "../datasets";

export interface SqlResult {
  columns: string[];
  rows: string[][];
  total_rows: number;
  truncated: boolean;
}

let initPromise: Promise<Ggsql> | null = null;

export interface DatasetLoadEvent {
  name: string;
  status: "loading" | "ready" | "error";
  error?: string;
}

export function initGgsql(
  wasmUrl?: string,
  onDataset?: (e: DatasetLoadEvent) => void,
): Promise<Ggsql> {
  if (!initPromise) {
    initPromise = (async () => {
      // When wasmUrl is omitted, wasm-bindgen resolves
      // `new URL('ggsql_wasm_bg.wasm', import.meta.url)`, which Vite rewrites
      // to the hashed asset URL. That's the default path.
      await init(wasmUrl);
      const ctx = new GgsqlContext();
      await ctx.register_builtin_datasets();
      const g = new Ggsql(ctx);

      // Fetch and register extra OSS datasets in the background. Failures are
      // non-fatal so the app is still usable on a flaky network.
      for (const d of EXTRA_DATASETS) {
        onDataset?.({ name: d.name, status: "loading" });
        fetchAsCsv(d)
          .then((bytes) => {
            g.registerCsv(d.name, bytes);
            onDataset?.({ name: d.name, status: "ready" });
          })
          .catch((e: unknown) => {
            onDataset?.({
              name: d.name,
              status: "error",
              error: String((e as Error).message ?? e),
            });
          });
      }

      return g;
    })();
  }
  return initPromise;
}

export class Ggsql {
  private ctx: GgsqlContext;
  constructor(ctx: GgsqlContext) {
    this.ctx = ctx;
  }

  execute(query: string): unknown {
    const json = this.ctx.execute(query);
    return JSON.parse(json);
  }

  executeSql(query: string): SqlResult {
    return JSON.parse(this.ctx.execute_sql(query));
  }

  hasVisual(q: string): boolean {
    return this.ctx.has_visual(q);
  }

  async registerParquet(name: string, bytes: Uint8Array): Promise<void> {
    await this.ctx.register_parquet(name, bytes);
  }

  registerCsv(name: string, bytes: Uint8Array): void {
    this.ctx.register_csv(name, bytes);
  }

  listTables(): string[] {
    return Array.from(this.ctx.list_tables());
  }
}
