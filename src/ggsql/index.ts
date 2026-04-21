import init, { GgsqlContext } from "ggsql-wasm";

export interface SqlResult {
  columns: string[];
  rows: string[][];
  total_rows: number;
  truncated: boolean;
}

let initPromise: Promise<Ggsql> | null = null;

export function initGgsql(wasmUrl?: string): Promise<Ggsql> {
  if (!initPromise) {
    initPromise = (async () => {
      // When wasmUrl is omitted, wasm-bindgen resolves
      // `new URL('ggsql_wasm_bg.wasm', import.meta.url)`, which Vite rewrites
      // to the hashed asset URL. That's the default path.
      await init(wasmUrl);
      const ctx = new GgsqlContext();
      await ctx.register_builtin_datasets();
      return new Ggsql(ctx);
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
