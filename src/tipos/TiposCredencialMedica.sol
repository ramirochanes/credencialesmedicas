// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Tipos del registro de credenciales médicas.
// Enumeraciones y estructuras compartidas por el padrón de instituciones
// y el registro de credenciales. No contienen lógica.
// Ningún tipo almacena datos personales del profesional: solo hashes,
// fechas, estados e identificadores opacos.

/// @notice Naturaleza de la institución que participa del registro.
enum TipoInstitucion {
    NoDefinida, //          0 — valor centinela, nunca válido en un alta
    Universidad, //         1 — emite el título profesional
    ColegioProfesional, //  2 — emite la credencial colegial (o la matrícula, según jurisdicción)
    MinisterioSalud, //     3 — emite la matrícula sanitaria
    PrestadorSalud //       4 — solo verifica (hospitales, clínicas, financiadores)
}

/// @notice Clase de credencial. La máscara de tipos habilitados de cada institución
///         usa el bit `1 << uint8(TipoCredencial)`.
enum TipoCredencial {
    NoDefinida, //              0 — centinela
    TituloProfesional, //       1 — bit 0x02
    CredencialColegial, //      2 — bit 0x04
    MatriculaSanitaria, //      3 — bit 0x08
    CertificadoEspecialidad //  4 — bit 0x10
}

/// @notice Estados del DTE (Diagrama de Transición de Estados) de una credencial.
/// @dev    `Vencida` puede ser un estado persistido o calculado por fecha
///         (ver `consultarEstadoVigente`). `Rechazada` es el camino de excepción
///         agregado sobre el DTE presentado (validación fallida).
enum EstadoCredencial {
    Inexistente, // 0
    Pendiente, //   1 — solicitud registrada
    Validada, //    2 — el emisor validó los requisitos
    Activa, //      3 — emitida, hash anclado
    Suspendida, //  4 — suspensión transitoria
    Vencida, //     5 — superó su fecha de vencimiento (fin)
    Revocada, //    6 — baja explícita del emisor (fin)
    Rechazada //    7 — la solicitud no superó la validación (fin alternativo)
}

/// @notice Eventos (flechas) del DTE. Se guardan en el historial de cada credencial.
enum AccionCredencial {
    Solicitud, //            0
    Validacion, //           1
    Rechazo, //              2
    Emision, //              3
    EmisionCargaInicial, //  4 — migración de credenciales emitidas antes del sistema
    Suspension, //           5
    Reactivacion, //         6
    Vencimiento, //          7
    Revocacion //            8
}

/// @notice Ficha de una institución del padrón.
struct Institucion {
    string nombre;
    string jurisdiccion;
    TipoInstitucion tipo;
    uint8 tiposCredencialHabilitados; // máscara de bits por TipoCredencial
    bool habilitada;
    uint64 altaEl;
}

/// @notice Datos on-chain de una credencial. El documento original queda off-chain
///         en el sistema del emisor; acá solo vive su huella SHA-256.
struct Credencial {
    bytes32 hashDocumento; // SHA-256 del documento emitido (0 hasta la emisión)
    bytes32 referenciaInterna; // referencia opaca del emisor (hash con sal propia)
    address cuentaTitular; // wallet del profesional (opcional)
    uint64 solicitadaEl;
    uint64 emitidaEl;
    uint64 venceEl; // 0 = sin vencimiento
    uint64 actualizadaEl;
    uint32 institucionEmisora;
    TipoCredencial tipo;
    EstadoCredencial estado; // estado persistido; el vigente puede diferir por fecha
    bool cargaInicial;
}

/// @notice Datos de entrada para migrar credenciales ya emitidas (carga inicial).
struct DatosCredencialPreexistente {
    bytes32 idCredencial;
    TipoCredencial tipo;
    bytes32 referenciaInterna;
    address cuentaTitular;
    bytes32 hashDocumento;
    uint64 emitidaEl;
    uint64 venceEl;
}

/// @notice Entrada del historial inmutable de una credencial.
struct EventoHistorial {
    uint64 fecha;
    uint32 institucion;
    AccionCredencial accion;
    EstadoCredencial estadoResultante;
    address operador;
    bytes32 referenciaActo; // hash del acto administrativo que respalda el cambio
}

/// @notice Constancia de que una institución verificó la credencial (quién y cuándo).
struct VerificacionRegistrada {
    uint64 fecha;
    uint32 institucionVerificadora;
    EstadoCredencial estadoObservado;
    address operador;
}

/// @notice Antecedente que declara el propio titular. No está certificado por el emisor.
struct AntecedenteAutodeclarado {
    bytes32 hashEvidencia;
    uint64 declaradoEl;
    bool retirado;
    string descripcion;
}
