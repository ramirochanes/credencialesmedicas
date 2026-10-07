// Conexión con la red: proveedor de solo lectura (sin billetera) y billetera del
// usuario para firmar (MetaMask u otra compatible con EIP-1193).
import { JsonRpcProvider, BrowserProvider, Network } from "../../vendor/ethers-6.17.0.min.js";
import { CONFIG, chainIdHexadecimal } from "./configuracion.js";
import { diagnostico } from "./registro-diagnostico.js";

const TIEMPO_LIMITE_RPC_MS = 7000;
const redConfigurada = new Network(CONFIG.red.nombre, CONFIG.red.chainId);
let promesaProveedorLectura = null;

export class ErrorBilletera extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.name = "ErrorBilletera";
    this.code = codigo;
  }
}

function conTiempoLimite(promesa, milisegundos) {
  return Promise.race([
    promesa,
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("Tiempo de espera agotado")), milisegundos)),
  ]);
}

async function elegirNodoDeLectura() {
  for (const url of CONFIG.red.rpcLectura) {
    const proveedor = new JsonRpcProvider(url, redConfigurada, { staticNetwork: redConfigurada });
    try {
      const bloque = await conTiempoLimite(proveedor.getBlockNumber(), TIEMPO_LIMITE_RPC_MS);
      diagnostico.info("red", "Nodo de lectura disponible", { url, bloque });
      return proveedor;
    } catch (error) {
      diagnostico.advertencia("red", "Nodo de lectura sin respuesta, se prueba el siguiente", { url, error: error.message });
      proveedor.destroy();
    }
  }
  throw new Error("No se pudo conectar con ningún nodo de la red. Revisá tu conexión e intentá de nuevo.");
}

/** Proveedor compartido de solo lectura. Elige el primer RPC que responde. */
export function obtenerProveedorLectura() {
  if (!promesaProveedorLectura) {
    promesaProveedorLectura = elegirNodoDeLectura().catch((error) => {
      promesaProveedorLectura = null; // permite reintentar
      diagnostico.error("red", "Sin nodos de lectura disponibles", error);
      throw error;
    });
  }
  return promesaProveedorLectura;
}

export function hayBilleteraInstalada() {
  return typeof window.ethereum?.request === "function";
}

/** true en teléfonos y tablets (donde la billetera vive en su propia app). */
export function esNavegadorDeTelefono() {
  if (typeof navigator.userAgentData?.mobile === "boolean") return navigator.userAgentData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Link que abre la página actual dentro del navegador de la app de MetaMask, o null si no está configurado. */
export function enlaceAbrirEnAppMetaMask() {
  const base = CONFIG.billeteraMovil?.enlaceAppMetaMask?.trim();
  if (!base) return null;
  const { host, pathname, search } = window.location;
  return `${base.endsWith("/") ? base : `${base}/`}${host}${pathname}${search}`;
}

async function asegurarRedDeLaBilletera(billetera) {
  const actual = await billetera.request({ method: "eth_chainId" });
  if (Number.parseInt(actual, 16) === CONFIG.red.chainId) return;
  diagnostico.info("billetera", "Solicitando cambio de red", { actual, esperada: chainIdHexadecimal() });
  try {
    await billetera.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHexadecimal() }] });
  } catch (error) {
    const redDesconocida = error?.code === 4902 || error?.data?.originalError?.code === 4902;
    if (!redDesconocida) throw error;
    await billetera.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHexadecimal(),
          chainName: CONFIG.red.nombre,
          nativeCurrency: CONFIG.red.monedaNativa,
          rpcUrls: CONFIG.red.rpcLectura,
          blockExplorerUrls: [CONFIG.red.exploradorBloques],
        },
      ],
    });
  }
}

/**
 * Pide acceso a la billetera, la lleva a la red configurada y devuelve el firmante.
 * @param {object} [billetera] proveedor EIP-1193: MetaMask (por defecto) o la cuenta del ingreso con mail.
 * @returns {Promise<{firmante: import("ethers").Signer, cuenta: string}>}
 */
export async function conectarBilleteraUsuario(billetera = window.ethereum) {
  if (typeof billetera?.request !== "function") {
    throw new ErrorBilletera(
      "No se detectó una billetera en este navegador. Instalá MetaMask (o similar) para operar como institución o profesional.",
      "SIN_BILLETERA",
    );
  }
  try {
    await billetera.request({ method: "eth_requestAccounts" });
    await asegurarRedDeLaBilletera(billetera);
    const proveedor = new BrowserProvider(billetera, "any");
    const firmante = await proveedor.getSigner();
    const cuenta = await firmante.getAddress();
    diagnostico.info("billetera", "Billetera conectada", { cuenta });
    return { firmante, cuenta };
  } catch (error) {
    if (error instanceof ErrorBilletera) throw error;
    const rechazada = error?.code === 4001 || error?.code === "ACTION_REJECTED";
    diagnostico.advertencia("billetera", "No se pudo conectar la billetera", error);
    throw new ErrorBilletera(
      rechazada
        ? "Cancelaste la conexión en la billetera."
        : `La billetera no pudo conectarse a ${CONFIG.red.nombre}. ${error?.message ?? ""}`.trim(),
      rechazada ? "RECHAZADA" : "FALLO_CONEXION",
    );
  }
}

/** Avisa cuando el usuario cambia de cuenta o de red en la billetera. */
export function escucharCambiosDeBilletera(alCambiar, billetera = window.ethereum) {
  if (!billetera?.on) return;
  billetera.on("accountsChanged", (cuentas) => {
    diagnostico.info("billetera", "Cambio de cuenta en la billetera", { cuentas });
    alCambiar("cuenta");
  });
  billetera.on("chainChanged", (chainId) => {
    diagnostico.info("billetera", "Cambio de red en la billetera", { chainId });
    alCambiar("red");
  });
}
