import { useEffect, useState } from "react";
import { Chart } from "./components/Chart";
import { DuckEditor } from "./components/DuckEditor";
import { DuckTable } from "./components/DuckTable";
import { initGgsql, type Ggsql } from "./ggsql";
import { initDuck, type Duck } from "./duckdb";
import { EDITOR_DEFAULT, PRESETS } from "./queries";
import { EXTRA_DATASETS } from "./datasets";
import "./App.css";

type Tab = "dashboard" | "tables" | "sql" | "ggsql";

export default function App() {
  const [ggsql, setGgsql] = useState<Ggsql | null>(null);
  const [duck, setDuck] = useState<Duck | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [query, setQuery] = useState(EDITOR_DEFAULT);
  const [ggsqlTables, setGgsqlTables] = useState<string[]>([]);
  const [duckTables, setDuckTables] = useState<string[]>([]);

  useEffect(() => {
    initGgsql(undefined, () => {
      setGgsql((cur) => {
        if (cur) setGgsqlTables(cur.listTables());
        return cur;
      });
    })
      .then((g) => {
        setGgsql(g);
        setGgsqlTables(g.listTables());
      })
      .catch((e) => setInitError(String(e.message ?? e)));

    initDuck(() => {
      setDuck((cur) => {
        if (cur) setDuckTables(cur.listTables());
        return cur;
      });
    })
      .then((d) => {
        setDuck(d);
        setDuckTables(d.listTables());
      })
      .catch((e) => setInitError((prev) => prev ?? String(e.message ?? e)));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="title">
          <h1>
            <a
              href="https://ggsql.org"
              target="_blank"
              rel="noreferrer"
              className="ggsql-link"
            >
              ggsql
            </a>{" "}
            browser
          </h1>
        </div>
        <nav className="tabs">
          <Tab t="dashboard" cur={tab} set={setTab}>
            Dashboard
          </Tab>
          <Tab t="tables" cur={tab} set={setTab}>
            Tables
          </Tab>
          <Tab t="sql" cur={tab} set={setTab}>
            SQL (DuckDB)
          </Tab>
          <Tab t="ggsql" cur={tab} set={setTab}>
            ggsql (viz)
          </Tab>
        </nav>
      </header>

      <main className="app-main">
        {initError && <p className="chart-error">init failed: {initError}</p>}
        {tab === "dashboard" && ggsql && (
          <Dashboard ggsql={ggsql} tables={ggsqlTables} />
        )}
        {tab === "tables" && duck && (
          <Tables duck={duck} names={duckTables} />
        )}
        {tab === "sql" &&
          (duck ? (
            <DuckEditor duck={duck} />
          ) : (
            <p className="loading-msg">Spinning up DuckDB-WASM…</p>
          ))}
        {tab === "ggsql" &&
          (ggsql ? (
            <Editor ggsql={ggsql} query={query} setQuery={setQuery} />
          ) : (
            <p className="loading-msg">Loading ggsql-wasm…</p>
          ))}
        {!ggsql && !initError && tab !== "sql" && tab !== "ggsql" && (
          <p className="loading-msg">
            Loading WebAssembly modules (ggsql + DuckDB)… first paint takes a few seconds.
          </p>
        )}
      </main>
    </div>
  );
}

function Tab({
  t,
  cur,
  set,
  children,
}: {
  t: Tab;
  cur: Tab;
  set: (t: Tab) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cur === t ? "tab active" : "tab"}
      onClick={() => set(t)}
    >
      {children}
    </button>
  );
}

function Dashboard({ ggsql, tables }: { ggsql: Ggsql; tables: string[] }) {
  const present = new Set(tables);
  return (
    <section className="dashboard">
      <div className="grid">
        {PRESETS.map((p) => {
          const missing = (p.requires ?? []).filter((t) => !present.has(t));
          return (
            <div key={p.title} className="panel">
              <div className="panel-header">
                <h3>{p.title}</h3>
                <p>{p.description}</p>
              </div>
              {missing.length === 0 ? (
                <Chart ggsql={ggsql} query={p.query} height={300} />
              ) : (
                <div className="chart loading">
                  Loading dataset: <code>{missing.join(", ")}</code>…
                </div>
              )}
              <details>
                <summary>Query</summary>
                <pre>{p.query}</pre>
              </details>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Tables({ duck, names }: { duck: Duck; names: string[] }) {
  const [selected, setSelected] = useState<string>("");
  useEffect(() => {
    if (!selected && names.length > 0) setSelected(names[0]);
  }, [names, selected]);

  const extraMap = new Map(EXTRA_DATASETS.map((d) => [d.name, d]));
  const pending = EXTRA_DATASETS.filter((d) => !names.includes(d.name));

  return (
    <section className="tables-view">
      <aside className="tables-sidebar">
        <h3>DuckDB tables</h3>
        <ul>
          {names.map((n) => {
            const extra = extraMap.get(n);
            return (
              <li key={n}>
                <button
                  className={selected === n ? "table-link active" : "table-link"}
                  onClick={() => setSelected(n)}
                  title={extra?.description}
                >
                  <span className="table-link-label">
                    {extra?.label ?? n}
                  </span>
                  <span className="table-link-id">{n}</span>
                </button>
              </li>
            );
          })}
          {pending.map((d) => (
            <li key={d.name}>
              <button className="table-link loading" disabled>
                <span className="table-link-label">{d.label}</span>
                <span className="table-link-id">loading…</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="tables-main">
        {selected && <DuckTable duck={duck} name={selected} />}
      </div>
    </section>
  );
}

function Editor({
  ggsql,
  query,
  setQuery,
}: {
  ggsql: Ggsql;
  query: string;
  setQuery: (q: string) => void;
}) {
  return (
    <section className="editor">
      <div className="editor-pane">
        <div className="editor-toolbar">
          <strong>ggsql · VISUALIZE</strong>
          <button className="btn" onClick={() => setQuery(EDITOR_DEFAULT)}>
            Reset to example
          </button>
          <select
            className="preset-select"
            onChange={(e) => {
              const i = Number(e.target.value);
              if (!Number.isNaN(i) && PRESETS[i]) setQuery(PRESETS[i].query);
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Load preset…
            </option>
            {PRESETS.map((p, i) => (
              <option key={p.title} value={i}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <textarea
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="editor-chart">
        <Chart ggsql={ggsql} query={query} height={520} />
      </div>
    </section>
  );
}
