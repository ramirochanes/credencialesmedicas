// Emisor · Gestionar credencial: carga una credencial por identificador y ofrece
// solo las acciones que el DTE permite en su estado vigente.
import { isAddress, getAddress } from "../../../vendor/ethers-6.17.0.min.js";
import { crearElementoSeguro } from "../../nucleo/dom-seguro.js";
import { extraerIdentificadorCredencial } from "../../nucleo/huella-documento.js";
import { leerFichaCredencial, leerInstitucion } from "../../nucleo/contrato-credenciales.js";
import { ESTADO, fechaInputASegundos } from "../../nucleo/formato-credencial.js";
import { crearResultadoEstado, crearFichaDatosCredencial } from "../../componentes/tarjeta-estado-credencial.js";
import { crearCredencialDigital } from "../../componentes/codigo-qr-credencial.js";
import { crearCampoReferenciaActo } from "../../componentes/campo-referencia-acto.js";
import { montarSelectorDocumento } from "../../componentes/selector-documento.js";
import { ejecutarTransaccionConInterfaz } from "../../componentes/ejecucion-transaccion.js";
import { confirmarAccion, mostrarAvisoEnPagina } from "../../componentes/avisos-interfaz.js";

/** Bloque genérico de acción: título, campos, botón, confirmación opcional y transacción. */
function crearBloqueAccion(sesion, alTerminar, opciones) {
  const { titulo, descripcion, campos = [], textoBoton, peligrosa, confirmacion, metodo, construirArgumentos, mensajeExito } = opciones;
  const avisos = crearElementoSeguro("div");
  const boton = crearElementoSeguro("button", { type: "button", clase: `boton ${peligrosa ? "boton--peligro" : "boton--primario"}`, texto: textoBoton });
  boton.addEventListener("click", async () => {
    let argumentos;
    try {
      argumentos = await construirArgumentos();
    } catch (error) {
      mostrarAvisoEnPagina(avisos, "error", "Revisá los datos", error.message);
      return;
    }
    if (confirmacion && !(await confirmarAccion({ ...confirmacion, peligrosa }))) return;
    const recibo = await ejecutarTransaccionConInterfaz({ boton, contenedorAvisos: avisos, firmante: sesion.firmante, metodo, argumentos, mensajeExito });
    if (recibo) alTerminar();
  });
  return crearElementoSeguro("fieldset", { clase: "grupo-campos" }, [
    crearElementoSeguro("legend", { texto: titulo }),
    descripcion ? crearElementoSeguro("p", { clase: "texto-chico texto-secundario", texto: descripcion }) : null,
    ...campos,
    avisos,
    boton,
  ]);
}

function crearAccionEmitir(sesion, idCredencial, alTerminar) {
  const contenedorDocumento = crearElementoSeguro("div");
  const selector = montarSelectorDocumento(contenedorDocumento, { titulo: "PDF de la credencial emitida" });
  const vencimiento = crearElementoSeguro("input", { type: "date", id: "emision-vencimiento", "aria-describedby": "emision-vencimiento-ayuda" });
  return crearBloqueAccion(sesion, alTerminar, {
    titulo: "Emitir y activar",
    descripcion: "Se ancla la huella SHA-256 del PDF final que se entrega al profesional. El archivo no sale de tu computadora.",
    campos: [
      contenedorDocumento,
      crearElementoSeguro("div", { clase: "campo" }, [
        crearElementoSeguro("label", { for: "emision-vencimiento", texto: "Vencimiento (opcional)" }),
        vencimiento,
        crearElementoSeguro("span", { id: "emision-vencimiento-ayuda", clase: "ayuda-campo", texto: "Vacío = sin vencimiento. Al llegar la fecha, la credencial pasa sola a Vencida." }),
      ]),
    ],
    textoBoton: "Emitir credencial",
    metodo: "emitirCredencialValidada",
    mensajeExito: "Credencial emitida y activa.",
    construirArgumentos: async () => {
      const huella = selector.huellaActual();
      if (!huella) throw new Error("Elegí el PDF de la credencial.");
      return [idCredencial, huella, fechaInputASegundos(vencimiento.value)];
    },
  });
}

