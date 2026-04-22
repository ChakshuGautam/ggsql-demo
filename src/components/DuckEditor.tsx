import { useMemo, useState } from "react";
import type { Duck, DuckResult } from "../duckdb";

const DEFAULT_SQL = `-- DuckDB-WASM · in-browser OLAP, no server
-- Try: swap tables, add WHERE, GROUP BY, window functions

SELECT
  Origin,
  COUNT(*) AS n,
  ROUND(AVG(Miles_per_Gallon), 1) AS avg_mpg,
  ROUND(AVG(Horsepower), 0)       AS avg_hp
FROM cars
WHERE Miles_per_Gallon IS NOT NULL
GROUP BY Origin
ORDER BY avg_mpg DESC`;

const SQL_PRESETS: { title: string; sql: string }[] = [
  {
    title: "cars — avg MPG by origin",
    sql: DEFAULT_SQL,
  },
  {
    title: "seattle_weather — weather days per year",
    sql: `SELECT
  EXTRACT(year FROM date) AS year,
  weather,
  COUNT(*)                AS days
FROM seattle_weather
GROUP BY year, weather
ORDER BY year, weather`,
  },
  {
    title: "sp500 — 12-month trailing return",
    sql: `SELECT
  date,
  price,
  ROUND(100 * (price / LAG(price, 12) OVER (ORDER BY date) - 1), 2)
    AS trailing_12m_return_pct
FROM sp500
ORDER BY date
LIMIT 50`,
  },
  {
    title: "flights_airport — worst delay by carrier",
    sql: `SELECT
  carrier,
  COUNT(*)                     AS flights,
  ROUND(AVG(delay), 1)         AS avg_delay_min,
  MAX(delay)                   AS worst_delay_min
FROM flights_airport
GROUP BY carrier
ORDER BY avg_delay_min DESC`,
  },
  {
    title: "gapminder — life expectancy ranking 2007",
    sql: `SELECT country, life_expect, pop, gdpPercap, cluster
FROM gapminder
WHERE year = 2007
ORDER BY life_expect DESC
LIMIT 20`,
  },
];

export function DuckEditor({ duck }: { duck: Duck }) {
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DuckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(text: string = sql) {
    setPending(true);
    setError(null);
    try {
      const r = await duck.query(text);
      setResult(r);
    } catch (e) {
      setResult(null);
      setError(String((e as Error).message ?? e));
    } finally {
      setPending(false);
    }
  }

  const pageRows = result?.rows.slice(0, 200) ?? [];
  const truncatedDisplay = (result?.rowCount ?? 0) > pageRows.length;
  const loaded = useMemo(() => duck.listTables(), [duck, result]);

  return (
    <section className="duck-editor">
      <div className="editor-pane">
        <div className="editor-toolbar">
          <strong>DuckDB-WASM · SQL</strong>
          <button
            className="btn primary"
            onClick={() => run()}
            disabled={pending}
          >
            {pending ? "Running…" : "Run ▶"}
          </button>
          <select
            className="preset-select"
            onChange={(e) => {
              const i = Number(e.target.value);
              if (!Number.isNaN(i) && SQL_PRESETS[i]) {
                setSql(SQL_PRESETS[i].sql);
                run(SQL_PRESETS[i].sql);
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Load preset…
            </option>
            {SQL_PRESETS.map((p, i) => (
              <option key={p.title} value={i}>
                {p.title}
              </option>
            ))}
          </select>
          <span className="tables-hint">
            tables: {loaded.length ? loaded.join(", ") : "(loading…)"}
          </span>
        </div>
        <textarea
          spellCheck={false}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              run();
            }
          }}
        />
      </div>

      <div className="duck-result">
        {error && <pre className="chart-error">{error}</pre>}
        {result && !error && (
          <div className="table-view">
            <div className="table-meta">
              <strong>{result.rowCount.toLocaleString()} rows</strong>
              <span>
                {result.columns.length} cols · {result.elapsedMs.toFixed(0)} ms
                {truncatedDisplay
                  ? ` · showing first ${pageRows.length}`
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
                    <tr key={i}>
                      <td className="rownum">{i + 1}</td>
                      {row.map((v, j) => {
                        if (v === null)
                          return (
                            <td key={j} className="null-cell">
                              <span className="null">∅</span>
                            </td>
                          );
                        const num =
                          typeof v === "number" || typeof v === "bigint";
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
          </div>
        )}
        {!result && !error && (
          <p className="loading-msg">
            Write a SELECT and hit Run (⌘/Ctrl + Enter).
          </p>
        )}
      </div>
    </section>
  );
}
