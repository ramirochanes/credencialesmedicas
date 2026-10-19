// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseScriptRegistro} from "./utilidades/BaseScriptRegistro.sol";

/// @notice Vincula una wallet (por ejemplo la MetaMask de un integrante) a una institución.
///   CUENTA_OPERADORA=0x... ID_INSTITUCION=2 forge script script/VincularCuentaOperadora.s.sol --rpc-url polygon --broadcast
contract VincularCuentaOperadora is BaseScriptRegistro {
    function run() external {
        address cuenta = vm.envAddress("CUENTA_OPERADORA");
        uint32 idInstitucion = uint32(vm.envUint("ID_INSTITUCION"));
        vm.startBroadcast(_claveDespliegue());
        _registroDesplegado().vincularCuentaOperadora(cuenta, idInstitucion);
        vm.stopBroadcast();
    }
}
