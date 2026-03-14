// src/commands/analyze.ts

import picocolors from "picocolors";
import * as p from "@clack/prompts";
import { scanLocalProject } from "../core/scanner.js";
import { analyzeDependencies } from "../core/api.js";
import { formatBytes, formatTime, pad, getHealthScore, formatVersion } from "../core/utils.js";
import { updatePackages } from "../core/updater.js";
import type { AnalyzedDependency } from "../types/index.js";

const generateMarkdown = (deps: AnalyzedDependency[]) => {
  let md = `| Package | Version | GZIP Size | Last Update | Score |\n`;
  md += `|---|---|---|---|---|\n`;
  deps.forEach(dep => {
    const v = dep.version !== dep.latestVersion ? `${dep.version} -> ${dep.latestVersion}` : dep.version;
    const score = getHealthScore(dep.gzip || 0, dep.updatedAt || "unknown", dep.type).replace(/\x1b\[[0-9;]*m/g, '').trim();
    md += `| \`${dep.name}\` | ${v} | ${formatBytes(dep.gzip || 0).replace(/\x1b\[[0-9;]*m/g, '')} | ${formatTime(dep.updatedAt || "unknown")} | **${score}** |\n`;
  });
  return md;
};

const renderTable = (title: string, deps: AnalyzedDependency[]) => {
  if (deps.length === 0) return;
  const maxNameLen = Math.max(...deps.map(d => d.name.length), 14);
  const separatorLength = maxNameLen + 53;

  console.log(picocolors.dim("┌─ ") + picocolors.bold(title) + picocolors.dim("─".repeat(Math.max(0, separatorLength - title.length - 2))));
  console.log(
    "│ " + pad(picocolors.cyan("PACKAGE"), maxNameLen) + " │ " + pad(picocolors.cyan("VERSION"), 22) + " │ " + 
    pad(picocolors.cyan("GZIP"), 10, true) + " │ " + pad(picocolors.cyan("UPDATED"), 10) + " │ " + picocolors.cyan("SCORE")
  );
  console.log(picocolors.dim("├─" + "─".repeat(maxNameLen + 2) + "┼─" + "─".repeat(24) + "┼─" + "─".repeat(12) + "┼─" + "─".repeat(12) + "┼─" + "─".repeat(8)));

  let totalGzip = 0;
  deps.forEach(dep => {
    totalGzip += dep.gzip || 0;
    console.log(
      "│ " + pad(picocolors.white(dep.name), maxNameLen) + " │ " + pad(formatVersion(dep.version, dep.latestVersion || "unknown"), 22) + " │ " +
      pad(formatBytes(dep.gzip || 0), 10, true) + " │ " + pad(picocolors.dim(formatTime(dep.updatedAt || "unknown")), 10) + " │  " +
      getHealthScore(dep.gzip || 0, dep.updatedAt || "unknown", dep.type)
    );
  });
  console.log(picocolors.dim("└─" + "─".repeat(separatorLength)));
  
  if (title.includes("PRODUCTION")) {
    console.log(picocolors.green(`  📦 Total Production GZIP Impact: `) + picocolors.bold(formatBytes(totalGzip)) + "\n");
  } else {
    console.log(""); 
  }
};

export async function executeAnalyze(options: { json?: boolean; md?: boolean }) {
  const isSilent = options.json || options.md;
  
  if (!isSilent) {
    console.clear();
    p.intro(picocolors.bgBlue(picocolors.white(" @elilands/npm-weight ")));
  }
  
  const spinner = p.spinner();
  if (!isSilent) spinner.start("Scanning local environment...");

  try {
    const manifest = await scanLocalProject(process.cwd());
    if (!isSilent) spinner.message(`Contacting NPM & Bundlephobia for ${manifest.dependencies.length} packages...`);
    
    const analyzed = await analyzeDependencies(manifest.dependencies);

    // --- MODO SILENCIOSO (CI/CD) ---
    if (options.json) {
      console.log(JSON.stringify(analyzed, null, 2));
      process.exit(0);
    }
    if (options.md) {
      console.log("### 📦 Production Payload\n" + generateMarkdown(analyzed.filter(d => d.type === "prod")));
      console.log("\n### 🛠️ Development Tools\n" + generateMarkdown(analyzed.filter(d => d.type === "dev")));
      process.exit(0);
    }

    // --- MODO VISUAL E INTERACTIVO ---
    spinner.stop(picocolors.green(`✔ Analysis complete. Package manager: ${picocolors.cyan(manifest.packageManager)}`));
    
    renderTable("PRODUCTION DEPENDENCIES", analyzed.filter(d => d.type === "prod"));
    renderTable("DEVELOPMENT DEPENDENCIES", analyzed.filter(d => d.type === "dev"));

    const outdatedPkgs = analyzed.filter(dep => dep.version !== dep.latestVersion && dep.latestVersion !== "unknown");

    let summaryMsg = "Project looks healthy! ✅";
    if (outdatedPkgs.length > 0) {
      summaryMsg = `Found ${outdatedPkgs.length} package(s) with available updates. 🔄`;
    }

    p.note(summaryMsg, "💡 Actionable Insights");

    // EL AUTO-FIX
    if (outdatedPkgs.length > 0) {
      const shouldUpdate = await p.confirm({
        message: `Do you want to auto-update these ${outdatedPkgs.length} packages to their latest versions now?`,
        initialValue: false
      });

      if (p.isCancel(shouldUpdate)) {
        p.cancel("Operation cancelled.");
        process.exit(0);
      }

      if (shouldUpdate) {
        const s = p.spinner();
        s.start(`Running ${manifest.packageManager} install... This might take a few seconds.`);
        
        const pkgNames = outdatedPkgs.map(d => `${d.name}@latest`);
        await updatePackages(pkgNames, manifest.packageManager);
        
        s.stop(picocolors.green("✔ Packages updated successfully! Run the analysis again to see the new scores."));
      }
    }

    p.outro(picocolors.dim("Scores: [A] Perfect  [B] Acceptable  [C] Warning  [F] Critical"));

  } catch (error) {
    if (!isSilent) spinner.stop("Error during analysis");
    if (error instanceof Error) {
      console.error(picocolors.red(error.message));
    }
    process.exit(1);
  }
}