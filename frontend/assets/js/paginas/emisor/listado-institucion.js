// Emisor · Credenciales de mi institución. Reconstruye el listado a partir de los
// eventos CambioEstadoCredencial filtrados por institución (topic indexado), en
// tramos de bloques para respetar los límites de los RPC públicos. Guarda lo ya
// recorrido en el navegador para no volver a escanear desde el bloque de despliegue.
import { crearElementoSeguro } from "../../nucleo/dom-seguro.js";
import { obtenerContratoLectura, leerFichaCredencial } from "../../nucleo/contrato-credenciales.js";
import { CONFIG, direccionContrato } from "../../nucleo/configuracion.js";
import { formatearFechaHora, acortarHexadecimal, nombreTipoCredencial } from "../../nucleo/formato-credencial.js";
import { crearInsigniaEstado } from "../../componentes/tarjeta-estado-credencial.js";
import { mostrarAvisoEnPagina, marcarBotonOcupado } from "../../componentes/avisos-interfaz.js";
import { diagnostico } from "../../nucleo/registro-diagnostico.js";

const MAXIMO_FICHAS_EN_PANTALLA = 50;

function claveCache(idInstitucion) {
  return `credenciales-medicas:listado:${direccionContrato().toLowerCase()}:${idInstitucion}`;
}

function leerCache(idInstitucion) {
  try {
    const cache = JSON.parse(window.localStorage.getItem(claveCache(idInstitucion)) ?? "null");
    return cache && Array.isArray(cache.ids) ? cache : { ultimoBloque: CONFIG.contrato.bloqueDespliegue - 1, ids: [] };
  } catch {
    return { ultimoBloque: CONFIG.contrato.bloqueDespliegue - 1, ids: [] };
  }
}

function guardarCache(idInstitucion, cache) {
  try {
    window.localStorage.setItem(claveCache(idInstitucion), JSON.stringify(cache));
  } catch {
    // sin almacenamiento: la próxima vez se vuelve a escanear
  }
}

async function escanearEventos(idInstitucion, alProgresar) {
  const contrato = await obtenerContratoLectura();
  const proveedor = contrato.runner.provider;
  const cache = leerCache(idInstitucion);
  const filtro = contrato.filters.CambioEstadoCredencial(null, idInstitucion);
  const ultimo = await proveedor.getBlockNumber();
  const { tamanoTramo, maximoTramosPorConsulta } = CONFIG.busquedaEventos;
  const conocidos = new Set(cache.ids);
  let desde = Math.max(cache.ultimoBloque + 1, CONFIG.contrato.bloqueDespliegue);
  let tramos = 0;
  while (desde <= ultimo && tramos < maximoTramosPorConsulta) {
    const hasta = Math.min(desde + tamanoTramo - 1, ultimo);
    const eventos = await contrato.queryFilter(filtro, desde, hasta);
    eventos.forEach((evento) => conocidos.add(evento.args.idCredencial));
    cache.ultimoBloque = hasta;
    desde = hasta + 1;
    tramos += 1;
    alProgresar?.(hasta, ultimo);
  }
  cache.ids = [...conocidos];
  guardarCache(idInstitucion, cache);
  diagnostico.info("listado", "Eventos escaneados", { idInstitucion, hastaBloque: cache.ultimoBloque, credenciales: cache.ids.length });
  return { ids: cache.ids, completo: cache.ultimoBloque >= ultimo };
}

function crearTabla(fichas, alGestionar) {
  const filas = fichas.map((ficha) =>
    crearElementoSeguro("tr", {}, [
      crearElementoSeguro("td", {}, [crearElementoSeguro("code", { texto: acortarHexadecimal(ficha.id, 10, 6), title: ficha.id })]),
      crearElementoSeguro("td", { texto: nombreTipoCredencial(ficha.datos.tipo) }),
      crearElementoSeguro("td", {}, [crearInsigniaEstado(ficha.estadoVigente)]),
      crearElementoSeguro("td", { texto: formatearFechaHora(ficha.datos.actualizadaEl) }),
      crearElementoSeguro("td", { clase: "acciones" }, [
        crearElementoSeguro("button", { type: "button", clase: "boton boton--secundario", texto: "Gestionar", onclick: () => alGestionar(ficha.id) }),
      ]),
    ]),
  );
  return crearElementoSeguro("div", { clase: "tabla-contenedor" }, [
    crearElementoSeguro("table", { clase: "tabla" }, [
      crearElementoSeguro("thead", {}, [
        crearElementoSeguro("tr", {}, ["Identificador", "Tipo", "Estado vigente", "Última actualización", "Acciones"].map((titulo) =>
          crearElementoSeguro("th", { scope: "col", texto: titulo }))),
      ]),
      crearElementoSeguro("tbody", {}, filas),
    ]),
  ]);
}

export function crearListadoInstitucion(sesion, alGestionar) {
  const avisos = crearElementoSeguro("div");
  const contenido = crearElementoSeguro("div", { "aria-live": "polite" });
  const boton = crearElementoSeguro("button", { type: "button", clase: "boton boton--secundario", texto: "Actualizar listado" });

  async function actualizar() {
    marcarBotonOcupado(boton, true, "Buscando en la blockchain…");
    avisos.replaceChildren();
    try {
      const { ids, completo } = await escanearEventos(sesion.contexto.idInstitucion, (hasta, ultimo) => {
        boton.textContent = `Bloque ${hasta} de ${ultimo}…`;
      });
      if (!completo) mostrarAvisoEnPagina(avisos, "advertencia", "Listado parcial", "Quedan bloques por recorrer: tocá 'Actualizar listado' de nuevo para continuar.");
      const recientes = ids.slice(-MAXIMO_FICHAS_EN_PANTALLA).reverse();
      const fichas = await Promise.all(recientes.map((id) => leerFichaCredencial(id)));
      contenido.replaceChildren(
        fichas.length
          ? crearTabla(fichas, alGestionar)
          : crearElementoSeguro("div", { clase: "estado-vacio" }, [crearElementoSeguro("strong", { texto: "Todavía no hay credenciales" }), "Registrá la primera desde «Nueva solicitud»."]),
      );
    } catch (error) {
      mostrarAvisoEnPagina(avisos, "error", "No se pudo armar el listado", error.message);
    } finally {
      marcarBotonOcupado(boton, false);
    }
  }

  boton.addEventListener("click", actualizar);
  return {
    elemento: crearElementoSeguro("div", {}, [
      crearElementoSeguro("p", { clase: "texto-secundario", texto: "Credenciales registradas por tu institución, reconstruidas desde los eventos on-chain (las más recientes primero)." }),
      boton, avisos, contenido,
    ]),
    actualizar,
  };
}
