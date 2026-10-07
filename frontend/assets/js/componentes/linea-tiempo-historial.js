// Historial on-chain de una credencial, verificaciones institucionales y antecedentes
// autodeclarados, en formato de línea de tiempo y listas.
import { crearElementoSeguro } from "../nucleo/dom-seguro.js";
import {
  ACCIONES_CREDENCIAL,
  datosEstado,
  claseCssEstado,
  formatearFechaHora,
  acortarHexadecimal,
} from "../nucleo/formato-credencial.js";

function nombreInstitucion(institucionesPorId, id) {
  return institucionesPorId.get(id)?.nombre ?? `Institución #${id}`;
}

export function crearLineaTiempoHistorial(eventos, institucionesPorId) {
  if (!eventos.length) {
    return crearElementoSeguro("p", { clase: "texto-secundario", texto: "Sin movimientos registrados." });
  }
  return crearElementoSeguro(
    "ol",
    { clase: "linea-tiempo" },
    [...eventos].reverse().map((evento) =>
      crearElementoSeguro("li", { clase: claseCssEstado(evento.estadoResultante) }, [
        crearElementoSeguro("div", { clase: "linea-tiempo__accion" }, [
          ACCIONES_CREDENCIAL[evento.accion] ?? "Acción",
          " → ",
          datosEstado(evento.estadoResultante).nombre,
        ]),
        crearElementoSeguro("div", { clase: "linea-tiempo__detalle" }, [
          `${formatearFechaHora(evento.fecha)} · ${nombreInstitucion(institucionesPorId, evento.institucion)}`,
        ]),
        /^0x0+$/.test(evento.referenciaActo)
          ? null
          : crearElementoSeguro("div", { clase: "linea-tiempo__detalle" }, [
              "Resolución que lo respalda (huella): ",
              crearElementoSeguro("code", { texto: acortarHexadecimal(evento.referenciaActo, 10, 8), title: evento.referenciaActo }),
            ]),
      ]),
    ),
  );
}

export function crearListaVerificaciones({ total, verificaciones }, institucionesPorId) {
  if (!total) {
    return crearElementoSeguro("p", {
      clase: "texto-secundario",
      texto: "Ningún hospital o clínica dejó constancia todavía. Las consultas de cualquier persona no quedan registradas.",
    });
  }
  const filas = verificaciones.map((verificacion) =>
    crearElementoSeguro("tr", {}, [
      crearElementoSeguro("td", { texto: formatearFechaHora(verificacion.fecha) }),
      crearElementoSeguro("td", { texto: nombreInstitucion(institucionesPorId, verificacion.institucionVerificadora) }),
      crearElementoSeguro("td", { texto: datosEstado(verificacion.estadoObservado).nombre }),
    ]),
  );
  return crearElementoSeguro("div", {}, [
    crearElementoSeguro("p", { clase: "texto-chico texto-secundario", texto: `${total === 1 ? "1 constancia registrada" : `${total} constancias registradas`}. Se muestran las más recientes.` }),
    crearElementoSeguro("div", { clase: "tabla-contenedor" }, [
      crearElementoSeguro("table", { clase: "tabla" }, [
        crearElementoSeguro("thead", {}, [
          crearElementoSeguro("tr", {}, [
            crearElementoSeguro("th", { scope: "col", texto: "Fecha" }),
            crearElementoSeguro("th", { scope: "col", texto: "Hospital o clínica" }),
            crearElementoSeguro("th", { scope: "col", texto: "Estado ese día" }),
          ]),
        ]),
        crearElementoSeguro("tbody", {}, filas),
      ]),
    ]),
  ]);
}

export function crearListaAntecedentes(antecedentes, { alRetirar } = {}) {
  const vigentes = antecedentes.filter((antecedente) => !antecedente.retirado);
  if (!vigentes.length) {
    return crearElementoSeguro("p", { clase: "texto-secundario", texto: "El médico no agregó cursos ni formación." });
  }
  return crearElementoSeguro(
    "ul",
    { clase: "linea-tiempo" },
    vigentes.map((antecedente) =>
      crearElementoSeguro("li", {}, [
        crearElementoSeguro("div", { clase: "linea-tiempo__accion", texto: antecedente.descripcion }),
        crearElementoSeguro("div", {
          clase: "linea-tiempo__detalle",
          texto: `Lo cargó el médico el ${formatearFechaHora(antecedente.declaradoEl)}`,
        }),
        alRetirar
          ? crearElementoSeguro("button", { type: "button", clase: "enlace texto-chico", texto: "Retirar", onclick: () => alRetirar(antecedente) })
          : null,
      ]),
    ),
  );
}
