import { useMemo, useState } from "react";
import type { Ggsql, SqlResult } from "../ggsql";

interface TableViewProps {
  ggsql: Ggsql;
  name: string;
  pageSize?: number;
}

export function TableView({ ggsql, name, pageSize = 25 }: TableViewProps) {
  const [page, setPage] = useState(0);

  const result = useMemo<SqlResult | { error: string }>(() => {
    setPage(0);
    try {
      // ggsql:name identifiers must be unquoted — ggsql's preprocessor rewrites
      // them to __ggsql_data_name__ before SQLite parses the SQL.
      return ggsql.executeSql(`SELECT * FROM ${name}`);
    } catch (e) {
      return { error: String((e as Error).message ?? e) };
    }
  }, [ggsql, name]);

  if ("error" in result) {
    return (
      <pre className="chart-error">{`Failed to read ${name}: ${result.error}`}</pre>
    );
  }

  const start = page * pageSize;
  const end = Math.min(start + pageSize, result.rows.length);
  const pageRows = result.rows.slice(start, end);
  const pages = Math.max(1, Math.ceil(result.rows.length / pageSize));

  return (
    <div className="table-view">
      <div className="table-meta">
        <strong>{name}</strong>
        <span>
          {result.total_rows.toLocaleString()} rows · {result.columns.length}{" "}
          columns
          {result.truncated
            ? ` · showing first ${result.rows.length}`
            : ""}
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
                  const display = formatCell(v);
                  if (display === null)
                    return (
                      <td key={j} className="null-cell">
                        <span className="null">∅</span>
                      </td>
                    );
                  return (
                    <td key={j} className={isNumeric(v) ? "num" : undefined}>
                      {display}
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

function formatCell(v: string): string | null {
  if (v === "null" || v === "" || v === null || v === undefined) return null;
  // ggsql-wasm JSON-stringifies text values, so "Adelie" arrives as `"Adelie"`.
  // Strip the outer quotes when present.
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  return v;
}

function isNumeric(v: string): boolean {
  if (v === "" || v === "null") return false;
  if (v.startsWith('"')) return false;
  return !Number.isNaN(Number(v));
}
