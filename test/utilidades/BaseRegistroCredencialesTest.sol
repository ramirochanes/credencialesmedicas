// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RegistroCredencialesMedicas} from "../../src/RegistroCredencialesMedicas.sol";
import {
    TipoInstitucion,
    TipoCredencial,
    EstadoCredencial
} from "../../src/tipos/TiposCredencialMedica.sol";

/// @notice Escenario común: un padrón con universidad, dos colegios de distintas
///         jurisdicciones, un ministerio y un prestador de salud, cada uno con su cuenta operadora.
abstract contract BaseRegistroCredencialesTest is Test {
    uint8 internal constant BIT_TITULO = 0x02;
    uint8 internal constant BIT_COLEGIAL = 0x04;
    uint8 internal constant BIT_MATRICULA = 0x08;
    uint8 internal constant BIT_ESPECIALIDAD = 0x10;

    bytes32 internal constant HASH_DOCUMENTO_A = keccak256("documento-a.pdf");
    bytes32 internal constant HASH_DOCUMENTO_B = keccak256("documento-b.pdf");
    bytes32 internal constant ACTO_SUSPENSION = keccak256("Resolucion 101/2026");
    bytes32 internal constant ACTO_REACTIVACION = keccak256("Resolucion 102/2026");
    bytes32 internal constant ACTO_REVOCACION = keccak256("Resolucion 103/2026");

    RegistroCredencialesMedicas internal registro;

    address internal cuentaGobernanza = makeAddr("gobernanza");
    address internal cuentaGuardian = makeAddr("guardian");
    address internal operadorColegio = makeAddr("operadorColegio");
    address internal operadorColegioOtraJurisdiccion = makeAddr("operadorColegioB");
    address internal operadorUniversidad = makeAddr("operadorUniversidad");
    address internal operadorMinisterio = makeAddr("operadorMinisterio");
    address internal operadorPrestador = makeAddr("operadorPrestador");
    address internal cuentaTitular = makeAddr("titular");
    address internal cuentaAjena = makeAddr("ajena");

    uint32 internal idColegio;
    uint32 internal idColegioOtraJurisdiccion;
    uint32 internal idUniversidad;
    uint32 internal idMinisterio;
    uint32 internal idPrestador;

    function setUp() public virtual {
        vm.warp(1_780_000_000); // fecha base fija para que los tests sean reproducibles
        registro = new RegistroCredencialesMedicas(cuentaGobernanza, cuentaGuardian);

        vm.startPrank(cuentaGobernanza);
        idColegio = registro.altaInstitucion(
            "Colegio Medico Demo A", TipoInstitucion.ColegioProfesional, "Jurisdiccion A", BIT_COLEGIAL | BIT_ESPECIALIDAD
        );
        idColegioOtraJurisdiccion = registro.altaInstitucion(
            "Colegio Medico Demo B", TipoInstitucion.ColegioProfesional, "Jurisdiccion B", BIT_COLEGIAL
        );
        idUniversidad =
            registro.altaInstitucion("Universidad Demo", TipoInstitucion.Universidad, "Jurisdiccion A", BIT_TITULO);
        idMinisterio =
            registro.altaInstitucion("Ministerio Demo", TipoInstitucion.MinisterioSalud, "Jurisdiccion A", BIT_MATRICULA);
        idPrestador = registro.altaInstitucion("Hospital Demo", TipoInstitucion.PrestadorSalud, "Jurisdiccion A", 0);

        registro.vincularCuentaOperadora(operadorColegio, idColegio);
        registro.vincularCuentaOperadora(operadorColegioOtraJurisdiccion, idColegioOtraJurisdiccion);
        registro.vincularCuentaOperadora(operadorUniversidad, idUniversidad);
        registro.vincularCuentaOperadora(operadorMinisterio, idMinisterio);
        registro.vincularCuentaOperadora(operadorPrestador, idPrestador);
        vm.stopPrank();
    }

    /// @dev Recorre el camino feliz del DTE hasta dejar la credencial Activa.
    function _emitirCredencialColegialActiva(bytes32 idCredencial, bytes32 hashDocumento, uint64 venceEl) internal {
        vm.startPrank(operadorColegio);
        registro.registrarSolicitudCredencial(
            idCredencial, TipoCredencial.CredencialColegial, keccak256("legajo-interno"), cuentaTitular
        );
        registro.validarSolicitudCredencial(idCredencial);
        registro.emitirCredencialValidada(idCredencial, hashDocumento, venceEl);
        vm.stopPrank();
    }

    function _assertEstadoVigente(bytes32 idCredencial, EstadoCredencial esperado) internal view {
        assertEq(uint8(registro.consultarEstadoVigente(idCredencial)), uint8(esperado), "estado vigente inesperado");
    }
}
