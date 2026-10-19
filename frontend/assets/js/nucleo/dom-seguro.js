// Construcción de DOM sin innerHTML: todo texto que viene de la blockchain
// (nombres de instituciones, descripciones) se inserta como texto, nunca como HTML.

/**
 * @param {string} etiqueta
 * @param {Record<string, unknown>} [atributos] clase, texto, dataset, on<Evento>, o atributos HTML
 * @param {Array<Node|string|number|null|false>|Node|string} [hijos]
 */
export function crearElementoSeguro(etiqueta, atributos = {}, hijos = []) {
  const elemento = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === "clase") elemento.className = String(valor);
    else if (clave === "texto") elemento.textContent = String(valor);
    else if (clave === "dataset") Object.assign(elemento.dataset, valor);
    else if (clave.startsWith("on") && typeof valor === "function") {
      elemento.addEventListener(clave.slice(2).toLowerCase(), valor);
    } else elemento.setAttribute(clave, valor === true ? "" : String(valor));
  }
  for (const hijo of [].concat(hijos)) {
    if (hijo === undefined || hijo === null || hijo === false) continue;
    elemento.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return elemento;
}

export function buscarElemento(selector, raiz = document) {
  const elemento = raiz.querySelector(selector);
  if (!elemento) throw new Error(`No se encontró el elemento ${selector}`);
  return elemento;
}

export function vaciarContenedor(contenedor, ...nuevosHijos) {
  contenedor.replaceChildren(...nuevosHijos.filter(Boolean));
}

/** Fila de una lista de definición (<dt>/<dd>). */
export function crearFilaDato(etiqueta, valor) {
  const contenido = valor instanceof Node ? valor : document.createTextNode(String(valor ?? "—"));
  return [crearElementoSeguro("dt", { texto: etiqueta }), crearElementoSeguro("dd", {}, [contenido])];
}

/** Bloque de código con botón "Copiar". */
export function crearValorCopiable(valor, etiquetaAccesible = "Copiar al portapapeles") {
  const boton = crearElementoSeguro("button", {
    type: "button",
    clase: "enlace texto-chico boton-copiar",
    "aria-label": etiquetaAccesible,
    texto: "Copiar",
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(valor);
        boton.textContent = "Copiado";
        setTimeout(() => (boton.textContent = "Copiar"), 1800);
      } catch {
        boton.textContent = "No se pudo copiar";
      }
    },
  });
  return crearElementoSeguro("span", {}, [crearElementoSeguro("code", { texto: valor }), " ", boton]);
}
