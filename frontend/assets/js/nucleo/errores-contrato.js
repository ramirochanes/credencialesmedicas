// Traduce errores del contrato, de la billetera y de la red a mensajes claros.
const MENSAJES_ERROR_CONTRATO = Object.freeze({
  CuentaInvalida: "La dirección de cuenta no es válida para esta operación.",
  TextoInstitucionInvalido: "El nombre o la jurisdicción de la institución están vacíos o son demasiado largos.",
  TipoInstitucionInvalido: "Elegí la naturaleza de la institución.",
  MascaraTiposInvalida: "Los tipos de credencial no corresponden a la naturaleza de la institución.",
  InstitucionInexistente: "La institución indicada no existe en el padrón.",
  InstitucionNoHabilitada: "La institución de esta cuenta está deshabilitada en el padrón.",
  CuentaYaVinculada: "Esa cuenta ya opera para otra institución. Primero hay que desvincularla.",
  CuentaSinInstitucion: "Esta cuenta no está vinculada a ninguna institución del padrón.",
  IdentificadorCredencialInvalido: "El identificador de la credencial no es válido.",
  CredencialYaRegistrada: "Ya existe una credencial con ese identificador.",
  CredencialInexistente: "No existe una credencial con ese identificador.",
  TipoCredencialInvalido: "Elegí un tipo de credencial.",
  TipoCredencialNoHabilitado: "Tu institución no está habilitada para emitir ese tipo de credencial.",
  OperadorDeOtraInstitucion: "La credencial pertenece a otra institución: solo su emisora puede modificarla.",
  TransicionNoPermitida: "Esa acción no está permitida en el estado actual de la credencial.",
  HashDocumentoInvalido: "Falta el documento (su huella digital).",
  HashDocumentoYaAnclado: "Ese documento ya está anclado en otra credencial.",
  VencimientoInvalido: "La fecha de vencimiento tiene que ser posterior a hoy.",
  FechaEmisionInvalida: "La fecha de emisión original no puede ser futura ni estar vacía.",
  ReferenciaActoRequerida: "Indicá el acto administrativo que respalda el cambio.",
  CredencialNoVencida: "La credencial todavía no llegó a su fecha de vencimiento.",
  CredencialNoOperativa: "La credencial no está activa para esta operación.",
  LoteInvalido: "El lote tiene que tener entre 1 y 50 credenciales.",
  SoloCuentaTitular: "Solo la cuenta del titular de la credencial puede hacer esto.",
  DescripcionAntecedenteInvalida: "La descripción del antecedente tiene que tener entre 1 y 140 caracteres.",
  LimiteAntecedentesAlcanzado: "La credencial alcanzó el máximo de antecedentes autodeclarados.",
  AntecedenteInexistente: "El antecedente indicado no existe.",
  AntecedenteYaRetirado: "Ese antecedente ya fue retirado.",
  AccessControlUnauthorizedAccount: "Tu cuenta no tiene el rol necesario para esta operación.",
  EnforcedPause: "El registro está en pausa de emergencia. Las operaciones de escritura están bloqueadas.",
  ExpectedPause: "El registro no está en pausa.",
});

export class ErrorOperacion extends Error {
  constructor(mensaje, nombreError, original) {
    super(mensaje);
    this.name = "ErrorOperacion";
    this.nombreError = nombreError;
    this.original = original;
  }
}

function buscarDatosRevert(error) {
  const candidatos = [error?.data, error?.info?.error?.data, error?.error?.data, error?.info?.error?.data?.data];
  return candidatos.find((valor) => typeof valor === "string" && valor.startsWith("0x") && valor.length >= 10);
}

/**
 * @returns {{nombre: string, mensaje: string, argumentos?: unknown[]}}
 */
export function explicarErrorContrato(error, interfazContrato) {
  if (error?.code === "ACTION_REJECTED" || error?.code === 4001 || error?.info?.error?.code === 4001) {
    return { nombre: "RechazadaPorUsuario", mensaje: "Cancelaste la operación en la billetera." };
  }
  if (error?.code === "INSUFFICIENT_FUNDS") {
    return { nombre: "FondosInsuficientes", mensaje: "La cuenta no tiene POL suficiente para pagar el gas de la red." };
  }
  let decodificado = error?.revert?.name ? error.revert : null;
  if (!decodificado && interfazContrato) {
    const datos = buscarDatosRevert(error);
    if (datos) {
      try {
        decodificado = interfazContrato.parseError(datos);
      } catch {
        decodificado = null;
      }
    }
  }
  if (decodificado?.name) {
    return {
      nombre: decodificado.name,
      mensaje: MENSAJES_ERROR_CONTRATO[decodificado.name] ?? `El contrato rechazó la operación (${decodificado.name}).`,
      argumentos: decodificado.args ? [...decodificado.args] : undefined,
    };
  }
  if (error?.code === "NETWORK_ERROR" || error?.code === "TIMEOUT" || error?.code === "SERVER_ERROR") {
    return { nombre: "ErrorRed", mensaje: "No hubo respuesta de la red. Reintentá en unos segundos." };
  }
  return { nombre: error?.code ?? "Desconocido", mensaje: error?.shortMessage ?? error?.message ?? "Error inesperado." };
}
