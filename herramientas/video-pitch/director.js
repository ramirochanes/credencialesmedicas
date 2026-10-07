// Guion del video pitch: encadena las escenas con tiempos fijos.
// Las pantallas del sitio son el sitio real corriendo (iframes), no imágenes.
import { CONFIG } from "../assets/js/nucleo/configuracion.js";

const DIRECCION_RED_PRINCIPAL = "0x374adD49ce1101BC440b431EC24eee36a6A98565";
const ID_VIGENTE = "0x5228c2ac58424bc43bc8dd25439c78a139824cbffcf6b7664673503b65b03355";
const ID_SUSPENDIDA = "0x265140c3904c9770142543de93837125afc5691bdb3bc9e7efb6d2bec4e2bb05";
const ID_BAJA = "0xc6fc60428ae3b66214fa6a824092d29bd02ae02da16473f3d2aafa7a9e5f456e";

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => document.querySelector(s);
const dedo = $("#dedo");

// ---------- utilidades ----------
async function mostrarLineas(raiz, pausa = 220) {
  for (const l of raiz.querySelectorAll(".linea")) { l.classList.add("visible"); await esperar(pausa); }
}
async function activarEscena(id) {
  document.querySelectorAll(".escena.activa").forEach((e) => e.classList.remove("activa"));
  await esperar(500);
  const escena = $(id);
  escena.classList.add("activa");
  return escena;
}
async function cambiarTexto(contenedor, rotulo, titulo, bajada, { chico = false } = {}) {
  contenedor.querySelectorAll(".linea").forEach((l) => l.classList.add("salida"));
  if (contenedor.children.length) await esperar(650);
  contenedor.innerHTML = `<p class="rotulo linea">${rotulo}</p><p class="titulo linea${chico ? " chico" : ""}">${titulo}</p>${bajada ? `<p class="bajada linea">${bajada}</p>` : ""}`;
  await esperar(40);
  await mostrarLineas(contenedor, 170);
}
async function esperarElemento(obtenerDoc, selector, limite = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < limite) {
    const el = obtenerDoc()?.querySelector(selector);
    if (el) return el;
    await esperar(50);
  }
  throw new Error(`No apareció ${selector}`);
}
function cargarMarco(marco, url) {
  return new Promise((ok) => { marco.addEventListener("load", ok, { once: true }); marco.src = url; });
}
function desplazar(ventana, hasta, ms) {
  const desde = ventana.scrollY, t0 = performance.now();
  return new Promise((ok) => {
    function paso(t) {
      const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      ventana.scrollTo(0, desde + (hasta - desde) * e);
      k < 1 ? requestAnimationFrame(paso) : ok();
    }
    requestAnimationFrame(paso);
  });
}
/** Posición en el escenario de un elemento dentro de un iframe (con la escala del dispositivo). */
function posicionEnEscenario(marco, el, escala = 1) {
  const m = marco.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: m.left + (r.left + r.width / 2) * escala, y: m.top + (r.top + r.height / 2) * escala };
}
async function moverDedo(marco, el, escala = 1) {
  const { x, y } = posicionEnEscenario(marco, el, escala);
  dedo.style.opacity = 1; dedo.style.left = `${x - 23}px`; dedo.style.top = `${y - 23}px`;
  await esperar(760);
}
async function tocar() { dedo.classList.add("toque"); await esperar(160); dedo.classList.remove("toque"); await esperar(120); }

// ---------- escenas ----------
async function escenaProblema() {
  const e = await activarEscena("#e1");
  await esperar(400);
  const lineas = [...e.querySelectorAll(".linea")];
  lineas[0].classList.add("visible"); await esperar(900);
  for (const l of lineas.slice(1, 4)) { l.classList.add("visible"); await esperar(1300); }
  await esperar(500);
  lineas[4].classList.add("visible"); await esperar(400);
  lineas[5].classList.add("visible");
  await esperar(5200);
}

