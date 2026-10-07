// Ejecuta una transacción del registro mostrando cada paso al usuario:
// confirmación en la billetera → enviada (link al explorador) → confirmada.
import { ejecutarTransaccionRegistro } from "../nucleo/contrato-credenciales.js";
import { urlExploradorTransaccion } from "../nucleo/configuracion.js";
import { crearElementoSeguro } from "../nucleo/dom-seguro.js";
import { marcarBotonOcupado, mostrarAvisoEnPagina, mostrarNotificacion } from "./avisos-interfaz.js";

/**
 * @returns {Promise<import("ethers").TransactionReceipt|undefined>} undefined si falló (el error ya se mostró)
 */
export async function ejecutarTransaccionConInterfaz({ boton, contenedorAvisos, firmante, metodo, argumentos, mensajeExito }) {
  marcarBotonOcupado(boton, true, "Confirmá en tu billetera…");
  mostrarAvisoEnPagina(contenedorAvisos, "info", "Guardando el cambio…");
  try {
    const recibo = await ejecutarTransaccionRegistro(firmante, metodo, argumentos, {
      alEnviar: (hash) => {
        boton.textContent = "Esperando confirmación…";
        const aviso = mostrarAvisoEnPagina(contenedorAvisos, "info", "Cambio enviado", "Se está guardando en el registro público (unos segundos).");
        aviso.append(crearElementoSeguro("a", { href: urlExploradorTransaccion(hash), target: "_blank", rel: "noopener", texto: "Ver la constancia pública" }));
      },
    });
    contenedorAvisos.replaceChildren();
    mostrarNotificacion(mensajeExito, "exito", { enlace: urlExploradorTransaccion(recibo.hash), textoEnlace: "Ver transacción" });
    return recibo;
  } catch (error) {
    mostrarAvisoEnPagina(contenedorAvisos, "error", "No se pudo guardar el cambio", error.message);
    return undefined;
  } finally {
    marcarBotonOcupado(boton, false);
  }
}
