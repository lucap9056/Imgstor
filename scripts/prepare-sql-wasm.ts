const SOURCE = "node_modules/sql.js/dist/sql-wasm.wasm";
const TARGET = "public/wasm/sql-wasm.wasm";

const source = Bun.file(SOURCE);

if (!(await source.exists())) {
  throw new Error(
    `sql.js wasm not found at ${SOURCE}. Run "bun install" first.`,
  );
}

const target = Bun.file(TARGET);

if ((await target.exists()) && (await target.size) === (await source.size)) {
  process.exit(0);
}

await Bun.write(TARGET, source);
console.log(`Copied ${SOURCE} -> ${TARGET}`);
