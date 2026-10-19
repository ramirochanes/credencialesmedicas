// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {console2} from "forge-std/console2.sol";
import {BaseScriptRegistro} from "./utilidades/BaseScriptRegistro.sol";
import {RegistroCredencialesMedicas} from "../src/RegistroCredencialesMedicas.sol";
import {TipoCredencial} from "../src/tipos/TiposCredencialMedica.sol";

/// @notice Datos TRANSACCIONALES de muestra para la demo (no forman parte de la semilla).
///         Lee demo/credenciales-demo.json (generado por demo/generar_documentos_demo.py)
///         y lleva cada credencial al estado objetivo recorriendo el DTE.
///   forge script script/CargarCredencialesDemo.s.sol --rpc-url polygon --broadcast
contract CargarCredencialesDemo is BaseScriptRegistro {
    string internal constant RUTA_DATOS = "demo/credenciales-demo.json";

    function run() external {
        RegistroCredencialesMedicas registro = _registroDesplegado();
        string memory json = vm.readFile(RUTA_DATOS);
        bytes32 actoDemo = sha256(bytes("Resolucion DEMO 001/2026"));

        vm.startBroadcast(_claveDespliegue());
        for (uint256 i; vm.keyExistsJson(json, _indice(".credenciales", i, "")); ++i) {
            string memory etiqueta = vm.parseJsonString(json, _indice(".credenciales", i, ".etiqueta"));
            string memory objetivo = vm.parseJsonString(json, _indice(".credenciales", i, ".estadoObjetivo"));
            bytes32 idCredencial = keccak256(bytes(etiqueta));
            TipoCredencial tipo = TipoCredencial(uint8(vm.parseJsonUint(json, _indice(".credenciales", i, ".tipo"))));

            registro.registrarSolicitudCredencial(idCredencial, tipo, keccak256(bytes(etiqueta)), address(0));
            if (_es(objetivo, "Pendiente")) continue;
            registro.validarSolicitudCredencial(idCredencial);
            if (_es(objetivo, "Validada")) continue;
            registro.emitirCredencialValidada(
                idCredencial,
                vm.parseJsonBytes32(json, _indice(".credenciales", i, ".hashDocumento")),
                uint64(vm.parseJsonUint(json, _indice(".credenciales", i, ".venceEl")))
            );
            if (_es(objetivo, "Suspendida")) registro.suspenderCredencial(idCredencial, actoDemo);
            if (_es(objetivo, "Revocada")) registro.revocarCredencial(idCredencial, actoDemo);
            console2.log(etiqueta, vm.toString(idCredencial));
        }
        vm.stopBroadcast();
    }

    function _es(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
