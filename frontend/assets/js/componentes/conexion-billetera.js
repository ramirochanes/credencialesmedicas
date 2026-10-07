// Panel de ingreso para las páginas que registran operaciones en la blockchain.
// Modo principal (si CONFIG.accesoConMail está completo): ingreso con mail y código,
// sin MetaMask (wallet embebida, clases 30 y 38). Alternativa: MetaMask.
// Después de ingresar muestra la cuenta, la institución vinculada y los roles.
import { crearElementoSeguro } from "../nucleo/dom-seguro.js";
import {
  conectarBilleteraUsuario,
  escucharCambiosDeBilletera,
  hayBilleteraInstalada,
  esNavegadorDeTelefono,
  enlaceAbrirEnAppMetaMask,
  obtenerProveedorLectura,
} from "../nucleo/red-blockchain.js";
import {
  accesoConMailConfigurado,
  enviarCodigoAlMail,
  ingresarConCodigo,
  retomarSesionConMail,
  cerrarSesionConMail,
} from "../nucleo/acceso-con-mail.js";
import { leerContextoCuenta } from "../nucleo/contrato-credenciales.js";
import { CONFIG, contratoConfigurado } from "../nucleo/configuracion.js";
import { nombreTipoInstitucion } from "../nucleo/formato-credencial.js";
import { mostrarAvisoEnPagina, marcarBotonOcupado } from "./avisos-interfaz.js";

const PATRON_MAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const PATRON_CODIGO = /^\d{6}$/;

/** Traduce los errores del servicio de ingreso a algo que la persona pueda resolver. */
function mensajeErrorIngreso(error) {
  const texto = String(error?.message ?? "");
  if (/failed to fetch|network|load failed/i.test(texto)) return "No se pudo contactar al servicio de ingreso. Revisá tu conexión y probá de nuevo.";
  if (/invalid.*code|code.*invalid|incorrect/i.test(texto)) return "El código no es correcto o ya venció. Pedí uno nuevo.";
  if (/origin/i.test(texto)) return "Este sitio no está habilitado en el servicio de ingreso (falta agregar el dominio en el panel de Privy).";
  return texto || "Error desconocido. Abrí «Diagnóstico» en el pie para ver el detalle.";
}

function describirContexto(contexto) {
  const partes = [];
  if (contexto.institucion) {
    partes.push(`Operás para: ${contexto.institucion.nombre} (${nombreTipoInstitucion(contexto.institucion.tipo)})`);
    if (!contexto.institucion.habilitada) partes.push("— institución deshabilitada");
  } else partes.push("Tu cuenta todavía no está habilitada para ninguna institución");
  if (contexto.esGobernanza) partes.push("· Administrador del registro");
  if (contexto.esGuardian) partes.push("· Puede frenar el sistema ante una emergencia");
  return partes.join(" ");
}

/**
 * @param {HTMLElement} contenedor
 * @param {{descripcion: string, alConectar: (sesion: {firmante, cuenta, contexto}) => Promise<void>|void}} opciones
 */
