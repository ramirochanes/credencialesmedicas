// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TipoCredencial, EstadoCredencial, AccionCredencial} from "../tipos/TiposCredencialMedica.sol";

// Errores del registro de credenciales médicas.
// Errores tipados (custom errors). El frontend los decodifica por nombre
// para mostrar mensajes claros y registrarlos en el log de diagnóstico.

// ── Padrón de instituciones ──────────────────────────────────────────────
error CuentaInvalida(address cuenta);
error TextoInstitucionInvalido();
error TipoInstitucionInvalido();
error MascaraTiposInvalida(uint8 mascara);
error InstitucionInexistente(uint32 idInstitucion);
error InstitucionNoHabilitada(uint32 idInstitucion);
error CuentaYaVinculada(address cuenta, uint32 idInstitucionActual);
error CuentaSinInstitucion(address cuenta);

// ── Credenciales ─────────────────────────────────────────────────────────
error IdentificadorCredencialInvalido();
error CredencialYaRegistrada(bytes32 idCredencial);
error CredencialInexistente(bytes32 idCredencial);
error TipoCredencialInvalido();
error TipoCredencialNoHabilitado(uint32 idInstitucion, TipoCredencial tipo);
error OperadorDeOtraInstitucion(bytes32 idCredencial, uint32 idInstitucionOperador);
error TransicionNoPermitida(bytes32 idCredencial, EstadoCredencial estadoVigente, AccionCredencial accion);
error HashDocumentoInvalido();
error HashDocumentoYaAnclado(bytes32 hashDocumento, bytes32 idCredencialExistente);
error VencimientoInvalido(uint64 venceEl);
error FechaEmisionInvalida(uint64 emitidaEl);
error ReferenciaActoRequerida();
error CredencialNoVencida(bytes32 idCredencial);
error CredencialNoOperativa(bytes32 idCredencial, EstadoCredencial estadoVigente);
error LoteInvalido(uint256 cantidad);

// ── Titular y antecedentes ───────────────────────────────────────────────
error SoloCuentaTitular(bytes32 idCredencial);
error DescripcionAntecedenteInvalida();
error LimiteAntecedentesAlcanzado(bytes32 idCredencial);
error AntecedenteInexistente(bytes32 idCredencial, uint256 indice);
error AntecedenteYaRetirado(bytes32 idCredencial, uint256 indice);
