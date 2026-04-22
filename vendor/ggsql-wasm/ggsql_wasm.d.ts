/* tslint:disable */
/* eslint-disable */

/**
 * Persistent ggsql context for WASM
 *
 * Create once and reuse for multiple queries to avoid memory issues.
 * Uses interior mutability to avoid wasm_bindgen's &mut self aliasing issues.
 */
export class GgsqlContext {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Execute a ggsql query and return Vega-Lite JSON
     */
    execute(query: string): string;
    /**
     * Execute SQL-only query and return JSON with columns/rows
     */
    execute_sql(query: string): string;
    /**
     * Check whether a query contains a VISUALISE clause
     */
    has_visual(query: string): boolean;
    /**
     * List all registered tables
     */
    list_tables(): any;
    /**
     * Create a new ggsql context
     */
    constructor();
    /**
     * Register all known builtin datasets (e.g. ggsql:penguins)
     */
    register_builtin_datasets(): Promise<void>;
    /**
     * Register a CSV file as a table from raw bytes
     */
    register_csv(name: string, data: Uint8Array): void;
    /**
     * Register a Parquet file as a table from raw bytes
     */
    register_parquet(name: string, data: Uint8Array): Promise<void>;
    /**
     * Unregister a table
     */
    unregister(name: string): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_ggsqlcontext_free: (a: number, b: number) => void;
    readonly ggsqlcontext_execute: (a: number, b: number, c: number, d: number) => void;
    readonly ggsqlcontext_execute_sql: (a: number, b: number, c: number, d: number) => void;
    readonly ggsqlcontext_has_visual: (a: number, b: number, c: number) => number;
    readonly ggsqlcontext_list_tables: (a: number) => number;
    readonly ggsqlcontext_new: (a: number) => void;
    readonly ggsqlcontext_register_builtin_datasets: (a: number) => number;
    readonly ggsqlcontext_register_csv: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly ggsqlcontext_register_parquet: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly ggsqlcontext_unregister: (a: number, b: number, c: number, d: number) => void;
    readonly rust_sqlite_wasm_abort: () => void;
    readonly rust_sqlite_wasm_assert_fail: (a: number, b: number, c: number, d: number) => void;
    readonly rust_sqlite_wasm_calloc: (a: number, b: number) => number;
    readonly rust_sqlite_wasm_malloc: (a: number) => number;
    readonly rust_sqlite_wasm_free: (a: number) => void;
    readonly rust_sqlite_wasm_getentropy: (a: number, b: number) => number;
    readonly rust_sqlite_wasm_localtime: (a: number) => number;
    readonly rust_sqlite_wasm_realloc: (a: number, b: number) => number;
    readonly sqlite3_os_end: () => number;
    readonly sqlite3_os_init: () => number;
    readonly __wasm_bindgen_func_elem_2732: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_2795: (a: number, b: number, c: number, d: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_export4: (a: number, b: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export5: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