function crearAccionConActo(sesion, idCredencial, alTerminar, { titulo, descripcion, textoBoton, metodo, mensajeExito, peligrosa, confirmacion }) {
  const acto = crearCampoReferenciaActo();
  return crearBloqueAccion(sesion, alTerminar, {
    titulo, descripcion, textoBoton, metodo, mensajeExito, peligrosa, confirmacion,
    campos: [acto.elemento],
    construirArgumentos: async () => [idCredencial, await acto.obtenerHuella()],
  });
}

function crearAccionAsignarWallet(sesion, idCredencial, alTerminar) {
  const campo = crearElementoSeguro("input", { type: "text", id: "asignar-wallet", spellcheck: "false", placeholder: "0x…" });
  return crearBloqueAccion(sesion, alTerminar, {
    titulo: "Vincular wallet del titular",
    descripcion: "Por ejemplo, si el profesional perdió el acceso a su wallet anterior.",
    campos: [crearElementoSeguro("div", { clase: "campo" }, [crearElementoSeguro("label", { for: "asignar-wallet", texto: "Dirección de la wallet" }), campo])],
    textoBoton: "Vincular wallet",
    metodo: "asignarCuentaTitular",
    mensajeExito: "Wallet del titular vinculada.",
    construirArgumentos: async () => {
      if (!isAddress(campo.value.trim())) throw new Error("La dirección de la wallet no es válida.");
      return [idCredencial, getAddress(campo.value.trim())];
    },
  });
}

function crearAccionesSegunEstado(sesion, ficha, alTerminar) {
  const id = ficha.id;
  const rechazo = () => crearAccionConActo(sesion, id, alTerminar, {
    titulo: "Rechazar solicitud", descripcion: "Camino de excepción: la solicitud no cumple los requisitos.",
    textoBoton: "Rechazar", metodo: "rechazarSolicitudCredencial", mensajeExito: "Solicitud rechazada.", peligrosa: true,
    confirmacion: { titulo: "¿Rechazar la solicitud?", texto: "Rechazada es un estado final: no se puede deshacer.", textoConfirmar: "Rechazar" },
  });
  const revocacion = () => crearAccionConActo(sesion, id, alTerminar, {
    titulo: "Revocar", descripcion: "Baja permanente de la credencial: no se puede reactivar.", textoBoton: "Revocar credencial",
    metodo: "revocarCredencial", mensajeExito: "Credencial revocada.", peligrosa: true,
    confirmacion: { titulo: "¿Revocar la credencial?", texto: "La revocación es irreversible y queda registrada para siempre.", textoConfirmar: "Revocar" },
  });
  switch (ficha.estadoVigente) {
    case ESTADO.Pendiente:
      return [
        crearBloqueAccion(sesion, alTerminar, {
          titulo: "Validar requisitos", descripcion: "Confirmás que la documentación del profesional fue revisada.",
          textoBoton: "Marcar como validada", metodo: "validarSolicitudCredencial", mensajeExito: "Solicitud validada.",
          construirArgumentos: async () => [id],
        }),
        rechazo(),
      ];
    case ESTADO.Validada:
      return [crearAccionEmitir(sesion, id, alTerminar), rechazo()];
    case ESTADO.Activa:
      return [
        crearAccionConActo(sesion, id, alTerminar, {
          titulo: "Suspender", descripcion: "Suspensión transitoria (por ejemplo, sanción o falta de pago).",
          textoBoton: "Suspender credencial", metodo: "suspenderCredencial", mensajeExito: "Credencial suspendida.",
        }),
        revocacion(),
        crearAccionAsignarWallet(sesion, id, alTerminar),
      ];
    case ESTADO.Suspendida:
      return [
        crearAccionConActo(sesion, id, alTerminar, {
          titulo: "Reactivar", descripcion: "Vuelve a estado Activa.", textoBoton: "Reactivar credencial",
          metodo: "reactivarCredencial", mensajeExito: "Credencial reactivada.",
        }),
        revocacion(),
        crearAccionAsignarWallet(sesion, id, alTerminar),
      ];
    case ESTADO.Vencida:
      return ficha.datos.estadoPersistido === ESTADO.Vencida
        ? []
        : [crearBloqueAccion(sesion, alTerminar, {
            titulo: "Asentar vencimiento", descripcion: "La credencial ya está vencida por fecha. Esto lo deja registrado en el historial.",
            textoBoton: "Asentar vencimiento", metodo: "registrarVencimientoCredencial", mensajeExito: "Vencimiento asentado.",
            construirArgumentos: async () => [id],
          })];
    default:
      return [];
  }
}

