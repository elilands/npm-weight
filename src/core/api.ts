// src/core/api.ts

import type { AnalyzedDependency, Dependency } from "../types/index.js";

async function fetchBundlephobia(name: string, version: string) {
  try {
    const res = await fetch(`https://bundlephobia.com/api/size?package=${name}@${version}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      size: data.size,
      gzip: data.gzip,
      dependencyCount: data.dependencyCount
    };
  } catch (error) {
    return null; // Silent fail for things like @types/node
  }
}

async function fetchNpmRegistry(name: string) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${name}`);
    if (!res.ok) return null;
    const data = await res.json();
    
    const latestVersion = data["dist-tags"]?.latest || "unknown";
    const updatedAt = data.time?.[latestVersion] || new Date().toISOString();

    return { latestVersion, updatedAt };
  } catch (error) {
    return null;
  }
}

export async function analyzeDependencies(deps: Dependency[]): Promise<AnalyzedDependency[]> {
  const analyzed: AnalyzedDependency[] = [];

  // We process them in a loop. For a massive production app we'd use batches,
  // but standard Promise.all is fast enough for typical package.json files.
  const promises = deps.map(async (dep) => {
    // Fire both network requests in parallel for maximum speed
    const [bundleData, npmData] = await Promise.all([
      fetchBundlephobia(dep.name, dep.version),
      fetchNpmRegistry(dep.name)
    ]);

    analyzed.push({
      ...dep,
      size: bundleData?.size || 0,
      gzip: bundleData?.gzip || 0,
      dependencyCount: bundleData?.dependencyCount || 0,
      latestVersion: npmData?.latestVersion || "unknown",
      updatedAt: npmData?.updatedAt || "unknown",
      error: (!bundleData && !npmData) ? "API Error" : undefined
    });
  });

  await Promise.all(promises);
  
  // Sort by GZIP size (heaviest first)
  return analyzed.sort((a, b) => (b.gzip || 0) - (a.gzip || 0));
}