// Acceso único a la configuración: valida y deriva URLs. Ningún otro módulo
// lee config/config.js directamente.
import { CONFIGURACION_SITIO } from "../../../config/config.js";

const PATRON_DIRECCION = /^0x[0-9a-fA-F]{40}$/;

function deducirUrlBase() {
  const configurada = CONFIGURACION_SITIO.urlBase?.trim();
  if (configurada) return configurada.endsWith("/") ? configurada : `${configurada}/`;
  const { origin, pathname } = window.location;
  return `${origin}${pathname.replace(/[^/]*$/, "")}`;
}

export const CONFIG = CONFIGURACION_SITIO;
export const URL_BASE_SITIO = deducirUrlBase();

export function contratoConfigurado() {
  return PATRON_DIRECCION.test(CONFIGURACION_SITIO.contrato.direccion ?? "");
}

export function direccionContrato() {
  return CONFIGURACION_SITIO.contrato.direccion;
}

export function urlVerificacionCredencial(idCredencial) {
  return `${URL_BASE_SITIO}verificar.html?c=${encodeURIComponent(idCredencial)}`;
}

export function urlExploradorDireccion(direccion) {
  return `${CONFIGURACION_SITIO.red.exploradorBloques}/address/${direccion}`;
}

export function urlExploradorTransaccion(hashTransaccion) {
  return `${CONFIGURACION_SITIO.red.exploradorBloques}/tx/${hashTransaccion}`;
}

export function chainIdHexadecimal() {
  return `0x${CONFIGURACION_SITIO.red.chainId.toString(16)}`;
}
