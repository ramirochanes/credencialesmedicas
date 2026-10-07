// Panel de gobernanza: padrón de instituciones, cuentas operadoras y pausa de
// emergencia. La gobernanza NO puede cambiar estados de credenciales (lo impone el contrato).
import { isAddress, getAddress } from "../../vendor/ethers-6.17.0.min.js";
import { montarEstructuraSitio } from "../componentes/cabecera-sitio.js";
import { montarPanelBilletera } from "../componentes/conexion-billetera.js";
import { ejecutarTransaccionConInterfaz } from "../componentes/ejecucion-transaccion.js";
import { confirmarAccion, mostrarAvisoEnPagina } from "../componentes/avisos-interfaz.js";
import { crearElementoSeguro, buscarElemento } from "../nucleo/dom-seguro.js";
import { listarInstituciones } from "../nucleo/contrato-credenciales.js";
import { TIPOS_INSTITUCION, TIPOS_CREDENCIAL, nombreTipoInstitucion, tiposDeMascara, nombreTipoCredencial } from "../nucleo/formato-credencial.js";

const TIPO_PRESTADOR = 4;

function crearCampo(id, etiqueta, control) {
  return crearElementoSeguro("div", { clase: "campo" }, [crearElementoSeguro("label", { for: id, texto: etiqueta }), control]);
}

function crearTablaInstituciones(sesion, instituciones, recargar) {
  const avisos = crearElementoSeguro("div");
  const filas = instituciones.map((institucion) => {
    const boton = crearElementoSeguro("button", { type: "button", clase: `boton ${institucion.habilitada ? "boton--peligro" : "boton--secundario"}`, texto: institucion.habilitada ? "Deshabilitar" : "Habilitar" });
    boton.addEventListener("click", async () => {
      if (institucion.habilitada && !(await confirmarAccion({ titulo: `¿Deshabilitar ${institucion.nombre}?`, texto: "Sus cuentas dejan de operar. Las credenciales emitidas siguen siendo verificables.", textoConfirmar: "Deshabilitar", peligrosa: true }))) return;
      const recibo = await ejecutarTransaccionConInterfaz({ boton, contenedorAvisos: avisos, firmante: sesion.firmante, metodo: "actualizarHabilitacionInstitucion", argumentos: [institucion.id, !institucion.habilitada], mensajeExito: "Padrón actualizado." });
      if (recibo) recargar();
    });
    return crearElementoSeguro("tr", {}, [
      crearElementoSeguro("td", { texto: String(institucion.id) }),
      crearElementoSeguro("td", { texto: institucion.nombre }),
      crearElementoSeguro("td", { texto: nombreTipoInstitucion(institucion.tipo) }),
      crearElementoSeguro("td", { texto: institucion.jurisdiccion || "—" }),
      crearElementoSeguro("td", { texto: tiposDeMascara(institucion.tiposCredencialHabilitados).map(nombreTipoCredencial).join(", ") || "Solo verifica" }),
      crearElementoSeguro("td", { texto: institucion.habilitada ? "Habilitada" : "Deshabilitada" }),
      crearElementoSeguro("td", { clase: "acciones" }, sesion.contexto.esGobernanza ? [boton] : []),
    ]);
  });
  return crearElementoSeguro("div", {}, [avisos, crearElementoSeguro("div", { clase: "tabla-contenedor" }, [
    crearElementoSeguro("table", { clase: "tabla" }, [
      crearElementoSeguro("thead", {}, [crearElementoSeguro("tr", {}, ["#", "Nombre", "Naturaleza", "Jurisdicción", "Puede emitir", "Estado", "Acciones"].map((titulo) => crearElementoSeguro("th", { scope: "col", texto: titulo })))]),
      crearElementoSeguro("tbody", {}, filas),
    ]),
  ])]);
}

