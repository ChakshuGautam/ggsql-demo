import { useEffect, useState } from "react";
import type { Duck, DuckResult } from "../duckdb";

interface Props {
  duck: Duck;
  name: string;
  pageSize?: number;
}

export function DuckTable({ duck, name, pageSize = 25 }: Props) {
  const [result, setResult] = useState<DuckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
    setError(null);
    setResult(null);
    duck
      .query(`SELECT * FROM "${name}" LIMIT 500`)
      .then(setResult)
      .catch((e: unknown) => setError(String((e as Error).message ?? e)));
  }, [duck, name]);

  if (error) return <pre className="chart-error">{error}</pre>;
  if (!result) return <p className="loading-msg">Loading {name}…</p>;

  const start = page * pageSize;
  const end = Math.min(start + pageSize, result.rows.length);
  const pageRows = result.rows.slice(start, end);
  const pages = Math.max(1, Math.ceil(result.rows.length / pageSize));

  return (
    <div className="table-view">
      <div className="table-meta">
        <strong>{name}</strong>
        <span>
          {result.rowCount.toLocaleString()} rows loaded · {result.columns.length}{" "}
          columns · {result.elapsedMs.toFixed(0)} ms
        </span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th className="rownum">#</th>
              {result.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={start + i}>
                <td className="rownum">{start + i + 1}</td>
                {row.map((v, j) => {
                  if (v === null)
                    return (
                      <td key={j} className="null-cell">
                        <span className="null">∅</span>
                      </td>
                    );
                  const num = typeof v === "number" || typeof v === "bigint";
                  return (
                    <td key={j} className={num ? "num" : undefined}>
                      {String(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          <button
            className="btn"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← prev
          </button>
          <span>
            rows {start + 1}–{end} of {result.rows.length}
          </span>
          <button
            className="btn"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
          >
            next →
          </button>
        </div>
      )}
    </div>
  );
}