export function montarPanelBilletera(contenedor, { descripcion, alConectar }) {
  const avisos = crearElementoSeguro("div");
  const datos = crearElementoSeguro("div", { clase: "panel-billetera__datos" }, [
    crearElementoSeguro("strong", { texto: "Ingresar" }),
    crearElementoSeguro("p", { clase: "texto-secundario texto-chico", texto: descripcion }),
  ]);
  const acciones = crearElementoSeguro("div", { clase: "panel-billetera__acciones" });
  const panel = crearElementoSeguro("div", { clase: "tarjeta" }, [crearElementoSeguro("div", { clase: "panel-billetera" }, [datos, acciones]), avisos]);
  contenedor.replaceChildren(panel);

  if (!contratoConfigurado()) {
    mostrarAvisoEnPagina(avisos, "advertencia", "Contrato sin configurar", "Falta la dirección del contrato en config/config.js.");
    return;
  }

  async function completarIngreso(billetera, origen) {
    const { firmante, cuenta } = await conectarBilleteraUsuario(billetera);
    const contexto = await leerContextoCuenta(cuenta);
    const salir = crearElementoSeguro("button", { type: "button", clase: "boton boton--secundario", texto: "Salir" });
    salir.addEventListener("click", async () => {
      if (origen === "mail") await cerrarSesionConMail().catch(() => {});
      window.location.reload();
    });
    datos.replaceChildren(
      crearElementoSeguro("strong", { texto: origen === "mail" ? "Ingresaste con tu mail" : "Ingresaste con MetaMask" }),
      crearElementoSeguro("p", { clase: "texto-chico texto-secundario", texto: "Tu número de cuenta:" }),
      crearElementoSeguro("div", { clase: "panel-billetera__cuenta", texto: cuenta }),
      crearElementoSeguro("p", { clase: "texto-chico texto-secundario", texto: describirContexto(contexto) }),
    );
    acciones.replaceChildren(salir);
    avisos.replaceChildren();
    document.querySelector(".guia-seccion")?.removeAttribute("open");
    if (contexto.enPausa) {
      mostrarAvisoEnPagina(avisos, "advertencia", "Sistema frenado por emergencia", "El administrador frenó el sistema: por ahora no se pueden hacer cambios. Las consultas siguen funcionando.");
    } else if (origen === "mail" && (contexto.institucion || contexto.esGobernanza)) {
      const saldo = await (await obtenerProveedorLectura()).getBalance(cuenta);
      if (saldo === 0n) {
        mostrarAvisoEnPagina(avisos, "info", "Tu cuenta todavía no tiene saldo para guardar cambios",
          `Cada cambio que se guarda tiene un costo mínimo (centavos de ${CONFIG.red.monedaNativa.symbol}). Pedile al administrador del registro que le cargue saldo a tu número de cuenta. Consultar no cuesta nada.`);
      }
    }
    escucharCambiosDeBilletera(() => window.location.reload(), billetera);
    await alConectar({ firmante, cuenta, contexto });
  }

  // --- Alternativa: MetaMask ---
  function crearAccesoMetaMask(principal) {
    const boton = crearElementoSeguro("button", {
      type: "button",
      clase: principal ? "boton boton--primario" : "enlace texto-chico",
      texto: principal ? "Ingresar con MetaMask" : "Prefiero usar MetaMask",
    });
    boton.addEventListener("click", async () => {
      if (!hayBilleteraInstalada()) {
        const enlaceApp = esNavegadorDeTelefono() ? enlaceAbrirEnAppMetaMask() : null;
        mostrarAvisoEnPagina(avisos, "info", "No se detectó MetaMask en este navegador",
          enlaceApp ? "En el celular, MetaMask funciona dentro de su propia app." : `Instalá MetaMask y configurá la red ${CONFIG.red.nombre}.`);
        if (enlaceApp) avisos.append(crearElementoSeguro("a", { clase: "boton boton--primario boton--ancho separacion-superior", href: enlaceApp, rel: "noopener", texto: "Abrir en MetaMask" }));
        return;
      }
      marcarBotonOcupado(boton, true, "Ingresando…");
      try {
        await completarIngreso(window.ethereum, "metamask");
      } catch (error) {
        mostrarAvisoEnPagina(avisos, "error", "No se pudo ingresar", error.message);
        marcarBotonOcupado(boton, false);
      }
    });
    return boton;
  }

  // --- Modo principal: mail + código ---
  function mostrarIngresoConMail() {
    const idMail = "ingreso-mail";
    const idCodigo = "ingreso-codigo";
    const campoMail = crearElementoSeguro("input", { type: "email", id: idMail, autocomplete: "email", inputmode: "email", required: true });
    const botonEnviar = crearElementoSeguro("button", { type: "submit", clase: "boton boton--primario", texto: "Enviarme el código" });
    const campoCodigo = crearElementoSeguro("input", { type: "text", id: idCodigo, inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6", required: true });
    const botonIngresar = crearElementoSeguro("button", { type: "submit", clase: "boton boton--primario", texto: "Ingresar" });
    const pasoCodigo = crearElementoSeguro("form", { novalidate: true, hidden: true }, [
      crearElementoSeguro("div", { clase: "campo" }, [
        crearElementoSeguro("label", { for: idCodigo, texto: "Código de 6 números que te llegó por mail" }),
        campoCodigo,
      ]),
      botonIngresar,
    ]);
    const pasoMail = crearElementoSeguro("form", { novalidate: true }, [
      crearElementoSeguro("div", { clase: "campo" }, [crearElementoSeguro("label", { for: idMail, texto: "Tu mail" }), campoMail]),
      botonEnviar,
    ]);

    pasoMail.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      if (!PATRON_MAIL.test(campoMail.value.trim())) {
        mostrarAvisoEnPagina(avisos, "error", "Revisá el mail", "Escribilo completo, por ejemplo nombre@colegio.org.ar.");
        return;
      }
      marcarBotonOcupado(botonEnviar, true, "Enviando…");
      try {
        await enviarCodigoAlMail(campoMail.value);
        avisos.replaceChildren();
        mostrarAvisoEnPagina(avisos, "info", "Te mandamos un código", `Revisá ${campoMail.value.trim()} (y la carpeta de spam).`);
        pasoCodigo.hidden = false;
        campoCodigo.focus();
      } catch (error) {
        mostrarAvisoEnPagina(avisos, "error", "No se pudo enviar el código", mensajeErrorIngreso(error));
      } finally {
        marcarBotonOcupado(botonEnviar, false);
      }
    });

    pasoCodigo.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      if (!PATRON_CODIGO.test(campoCodigo.value.trim())) {
        mostrarAvisoEnPagina(avisos, "error", "Revisá el código", "Son 6 números.");
        return;
      }
      marcarBotonOcupado(botonIngresar, true, "Ingresando…");
      try {
        const billetera = await ingresarConCodigo(campoMail.value, campoCodigo.value);
        pasoMail.remove();
        pasoCodigo.remove();
        await completarIngreso(billetera, "mail");
      } catch (error) {
        mostrarAvisoEnPagina(avisos, "error", "No se pudo ingresar", mensajeErrorIngreso(error));
        marcarBotonOcupado(botonIngresar, false);
      }
    });

    datos.append(
      crearElementoSeguro("p", { clase: "texto-chico texto-secundario", texto: "Te mandamos un código de 6 números a tu mail y con eso entrás. No hace falta instalar nada ni recordar contraseñas." }),
      pasoMail,
      pasoCodigo,
    );
    acciones.replaceChildren(crearAccesoMetaMask(false));
  }

  if (accesoConMailConfigurado()) {
    mostrarIngresoConMail();
    retomarSesionConMail().then((billetera) => {
      if (billetera) completarIngreso(billetera, "mail").catch((error) => mostrarAvisoEnPagina(avisos, "error", "No se pudo retomar tu sesión", error.message));
    });
  } else {
    acciones.replaceChildren(crearAccesoMetaMask(true));
  }
}