async function escenaEscala() {
  const e = await activarEscena("#e2");
  const puntos = $("#puntos");
  puntos.innerHTML = Array.from({ length: 24 }, () => '<span class="punto"></span>').join("");
  const [rotulo, contador, bajada1, grilla, bajada2, ...resto] = e.querySelectorAll(".linea");
  rotulo.classList.add("visible"); await esperar(300);
  contador.classList.add("visible"); bajada1.classList.add("visible");
  const total = 244588, t0 = performance.now();
  await new Promise((ok) => {
    function paso(t) {
      const k = Math.min(1, (t - t0) / 2200), e2 = 1 - Math.pow(1 - k, 3);
      contador.textContent = Math.round(total * e2).toLocaleString("es-AR");
      k < 1 ? requestAnimationFrame(paso) : ok();
    }
    requestAnimationFrame(paso);
  });
  await esperar(400);
  grilla.classList.add("visible"); bajada2.classList.add("visible");
  for (const p of puntos.children) { p.classList.add("encendido"); await esperar(55); }
  await esperar(1400);
  const metodos = [...$("#metodos").querySelectorAll(".linea")];
  for (const m of metodos) { m.classList.add("visible"); await esperar(650); }
  await esperar(700);
  $("#sellos").classList.add("visible");
  resto[resto.length - 1].classList.add("visible");
  await esperar(3800);
}

async function escenaSolucion() {
  const e = await activarEscena("#e3");
  const texto = $("#texto-e3");
  const marco = $("#sitio-celular");
  const doc = () => marco.contentDocument;
  $("#telefono").classList.add("visible");
  await cambiarTexto(texto, "La solución", "Una capa de confianza", "El colegio otorga la matrícula como siempre y deja en blockchain una constancia de cada cambio, que nadie puede borrar.");
  $("#marca").classList.add("visible");
  await esperar(3200);
  await cambiarTexto(texto, "Verificación pública", "¿Esta matrícula es válida hoy?", "Cualquier hospital o paciente lo comprueba en segundos, sin registrarse.");
  await esperar(1200);
  const campo = await esperarElemento(doc, "#campo-busqueda");
  await moverDedo(marco, campo); await tocar();
  for (let i = 0; i < ID_VIGENTE.length; i += 3) { campo.value = ID_VIGENTE.slice(0, i + 3); await esperar(26); }
  await esperar(250);
  await moverDedo(marco, doc().querySelector("#formulario-busqueda button[type=submit]")); await tocar();
  dedo.style.opacity = 0;
  const cargado = new Promise((ok) => marco.addEventListener("load", ok, { once: true }));
  doc().querySelector("#formulario-busqueda").requestSubmit();
  await cargado;
  await esperarElemento(doc, "[class*='estado--activa']").catch(() => {});
  await esperar(400);
  await cambiarTexto(texto, "Resultado en el momento", "Vigente", "La otorgó una institución autorizada y es válida hoy. Lo responde el contrato en la blockchain, no un servidor.");
  $("#telefono").classList.add("zoom");
  await esperar(3200);
  $("#telefono").classList.remove("zoom");
  await esperar(1000);
  await cambiarTexto(texto, "Historial", "Todo queda registrado", "Cada paso de la matrícula, con fecha e institución.");
  const historial = doc().querySelector("#titulo-historial");
  if (historial) await desplazar(marco.contentWindow, historial.getBoundingClientRect().top + marco.contentWindow.scrollY - 80, 2400);
  await esperar(2200);
}

