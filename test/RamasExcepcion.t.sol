// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseRegistroCredencialesTest} from "./utilidades/BaseRegistroCredencialesTest.sol";
import {TipoCredencial, TipoInstitucion, EstadoCredencial, AccionCredencial} from "../src/tipos/TiposCredencialMedica.sol";
import {
    TransicionNoPermitida,
    CredencialNoOperativa,
    CredencialNoVencida,
    LimiteAntecedentesAlcanzado,
    TextoInstitucionInvalido,
    MascaraTiposInvalida
} from "../src/errores/ErroresRegistroCredenciales.sol";

/// @notice Caminos de excepción que completan la cobertura de ramas del DTE.
contract RamasExcepcionTest is BaseRegistroCredencialesTest {
    bytes32 internal constant ID_CREDENCIAL = keccak256("credencial-ramas");

    function test_RechazoDesdeValidadaYNoDesdeActiva() public {
        vm.startPrank(operadorColegio);
        registro.registrarSolicitudCredencial(ID_CREDENCIAL, TipoCredencial.CredencialColegial, bytes32(0), address(0));
        registro.validarSolicitudCredencial(ID_CREDENCIAL);
        registro.rechazarSolicitudCredencial(ID_CREDENCIAL, keccak256("Dictamen"));
        vm.stopPrank();
        _assertEstadoVigente(ID_CREDENCIAL, EstadoCredencial.Rechazada);

        bytes32 activa = keccak256("activa");
        _emitirCredencialColegialActiva(activa, HASH_DOCUMENTO_A, 0);
        vm.prank(operadorColegio);
        vm.expectRevert(
            abi.encodeWithSelector(TransicionNoPermitida.selector, activa, EstadoCredencial.Activa, AccionCredencial.Rechazo)
        );
        registro.rechazarSolicitudCredencial(activa, keccak256("Dictamen"));
    }

    function test_NoSeRevocaUnaSolicitudPendiente() public {
        vm.startPrank(operadorColegio);
        registro.registrarSolicitudCredencial(ID_CREDENCIAL, TipoCredencial.CredencialColegial, bytes32(0), address(0));
        vm.expectRevert(
            abi.encodeWithSelector(
                TransicionNoPermitida.selector, ID_CREDENCIAL, EstadoCredencial.Pendiente, AccionCredencial.Revocacion
            )
        );
        registro.revocarCredencial(ID_CREDENCIAL, ACTO_REVOCACION);
        vm.stopPrank();
    }

    function test_NoSeAsignaWalletAUnaCredencialRevocada() public {
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, 0);
        vm.startPrank(operadorColegio);
        registro.revocarCredencial(ID_CREDENCIAL, ACTO_REVOCACION);
        vm.expectRevert(abi.encodeWithSelector(CredencialNoOperativa.selector, ID_CREDENCIAL, EstadoCredencial.Revocada));
        registro.asignarCuentaTitular(ID_CREDENCIAL, makeAddr("otraWallet"));
        vm.stopPrank();
    }

    function test_SinVencimientoNuncaVence() public {
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, 0);
        vm.warp(block.timestamp + 100 * 365 days);
        _assertEstadoVigente(ID_CREDENCIAL, EstadoCredencial.Activa);
        vm.expectRevert(abi.encodeWithSelector(CredencialNoVencida.selector, ID_CREDENCIAL));
        registro.registrarVencimientoCredencial(ID_CREDENCIAL);
    }

    function test_VencimientoYaAsentadoNoSeRepite() public {
        uint64 venceEl = uint64(block.timestamp + 1 days);
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, venceEl);
        vm.warp(venceEl);
        registro.registrarVencimientoCredencial(ID_CREDENCIAL);
        vm.expectRevert(abi.encodeWithSelector(CredencialNoVencida.selector, ID_CREDENCIAL));
        registro.registrarVencimientoCredencial(ID_CREDENCIAL);
    }

    function test_LimiteDeAntecedentesPorCredencial() public {
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, 0);
        uint256 maximo = registro.MAXIMO_ANTECEDENTES_POR_CREDENCIAL();
        vm.startPrank(cuentaTitular);
        for (uint256 i; i < maximo; ++i) {
            registro.declararAntecedenteProfesional(ID_CREDENCIAL, keccak256(abi.encode(i)), "Curso");
        }
        vm.expectRevert(abi.encodeWithSelector(LimiteAntecedentesAlcanzado.selector, ID_CREDENCIAL));
        registro.declararAntecedenteProfesional(ID_CREDENCIAL, keccak256("extra"), "Curso");
        vm.stopPrank();
    }

    function test_TextosDeInstitucionDemasiadoLargos() public {
        string memory largo = string(new bytes(121));
        vm.startPrank(cuentaGobernanza);
        vm.expectRevert(TextoInstitucionInvalido.selector);
        registro.altaInstitucion(largo, TipoInstitucion.ColegioProfesional, "X", BIT_COLEGIAL);
        vm.expectRevert(TextoInstitucionInvalido.selector);
        registro.altaInstitucion("Colegio", TipoInstitucion.ColegioProfesional, largo, BIT_COLEGIAL);
        vm.expectRevert(abi.encodeWithSelector(MascaraTiposInvalida.selector, BIT_COLEGIAL));
        registro.actualizarTiposCredencialInstitucion(idPrestador, BIT_COLEGIAL);
        vm.stopPrank();
    }
}
