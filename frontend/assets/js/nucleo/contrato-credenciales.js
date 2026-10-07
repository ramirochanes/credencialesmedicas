// Acceso al contrato RegistroCredencialesMedicas: lecturas normalizadas (sin costo)
// y envío de transacciones con decodificación de errores y registro de diagnóstico.
import { Contract } from "../../vendor/ethers-6.17.0.min.js";
import { ABI_REGISTRO_CREDENCIALES } from "./abi-registro-credenciales.js";
import { direccionContrato, contratoConfigurado } from "./configuracion.js";
import { obtenerProveedorLectura } from "./red-blockchain.js";
import { explicarErrorContrato, ErrorOperacion } from "./errores-contrato.js";
import { diagnostico } from "./registro-diagnostico.js";

const cacheInstituciones = new Map();

export class ErrorConfiguracion extends Error {}

function exigirContratoConfigurado() {
  if (!contratoConfigurado()) {
    throw new ErrorConfiguracion("El sitio todavía no tiene configurada la dirección del contrato (config/config.js).");
  }
}

export async function obtenerContratoLectura() {
  exigirContratoConfigurado();
  return new Contract(direccionContrato(), ABI_REGISTRO_CREDENCIALES, await obtenerProveedorLectura());
}

export function obtenerContratoEscritura(firmante) {
  exigirContratoConfigurado();
  return new Contract(direccionContrato(), ABI_REGISTRO_CREDENCIALES, firmante);
}

// ── Normalizadores (bigint → number donde corresponde) ───────────────────
function normalizarCredencial(datos) {
  return {
    hashDocumento: datos.hashDocumento,
    referenciaInterna: datos.referenciaInterna,
    cuentaTitular: datos.cuentaTitular,
    solicitadaEl: Number(datos.solicitadaEl),
    emitidaEl: Number(datos.emitidaEl),
    venceEl: Number(datos.venceEl),
    actualizadaEl: Number(datos.actualizadaEl),
    institucionEmisora: Number(datos.institucionEmisora),
    tipo: Number(datos.tipo),
    estadoPersistido: Number(datos.estado),
    cargaInicial: datos.cargaInicial,
  };
}

function normalizarInstitucion(id, datos) {
  return {
    id: Number(id),
    nombre: datos.nombre,
    jurisdiccion: datos.jurisdiccion,
    tipo: Number(datos.tipo),
    tiposCredencialHabilitados: Number(datos.tiposCredencialHabilitados),
    habilitada: datos.habilitada,
    altaEl: Number(datos.altaEl),
  };
}

// ── Lecturas ─────────────────────────────────────────────────────────────
export async function leerFichaCredencial(idCredencial) {
  const contrato = await obtenerContratoLectura();
  const [resultado, bloque] = await Promise.all([
    contrato.obtenerCredencial(idCredencial),
    contrato.runner.provider.getBlockNumber(),
  ]);
  return {
    id: idCredencial,
    datos: normalizarCredencial(resultado.datos),
    estadoVigente: Number(resultado.estadoVigente),
    consultadaEnBloque: bloque,
    consultadaEl: Math.floor(Date.now() / 1000),
  };
}

export async function leerInstitucion(idInstitucion) {
  const id = Number(idInstitucion);
  if (!id) return null;
  if (!cacheInstituciones.has(id)) {
    const contrato = await obtenerContratoLectura();
    cacheInstituciones.set(id, normalizarInstitucion(id, await contrato.obtenerInstitucion(id)));
  }
  return cacheInstituciones.get(id);
}

export async function listarInstituciones({ refrescar = false } = {}) {
  if (refrescar) cacheInstituciones.clear();
  const contrato = await obtenerContratoLectura();
  const cantidad = Number(await contrato.cantidadInstituciones());
  const ids = Array.from({ length: cantidad }, (_, i) => i + 1);
  return Promise.all(ids.map((id) => leerInstitucion(id)));
}

export async function leerHistorialCredencial(idCredencial) {
  const contrato = await obtenerContratoLectura();
  const eventos = await contrato.obtenerHistorialCredencial(idCredencial);
  return eventos.map((evento) => ({
    fecha: Number(evento.fecha),
    institucion: Number(evento.institucion),
    accion: Number(evento.accion),
    estadoResultante: Number(evento.estadoResultante),
    operador: evento.operador,
    referenciaActo: evento.referenciaActo,
  }));
}

