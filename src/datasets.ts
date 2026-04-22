export interface ExtraDataset {
  name: string;         // registration name (SQLite identifier — no ':' or '-')
  label: string;        // display name
  format: "csv" | "parquet";
  url: string;
  rows: number;         // approximate, for UI
  description: string;
}

const CDN = "https://cdn.jsdelivr.net/npm/vega-datasets@2/data";

// Curated OSS datasets from vega-datasets (BSD-3). Small enough to fetch
// without blocking and diverse enough for interesting ggsql demos.
export const EXTRA_DATASETS: ExtraDataset[] = [
  {
    name: "cars",
    label: "Auto MPG",
    format: "csv",
    url: `${CDN}/cars.json`, // actually JSON, handled below
    rows: 406,
    description:
      "1970–1982 car data: MPG, horsepower, weight, origin. Classic for scatterplots.",
  },
  {
    name: "seattle_weather",
    label: "Seattle weather",
    format: "csv",
    url: `${CDN}/seattle-weather.csv`,
    rows: 1461,
    description:
      "Daily weather in Seattle 2012–2015: temp, precipitation, wind, weather category.",
  },
  {
    name: "sp500",
    label: "S&P 500 monthly",
    format: "csv",
    url: `${CDN}/sp500.csv`,
    rows: 123,
    description:
      "S&P 500 monthly closing prices 2000–2010. Great for timeseries.",
  },
  {
    name: "flights_airport",
    label: "US flights (5k sample)",
    format: "csv",
    url: `${CDN}/flights-5k.csv`,
    rows: 5000,
    description:
      "5 000 random flights — delay, distance, origin, destination, carrier.",
  },
  {
    name: "gapminder",
    label: "Gapminder",
    format: "csv",
    url: `${CDN}/gapminder.json`, // JSON — converted client-side
    rows: 693,
    description:
      "Life expectancy, population and per-capita GDP for 142 countries (1952–2007).",
  },
  {
    name: "github_commits",
    label: "GitHub commits",
    format: "csv",
    url: `${CDN}/github.csv`,
    rows: 168,
    description:
      "GitHub commits by day-of-week × hour — punchcard-style viz.",
  },
];

/** Fetch the dataset and normalize it to a CSV Uint8Array. */
export async function fetchAsCsv(d: ExtraDataset): Promise<Uint8Array> {
  const res = await fetch(d.url);
  if (!res.ok) throw new Error(`${d.url} ${res.status}`);

  if (d.url.endsWith(".csv")) {
    return new Uint8Array(await res.arrayBuffer());
  }

  // JSON → CSV conversion (vega-datasets ships many as arrays of objects).
  const json = (await res.json()) as Record<string, unknown>[];
  if (!Array.isArray(json) || json.length === 0) {
    throw new Error(`${d.url}: empty or non-array JSON`);
  }
  const cols = Object.keys(json[0]);
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [cols.join(",")];
  for (const row of json) lines.push(cols.map((c) => escape(row[c])).join(","));
  return new TextEncoder().encode(lines.join("\n"));
}
