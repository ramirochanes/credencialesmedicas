// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {console2} from "forge-std/console2.sol";
import {VmSafe} from "forge-std/Vm.sol";
import {BaseScriptRegistro} from "./utilidades/BaseScriptRegistro.sol";
import {RegistroCredencialesMedicas} from "../src/RegistroCredencialesMedicas.sol";

/// @notice Despliega el registro. Uso:
///   forge script script/DesplegarRegistroCredenciales.s.sol --rpc-url polygon --broadcast
contract DesplegarRegistroCredenciales is BaseScriptRegistro {
    function run() external returns (RegistroCredencialesMedicas registro) {
        uint256 clave = _claveDespliegue();
        address desplegador = vm.addr(clave);
        address gobernanza = vm.envOr("CUENTA_GOBERNANZA", desplegador);
        address guardian = vm.envOr("CUENTA_GUARDIAN_PAUSA", desplegador);

        vm.startBroadcast(clave);
        registro = new RegistroCredencialesMedicas(gobernanza, guardian);
        vm.stopBroadcast();

        console2.log("Registro desplegado en:", address(registro));
        console2.log("Gobernanza:", gobernanza);
        console2.log("Guardian de pausa:", guardian);

        // La simulacion (sin --broadcast) no deja un despliegues/<chainId>.json falso.
        if (vm.isContext(VmSafe.ForgeContext.ScriptDryRun)) {
            console2.log("Simulacion: no se escribe despliegues/<chainId>.json");
            return registro;
        }

        string memory nodo = "despliegue";
        vm.serializeAddress(nodo, "registro", address(registro));
        vm.serializeAddress(nodo, "desplegador", desplegador);
        vm.serializeAddress(nodo, "gobernanza", gobernanza);
        vm.serializeAddress(nodo, "guardianPausa", guardian);
        vm.serializeUint(nodo, "chainId", block.chainid);
        vm.serializeUint(nodo, "bloqueReferencia", block.number);
        string memory salida = vm.serializeString(nodo, "version", registro.VERSION_REGISTRO());
        vm.writeJson(salida, _rutaRegistroDespliegue());
    }
}
