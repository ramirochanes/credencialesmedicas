// Etiquetas legibles para los enums del contrato y formatos de fecha/dirección.
// El orden de cada lista replica exactamente el enum de src/tipos/TiposCredencialMedica.sol.

export const ESTADOS_CREDENCIAL = Object.freeze([
  { clave: "inexistente", nombre: "No registrada", explicacion: "No hay ninguna matrícula con ese código en el registro." },
  { clave: "pendiente", nombre: "Pendiente", explicacion: "La institución recibió el pedido y todavía no revisó los papeles." },
  { clave: "validada", nombre: "En trámite", explicacion: "La institución revisó los papeles, pero todavía no la otorgó." },
  { clave: "activa", nombre: "Vigente", explicacion: "La otorgó una institución autorizada y es válida hoy." },
  { clave: "suspendida", nombre: "Suspendida", explicacion: "La institución la suspendió por un tiempo. Mientras dure la suspensión, no habilita a ejercer." },
  { clave: "vencida", nombre: "Vencida", explicacion: "Pasó su fecha de vencimiento. Ya no es válida." },
  { clave: "revocada", nombre: "Dada de baja", explicacion: "La institución la dio de baja. No es válida." },
  { clave: "rechazada", nombre: "Rechazada", explicacion: "La institución rechazó el pedido." },
]);

export const ESTADO = Object.freeze({
  Inexistente: 0, Pendiente: 1, Validada: 2, Activa: 3, Suspendida: 4, Vencida: 5, Revocada: 6, Rechazada: 7,
});

export const TIPOS_CREDENCIAL = Object.freeze([
  "Sin definir", "Título universitario", "Matrícula del colegio", "Matrícula del ministerio", "Especialidad",
]);

export const TIPOS_INSTITUCION = Object.freeze([
  "Sin definir", "Universidad", "Colegio médico", "Ministerio de Salud", "Hospital o clínica",
]);

export const ACCIONES_CREDENCIAL = Object.freeze([
  "Pedido recibido", "Papeles revisados", "Pedido rechazado", "Otorgada", "Otorgada (antes de sumarse al registro)", "Suspendida", "Habilitada de nuevo", "Vencida", "Dada de baja",
]);

const formatoFechaHora = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });
const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });

export function datosEstado(numeroEstado) {
  return ESTADOS_CREDENCIAL[Number(numeroEstado)] ?? ESTADOS_CREDENCIAL[0];
}

export function claseCssEstado(numeroEstado) {
  return `estado--${datosEstado(numeroEstado).clave}`;
}

export function formatearFechaHora(segundosUnix) {
  const segundos = Number(segundosUnix);
  return segundos ? formatoFechaHora.format(new Date(segundos * 1000)) : "—";
}

export function formatearFecha(segundosUnix) {
  const segundos = Number(segundosUnix);
  return segundos ? formatoFecha.format(new Date(segundos * 1000)) : "—";
}

export function acortarHexadecimal(valor, inicio = 8, fin = 6) {
  const texto = String(valor ?? "");
  return texto.length > inicio + fin + 3 ? `${texto.slice(0, inicio)}…${texto.slice(-fin)}` : texto;
}

export function tiposDeMascara(mascara) {
  return [1, 2, 3, 4].filter((tipo) => (Number(mascara) & (1 << tipo)) !== 0);
}

export function nombreTipoCredencial(tipo) {
  return TIPOS_CREDENCIAL[Number(tipo)] ?? TIPOS_CREDENCIAL[0];
}

export function nombreTipoInstitucion(tipo) {
  return TIPOS_INSTITUCION[Number(tipo)] ?? TIPOS_INSTITUCION[0];
}

/** Convierte "AAAA-MM-DD" (input date) a segundos Unix al final de ese día en hora local. */
export function fechaInputASegundos(valorFecha) {
  if (!valorFecha) return 0;
  const [anio, mes, dia] = valorFecha.split("-").map(Number);
  return Math.floor(new Date(anio, mes - 1, dia, 23, 59, 59).getTime() / 1000);
}
