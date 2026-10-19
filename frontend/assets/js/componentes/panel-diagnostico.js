// Diálogo con el registro de diagnóstico del navegador: ver, descargar y vaciar.
import { crearElementoSeguro } from "../nucleo/dom-seguro.js";
import {
  obtenerEntradasDiagnostico,
  descargarDiagnostico,
  vaciarDiagnostico,
} from "../nucleo/registro-diagnostico.js";

function formatearEntradas(entradas) {
  if (!entradas.length) return "Sin eventos registrados en este navegador.";
  return entradas
    .slice(-150)
    .reverse()
    .map((entrada) => {
      const detalle = entrada.detalle ? `\n    ${JSON.stringify(entrada.detalle)}` : "";
      return `${entrada.fecha}  ${entrada.nivel.toUpperCase().padEnd(11)} [${entrada.modulo}] ${entrada.mensaje}${detalle}`;
    })
    .join("\n");
}

export function abrirPanelDiagnostico() {
  const registros = crearElementoSeguro("div", {
    clase: "dialogo__registros",
    tabindex: "0",
    "aria-label": "Eventos registrados",
    texto: formatearEntradas(obtenerEntradasDiagnostico()),
  });
  const dialogo = crearElementoSeguro("dialog", { clase: "dialogo", "aria-labelledby": "titulo-diagnostico" }, [
    crearElementoSeguro("div", { clase: "dialogo__cuerpo" }, [
      crearElementoSeguro("h2", { id: "titulo-diagnostico", texto: "Diagnóstico del sitio" }),
      crearElementoSeguro("p", {
        clase: "texto-secundario",
        texto:
          "Eventos y errores de este navegador (conexión a la red, transacciones, billetera). No incluye documentos ni claves. " +
          "Si algo falla, descargalo y adjuntalo al reporte.",
      }),
      registros,
    ]),
    crearElementoSeguro("div", { clase: "dialogo__acciones" }, [
      crearElementoSeguro("button", {
        type: "button",
        clase: "boton boton--secundario",
        texto: "Vaciar",
        onclick: () => {
          vaciarDiagnostico();
          registros.textContent = formatearEntradas([]);
        },
      }),
      crearElementoSeguro("button", { type: "button", clase: "boton boton--secundario", texto: "Descargar JSON", onclick: descargarDiagnostico }),
      crearElementoSeguro("button", {
        type: "button",
        clase: "boton boton--primario",
        texto: "Cerrar",
        onclick: () => {
          dialogo.close();
          dialogo.remove();
        },
      }),
    ]),
  ]);
  dialogo.addEventListener("close", () => dialogo.remove());
  document.body.append(dialogo);
  dialogo.showModal();
}
