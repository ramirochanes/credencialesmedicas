// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    TipoCredencial,
    EstadoCredencial,
    AccionCredencial,
    Credencial,
    DatosCredencialPreexistente,
    EventoHistorial,
    VerificacionRegistrada,
    AntecedenteAutodeclarado
} from "../tipos/TiposCredencialMedica.sol";
import {IPadronInstituciones} from "./IPadronInstituciones.sol";

/// @title Interfaz del registro de credenciales médicas
/// @notice Ciclo de vida completo del DTE: solicitud, validación, emisión, suspensión,
///         reactivación, vencimiento y revocación; más verificación institucional y
///         antecedentes autodeclarados por el titular.
interface IRegistroCredencialesMedicas is IPadronInstituciones {
    event CambioEstadoCredencial(
        bytes32 indexed idCredencial,
        uint32 indexed idInstitucion,
        AccionCredencial accion,
        EstadoCredencial estadoAnterior,
        EstadoCredencial estadoNuevo,
        bytes32 referenciaActo,
        address operador
    );
    event DocumentoCredencialAnclado(bytes32 indexed idCredencial, bytes32 indexed hashDocumento, uint64 venceEl);
    event CuentaTitularAsignada(bytes32 indexed idCredencial, address indexed cuentaTitular);
    event VerificacionInstitucionalRegistrada(
        bytes32 indexed idCredencial,
        uint32 indexed idInstitucionVerificadora,
        address operador,
        EstadoCredencial estadoObservado
    );
    event AntecedenteProfesionalDeclarado(bytes32 indexed idCredencial, uint256 indice, bytes32 hashEvidencia);
    event AntecedenteProfesionalRetirado(bytes32 indexed idCredencial, uint256 indice);

    // ── Emisor ───────────────────────────────────────────────────────────
    function registrarSolicitudCredencial(
        bytes32 idCredencial,
        TipoCredencial tipo,
        bytes32 referenciaInterna,
        address cuentaTitular
    ) external;

    function validarSolicitudCredencial(bytes32 idCredencial) external;

    function rechazarSolicitudCredencial(bytes32 idCredencial, bytes32 referenciaActo) external;

    function emitirCredencialValidada(bytes32 idCredencial, bytes32 hashDocumento, uint64 venceEl) external;

    function emitirCredencialesPreexistentesEnLote(DatosCredencialPreexistente[] calldata lote) external;

    function suspenderCredencial(bytes32 idCredencial, bytes32 referenciaActo) external;

    function reactivarCredencial(bytes32 idCredencial, bytes32 referenciaActo) external;

    function revocarCredencial(bytes32 idCredencial, bytes32 referenciaActo) external;

    function asignarCuentaTitular(bytes32 idCredencial, address cuentaTitular) external;

    // ── Cualquier cuenta ─────────────────────────────────────────────────
    function registrarVencimientoCredencial(bytes32 idCredencial) external;

    // ── Verificador institucional ────────────────────────────────────────
    function registrarVerificacionInstitucional(bytes32 idCredencial) external returns (EstadoCredencial);

    // ── Titular ──────────────────────────────────────────────────────────
    function declararAntecedenteProfesional(bytes32 idCredencial, bytes32 hashEvidencia, string calldata descripcion)
        external;

    function retirarAntecedenteProfesional(bytes32 idCredencial, uint256 indice) external;

    // ── Consultas públicas (sin costo) ───────────────────────────────────
    function consultarEstadoVigente(bytes32 idCredencial) external view returns (EstadoCredencial);

    function obtenerCredencial(bytes32 idCredencial)
        external
        view
        returns (Credencial memory datos, EstadoCredencial estadoVigente);

    function contrastarDocumento(bytes32 idCredencial, bytes32 hashDocumento)
        external
        view
        returns (bool coincide, EstadoCredencial estadoVigente);

    function buscarCredencialPorHashDocumento(bytes32 hashDocumento) external view returns (bytes32);

    function obtenerHistorialCredencial(bytes32 idCredencial) external view returns (EventoHistorial[] memory);

    function cantidadVerificacionesCredencial(bytes32 idCredencial) external view returns (uint256);

    function obtenerVerificacionesCredencial(bytes32 idCredencial, uint256 desde, uint256 cantidad)
        external
        view
        returns (VerificacionRegistrada[] memory);

    function obtenerAntecedentesCredencial(bytes32 idCredencial)
        external
        view
        returns (AntecedenteAutodeclarado[] memory);

    function obtenerCredencialesDeTitular(address cuentaTitular) external view returns (bytes32[] memory);

    function totalCredenciales() external view returns (uint256);
}
