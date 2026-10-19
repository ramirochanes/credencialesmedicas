// Campo para indicar el acto administrativo que respalda un cambio de estado
// (resolución, dictamen). On-chain solo se guarda su huella SHA-256: el texto o el
// PDF del acto quedan en el sistema de la institución.
import { crearElementoSeguro } from "../nucleo/dom-seguro.js";
import { calcularHuellaArchivo, calcularHuellaTexto } from "../nucleo/huella-documento.js";

let contadorCampos = 0;

/** @returns {{elemento: HTMLElement, obtenerHuella: () => Promise<string>}} */
export function crearCampoReferenciaActo(etiqueta = "Acto que respalda el cambio") {
  contadorCampos += 1;
  const id = `referencia-acto-${contadorCampos}`;
  const texto = crearElementoSeguro("input", {
    type: "text",
    id,
    maxlength: "200",
    placeholder: "Ej.: Resolución 123/2026 del Consejo Directivo",
    "aria-describedby": `${id}-ayuda ${id}-error`,
    "aria-required": "true",
  });
  const archivo = crearElementoSeguro("input", { type: "file", id: `${id}-archivo`, accept: ".pdf,application/pdf" });
  const error = crearElementoSeguro("span", { id: `${id}-error`, clase: "error-campo", role: "alert", hidden: true });

  const elemento = crearElementoSeguro("div", { clase: "campo" }, [
    crearElementoSeguro("label", { for: id }, [etiqueta, " ", crearElementoSeguro("span", { clase: "obligatorio", "aria-hidden": "true", texto: "*" })]),
    texto,
    crearElementoSeguro("span", {
      id: `${id}-ayuda`,
      clase: "ayuda-campo",
      texto: "Escribí el número de la resolución o adjuntá su PDF. En la blockchain solo queda una huella.",
    }),
    crearElementoSeguro("label", { for: `${id}-archivo`, clase: "ayuda-campo", texto: "PDF de la resolución (opcional, reemplaza al texto):" }),
    archivo,
    error,
  ]);

  async function obtenerHuella() {
    error.hidden = true;
    texto.removeAttribute("aria-invalid");
    const pdf = archivo.files?.[0];
    if (pdf) return calcularHuellaArchivo(pdf);
    if (!texto.value.trim()) {
      texto.setAttribute("aria-invalid", "true");
      error.textContent = "Indicá el acto administrativo.";
      error.hidden = false;
      texto.focus();
      throw new Error("Falta la referencia del acto administrativo.");
    }
    return calcularHuellaTexto(texto.value);
  }

  return { elemento, obtenerHuella };
}
