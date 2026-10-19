// Cabecera (navegación) y pie comunes a todas las páginas. Se montan alrededor del
// <main> de cada página para no duplicar HTML.
import { crearElementoSeguro } from "../nucleo/dom-seguro.js";
import { CONFIG, contratoConfigurado, direccionContrato, urlExploradorDireccion } from "../nucleo/configuracion.js";
import { acortarHexadecimal } from "../nucleo/formato-credencial.js";
import { abrirPanelDiagnostico } from "./panel-diagnostico.js";

const ENTRADAS_NAVEGACION = Object.freeze([
  { clave: "inicio", texto: "Verificar", href: "index.html" },
  { clave: "emisor", texto: "Universidades y colegios", href: "emisor.html" },
  { clave: "titular", texto: "Médicos", href: "titular.html" },
  { clave: "verificador", texto: "Hospitales y clínicas", href: "verificador.html" },
  { clave: "gobernanza", texto: "Administración", href: "gobernanza.html" },
]);

function crearCabecera(paginaActiva) {
  const lista = crearElementoSeguro(
    "ul",
    {},
    ENTRADAS_NAVEGACION.map((entrada) =>
      crearElementoSeguro("li", {}, [
        crearElementoSeguro("a", {
          href: entrada.href,
          texto: entrada.texto,
          "aria-current": entrada.clave === paginaActiva ? "page" : null,
        }),
      ]),
    ),
  );
  const navegacion = crearElementoSeguro("nav", { clase: "navegacion-principal", id: "navegacion-principal", "aria-label": "Principal" }, [lista]);
  const botonMenu = crearElementoSeguro("button", {
    type: "button",
    clase: "boton-menu",
    "aria-controls": "navegacion-principal",
    "aria-expanded": "false",
    "aria-label": "Abrir menú",
    texto: "☰",
    onclick: () => {
      const abierta = navegacion.classList.toggle("abierta");
      botonMenu.setAttribute("aria-expanded", String(abierta));
    },
  });
  return crearElementoSeguro("header", { clase: "cabecera-sitio" }, [
    crearElementoSeguro("div", { clase: "cabecera-sitio__interior" }, [
      crearElementoSeguro("a", { clase: "marca-sitio", href: "index.html" }, [
        crearElementoSeguro("span", { clase: "marca-sitio__rotulo", texto: "Matrículas y títulos verificables" }),
        crearElementoSeguro("span", { clase: "marca-sitio__nombre", texto: CONFIG.nombreAplicacion }),
      ]),
      botonMenu,
      navegacion,
      crearElementoSeguro("span", { clase: "indicador-red", texto: `Blockchain ${CONFIG.red.nombre}` }),
    ]),
  ]);
}

function crearPie() {
  const datoContrato = contratoConfigurado()
    ? crearElementoSeguro("a", {
        href: urlExploradorDireccion(direccionContrato()),
        target: "_blank",
        rel: "noopener",
        texto: `Contrato ${acortarHexadecimal(direccionContrato())}`,
      })
    : crearElementoSeguro("span", { texto: "Contrato sin configurar" });
  return crearElementoSeguro("footer", { clase: "pie-sitio" }, [
    crearElementoSeguro("div", { clase: "pie-sitio__interior" }, [
      crearElementoSeguro("p", {}, [
        "Proyecto académico — Grupo 1, Desafío Integrador Grupal. ",
        "Diplomatura en Blockchain y Finanzas Digitales, UTN 2026. Prototipo con datos de demostración: sin validez legal.",
      ]),
      crearElementoSeguro("p", {}, [
        datoContrato,
        " · ",
        crearElementoSeguro("a", { href: "privacidad.html", texto: "Privacidad y términos" }),
        " · ",
        crearElementoSeguro("button", { type: "button", clase: "enlace", texto: "Diagnóstico", onclick: abrirPanelDiagnostico }),
      ]),
    ]),
  ]);
}

/** @param {"inicio"|"emisor"|"titular"|"verificador"|"gobernanza"|"privacidad"|"verificar"} paginaActiva */
export function montarEstructuraSitio(paginaActiva) {
  const principal = document.querySelector("main");
  if (!principal.id) principal.id = "contenido";
  const saltar = crearElementoSeguro("a", { clase: "saltar-contenido", href: `#${principal.id}`, texto: "Saltar al contenido" });
  document.body.prepend(saltar, crearCabecera(paginaActiva));
  document.body.append(crearPie());
}
