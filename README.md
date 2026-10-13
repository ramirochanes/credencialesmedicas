# Credenciales Médicas Verificables — DIG Grupo 1

**Sistema de Validación de Credenciales Médicas en Blockchain.**
Desafío Integrador Grupal · Diplomatura en Blockchain y Finanzas Digitales · UTN · Cohorte 2026.

Es una capa de confianza sobre los registros que ya tienen universidades, colegios profesionales y ministerios de salud, **no un reemplazo**. Se registran en la blockchain la huella (SHA-256) del documento emitido y cada cambio de estado de la credencial: solicitud, validación, emisión, suspensión, reactivación, vencimiento y revocación. Cualquiera puede verificar gratis, sin depender de un servidor del emisor. Los datos personales nunca se guardan en la cadena.

| Entregable del DIG | Dónde está |
|---|---|
| 4 · Solución técnica | `src/` (contrato), `test/` (49 tests), `script/` (deploy y semillas), `frontend/` (DApp) |
| Documento de modelado | `entregables/DIG-Grupo1-Documento-de-modelado.pdf` |
| Modelo de negocio y precio | `entregables/DIG-Grupo1-Canvas-y-precio.pdf` |
| Video pitch (2:38, con voz) | [YouTube](https://www.youtube.com/watch?v=qY6CjE86R5Y) · `entregables/fuentes/DIG-Grupo1-Video-pitch-v2-voz-final.mp4` · texto en `entregables/fuentes/DIG-Grupo1-Speech-voz-en-off.md` · fuente en [`herramientas/video-pitch/`](herramientas/video-pitch/README.md) |
| Índice de entregables y enlaces | `entregables/DIG-Grupo1-Entregables-y-enlaces.pdf` |
| One pager | `entregables/DIG-Grupo1-One-pager.pdf` · fuente en `herramientas/one-pager/` |
| 5 · Modelado del contrato | [`docs/modelado-contrato.md`](docs/modelado-contrato.md) |
| Arquitectura y decisiones | [`docs/arquitectura.md`](docs/arquitectura.md) |
| Despliegue (Polygon + FTP) | [`docs/despliegue.md`](docs/despliegue.md) |
| Deuda técnica y mejoras | [`docs/deuda-tecnica-y-mejoras.md`](docs/deuda-tecnica-y-mejoras.md) |
| Instructivos para usuarios | [`docs/instructivos-usuarios.md`](docs/instructivos-usuarios.md) |

## Integrantes

Meline Breide (Contadora Pública) · Ramiro Chanes (Backend/Frontend) · Marcela Levicoy (Abogada) · Juan Pablo Montalto (Economista) · Juan Pablo Romero (Lic. en Administración / Seguros) · Facundo Torres (Programador).

## Red y contrato

| | |
|---|---|
| Red | Polygon PoS (red principal), chainId `137` |
| Contrato `RegistroCredencialesMedicas` | [`0x374adD49ce1101BC440b431EC24eee36a6A98565`](https://polygonscan.com/address/0x374adD49ce1101BC440b431EC24eee36a6A98565) |
| Código fuente verificado | [Sourcify (exact match)](https://repo.sourcify.dev/137/0x374adD49ce1101BC440b431EC24eee36a6A98565) |
| Bloque de despliegue | `94774375` (1/10/2026) · datos en `despliegues/137.json` |
| Costo real | deploy 1,04 POL (3,11 M gas) · padrón demo 0,26 POL (6 tx) · 6 credenciales demo 0,95 POL (17 tx) · gas efectivo 335–387 gwei |

Las instituciones y credenciales cargadas son **ficticias** (semilla de demostración): sirven para probar la DApp, no tienen validez legal.

## Estructura

```
src/
  RegistroCredencialesMedicas.sol      operaciones del DTE (emisor, titular, verificador)
  base/PadronInstituciones.sol         gobernanza: instituciones, cuentas operadoras, pausa
  base/AlmacenCredenciales.sol         almacenamiento y reglas internas compartidas
  base/ConsultasCredenciales.sol       consultas públicas (view)
  interfaces/  tipos/  errores/        interfaz, enums/structs, errores tipados
test/                                  Foundry: unitarios, excepciones y fuzzing
script/                                deploy, semilla estructural, datos de demo, vincular cuentas
config/padron-demo.json                semilla ESTRUCTURAL (instituciones demo)
demo/                                  datos TRANSACCIONALES de muestra (PDF ficticios + generador)
despliegues/                           direcciones desplegadas por red (lo escriben los scripts)
frontend/                              sitio estático (HTML + JS módulos + ethers v6), se sube por FTP
herramientas/exportar-abi.mjs          ABI de Foundry → módulo JS del frontend
docs/                                  documentación técnica, modelado e instructivos
```

## Uso rápido

Requisitos: [Foundry](https://book.getfoundry.sh) y Node 20+ (solo para exportar el ABI).

```bash
forge install                 # dependencias (forge-std, OpenZeppelin 5.7)
forge test                    # 49 tests
forge coverage --report summary --no-match-coverage "(script|test)"
```

Desplegar en Polygon y cargar la demo (con `.env` completo, ver `.env.example`; conviene simular primero sin `--broadcast`):

```bash
set -a; source .env; set +a
forge script script/DesplegarRegistroCredenciales.s.sol --rpc-url polygon --broadcast
forge script script/SembrarPadronDemo.s.sol --rpc-url polygon --broadcast --slow
forge script script/CargarCredencialesDemo.s.sol --rpc-url polygon --broadcast --slow
node herramientas/exportar-abi.mjs
```

Después, copiar la dirección de `despliegues/137.json` a `frontend/config/config.js` y subir la carpeta `frontend/` por FTP. El detalle está en [`docs/despliegue.md`](docs/despliegue.md).

## Seguridad

- `.env` y `.claves/` están en `.gitignore`. La wallet de deploy es exclusiva del proyecto y guarda solo el POL necesario para operar la demo.
- La gobernanza administra el padrón, pero **no puede** cambiar estados de credenciales.
- Pausa de emergencia: la activa el guardián y solo la gobernanza la levanta.
- El frontend inserta todo dato que viene de la cadena como texto (sin `innerHTML`), para evitar XSS.

## Licencia

MIT. Proyecto académico: las credenciales de demostración son ficticias y no tienen validez legal.
