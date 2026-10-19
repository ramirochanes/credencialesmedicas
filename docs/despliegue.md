# Despliegue

## 1. Contrato en Polygon (red principal)

Despliegue vigente: `0x374adD49ce1101BC440b431EC24eee36a6A98565`, bloque `94774375`, 1/10/2026 (ver `despliegues/137.json`). Para probar sin gastar POL real se puede usar Amoy (chainId 80002) cambiando `--rpc-url polygon` por `--rpc-url amoy`.

### Requisitos

- Foundry instalado (`forge`, `cast`).
- Una wallet **exclusiva del proyecto** con POL en la red Polygon. Referencia del 1/10/2026: deploy + padrón + demo costaron 2,26 POL con gas efectivo de 335–387 gwei. Conviene tener 4–5 POL, porque forge exige saldo para el precio máximo (el doble del real, aprox.).
- Para Amoy, los faucets públicos piden saldo en Ethereum mainnet (0,001 ETH) para entregar POL de prueba.
- `.env` en la raíz (copiar de `.env.example`):
  - `PRIVATE_KEY`
  - `RPC_URL_POLYGON` (por ejemplo `https://polygon-bor-rpc.publicnode.com`) y, si se usa la testnet, `RPC_URL_AMOY`
  - opcionales: `CUENTA_GOBERNANZA` y `CUENTA_GUARDIAN_PAUSA`

> Para generar una wallet nueva sin que la clave pase por la consola ni por un chat:
> `cast wallet new --json > .claves/deployer.json` (la carpeta `.claves/` está en `.gitignore`).

### Pasos

```bash
set -a; source .env; set +a
forge test                                                                              # 1. todo en verde
forge script script/DesplegarRegistroCredenciales.s.sol --rpc-url polygon               # 2a. simulación: costo estimado
forge script script/DesplegarRegistroCredenciales.s.sol --rpc-url polygon --broadcast   # 2b. deploy
forge script script/SembrarPadronDemo.s.sol --rpc-url polygon --broadcast --slow        # 3. semilla estructural
forge script script/CargarCredencialesDemo.s.sol --rpc-url polygon --broadcast --slow   # 4. datos de demo (opcional)
node herramientas/exportar-abi.mjs                                                      # 5. ABI → frontend
```

`despliegues/137.json` queda con la dirección del registro, la gobernanza y el guardián. La simulación (sin `--broadcast`) no lo escribe, para no dejar una dirección que no existe.

`--slow` manda una transacción por vez y espera su confirmación: evita errores de nonce con los RPC públicos.

### Vincular wallets de integrantes

Cada integrante que vaya a operar como institución tiene que estar vinculado. Lo hace la gobernanza desde `gobernanza.html` o por script:

```bash
CUENTA_OPERADORA=0x... ID_INSTITUCION=1 forge script script/VincularCuentaOperadora.s.sol --rpc-url polygon --broadcast
```

IDs de la semilla demo:

| ID | Institución |
|---|---|
| 1 | Universidad Demo |
| 2 | Colegio Médico Demo A (cuenta de deploy) |
| 3 | Colegio Médico Demo B |
| 4 | Ministerio de Salud Demo |
| 5 | Hospital Demo |

### Verificar el código fuente en el explorador

Con Sourcify no hace falta API key (toma los argumentos del constructor de la transacción de creación):

```bash
forge verify-contract <DIRECCION> src/RegistroCredencialesMedicas.sol:RegistroCredencialesMedicas \
  --chain-id 137 --verifier sourcify --watch
```

El despliegue vigente quedó verificado con *exact match* en Sourcify. Si Polygonscan no lo muestra como verificado, se puede verificar ahí también con `--verifier etherscan` y una API key de Etherscan.

## 2. Frontend en el hosting de DASDER (FTP)

### Antes de subir

Editar **solo** `frontend/config/config.js`:

| Campo | Valor |
|---|---|
| `contrato.direccion` | la de `despliegues/137.json` → `registro` (ya cargada: `0x374adD49…6A98565`) |
| `contrato.bloqueDespliegue` | bloque de la transacción de deploy (en `broadcast/DesplegarRegistroCredenciales.s.sol/137/run-latest.json` → `receipts[0].blockNumber`; ya cargado: `94774375`). Acelera el listado del emisor. |
| `urlBase` | URL pública final, terminada en `/` (ya cargada: `https://dasder.com/utn-dig/`). Se usa en los QR. |
| `contactoPrivacidad` | mail de contacto que aparece en la política de privacidad (ya cargado) |

