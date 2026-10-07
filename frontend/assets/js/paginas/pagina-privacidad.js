// Política de privacidad: completa los datos variables desde la configuración.
import { montarEstructuraSitio } from "../componentes/cabecera-sitio.js";
import { buscarElemento, crearElementoSeguro } from "../nucleo/dom-seguro.js";
import { CONFIG, contratoConfigurado, direccionContrato, urlExploradorDireccion } from "../nucleo/configuracion.js";

montarEstructuraSitio("privacidad");
buscarElemento("#nombre-red").textContent = CONFIG.red.nombre;
const PATRON_CORREO = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const contacto = (CONFIG.contactoPrivacidad || "").trim();
buscarElemento("#contacto-privacidad").replaceChildren(
  PATRON_CORREO.test(contacto)
    ? crearElementoSeguro("a", { href: `mailto:${contacto}`, texto: contacto })
    : contacto || "a definir por el equipo",
);
buscarElemento("#lista-rpc").textContent = CONFIG.red.rpcLectura.map((url) => new URL(url).hostname).join(", ");
buscarElemento("#item-colector").hidden = !CONFIG.diagnostico.endpointRemoto;
buscarElemento("#item-acceso-mail").hidden = !CONFIG.accesoConMail?.appId?.trim();
buscarElemento("#direccion-contrato").replaceChildren(
  contratoConfigurado()
    ? crearElementoSeguro("a", { href: urlExploradorDireccion(direccionContrato()), target: "_blank", rel: "noopener", texto: direccionContrato() })
    : "pendiente de despliegue",
);
