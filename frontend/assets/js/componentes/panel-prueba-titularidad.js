// Lado verificador de la prueba de titularidad: genera el código, recibe la
// respuesta (QR escaneado o link pegado) y muestra si firmó la wallet del titular.
import { crearElementoSeguro } from "../nucleo/dom-seguro.js";
import { ESTADO, acortarHexadecimal, formatearFechaHora } from "../nucleo/formato-credencial.js";
import { CONFIG } from "../nucleo/configuracion.js";
import {
  RESULTADO_TITULARIDAD,
  generarCodigoDesafio,
  recordarCodigoEmitido,
  codigoFueEmitidoAqui,
  interpretarRespuesta,
  comprobarPruebaTitularidad,
} from "../nucleo/prueba-titularidad.js";
import { mostrarAvisoEnPagina } from "./avisos-interfaz.js";
import { diagnostico } from "../nucleo/registro-diagnostico.js";

function describirAntiguedad(segundos) {
  if (segundos < 60) return `hace ${Math.max(0, segundos)} s`;
  return `hace ${Math.round(segundos / 60)} min`;
}

function sinWalletTitular(ficha) {
  return /^0x0+$/.test(ficha.datos.cuentaTitular);
}

/** Muestra el resultado de comprobar una respuesta. Devuelve el resultado para el diagnóstico. */
export function mostrarResultadoTitularidad(contenedor, ficha, textoRespuesta) {
  const respuesta = interpretarRespuesta(textoRespuesta);
  const comprobacion = comprobarPruebaTitularidad({ idCredencial: ficha.id, cuentaTitular: ficha.datos.cuentaTitular, respuesta });
  const minutos = Math.round((CONFIG.pruebaTitularidad?.vigenciaSegundos ?? 600) / 60);
  diagnostico.info("titularidad", "Prueba de titularidad comprobada", { idCredencial: ficha.id, resultado: comprobacion.resultado, firmante: comprobacion.firmante });

  switch (comprobacion.resultado) {
    case RESULTADO_TITULARIDAD.valida: {
      const cuando = describirAntiguedad(comprobacion.segundosTranscurridos);
      if (codigoFueEmitidoAqui(ficha.id, respuesta.codigo)) {
        mostrarAvisoEnPagina(contenedor, "exito", "Comprobado: la matrícula es de esta persona",
          `Confirmó el código ${respuesta.codigo} desde la cuenta del médico (${cuando}).` +
            (ficha.estadoVigente === ESTADO.Activa ? "" : " Ojo: la matrícula no está vigente, así que igual no lo habilita."));
      } else {
        mostrarAvisoEnPagina(contenedor, "advertencia", `El médico confirmó el código ${respuesta.codigo}. ¿Es el que le diste vos?`,
          `Lo confirmó ${cuando}. Si es el código que le diste, está comprobado. Si no, puede ser una confirmación vieja: generá un código nuevo.`);
      }
      break;
    }
    case RESULTADO_TITULARIDAD.firmaDeOtraCuenta:
      mostrarAvisoEnPagina(contenedor, "error", "NO es la persona de la matrícula",
        "El código lo confirmó otra cuenta, no la del médico de esta matrícula. Quien la presenta no demostró que sea suya.");
      break;
    case RESULTADO_TITULARIDAD.vencida:
      mostrarAvisoEnPagina(contenedor, "error", "El código venció",
        `Se confirmó ${describirAntiguedad(comprobacion.segundosTranscurridos)} y vale ${minutos} minutos. Generá un código nuevo.`);
      break;
    case RESULTADO_TITULARIDAD.fechaFutura:
      mostrarAvisoEnPagina(contenedor, "error", "La hora no coincide", "El celular del médico tiene mal la hora. Pedile que la corrija y generá un código nuevo.");
      break;
    case RESULTADO_TITULARIDAD.sinWalletTitular:
      mostrarAvisoEnPagina(contenedor, "info", "Esta matrícula todavía no está asociada a la cuenta del médico", "Comprobá su identidad con el DNI.");
      break;
    default:
      mostrarAvisoEnPagina(contenedor, "error", "No se pudo leer", "Pegá el link completo que te mandó el médico.");
  }
  return comprobacion;
}

/** Panel completo para el verificador. */
export function crearPanelPruebaTitularidad(ficha) {
  if (sinWalletTitular(ficha)) {
    return crearElementoSeguro("p", {
      clase: "texto-secundario",
      texto: "Esta matrícula todavía no está asociada a la cuenta del médico: comprobá su identidad con el DNI.",
    });
  }
  const minutos = Math.round((CONFIG.pruebaTitularidad?.vigenciaSegundos ?? 600) / 60);
  const resultado = crearElementoSeguro("div", { "aria-live": "polite" });
  const zonaCodigo = crearElementoSeguro("div", { "aria-live": "polite" });
  const idCampo = `respuesta-titularidad-${ficha.id.slice(2, 10)}`;
  const campo = crearElementoSeguro("input", { type: "text", id: idCampo, spellcheck: "false", autocomplete: "off", placeholder: "Link que te mandó el médico" });

  const botonCodigo = crearElementoSeguro("button", {
    type: "button",
    clase: "boton boton--turquesa",
    texto: "Generar código",
    onclick: () => {
      const codigo = generarCodigoDesafio();
      recordarCodigoEmitido(ficha.id, codigo);
      diagnostico.info("titularidad", "Código de desafío generado", { idCredencial: ficha.id, codigo });
      zonaCodigo.replaceChildren(
        crearElementoSeguro("p", { clase: "codigo-desafio", texto: codigo, "aria-label": `Código ${codigo.split("").join(" ")}` }),
        crearElementoSeguro("ol", { clase: "texto-chico" }, [
          crearElementoSeguro("li", { texto: "Pedile al médico que entre a «Mis matrículas» y escriba este código en «Demostrar que la matrícula es mía»." }),
          crearElementoSeguro("li", { texto: `El código vale ${minutos} minutos (hasta ${formatearFechaHora(Math.floor(Date.now() / 1000) + minutos * 60)}).` }),
          crearElementoSeguro("li", { texto: "Escaneá el QR que le aparece en el celular, o pegá abajo el link que te mande." }),
        ]),
      );
      botonCodigo.textContent = "Generar otro código";
    },
  });

  const formulario = crearElementoSeguro("form", {
    novalidate: true,
    onsubmit: (evento) => {
      evento.preventDefault();
      mostrarResultadoTitularidad(resultado, ficha, campo.value);
    },
  }, [
    crearElementoSeguro("div", { clase: "campo" }, [
      crearElementoSeguro("label", { for: idCampo, texto: "Respuesta del médico" }),
      crearElementoSeguro("div", { clase: "busqueda-credencial" }, [campo, crearElementoSeguro("button", { type: "submit", clase: "boton boton--primario", texto: "Comprobar" })]),
    ]),
  ]);

  return crearElementoSeguro("div", {}, [
    crearElementoSeguro("p", {
      texto: "Para saber si quien te muestra la matrícula es realmente ese médico: le das un código, él lo confirma desde su cuenta y acá ves el resultado. No tiene costo y no queda registrado.",
    }),
    botonCodigo,
    zonaCodigo,
    formulario,
    resultado,
  ]);
}
