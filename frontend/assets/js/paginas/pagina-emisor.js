// Panel de la institución emisora: conecta la billetera, verifica la institución
// vinculada y organiza las tareas en pestañas.
import { montarEstructuraSitio } from "../componentes/cabecera-sitio.js";
import { montarPanelBilletera } from "../componentes/conexion-billetera.js";
import { montarPestanas } from "../componentes/pestanas-panel.js";
import { mostrarAvisoEnPagina } from "../componentes/avisos-interfaz.js";
import { crearElementoSeguro, buscarElemento } from "../nucleo/dom-seguro.js";
import { TIPOS_INSTITUCION } from "../nucleo/formato-credencial.js";
import { crearFormularioSolicitud } from "./emisor/formulario-solicitud.js";
import { crearGestionCredencial } from "./emisor/gestion-credencial.js";
import { crearListadoInstitucion } from "./emisor/listado-institucion.js";
import { crearCargaInicialLote } from "./emisor/carga-inicial-lote.js";

const TIPO_PRESTADOR = TIPOS_INSTITUCION.indexOf("Hospital o clínica");

function mostrarPanelEmisor(sesion) {
  const area = buscarElemento("#area-emisor");
  const { institucion } = sesion.contexto;
  if (!institucion) {
    mostrarAvisoEnPagina(area, "advertencia", "Todavía no estás habilitado para ninguna institución",
      `Pasale tu número de cuenta al administrador del registro para que te habilite: ${sesion.cuenta}`);
    return;
  }
  if (institucion.tipo === TIPO_PRESTADOR) {
    mostrarAvisoEnPagina(area, "info", "Tu institución es un hospital o una clínica", "Los hospitales y clínicas no otorgan matrículas: comprueban las de otros. Usá la sección «Hospitales y clínicas».");
    return;
  }
  if (!institucion.habilitada) {
    mostrarAvisoEnPagina(area, "error", "Tu institución está suspendida", "El administrador del registro suspendió tu institución: no podés hacer cambios hasta que la vuelva a habilitar.");
    return;
  }

  const gestion = crearGestionCredencial(sesion);
  let pestanas;
  const abrirEnGestion = (idCredencial) => {
    pestanas.activar("gestion");
    gestion.abrirCredencial(idCredencial);
  };
  const listado = crearListadoInstitucion(sesion, abrirEnGestion);
  const contenedorPestanas = crearElementoSeguro("div", { clase: "tarjeta" });
  area.replaceChildren(contenedorPestanas);
  pestanas = montarPestanas(contenedorPestanas, [
    { clave: "solicitud", titulo: "Nueva solicitud", contenido: crearFormularioSolicitud(sesion, abrirEnGestion) },
    { clave: "gestion", titulo: "Gestionar credencial", contenido: gestion.elemento },
    { clave: "listado", titulo: "Credenciales de mi institución", contenido: listado.elemento },
    { clave: "lote", titulo: "Carga inicial", contenido: crearCargaInicialLote(sesion) },
  ], "emisor");

  const idEnUrl = new URLSearchParams(window.location.search).get("c");
  if (idEnUrl) abrirEnGestion(idEnUrl);
}

montarEstructuraSitio("emisor");
montarPanelBilletera(buscarElemento("#panel-billetera"), {
  descripcion: "Ingresá con el mail con el que te habilitaron en tu institución.",
  alConectar: mostrarPanelEmisor,
});
