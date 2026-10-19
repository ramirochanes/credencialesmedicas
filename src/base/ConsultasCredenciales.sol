// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AlmacenCredenciales} from "./AlmacenCredenciales.sol";
import {
    EstadoCredencial,
    Credencial,
    EventoHistorial,
    VerificacionRegistrada,
    AntecedenteAutodeclarado
} from "../tipos/TiposCredencialMedica.sol";

/// @title ConsultasCredenciales
/// @notice Consultas públicas y gratuitas (funciones view) del registro: estado vigente,
///         ficha, contraste de documento, historial, verificaciones y antecedentes.
abstract contract ConsultasCredenciales is AlmacenCredenciales {
    constructor(address gobernanza, address guardianPausa) AlmacenCredenciales(gobernanza, guardianPausa) {}

    function consultarEstadoVigente(bytes32 idCredencial) external view returns (EstadoCredencial) {
        return _estadoVigente(_credenciales[idCredencial]);
    }

    function obtenerCredencial(bytes32 idCredencial)
        external
        view
        returns (Credencial memory datos, EstadoCredencial estadoVigente)
    {
        datos = _credenciales[idCredencial];
        estadoVigente = _estadoVigente(_credenciales[idCredencial]);
    }

    function contrastarDocumento(bytes32 idCredencial, bytes32 hashDocumento)
        external
        view
        returns (bool coincide, EstadoCredencial estadoVigente)
    {
        Credencial storage credencial = _credenciales[idCredencial];
        coincide = hashDocumento != bytes32(0) && credencial.hashDocumento == hashDocumento;
        estadoVigente = _estadoVigente(credencial);
    }

    function buscarCredencialPorHashDocumento(bytes32 hashDocumento) external view returns (bytes32) {
        return _credencialPorHashDocumento[hashDocumento];
    }

    function obtenerHistorialCredencial(bytes32 idCredencial) external view returns (EventoHistorial[] memory) {
        return _historialPorCredencial[idCredencial];
    }

    function cantidadVerificacionesCredencial(bytes32 idCredencial) external view returns (uint256) {
        return _verificacionesPorCredencial[idCredencial].length;
    }

    function obtenerVerificacionesCredencial(bytes32 idCredencial, uint256 desde, uint256 cantidad)
        external
        view
        returns (VerificacionRegistrada[] memory pagina)
    {
        VerificacionRegistrada[] storage todas = _verificacionesPorCredencial[idCredencial];
        uint256 total = todas.length;
        if (desde >= total || cantidad == 0) return new VerificacionRegistrada[](0);
        uint256 hasta = desde + cantidad > total ? total : desde + cantidad;
        pagina = new VerificacionRegistrada[](hasta - desde);
        for (uint256 i = desde; i < hasta; ++i) {
            pagina[i - desde] = todas[i];
        }
    }

    function obtenerAntecedentesCredencial(bytes32 idCredencial)
        external
        view
        returns (AntecedenteAutodeclarado[] memory)
    {
        return _antecedentesPorCredencial[idCredencial];
    }

    /// @dev Índice de solo agregado: si la wallet del titular cambió, la lista de la
    ///      wallet anterior conserva el id. El cliente filtra por `cuentaTitular`.
    function obtenerCredencialesDeTitular(address cuentaTitular) external view returns (bytes32[] memory) {
        return _credencialesPorTitular[cuentaTitular];
    }

    function totalCredenciales() external view returns (uint256) {
        return _totalCredenciales;
    }
}
