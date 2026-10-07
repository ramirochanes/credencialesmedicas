// Huellas SHA-256 calculadas EN EL NAVEGADOR. Los documentos nunca se suben a
// ningún servidor ni a la blockchain: solo viaja su huella de 32 bytes.
import { sha256 as sha256Respaldo, hexlify } from "../../vendor/ethers-6.17.0.min.js";

const TAMANO_MAXIMO_DOCUMENTO = 25 * 1024 * 1024; // 25 MB
const PATRON_IDENTIFICADOR = /^0x[0-9a-fA-F]{64}$/;

async function digerirSha256(bytes) {
  // crypto.subtle solo existe en contextos seguros (HTTPS o localhost).
  if (globalThis.crypto?.subtle) {
    const resumen = await crypto.subtle.digest("SHA-256", bytes);
    return hexlify(new Uint8Array(resumen));
  }
  return sha256Respaldo(new Uint8Array(bytes));
}

export async function calcularHuellaArchivo(archivo) {
  if (!(archivo instanceof Blob)) throw new Error("No se recibió un archivo.");
  if (archivo.size === 0) throw new Error("El archivo está vacío.");
  if (archivo.size > TAMANO_MAXIMO_DOCUMENTO) throw new Error("El archivo supera los 25 MB.");
  return digerirSha256(await archivo.arrayBuffer());
}

/** Huella de un texto (por ejemplo "Resolución 123/2026") para referenciar actos. */
export async function calcularHuellaTexto(texto) {
  const normalizado = String(texto ?? "").trim();
  if (!normalizado) throw new Error("El texto está vacío.");
  return digerirSha256(new TextEncoder().encode(normalizado));
}

/** Identificador aleatorio de 32 bytes: no deriva de ningún dato personal. */
export function generarIdentificadorCredencial() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return hexlify(bytes);
}

export function esIdentificadorCredencial(valor) {
  return PATRON_IDENTIFICADOR.test(String(valor ?? "").trim());
}

/** Acepta un identificador suelto o un link de verificación (…verificar.html?c=0x…). */
export function extraerIdentificadorCredencial(texto) {
  const limpio = String(texto ?? "").trim();
  if (esIdentificadorCredencial(limpio)) return limpio.toLowerCase();
  const coincidencia = limpio.match(/[?&]c=(0x[0-9a-fA-F]{64})/);
  return coincidencia ? coincidencia[1].toLowerCase() : null;
}
