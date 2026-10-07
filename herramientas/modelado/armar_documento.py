"""Arma el HTML del documento de modelado a partir de los SVG y del contenido de docs/modelado-contrato.md."""
from pathlib import Path

RAIZ = Path(__file__).parent
svg = lambda n: (RAIZ / "svg" / f"{n}.svg").read_text(encoding="utf-8")

ESTILOS = """
@page { size: A4 landscape; margin: 11mm 13mm; }
@font-face { font-family: "Source Sans 3"; src: url(fuentes/source-sans-3-latin-400-normal.woff2); font-weight: 400; }
@font-face { font-family: "Source Sans 3"; src: url(fuentes/source-sans-3-latin-600-normal.woff2); font-weight: 600; }
@font-face { font-family: "Source Sans 3"; src: url(fuentes/source-sans-3-latin-700-normal.woff2); font-weight: 700; }
@font-face { font-family: "Lora"; src: url(fuentes/lora-latin-700-normal.woff2); font-weight: 700; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Source Sans 3", Arial, sans-serif; color: #12263f; font-size: 10pt; line-height: 1.32; }
.pagina { page-break-after: always; height: 186mm; overflow: hidden; display: flex; flex-direction: column; }
.pagina:last-child { page-break-after: auto; }
.rotulo { font-size: 7.5pt; letter-spacing: .14em; text-transform: uppercase; color: #0f7c8a; font-weight: 700; }
h1 { font-family: "Lora", serif; font-size: 20pt; color: #1b365d; margin: 1mm 0 1mm; }
h2 { font-family: "Lora", serif; font-size: 14pt; color: #1b365d; margin: 0 0 2.5mm; }
h3 { font-size: 10.5pt; color: #1b365d; margin: 0 0 1.5mm; }
p { margin: 0 0 2mm; }
.bajada { color: #33465e; max-width: 255mm; }
.figura { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
.figura svg { width: 100%; height: 100%; }
.dos { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; }
table { width: 100%; border-collapse: collapse; font-size: 8.8pt; margin-bottom: 3mm; }
th, td { border-bottom: 1px solid #d6dee8; padding: 1mm 2mm; text-align: left; vertical-align: top; }
th { background: #eef3f8; font-size: 8pt; }
code { font-family: ui-monospace, Menlo, monospace; font-size: 8pt; }
.nota { font-size: 8.6pt; color: #33465e; border-left: 3px solid #0f7c8a; padding: 1.5mm 3mm; background: #f4f8fa; margin-top: 2mm; }
.alerta { border-left-color: #b42318; background: #fdf3f2; }
.pie { font-size: 7.5pt; color: #6b7a8f; margin-top: auto; padding-top: 2mm; }
"""


def pagina(contenido, numero):
    return f'<section class="pagina">{contenido}<p class="pie">DIG · Grupo 1 · Documento de modelado · página {numero}</p></section>'


p1 = f"""
<span class="rotulo">DIG · Grupo 1 · Diplomatura en Blockchain y Finanzas Digitales · UTN 2026</span>
<h1>Documento de modelado del contrato inteligente</h1>
<p class="bajada">Validación de matrículas médicas en blockchain. Metodología del Módulo 4: proceso de negocio (Eriksson–Penker), caso de uso, activo, participantes, diagrama de transición de estados (DTE), patrones de eventos y one-pager del modelado. Alcance del MVP: la matrícula, según la devolución del Mini Demo Day (clase 15).</p>
<h2>1. Proceso de negocio</h2>
<div class="figura">{svg("pescadito")}</div>
"""

p2 = f"""
<h2>2. Procedimiento: quién hace qué</h2>
<p class="bajada">Los seis pasos, por actor. La diferencia clave está en el paso 5: <b>la consulta de cualquier persona no queda registrada</b>; <b>la constancia que deja un hospital habilitado sí</b>, con la institución, la fecha y el estado que vio.</p>
<div class="figura">{svg("flujo-procedimiento")}</div>
<p class="nota alerta"><b>Punto abierto (devolución de María Eugenia):</b> hoy la lista de constancias de hospitales y clínicas se ve en la consulta pública, y eso deja ver dónde trabaja o se postula un médico. Propuesta para el MVP: mostrarla solo al médico y a las instituciones. El dato sigue en la blockchain; privacidad completa exige guardar solo una huella de la constancia (cambio de contrato).</p>
"""

