// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PadronInstituciones} from "./PadronInstituciones.sol";
import {IRegistroCredencialesMedicas} from "../interfaces/IRegistroCredencialesMedicas.sol";
import {
    TipoCredencial,
    EstadoCredencial,
    AccionCredencial,
    Credencial,
    EventoHistorial,
    VerificacionRegistrada,
    AntecedenteAutodeclarado
} from "../tipos/TiposCredencialMedica.sol";
import {
    IdentificadorCredencialInvalido,
    CredencialYaRegistrada,
    CredencialInexistente,
    OperadorDeOtraInstitucion,
    TransicionNoPermitida,
    HashDocumentoInvalido,
    HashDocumentoYaAnclado,
    VencimientoInvalido,
    ReferenciaActoRequerida,
    SoloCuentaTitular
} from "../errores/ErroresRegistroCredenciales.sol";

/// @title AlmacenCredenciales
/// @notice Almacenamiento de credenciales y reglas internas compartidas: estado vigente
///         por fecha, alta, anclaje del documento, historial y controles de autorización.
/// @dev    No expone funciones públicas propias: las consultas viven en
///         ConsultasCredenciales y las operaciones en RegistroCredencialesMedicas.
abstract contract AlmacenCredenciales is PadronInstituciones, IRegistroCredencialesMedicas {
    mapping(bytes32 => Credencial) internal _credenciales;
    mapping(bytes32 => EventoHistorial[]) internal _historialPorCredencial;
    mapping(bytes32 => VerificacionRegistrada[]) internal _verificacionesPorCredencial;
    mapping(bytes32 => AntecedenteAutodeclarado[]) internal _antecedentesPorCredencial;
    mapping(bytes32 => bytes32) internal _credencialPorHashDocumento;
    mapping(address => bytes32[]) internal _credencialesPorTitular;
    uint256 internal _totalCredenciales;

    constructor(address gobernanza, address guardianPausa) PadronInstituciones(gobernanza, guardianPausa) {}

    /// @dev Estado efectivo: una credencial Activa o Suspendida cuya fecha de vencimiento
    ///      ya pasó se informa como Vencida aunque nadie haya registrado la transacción.
    function _estadoVigente(Credencial storage credencial) internal view returns (EstadoCredencial) {
        EstadoCredencial persistido = credencial.estado;
        if (
            (persistido == EstadoCredencial.Activa || persistido == EstadoCredencial.Suspendida)
                && credencial.venceEl != 0 && block.timestamp >= credencial.venceEl
        ) return EstadoCredencial.Vencida;
        return persistido;
    }

    function _crearCredencial(
        bytes32 idCredencial,
        TipoCredencial tipo,
        bytes32 referenciaInterna,
        address cuentaTitular,
        uint32 idInstitucion
    ) internal returns (Credencial storage credencial) {
        if (idCredencial == bytes32(0)) revert IdentificadorCredencialInvalido();
        credencial = _credenciales[idCredencial];
        if (credencial.estado != EstadoCredencial.Inexistente) revert CredencialYaRegistrada(idCredencial);
        credencial.tipo = tipo;
        credencial.referenciaInterna = referenciaInterna;
        credencial.institucionEmisora = idInstitucion;
        unchecked {
            ++_totalCredenciales;
        }
        if (cuentaTitular != address(0)) _asociarTitular(idCredencial, credencial, cuentaTitular);
    }

    function _asociarTitular(bytes32 idCredencial, Credencial storage credencial, address cuentaTitular) internal {
        credencial.cuentaTitular = cuentaTitular;
        _credencialesPorTitular[cuentaTitular].push(idCredencial);
        emit CuentaTitularAsignada(idCredencial, cuentaTitular);
    }

    function _anclarDocumento(bytes32 idCredencial, Credencial storage credencial, bytes32 hashDocumento, uint64 venceEl)
        internal
    {
        if (hashDocumento == bytes32(0)) revert HashDocumentoInvalido();
        bytes32 existente = _credencialPorHashDocumento[hashDocumento];
        if (existente != bytes32(0)) revert HashDocumentoYaAnclado(hashDocumento, existente);
        if (venceEl != 0 && venceEl <= block.timestamp) revert VencimientoInvalido(venceEl);
        credencial.hashDocumento = hashDocumento;
        credencial.venceEl = venceEl;
        _credencialPorHashDocumento[hashDocumento] = idCredencial;
        emit DocumentoCredencialAnclado(idCredencial, hashDocumento, venceEl);
    }

    function _anotarCambioEstado(
        bytes32 idCredencial,
        Credencial storage credencial,
        uint32 idInstitucion,
        AccionCredencial accion,
        EstadoCredencial estadoNuevo,
        bytes32 referenciaActo
    ) internal {
        EstadoCredencial estadoAnterior = credencial.estado;
        credencial.estado = estadoNuevo;
        credencial.actualizadaEl = uint64(block.timestamp);
        _historialPorCredencial[idCredencial].push(
            EventoHistorial({
                fecha: uint64(block.timestamp),
                institucion: idInstitucion,
                accion: accion,
                estadoResultante: estadoNuevo,
                operador: msg.sender,
                referenciaActo: referenciaActo
            })
        );
        emit CambioEstadoCredencial(
            idCredencial, idInstitucion, accion, estadoAnterior, estadoNuevo, referenciaActo, msg.sender
        );
    }

    function _credencialExistente(bytes32 idCredencial) internal view returns (Credencial storage credencial) {
        credencial = _credenciales[idCredencial];
        if (credencial.estado == EstadoCredencial.Inexistente) revert CredencialInexistente(idCredencial);
    }

    /// @dev La cuenta que llama debe operar para la institución que emitió la credencial.
    function _credencialDeLaInstitucionOperadora(bytes32 idCredencial)
        internal
        view
        returns (Credencial storage credencial, uint32 idInstitucion)
    {
        (idInstitucion,) = _institucionHabilitadaDe(msg.sender);
        credencial = _credencialExistente(idCredencial);
        if (credencial.institucionEmisora != idInstitucion) revert OperadorDeOtraInstitucion(idCredencial, idInstitucion);
    }

    function _credencialDelTitular(bytes32 idCredencial) internal view returns (Credencial storage credencial) {
        credencial = _credencialExistente(idCredencial);
        if (credencial.cuentaTitular == address(0) || credencial.cuentaTitular != msg.sender) {
            revert SoloCuentaTitular(idCredencial);
        }
    }

    function _exigirEstadoVigente(
        bytes32 idCredencial,
        Credencial storage credencial,
        EstadoCredencial requerido,
        AccionCredencial accion
    ) internal view {
        EstadoCredencial vigente = _estadoVigente(credencial);
        if (vigente != requerido) revert TransicionNoPermitida(idCredencial, vigente, accion);
    }

    function _exigirReferenciaActo(bytes32 referenciaActo) internal pure {
        if (referenciaActo == bytes32(0)) revert ReferenciaActoRequerida();
    }
}
