// Presentación del estado de una credencial: insignia compacta, tarjeta grande de
// resultado y ficha de datos. Reutilizada por verificar, emisor, titular y verificador.
import { crearElementoSeguro, crearFilaDato, crearValorCopiable } from "../nucleo/dom-seguro.js";
import {
  datosEstado,
  claseCssEstado,
  formatearFecha,
  formatearFechaHora,
  nombreTipoCredencial,
  nombreTipoInstitucion,
  acortarHexadecimal,
  ESTADO,
} from "../nucleo/formato-credencial.js";
import { urlExploradorDireccion } from "../nucleo/configuracion.js";

export function crearInsigniaEstado(numeroEstado) {
  return crearElementoSeguro("span", {
    clase: `insignia-estado ${claseCssEstado(numeroEstado)}`,
    texto: datosEstado(numeroEstado).nombre,
  });
}

function textoVencimiento(ficha) {
  const { venceEl } = ficha.datos;
  if (!venceEl) return "Sin vencimiento";
  const vencida = venceEl <= ficha.consultadaEl;
  return `${formatearFecha(venceEl)}${vencida ? " (vencida)" : ""}`;
}

/** Tarjeta principal: estado grande + explicación + emisor. */
export function crearResultadoEstado(ficha, institucion) {
  const estado = datosEstado(ficha.estadoVigente);
  const emisor = institucion
    ? `${institucion.nombre} — ${nombreTipoInstitucion(institucion.tipo)}${institucion.jurisdiccion ? `, ${institucion.jurisdiccion}` : ""}`
    : null;
  const advertenciaPersistido =
    ficha.estadoVigente === ESTADO.Vencida && ficha.datos.estadoPersistido !== ESTADO.Vencida
      ? "El vencimiento se calcula por fecha: todavía nadie lo asentó en el historial, pero ya no está vigente."
      : null;

  return crearElementoSeguro("section", { clase: `resultado-estado ${claseCssEstado(ficha.estadoVigente)}`, "aria-labelledby": "titulo-estado" }, [
    crearElementoSeguro("div", { clase: "resultado-estado__franja", "aria-hidden": "true" }),
    crearElementoSeguro("div", { clase: "resultado-estado__cuerpo" }, [
      crearElementoSeguro("span", { clase: "rotulo-seccion", texto: "Estado de la matrícula" }),
      crearElementoSeguro("div", { clase: "resultado-estado__titular" }, [
        crearElementoSeguro("h2", { id: "titulo-estado", clase: "resultado-estado__estado", texto: estado.nombre }),
        ficha.estadoVigente !== ESTADO.Inexistente ? crearElementoSeguro("span", { clase: "texto-secundario", texto: nombreTipoCredencial(ficha.datos.tipo) }) : null,
      ]),
      crearElementoSeguro("p", { clase: "resultado-estado__explicacion", texto: estado.explicacion }),
      advertenciaPersistido ? crearElementoSeguro("p", { clase: "texto-chico texto-secundario", texto: advertenciaPersistido }) : null,
      emisor ? crearElementoSeguro("p", {}, [crearElementoSeguro("strong", { texto: "La otorgó: " }), emisor]) : null,
      institucion && !institucion.habilitada
        ? crearElementoSeguro("p", { clase: "texto-chico", texto: "Atención: la institución emisora figura hoy deshabilitada en el padrón." })
        : null,
      crearElementoSeguro("p", {
        clase: "resultado-estado__pie",
        texto: `Consultado el ${formatearFechaHora(ficha.consultadaEl)} en el registro público (blockchain), que nadie puede modificar ni borrar. No depende de un sistema de la institución.`,
      }),
    ]),
  ]);
}

/** Ficha técnica con todos los datos on-chain de la credencial. */
export function crearFichaDatosCredencial(ficha) {
  const { datos } = ficha;
  const filas = [
    ...crearFilaDato("Código de la matrícula", crearValorCopiable(ficha.id, "Copiar código")),
    ...crearFilaDato("Tipo", nombreTipoCredencial(datos.tipo)),
    ...crearFilaDato("Otorgada el", datos.emitidaEl ? formatearFecha(datos.emitidaEl) : "Todavía no otorgada"),
    ...crearFilaDato("Vencimiento", textoVencimiento(ficha)),
    ...crearFilaDato("Huella del PDF", datos.hashDocumento && !/^0x0+$/.test(datos.hashDocumento) ? crearValorCopiable(datos.hashDocumento, "Copiar huella") : "Se guarda al otorgarla"),
    ...crearFilaDato(
      "Asociada a un médico",
      /^0x0+$/.test(datos.cuentaTitular)
        ? "Todavía no"
        : "Sí",
    ),
    ...crearFilaDato("Última actualización", formatearFechaHora(datos.actualizadaEl)),
  ];
  if (datos.cargaInicial) filas.push(...crearFilaDato("Origen", "Otorgada antes de que la institución se sumara al registro"));
  return crearElementoSeguro("dl", { clase: "lista-datos" }, filas);
}
