// src/core/scanner.ts

import fs from "fs/promises";
import path from "path";
import type { Dependency, ProjectManifest } from "../types/index.js";

// Cleans prefixes like ^, ~, >, < or = from versions
const cleanVersion = (rawVersion: string): string => {
  return rawVersion.replace(/^[^\da-zA-Z]/, "");
};

export async function scanLocalProject(cwd: string): Promise<ProjectManifest> {
  const pkgPath = path.join(cwd, "package.json");
  let pkgContent: string;

  try {
    pkgContent = await fs.readFile(pkgPath, "utf-8");
  } catch (error) {
    throw new Error("No package.json found in the current directory.");
  }

  const pkg = JSON.parse(pkgContent);
  const dependencies: Dependency[] = [];

  // Extract production dependencies
  if (pkg.dependencies) {
    for (const [name, version] of Object.entries(pkg.dependencies)) {
      dependencies.push({
        name,
        version: cleanVersion(version as string),
        type: "prod"
      });
    }
  }

  // Extract development dependencies
  if (pkg.devDependencies) {
    for (const [name, version] of Object.entries(pkg.devDependencies)) {
      dependencies.push({
        name,
        version: cleanVersion(version as string),
        type: "dev"
      });
    }
  }

  // Tactical package manager detection
  let pm: ProjectManifest["packageManager"] = "unknown";
  
  try { await fs.access(path.join(cwd, "package-lock.json")); pm = "npm"; } catch {}
  if (pm === "unknown") try { await fs.access(path.join(cwd, "yarn.lock")); pm = "yarn"; } catch {}
  if (pm === "unknown") try { await fs.access(path.join(cwd, "pnpm-lock.yaml")); pm = "pnpm"; } catch {}
  if (pm === "unknown") try { await fs.access(path.join(cwd, "bun.lockb")); pm = "bun"; } catch {}

  return {
    projectName: pkg.name || "Unnamed Project",
    dependencies,
    packageManager: pm
  };
}