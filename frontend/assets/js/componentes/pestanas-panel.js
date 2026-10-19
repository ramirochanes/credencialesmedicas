// Pestañas accesibles (role=tablist, flechas izquierda/derecha para navegar).
import { crearElementoSeguro } from "../nucleo/dom-seguro.js";

/**
 * @param {HTMLElement} contenedor
 * @param {Array<{clave: string, titulo: string, contenido: HTMLElement}>} pestanas
 * @returns {{activar: (clave: string) => void}}
 */
export function montarPestanas(contenedor, pestanas, prefijo = "pestana") {
  const botones = [];
  const paneles = [];
  const lista = crearElementoSeguro("div", { clase: "pestanas", role: "tablist" });

  function activar(clave) {
    pestanas.forEach((pestana, indice) => {
      const activa = pestana.clave === clave;
      botones[indice].setAttribute("aria-selected", String(activa));
      botones[indice].tabIndex = activa ? 0 : -1;
      paneles[indice].hidden = !activa;
    });
  }

  pestanas.forEach((pestana, indice) => {
    const idBoton = `${prefijo}-${pestana.clave}`;
    const idPanel = `${prefijo}-panel-${pestana.clave}`;
    const boton = crearElementoSeguro("button", {
      type: "button",
      role: "tab",
      id: idBoton,
      "aria-controls": idPanel,
      texto: pestana.titulo,
      onclick: () => activar(pestana.clave),
    });
    boton.addEventListener("keydown", (evento) => {
      if (evento.key !== "ArrowRight" && evento.key !== "ArrowLeft") return;
      const siguiente = (indice + (evento.key === "ArrowRight" ? 1 : -1) + pestanas.length) % pestanas.length;
      activar(pestanas[siguiente].clave);
      botones[siguiente].focus();
    });
    const panel = crearElementoSeguro("div", { role: "tabpanel", id: idPanel, "aria-labelledby": idBoton }, [pestana.contenido]);
    botones.push(boton);
    paneles.push(panel);
    lista.append(boton);
  });

  contenedor.replaceChildren(lista, ...paneles);
  activar(pestanas[0].clave);
  return { activar };
}
