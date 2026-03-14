// src/types/index.ts

export interface Dependency {
    name: string;
    version: string;
    type: "prod" | "dev";
  }
  
  export interface ProjectManifest {
    projectName: string;
    dependencies: Dependency[];
    packageManager: "npm" | "yarn" | "pnpm" | "bun" | "unknown";
  }
  
  // --- NEW API TYPES ---
  
  export interface BundlephobiaData {
    size: number;
    gzip: number;
    dependencyCount: number;
  }
  
  export interface NpmData {
    latestVersion: string;
    updatedAt: string; 
  }
  
  // The final object combining local data + network data
  export interface AnalyzedDependency extends Dependency {
    size?: number;
    gzip?: number;
    dependencyCount?: number;
    latestVersion?: string;
    updatedAt?: string;
    error?: string;
  }