// Emisor · Carga inicial: migra en lote (hasta 50) credenciales que la institución
// ya había emitido antes de sumarse al registro. Cada PDF genera su huella local.
import { ZeroAddress, ZeroHash } from "../../../vendor/ethers-6.17.0.min.js";
import { crearElementoSeguro } from "../../nucleo/dom-seguro.js";
import { calcularHuellaArchivo, generarIdentificadorCredencial } from "../../nucleo/huella-documento.js";
import { tiposDeMascara, nombreTipoCredencial, fechaInputASegundos } from "../../nucleo/formato-credencial.js";
import { urlVerificacionCredencial } from "../../nucleo/configuracion.js";
import { ejecutarTransaccionConInterfaz } from "../../componentes/ejecucion-transaccion.js";
import { mostrarAvisoEnPagina } from "../../componentes/avisos-interfaz.js";

const MAXIMO_POR_LOTE = 50;

function descargarCsv(filas) {
  const encabezado = "archivo,identificador,huella_sha256,link_verificacion";
  const cuerpo = filas.map((fila) => [fila.archivo, fila.idCredencial, fila.hashDocumento, urlVerificacionCredencial(fila.idCredencial)]
    .map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(","));
  const archivo = new Blob([[encabezado, ...cuerpo].join("\n")], { type: "text/csv;charset=utf-8" });
  const enlace = crearElementoSeguro("a", { href: URL.createObjectURL(archivo), download: `carga-inicial-${Date.now()}.csv` });
  enlace.click();
}

export function crearCargaInicialLote(sesion) {
  const tipos = tiposDeMascara(sesion.contexto.institucion.tiposCredencialHabilitados);
  const archivos = crearElementoSeguro("input", { type: "file", id: "lote-archivos", multiple: true, accept: ".pdf,application/pdf" });
  const tipo = crearElementoSeguro("select", { id: "lote-tipo" }, tipos.map((valor) => crearElementoSeguro("option", { value: String(valor), texto: nombreTipoCredencial(valor) })));
  const emitidaEl = crearElementoSeguro("input", { type: "date", id: "lote-emitida", "aria-required": "true" });
  const venceEl = crearElementoSeguro("input", { type: "date", id: "lote-vence" });
  const avisos = crearElementoSeguro("div");
  const resultado = crearElementoSeguro("div", { "aria-live": "polite" });
  const boton = crearElementoSeguro("button", { type: "button", clase: "boton boton--primario", texto: "Registrar lote" });

  boton.addEventListener("click", async () => {
    const seleccion = [...(archivos.files ?? [])];
    if (!seleccion.length || seleccion.length > MAXIMO_POR_LOTE) {
      mostrarAvisoEnPagina(avisos, "error", "Revisá los archivos", `Elegí entre 1 y ${MAXIMO_POR_LOTE} PDF.`);
      return;
    }
    if (!emitidaEl.value) {
      mostrarAvisoEnPagina(avisos, "error", "Falta la fecha de emisión original");
      emitidaEl.focus();
      return;
    }
    const emitidaSegundos = Math.min(fechaInputASegundos(emitidaEl.value) - 86399, Math.floor(Date.now() / 1000) - 60);
    const filas = await Promise.all(seleccion.map(async (archivo) => ({
      archivo: archivo.name,
      idCredencial: generarIdentificadorCredencial(),
      hashDocumento: await calcularHuellaArchivo(archivo),
    })));
    const lote = filas.map((fila) => ({
      idCredencial: fila.idCredencial,
      tipo: Number(tipo.value),
      referenciaInterna: ZeroHash,
      cuentaTitular: ZeroAddress,
      hashDocumento: fila.hashDocumento,
      emitidaEl: emitidaSegundos,
      venceEl: fechaInputASegundos(venceEl.value),
    }));
    const recibo = await ejecutarTransaccionConInterfaz({
      boton, contenedorAvisos: avisos, firmante: sesion.firmante,
      metodo: "emitirCredencialesPreexistentesEnLote", argumentos: [lote],
      mensajeExito: `${lote.length} credencial(es) migradas.`,
    });
    if (!recibo) return;
    resultado.replaceChildren(
      crearElementoSeguro("div", { clase: "aviso aviso--exito", role: "status" }, [
        crearElementoSeguro("div", {}, [
          crearElementoSeguro("strong", { texto: `${lote.length} credencial(es) registradas como carga inicial.` }),
          crearElementoSeguro("p", { texto: "Descargá el CSV con los identificadores: es la relación entre cada archivo y su credencial." }),
          crearElementoSeguro("button", { type: "button", clase: "boton boton--secundario", texto: "Descargar CSV", onclick: () => descargarCsv(filas) }),
        ]),
      ]),
    );
  });

  return crearElementoSeguro("div", {}, [
    crearElementoSeguro("p", { clase: "texto-secundario", texto: "Para credenciales emitidas antes de sumarse al registro. Quedan Activas con la marca «carga inicial» en su historial." }),
    crearElementoSeguro("div", { clase: "campo" }, [crearElementoSeguro("label", { for: "lote-archivos", texto: `PDF de las credenciales (máximo ${MAXIMO_POR_LOTE})` }), archivos]),
    crearElementoSeguro("div", { clase: "grilla-tres-columnas" }, [
      crearElementoSeguro("div", { clase: "campo" }, [crearElementoSeguro("label", { for: "lote-tipo", texto: "Tipo" }), tipo]),
      crearElementoSeguro("div", { clase: "campo" }, [crearElementoSeguro("label", { for: "lote-emitida", texto: "Fecha de emisión original" }), emitidaEl]),
      crearElementoSeguro("div", { clase: "campo" }, [crearElementoSeguro("label", { for: "lote-vence", texto: "Vencimiento (opcional)" }), venceEl]),
    ]),
    avisos, boton, resultado,
  ]);
}