### Qué subir

Todo el **contenido** de `frontend/` a la subcarpeta `utn-dig/` de la carpeta pública del dominio (en Hostinger, `public_html/utn-dig/`), respetando la estructura. Los `.htaccess` son archivos ocultos: revisá que el cliente FTP los suba.

Alternativa sin FTP: el administrador de archivos de hPanel sube y descomprime un zip. Para armarlo:

```bash
cd frontend && zip -rq ../publicacion/utn-dig-frontend.zip . -x "*.DS_Store" "api/registros/*.log.php"
```

Estructura que tiene que quedar en el servidor:

```
index.html  verificar.html  emisor.html  titular.html  verificador.html  gobernanza.html  privacidad.html
.htaccess   config/   assets/   api/
```

### Requisitos del hosting

- El hosting actual de DASDER es Hostinger con LiteSpeed, que respeta los `.htaccess` (cabeceras y CSP). Si después de actualizar archivos se siguen viendo los viejos, purgar la caché de LiteSpeed desde hPanel.
- **HTTPS.** Las billeteras y `crypto.subtle` funcionan mejor en un contexto seguro. Si no hay HTTPS, la huella se calcula igual con la implementación JS de ethers.
- Los `.js` se tienen que servir como `text/javascript`. El `.htaccess` lo fuerza si el hosting lo permite. Si la consola del navegador muestra "Failed to load module script… MIME type", hay que revisar este punto.
- `.htaccess` es opcional: si el hosting no admite override, se ignora sin romper nada. Agrega cabeceras de seguridad y CSP. **Si cambiás los RPC en `config.js`, actualizá `connect-src`.**

### Ingreso con mail, sin MetaMask (recomendado)

Aplica lo visto en las clases 30 y 38: cada persona entra con su mail y un código; Privy le crea una cuenta para firmar sin que tenga que instalar nada ni guardar claves.

1. Crear una cuenta gratuita en https://dashboard.privy.io y una app nueva.
2. En **Login methods**, dejar habilitado **Email**.
3. En **Allowed origins** (o *App settings → Domains*), agregar `https://dasder.com`.
4. Copiar el **App ID** (y el **Client ID**, si el panel lo muestra) en `config/config.js` → `accesoConMail`.
5. Subir `config/config.js` por FTP. Con `appId` vacío, la web vuelve a ofrecer solo MetaMask.

Cada cuenta nueva necesita centavos de POL para registrar operaciones: la gobernanza se los carga desde su wallet. Consultar y firmar la prueba de titularidad no cuestan nada. El patrocinio de gas (paymaster) queda como siguiente paso en `deuda-tecnica-y-mejoras.md`.

### Colector de diagnóstico (opcional)

1. En `config.js`: `diagnostico.endpointRemoto: "api/recibir-diagnostico.php"`.
2. Desde el cliente FTP, dar permiso de escritura a `api/registros/` (755 o 775, según el hosting).
3. Los registros se descargan por FTP: `api/registros/diagnostico-AAAA-MM.log.php`. Si se piden por URL, devuelven 404 a propósito.

### Prueba después de subir

1. Abrir `index.html` → el pie muestra «Contrato 0x…» y el link al explorador.
2. Subir `demo/documentos/demo-credencial-001.pdf` → redirige a «Activa».
3. Subir `demo-credencial-003.pdf` → «Revocada».
4. Modificar cualquier PDF (por ejemplo, imprimirlo de nuevo como PDF) → «Este documento no está registrado».
5. Escanear con el teléfono el QR de la credencial 001 → abre `verificar.html` con el resultado.
6. «Diagnóstico» en el pie → aparece «Nodo de lectura disponible».
7. Prueba de titularidad (requiere una credencial con wallet de titular vinculada): en el teléfono del verificador, `verificar.html?c=<id>` → «Generar código»; en la compu del titular, `titular.html` → conectar MetaMask → cargar el código → «Firmar con mi wallet»; escanear el QR de respuesta → «Titularidad comprobada».

## 3. Actualizaciones

- **Contrato:** no es actualizable. Una versión nueva implica desplegar otro contrato, correr la semilla y cambiar `config.js`. El historial del contrato anterior sigue consultable en el explorador.
- **Frontend:** subir los archivos cambiados. Como no hay build, el navegador puede tener en caché módulos viejos. Pedir recarga forzada (Cmd+Shift+R) o ver la deuda técnica sobre versionado de assets.
