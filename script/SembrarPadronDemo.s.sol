// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {console2} from "forge-std/console2.sol";
import {BaseScriptRegistro} from "./utilidades/BaseScriptRegistro.sol";
import {RegistroCredencialesMedicas} from "../src/RegistroCredencialesMedicas.sol";
import {TipoInstitucion} from "../src/tipos/TiposCredencialMedica.sol";

/// @notice Semilla ESTRUCTURAL: instituciones del padrón y cuentas operadoras.
///         Lee config/padron-demo.json. Todo lo que no salga de esta semilla es
///         transaccional (credenciales, verificaciones, antecedentes).
///   forge script script/SembrarPadronDemo.s.sol --rpc-url polygon --broadcast
contract SembrarPadronDemo is BaseScriptRegistro {
    string internal constant RUTA_SEMILLA = "config/padron-demo.json";

    function run() external {
        RegistroCredencialesMedicas registro = _registroDesplegado();
        uint256 clave = _claveDespliegue();
        address desplegador = vm.addr(clave);
        string memory json = vm.readFile(RUTA_SEMILLA);
        string memory claveOperadorDesplegador = vm.parseJsonString(json, ".institucionDelDesplegador");

        vm.startBroadcast(clave);
        for (uint256 i; vm.keyExistsJson(json, _indice(".instituciones", i, "")); ++i) {
            string memory claveInstitucion = vm.parseJsonString(json, _indice(".instituciones", i, ".clave"));
            uint32 id = registro.altaInstitucion(
                vm.parseJsonString(json, _indice(".instituciones", i, ".nombre")),
                TipoInstitucion(uint8(vm.parseJsonUint(json, _indice(".instituciones", i, ".tipo")))),
                vm.parseJsonString(json, _indice(".instituciones", i, ".jurisdiccion")),
                uint8(vm.parseJsonUint(json, _indice(".instituciones", i, ".tiposCredencial")))
            );
            console2.log(claveInstitucion, id);
            if (keccak256(bytes(claveInstitucion)) == keccak256(bytes(claveOperadorDesplegador))) {
                registro.vincularCuentaOperadora(desplegador, id);
            }
        }
        vm.stopBroadcast();
    }
}
