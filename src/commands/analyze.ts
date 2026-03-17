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

    // EL AUTO-FIX CON BLINDAJE ANTI-CONFLICTOS
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
        let s = p.spinner();
        s.start(`Running ${manifest.packageManager} install... This might take a few seconds.`);
        
        const pkgNames = outdatedPkgs.map(d => `${d.name}@latest`);
        
        try {
          // Intento 1: Actualización normal estricta
          await updatePackages(pkgNames, manifest.packageManager);
          s.stop(picocolors.green("✔ Packages updated successfully! Run the analysis again to see the new scores."));
          
        } catch (updateError: any) {
          s.stop(picocolors.red("✖ Update blocked by package manager."));
          
          // 🛡️ DETECCIÓN DE ERESOLVE (Dependency Hell)
          if (manifest.packageManager === "npm" && updateError.stderr?.includes("ERESOLVE")) {
            p.log.warn(picocolors.yellow("NPM blocked the update due to conflicting peer dependencies (ERESOLVE)."));
            p.log.message(picocolors.dim("Example: One of your packages requires an older version of a library we are trying to update."));
            
            const force = await p.confirm({
              message: `Do you want to bypass strict checks and force the update using '--legacy-peer-deps'?`,
              initialValue: false
            });

            if (p.isCancel(force) || !force) {
              p.log.info(picocolors.dim("Update aborted to protect your project's integrity. You may need to update packages manually."));
            } else {
              // Intento 2: Forzando la actualización
              s = p.spinner();
              s.start("Retrying update with --legacy-peer-deps...");
              try {
                await updatePackages(pkgNames, manifest.packageManager, true);
                s.stop(picocolors.green("✔ Packages force-updated successfully using legacy peer deps!"));
              } catch (forceError) {
                s.stop(picocolors.red("✖ Force update failed. Manual intervention required."));
              }
            }
          } else {
             p.log.error(picocolors.red("An unexpected error occurred during the update process."));
          }
        }
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