// Ingreso con mail, sin MetaMask (clases 30 y 38: wallet embebida con Privy).
// El usuario recibe un código en su mail; Privy crea una wallet propia para esa
// persona (la clave nunca sale del contexto seguro de Privy) y devuelve un
// proveedor EIP-1193, el mismo tipo de objeto que entrega MetaMask.
// Se activa completando CONFIG.accesoConMail.appId en config/config.js.
import { CONFIG } from "./configuracion.js";
import { diagnostico } from "./registro-diagnostico.js";

const RUTA_SDK_PRIVY = "../../vendor/privy-js-sdk-core-0.77.0.js";
let promesaClientePrivy = null;
let moduloPrivy = null;

export function accesoConMailConfigurado() {
  return Boolean(CONFIG.accesoConMail?.appId?.trim());
}

function cadenaDeLaRed() {
  const { red, accesoConMail } = CONFIG;
  return {
    id: red.chainId,
    name: red.nombre,
    network: red.nombre.toLowerCase(),
    nativeCurrency: red.monedaNativa,
    rpcUrls: {
      privy: { http: [accesoConMail.rpcPrivy] },
      default: { http: red.rpcLectura },
      public: { http: red.rpcLectura },
    },
    blockExplorers: { default: { name: "Explorador", url: red.exploradorBloques } },
  };
}

/** Monta el iframe del contexto seguro de Privy y conecta los mensajes en ambos sentidos. */
function montarContextoSeguro(privy) {
  const marco = document.createElement("iframe");
  marco.src = privy.embeddedWallet.getURL();
  marco.title = "Contexto seguro de la cuenta";
  marco.hidden = true;
  document.body.appendChild(marco);
  privy.setMessagePoster(marco.contentWindow);
  window.addEventListener("message", (evento) => {
    if (evento.source !== marco.contentWindow) return;
    const datos = typeof evento.data === "string" ? JSON.parse(evento.data) : evento.data;
    privy.embeddedWallet.onMessage(datos);
  });
  return new Promise((resolver) => marco.addEventListener("load", resolver, { once: true }));
}

async function crearClientePrivy() {
  moduloPrivy = await import(RUTA_SDK_PRIVY);
  const { Privy, LocalStorage } = moduloPrivy;
  const privy = new Privy({
    appId: CONFIG.accesoConMail.appId.trim(),
    clientId: CONFIG.accesoConMail.clientId?.trim() || undefined,
    storage: new LocalStorage(),
    supportedChains: [cadenaDeLaRed()],
  });
  await montarContextoSeguro(privy);
  await privy.initialize();
  diagnostico.info("acceso", "Cliente de acceso con mail listo");
  return privy;
}

function obtenerClientePrivy() {
  if (!promesaClientePrivy) {
    promesaClientePrivy = crearClientePrivy().catch((error) => {
      promesaClientePrivy = null;
      diagnostico.error("acceso", "No se pudo iniciar el acceso con mail", error);
      throw error;
    });
  }
  return promesaClientePrivy;
}

export async function enviarCodigoAlMail(mail) {
  const privy = await obtenerClientePrivy();
  await privy.auth.email.sendCode(mail.trim());
  diagnostico.info("acceso", "Código enviado al mail");
}

/** Valida el código y devuelve el proveedor EIP-1193 de la wallet de esa persona. */
export async function ingresarConCodigo(mail, codigo) {
  const privy = await obtenerClientePrivy();
  await privy.auth.email.loginWithCode(mail.trim(), codigo.trim());
  diagnostico.info("acceso", "Ingreso con mail correcto");
  return proveedorDeLaSesion(privy);
}

/** Si ya hay una sesión abierta en este navegador, devuelve su proveedor; si no, null. */
export async function retomarSesionConMail() {
  if (!accesoConMailConfigurado()) return null;
  try {
    const privy = await obtenerClientePrivy();
    const token = await privy.getAccessToken();
    if (!token) return null;
    return await proveedorDeLaSesion(privy);
  } catch (error) {
    diagnostico.advertencia("acceso", "No se pudo retomar la sesión con mail", error);
    return null;
  }
}

async function proveedorDeLaSesion(privy) {
  const { getUserEmbeddedEthereumWallet, getEntropyDetailsFromUser } = moduloPrivy;
  let { user } = await privy.user.get();
  let wallet = getUserEmbeddedEthereumWallet(user);
  if (!wallet) {
    ({ user } = await privy.embeddedWallet.create({}));
    wallet = getUserEmbeddedEthereumWallet(user);
    diagnostico.info("acceso", "Cuenta creada para el usuario", { cuenta: wallet?.address });
  }
  const { entropyId, entropyIdVerifier } = getEntropyDetailsFromUser(user);
  return privy.embeddedWallet.getEthereumProvider({ wallet, entropyId, entropyIdVerifier });
}

export async function cerrarSesionConMail() {
  const privy = await obtenerClientePrivy();
  await privy.user.logout();
  diagnostico.info("acceso", "Sesión cerrada");
}
