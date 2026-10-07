// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseRegistroCredencialesTest} from "./utilidades/BaseRegistroCredencialesTest.sol";
import {
    TipoCredencial,
    EstadoCredencial,
    AccionCredencial,
    Credencial,
    DatosCredencialPreexistente,
    EventoHistorial
} from "../src/tipos/TiposCredencialMedica.sol";
import {
    IdentificadorCredencialInvalido,
    CredencialYaRegistrada,
    CredencialInexistente,
    TipoCredencialNoHabilitado,
    OperadorDeOtraInstitucion,
    TransicionNoPermitida,
    HashDocumentoInvalido,
    HashDocumentoYaAnclado,
    VencimientoInvalido,
    FechaEmisionInvalida,
    ReferenciaActoRequerida,
    CredencialNoVencida,
    CuentaSinInstitucion,
    LoteInvalido
} from "../src/errores/ErroresRegistroCredenciales.sol";

contract CicloVidaCredencialTest is BaseRegistroCredencialesTest {
    bytes32 internal constant ID_CREDENCIAL = keccak256("credencial-0001");

    // ── Camino feliz ─────────────────────────────────────────────────────

    function test_CaminoFelizSolicitudValidacionEmision() public {
        uint64 venceEl = uint64(block.timestamp + 365 days);
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, venceEl);

        (Credencial memory datos, EstadoCredencial vigente) = registro.obtenerCredencial(ID_CREDENCIAL);
        assertEq(uint8(vigente), uint8(EstadoCredencial.Activa));
        assertEq(datos.hashDocumento, HASH_DOCUMENTO_A);
        assertEq(datos.institucionEmisora, idColegio);
        assertEq(datos.cuentaTitular, cuentaTitular);
        assertEq(datos.venceEl, venceEl);
        assertFalse(datos.cargaInicial);
        assertEq(registro.buscarCredencialPorHashDocumento(HASH_DOCUMENTO_A), ID_CREDENCIAL);
        assertEq(registro.totalCredenciales(), 1);

        EventoHistorial[] memory historial = registro.obtenerHistorialCredencial(ID_CREDENCIAL);
        assertEq(historial.length, 3);
        assertEq(uint8(historial[0].accion), uint8(AccionCredencial.Solicitud));
        assertEq(uint8(historial[1].accion), uint8(AccionCredencial.Validacion));
        assertEq(uint8(historial[2].accion), uint8(AccionCredencial.Emision));
        assertEq(historial[2].operador, operadorColegio);

        bytes32[] memory delTitular = registro.obtenerCredencialesDeTitular(cuentaTitular);
        assertEq(delTitular.length, 1);
        assertEq(delTitular[0], ID_CREDENCIAL);
    }

    function test_ContrastarDocumento() public {
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, 0);
        (bool coincide, EstadoCredencial vigente) = registro.contrastarDocumento(ID_CREDENCIAL, HASH_DOCUMENTO_A);
        assertTrue(coincide);
        assertEq(uint8(vigente), uint8(EstadoCredencial.Activa));
        (coincide,) = registro.contrastarDocumento(ID_CREDENCIAL, HASH_DOCUMENTO_B);
        assertFalse(coincide, "un documento alterado no debe coincidir");
    }

    function test_CredencialInexistenteSeInformaSinRevertir() public view {
        _assertEstadoVigente(keccak256("no-existe"), EstadoCredencial.Inexistente);
    }

    // ── Validaciones de alta ─────────────────────────────────────────────

    function test_SolicitudRechazaIdNuloYDuplicado() public {
        vm.startPrank(operadorColegio);
        vm.expectRevert(IdentificadorCredencialInvalido.selector);
        registro.registrarSolicitudCredencial(bytes32(0), TipoCredencial.CredencialColegial, bytes32(0), address(0));

        registro.registrarSolicitudCredencial(ID_CREDENCIAL, TipoCredencial.CredencialColegial, bytes32(0), address(0));
        vm.expectRevert(abi.encodeWithSelector(CredencialYaRegistrada.selector, ID_CREDENCIAL));
        registro.registrarSolicitudCredencial(ID_CREDENCIAL, TipoCredencial.CredencialColegial, bytes32(0), address(0));
        vm.stopPrank();
    }

    function test_EmisorSoloEmiteTiposHabilitados() public {
        vm.prank(operadorUniversidad);
        vm.expectRevert(
            abi.encodeWithSelector(TipoCredencialNoHabilitado.selector, idUniversidad, TipoCredencial.MatriculaSanitaria)
        );
        registro.registrarSolicitudCredencial(ID_CREDENCIAL, TipoCredencial.MatriculaSanitaria, bytes32(0), address(0));
    }

    function test_PrestadorYCuentasAjenasNoEmiten() public {
        vm.prank(operadorPrestador);
        vm.expectRevert(
            abi.encodeWithSelector(TipoCredencialNoHabilitado.selector, idPrestador, TipoCredencial.CredencialColegial)
        );
        registro.registrarSolicitudCredencial(ID_CREDENCIAL, TipoCredencial.CredencialColegial, bytes32(0), address(0));

        vm.prank(cuentaAjena);
        vm.expectRevert(abi.encodeWithSelector(CuentaSinInstitucion.selector, cuentaAjena));
        registro.registrarSolicitudCredencial(ID_CREDENCIAL, TipoCredencial.CredencialColegial, bytes32(0), address(0));
    }

    function test_GobernanzaNoPuedeCambiarEstados() public {
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, 0);
        vm.prank(cuentaGobernanza);
        vm.expectRevert(abi.encodeWithSelector(CuentaSinInstitucion.selector, cuentaGobernanza));
        registro.revocarCredencial(ID_CREDENCIAL, ACTO_REVOCACION);
    }

    function test_OtraJurisdiccionNoModificaCredencialAjena() public {
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, 0);
        vm.prank(operadorColegioOtraJurisdiccion);
        vm.expectRevert(
            abi.encodeWithSelector(OperadorDeOtraInstitucion.selector, ID_CREDENCIAL, idColegioOtraJurisdiccion)
        );
        registro.suspenderCredencial(ID_CREDENCIAL, ACTO_SUSPENSION);
    }

    function test_NoSeEmiteSinValidar() public {
        vm.startPrank(operadorColegio);
        registro.registrarSolicitudCredencial(ID_CREDENCIAL, TipoCredencial.CredencialColegial, bytes32(0), address(0));
        vm.expectRevert(
            abi.encodeWithSelector(
                TransicionNoPermitida.selector, ID_CREDENCIAL, EstadoCredencial.Pendiente, AccionCredencial.Emision
            )
        );
        registro.emitirCredencialValidada(ID_CREDENCIAL, HASH_DOCUMENTO_A, 0);
        vm.stopPrank();
    }

    function test_EmisionValidaHashYVencimiento() public {
        vm.startPrank(operadorColegio);
        registro.registrarSolicitudCredencial(ID_CREDENCIAL, TipoCredencial.CredencialColegial, bytes32(0), address(0));
        registro.validarSolicitudCredencial(ID_CREDENCIAL);

        vm.expectRevert(HashDocumentoInvalido.selector);
        registro.emitirCredencialValidada(ID_CREDENCIAL, bytes32(0), 0);

        uint64 pasado = uint64(block.timestamp);
        vm.expectRevert(abi.encodeWithSelector(VencimientoInvalido.selector, pasado));
        registro.emitirCredencialValidada(ID_CREDENCIAL, HASH_DOCUMENTO_A, pasado);
        vm.stopPrank();
    }

    function test_UnDocumentoNoSePuedeAnclarDosVeces() public {
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, 0);
        bytes32 otra = keccak256("credencial-0002");
        vm.startPrank(operadorColegio);
        registro.registrarSolicitudCredencial(otra, TipoCredencial.CredencialColegial, bytes32(0), address(0));
        registro.validarSolicitudCredencial(otra);
        vm.expectRevert(abi.encodeWithSelector(HashDocumentoYaAnclado.selector, HASH_DOCUMENTO_A, ID_CREDENCIAL));
        registro.emitirCredencialValidada(otra, HASH_DOCUMENTO_A, 0);
        vm.stopPrank();
    }

    // ── Excepciones del DTE ──────────────────────────────────────────────

    function test_RechazoDesdePendienteExigeActo() public {
        vm.startPrank(operadorColegio);
        registro.registrarSolicitudCredencial(ID_CREDENCIAL, TipoCredencial.CredencialColegial, bytes32(0), address(0));
        vm.expectRevert(ReferenciaActoRequerida.selector);
        registro.rechazarSolicitudCredencial(ID_CREDENCIAL, bytes32(0));
        registro.rechazarSolicitudCredencial(ID_CREDENCIAL, keccak256("Dictamen 7/2026"));
        vm.stopPrank();
        _assertEstadoVigente(ID_CREDENCIAL, EstadoCredencial.Rechazada);
    }

    function test_SuspensionYReactivacion() public {
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, 0);
        vm.startPrank(operadorColegio);
        registro.suspenderCredencial(ID_CREDENCIAL, ACTO_SUSPENSION);
        _assertEstadoVigente(ID_CREDENCIAL, EstadoCredencial.Suspendida);
        registro.reactivarCredencial(ID_CREDENCIAL, ACTO_REACTIVACION);
        vm.stopPrank();
        _assertEstadoVigente(ID_CREDENCIAL, EstadoCredencial.Activa);

        EventoHistorial[] memory historial = registro.obtenerHistorialCredencial(ID_CREDENCIAL);
        assertEq(historial.length, 5);
        assertEq(historial[3].referenciaActo, ACTO_SUSPENSION);
        assertEq(historial[4].referenciaActo, ACTO_REACTIVACION);
    }

    function test_RevocacionDesdeActivaYDesdeSuspendidaEsFinal() public {
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, 0);
        bytes32 otra = keccak256("credencial-0002");
        _emitirCredencialColegialActiva(otra, HASH_DOCUMENTO_B, 0);

        vm.startPrank(operadorColegio);
        registro.revocarCredencial(ID_CREDENCIAL, ACTO_REVOCACION);
        registro.suspenderCredencial(otra, ACTO_SUSPENSION);
        registro.revocarCredencial(otra, ACTO_REVOCACION);

        vm.expectRevert(
            abi.encodeWithSelector(
                TransicionNoPermitida.selector, ID_CREDENCIAL, EstadoCredencial.Revocada, AccionCredencial.Reactivacion
            )
        );
        registro.reactivarCredencial(ID_CREDENCIAL, ACTO_REACTIVACION);
        vm.stopPrank();

        _assertEstadoVigente(ID_CREDENCIAL, EstadoCredencial.Revocada);
        _assertEstadoVigente(otra, EstadoCredencial.Revocada);
    }

    // ── Vencimiento automático ───────────────────────────────────────────

    function test_VencimientoAutomaticoPorFecha() public {
        uint64 venceEl = uint64(block.timestamp + 30 days);
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, venceEl);

        vm.expectRevert(abi.encodeWithSelector(CredencialNoVencida.selector, ID_CREDENCIAL));
        registro.registrarVencimientoCredencial(ID_CREDENCIAL);

        vm.warp(venceEl);
        _assertEstadoVigente(ID_CREDENCIAL, EstadoCredencial.Vencida);

        // cualquiera puede dejar asentado el vencimiento en el historial
        vm.prank(cuentaAjena);
        registro.registrarVencimientoCredencial(ID_CREDENCIAL);
        (Credencial memory datos,) = registro.obtenerCredencial(ID_CREDENCIAL);
        assertEq(uint8(datos.estado), uint8(EstadoCredencial.Vencida));
    }

    function test_SuspendidaQueVenceNoSeReactiva() public {
        uint64 venceEl = uint64(block.timestamp + 10 days);
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, venceEl);
        vm.prank(operadorColegio);
        registro.suspenderCredencial(ID_CREDENCIAL, ACTO_SUSPENSION);

        vm.warp(venceEl + 1);
        vm.prank(operadorColegio);
        vm.expectRevert(
            abi.encodeWithSelector(
                TransicionNoPermitida.selector, ID_CREDENCIAL, EstadoCredencial.Vencida, AccionCredencial.Reactivacion
            )
        );
        registro.reactivarCredencial(ID_CREDENCIAL, ACTO_REACTIVACION);
    }

    // ── Carga inicial ────────────────────────────────────────────────────

    function test_CargaInicialEnLote() public {
        DatosCredencialPreexistente[] memory lote = new DatosCredencialPreexistente[](2);
        lote[0] = DatosCredencialPreexistente({
            idCredencial: keccak256("legado-1"),
            tipo: TipoCredencial.CredencialColegial,
            referenciaInterna: keccak256("legajo-1"),
            cuentaTitular: address(0),
            hashDocumento: HASH_DOCUMENTO_A,
            emitidaEl: uint64(block.timestamp - 400 days),
            venceEl: 0
        });
        lote[1] = DatosCredencialPreexistente({
            idCredencial: keccak256("legado-2"),
            tipo: TipoCredencial.CertificadoEspecialidad,
            referenciaInterna: keccak256("legajo-2"),
            cuentaTitular: cuentaTitular,
            hashDocumento: HASH_DOCUMENTO_B,
            emitidaEl: uint64(block.timestamp - 10 days),
            venceEl: uint64(block.timestamp + 5 * 365 days)
        });

        vm.prank(operadorColegio);
        registro.emitirCredencialesPreexistentesEnLote(lote);

        (Credencial memory datos, EstadoCredencial vigente) = registro.obtenerCredencial(keccak256("legado-1"));
        assertTrue(datos.cargaInicial);
        assertEq(uint8(vigente), uint8(EstadoCredencial.Activa));
        assertEq(datos.emitidaEl, uint64(block.timestamp - 400 days));
        EventoHistorial[] memory historial = registro.obtenerHistorialCredencial(keccak256("legado-1"));
        assertEq(uint8(historial[0].accion), uint8(AccionCredencial.EmisionCargaInicial));
        assertEq(registro.totalCredenciales(), 2);
    }

    function test_CargaInicialValidaLoteYFecha() public {
        DatosCredencialPreexistente[] memory vacio = new DatosCredencialPreexistente[](0);
        vm.prank(operadorColegio);
        vm.expectRevert(abi.encodeWithSelector(LoteInvalido.selector, uint256(0)));
        registro.emitirCredencialesPreexistentesEnLote(vacio);

        DatosCredencialPreexistente[] memory lote = new DatosCredencialPreexistente[](1);
        lote[0] = DatosCredencialPreexistente({
            idCredencial: keccak256("legado-futuro"),
            tipo: TipoCredencial.CredencialColegial,
            referenciaInterna: bytes32(0),
            cuentaTitular: address(0),
            hashDocumento: HASH_DOCUMENTO_A,
            emitidaEl: uint64(block.timestamp + 1),
            venceEl: 0
        });
        vm.prank(operadorColegio);
        vm.expectRevert(abi.encodeWithSelector(FechaEmisionInvalida.selector, uint64(block.timestamp + 1)));
        registro.emitirCredencialesPreexistentesEnLote(lote);
    }

    function test_OperacionSobreCredencialInexistente() public {
        bytes32 fantasma = keccak256("fantasma");
        vm.prank(operadorColegio);
        vm.expectRevert(abi.encodeWithSelector(CredencialInexistente.selector, fantasma));
        registro.suspenderCredencial(fantasma, ACTO_SUSPENSION);
    }
}