p3 = """
<div class="dos">
<div>
<h2>3. Caso de uso</h2>
<p><b>Principal: identidad digital.</b> Asocia una credencial profesional verificable a un sujeto y a la institución que la otorgó, comprobable criptográficamente.</p>
<p><b>Relacionados:</b> certificación digital (huella del documento), verificación documental (huella y estado públicos) y trazabilidad (historial que nadie reescribe).</p>
<h3>¿Hace falta blockchain? (árbol de decisión, clase 40)</h3>
<table>
<tr><th>Pregunta</th><th>Respuesta</th></tr>
<tr><td>¿Base de datos distribuida?</td><td>Sí: registros en 24 jurisdicciones, ninguna dueña de las demás.</td></tr>
<tr><td>¿Varias personas jurídicas?</td><td>Sí: universidades, colegios, ministerios, prestadores.</td></tr>
<tr><td>¿Conflicto de intereses o poca confiabilidad?</td><td>Sí: sin trazabilidad interprovincial; cada una depende del sistema de la otra.</td></tr>
<tr><td>¿Sin tercero de confianza?</td><td>Sí: ningún colegio quiere que otro sea dueño del registro.</td></tr>
<tr><td>¿Reglas constantes?</td><td>Sí: el ciclo de una matrícula es el mismo en todas las jurisdicciones.</td></tr>
</table>
<p class="nota"><b>Frente a una base centralizada:</b> ya existe un registro nacional. Blockchain agrega verificar sin depender del sistema del emisor, probar que el documento no fue alterado, un historial que ninguna institución puede reescribir y la constancia de quién verificó.</p>
</div>
<div>
<h2>4. Activo</h2>
<p><b>La matrícula, como activo lógico no transferible.</b> No es un NFT: si se pudiera vender, dejaría de decir algo de su dueño (clase 35). Evolución posible: SBT (ERC-5192).</p>
<table>
<tr><th>Atributo</th><th>Descripción</th></tr>
<tr><td><code>hashDocumento</code></td><td>Huella SHA-256 del PDF otorgado.</td></tr>
<tr><td><code>referenciaInterna</code></td><td>Huella del expediente o legajo del emisor.</td></tr>
<tr><td><code>cuentaTitular</code></td><td>Cuenta del médico (opcional).</td></tr>
<tr><td><code>solicitadaEl · emitidaEl · venceEl · actualizadaEl</code></td><td>Fechas. Sin vencimiento si <code>venceEl</code> = 0.</td></tr>
<tr><td><code>institucionEmisora</code></td><td>Institución del padrón que la otorgó.</td></tr>
<tr><td><code>tipo</code></td><td>Título, matrícula del colegio, matrícula del ministerio, especialidad.</td></tr>
<tr><td><code>estado</code></td><td>Estado guardado; el vigente se recalcula por fecha.</td></tr>
<tr><td><code>cargaInicial</code></td><td>Otorgada antes de sumarse al registro.</td></tr>
</table>
<p class="nota">El identificador es aleatorio (32 bytes generados en el navegador del emisor): no deriva de ningún dato personal. Se guarda la huella del PDF completo y no la del DNI o el número de matrícula, que se podrían adivinar probando combinaciones.</p>
</div>
</div>
"""

