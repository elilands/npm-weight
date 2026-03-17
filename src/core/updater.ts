// src/core/updater.ts

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function updatePackages(packages: string[], packageManager: string, forceLegacy = false): Promise<void> {
  if (packages.length === 0) return;

  const pkgList = packages.join(" ");
  let command = "";

  if (packageManager === "yarn") {
    command = `yarn add ${pkgList}`;
  } else if (packageManager === "pnpm") {
    command = `pnpm add ${pkgList}`;
  } else if (packageManager === "bun") {
    command = `bun add ${pkgList}`;
  } else {
    // Si estamos en NPM y pedimos forzar, inyectamos la bandera
    command = forceLegacy ? `npm install ${pkgList} --legacy-peer-deps` : `npm install ${pkgList}`;
  }

  // Ejecutamos el comando de forma nativa
  await execAsync(command);
}