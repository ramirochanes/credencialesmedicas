// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {BaseRegistroCredencialesTest} from "./utilidades/BaseRegistroCredencialesTest.sol";
import {RegistroCredencialesMedicas} from "../src/RegistroCredencialesMedicas.sol";
import {TipoInstitucion, TipoCredencial, Institucion} from "../src/tipos/TiposCredencialMedica.sol";
import {
    CuentaInvalida,
    TextoInstitucionInvalido,
    TipoInstitucionInvalido,
    MascaraTiposInvalida,
    InstitucionInexistente,
    InstitucionNoHabilitada,
    CuentaYaVinculada,
    CuentaSinInstitucion
} from "../src/errores/ErroresRegistroCredenciales.sol";

contract PadronInstitucionesTest is BaseRegistroCredencialesTest {
    function test_ConstructorRechazaCuentasNulas() public {
        vm.expectRevert(abi.encodeWithSelector(CuentaInvalida.selector, address(0)));
        new RegistroCredencialesMedicas(address(0), cuentaGuardian);
        vm.expectRevert(abi.encodeWithSelector(CuentaInvalida.selector, address(0)));
        new RegistroCredencialesMedicas(cuentaGobernanza, address(0));
    }

    function test_AltaInstitucionGuardaFicha() public view {
        Institucion memory colegio = registro.obtenerInstitucion(idColegio);
        assertEq(colegio.nombre, "Colegio Medico Demo A");
        assertEq(uint8(colegio.tipo), uint8(TipoInstitucion.ColegioProfesional));
        assertEq(colegio.tiposCredencialHabilitados, BIT_COLEGIAL | BIT_ESPECIALIDAD);
        assertTrue(colegio.habilitada);
        assertEq(registro.cantidadInstituciones(), 5);
        assertEq(registro.institucionDeCuenta(operadorColegio), idColegio);
    }

    function test_SoloGobernanzaDaDeAltaInstituciones() public {
        bytes32 rolAdmin = registro.DEFAULT_ADMIN_ROLE();
        vm.prank(cuentaAjena);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, cuentaAjena, rolAdmin)
        );
        registro.altaInstitucion("Colegio Pirata", TipoInstitucion.ColegioProfesional, "X", BIT_COLEGIAL);
    }

    function test_AltaValidaTextosYTipo() public {
        vm.startPrank(cuentaGobernanza);
        vm.expectRevert(TextoInstitucionInvalido.selector);
        registro.altaInstitucion("", TipoInstitucion.ColegioProfesional, "X", BIT_COLEGIAL);

        vm.expectRevert(TipoInstitucionInvalido.selector);
        registro.altaInstitucion("Sin tipo", TipoInstitucion.NoDefinida, "X", BIT_COLEGIAL);
        vm.stopPrank();
    }

    function test_MascaraDeTiposSegunNaturaleza() public {
        vm.startPrank(cuentaGobernanza);
        // un prestador no puede emitir
        vm.expectRevert(abi.encodeWithSelector(MascaraTiposInvalida.selector, BIT_COLEGIAL));
        registro.altaInstitucion("Clinica", TipoInstitucion.PrestadorSalud, "X", BIT_COLEGIAL);
        // un emisor necesita al menos un tipo
        vm.expectRevert(abi.encodeWithSelector(MascaraTiposInvalida.selector, uint8(0)));
        registro.altaInstitucion("Colegio vacio", TipoInstitucion.ColegioProfesional, "X", 0);
        // bits fuera de rango (bit 0 = NoDefinida)
        vm.expectRevert(abi.encodeWithSelector(MascaraTiposInvalida.selector, uint8(0x01)));
        registro.altaInstitucion("Colegio raro", TipoInstitucion.ColegioProfesional, "X", 0x01);
        vm.stopPrank();
    }

    function test_ActualizarTiposDeInstitucion() public {
        vm.prank(cuentaGobernanza);
        registro.actualizarTiposCredencialInstitucion(idColegio, BIT_COLEGIAL | BIT_MATRICULA);
        assertEq(registro.obtenerInstitucion(idColegio).tiposCredencialHabilitados, BIT_COLEGIAL | BIT_MATRICULA);
    }

    function test_InstitucionInexistenteRevierte() public {
        vm.startPrank(cuentaGobernanza);
        vm.expectRevert(abi.encodeWithSelector(InstitucionInexistente.selector, uint32(99)));
        registro.actualizarHabilitacionInstitucion(99, false);
        vm.expectRevert(abi.encodeWithSelector(InstitucionInexistente.selector, uint32(99)));
        registro.vincularCuentaOperadora(cuentaAjena, 99);
        vm.stopPrank();
    }

    function test_UnaCuentaOperaParaUnaSolaInstitucion() public {
        vm.prank(cuentaGobernanza);
        vm.expectRevert(abi.encodeWithSelector(CuentaYaVinculada.selector, operadorColegio, idColegio));
        registro.vincularCuentaOperadora(operadorColegio, idUniversidad);
    }

    function test_CambioDeAutoridadesDesvinculaYVincula() public {
        address nuevaAutoridad = makeAddr("nuevaAutoridad");
        vm.startPrank(cuentaGobernanza);
        registro.desvincularCuentaOperadora(operadorColegio);
        registro.vincularCuentaOperadora(nuevaAutoridad, idColegio);
        vm.expectRevert(abi.encodeWithSelector(CuentaSinInstitucion.selector, operadorColegio));
        registro.desvincularCuentaOperadora(operadorColegio);
        vm.stopPrank();
        assertEq(registro.institucionDeCuenta(operadorColegio), 0);
        assertEq(registro.institucionDeCuenta(nuevaAutoridad), idColegio);
    }

    function test_InstitucionDeshabilitadaNoOpera() public {
        vm.prank(cuentaGobernanza);
        registro.actualizarHabilitacionInstitucion(idColegio, false);

        vm.prank(operadorColegio);
        vm.expectRevert(abi.encodeWithSelector(InstitucionNoHabilitada.selector, idColegio));
        registro.registrarSolicitudCredencial(keccak256("c1"), TipoCredencial.CredencialColegial, bytes32(0), address(0));
    }

    function test_PausaSoloGuardianYReanudaSoloGobernanza() public {
        bytes32 rolGuardian = registro.ROL_GUARDIAN_PAUSA();
        vm.prank(cuentaAjena);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, cuentaAjena, rolGuardian)
        );
        registro.pausarRegistro();

        vm.prank(cuentaGuardian);
        registro.pausarRegistro();
        assertTrue(registro.paused());

        vm.prank(operadorColegio);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        registro.registrarSolicitudCredencial(keccak256("c1"), TipoCredencial.CredencialColegial, bytes32(0), address(0));

        bytes32 rolAdmin = registro.DEFAULT_ADMIN_ROLE();
        vm.prank(cuentaGuardian);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, cuentaGuardian, rolAdmin)
        );
        registro.reanudarRegistro();

        vm.prank(cuentaGobernanza);
        registro.reanudarRegistro();
        assertFalse(registro.paused());
    }
}
