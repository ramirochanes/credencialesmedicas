// Zona para elegir o soltar un documento. Calcula la huella SHA-256 localmente:
// el archivo NO se sube a ningún lado.
import { crearElementoSeguro, crearValorCopiable } from "../nucleo/dom-seguro.js";
import { calcularHuellaArchivo } from "../nucleo/huella-documento.js";
import { diagnostico } from "../nucleo/registro-diagnostico.js";

let contadorSelectores = 0;

/**
 * @param {HTMLElement} contenedor
 * @param {{titulo: string, ayuda?: string, aceptar?: string, alObtenerHuella?: (huella: string, archivo: File) => void}} opciones
 * @returns {{reiniciar: () => void, huellaActual: () => string|null}}
 */
export function montarSelectorDocumento(contenedor, { titulo, ayuda, aceptar = ".pdf,application/pdf", alObtenerHuella }) {
  contadorSelectores += 1;
  const idEntrada = `selector-documento-${contadorSelectores}`;
  let huella = null;

  const resultado = crearElementoSeguro("div", { clase: "selector-documento__resultado", "aria-live": "polite" });
  const entrada = crearElementoSeguro("input", { type: "file", id: idEntrada, accept: aceptar, "aria-describedby": `${idEntrada}-ayuda` });
  const zona = crearElementoSeguro("div", { clase: "selector-documento" }, [
    crearElementoSeguro("label", { for: idEntrada, clase: "selector-documento__titulo", texto: titulo }),
    crearElementoSeguro("p", {
      id: `${idEntrada}-ayuda`,
      clase: "texto-chico texto-secundario",
      texto: ayuda ?? "Arrastrá el archivo o hacé clic para elegirlo. Se procesa en tu navegador: no se sube a ningún servidor.",
    }),
    entrada,
  ]);

  async function procesarArchivo(archivo) {
    if (!archivo) return;
    resultado.replaceChildren(crearElementoSeguro("span", { texto: `Calculando la huella de ${archivo.name}…` }));
    try {
      huella = await calcularHuellaArchivo(archivo);
      diagnostico.info("documento", "Huella calculada", { archivo: archivo.name, tamano: archivo.size, huella });
      resultado.replaceChildren(
        crearElementoSeguro("strong", { texto: archivo.name }),
        crearElementoSeguro("span", { texto: ` (${(archivo.size / 1024).toFixed(1)} KB)` }),
        crearElementoSeguro("div", {}, ["SHA-256: ", crearValorCopiable(huella, "Copiar huella")]),
      );
      alObtenerHuella?.(huella, archivo);
    } catch (error) {
      huella = null;
      diagnostico.advertencia("documento", "No se pudo calcular la huella", error);
      resultado.replaceChildren(crearElementoSeguro("span", { clase: "error-campo", texto: error.message }));
    }
  }

  entrada.addEventListener("change", () => procesarArchivo(entrada.files?.[0]));
  zona.addEventListener("dragover", (evento) => {
    evento.preventDefault();
    zona.classList.add("arrastrando");
  });
  zona.addEventListener("dragleave", () => zona.classList.remove("arrastrando"));
  zona.addEventListener("drop", (evento) => {
    evento.preventDefault();
    zona.classList.remove("arrastrando");
    procesarArchivo(evento.dataTransfer?.files?.[0]);
  });

  contenedor.replaceChildren(zona, resultado);
  return {
    reiniciar() {
      huella = null;
      entrada.value = "";
      resultado.replaceChildren();
    },
    huellaActual: () => huella,
  };
}