function crearFormularioAlta(sesion, recargar) {
  const nombre = crearElementoSeguro("input", { type: "text", id: "alta-nombre", maxlength: "120" });
  const tipo = crearElementoSeguro("select", { id: "alta-tipo" }, TIPOS_INSTITUCION.slice(1).map((texto, i) => crearElementoSeguro("option", { value: String(i + 1), texto })));
  const jurisdiccion = crearElementoSeguro("input", { type: "text", id: "alta-jurisdiccion", maxlength: "120" });
  const casillas = TIPOS_CREDENCIAL.slice(1).map((texto, i) => crearElementoSeguro("input", { type: "checkbox", id: `alta-credencial-${i + 1}`, value: String(i + 1) }));
  const grupoCasillas = crearElementoSeguro("fieldset", { clase: "grupo-campos" }, [
    crearElementoSeguro("legend", { texto: "Tipos de credencial que puede emitir" }),
    ...casillas.map((casilla, i) => crearElementoSeguro("label", { for: casilla.id, style: "display:flex;gap:.5rem;align-items:center;min-height:44px" }, [casilla, TIPOS_CREDENCIAL[i + 1]])),
  ]);
  tipo.addEventListener("change", () => {
    const esPrestador = Number(tipo.value) === TIPO_PRESTADOR;
    casillas.forEach((casilla) => { casilla.disabled = esPrestador; if (esPrestador) casilla.checked = false; });
  });
  const avisos = crearElementoSeguro("div");
  const boton = crearElementoSeguro("button", { type: "button", clase: "boton boton--primario", texto: "Dar de alta" });
  boton.addEventListener("click", async () => {
    const mascara = casillas.filter((casilla) => casilla.checked).reduce((acumulado, casilla) => acumulado | (1 << Number(casilla.value)), 0);
    if (!nombre.value.trim()) { mostrarAvisoEnPagina(avisos, "error", "Falta el nombre de la institución"); nombre.focus(); return; }
    const recibo = await ejecutarTransaccionConInterfaz({ boton, contenedorAvisos: avisos, firmante: sesion.firmante, metodo: "altaInstitucion", argumentos: [nombre.value.trim(), Number(tipo.value), jurisdiccion.value.trim(), mascara], mensajeExito: "Institución dada de alta." });
    if (recibo) recargar();
  });
  return crearElementoSeguro("section", { clase: "tarjeta" }, [
    crearElementoSeguro("h2", { texto: "Alta de institución" }),
    crearCampo("alta-nombre", "Nombre", nombre), crearCampo("alta-tipo", "Naturaleza", tipo), crearCampo("alta-jurisdiccion", "Jurisdicción", jurisdiccion),
    grupoCasillas, avisos, boton,
  ]);
}

function crearFormularioCuentas(sesion, instituciones, recargar) {
  const cuenta = crearElementoSeguro("input", { type: "text", id: "cuenta-operadora", spellcheck: "false", placeholder: "0x…" });
  const institucion = crearElementoSeguro("select", { id: "cuenta-institucion" }, instituciones.map((item) => crearElementoSeguro("option", { value: String(item.id), texto: `${item.id} — ${item.nombre}` })));
  const avisos = crearElementoSeguro("div");
  const vincular = crearElementoSeguro("button", { type: "button", clase: "boton boton--primario", texto: "Vincular" });
  const desvincular = crearElementoSeguro("button", { type: "button", clase: "boton boton--peligro", texto: "Desvincular" });
  const direccion = () => { if (!isAddress(cuenta.value.trim())) throw new Error("La dirección no es válida."); return getAddress(cuenta.value.trim()); };
  vincular.addEventListener("click", async () => {
    try { const recibo = await ejecutarTransaccionConInterfaz({ boton: vincular, contenedorAvisos: avisos, firmante: sesion.firmante, metodo: "vincularCuentaOperadora", argumentos: [direccion(), Number(institucion.value)], mensajeExito: "Cuenta vinculada." }); if (recibo) recargar(); }
    catch (error) { mostrarAvisoEnPagina(avisos, "error", error.message); }
  });
  desvincular.addEventListener("click", async () => {
    try { const recibo = await ejecutarTransaccionConInterfaz({ boton: desvincular, contenedorAvisos: avisos, firmante: sesion.firmante, metodo: "desvincularCuentaOperadora", argumentos: [direccion()], mensajeExito: "Cuenta desvinculada." }); if (recibo) recargar(); }
    catch (error) { mostrarAvisoEnPagina(avisos, "error", error.message); }
  });
  return crearElementoSeguro("section", { clase: "tarjeta" }, [
    crearElementoSeguro("h2", { texto: "Cuentas operadoras" }),
    crearElementoSeguro("p", { clase: "texto-chico texto-secundario", texto: "Cada wallet opera para una sola institución. Ante un cambio de autoridades: desvincular la cuenta saliente y vincular la nueva." }),
    crearCampo("cuenta-operadora", "Wallet", cuenta), crearCampo("cuenta-institucion", "Institución", institucion),
    avisos, crearElementoSeguro("div", { clase: "grupo-botones" }, [vincular, desvincular]),
  ]);
}

