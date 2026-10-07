// Inicio: búsqueda por identificador/link y verificación de un PDF por su huella.
import { montarEstructuraSitio } from "../componentes/cabecera-sitio.js";
import { montarSelectorDocumento } from "../componentes/selector-documento.js";
import { mostrarAvisoEnPagina } from "../componentes/avisos-interfaz.js";
import { crearElementoSeguro, buscarElemento } from "../nucleo/dom-seguro.js";
import { extraerIdentificadorCredencial } from "../nucleo/huella-documento.js";
import { buscarCredencialPorHuella } from "../nucleo/contrato-credenciales.js";
import { CONFIG, contratoConfigurado, direccionContrato, urlExploradorDireccion } from "../nucleo/configuracion.js";
import { diagnostico } from "../nucleo/registro-diagnostico.js";

function irAVerificacion(idCredencial, huellaDocumento) {
  const parametros = new URLSearchParams({ c: idCredencial });
  if (huellaDocumento) parametros.set("d", huellaDocumento);
  window.location.href = `verificar.html?${parametros}`;
}

function prepararBusqueda() {
  const formulario = buscarElemento("#formulario-busqueda");
  const campo = buscarElemento("#campo-busqueda");
  const error = buscarElemento("#error-busqueda");
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const identificador = extraerIdentificadorCredencial(campo.value);
    if (!identificador) {
      campo.setAttribute("aria-invalid", "true");
      error.textContent = "No reconocemos ese código. Pegá el link completo del QR de la matrícula.";
      error.hidden = false;
      campo.focus();
      return;
    }
    campo.removeAttribute("aria-invalid");
    error.hidden = true;
    irAVerificacion(identificador);
  });
}

function prepararVerificacionDocumento() {
  const resultado = buscarElemento("#resultado-documento");
  montarSelectorDocumento(buscarElemento("#zona-documento"), {
    titulo: "Elegí o soltá el PDF de la credencial",
    alObtenerHuella: async (huella) => {
      mostrarAvisoEnPagina(resultado, "info", "Buscando la huella en el registro…");
      try {
        const idCredencial = await buscarCredencialPorHuella(huella);
        if (idCredencial) {
          diagnostico.info("inicio", "Documento encontrado en el registro", { huella, idCredencial });
          irAVerificacion(idCredencial, huella);
          return;
        }
        mostrarAvisoEnPagina(
          resultado,
          "error",
          "Este documento no está registrado",
          "Su huella no coincide con ninguna credencial emitida. Puede haber sido alterado o no fue emitido a través del registro.",
        );
      } catch (error) {
        mostrarAvisoEnPagina(resultado, "error", "No se pudo consultar el registro", error.message);
      }
    },
  });
}

function mostrarEquipo() {
  const lista = buscarElemento("#lista-equipo");
  lista.replaceChildren(
    ...CONFIG.equipo.map((integrante) =>
      crearElementoSeguro("li", {}, [
        crearElementoSeguro("strong", { texto: integrante.nombre }),
        crearElementoSeguro("span", { clase: "texto-chico texto-secundario", texto: integrante.rol }),
      ]),
    ),
  );
}

montarEstructuraSitio("inicio");
prepararBusqueda();
prepararVerificacionDocumento();
mostrarEquipo();

/** Completa el apartado «Tecnología» con la red y el contrato de la configuración. */
function completarTecnologia() {
  const { nombre, chainId } = CONFIG.red;
  buscarElemento("#tecnologia-red").textContent = `${nombre} PoS, ${chainId === 137 ? "red principal" : "red de prueba"} (chainId ${chainId})`;
  if (contratoConfigurado()) {
    buscarElemento("#tecnologia-contrato").replaceChildren(
      crearElementoSeguro("a", { href: urlExploradorDireccion(direccionContrato()), target: "_blank", rel: "noopener", clase: "texto-codigo", texto: direccionContrato() }),
    );
  }
}
completarTecnologia();
