# Deuda técnica y mejoras

## Deuda técnica conocida

| # | Tema | Impacto | Cómo resolverlo |
|---|---|---|---|
| DT-1 | Contrato **no actualizable** (decisión deliberada) | Un bug obliga a redesplegar y migrar | Se mantiene así: en la clase 10 Pame señaló que los contratos actualizables son una señal de alerta para quien confía en el registro. Ante una versión nueva se despliega otro contrato y se migra con la carga inicial en lote; el historial anterior sigue consultable. |
| DT-2 | Gobernanza y guardián en una **EOA** (la cuenta de deploy) | Punto único de falla | Pasar `DEFAULT_ADMIN_ROLE` a un **Safe multisig** (por ejemplo 3 de 5 colegios) y renunciar al rol en la EOA. |
| DT-3 | Índice `credencialesPorTitular` de **solo agregado** | Si cambia la wallet, la lista vieja conserva el id (el front lo filtra) | Usar `EnumerableSet` por titular y quitar al reasignar. |
| DT-4 | Listado del emisor por **escaneo de eventos** en tramos | Lento si pasaron muchos bloques desde el deploy | Indexador (The Graph / Ponder) o un endpoint propio que cachee eventos. |
| DT-5 | **Sin versionado de assets** del frontend | Caché del navegador con módulos viejos después de actualizar | Paso de build mínimo que agregue hash al nombre de los archivos, o `?v=` en los imports. **Hecho (07/10/2026):** `.htaccess` envía `Cache-Control: no-cache` para HTML, CSS y JS. |
| DT-6 | CSP con RPCs **duplicados** en `.htaccess` y `config.js` | Si se cambia uno y no el otro, se bloquean las lecturas | Generar `.htaccess` desde `config.js` con un script. |
| DT-7 | Colector PHP **sin rate limit** | Se puede llenar el disco con envíos masivos | Límite por seudónimo/minuto y rotación por tamaño. |
| DT-8 | Gas pagado por cada institución | Fricción para instituciones sin cripto | Account Abstraction (ERC-4337) con Paymaster: el operador del servicio patrocina el gas (clase 30/38). |
| DT-9 | Instituciones demo **ficticias** | — | El alta de instituciones reales requiere convenios (ver modelo de negocio). |
| DT-10 | Pruebas de interfaz manuales/locales | Regresiones en el front | Llevar el recorrido Playwright usado en el desarrollo a `pruebas-e2e/` con Anvil. |
| DT-11 | Prueba de titularidad **sin nonce compartido**: el código se recuerda en el `localStorage` del dispositivo que lo generó | Si el verificador abre la respuesta en otro dispositivo, una firma de los últimos 10 minutos podría reutilizarse; la interfaz pide confirmar el código a mano | Desafío servido por un endpoint (o on-chain) con un solo uso. |
| DT-12 | Prueba de titularidad solo para **EOA** (`verifyMessage`, EIP-191) | Una wallet inteligente (Safe, cuenta ERC-4337) no puede probar titularidad | Soportar EIP-1271 (`isValidSignature`) leyendo el contrato de la cuenta. |
| DT-14 | Ingreso con mail (Privy) con wallet **EOA embebida**, sin paymaster | Cada cuenta nueva necesita POL para operar; la gobernanza tiene que cargarlo | Smart account ERC-4337 con paymaster (Pimlico) que patrocine el gas de las cuentas habilitadas en el padrón, como en la clase 38. |
| DT-15 | Dependencia de un tercero (Privy) para el ingreso con mail | Si el servicio cae, las cuentas por mail no pueden operar (consultar sigue funcionando); Privy ve los mails | MetaMask queda como alternativa en la misma pantalla. Evaluar login con identidad estatal (Ciudadano Digital / Mi Argentina) + MPC, como el caso EPEC (clases 30 y 33). |
| DT-13 | Cuenta de deploy con **POL real** en red principal | Exposición si se filtra la clave | Dejar el saldo mínimo, pasar la gobernanza a un Safe (DT-2) y mover el remanente a otra cuenta. |
| DT-16 | Las **constancias de verificación** de hospitales y clínicas se ven en la consulta pública | Deja ver dónde trabaja o se postula un médico (devolución de María Eugenia) | **Hecho para el MVP (07/10/2026):** ya no se muestran en la consulta pública; las ve el médico en «Mis matrículas» y cada hospital en su panel. El dato sigue legible en la cadena para quien la consulte técnicamente. Privacidad completa: guardar solo una huella de la constancia y que el hospital la presente cuando haga falta (requiere contrato nuevo, porque no es actualizable). |
| DT-17 | **Video del pitch** servido desde YouTube | La portada del sitio depende de un tercero; si el video se borra o se vuelve privado, el reproductor queda vacío. `frontend/assets/video/video-pitch.mp4` quedó sin uso. La licencia de la cortina musical («Corporate Technology», ANtarcticbreeze) no está revisada | El sitio muestra una portada propia y solo se conecta a YouTube (versión sin cookies) al hacer clic. Revisar la licencia de la música antes de usar el video fuera del curso; sacar el mp4 del hosting. |

## Mejoras propuestas (roadmap)

| Fase | Mejora | Valor |
|---|---|---|
| 2 | **SBT ERC-5192** por credencial en la wallet del titular | Identidad portable: la credencial "vive" en la wallet del médico |
| 2 | **Credenciales Verificables W3C + DID** (QuarkID / did:ethr) firmadas por el emisor; la blockchain guarda solo el estado (lista de revocación) | Verificación offline, divulgación selectiva (SD-JWT), alineado con la clase 35 |
| 2 | Login con Google y embedded wallet (Privy) para titulares | Sin MetaMask ni frase semilla (clase 38) |
| 2 | Firma digital del PDF con certificado de la Ley 25.506 además del anclaje | Valor legal del documento y evidencia de existencia on-chain |
| 3 | Pruebas de conocimiento cero (ZKP): "tiene matrícula activa en alguna jurisdicción" sin revelar cuál | Privacidad para el profesional |
| 3 | Extensión a otros profesionales de la salud (enfermería, farmacia, kinesiología) | Escala del mercado |
| 3 | Credencial de agente médico de IA (KYA, clase 19) | Habilita la verificación de agentes que actúan en nombre de profesionales |
| 3 | Alertas a verificadores suscriptos cuando cambia el estado de una credencial que verificaron | Producto SaaS para prestadores |
| 3 | Red permisionada tipo LNET si los colegios lo exigen (el MVP ya corre en la red principal de Polygon) | Producción |

## Puntos que conviene revisar con la tutora

- Si para la evaluación el **DTE actualizado** (Rechazada, Suspendida→Revocada, Suspendida→Vencida) reemplaza al presentado o se muestra como evolución.
- Encuadre legal de la "constancia de verificación" (quién verificó a quién) frente a la Ley 25.326: es un dato asociado a una credencial seudónima.
