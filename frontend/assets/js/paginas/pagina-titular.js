// Panel del profesional (titular): ve sus credenciales, presenta el QR y declara
// antecedentes propios (segunda capa, marcada como autodeclarada).
import { montarEstructuraSitio } from "../componentes/cabecera-sitio.js";
import { montarPanelBilletera } from "../componentes/conexion-billetera.js";
import { crearCredencialDigital } from "../componentes/codigo-qr-credencial.js";
import { crearFormularioFirmaTitularidad } from "../componentes/firma-titularidad.js";
import { crearListaAntecedentes } from "../componentes/linea-tiempo-historial.js";
import { montarSelectorDocumento } from "../componentes/selector-documento.js";
import { ejecutarTransaccionConInterfaz } from "../componentes/ejecucion-transaccion.js";
import { confirmarAccion, mostrarAvisoEnPagina } from "../componentes/avisos-interfaz.js";
import { crearElementoSeguro, buscarElemento } from "../nucleo/dom-seguro.js";
import { leerCredencialesDeCuentaTitular, leerInstitucion, leerAntecedentesCredencial } from "../nucleo/contrato-credenciales.js";
import { ESTADO } from "../nucleo/formato-credencial.js";

const LARGO_MAXIMO_DESCRIPCION = 140;

function crearFormularioAntecedente(sesion, ficha, alTerminar) {
  const idCampo = `antecedente-${ficha.id.slice(2, 10)}`;
  const descripcion = crearElementoSeguro("input", { type: "text", id: idCampo, maxlength: String(LARGO_MAXIMO_DESCRIPCION), "aria-describedby": `${idCampo}-contador` });
  const contador = crearElementoSeguro("span", { id: `${idCampo}-contador`, clase: "contador-caracteres", texto: `0/${LARGO_MAXIMO_DESCRIPCION}` });
  descripcion.addEventListener("input", () => (contador.textContent = `${new TextEncoder().encode(descripcion.value).length}/${LARGO_MAXIMO_DESCRIPCION}`));
  const zonaEvidencia = crearElementoSeguro("div");
  const evidencia = montarSelectorDocumento(zonaEvidencia, { titulo: "Certificado o constancia (PDF)" });
  const avisos = crearElementoSeguro("div");
  const boton = crearElementoSeguro("button", { type: "button", clase: "boton boton--turquesa", texto: "Publicar antecedente" });

  boton.addEventListener("click", async () => {
    const texto = descripcion.value.trim();
    const largo = new TextEncoder().encode(texto).length;
    if (!largo || largo > LARGO_MAXIMO_DESCRIPCION) {
      mostrarAvisoEnPagina(avisos, "error", "Revisá la descripción", `Tiene que tener entre 1 y ${LARGO_MAXIMO_DESCRIPCION} caracteres.`);
      return;
    }
    if (!evidencia.huellaActual()) {
      mostrarAvisoEnPagina(avisos, "error", "Falta la evidencia", "Elegí el PDF que respalda el antecedente: se publica solo su huella.");
      return;
    }
    const confirmado = await confirmarAccion({
      titulo: "¿Publicar este antecedente?",
      texto: "La descripción queda pública y permanente en la blockchain (podés retirarla después, pero el registro histórico permanece). No incluyas datos de salud ni de terceros.",
      textoConfirmar: "Publicar",
    });
    if (!confirmado) return;
    const recibo = await ejecutarTransaccionConInterfaz({
      boton, contenedorAvisos: avisos, firmante: sesion.firmante,
      metodo: "declararAntecedenteProfesional", argumentos: [ficha.id, evidencia.huellaActual(), texto],
      mensajeExito: "Antecedente publicado.",
    });
    if (recibo) alTerminar();
  });

  return crearElementoSeguro("fieldset", { clase: "grupo-campos" }, [
    crearElementoSeguro("legend", { texto: "Declarar un antecedente" }),
    crearElementoSeguro("p", { clase: "texto-chico texto-secundario", texto: "Cursos, especializaciones o formación que la institución no certifica. Se muestra como autodeclarado." }),
    crearElementoSeguro("div", { clase: "campo" }, [crearElementoSeguro("label", { for: idCampo, texto: "Descripción breve" }), descripcion, contador]),
    zonaEvidencia, avisos, boton,
  ]);
}

async function crearTarjetaCredencial(sesion, ficha, alTerminar) {
  const [institucion, antecedentes] = await Promise.all([leerInstitucion(ficha.datos.institucionEmisora), leerAntecedentesCredencial(ficha.id)]);
  const avisos = crearElementoSeguro("div");
  const retirar = async (antecedente) => {
    const confirmado = await confirmarAccion({ titulo: "¿Retirar el antecedente?", texto: antecedente.descripcion, textoConfirmar: "Retirar", peligrosa: true });
    if (!confirmado) return;
    const boton = crearElementoSeguro("button");
    const recibo = await ejecutarTransaccionConInterfaz({
      boton, contenedorAvisos: avisos, firmante: sesion.firmante,
      metodo: "retirarAntecedenteProfesional", argumentos: [ficha.id, antecedente.indice], mensajeExito: "Antecedente retirado.",
    });
    if (recibo) alTerminar();
  };
  return crearElementoSeguro("section", { clase: "tarjeta" }, [
    crearCredencialDigital(ficha, institucion),
    crearElementoSeguro("div", { clase: "separacion-superior" }, [crearFormularioFirmaTitularidad(sesion, ficha)]),
    crearElementoSeguro("h3", { clase: "separacion-superior", texto: "Antecedentes autodeclarados" }),
    avisos,
    crearListaAntecedentes(antecedentes, { alRetirar: retirar }),
    ficha.estadoVigente === ESTADO.Activa ? crearFormularioAntecedente(sesion, ficha, alTerminar) : null,
  ]);
}

async function mostrarCredencialesDelTitular(sesion) {
  const area = buscarElemento("#area-titular");
  area.replaceChildren(crearElementoSeguro("p", { role: "status", texto: "Buscando tus credenciales…" }));
  try {
    const fichas = await leerCredencialesDeCuentaTitular(sesion.cuenta);
    if (!fichas.length) {
      area.replaceChildren(crearElementoSeguro("div", { clase: "tarjeta estado-vacio" }, [
        crearElementoSeguro("strong", { texto: "Todavía no hay matrículas asociadas a tu cuenta" }),
        `Pasale tu número de cuenta a tu colegio o universidad para que lo asocie a tu matrícula: ${sesion.cuenta}`,
      ]));
      return;
    }
    const tarjetas = await Promise.all(fichas.map((ficha) => crearTarjetaCredencial(sesion, ficha, () => mostrarCredencialesDelTitular(sesion))));
    area.replaceChildren(...tarjetas);
  } catch (error) {
    mostrarAvisoEnPagina(area, "error", "No se pudieron leer tus credenciales", error.message);
  }
}

montarEstructuraSitio("titular");
montarPanelBilletera(buscarElemento("#panel-billetera"), {
  descripcion: "Ingresá con tu mail.",
  alConectar: mostrarCredencialesDelTitular,
});
