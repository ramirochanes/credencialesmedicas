// Código QR de una credencial: apunta a verificar.html?c=<id>. Se genera en el
// navegador (sin servicios externos) y se puede descargar como PNG.
import generadorQr from "../../vendor/qrcode-generator-2.0.4.js";
import { crearElementoSeguro, crearValorCopiable } from "../nucleo/dom-seguro.js";
import { urlVerificacionCredencial } from "../nucleo/configuracion.js";
import { acortarHexadecimal, nombreTipoCredencial } from "../nucleo/formato-credencial.js";
import { crearInsigniaEstado } from "./tarjeta-estado-credencial.js";

function construirMatrizQr(texto) {
  const qr = generadorQr(0, "M");
  qr.addData(texto);
  qr.make();
  return qr;
}

export function crearSvgQr(texto, etiquetaAccesible) {
  const qr = construirMatrizQr(texto);
  const modulos = qr.getModuleCount();
  const margen = 2;
  const lado = modulos + margen * 2;
  const espacioSvg = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(espacioSvg, "svg");
  svg.setAttribute("viewBox", `0 0 ${lado} ${lado}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", etiquetaAccesible);
  svg.setAttribute("shape-rendering", "crispEdges");
  let trazo = "";
  for (let fila = 0; fila < modulos; fila++) {
    for (let columna = 0; columna < modulos; columna++) {
      if (qr.isDark(fila, columna)) trazo += `M${columna + margen},${fila + margen}h1v1h-1z`;
    }
  }
  const fondo = document.createElementNS(espacioSvg, "rect");
  fondo.setAttribute("width", String(lado));
  fondo.setAttribute("height", String(lado));
  fondo.setAttribute("fill", "#ffffff");
  const camino = document.createElementNS(espacioSvg, "path");
  camino.setAttribute("d", trazo);
  camino.setAttribute("fill", "#12263f");
  svg.append(fondo, camino);
  return svg;
}

export function descargarQrComoPng(texto, nombreArchivo, tamanoModulo = 10) {
  const qr = construirMatrizQr(texto);
  const modulos = qr.getModuleCount();
  const margen = 4;
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = (modulos + margen * 2) * tamanoModulo;
  const contexto = lienzo.getContext("2d");
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, lienzo.width, lienzo.height);
  contexto.fillStyle = "#12263f";
  for (let fila = 0; fila < modulos; fila++) {
    for (let columna = 0; columna < modulos; columna++) {
      if (qr.isDark(fila, columna)) {
        contexto.fillRect((columna + margen) * tamanoModulo, (fila + margen) * tamanoModulo, tamanoModulo, tamanoModulo);
      }
    }
  }
  const enlace = document.createElement("a");
  enlace.href = lienzo.toDataURL("image/png");
  enlace.download = nombreArchivo;
  enlace.click();
}

/** "Credencial digital": lo que el profesional presenta (QR + datos mínimos). */
export function crearCredencialDigital(ficha, institucion) {
  const enlace = urlVerificacionCredencial(ficha.id);
  return crearElementoSeguro("div", { clase: "credencial-digital" }, [
    crearElementoSeguro("div", {}, [
      crearElementoSeguro("span", { clase: "rotulo-seccion", texto: "QR de la matrícula" }),
      crearElementoSeguro("h3", { texto: nombreTipoCredencial(ficha.datos.tipo) }),
      crearElementoSeguro("p", { texto: institucion?.nombre ?? "" }),
      crearInsigniaEstado(ficha.estadoVigente),
      crearElementoSeguro("p", { clase: "texto-codigo", texto: acortarHexadecimal(ficha.id, 12, 10) }),
      crearElementoSeguro("div", { clase: "grupo-botones" }, [
        crearElementoSeguro("button", {
          type: "button",
          clase: "boton boton--claro",
          texto: "Descargar QR",
          onclick: () => descargarQrComoPng(enlace, `credencial-${ficha.id.slice(2, 10)}.png`),
        }),
        crearElementoSeguro("a", { clase: "boton boton--claro", href: enlace, texto: "Ver cómo la ve un hospital" }),
      ]),
    ]),
    crearElementoSeguro("div", { clase: "credencial-digital__qr" }, [crearSvgQr(enlace, "Código QR para verificar la credencial")]),
  ]);
}

export function crearEnlaceVerificacionCopiable(idCredencial) {
  return crearValorCopiable(urlVerificacionCredencial(idCredencial), "Copiar link de verificación");
}
