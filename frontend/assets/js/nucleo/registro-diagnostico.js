// Registro de diagnóstico del cliente: guarda eventos y errores con contexto para
// no operar "a ciegas". Vive en memoria + localStorage (si está disponible) y se
// puede descargar como JSON desde el pie del sitio. Opcionalmente envía los errores
// a un colector PHP (config.diagnostico.endpointRemoto).
//
// Nunca registra contenido de documentos ni claves: solo hashes, direcciones
// públicas, nombres de métodos y mensajes de error.
import { CONFIG } from "./configuracion.js";

const CLAVE_ALMACENAMIENTO = "credenciales-medicas:diagnostico";
const NIVELES = Object.freeze({ info: "info", advertencia: "advertencia", error: "error" });
const entradas = [];
const suscriptores = new Set();

function leerAlmacenadas() {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function persistir() {
  try {
    window.localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(entradas));
  } catch {
    // almacenamiento no disponible (modo privado, cuota): se conserva solo en memoria
  }
}

function serializarDetalle(detalle) {
  if (detalle === undefined || detalle === null) return undefined;
  if (detalle instanceof Error) {
    return {
      nombre: detalle.name,
      mensaje: detalle.message,
      codigo: detalle.code,
      razon: detalle.reason,
      datos: detalle.data,
      pila: detalle.stack?.split("\n").slice(0, 6).join("\n"),
    };
  }
  try {
    return JSON.parse(JSON.stringify(detalle, (_, valor) => (typeof valor === "bigint" ? valor.toString() : valor)));
  } catch {
    return String(detalle);
  }
}

function enviarAlColector(entrada) {
  const destino = CONFIG.diagnostico.endpointRemoto;
  if (!destino || entrada.nivel !== NIVELES.error || !navigator.sendBeacon) return;
  try {
    const cuerpo = JSON.stringify({ origen: window.location.pathname, entradas: [entrada] });
    navigator.sendBeacon(destino, new Blob([cuerpo], { type: "application/json" }));
  } catch {
    // el envío remoto es opcional; si falla queda el registro local
  }
}

export function anotarDiagnostico(nivel, modulo, mensaje, detalle) {
  const entrada = {
    fecha: new Date().toISOString(),
    nivel: NIVELES[nivel] ?? NIVELES.info,
    modulo,
    mensaje,
    pagina: window.location.pathname.split("/").pop() || "index.html",
    detalle: serializarDetalle(detalle),
  };
  entradas.push(entrada);
  while (entradas.length > CONFIG.diagnostico.maximoEntradas) entradas.shift();
  persistir();
  enviarAlColector(entrada);
  if (entrada.nivel === NIVELES.error) console.error(`[${modulo}] ${mensaje}`, detalle ?? "");
  suscriptores.forEach((notificar) => notificar(entrada));
  return entrada;
}

export const diagnostico = Object.freeze({
  info: (modulo, mensaje, detalle) => anotarDiagnostico("info", modulo, mensaje, detalle),
  advertencia: (modulo, mensaje, detalle) => anotarDiagnostico("advertencia", modulo, mensaje, detalle),
  error: (modulo, mensaje, detalle) => anotarDiagnostico("error", modulo, mensaje, detalle),
});

export function obtenerEntradasDiagnostico() {
  return [...entradas];
}

export function suscribirseADiagnostico(funcion) {
  suscriptores.add(funcion);
  return () => suscriptores.delete(funcion);
}

export function vaciarDiagnostico() {
  entradas.length = 0;
  persistir();
}

export function descargarDiagnostico() {
  const informe = {
    generado: new Date().toISOString(),
    aplicacion: CONFIG.nombreCompleto,
    red: { chainId: CONFIG.red.chainId, nombre: CONFIG.red.nombre },
    contrato: CONFIG.contrato.direccion,
    navegador: navigator.userAgent,
    entradas,
  };
  const archivo = new Blob([JSON.stringify(informe, null, 2)], { type: "application/json" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = `diagnostico-credenciales-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}

// Inicialización: recupera lo almacenado y captura errores no controlados.
entradas.push(...leerAlmacenadas().slice(-CONFIG.diagnostico.maximoEntradas));
window.addEventListener("error", (evento) => {
  anotarDiagnostico("error", "global", evento.message || "Error no controlado", {
    archivo: evento.filename,
    linea: evento.lineno,
    columna: evento.colno,
  });
});
window.addEventListener("unhandledrejection", (evento) => {
  anotarDiagnostico("error", "global", "Promesa rechazada sin manejar", evento.reason);
});