p4 = """
<div class="dos">
<div>
<h2>5. Participantes</h2>
<table>
<tr><th>Participante</th><th>Rol en el contrato</th><th>Qué puede hacer</th></tr>
<tr><td>Colegio · universidad · ministerio</td><td>Cuenta operadora de una institución emisora</td><td>Registrar, validar, rechazar, otorgar, suspender, rehabilitar, dar de baja, asociar la cuenta del médico, carga inicial</td></tr>
<tr><td>Médico (titular)</td><td>Cuenta asociada a su matrícula</td><td>Presentar el QR, probar que es suya (código firmado, fuera de la cadena), declarar cursos propios</td></tr>
<tr><td>Hospital o clínica</td><td>Cuenta operadora de una institución del padrón</td><td>Dejar constancia de que verificó (no cambia el estado)</td></tr>
<tr><td>Cualquier persona</td><td>Ninguno (solo lectura)</td><td>Consultar por QR, código o PDF, gratis y sin registrarse</td></tr>
<tr><td>Administración del registro</td><td>Administrador (multisig en producción)</td><td>Alta e inhabilitación de instituciones y de sus cuentas; reanudar tras una pausa</td></tr>
<tr><td>Guardián</td><td>Rol de pausa</td><td>Pausa de emergencia</td></tr>
</table>
<p class="nota"><b>Separación de poderes:</b> la administración no puede cambiar el estado de ninguna matrícula. Lo impone el contrato y lo prueba un test (<code>test_GobernanzaNoPuedeCambiarEstados</code>).</p>
</div>
<div>
<h2>6. Qué va y qué no va a la cadena</h2>
<table>
<tr><th>En la blockchain</th><th>Fuera (sistema del emisor)</th></tr>
<tr><td>Huella del PDF y de la resolución que respalda cada cambio</td><td>El PDF de la matrícula y de las resoluciones</td></tr>
<tr><td>Estado, fechas, institución, cuenta que operó</td><td>Nombre, DNI, domicilio y demás datos personales</td></tr>
<tr><td>Constancias de verificación de hospitales y clínicas</td><td>Información clínica: <b>nunca</b></td></tr>
<tr><td>Cursos declarados por el médico (texto que él decide)</td><td>Certificados de esos cursos (solo su huella)</td></tr>
</table>
<h2 style="margin-top:4mm">7. Patrones de eventos (EPCIS / GS1, clase 13)</h2>
<table>
<tr><th>Evento del dominio</th><th>Patrón</th><th>Operación</th></tr>
<tr><td>Pedido, carga inicial</td><td>Orden de trabajo</td><td>CREATE</td></tr>
<tr><td>Validación, otorgamiento, suspensión, rehabilitación</td><td>Observación</td><td>OBSERVE</td></tr>
<tr><td>Constancia de verificación</td><td>Observación sin cambio de estado</td><td>LOG</td></tr>
<tr><td>Vencimiento, baja, rechazo</td><td>Desmantelamiento lógico (el registro permanece)</td><td>DELETE lógico</td></tr>
</table>
</div>
</div>
"""

p5 = f"""
<h2>8. Diagrama de transición de estados (one-pager del modelado)</h2>
<div class="figura">{svg("dte-integrado")}</div>
"""

