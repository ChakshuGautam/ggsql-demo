import { useEffect, useState } from "react";
import { Chart } from "./components/Chart";
import { initGgsql, type Ggsql } from "./ggsql";
import { EDITOR_DEFAULT, PRESETS } from "./queries";
import "./App.css";

type Tab = "dashboard" | "editor";

const GGSQL_VERSION = "0.2.7";

export default function App() {
  const [ggsql, setGgsql] = useState<Ggsql | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [query, setQuery] = useState(EDITOR_DEFAULT);
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    initGgsql()
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
          <h1>ggsql browser</h1>
          <span className="badge">ggsql {GGSQL_VERSION} · SQLite-WASM</span>
        </div>
        <nav className="tabs">
          <button
            className={tab === "dashboard" ? "tab active" : "tab"}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={tab === "editor" ? "tab active" : "tab"}
            onClick={() => setTab("editor")}
          >
            Editor
          </button>
        </nav>
        <div className={ready ? "status ready" : "status loading"}>
          {initError
            ? `init failed: ${initError}`
            : ready
              ? `Ready · tables: ${tables.join(", ")}`
              : "Loading ggsql-wasm…"}
        </div>
      </header>

      <main className="app-main">
        {tab === "dashboard" && ready && <Dashboard ggsql={ggsql!} />}
        {tab === "editor" && ready && (
          <Editor ggsql={ggsql!} query={query} setQuery={setQuery} />
        )}
        {!ready && !initError && (
          <p className="loading-msg">
            Loading WebAssembly module… first paint can take a few seconds.
          </p>
        )}
      </main>

      <footer className="app-footer">
        Fully client-side · ggsql-wasm built from source · no backend ·{" "}
        <a href="https://ggsql.org" target="_blank" rel="noreferrer">
          ggsql.org
        </a>
      </footer>
    </div>
  );
}

function Dashboard({ ggsql }: { ggsql: Ggsql }) {
  return (
    <section className="dashboard">
      <h2>Penguins — 4 perspectives</h2>
      <p className="sub">
        Data: <code>ggsql:penguins</code> (builtin). Four ggsql queries on the
        same dataset.
      </p>
      <div className="grid">
        {PRESETS.map((p) => (
          <div key={p.title} className="panel">
            <div className="panel-header">
              <h3>{p.title}</h3>
              <p>{p.description}</p>
            </div>
            <Chart ggsql={ggsql} query={p.query} height={300} />
            <details>
              <summary>Query</summary>
              <pre>{p.query}</pre>
            </details>
          </div>
        ))}
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
