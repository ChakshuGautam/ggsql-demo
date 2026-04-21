import { useEffect, useRef, useState } from "react";
import vegaEmbed, { type Result as VegaResult } from "vega-embed";
import type { Ggsql } from "../ggsql";

interface ChartProps {
  ggsql: Ggsql;
  query: string;
  height?: number;
  debounceMs?: number;
}

export function Chart({ ggsql, query, height = 320, debounceMs = 300 }: ChartProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<VegaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const node = container.current;
      if (!node) return;
      try {
        const spec = ggsql.execute(query) as object;
        setError(null);
        vegaEmbed(node, spec as any, {
          actions: false,
          renderer: "svg",
          mode: "vega-lite",
        })
          .then((r) => {
            viewRef.current?.finalize();
            viewRef.current = r;
          })
          .catch((e: unknown) => setError(String((e as Error).message ?? e)));
      } catch (e) {
        setError(String((e as Error).message ?? e));
      }
    }, debounceMs);

    return () => clearTimeout(t);
  }, [ggsql, query, debounceMs]);

  useEffect(() => {
    return () => {
      viewRef.current?.finalize();
      viewRef.current = null;
    };
  }, []);

  return (
    <div className="chart">
      {error ? (
        <pre className="chart-error">{error}</pre>
      ) : (
        <div ref={container} style={{ width: "100%", minHeight: height }} />
      )}
    </div>
  );
}