p6 = """
<h2>9. Transiciones</h2>
<table>
<tr><th>Desde</th><th>Evento (función)</th><th>Quién</th><th>Condición</th><th>Hacia</th><th>Qué queda registrado</th></tr>
<tr><td>—</td><td><code>registrarSolicitudCredencial</code></td><td>Emisor</td><td>Institución habilitada y tipo permitido</td><td>Pendiente</td><td>id, tipo, institución, fecha, referencia</td></tr>
<tr><td>Pendiente</td><td><code>validarSolicitudCredencial</code></td><td>Emisor de origen</td><td>—</td><td>Validada</td><td>fecha, cuenta</td></tr>
<tr><td>Pendiente / Validada</td><td><code>rechazarSolicitudCredencial</code></td><td>Emisor de origen</td><td>Resolución</td><td>Rechazada</td><td>huella de la resolución</td></tr>
<tr><td>Validada</td><td><code>emitirCredencialValidada</code></td><td>Emisor de origen</td><td>Huella nueva; vencimiento futuro</td><td>Activa</td><td>huella del PDF, vencimiento</td></tr>
<tr><td>—</td><td><code>emitirCredencialesPreexistentesEnLote</code></td><td>Emisor</td><td>1 a 50 por lote</td><td>Activa</td><td>ídem, marcada como carga inicial</td></tr>
<tr><td>Activa</td><td><code>suspenderCredencial</code></td><td>Emisor de origen</td><td>Resolución</td><td>Suspendida</td><td>huella de la resolución</td></tr>
<tr><td>Suspendida</td><td><code>reactivarCredencial</code></td><td>Emisor de origen</td><td>Resolución; no vencida</td><td>Activa</td><td>huella de la resolución</td></tr>
<tr><td>Activa / Suspendida</td><td><code>revocarCredencial</code></td><td>Emisor de origen</td><td>Resolución</td><td>Revocada</td><td>huella de la resolución</td></tr>
<tr><td>Activa / Suspendida</td><td><code>registrarVencimientoCredencial</code></td><td>Cualquiera</td><td>Fecha cumplida</td><td>Vencida</td><td>fecha</td></tr>
<tr><td>Cualquiera</td><td><code>registrarVerificacionInstitucional</code></td><td>Institución del padrón</td><td>Matrícula existente</td><td>(sin cambio)</td><td>institución, fecha, estado visto</td></tr>
<tr><td>Activa</td><td><code>declararAntecedenteProfesional</code></td><td>Médico</td><td>Hasta 140 bytes; máx. 50</td><td>(sin cambio)</td><td>huella del certificado, descripción</td></tr>
</table>
<h3>Diferencias con el DTE presentado en la clase 15, y por qué</h3>
<table>
<tr><th>Agregado</th><th>Motivo</th></tr>
<tr><td>Estado Rechazada</td><td>Camino de excepción: la validación puede fallar.</td></tr>
<tr><td>Suspendida → Revocada y Suspendida → Vencida</td><td>Sin esas flechas, una matrícula suspendida quedaría trabada.</td></tr>
<tr><td>Vencimiento automático por fecha</td><td>El estado vigente se calcula en cada consulta, sin transacción.</td></tr>
<tr><td>Carga inicial en lote</td><td>Los colegios ya tienen miles de matrículas otorgadas.</td></tr>
<tr><td>Resolución obligatoria</td><td>Suspender, rehabilitar, dar de baja y rechazar exigen la huella del acto que lo respalda.</td></tr>
</table>
"""

p7 = """
<h2 style="margin-top:2mm">Resumen</h2>
<div class="dos" style="gap:5mm">
<table>
<tr><th>Proceso</th><td>Validación de matrículas médicas</td></tr>
<tr><th>Caso de uso</th><td>Identidad digital (+ certificación, verificación documental, trazabilidad)</td></tr>
<tr><th>Activo</th><td>La matrícula (lógica, no transferible)</td></tr>
<tr><th>Contrato</th><td><code>RegistroCredencialesMedicas</code> · Solidity 0.8.30 con OpenZeppelin 5.7 (control de roles y pausa) · no actualizable a propósito (clase 10)</td></tr>
<tr><th>Red</th><td>Polygon PoS, red principal · <code>0x374adD49ce1101BC440b431EC24eee36a6A98565</code> · código verificado en Sourcify</td></tr>
<tr><th>Estados</th><td>Pendiente, Validada (en trámite), Activa (vigente), Suspendida, Vencida, Revocada (dada de baja), Rechazada</td></tr>
</table>
<table>
<tr><th>Participantes</th><td>Emisores, médico, hospitales y clínicas, cualquier persona, administración, guardián</td></tr>
<tr><th>Garantías</th><td>Otorgada por entidad autorizada · documento sin alterar · estado vigente consultable · historial que nadie reescribe · quién verificó</td></tr>
<tr><th>Privacidad</th><td>Sin datos personales en la cadena · identificadores aleatorios · huellas de documentos completos · punto abierto: visibilidad de las constancias</td></tr>
<tr><th>Pruebas</th><td>49 tests (unitarios, excepciones y fuzzing): 100 % de líneas, 92,9 % de ramas</td></tr>
<tr><th>Demo</th><td>https://dasder.com/utn-dig/ · 6 matrículas de prueba en distintos estados</td></tr>
</table>
</div>
"""

paginas = [p1.replace('<h2>1. Proceso de negocio</h2>', p7 + '<h2 style="margin-top:2mm">1. Proceso de negocio</h2>'), p2, p3, p4, p5, p6]
html = (f'<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><title>Documento de modelado — DIG Grupo 1</title>'
        f'<style>{ESTILOS}</style></head><body>'
        + "".join(pagina(c, i + 1) for i, c in enumerate(paginas)) + "</body></html>")
(RAIZ / "documento-modelado.html").write_text(html, encoding="utf-8")
print("ok")