export async function leerVerificacionesCredencial(idCredencial, maximo = 20) {
  const contrato = await obtenerContratoLectura();
  const total = Number(await contrato.cantidadVerificacionesCredencial(idCredencial));
  const desde = Math.max(0, total - maximo);
  const pagina = total ? await contrato.obtenerVerificacionesCredencial(idCredencial, desde, maximo) : [];
  const verificaciones = pagina.map((verificacion) => ({
    fecha: Number(verificacion.fecha),
    institucionVerificadora: Number(verificacion.institucionVerificadora),
    estadoObservado: Number(verificacion.estadoObservado),
    operador: verificacion.operador,
  }));
  return { total, verificaciones: verificaciones.reverse() };
}

export async function leerAntecedentesCredencial(idCredencial) {
  const contrato = await obtenerContratoLectura();
  const antecedentes = await contrato.obtenerAntecedentesCredencial(idCredencial);
  return antecedentes.map((antecedente, indice) => ({
    indice,
    hashEvidencia: antecedente.hashEvidencia,
    declaradoEl: Number(antecedente.declaradoEl),
    retirado: antecedente.retirado,
    descripcion: antecedente.descripcion,
  }));
}

export async function buscarCredencialPorHuella(hashDocumento) {
  const contrato = await obtenerContratoLectura();
  const id = await contrato.buscarCredencialPorHashDocumento(hashDocumento);
  return /^0x0+$/.test(id) ? null : id;
}

export async function contrastarDocumentoConCredencial(idCredencial, hashDocumento) {
  const contrato = await obtenerContratoLectura();
  const resultado = await contrato.contrastarDocumento(idCredencial, hashDocumento);
  return { coincide: resultado.coincide, estadoVigente: Number(resultado.estadoVigente) };
}

export async function leerCredencialesDeCuentaTitular(cuenta) {
  const contrato = await obtenerContratoLectura();
  const ids = [...new Set(await contrato.obtenerCredencialesDeTitular(cuenta))];
  const fichas = await Promise.all(ids.map((id) => leerFichaCredencial(id)));
  // índice de solo agregado: se descartan las que hoy pertenecen a otra wallet
  return fichas.filter((ficha) => ficha.datos.cuentaTitular.toLowerCase() === cuenta.toLowerCase());
}

export async function leerContextoCuenta(cuenta) {
  const contrato = await obtenerContratoLectura();
  const [idInstitucion, rolAdmin, rolGuardian, enPausa] = await Promise.all([
    contrato.institucionDeCuenta(cuenta),
    contrato.DEFAULT_ADMIN_ROLE(),
    contrato.ROL_GUARDIAN_PAUSA(),
    contrato.paused(),
  ]);
  const [esGobernanza, esGuardian] = await Promise.all([
    contrato.hasRole(rolAdmin, cuenta),
    contrato.hasRole(rolGuardian, cuenta),
  ]);
  const institucion = await leerInstitucion(idInstitucion);
  return { idInstitucion: Number(idInstitucion), institucion, esGobernanza, esGuardian, enPausa };
}

// ── Escritura ────────────────────────────────────────────────────────────
/**
 * Envía una transacción: primero estima gas (detecta el error antes de abrir la billetera),
 * después firma, espera la confirmación y registra todo en el diagnóstico.
 */
export async function ejecutarTransaccionRegistro(firmante, metodo, argumentos, { alEnviar } = {}) {
  const contrato = obtenerContratoEscritura(firmante);
  diagnostico.info("transaccion", `Preparando ${metodo}`, { argumentos });
  try {
    await contrato[metodo].estimateGas(...argumentos);
    const transaccion = await contrato[metodo](...argumentos);
    diagnostico.info("transaccion", `Enviada ${metodo}`, { hash: transaccion.hash });
    alEnviar?.(transaccion.hash);
    const recibo = await transaccion.wait();
    if (recibo?.status !== 1) throw new Error("La red revirtió la transacción.");
    diagnostico.info("transaccion", `Confirmada ${metodo}`, {
      hash: recibo.hash,
      bloque: recibo.blockNumber,
      gasUsado: recibo.gasUsed,
    });
    cacheInstituciones.clear();
    return recibo;
  } catch (error) {
    const explicacion = explicarErrorContrato(error, contrato.interface);
    diagnostico.error("transaccion", `Falló ${metodo}: ${explicacion.mensaje}`, {
      metodo,
      error: explicacion.nombre,
      argumentosError: explicacion.argumentos,
      original: error?.shortMessage ?? error?.message,
    });
    throw new ErrorOperacion(explicacion.mensaje, explicacion.nombre, error);
  }
}
