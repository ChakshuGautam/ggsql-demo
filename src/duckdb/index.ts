import * as duckdb from "@duckdb/duckdb-wasm";
import { EXTRA_DATASETS, fetchAsCsv } from "../datasets";

type ArrowResult = {
  schema: { fields: { name: string }[] };
  numRows: number;
  getChild: (name: string) => { get: (i: number) => unknown } | null;
};

export interface DuckResult {
  columns: string[];
  rows: (string | number | bigint | boolean | null)[][];
  rowCount: number;
  elapsedMs: number;
}

let initPromise: Promise<Duck> | null = null;

export class Duck {
  private db: duckdb.AsyncDuckDB;
  public loadedTables: string[];
  constructor(db: duckdb.AsyncDuckDB, loadedTables: string[]) {
    this.db = db;
    this.loadedTables = loadedTables;
  }

  async query(sql: string): Promise<DuckResult> {
    const t0 = performance.now();
    const conn = await this.db.connect();
    try {
      const arrow = (await conn.query(sql)) as unknown as ArrowResult;
      const columns = arrow.schema.fields.map((f) => f.name);
      const rows: DuckResult["rows"] = [];
      for (let i = 0; i < arrow.numRows; i++) {
        const row: DuckResult["rows"][number] = [];
        for (const col of columns) {
          const v = arrow.getChild(col)?.get(i);
          row.push(serializeCell(v));
        }
        rows.push(row);
      }
      return {
        columns,
        rows,
        rowCount: arrow.numRows,
        elapsedMs: performance.now() - t0,
      };
    } finally {
      await conn.close();
    }
  }

  async registerTableFromCsvBytes(name: string, bytes: Uint8Array) {
    await this.db.registerFileBuffer(`${name}.csv`, bytes);
    const conn = await this.db.connect();
    try {
      await conn.query(
        `CREATE OR REPLACE TABLE "${name}" AS SELECT * FROM read_csv_auto('${name}.csv', HEADER=TRUE, SAMPLE_SIZE=-1)`,
      );
    } finally {
      await conn.close();
    }
  }

  listTables(): string[] {
    return [...this.loadedTables];
  }
}

function serializeCell(v: unknown): string | number | bigint | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return v;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace("T", " ");
  if (typeof v === "string") return v;
  return String(v);
}

export function initDuck(
  onDataset?: (e: { name: string; status: "loading" | "ready" | "error"; error?: string }) => void,
): Promise<Duck> {
  if (!initPromise) {
    initPromise = (async () => {
      const bundles = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(bundles);
      const workerBlob = new Blob(
        [`importScripts("${bundle.mainWorker!}");`],
        { type: "text/javascript" },
      );
      const workerUrl = URL.createObjectURL(workerBlob);
      const worker = new Worker(workerUrl);
      const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      URL.revokeObjectURL(workerUrl);

      const loaded: string[] = [];
      const duck = new Duck(db, loaded);

      for (const d of EXTRA_DATASETS) {
        onDataset?.({ name: d.name, status: "loading" });
        fetchAsCsv(d)
          .then(async (bytes) => {
            await duck.registerTableFromCsvBytes(d.name, bytes);
            loaded.push(d.name);
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

      return duck;
    })();
  }
  return initPromise;
}
