// Feedback al usuario: notificaciones flotantes, avisos en página, confirmación de
// acciones irreversibles y estado "ocupado" de botones.
import { crearElementoSeguro } from "../nucleo/dom-seguro.js";

const DURACION_NOTIFICACION_MS = 5000;
let contenedorNotificaciones = null;

function obtenerContenedorNotificaciones() {
  if (!contenedorNotificaciones) {
    contenedorNotificaciones = crearElementoSeguro("div", {
      clase: "contenedor-notificaciones",
      role: "status",
      "aria-live": "polite",
    });
    document.body.append(contenedorNotificaciones);
  }
  return contenedorNotificaciones;
}

/** @param {"exito"|"error"|"info"} tipo */
export function mostrarNotificacion(mensaje, tipo = "info", { enlace, textoEnlace } = {}) {
  const notificacion = crearElementoSeguro("div", { clase: `notificacion notificacion--${tipo}` }, [
    mensaje,
    enlace ? " " : null,
    enlace ? crearElementoSeguro("a", { href: enlace, target: "_blank", rel: "noopener", texto: textoEnlace ?? "Ver" }) : null,
  ]);
  obtenerContenedorNotificaciones().append(notificacion);
  setTimeout(() => notificacion.remove(), tipo === "error" ? DURACION_NOTIFICACION_MS * 2 : DURACION_NOTIFICACION_MS);
}

/**
 * Aviso persistente dentro de un contenedor (los errores quedan hasta que el usuario los cierra).
 * @param {"info"|"exito"|"error"|"advertencia"} tipo
 */
export function mostrarAvisoEnPagina(contenedor, tipo, titulo, detalle) {
  const aviso = crearElementoSeguro("div", { clase: `aviso aviso--${tipo}`, role: tipo === "error" ? "alert" : "status" }, [
    crearElementoSeguro("div", {}, [
      crearElementoSeguro("strong", { texto: titulo }),
      detalle ? crearElementoSeguro("p", { texto: detalle }) : null,
    ]),
  ]);
  if (tipo === "error" || tipo === "advertencia") {
    aviso.append(
      crearElementoSeguro("button", {
        type: "button",
        clase: "aviso__cerrar",
        "aria-label": "Cerrar aviso",
        texto: "×",
        onclick: () => aviso.remove(),
      }),
    );
  }
  contenedor.replaceChildren(aviso);
  return aviso;
}

/**
 * Diálogo de confirmación accesible (atrapa el foco, Escape cancela).
 * @returns {Promise<boolean>}
 */
export function confirmarAccion({ titulo, texto, textoConfirmar = "Confirmar", peligrosa = false }) {
  return new Promise((resolver) => {
    const botonCancelar = crearElementoSeguro("button", { type: "button", clase: "boton boton--secundario", texto: "Cancelar" });
    const botonConfirmar = crearElementoSeguro("button", {
      type: "button",
      clase: `boton ${peligrosa ? "boton--peligro" : "boton--primario"}`,
      texto: textoConfirmar,
    });
    const dialogo = crearElementoSeguro("dialog", { clase: "dialogo", "aria-labelledby": "titulo-confirmacion" }, [
      crearElementoSeguro("div", { clase: "dialogo__cuerpo" }, [
        crearElementoSeguro("h2", { id: "titulo-confirmacion", texto: titulo }),
        crearElementoSeguro("p", { texto }),
      ]),
      crearElementoSeguro("div", { clase: "dialogo__acciones" }, [botonCancelar, botonConfirmar]),
    ]);
    const cerrar = (respuesta) => {
      dialogo.close();
      dialogo.remove();
      resolver(respuesta);
    };
    botonCancelar.addEventListener("click", () => cerrar(false));
    botonConfirmar.addEventListener("click", () => cerrar(true));
    dialogo.addEventListener("cancel", (evento) => {
      evento.preventDefault();
      cerrar(false);
    });
    document.body.append(dialogo);
    dialogo.showModal();
    botonCancelar.focus();
  });
}

/** Deshabilita el botón y muestra el indicador mientras corre una operación. */
export function marcarBotonOcupado(boton, ocupado, textoOcupado = "Procesando…") {
  if (ocupado) {
    boton.dataset.textoOriginal = boton.textContent;
    boton.textContent = textoOcupado;
    boton.disabled = true;
    boton.setAttribute("aria-busy", "true");
  } else {
    boton.textContent = boton.dataset.textoOriginal ?? boton.textContent;
    boton.disabled = false;
    boton.removeAttribute("aria-busy");
  }
}

/** Ejecuta una operación asíncrona con el botón ocupado y errores mostrados en pantalla. */
export async function ejecutarConBotonOcupado(boton, contenedorAvisos, operacion, textoOcupado) {
  marcarBotonOcupado(boton, true, textoOcupado);
  try {
    return await operacion();
  } catch (error) {
    mostrarAvisoEnPagina(contenedorAvisos, "error", "No se pudo completar la operación", error.message);
    return undefined;
  } finally {
    marcarBotonOcupado(boton, false);
  }
}