async function soltarArchivo(marco, zona, rutaPdf, nombre, original) {
  const escala = 0.66875;
  const archivo = $("#archivo");
  archivo.querySelector(".icono").classList.toggle("original", original);
  $("#nombre-archivo").textContent = nombre;
  Object.assign(archivo.style, { transition: "none", left: "760px", top: "900px", opacity: 0, transform: "rotate(-8deg)" });
  await esperar(60);
  archivo.style.transition = "";
  archivo.style.opacity = 1;
  await esperar(300);
  const destino = posicionEnEscenario(marco, zona, escala);
  archivo.style.left = `${destino.x - 75}px`; archivo.style.top = `${destino.y - 70}px`; archivo.style.transform = "rotate(0deg) scale(.8)";
  await esperar(1200);
  const v = marco.contentWindow;
  const bytes = await fetch(rutaPdf).then((r) => r.arrayBuffer());
  const dt = new v.DataTransfer();
  dt.items.add(new v.File([bytes], nombre, { type: "application/pdf" }));
  zona.dispatchEvent(new v.DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
  archivo.style.opacity = 0;
}

async function escenaDetecta() {
  const e = await activarEscena("#e4");
  const texto = $("#texto-e4");
  const marco = $("#sitio-notebook");
  const doc = () => marco.contentDocument;
  $("#marca").classList.remove("visible");
  $("#notebook").classList.add("visible");
  await cambiarTexto(texto, "Documentos", "¿El PDF es el original?", "Se sube el PDF que presentó el médico y se compara con la huella guardada en la blockchain.", { chico: true });
  const zonaCarga = await esperarElemento(doc, "#zona-contraste .selector-documento");
  await desplazar(marco.contentWindow, doc().querySelector("#titulo-documento").getBoundingClientRect().top + marco.contentWindow.scrollY - 120, 1600);
  await esperar(500);
  await soltarArchivo(marco, zonaCarga, "pdf/matricula-001.pdf", "matricula-001.pdf", true);
  await esperarElemento(doc, "#resultado-contraste .aviso").catch(() => {});
  await esperar(300);
  $("#notebook").classList.add("zoom");
  await esperar(2600);
  $("#notebook").classList.remove("zoom");
  await esperar(800);
  await cambiarTexto(texto, "Adulteraciones", "Si alguien lo modifica, se nota", "Basta un cambio mínimo en el archivo para que no coincida.", { chico: true });
  doc().querySelector("#resultado-contraste").replaceChildren();
  await soltarArchivo(marco, zonaCarga, "pdf/matricula-001-modificada.pdf", "matricula-001-modificada.pdf", false);
  await esperarElemento(doc, "#resultado-contraste .aviso").catch(() => {});
  await esperar(300);
  $("#notebook").classList.add("zoom");
  await esperar(3000);
  $("#notebook").classList.remove("zoom");
  await esperar(600);

  await cambiarTexto(texto, "Al instante", "Si el colegio la suspende, se ve en todo el país", "", { chico: true });
  await cargarMarco(marco, `../verificar.html?c=${ID_SUSPENDIDA}`);
  await esperarElemento(doc, "[class*='estado--suspendida']").catch(() => {});
  await esperar(3600);
  await cambiarTexto(texto, "Y si la da de baja", "Deja de ser válida", "Y el historial muestra cuándo y quién lo hizo.", { chico: true });
  await cargarMarco(marco, `../verificar.html?c=${ID_BAJA}`);
  await esperarElemento(doc, "[class*='estado--revocada']").catch(() => {});
  await esperar(1500);
  const historial = doc().querySelector("#titulo-historial");
  if (historial) await desplazar(marco.contentWindow, historial.getBoundingClientRect().top + marco.contentWindow.scrollY - 60, 2000);
  await esperar(2200);
}

async function escenaNegocio() {
  const e = await activarEscena("#e5");
  await mostrarLineas(e, 450);
  await esperar(9500);
}

async function escenaTecnologia() {
  const e = await activarEscena("#e6");
  const lineas = [...e.querySelectorAll(".linea")];
  lineas[0].classList.add("visible"); await esperar(200);
  lineas[1].classList.add("visible"); await esperar(500);
  const direccion = $("#direccion");
  direccion.classList.add("visible");
  for (let i = 1; i <= DIRECCION_RED_PRINCIPAL.length; i++) { direccion.textContent = DIRECCION_RED_PRINCIPAL.slice(0, i); await esperar(30); }
  await esperar(400);
  for (const l of lineas.slice(3)) { l.classList.add("visible"); await esperar(300); }
  await esperar(6500);
}

async function escenaEquipo() {
  const e = await activarEscena("#e6b");
  $("#equipo").innerHTML = (CONFIG.equipo || [])
    .map((p) => `<div class="persona linea"><b>${p.nombre}</b><span>${p.rol}</span></div>`).join("");
  await mostrarLineas(e, 230);
  await esperar(4500);
}

async function escenaCierre() {
  const e = await activarEscena("#e7");
  await esperar(300);
  await mostrarLineas(e, 600);
  await esperar(6500);
}

window.correrVideo = async function () {
  const notebook = $("#sitio-notebook");
  const precarga = cargarMarco(notebook, `../verificar.html?c=${ID_VIGENTE}`);
  await new Promise((ok) => ($("#sitio-celular").contentDocument?.readyState === "complete" ? ok() : $("#sitio-celular").addEventListener("load", ok, { once: true })));
  const marcas = {};
  const t0 = performance.now();
  const marcar = (n) => (marcas[n] = ((performance.now() - t0) / 1000).toFixed(1));
  marcar("problema"); await escenaProblema();
  marcar("escala"); await escenaEscala();
  marcar("solucion"); await escenaSolucion();
  await precarga;
  marcar("detecta"); await escenaDetecta();
  marcar("negocio"); await escenaNegocio();
  marcar("tecnologia"); await escenaTecnologia();
  marcar("equipo"); await escenaEquipo();
  marcar("cierre"); await escenaCierre();
  document.querySelectorAll(".escena.activa").forEach((x) => x.classList.remove("activa"));
  await esperar(1200);
  marcar("fin");
  return marcas;
};
