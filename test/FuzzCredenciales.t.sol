// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseRegistroCredencialesTest} from "./utilidades/BaseRegistroCredencialesTest.sol";
import {TipoInstitucion, EstadoCredencial} from "../src/tipos/TiposCredencialMedica.sol";
import {MascaraTiposInvalida} from "../src/errores/ErroresRegistroCredenciales.sol";

/// @notice Pruebas con entradas aleatorias (fuzzing) sobre las reglas más sensibles.
contract FuzzCredencialesTest is BaseRegistroCredencialesTest {
    /// @dev Para cualquier vencimiento y cualquier salto temporal, el estado vigente es
    ///      Activa antes de la fecha y Vencida desde la fecha en adelante.
    function testFuzz_EstadoVigenteRespetaVencimiento(uint32 diasHastaVencer, uint32 segundosTranscurridos) public {
        diasHastaVencer = uint32(bound(diasHastaVencer, 1, 36_500));
        uint64 venceEl = uint64(block.timestamp + uint256(diasHastaVencer) * 1 days);
        bytes32 idCredencial = keccak256(abi.encode(diasHastaVencer, segundosTranscurridos));
        _emitirCredencialColegialActiva(idCredencial, keccak256(abi.encode(idCredencial)), venceEl);

        vm.warp(block.timestamp + segundosTranscurridos);
        EstadoCredencial esperado = block.timestamp >= venceEl ? EstadoCredencial.Vencida : EstadoCredencial.Activa;
        _assertEstadoVigente(idCredencial, esperado);
    }

    /// @dev Ningún hash de documento distinto del anclado coincide.
    function testFuzz_DocumentoAlteradoNoCoincide(bytes32 hashAlterado) public {
        bytes32 idCredencial = keccak256("credencial-fuzz");
        _emitirCredencialColegialActiva(idCredencial, HASH_DOCUMENTO_A, 0);
        vm.assume(hashAlterado != HASH_DOCUMENTO_A);
        (bool coincide,) = registro.contrastarDocumento(idCredencial, hashAlterado);
        assertFalse(coincide);
    }

    /// @dev Cualquier máscara con bits fuera de 1..4 se rechaza para un emisor.
    function testFuzz_MascaraConBitsInvalidosSeRechaza(uint8 mascara) public {
        vm.assume(mascara & 0xE1 != 0);
        vm.prank(cuentaGobernanza);
        vm.expectRevert(abi.encodeWithSelector(MascaraTiposInvalida.selector, mascara));
        registro.altaInstitucion("Colegio fuzz", TipoInstitucion.ColegioProfesional, "Z", mascara);
    }
}
