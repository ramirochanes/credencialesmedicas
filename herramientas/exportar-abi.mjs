// Exporta el ABI del contrato compilado por Foundry a un módulo ES para el frontend.
// Uso (desde la raíz del repo, después de `forge build`):
//   node herramientas/exportar-abi.mjs [ruta/al/artefacto.json]
import { readFileSync, writeFileSync } from 'node:fs';

const rutaArtefacto = process.argv[2] ?? 'out/RegistroCredencialesMedicas.sol/RegistroCredencialesMedicas.json';
const rutaDestino = 'frontend/assets/js/nucleo/abi-registro-credenciales.js';

const artefacto = JSON.parse(readFileSync(rutaArtefacto, 'utf8'));
if (!Array.isArray(artefacto.abi)) throw new Error(`El artefacto ${rutaArtefacto} no tiene ABI`);

const contenido = `// ARCHIVO GENERADO por herramientas/exportar-abi.mjs — no editar a mano.
// Contrato: RegistroCredencialesMedicas · elementos del ABI: ${artefacto.abi.length}
export const ABI_REGISTRO_CREDENCIALES = Object.freeze(${JSON.stringify(artefacto.abi)});
`;
writeFileSync(rutaDestino, contenido);
console.log(`ABI exportado a ${rutaDestino} (${artefacto.abi.length} elementos)`);
