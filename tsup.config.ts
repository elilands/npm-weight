import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  minify: false,
  dts: false,
  sourcemap: true,
  splitting: false,
  // EL ESCUDO: Evitamos que el empaquetador rompa las dependencias de la UI
  external: ["cac", "@clack/prompts", "picocolors"],
});