<?php
/**
 * Colector OPCIONAL de diagnóstico del frontend (Credenciales Médicas — DIG UTN 2026).
 *
 * Recibe por POST (navigator.sendBeacon) los errores que registra el navegador y los
 * agrega a api/registros/diagnostico-AAAA-MM.log.php (una línea JSON por evento).
 * Los archivos empiezan con un guard PHP: si alguien los pide por URL, el servidor
 * ejecuta el guard y responde 404. Se descargan por FTP.
 *
 * Activación: en frontend/config/config.js → diagnostico.endpointRemoto = "api/recibir-diagnostico.php".
 * Requisito: la carpeta api/registros con permiso de escritura para PHP (desde el cliente FTP).
 */
declare(strict_types=1);

const DIAGNOSTICO_DIRECTORIO_REGISTROS = __DIR__ . '/registros';
const DIAGNOSTICO_TAMANO_MAXIMO_CUERPO = 16384;
const DIAGNOSTICO_MAXIMO_ENTRADAS = 20;
const DIAGNOSTICO_LARGO_MAXIMO_TEXTO = 2000;
const DIAGNOSTICO_GUARDA_ARCHIVO = "<?php http_response_code(404); exit; ?>\n";

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function diagnosticoResponder(int $codigo, bool $ok): void
{
    http_response_code($codigo);
    echo json_encode(['ok' => $ok]);
    exit;
}

function diagnosticoRecortarTexto($valor): string
{
    $texto = is_string($valor) ? $valor : (string) json_encode($valor, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $texto = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $texto) ?? '';
    return mb_substr($texto, 0, DIAGNOSTICO_LARGO_MAXIMO_TEXTO);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    diagnosticoResponder(405, false);
}

$cuerpo = file_get_contents('php://input', false, null, 0, DIAGNOSTICO_TAMANO_MAXIMO_CUERPO + 1);
if ($cuerpo === false || strlen($cuerpo) > DIAGNOSTICO_TAMANO_MAXIMO_CUERPO) {
    diagnosticoResponder(413, false);
}

$datos = json_decode($cuerpo, true);
if (!is_array($datos) || !isset($datos['entradas']) || !is_array($datos['entradas'])) {
    diagnosticoResponder(400, false);
}

// La IP no se guarda: solo un seudónimo que cambia cada día (agrupa eventos de un mismo cliente).
$clienteSeudonimo = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . gmdate('Y-m-d')), 0, 16);
$lineas = [];
foreach (array_slice($datos['entradas'], 0, DIAGNOSTICO_MAXIMO_ENTRADAS) as $entrada) {
    if (!is_array($entrada)) {
        continue;
    }
    $lineas[] = json_encode([
        'recibido' => gmdate('c'),
        'cliente' => $clienteSeudonimo,
        'origen' => diagnosticoRecortarTexto($datos['origen'] ?? ''),
        'fecha' => diagnosticoRecortarTexto($entrada['fecha'] ?? ''),
        'nivel' => diagnosticoRecortarTexto($entrada['nivel'] ?? ''),
        'modulo' => diagnosticoRecortarTexto($entrada['modulo'] ?? ''),
        'mensaje' => diagnosticoRecortarTexto($entrada['mensaje'] ?? ''),
        'pagina' => diagnosticoRecortarTexto($entrada['pagina'] ?? ''),
        'detalle' => diagnosticoRecortarTexto($entrada['detalle'] ?? null),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

if (!$lineas) {
    diagnosticoResponder(400, false);
}

$archivo = DIAGNOSTICO_DIRECTORIO_REGISTROS . '/diagnostico-' . gmdate('Y-m') . '.log.php';
if (!is_file($archivo) && file_put_contents($archivo, DIAGNOSTICO_GUARDA_ARCHIVO, LOCK_EX) === false) {
    error_log('[credenciales-medicas] No se pudo crear ' . $archivo);
    diagnosticoResponder(500, false);
}
if (file_put_contents($archivo, implode("\n", $lineas) . "\n", FILE_APPEND | LOCK_EX) === false) {
    error_log('[credenciales-medicas] No se pudo escribir ' . $archivo);
    diagnosticoResponder(500, false);
}
diagnosticoResponder(200, true);
