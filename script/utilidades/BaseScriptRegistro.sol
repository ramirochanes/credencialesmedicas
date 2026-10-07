// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {RegistroCredencialesMedicas} from "../../src/RegistroCredencialesMedicas.sol";

/// @notice Utilidades compartidas por los scripts: clave de despliegue desde .env y
///         dirección del registro desde despliegues/<chainId>.json (o DIRECCION_REGISTRO).
abstract contract BaseScriptRegistro is Script {
    function _claveDespliegue() internal view returns (uint256) {
        return vm.envUint("PRIVATE_KEY");
    }

    function _rutaRegistroDespliegue() internal view returns (string memory) {
        return string.concat("despliegues/", vm.toString(block.chainid), ".json");
    }

    function _registroDesplegado() internal view returns (RegistroCredencialesMedicas) {
        address direccion = vm.envOr("DIRECCION_REGISTRO", address(0));
        if (direccion == address(0)) {
            string memory json = vm.readFile(_rutaRegistroDespliegue());
            direccion = vm.parseJsonAddress(json, ".registro");
        }
        require(direccion.code.length > 0, "No hay contrato en DIRECCION_REGISTRO");
        return RegistroCredencialesMedicas(direccion);
    }

    function _indice(string memory prefijo, uint256 i, string memory campo) internal pure returns (string memory) {
        return string.concat(prefijo, "[", vm.toString(i), "]", campo);
    }
}
