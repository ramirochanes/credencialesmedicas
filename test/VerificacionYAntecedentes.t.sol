// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseRegistroCredencialesTest} from "./utilidades/BaseRegistroCredencialesTest.sol";
import {
    EstadoCredencial,
    VerificacionRegistrada,
    AntecedenteAutodeclarado
} from "../src/tipos/TiposCredencialMedica.sol";
import {
    CredencialInexistente,
    CuentaSinInstitucion,
    CuentaInvalida,
    CredencialNoOperativa,
    SoloCuentaTitular,
    DescripcionAntecedenteInvalida,
    HashDocumentoInvalido,
    AntecedenteInexistente,
    AntecedenteYaRetirado
} from "../src/errores/ErroresRegistroCredenciales.sol";

contract VerificacionYAntecedentesTest is BaseRegistroCredencialesTest {
    bytes32 internal constant ID_CREDENCIAL = keccak256("credencial-0001");

    function setUp() public override {
        super.setUp();
        _emitirCredencialColegialActiva(ID_CREDENCIAL, HASH_DOCUMENTO_A, 0);
    }

    // ── Verificación institucional ───────────────────────────────────────

    function test_PrestadorRegistraVerificacion() public {
        vm.prank(operadorPrestador);
        EstadoCredencial observado = registro.registrarVerificacionInstitucional(ID_CREDENCIAL);
        assertEq(uint8(observado), uint8(EstadoCredencial.Activa));

        assertEq(registro.cantidadVerificacionesCredencial(ID_CREDENCIAL), 1);
        VerificacionRegistrada[] memory pagina = registro.obtenerVerificacionesCredencial(ID_CREDENCIAL, 0, 10);
        assertEq(pagina.length, 1);
        assertEq(pagina[0].institucionVerificadora, idPrestador);
        assertEq(pagina[0].operador, operadorPrestador);
    }

    function test_ValidacionCruzadaEntreJurisdicciones() public {
        vm.prank(operadorColegio);
        registro.suspenderCredencial(ID_CREDENCIAL, ACTO_SUSPENSION);

        // un colegio de otra jurisdicción también puede dejar constancia de su verificación
        vm.prank(operadorColegioOtraJurisdiccion);
        EstadoCredencial observado = registro.registrarVerificacionInstitucional(ID_CREDENCIAL);
        assertEq(uint8(observado), uint8(EstadoCredencial.Suspendida));
    }

    function test_VerificacionRequiereInstitucionYCredencial() public {
        vm.prank(cuentaAjena);
        vm.expectRevert(abi.encodeWithSelector(CuentaSinInstitucion.selector, cuentaAjena));
        registro.registrarVerificacionInstitucional(ID_CREDENCIAL);

        bytes32 fantasma = keccak256("fantasma");
        vm.prank(operadorPrestador);
        vm.expectRevert(abi.encodeWithSelector(CredencialInexistente.selector, fantasma));
        registro.registrarVerificacionInstitucional(fantasma);
    }

    function test_PaginadoDeVerificaciones() public {
        for (uint256 i; i < 5; ++i) {
            vm.prank(operadorPrestador);
            registro.registrarVerificacionInstitucional(ID_CREDENCIAL);
        }
        assertEq(registro.obtenerVerificacionesCredencial(ID_CREDENCIAL, 3, 10).length, 2);
        assertEq(registro.obtenerVerificacionesCredencial(ID_CREDENCIAL, 5, 10).length, 0);
        assertEq(registro.obtenerVerificacionesCredencial(ID_CREDENCIAL, 0, 0).length, 0);
    }

    // ── Antecedentes autodeclarados ──────────────────────────────────────

    function test_TitularDeclaraYRetiraAntecedente() public {
        vm.startPrank(cuentaTitular);
        registro.declararAntecedenteProfesional(
            ID_CREDENCIAL, keccak256("certificado-curso.pdf"), "Curso de ecografia clinica (120 h)"
        );
        registro.retirarAntecedenteProfesional(ID_CREDENCIAL, 0);
        vm.expectRevert(abi.encodeWithSelector(AntecedenteYaRetirado.selector, ID_CREDENCIAL, uint256(0)));
        registro.retirarAntecedenteProfesional(ID_CREDENCIAL, 0);
        vm.expectRevert(abi.encodeWithSelector(AntecedenteInexistente.selector, ID_CREDENCIAL, uint256(1)));
        registro.retirarAntecedenteProfesional(ID_CREDENCIAL, 1);
        vm.stopPrank();

        AntecedenteAutodeclarado[] memory antecedentes = registro.obtenerAntecedentesCredencial(ID_CREDENCIAL);
        assertEq(antecedentes.length, 1);
        assertTrue(antecedentes[0].retirado);
    }

    function test_SoloElTitularDeclara() public {
        vm.prank(operadorColegio);
        vm.expectRevert(abi.encodeWithSelector(SoloCuentaTitular.selector, ID_CREDENCIAL));
        registro.declararAntecedenteProfesional(ID_CREDENCIAL, keccak256("x"), "Intento del emisor");
    }

    function test_AntecedenteValidaTextoYEvidencia() public {
        vm.startPrank(cuentaTitular);
        vm.expectRevert(DescripcionAntecedenteInvalida.selector);
        registro.declararAntecedenteProfesional(ID_CREDENCIAL, keccak256("x"), "");

        string memory larga = string(new bytes(141));
        vm.expectRevert(DescripcionAntecedenteInvalida.selector);
        registro.declararAntecedenteProfesional(ID_CREDENCIAL, keccak256("x"), larga);

        vm.expectRevert(HashDocumentoInvalido.selector);
        registro.declararAntecedenteProfesional(ID_CREDENCIAL, bytes32(0), "Sin evidencia");
        vm.stopPrank();
    }

    function test_SuspendidaNoAdmiteAntecedentes() public {
        vm.prank(operadorColegio);
        registro.suspenderCredencial(ID_CREDENCIAL, ACTO_SUSPENSION);
        vm.prank(cuentaTitular);
        vm.expectRevert(
            abi.encodeWithSelector(CredencialNoOperativa.selector, ID_CREDENCIAL, EstadoCredencial.Suspendida)
        );
        registro.declararAntecedenteProfesional(ID_CREDENCIAL, keccak256("x"), "Curso");
    }

    // ── Cambio de wallet del titular ─────────────────────────────────────

    function test_EmisorReasignaWalletDelTitular() public {
        address walletNueva = makeAddr("walletNueva");
        vm.prank(operadorColegio);
        registro.asignarCuentaTitular(ID_CREDENCIAL, walletNueva);

        vm.prank(cuentaTitular);
        vm.expectRevert(abi.encodeWithSelector(SoloCuentaTitular.selector, ID_CREDENCIAL));
        registro.declararAntecedenteProfesional(ID_CREDENCIAL, keccak256("x"), "Curso");

        vm.prank(walletNueva);
        registro.declararAntecedenteProfesional(ID_CREDENCIAL, keccak256("x"), "Curso");

        vm.prank(operadorColegio);
        vm.expectRevert(abi.encodeWithSelector(CuentaInvalida.selector, walletNueva));
        registro.asignarCuentaTitular(ID_CREDENCIAL, walletNueva);
    }
}
