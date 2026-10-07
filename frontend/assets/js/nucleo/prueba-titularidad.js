// Prueba de titularidad: demuestra que quien presenta la credencial controla la wallet
// del titular registrada on-chain. Funciona fuera de la cadena y no cuesta gas:
//   1. El verificador genera un código aleatorio de 6 dígitos.
//   2. El titular firma un mensaje con ese código (personal_sign / EIP-191).
//   3. La verificación recupera la dirección firmante y la compara con `cuentaTitular`.
// El código evita que se reutilice una firma vieja (replay) y la fecha limita su vigencia.
import { verifyMessage, isHexString } from "../../vendor/ethers-6.17.0.min.js";
import { CONFIG, direccionContrato, URL_BASE_SITIO } from "./configuracion.js";
import { diagnostico } from "./registro-diagnostico.js";

const CLAVE_CODIGOS_EMITIDOS = "credenciales-medicas:codigos-titularidad";
const MAXIMO_CODIGOS_GUARDADOS = 20;
const TOLERANCIA_RELOJ_SEGUNDOS = 60;
const PATRON_CODIGO = /^\d{6}$/;
const PATRON_RESPUESTA = /^(\d{6})-(\d{9,11})-(0x[0-9a-fA-F]{130})$/;

export const RESULTADO_TITULARIDAD = Object.freeze({
  valida: "valida",
  firmaDeOtraCuenta: "firmaDeOtraCuenta",
  vencida: "vencida",
  fechaFutura: "fechaFutura",
  sinWalletTitular: "sinWalletTitular",
  malformada: "malformada",
});

function vigenciaSegundos() {
  return CONFIG.pruebaTitularidad?.vigenciaSegundos ?? 600;
}

/** Código de 6 dígitos con el generador criptográfico del navegador. */
export function generarCodigoDesafio() {
  const valores = new Uint32Array(1);
  crypto.getRandomValues(valores);
  return String(valores[0] % 1_000_000).padStart(6, "0");
}

export function esCodigoDesafio(texto) {
  return PATRON_CODIGO.test(String(texto ?? "").trim());
}

/**
 * Mensaje legible que ve el titular en su billetera antes de firmar. Lo arman igual
 * el titular (para firmar) y el verificador (para comprobar): cualquier diferencia
 * hace que la firma no valide.
 */
export function construirMensajeTitularidad({ idCredencial, codigo, fechaSegundos }) {
  return [
    "Prueba de titularidad de credencial médica",
    `Registro: ${direccionContrato().toLowerCase()} (red ${CONFIG.red.chainId})`,
    `Credencial: ${idCredencial.toLowerCase()}`,
    `Código del verificador: ${codigo}`,
    `Fecha: ${new Date(fechaSegundos * 1000).toISOString()}`,
    "Firmar este mensaje no mueve fondos ni cuesta gas.",
  ].join("\n");
}

/** Respuesta compacta que viaja en el QR o el link: código-fecha-firma. */
export function serializarRespuesta({ codigo, fechaSegundos, firma }) {
  return `${codigo}-${fechaSegundos}-${firma}`;
}

export function interpretarRespuesta(texto) {
  const limpio = String(texto ?? "").trim();
  const desdeUrl = limpio.match(/[?&]t=([^&#\s]+)/);
  const coincidencia = decodeURIComponent(desdeUrl ? desdeUrl[1] : limpio).match(PATRON_RESPUESTA);
  if (!coincidencia) return null;
  return { codigo: coincidencia[1], fechaSegundos: Number(coincidencia[2]), firma: coincidencia[3] };
}

export function urlRespuestaTitularidad(idCredencial, respuesta) {
  const parametros = new URLSearchParams({ c: idCredencial, t: serializarRespuesta(respuesta) });
  return `${URL_BASE_SITIO}verificar.html?${parametros}`;
}

/** El titular firma con su billetera. Devuelve la respuesta lista para el QR. */
export async function firmarPruebaTitularidad(firmante, idCredencial, codigo) {
  if (!esCodigoDesafio(codigo)) throw new Error("El código del verificador tiene que tener 6 dígitos.");
  const fechaSegundos = Math.floor(Date.now() / 1000);
  const mensaje = construirMensajeTitularidad({ idCredencial, codigo, fechaSegundos });
  const firma = await firmante.signMessage(mensaje);
  diagnostico.info("titularidad", "Prueba de titularidad firmada", { idCredencial, codigo, fechaSegundos });
  return { codigo, fechaSegundos, firma };
}

/**
 * Comprueba una respuesta contra la wallet del titular registrada on-chain.
 * @returns {{resultado: string, firmante?: string, segundosTranscurridos?: number}}
 */
export function comprobarPruebaTitularidad({ idCredencial, cuentaTitular, respuesta, ahoraSegundos = Math.floor(Date.now() / 1000) }) {
  if (!cuentaTitular || /^0x0+$/.test(cuentaTitular)) return { resultado: RESULTADO_TITULARIDAD.sinWalletTitular };
  if (!respuesta || !isHexString(respuesta.firma, 65)) return { resultado: RESULTADO_TITULARIDAD.malformada };
  const segundosTranscurridos = ahoraSegundos - respuesta.fechaSegundos;
  let firmante;
  try {
    firmante = verifyMessage(construirMensajeTitularidad({ idCredencial, ...respuesta }), respuesta.firma);
  } catch (error) {
    diagnostico.advertencia("titularidad", "Firma ilegible", error);
    return { resultado: RESULTADO_TITULARIDAD.malformada };
  }
  const base = { firmante, segundosTranscurridos };
  if (firmante.toLowerCase() !== cuentaTitular.toLowerCase()) return { ...base, resultado: RESULTADO_TITULARIDAD.firmaDeOtraCuenta };
  if (segundosTranscurridos < -TOLERANCIA_RELOJ_SEGUNDOS) return { ...base, resultado: RESULTADO_TITULARIDAD.fechaFutura };
  if (segundosTranscurridos > vigenciaSegundos()) return { ...base, resultado: RESULTADO_TITULARIDAD.vencida };
  return { ...base, resultado: RESULTADO_TITULARIDAD.valida };
}

// ── Códigos emitidos en este dispositivo (para cerrar el circuito sin tipear) ──
function leerCodigosEmitidos() {
  try {
    const lista = JSON.parse(window.localStorage.getItem(CLAVE_CODIGOS_EMITIDOS) ?? "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function recordarCodigoEmitido(idCredencial, codigo) {
  const ahora = Math.floor(Date.now() / 1000);
  const vigentes = leerCodigosEmitidos().filter((item) => ahora - item.emitidoEl <= vigenciaSegundos() * 2);
  vigentes.push({ idCredencial: idCredencial.toLowerCase(), codigo, emitidoEl: ahora });
  try {
    window.localStorage.setItem(CLAVE_CODIGOS_EMITIDOS, JSON.stringify(vigentes.slice(-MAXIMO_CODIGOS_GUARDADOS)));
  } catch {
    // sin almacenamiento: el verificador confirma el código a mano
  }
}

/** true si este dispositivo emitió ese código para esa credencial y sigue vigente. */
export function codigoFueEmitidoAqui(idCredencial, codigo) {
  const ahora = Math.floor(Date.now() / 1000);
  return leerCodigosEmitidos().some(
    (item) => item.idCredencial === idCredencial.toLowerCase() && item.codigo === codigo && ahora - item.emitidoEl <= vigenciaSegundos(),
  );
}
