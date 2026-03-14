// src/core/utils.ts

import picocolors from "picocolors";

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "Unknown";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  
  // Código de colores por peso (El "Costo Real")
  const text = `${value} ${sizes[i]}`;
  if (sizes[i] === "MB" && value > 1) return picocolors.red(text); // > 1MB es Rojo
  if (sizes[i] === "KB" && value > 500) return picocolors.yellow(text); // > 500KB es Amarillo
  return picocolors.green(text); // Verde para paquetes ligeros
}

export function formatTime(isoDate: string): string {
  if (isoDate === "unknown") return "Unknown";
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function pad(text: string, length: number, alignRight = false): string {
  // Quitamos los códigos de color ANSI temporalmente para medir la longitud real
  const visibleLength = text.replace(/\x1b\[[0-9;]*m/g, '').length;
  const padding = " ".repeat(Math.max(0, length - visibleLength));
  return alignRight ? padding + text : text + padding;
}

export function getHealthScore(gzip: number, updatedAt: string, type: "prod" | "dev"): string {
    // Si no hay datos de Bundlephobia ni de fecha, no podemos evaluar
    if (updatedAt === "unknown") return picocolors.dim("-");
    
    const kb = gzip / 1024;
    const daysOld = (new Date().getTime() - new Date(updatedAt).getTime()) / (1000 * 3600 * 24);
  
    // 🛡️ REGLAS PARA DESARROLLO (Dev Tools): Solo evaluamos la antigüedad (Security/Updates)
    if (type === "dev") {
      if (daysOld > 1000) return picocolors.bgRed(picocolors.white(" F "));
      if (daysOld > 700) return picocolors.bgYellow(picocolors.black(" C "));
      if (daysOld > 365) return picocolors.bgBlue(picocolors.white(" B "));
      return picocolors.bgGreen(picocolors.black(" A "));
    }
  
    // ⚡ REGLAS PARA PRODUCCIÓN (Client Payload): Evaluamos Peso y Antigüedad
    if (kb > 500 || daysOld > 1000) return picocolors.bgRed(picocolors.white(" F ")); // Crítico (>500KB o >3 años)
    if (kb > 200 || daysOld > 700) return picocolors.bgYellow(picocolors.black(" C ")); // Advertencia (>200KB)
    if (kb > 50 || daysOld > 365) return picocolors.bgBlue(picocolors.white(" B ")); // Aceptable (>50KB)
    
    return picocolors.bgGreen(picocolors.black(" A ")); // Excelente
  }
  
  export function formatVersion(current: string, latest: string): string {
    if (current === latest || latest === "unknown") return picocolors.green(current);
    return `${picocolors.red(current)} ${picocolors.dim('→')} ${picocolors.green(latest)}`;
  }