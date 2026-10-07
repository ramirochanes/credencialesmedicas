// Resultado de verificación (destino del QR): estado vigente, emisor, contraste del
// PDF, historial, verificaciones institucionales y antecedentes autodeclarados.
import { montarEstructuraSitio } from "../componentes/cabecera-sitio.js";
import { crearResultadoEstado, crearFichaDatosCredencial } from "../componentes/tarjeta-estado-credencial.js";
import { crearLineaTiempoHistorial, crearListaVerificaciones, crearListaAntecedentes } from "../componentes/linea-tiempo-historial.js";
import { crearCredencialDigital } from "../componentes/codigo-qr-credencial.js";
import { montarSelectorDocumento } from "../componentes/selector-documento.js";
import { mostrarAvisoEnPagina } from "../componentes/avisos-interfaz.js";
import { crearPanelPruebaTitularidad, mostrarResultadoTitularidad } from "../componentes/panel-prueba-titularidad.js";
import { buscarElemento, vaciarContenedor } from "../nucleo/dom-seguro.js";
import { extraerIdentificadorCredencial } from "../nucleo/huella-documento.js";
import {
  leerFichaCredencial,
  leerInstitucion,
  listarInstituciones,
  leerHistorialCredencial,
  leerVerificacionesCredencial,
  leerAntecedentesCredencial,
  contrastarDocumentoConCredencial,
} from "../nucleo/contrato-credenciales.js";
import { ESTADO, datosEstado } from "../nucleo/formato-credencial.js";
import { diagnostico } from "../nucleo/registro-diagnostico.js";

const PATRON_HUELLA = /^0x[0-9a-fA-F]{64}$/;

async function mostrarContraste(idCredencial, huella) {
  const contenedor = buscarElemento("#resultado-contraste");
  try {
    const { coincide, estadoVigente } = await contrastarDocumentoConCredencial(idCredencial, huella);
    if (coincide) {
      mostrarAvisoEnPagina(
        contenedor,
        estadoVigente === ESTADO.Activa ? "exito" : "advertencia",
        "El PDF es original",
        `Es exactamente el que entregó la institución. Estado hoy: ${datosEstado(estadoVigente).nombre}.`,
      );
    } else {
      mostrarAvisoEnPagina(contenedor, "error", "El PDF NO es el original", "No coincide con el que entregó la institución: puede estar modificado o ser de otra matrícula.");
    }
    diagnostico.info("verificar", "Contraste de documento", { idCredencial, huella, coincide });
  } catch (error) {
    mostrarAvisoEnPagina(contenedor, "error", "No se pudo comprobar el PDF", error.message);
  }
}

async function cargarDetalle(ficha, institucion) {
  const instituciones = await listarInstituciones();
  const institucionesPorId = new Map(instituciones.map((item) => [item.id, item]));
  const [historial, verificaciones, antecedentes] = await Promise.all([
    leerHistorialCredencial(ficha.id),
    leerVerificacionesCredencial(ficha.id),
    leerAntecedentesCredencial(ficha.id),
  ]);
  vaciarContenedor(buscarElemento("#ficha-credencial"), crearFichaDatosCredencial(ficha));
  vaciarContenedor(buscarElemento("#historial-credencial"), crearLineaTiempoHistorial(historial, institucionesPorId));
  vaciarContenedor(buscarElemento("#verificaciones-credencial"), crearListaVerificaciones(verificaciones, institucionesPorId));
  vaciarContenedor(buscarElemento("#antecedentes-credencial"), crearListaAntecedentes(antecedentes));
  vaciarContenedor(buscarElemento("#credencial-digital"), crearCredencialDigital(ficha, institucion));
}

async function iniciarVerificacion() {
  const parametros = new URLSearchParams(window.location.search);
  const idCredencial = extraerIdentificadorCredencial(parametros.get("c"));
  const resultado = buscarElemento("#resultado-principal");
  const avisos = buscarElemento("#avisos-verificacion");
  if (!idCredencial) {
    resultado.replaceChildren();
    mostrarAvisoEnPagina(avisos, "error", "No sabemos qué matrícula consultar", "Abrí este enlace desde el QR de la matrícula o buscala en la página de inicio.");
    return;
  }

  try {
    const ficha = await leerFichaCredencial(idCredencial);
    const institucion = await leerInstitucion(ficha.datos.institucionEmisora);
    vaciarContenedor(resultado, crearResultadoEstado(ficha, institucion));
    document.title = `${datosEstado(ficha.estadoVigente).nombre} — Consulta de matrícula`;
    diagnostico.info("verificar", "Credencial consultada", { idCredencial, estado: ficha.estadoVigente });
    if (ficha.estadoVigente === ESTADO.Inexistente) return;

    buscarElemento("#detalle-credencial").hidden = false;
    vaciarContenedor(buscarElemento("#panel-titularidad"), crearPanelPruebaTitularidad(ficha));
    if (parametros.get("t")) mostrarResultadoTitularidad(buscarElemento("#resultado-titularidad"), ficha, window.location.search);
    montarSelectorDocumento(buscarElemento("#zona-contraste"), {
      titulo: "Elegí o soltá el PDF presentado",
      alObtenerHuella: (huella) => mostrarContraste(idCredencial, huella),
    });
    const huellaPrevia = parametros.get("d");
    if (huellaPrevia && PATRON_HUELLA.test(huellaPrevia)) mostrarContraste(idCredencial, huellaPrevia);
    await cargarDetalle(ficha, institucion);
  } catch (error) {
    resultado.replaceChildren();
    diagnostico.error("verificar", "Falló la verificación", error);
    mostrarAvisoEnPagina(avisos, "error", "No se pudo consultar la matrícula", error.message);
  }
}

montarEstructuraSitio("verificar");
iniciarVerificacion();
