// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ConsultasCredenciales} from "./base/ConsultasCredenciales.sol";
import {
    TipoCredencial,
    EstadoCredencial,
    AccionCredencial,
    Institucion,
    Credencial,
    DatosCredencialPreexistente,
    VerificacionRegistrada,
    AntecedenteAutodeclarado
} from "./tipos/TiposCredencialMedica.sol";
import {
    TransicionNoPermitida,
    HashDocumentoInvalido,
    FechaEmisionInvalida,
    CredencialNoVencida,
    CredencialNoOperativa,
    LoteInvalido,
    CuentaInvalida,
    DescripcionAntecedenteInvalida,
    LimiteAntecedentesAlcanzado,
    AntecedenteInexistente,
    AntecedenteYaRetirado
} from "./errores/ErroresRegistroCredenciales.sol";

/// @title RegistroCredencialesMedicas
/// @notice Capa de confianza sobre los registros existentes de universidades, colegios
///         profesionales y ministerios de salud. Ancla la huella (SHA-256) del documento
///         emitido y el ciclo de vida de la credencial; nunca datos personales.
/// @dev    Implementa el DTE presentado por el Grupo 1 (DIG — Diplomatura Blockchain UTN 2026):
///             Pendiente → Validada → Activa → {Suspendida ⇄ Activa} → Vencida | Revocada
///         Agregados sobre el DTE original, documentados en docs/modelado:
///           - Rechazada: salida de excepción de Pendiente/Validada.
///           - Suspendida → Revocada y Suspendida → Vencida.
///           - Carga inicial: migración de credenciales emitidas antes del sistema.
contract RegistroCredencialesMedicas is ConsultasCredenciales {
    string public constant VERSION_REGISTRO = "1.0.0";
    uint256 public constant LARGO_MAXIMO_DESCRIPCION_ANTECEDENTE = 140;
    uint256 public constant MAXIMO_ANTECEDENTES_POR_CREDENCIAL = 50;
    uint256 public constant MAXIMO_CREDENCIALES_POR_LOTE = 50;

    constructor(address gobernanza, address guardianPausa) ConsultasCredenciales(gobernanza, guardianPausa) {}

    // ═════════════════════════════════════════════════════════════════════
    // Emisor: solicitud → validación → emisión
    // ═════════════════════════════════════════════════════════════════════

    function registrarSolicitudCredencial(
        bytes32 idCredencial,
        TipoCredencial tipo,
        bytes32 referenciaInterna,
        address cuentaTitular
    ) external whenNotPaused {
        (uint32 idInstitucion, Institucion storage institucion) = _institucionHabilitadaDe(msg.sender);
        _exigirEmisoraDelTipo(idInstitucion, institucion, tipo);

        Credencial storage credencial =
            _crearCredencial(idCredencial, tipo, referenciaInterna, cuentaTitular, idInstitucion);
        credencial.solicitadaEl = uint64(block.timestamp);
        _anotarCambioEstado(
            idCredencial, credencial, idInstitucion, AccionCredencial.Solicitud, EstadoCredencial.Pendiente, bytes32(0)
        );
    }

    function validarSolicitudCredencial(bytes32 idCredencial) external whenNotPaused {
        (Credencial storage credencial, uint32 idInstitucion) = _credencialDeLaInstitucionOperadora(idCredencial);
        _exigirEstadoVigente(idCredencial, credencial, EstadoCredencial.Pendiente, AccionCredencial.Validacion);
        _anotarCambioEstado(
            idCredencial, credencial, idInstitucion, AccionCredencial.Validacion, EstadoCredencial.Validada, bytes32(0)
        );
    }

    function rechazarSolicitudCredencial(bytes32 idCredencial, bytes32 referenciaActo) external whenNotPaused {
        _exigirReferenciaActo(referenciaActo);
        (Credencial storage credencial, uint32 idInstitucion) = _credencialDeLaInstitucionOperadora(idCredencial);
        EstadoCredencial vigente = _estadoVigente(credencial);
        if (vigente != EstadoCredencial.Pendiente && vigente != EstadoCredencial.Validada) {
            revert TransicionNoPermitida(idCredencial, vigente, AccionCredencial.Rechazo);
        }
        _anotarCambioEstado(
            idCredencial, credencial, idInstitucion, AccionCredencial.Rechazo, EstadoCredencial.Rechazada, referenciaActo
        );
    }

    function emitirCredencialValidada(bytes32 idCredencial, bytes32 hashDocumento, uint64 venceEl)
        external
        whenNotPaused
    {
        (Credencial storage credencial, uint32 idInstitucion) = _credencialDeLaInstitucionOperadora(idCredencial);
        (, Institucion storage institucion) = _institucionHabilitadaDe(msg.sender);
        _exigirEmisoraDelTipo(idInstitucion, institucion, credencial.tipo);
        _exigirEstadoVigente(idCredencial, credencial, EstadoCredencial.Validada, AccionCredencial.Emision);

        credencial.emitidaEl = uint64(block.timestamp);
        _anclarDocumento(idCredencial, credencial, hashDocumento, venceEl);
        _anotarCambioEstado(
            idCredencial, credencial, idInstitucion, AccionCredencial.Emision, EstadoCredencial.Activa, bytes32(0)
        );
    }

    /// @notice Migra credenciales que la institución ya había emitido antes de sumarse
    ///         al registro. Quedan marcadas con `cargaInicial = true` y su historial
    ///         arranca en la acción `EmisionCargaInicial`.
    function emitirCredencialesPreexistentesEnLote(DatosCredencialPreexistente[] calldata lote)
        external
        whenNotPaused
    {
        uint256 cantidad = lote.length;
        if (cantidad == 0 || cantidad > MAXIMO_CREDENCIALES_POR_LOTE) revert LoteInvalido(cantidad);
        (uint32 idInstitucion, Institucion storage institucion) = _institucionHabilitadaDe(msg.sender);

        for (uint256 i; i < cantidad; ++i) {
            DatosCredencialPreexistente calldata datos = lote[i];
            _exigirEmisoraDelTipo(idInstitucion, institucion, datos.tipo);
            if (datos.emitidaEl == 0 || datos.emitidaEl > block.timestamp) revert FechaEmisionInvalida(datos.emitidaEl);

            Credencial storage credencial = _crearCredencial(
                datos.idCredencial, datos.tipo, datos.referenciaInterna, datos.cuentaTitular, idInstitucion
            );
            credencial.emitidaEl = datos.emitidaEl;
            credencial.cargaInicial = true;
            _anclarDocumento(datos.idCredencial, credencial, datos.hashDocumento, datos.venceEl);
            _anotarCambioEstado(
                datos.idCredencial,
                credencial,
                idInstitucion,
                AccionCredencial.EmisionCargaInicial,
                EstadoCredencial.Activa,
                bytes32(0)
            );
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // Emisor: cambios de estado posteriores a la emisión
    // ═════════════════════════════════════════════════════════════════════

    function suspenderCredencial(bytes32 idCredencial, bytes32 referenciaActo) external whenNotPaused {
        _exigirReferenciaActo(referenciaActo);
        (Credencial storage credencial, uint32 idInstitucion) = _credencialDeLaInstitucionOperadora(idCredencial);
        _exigirEstadoVigente(idCredencial, credencial, EstadoCredencial.Activa, AccionCredencial.Suspension);
        _anotarCambioEstado(
            idCredencial,
            credencial,
            idInstitucion,
            AccionCredencial.Suspension,
            EstadoCredencial.Suspendida,
            referenciaActo
        );
    }

    function reactivarCredencial(bytes32 idCredencial, bytes32 referenciaActo) external whenNotPaused {
        _exigirReferenciaActo(referenciaActo);
        (Credencial storage credencial, uint32 idInstitucion) = _credencialDeLaInstitucionOperadora(idCredencial);
        // Si venció mientras estaba suspendida, el estado vigente es Vencida y no se reactiva.
        _exigirEstadoVigente(idCredencial, credencial, EstadoCredencial.Suspendida, AccionCredencial.Reactivacion);
        _anotarCambioEstado(
            idCredencial,
            credencial,
            idInstitucion,
            AccionCredencial.Reactivacion,
            EstadoCredencial.Activa,
            referenciaActo
        );
    }

    function revocarCredencial(bytes32 idCredencial, bytes32 referenciaActo) external whenNotPaused {
        _exigirReferenciaActo(referenciaActo);
        (Credencial storage credencial, uint32 idInstitucion) = _credencialDeLaInstitucionOperadora(idCredencial);
        EstadoCredencial vigente = _estadoVigente(credencial);
        if (vigente != EstadoCredencial.Activa && vigente != EstadoCredencial.Suspendida) {
            revert TransicionNoPermitida(idCredencial, vigente, AccionCredencial.Revocacion);
        }
        _anotarCambioEstado(
            idCredencial, credencial, idInstitucion, AccionCredencial.Revocacion, EstadoCredencial.Revocada, referenciaActo
        );
    }

    /// @notice Vincula (o cambia) la wallet del titular, por ejemplo si perdió la anterior.
    function asignarCuentaTitular(bytes32 idCredencial, address cuentaTitular) external whenNotPaused {
        if (cuentaTitular == address(0)) revert CuentaInvalida(cuentaTitular);
        (Credencial storage credencial,) = _credencialDeLaInstitucionOperadora(idCredencial);
        EstadoCredencial vigente = _estadoVigente(credencial);
        if (
            vigente == EstadoCredencial.Vencida || vigente == EstadoCredencial.Revocada
                || vigente == EstadoCredencial.Rechazada
        ) revert CredencialNoOperativa(idCredencial, vigente);
        if (credencial.cuentaTitular == cuentaTitular) revert CuentaInvalida(cuentaTitular);
        _asociarTitular(idCredencial, credencial, cuentaTitular);
    }

    // ═════════════════════════════════════════════════════════════════════
    // Vencimiento: cualquier cuenta puede dejarlo asentado una vez cumplida la fecha
    // ═════════════════════════════════════════════════════════════════════

    function registrarVencimientoCredencial(bytes32 idCredencial) external whenNotPaused {
        Credencial storage credencial = _credencialExistente(idCredencial);
        EstadoCredencial persistido = credencial.estado;
        bool vigenteConFecha = persistido == EstadoCredencial.Activa || persistido == EstadoCredencial.Suspendida;
        if (!vigenteConFecha || credencial.venceEl == 0 || block.timestamp < credencial.venceEl) {
            revert CredencialNoVencida(idCredencial);
        }
        _anotarCambioEstado(
            idCredencial,
            credencial,
            credencial.institucionEmisora,
            AccionCredencial.Vencimiento,
            EstadoCredencial.Vencida,
            bytes32(0)
        );
    }

    // ═════════════════════════════════════════════════════════════════════
    // Verificación institucional (quién consultó y cuándo)
    // ═════════════════════════════════════════════════════════════════════

    /// @notice Deja constancia on-chain de que una institución del padrón verificó la
    ///         credencial. La consulta pública sigue siendo gratuita (funciones view).
    function registrarVerificacionInstitucional(bytes32 idCredencial)
        external
        whenNotPaused
        returns (EstadoCredencial estadoObservado)
    {
        (uint32 idInstitucion,) = _institucionHabilitadaDe(msg.sender);
        Credencial storage credencial = _credencialExistente(idCredencial);
        estadoObservado = _estadoVigente(credencial);
        _verificacionesPorCredencial[idCredencial].push(
            VerificacionRegistrada({
                fecha: uint64(block.timestamp),
                institucionVerificadora: idInstitucion,
                estadoObservado: estadoObservado,
                operador: msg.sender
            })
        );
        emit VerificacionInstitucionalRegistrada(idCredencial, idInstitucion, msg.sender, estadoObservado);
    }

    // ═════════════════════════════════════════════════════════════════════
    // Titular: antecedentes autodeclarados (segunda capa, no certificada)
    // ═════════════════════════════════════════════════════════════════════

    function declararAntecedenteProfesional(bytes32 idCredencial, bytes32 hashEvidencia, string calldata descripcion)
        external
        whenNotPaused
    {
        Credencial storage credencial = _credencialDelTitular(idCredencial);
        EstadoCredencial vigente = _estadoVigente(credencial);
        if (vigente != EstadoCredencial.Activa) revert CredencialNoOperativa(idCredencial, vigente);
        uint256 largo = bytes(descripcion).length;
        if (largo == 0 || largo > LARGO_MAXIMO_DESCRIPCION_ANTECEDENTE) revert DescripcionAntecedenteInvalida();
        if (hashEvidencia == bytes32(0)) revert HashDocumentoInvalido();

        AntecedenteAutodeclarado[] storage antecedentes = _antecedentesPorCredencial[idCredencial];
        if (antecedentes.length >= MAXIMO_ANTECEDENTES_POR_CREDENCIAL) revert LimiteAntecedentesAlcanzado(idCredencial);
        antecedentes.push(
            AntecedenteAutodeclarado({
                hashEvidencia: hashEvidencia,
                declaradoEl: uint64(block.timestamp),
                retirado: false,
                descripcion: descripcion
            })
        );
        emit AntecedenteProfesionalDeclarado(idCredencial, antecedentes.length - 1, hashEvidencia);
    }

    function retirarAntecedenteProfesional(bytes32 idCredencial, uint256 indice) external whenNotPaused {
        _credencialDelTitular(idCredencial);
        AntecedenteAutodeclarado[] storage antecedentes = _antecedentesPorCredencial[idCredencial];
        if (indice >= antecedentes.length) revert AntecedenteInexistente(idCredencial, indice);
        if (antecedentes[indice].retirado) revert AntecedenteYaRetirado(idCredencial, indice);
        antecedentes[indice].retirado = true;
        emit AntecedenteProfesionalRetirado(idCredencial, indice);
    }
}
