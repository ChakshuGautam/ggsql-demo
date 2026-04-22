import { useEffect, useState } from "react";
import { Chart } from "./components/Chart";
import { TableView } from "./components/TableView";
import { initGgsql, type Ggsql } from "./ggsql";
import { EDITOR_DEFAULT, PRESETS } from "./queries";
import { EXTRA_DATASETS } from "./datasets";
import "./App.css";

type Tab = "dashboard" | "tables" | "editor" | "playground";

export default function App() {
  const [ggsql, setGgsql] = useState<Ggsql | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [query, setQuery] = useState(EDITOR_DEFAULT);
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    const onDataset = () => {
      // Ggsql instance updates its internal state; refresh the list.
      setGgsql((cur) => {
        if (!cur) return cur;
        setTables(cur.listTables());
        return cur;
      });
    };
    initGgsql(undefined, onDataset)
      .then((g) => {
        setGgsql(g);
        setTables(g.listTables());
      })
      .catch((e) => setInitError(String(e.message ?? e)));
  }, []);

  const ready = ggsql !== null;

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
          <button
            className={tab === "dashboard" ? "tab active" : "tab"}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={tab === "tables" ? "tab active" : "tab"}
            onClick={() => setTab("tables")}
          >
            Tables
          </button>
          <button
            className={tab === "editor" ? "tab active" : "tab"}
            onClick={() => setTab("editor")}
          >
            Editor
          </button>
          <button
            className={tab === "playground" ? "tab active" : "tab"}
            onClick={() => setTab("playground")}
          >
            Playground
          </button>
        </nav>
      </header>

      <main className="app-main">
        {initError && <p className="chart-error">init failed: {initError}</p>}
        {!ready && !initError && (
          <p className="loading-msg">
            Loading WebAssembly module… first paint can take a few seconds.
          </p>
        )}
        {tab === "dashboard" && ready && (
          <Dashboard ggsql={ggsql!} tables={tables} />
        )}
        {tab === "tables" && ready && (
          <Tables ggsql={ggsql!} names={tables} />
        )}
        {tab === "editor" && ready && (
          <Editor ggsql={ggsql!} query={query} setQuery={setQuery} />
        )}
        {tab === "playground" && <Playground />}
      </main>
    </div>
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

function Tables({ ggsql, names }: { ggsql: Ggsql; names: string[] }) {
  const [selected, setSelected] = useState<string>(names[0] ?? "");
  useEffect(() => {
    if (!selected && names.length > 0) setSelected(names[0]);
  }, [names, selected]);
  if (names.length === 0) return <p>No tables registered.</p>;

  const extraMap = new Map(EXTRA_DATASETS.map((d) => [d.name, d]));
  const builtins = names.filter((n) => n.startsWith("ggsql:"));
  const extras = names.filter((n) => !n.startsWith("ggsql:"));
  const pendingExtras = EXTRA_DATASETS.filter(
    (d) => !names.includes(d.name),
  );

  const renderItem = (n: string) => {
    const extra = extraMap.get(n);
    const label = extra?.label ?? n;
    return (
      <li key={n}>
        <button
          className={selected === n ? "table-link active" : "table-link"}
          onClick={() => setSelected(n)}
          title={extra?.description}
        >
          <span className="table-link-label">{label}</span>
          <span className="table-link-id">{n}</span>
        </button>
      </li>
    );
  };

  return (
    <section className="tables-view">
      <aside className="tables-sidebar">
        <h3>Builtin (ggsql)</h3>
        <ul>{builtins.map(renderItem)}</ul>
        {(extras.length > 0 || pendingExtras.length > 0) && (
          <>
            <h3>Open datasets</h3>
            <ul>
              {extras.map(renderItem)}
              {pendingExtras.map((d) => (
                <li key={d.name}>
                  <button className="table-link loading" disabled>
                    <span className="table-link-label">{d.label}</span>
                    <span className="table-link-id">loading…</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
      <div className="tables-main">
        {selected && <TableView ggsql={ggsql} name={selected} />}
      </div>
    </section>
  );
}

function Playground() {
  const src = "https://ggsql.org/wasm/";
  return (
    <section className="playground">
      <div className="playground-bar">
        <span>
          Official ggsql playground —{" "}
          <a href={src} target="_blank" rel="noreferrer">
            ggsql.org/wasm
          </a>
        </span>
        <a className="btn" href={src} target="_blank" rel="noreferrer">
          Open in new tab ↗
        </a>
      </div>
      <iframe
        src={src}
        title="ggsql playground (ggsql.org/wasm)"
        className="playground-frame"
      />
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
          <strong>ggsql</strong>
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