/** @returns {{elemento: HTMLElement, abrirCredencial: (id: string) => Promise<void>}} */
export function crearGestionCredencial(sesion) {
  const campo = crearElementoSeguro("input", { type: "search", id: "gestion-id", spellcheck: "false", placeholder: "0x… o link de verificación" });
  const avisos = crearElementoSeguro("div");
  const detalle = crearElementoSeguro("div", { "aria-live": "polite" });

  async function abrirCredencial(texto) {
    const id = extraerIdentificadorCredencial(texto);
    campo.value = id ?? texto;
    if (!id) {
      mostrarAvisoEnPagina(avisos, "error", "Identificador inválido", "Pegá el identificador (0x + 64 caracteres) o el link de verificación.");
      return;
    }
    avisos.replaceChildren();
    detalle.replaceChildren(crearElementoSeguro("p", { role: "status", texto: "Consultando…" }));
    try {
      const ficha = await leerFichaCredencial(id);
      const institucion = await leerInstitucion(ficha.datos.institucionEmisora);
      const propia = ficha.datos.institucionEmisora === sesion.contexto.idInstitucion;
      const acciones = propia ? crearAccionesSegunEstado(sesion, ficha, () => abrirCredencial(id)) : [];
      detalle.replaceChildren(
        crearResultadoEstado(ficha, institucion),
        ficha.estadoVigente === ESTADO.Inexistente ? null : crearElementoSeguro("div", { clase: "grilla-dos-columnas" }, [
          crearElementoSeguro("div", {}, [
            crearElementoSeguro("h3", { texto: "Acciones disponibles" }),
            ...(acciones.length ? acciones : [crearElementoSeguro("p", { clase: "texto-secundario", texto: propia ? "Estado final: no admite más cambios." : "Esta credencial la emitió otra institución: solo podés consultarla." })]),
          ]),
          crearElementoSeguro("div", {}, [
            crearFichaDatosCredencial(ficha),
            ficha.estadoVigente === ESTADO.Activa ? crearElementoSeguro("div", { clase: "grupo-botones" }, [crearCredencialDigital(ficha, institucion)]) : null,
          ]),
        ]),
      );
    } catch (error) {
      detalle.replaceChildren();
      mostrarAvisoEnPagina(avisos, "error", "No se pudo cargar la credencial", error.message);
    }
  }

  const formulario = crearElementoSeguro("form", { clase: "campo", novalidate: true, onsubmit: (evento) => { evento.preventDefault(); abrirCredencial(campo.value); } }, [
    crearElementoSeguro("label", { for: "gestion-id", texto: "Identificador de la credencial" }),
    crearElementoSeguro("div", { clase: "busqueda-credencial" }, [campo, crearElementoSeguro("button", { type: "submit", clase: "boton boton--primario", texto: "Cargar" })]),
  ]);
  return { elemento: crearElementoSeguro("div", {}, [formulario, avisos, detalle]), abrirCredencial };
}
