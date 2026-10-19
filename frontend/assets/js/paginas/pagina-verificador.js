// Panel del verificador institucional (hospitales, clínicas, otros colegios):
// consulta una credencial y deja constancia on-chain de la verificación.
import { montarEstructuraSitio } from "../componentes/cabecera-sitio.js";
import { montarPanelBilletera } from "../componentes/conexion-billetera.js";
import { crearResultadoEstado, crearFichaDatosCredencial } from "../componentes/tarjeta-estado-credencial.js";
import { crearListaVerificaciones } from "../componentes/linea-tiempo-historial.js";
import { ejecutarTransaccionConInterfaz } from "../componentes/ejecucion-transaccion.js";
import { mostrarAvisoEnPagina } from "../componentes/avisos-interfaz.js";
import { crearPanelPruebaTitularidad } from "../componentes/panel-prueba-titularidad.js";
import { crearElementoSeguro, buscarElemento } from "../nucleo/dom-seguro.js";
import { extraerIdentificadorCredencial } from "../nucleo/huella-documento.js";
import { leerFichaCredencial, leerInstitucion, leerVerificacionesCredencial, listarInstituciones } from "../nucleo/contrato-credenciales.js";
import { ESTADO } from "../nucleo/formato-credencial.js";

function mostrarPanelVerificador(sesion) {
  const area = buscarElemento("#area-verificador");
  if (!sesion.contexto.institucion) {
    mostrarAvisoEnPagina(area, "advertencia", "Todavía no estás habilitado para un hospital o una clínica",
      `Pasale tu número de cuenta al administrador del registro para que te habilite: ${sesion.cuenta}. Mientras tanto, podés consultar cualquier matrícula desde la página de inicio.`);
    return;
  }
  const campo = crearElementoSeguro("input", { type: "search", id: "verificador-id", spellcheck: "false", placeholder: "0x… o link del QR" });
  const avisos = crearElementoSeguro("div");
  const detalle = crearElementoSeguro("div", { "aria-live": "polite" });

  async function consultar(texto) {
    const id = extraerIdentificadorCredencial(texto);
    if (!id) {
      mostrarAvisoEnPagina(avisos, "error", "Identificador inválido", "Pegá el identificador o el link que figura en el QR del profesional.");
      return;
    }
    avisos.replaceChildren();
    detalle.replaceChildren(crearElementoSeguro("p", { role: "status", texto: "Consultando…" }));
    try {
      const [ficha, instituciones] = await Promise.all([leerFichaCredencial(id), listarInstituciones()]);
      const institucionesPorId = new Map(instituciones.map((item) => [item.id, item]));
      const institucion = await leerInstitucion(ficha.datos.institucionEmisora);
      const verificaciones = ficha.estadoVigente === ESTADO.Inexistente ? null : await leerVerificacionesCredencial(id);
      const avisosRegistro = crearElementoSeguro("div");
      const boton = crearElementoSeguro("button", { type: "button", clase: "boton boton--turquesa", texto: "Registrar verificación on-chain" });
      boton.addEventListener("click", async () => {
        const recibo = await ejecutarTransaccionConInterfaz({
          boton, contenedorAvisos: avisosRegistro, firmante: sesion.firmante,
          metodo: "registrarVerificacionInstitucional", argumentos: [id],
          mensajeExito: "Verificación registrada a nombre de tu institución.",
        });
        if (recibo) consultar(id);
      });
      detalle.replaceChildren(
        crearResultadoEstado(ficha, institucion),
        verificaciones
          ? crearElementoSeguro("div", { clase: "grilla-dos-columnas" }, [
              crearElementoSeguro("section", { clase: "tarjeta" }, [
                crearElementoSeguro("h2", { texto: "Dejar constancia" }),
                crearElementoSeguro("p", { texto: `Queda registrado que ${sesion.contexto.institucion.nombre} verificó esta credencial, con fecha y el estado observado. Sirve como evidencia ante auditorías.` }),
                avisosRegistro, boton,
                crearElementoSeguro("h3", { clase: "separacion-superior", texto: "Verificaciones anteriores" }),
                crearListaVerificaciones(verificaciones, institucionesPorId),
              ]),
              crearElementoSeguro("div", {}, [
                crearElementoSeguro("section", { clase: "tarjeta tarjeta--acento" }, [
                  crearElementoSeguro("h2", { texto: "Prueba de titularidad" }),
                  crearPanelPruebaTitularidad(ficha),
                ]),
                crearElementoSeguro("section", { clase: "tarjeta" }, [crearElementoSeguro("h2", { texto: "Ficha" }), crearFichaDatosCredencial(ficha)]),
              ]),
            ])
          : null,
      );
    } catch (error) {
      detalle.replaceChildren();
      mostrarAvisoEnPagina(avisos, "error", "No se pudo consultar la credencial", error.message);
    }
  }

  const formulario = crearElementoSeguro("form", { clase: "tarjeta", novalidate: true, onsubmit: (evento) => { evento.preventDefault(); consultar(campo.value); } }, [
    crearElementoSeguro("div", { clase: "campo" }, [
      crearElementoSeguro("label", { for: "verificador-id", texto: "Credencial a verificar" }),
      crearElementoSeguro("div", { clase: "busqueda-credencial" }, [campo, crearElementoSeguro("button", { type: "submit", clase: "boton boton--primario", texto: "Consultar" })]),
    ]),
  ]);
  area.replaceChildren(formulario, avisos, detalle);
}

montarEstructuraSitio("verificador");
montarPanelBilletera(buscarElemento("#panel-billetera"), {
  descripcion: "Ingresá con el mail con el que te habilitaron en tu hospital o clínica.",
  alConectar: mostrarPanelVerificador,
});
