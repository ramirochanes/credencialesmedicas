// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TipoInstitucion, Institucion} from "../tipos/TiposCredencialMedica.sol";

/// @title Interfaz del padrón de instituciones
/// @notice Alta y habilitación de instituciones emisoras y verificadoras, y vínculo
///         de las cuentas (wallets) que operan en nombre de cada una.
interface IPadronInstituciones {
    event InstitucionRegistrada(
        uint32 indexed idInstitucion,
        TipoInstitucion tipo,
        string nombre,
        string jurisdiccion,
        uint8 tiposCredencialHabilitados
    );
    event HabilitacionInstitucionActualizada(uint32 indexed idInstitucion, bool habilitada);
    event TiposCredencialInstitucionActualizados(uint32 indexed idInstitucion, uint8 tiposCredencialHabilitados);
    event CuentaOperadoraVinculada(address indexed cuenta, uint32 indexed idInstitucion);
    event CuentaOperadoraDesvinculada(address indexed cuenta, uint32 indexed idInstitucion);

    function altaInstitucion(
        string calldata nombre,
        TipoInstitucion tipo,
        string calldata jurisdiccion,
        uint8 tiposCredencialHabilitados
    ) external returns (uint32 idInstitucion);

    function actualizarHabilitacionInstitucion(uint32 idInstitucion, bool habilitada) external;

    function actualizarTiposCredencialInstitucion(uint32 idInstitucion, uint8 tiposCredencialHabilitados) external;

    function vincularCuentaOperadora(address cuenta, uint32 idInstitucion) external;

    function desvincularCuentaOperadora(address cuenta) external;

    function pausarRegistro() external;

    function reanudarRegistro() external;

    function obtenerInstitucion(uint32 idInstitucion) external view returns (Institucion memory);

    function cantidadInstituciones() external view returns (uint32);

    function institucionDeCuenta(address cuenta) external view returns (uint32);
}
