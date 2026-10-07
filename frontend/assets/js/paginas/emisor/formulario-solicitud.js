// Emisor · Nueva solicitud: registra el pedido del profesional (estado Pendiente).
import { isAddress, getAddress, ZeroAddress, ZeroHash } from "../../../vendor/ethers-6.17.0.min.js";
import { crearElementoSeguro, crearValorCopiable } from "../../nucleo/dom-seguro.js";
import { generarIdentificadorCredencial, calcularHuellaTexto } from "../../nucleo/huella-documento.js";
import { tiposDeMascara, nombreTipoCredencial } from "../../nucleo/formato-credencial.js";
import { ejecutarTransaccionConInterfaz } from "../../componentes/ejecucion-transaccion.js";

/**
 * @param {{firmante, contexto}} sesion
 * @param {(idCredencial: string) => void} alCrear  abre la gestión de la credencial creada
 */
export function crearFormularioSolicitud(sesion, alCrear) {
  const tipos = tiposDeMascara(sesion.contexto.institucion.tiposCredencialHabilitados);
  const selectorTipo = crearElementoSeguro(
    "select",
    { id: "solicitud-tipo", "aria-required": "true" },
    tipos.map((tipo) => crearElementoSeguro("option", { value: String(tipo), texto: nombreTipoCredencial(tipo) })),
  );
  const referencia = crearElementoSeguro("input", { type: "text", id: "solicitud-referencia", maxlength: "120", "aria-describedby": "solicitud-referencia-ayuda" });
  const wallet = crearElementoSeguro("input", { type: "text", id: "solicitud-wallet", spellcheck: "false", placeholder: "0x… (opcional)", "aria-describedby": "solicitud-wallet-ayuda solicitud-wallet-error" });
  const errorWallet = crearElementoSeguro("span", { id: "solicitud-wallet-error", clase: "error-campo", role: "alert", hidden: true });
  const avisos = crearElementoSeguro("div");
  const resultado = crearElementoSeguro("div", { "aria-live": "polite" });
  const boton = crearElementoSeguro("button", { type: "submit", clase: "boton boton--primario", texto: "Registrar solicitud" });

  const formulario = crearElementoSeguro("form", { novalidate: true }, [
    crearElementoSeguro("p", {
      clase: "texto-secundario",
      texto: "Paso 1 del ciclo de vida. Se genera un identificador aleatorio que no contiene datos del profesional.",
    }),
    crearElementoSeguro("div", { clase: "campo" }, [crearElementoSeguro("label", { for: "solicitud-tipo", texto: "Tipo de credencial" }), selectorTipo]),
    crearElementoSeguro("div", { clase: "campo" }, [
      crearElementoSeguro("label", { for: "solicitud-referencia", texto: "Referencia interna (opcional)" }),
      referencia,
      crearElementoSeguro("span", {
        id: "solicitud-referencia-ayuda",
        clase: "ayuda-campo",
        texto: "Número de expediente o legajo de tu sistema. Se guarda solo su huella. No uses DNI ni nombre.",
      }),
    ]),
    crearElementoSeguro("div", { clase: "campo" }, [
      crearElementoSeguro("label", { for: "solicitud-wallet", texto: "Wallet del profesional (opcional)" }),
      wallet,
      crearElementoSeguro("span", { id: "solicitud-wallet-ayuda", clase: "ayuda-campo", texto: "Le permite ver sus credenciales y declarar antecedentes. Se puede asignar después." }),
      errorWallet,
    ]),
    avisos,
    boton,
    resultado,
  ]);

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    errorWallet.hidden = true;
    wallet.removeAttribute("aria-invalid");
    const textoWallet = wallet.value.trim();
    if (textoWallet && !isAddress(textoWallet)) {
      wallet.setAttribute("aria-invalid", "true");
      errorWallet.textContent = "La dirección no es válida.";
      errorWallet.hidden = false;
      wallet.focus();
      return;
    }
    const idCredencial = generarIdentificadorCredencial();
    const huellaReferencia = referencia.value.trim() ? await calcularHuellaTexto(referencia.value) : ZeroHash;
    const recibo = await ejecutarTransaccionConInterfaz({
      boton,
      contenedorAvisos: avisos,
      firmante: sesion.firmante,
      metodo: "registrarSolicitudCredencial",
      argumentos: [idCredencial, Number(selectorTipo.value), huellaReferencia, textoWallet ? getAddress(textoWallet) : ZeroAddress],
      mensajeExito: "Solicitud registrada.",
    });
    if (!recibo) return;
    formulario.reset();
    resultado.replaceChildren(
      crearElementoSeguro("div", { clase: "aviso aviso--exito", role: "status" }, [
        crearElementoSeguro("div", {}, [
          crearElementoSeguro("strong", { texto: "Solicitud registrada (Pendiente)." }),
          crearElementoSeguro("p", {}, ["Identificador: ", crearValorCopiable(idCredencial, "Copiar identificador")]),
          crearElementoSeguro("button", { type: "button", clase: "boton boton--secundario", texto: "Continuar con la validación", onclick: () => alCrear(idCredencial) }),
        ]),
      ]),
    );
  });

  return formulario;
}