function crearControlPausa(sesion, recargar) {
  const { enPausa, esGobernanza, esGuardian } = sesion.contexto;
  const avisos = crearElementoSeguro("div");
  const puede = enPausa ? esGobernanza : esGuardian;
  const boton = crearElementoSeguro("button", { type: "button", clase: `boton ${enPausa ? "boton--primario" : "boton--peligro"}`, texto: enPausa ? "Reanudar registro" : "Pausar registro", disabled: !puede });
  boton.addEventListener("click", async () => {
    if (!enPausa && !(await confirmarAccion({ titulo: "¿Activar la pausa de emergencia?", texto: "Se bloquean todas las escrituras de credenciales hasta que la gobernanza reanude.", textoConfirmar: "Pausar", peligrosa: true }))) return;
    const recibo = await ejecutarTransaccionConInterfaz({ boton, contenedorAvisos: avisos, firmante: sesion.firmante, metodo: enPausa ? "reanudarRegistro" : "pausarRegistro", argumentos: [], mensajeExito: enPausa ? "Registro reanudado." : "Registro en pausa." });
    if (recibo) window.location.reload();
  });
  return crearElementoSeguro("section", { clase: "tarjeta" }, [
    crearElementoSeguro("h2", { texto: "Pausa de emergencia" }),
    crearElementoSeguro("p", { texto: `Estado actual: ${enPausa ? "EN PAUSA" : "operativo"}. Pausa: guardián. Reanudación: solo gobernanza.` }),
    avisos, boton,
  ]);
}

async function mostrarPanelGobernanza(sesion) {
  const area = buscarElemento("#area-gobernanza");
  if (!sesion.contexto.esGobernanza && !sesion.contexto.esGuardian) {
    mostrarAvisoEnPagina(area, "advertencia", "Tu cuenta no es administradora", "Podés ver la lista de instituciones, pero no modificarla.");
  }
  const recargar = () => mostrarPanelGobernanza(sesion);
  try {
    const instituciones = await listarInstituciones({ refrescar: true });
    area.replaceChildren(
      crearElementoSeguro("section", { clase: "tarjeta" }, [crearElementoSeguro("h2", { texto: "Padrón de instituciones" }), crearTablaInstituciones(sesion, instituciones, recargar)]),
      sesion.contexto.esGobernanza ? crearElementoSeguro("div", { clase: "grilla-dos-columnas" }, [crearFormularioAlta(sesion, recargar), crearFormularioCuentas(sesion, instituciones, recargar)]) : null,
      crearControlPausa(sesion, recargar),
    );
  } catch (error) {
    mostrarAvisoEnPagina(area, "error", "No se pudo leer el padrón", error.message);
  }
}

montarEstructuraSitio("gobernanza");
montarPanelBilletera(buscarElemento("#panel-billetera"), {
  descripcion: "Ingresá con el mail del administrador del registro.",
  alConectar: mostrarPanelGobernanza,
});
