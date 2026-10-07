// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {TipoInstitucion, TipoCredencial, Institucion} from "../tipos/TiposCredencialMedica.sol";
import {IPadronInstituciones} from "../interfaces/IPadronInstituciones.sol";
import {
    CuentaInvalida,
    TextoInstitucionInvalido,
    TipoInstitucionInvalido,
    MascaraTiposInvalida,
    InstitucionInexistente,
    InstitucionNoHabilitada,
    CuentaYaVinculada,
    CuentaSinInstitucion,
    TipoCredencialInvalido,
    TipoCredencialNoHabilitado
} from "../errores/ErroresRegistroCredenciales.sol";

/// @title PadronInstituciones
/// @notice Gobernanza del registro: qué instituciones participan, qué tipos de
///         credencial puede emitir cada una y qué cuentas operan en su nombre.
/// @dev    Separación de poderes deliberada:
///         - DEFAULT_ADMIN_ROLE (gobernanza, idealmente un Safe multisig) administra el
///           padrón, pero NO puede cambiar el estado de ninguna credencial.
///         - ROL_GUARDIAN_PAUSA puede frenar el registro ante un incidente; solo la
///           gobernanza puede reanudarlo.
///         Cada cuenta operadora pertenece a una única institución. Si una institución
///         cambia de autoridades, se desvinculan y vinculan cuentas sin tocar las
///         credenciales ya emitidas, que quedan asociadas a la institución y no a una
///         persona física.
abstract contract PadronInstituciones is AccessControl, Pausable, IPadronInstituciones {
    bytes32 public constant ROL_GUARDIAN_PAUSA = keccak256("ROL_GUARDIAN_PAUSA");

    uint256 internal constant LARGO_MAXIMO_TEXTO_INSTITUCION = 120;
    /// @dev Bits 1..4 → TituloProfesional, CredencialColegial, MatriculaSanitaria, CertificadoEspecialidad.
    uint8 internal constant MASCARA_TIPOS_CREDENCIAL_VALIDOS = 0x1E;

    uint32 private _totalInstituciones;
    mapping(uint32 => Institucion) private _instituciones;
    mapping(address => uint32) private _institucionPorCuenta;

    constructor(address gobernanza, address guardianPausa) {
        if (gobernanza == address(0)) revert CuentaInvalida(gobernanza);
        if (guardianPausa == address(0)) revert CuentaInvalida(guardianPausa);
        _grantRole(DEFAULT_ADMIN_ROLE, gobernanza);
        _grantRole(ROL_GUARDIAN_PAUSA, guardianPausa);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Gobernanza del padrón
    // ─────────────────────────────────────────────────────────────────────

    function altaInstitucion(
        string calldata nombre,
        TipoInstitucion tipo,
        string calldata jurisdiccion,
        uint8 tiposCredencialHabilitados
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint32 idInstitucion) {
        uint256 largoNombre = bytes(nombre).length;
        if (
            largoNombre == 0 || largoNombre > LARGO_MAXIMO_TEXTO_INSTITUCION
                || bytes(jurisdiccion).length > LARGO_MAXIMO_TEXTO_INSTITUCION
        ) revert TextoInstitucionInvalido();
        if (tipo == TipoInstitucion.NoDefinida) revert TipoInstitucionInvalido();
        _validarMascaraTiposCredencial(tipo, tiposCredencialHabilitados);

        idInstitucion = ++_totalInstituciones;
        _instituciones[idInstitucion] = Institucion({
            nombre: nombre,
            jurisdiccion: jurisdiccion,
            tipo: tipo,
            tiposCredencialHabilitados: tiposCredencialHabilitados,
            habilitada: true,
            altaEl: uint64(block.timestamp)
        });
        emit InstitucionRegistrada(idInstitucion, tipo, nombre, jurisdiccion, tiposCredencialHabilitados);
    }

    function actualizarHabilitacionInstitucion(uint32 idInstitucion, bool habilitada)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _institucionExistente(idInstitucion).habilitada = habilitada;
        emit HabilitacionInstitucionActualizada(idInstitucion, habilitada);
    }

    function actualizarTiposCredencialInstitucion(uint32 idInstitucion, uint8 tiposCredencialHabilitados)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        Institucion storage institucion = _institucionExistente(idInstitucion);
        _validarMascaraTiposCredencial(institucion.tipo, tiposCredencialHabilitados);
        institucion.tiposCredencialHabilitados = tiposCredencialHabilitados;
        emit TiposCredencialInstitucionActualizados(idInstitucion, tiposCredencialHabilitados);
    }

    function vincularCuentaOperadora(address cuenta, uint32 idInstitucion) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (cuenta == address(0)) revert CuentaInvalida(cuenta);
        _institucionExistente(idInstitucion);
        uint32 actual = _institucionPorCuenta[cuenta];
        if (actual != 0) revert CuentaYaVinculada(cuenta, actual);
        _institucionPorCuenta[cuenta] = idInstitucion;
        emit CuentaOperadoraVinculada(cuenta, idInstitucion);
    }

    function desvincularCuentaOperadora(address cuenta) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint32 actual = _institucionPorCuenta[cuenta];
        if (actual == 0) revert CuentaSinInstitucion(cuenta);
        delete _institucionPorCuenta[cuenta];
        emit CuentaOperadoraDesvinculada(cuenta, actual);
    }

    /// @notice Freno de emergencia: bloquea toda escritura de credenciales.
    function pausarRegistro() external onlyRole(ROL_GUARDIAN_PAUSA) {
        _pause();
    }

    /// @notice Solo la gobernanza decide cuándo se reanuda.
    function reanudarRegistro() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ─────────────────────────────────────────────────────────────────────
    // Consultas
    // ─────────────────────────────────────────────────────────────────────

    function obtenerInstitucion(uint32 idInstitucion) external view returns (Institucion memory) {
        return _instituciones[idInstitucion];
    }

    function cantidadInstituciones() external view returns (uint32) {
        return _totalInstituciones;
    }

    function institucionDeCuenta(address cuenta) external view returns (uint32) {
        return _institucionPorCuenta[cuenta];
    }

    // ─────────────────────────────────────────────────────────────────────
    // Auxiliares internos
    // ─────────────────────────────────────────────────────────────────────

    /// @dev Devuelve la institución habilitada de la cuenta que llama, o revierte.
    function _institucionHabilitadaDe(address cuenta)
        internal
        view
        returns (uint32 idInstitucion, Institucion storage institucion)
    {
        idInstitucion = _institucionPorCuenta[cuenta];
        if (idInstitucion == 0) revert CuentaSinInstitucion(cuenta);
        institucion = _instituciones[idInstitucion];
        if (!institucion.habilitada) revert InstitucionNoHabilitada(idInstitucion);
    }

    /// @dev Exige que la institución pueda emitir ese tipo de credencial.
    function _exigirEmisoraDelTipo(uint32 idInstitucion, Institucion storage institucion, TipoCredencial tipo)
        internal
        view
    {
        if (tipo == TipoCredencial.NoDefinida) revert TipoCredencialInvalido();
        if (institucion.tiposCredencialHabilitados & (uint8(1) << uint8(tipo)) == 0) {
            revert TipoCredencialNoHabilitado(idInstitucion, tipo);
        }
    }

    function _institucionExistente(uint32 idInstitucion) private view returns (Institucion storage institucion) {
        institucion = _instituciones[idInstitucion];
        if (institucion.tipo == TipoInstitucion.NoDefinida) revert InstitucionInexistente(idInstitucion);
    }

    /// @dev Un prestador de salud solo verifica (máscara 0). Un emisor necesita al menos
    ///      un tipo y solo bits válidos.
    function _validarMascaraTiposCredencial(TipoInstitucion tipo, uint8 mascara) private pure {
        if (tipo == TipoInstitucion.PrestadorSalud) {
            if (mascara != 0) revert MascaraTiposInvalida(mascara);
            return;
        }
        if (mascara == 0 || (mascara & ~MASCARA_TIPOS_CREDENCIAL_VALIDOS) != 0) revert MascaraTiposInvalida(mascara);
    }
}
