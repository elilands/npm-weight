// src/core/updater.ts

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function updatePackages(packages: string[], packageManager: string): Promise<void> {
  if (packages.length === 0) return;

  const pkgList = packages.join(" ");
  let command = "";

  // Construimos el comando exacto según el gestor que detectó nuestro escáner
  if (packageManager === "yarn") {
    command = `yarn add ${pkgList}`;
  } else if (packageManager === "pnpm") {
    command = `pnpm add ${pkgList}`;
  } else if (packageManager === "bun") {
    command = `bun add ${pkgList}`;
  } else {
    command = `npm install ${pkgList}`;
  }

  // Ejecutamos el comando de forma nativa en el sistema operativo
  await execAsync(command);
}