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
  const selector = montarSelectorDocumento(contenedorDocumento, { titulo: "PDF de la matrícula" });
  const vencimiento = crearElementoSeguro("input", { type: "date", id: "emision-vencimiento", "aria-describedby": "emision-vencimiento-ayuda" });
  return crearBloqueAccion(sesion, alTerminar, {
    titulo: "Otorgar la matrícula",
    descripcion: "Elegí el PDF que se le entrega al médico. Se guarda solo su huella: el archivo no sale de tu computadora.",
    campos: [
      contenedorDocumento,
      crearElementoSeguro("div", { clase: "campo" }, [
        crearElementoSeguro("label", { for: "emision-vencimiento", texto: "Vencimiento (opcional)" }),
        vencimiento,
        crearElementoSeguro("span", { id: "emision-vencimiento-ayuda", clase: "ayuda-campo", texto: "Si lo dejás vacío, no vence. Al llegar la fecha, pasa sola a Vencida." }),
      ]),
    ],
    textoBoton: "Otorgar matrícula",
    metodo: "emitirCredencialValidada",
    mensajeExito: "Matrícula otorgada: ya está vigente.",
    construirArgumentos: async () => {
      const huella = selector.huellaActual();
      if (!huella) throw new Error("Elegí el PDF de la matrícula.");
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
    titulo: "Asociar la cuenta del médico",
    descripcion: "Por ejemplo, si el médico cambió de cuenta.",
    campos: [crearElementoSeguro("div", { clase: "campo" }, [crearElementoSeguro("label", { for: "asignar-wallet", texto: "Número de cuenta (0x…)" }), campo])],
    textoBoton: "Asociar cuenta",
    metodo: "asignarCuentaTitular",
    mensajeExito: "Cuenta del médico asociada.",
    construirArgumentos: async () => {
      if (!isAddress(campo.value.trim())) throw new Error("El número de cuenta no es válido.");
      return [idCredencial, getAddress(campo.value.trim())];
    },
  });
}

function crearAccionesSegunEstado(sesion, ficha, alTerminar) {
  const id = ficha.id;
  const rechazo = () => crearAccionConActo(sesion, id, alTerminar, {
    titulo: "Rechazar el pedido", descripcion: "Si la documentación no cumple los requisitos.",
    textoBoton: "Rechazar", metodo: "rechazarSolicitudCredencial", mensajeExito: "Pedido rechazado.", peligrosa: true,
    confirmacion: { titulo: "¿Rechazar el pedido?", texto: "Un pedido rechazado no se puede reabrir.", textoConfirmar: "Rechazar" },
  });
  const revocacion = () => crearAccionConActo(sesion, id, alTerminar, {
    titulo: "Dar de baja", descripcion: "Baja permanente: no se puede volver a habilitar.", textoBoton: "Dar de baja",
    metodo: "revocarCredencial", mensajeExito: "Matrícula dada de baja.", peligrosa: true,
    confirmacion: { titulo: "¿Dar de baja la matrícula?", texto: "No se puede deshacer y queda registrado para siempre.", textoConfirmar: "Dar de baja" },
  });
  switch (ficha.estadoVigente) {
    case ESTADO.Pendiente:
      return [
        crearBloqueAccion(sesion, alTerminar, {
          titulo: "Revisión de papeles", descripcion: "Confirmás que revisaste la documentación del médico.",
          textoBoton: "Papeles revisados", metodo: "validarSolicitudCredencial", mensajeExito: "Papeles revisados.",
          construirArgumentos: async () => [id],
        }),
        rechazo(),
      ];
    case ESTADO.Validada:
      return [crearAccionEmitir(sesion, id, alTerminar), rechazo()];
    case ESTADO.Activa:
      return [
        crearAccionConActo(sesion, id, alTerminar, {
          titulo: "Suspender", descripcion: "Por un tiempo (por ejemplo, una sanción).",
          textoBoton: "Suspender matrícula", metodo: "suspenderCredencial", mensajeExito: "Matrícula suspendida.",
        }),
        revocacion(),
        crearAccionAsignarWallet(sesion, id, alTerminar),
      ];
    case ESTADO.Suspendida:
      return [
        crearAccionConActo(sesion, id, alTerminar, {
          titulo: "Volver a habilitar", descripcion: "Vuelve a estar vigente.", textoBoton: "Volver a habilitar",
          metodo: "reactivarCredencial", mensajeExito: "Matrícula habilitada de nuevo.",
        }),
        revocacion(),
        crearAccionAsignarWallet(sesion, id, alTerminar),
      ];
    case ESTADO.Vencida:
      return ficha.datos.estadoPersistido === ESTADO.Vencida
        ? []
        : [crearBloqueAccion(sesion, alTerminar, {
            titulo: "Asentar vencimiento", descripcion: "Ya venció por fecha. Esto lo deja anotado en el historial.",
            textoBoton: "Asentar vencimiento", metodo: "registrarVencimientoCredencial", mensajeExito: "Vencimiento asentado.",
            construirArgumentos: async () => [id],
          })];
    default:
      return [];
  }
}

/** @returns {{elemento: HTMLElement, abrirCredencial: (id: string) => Promise<void>}} */
export function crearGestionCredencial(sesion) {
  const campo = crearElementoSeguro("input", { type: "search", id: "gestion-id", spellcheck: "false", placeholder: "Código o link de la matrícula" });
  const avisos = crearElementoSeguro("div");
  const detalle = crearElementoSeguro("div", { "aria-live": "polite" });

  async function abrirCredencial(texto) {
    const id = extraerIdentificadorCredencial(texto);
    campo.value = id ?? texto;
    if (!id) {
      mostrarAvisoEnPagina(avisos, "error", "No reconocemos ese código", "Pegá el código o el link completo de la matrícula.");
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
            crearElementoSeguro("h3", { texto: "Qué podés hacer ahora" }),
            ...(acciones.length ? acciones : [crearElementoSeguro("p", { clase: "texto-secundario", texto: propia ? "No admite más cambios." : "Esta matrícula la otorgó otra institución: solo podés consultarla." })]),
          ]),
          crearElementoSeguro("div", {}, [
            crearFichaDatosCredencial(ficha),
            ficha.estadoVigente === ESTADO.Activa ? crearElementoSeguro("div", { clase: "grupo-botones" }, [crearCredencialDigital(ficha, institucion)]) : null,
          ]),
        ]),
      );
    } catch (error) {
      detalle.replaceChildren();
      mostrarAvisoEnPagina(avisos, "error", "No se pudo cargar la matrícula", error.message);
    }
  }

  const formulario = crearElementoSeguro("form", { clase: "campo", novalidate: true, onsubmit: (evento) => { evento.preventDefault(); abrirCredencial(campo.value); } }, [
    crearElementoSeguro("label", { for: "gestion-id", texto: "Código de la matrícula" }),
    crearElementoSeguro("div", { clase: "busqueda-credencial" }, [campo, crearElementoSeguro("button", { type: "submit", clase: "boton boton--primario", texto: "Buscar" })]),
  ]);
  return { elemento: crearElementoSeguro("div", {}, [formulario, avisos, detalle]), abrirCredencial };
}
