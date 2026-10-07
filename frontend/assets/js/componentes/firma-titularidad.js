// Lado titular de la prueba de titularidad: ingresa el código del verificador,
// firma con su wallet y muestra el QR (o el link) con la respuesta.
import { crearElementoSeguro, crearValorCopiable } from "../nucleo/dom-seguro.js";
import { formatearFechaHora } from "../nucleo/formato-credencial.js";
import { CONFIG } from "../nucleo/configuracion.js";
import { esCodigoDesafio, firmarPruebaTitularidad, urlRespuestaTitularidad } from "../nucleo/prueba-titularidad.js";
import { crearSvgQr } from "./codigo-qr-credencial.js";
import { marcarBotonOcupado, mostrarAvisoEnPagina } from "./avisos-interfaz.js";
import { diagnostico } from "../nucleo/registro-diagnostico.js";

export function crearFormularioFirmaTitularidad(sesion, ficha) {
  const idCampo = `codigo-titularidad-${ficha.id.slice(2, 10)}`;
  const codigo = crearElementoSeguro("input", {
    type: "text",
    id: idCampo,
    inputmode: "numeric",
    autocomplete: "one-time-code",
    maxlength: "6",
    placeholder: "000000",
    "aria-describedby": `${idCampo}-ayuda`,
  });
  const avisos = crearElementoSeguro("div");
  const resultado = crearElementoSeguro("div", { "aria-live": "polite" });
  const boton = crearElementoSeguro("button", { type: "submit", clase: "boton boton--turquesa", texto: "Confirmar que soy yo" });

  const formulario = crearElementoSeguro("form", { novalidate: true }, [
    crearElementoSeguro("div", { clase: "campo" }, [
      crearElementoSeguro("label", { for: idCampo, texto: "Código que te dio quien verifica" }),
      codigo,
      crearElementoSeguro("span", {
        id: `${idCampo}-ayuda`,
        clase: "ayuda-campo",
        texto: "Esto demuestra que la matrícula es tuya. No tiene costo.",
      }),
    ]),
    avisos,
    boton,
    resultado,
  ]);

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const valor = codigo.value.trim();
    if (!esCodigoDesafio(valor)) {
      codigo.setAttribute("aria-invalid", "true");
      mostrarAvisoEnPagina(avisos, "error", "El código tiene que tener 6 dígitos");
      codigo.focus();
      return;
    }
    codigo.removeAttribute("aria-invalid");
    avisos.replaceChildren();
    marcarBotonOcupado(boton, true, "Confirmá en tu billetera…");
    try {
      const respuesta = await firmarPruebaTitularidad(sesion.firmante, ficha.id, valor);
      const enlace = urlRespuestaTitularidad(ficha.id, respuesta);
      const minutos = Math.round((CONFIG.pruebaTitularidad?.vigenciaSegundos ?? 600) / 60);
      resultado.replaceChildren(
        crearElementoSeguro("div", { clase: "respuesta-titularidad" }, [
          crearElementoSeguro("div", { clase: "respuesta-titularidad__qr" }, [crearSvgQr(enlace, "Código QR con la prueba de titularidad")]),
          crearElementoSeguro("div", {}, [
            crearElementoSeguro("strong", { texto: `Código ${valor} confirmado` }),
            crearElementoSeguro("p", {
              clase: "texto-chico",
              texto: `Mostrale este QR a quien verifica, o mandale el link. Vale ${minutos} minutos, hasta ${formatearFechaHora(respuesta.fechaSegundos + minutos * 60)}.`,
            }),
            crearValorCopiable(enlace, "Copiar link de la prueba"),
          ]),
        ]),
      );
    } catch (error) {
      const rechazada = error?.code === "ACTION_REJECTED" || error?.code === 4001;
      diagnostico.advertencia("titularidad", "No se firmó la prueba de titularidad", error);
      mostrarAvisoEnPagina(avisos, "error", rechazada ? "Cancelaste la confirmación" : "No se pudo confirmar", rechazada ? undefined : error.message);
    } finally {
      marcarBotonOcupado(boton, false);
    }
  });

  return crearElementoSeguro("fieldset", { clase: "grupo-campos" }, [
    crearElementoSeguro("legend", { texto: "Demostrar que la matrícula es mía" }),
    crearElementoSeguro("p", {
      clase: "texto-chico texto-secundario",
      texto: "Si un hospital necesita comprobar que esta matrícula es tuya (por ejemplo, antes de una guardia), te va a dar un código de 6 números. Escribilo acá.",
    }),
    formulario,
  ]);
}
