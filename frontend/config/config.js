// Configuración del sitio. Es el ÚNICO archivo que cambia entre entornos
// (local, staging, hosting DASDER). No contiene secretos: todo es información pública.
//
// - urlBase: URL absoluta donde queda publicado el sitio, terminada en "/".
//   Se usa para armar los links de los QR. Si queda vacía se deduce de la URL actual.
// - contrato.direccion: la completa el deploy (despliegues/137.json → "registro").
// - Para usar la red de prueba Amoy: chainId 80002, RPC polygon-amoy-bor-rpc.publicnode.com,
//   explorador https://amoy.polygonscan.com (y actualizar connect-src en .htaccess).
export const CONFIGURACION_SITIO = Object.freeze({
  nombreAplicacion: "Credenciales Médicas",
  nombreCompleto: "Sistema de Validación de Credenciales Médicas en Blockchain",
  urlBase: "https://dasder.com/utn-dig/",

  red: {
    chainId: 137,
    nombre: "Polygon",
    // Nodos RPC públicos de solo lectura, en orden de preferencia.
    rpcLectura: [
      "https://polygon-bor-rpc.publicnode.com",
      "https://polygon.drpc.org",
    ],
    monedaNativa: { name: "POL", symbol: "POL", decimals: 18 },
    exploradorBloques: "https://polygonscan.com",
  },

  contrato: {
    direccion: "0x374adD49ce1101BC440b431EC24eee36a6A98565",
    bloqueDespliegue: 94774375,
  },

  // Búsqueda de eventos (listados por institución). Los RPC públicos limitan el rango por consulta.
  busquedaEventos: {
    tamanoTramo: 10000,
    maximoTramosPorConsulta: 40,
  },

  diagnostico: {
    maximoEntradas: 500,
    // Endpoint opcional que recibe los errores del cliente (frontend/api/recibir-diagnostico.php).
    // Vacío = el log queda solo en el navegador y se descarga desde el pie de página.
    endpointRemoto: "",
  },

  // Prueba de titularidad: cuánto tiempo vale la firma del titular sobre el código del verificador.
  pruebaTitularidad: {
    vigenciaSegundos: 600,
  },

  // Ingreso con mail, sin MetaMask (clases 30 y 38). Privy crea una wallet embebida por usuario.
  // appId y clientId salen del panel de privy.io (son públicos: identifican la app, no dan
  // acceso a las cuentas). Vacío = solo se ofrece MetaMask.
  // En el panel de Privy: habilitar "Email" como método de ingreso y agregar el dominio
  // del sitio (urlBase) en "Allowed origins".
  accesoConMail: {
    appId: "cmupwttfa01bk0bl51g90q11y",
    clientId: "",
    rpcPrivy: "https://polygon-mainnet.rpc.privy.systems",
  },

  // En el celular, MetaMask solo inyecta la billetera en su navegador interno: este enlace abre
  // la página actual dentro de la app (formato: <enlaceAppMetaMask><dominio/ruta>).
  billeteraMovil: {
    enlaceAppMetaMask: "https://metamask.app.link/dapp/",
  },

  contactoPrivacidad: "ramirochanes@hotmail.com",

});
