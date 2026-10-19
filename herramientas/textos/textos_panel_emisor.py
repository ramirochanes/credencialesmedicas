"""Reemplazos de textos del panel del emisor: lenguaje llano, sin jerga (matrícula, pedido, cuenta)."""
import pathlib, sys

raiz = pathlib.Path(sys.argv[1])
C = {
 "assets/js/paginas/emisor/formulario-solicitud.js": [
  ('"Paso 1 del ciclo de vida. Se genera un identificador aleatorio que no contiene datos del profesional."',
   '"Primer paso: cargar el pedido del médico. El sistema le asigna un código aleatorio que no contiene sus datos."'),
  ('texto: "Tipo de credencial" }', 'texto: "Qué se otorga" }'),
  ('texto: "Referencia interna (opcional)" }', 'texto: "Número de expediente (opcional)" }'),
  ('"Número de expediente o legajo de tu sistema. Se guarda solo su huella. No uses DNI ni nombre."',
   '"El de tu sistema interno. Solo se guarda una huella que no permite leerlo. No pongas DNI ni nombre."'),
  ('texto: "Wallet del profesional (opcional)" }', 'texto: "Cuenta del médico (opcional)" }'),
  ('placeholder: "0x… (opcional)"', 'placeholder: "Número de cuenta 0x… (opcional)"'),
  ('"Le permite ver sus credenciales y declarar antecedentes. Se puede asignar después."',
   '"Le permite ver sus matrículas y demostrar que son suyas. Se puede agregar después."'),
  ('texto: "Registrar solicitud" }', 'texto: "Cargar pedido" }'),
  ('mensajeExito: "Solicitud registrada."', 'mensajeExito: "Pedido cargado."'),
  ('texto: "Solicitud registrada (Pendiente)."', 'texto: "Pedido cargado (Pendiente)."'),
  ('["Identificador: ", crearValorCopiable(idCredencial, "Copiar identificador")]', '["Código: ", crearValorCopiable(idCredencial, "Copiar código")]'),
  ('texto: "Continuar con la validación"', 'texto: "Seguir: revisar los papeles"'),
 ],
 "assets/js/paginas/emisor/gestion-credencial.js": [
  ('titulo: "PDF de la credencial emitida"', 'titulo: "PDF de la matrícula"'),
  ('titulo: "Emitir y activar",', 'titulo: "Otorgar la matrícula",'),
  ('"Se ancla la huella SHA-256 del PDF final que se entrega al profesional. El archivo no sale de tu computadora."',
   '"Elegí el PDF que se le entrega al médico. Se guarda solo su huella: el archivo no sale de tu computadora."'),
  ('"Vacío = sin vencimiento. Al llegar la fecha, la credencial pasa sola a Vencida."', '"Si lo dejás vacío, no vence. Al llegar la fecha, pasa sola a Vencida."'),
  ('textoBoton: "Emitir credencial"', 'textoBoton: "Otorgar matrícula"'),
  ('mensajeExito: "Credencial emitida y activa."', 'mensajeExito: "Matrícula otorgada: ya está vigente."'),
  ('"Elegí el PDF de la credencial."', '"Elegí el PDF de la matrícula."'),
  ('titulo: "Vincular wallet del titular"', 'titulo: "Asociar la cuenta del médico"'),
  ('"Por ejemplo, si el profesional perdió el acceso a su wallet anterior."', '"Por ejemplo, si el médico cambió de cuenta."'),
  ('texto: "Dirección de la wallet" }', 'texto: "Número de cuenta (0x…)" }'),
  ('textoBoton: "Vincular wallet"', 'textoBoton: "Asociar cuenta"'),
  ('mensajeExito: "Wallet del titular vinculada."', 'mensajeExito: "Cuenta del médico asociada."'),
  ('"La dirección de la wallet no es válida."', '"El número de cuenta no es válido."'),
  ('titulo: "Rechazar solicitud", descripcion: "Camino de excepción: la solicitud no cumple los requisitos."',
   'titulo: "Rechazar el pedido", descripcion: "Si la documentación no cumple los requisitos."'),
  ('mensajeExito: "Solicitud rechazada."', 'mensajeExito: "Pedido rechazado."'),
  ('confirmacion: { titulo: "¿Rechazar la solicitud?", texto: "Rechazada es un estado final: no se puede deshacer.", textoConfirmar: "Rechazar" }',
   'confirmacion: { titulo: "¿Rechazar el pedido?", texto: "Un pedido rechazado no se puede reabrir.", textoConfirmar: "Rechazar" }'),
  ('titulo: "Revocar", descripcion: "Baja permanente de la credencial: no se puede reactivar.", textoBoton: "Revocar credencial"',
   'titulo: "Dar de baja", descripcion: "Baja permanente: no se puede volver a habilitar.", textoBoton: "Dar de baja"'),
  ('mensajeExito: "Credencial revocada."', 'mensajeExito: "Matrícula dada de baja."'),
  ('confirmacion: { titulo: "¿Revocar la credencial?", texto: "La revocación es irreversible y queda registrada para siempre.", textoConfirmar: "Revocar" }',
   'confirmacion: { titulo: "¿Dar de baja la matrícula?", texto: "No se puede deshacer y queda registrado para siempre.", textoConfirmar: "Dar de baja" }'),
  ('titulo: "Validar requisitos", descripcion: "Confirmás que la documentación del profesional fue revisada."',
   'titulo: "Revisión de papeles", descripcion: "Confirmás que revisaste la documentación del médico."'),
  ('textoBoton: "Marcar como validada", metodo: "validarSolicitudCredencial", mensajeExito: "Solicitud validada."',
   'textoBoton: "Papeles revisados", metodo: "validarSolicitudCredencial", mensajeExito: "Papeles revisados."'),
  ('titulo: "Suspender", descripcion: "Suspensión transitoria (por ejemplo, sanción o falta de pago)."',
   'titulo: "Suspender", descripcion: "Por un tiempo (por ejemplo, una sanción)."'),
  ('textoBoton: "Suspender credencial", metodo: "suspenderCredencial", mensajeExito: "Credencial suspendida."',
   'textoBoton: "Suspender matrícula", metodo: "suspenderCredencial", mensajeExito: "Matrícula suspendida."'),
  ('titulo: "Reactivar", descripcion: "Vuelve a estado Activa.", textoBoton: "Reactivar credencial"',
   'titulo: "Volver a habilitar", descripcion: "Vuelve a estar vigente.", textoBoton: "Volver a habilitar"'),
  ('mensajeExito: "Credencial reactivada."', 'mensajeExito: "Matrícula habilitada de nuevo."'),
  ('"La credencial ya está vencida por fecha. Esto lo deja registrado en el historial."', '"Ya venció por fecha. Esto lo deja anotado en el historial."'),
  ('placeholder: "0x… o link de verificación"', 'placeholder: "Código o link de la matrícula"'),
  ('"Identificador inválido", "Pegá el identificador (0x + 64 caracteres) o el link de verificación."',
   '"No reconocemos ese código", "Pegá el código o el link completo de la matrícula."'),
  ('texto: "Acciones disponibles"', 'texto: "Qué podés hacer ahora"'),
  ('"Estado final: no admite más cambios." : "Esta credencial la emitió otra institución: solo podés consultarla."',
   '"No admite más cambios." : "Esta matrícula la otorgó otra institución: solo podés consultarla."'),
  ('"No se pudo cargar la credencial"', '"No se pudo cargar la matrícula"'),
  ('texto: "Identificador de la credencial" }', 'texto: "Código de la matrícula" }'),
  ('texto: "Cargar" })]', 'texto: "Buscar" })]'),
 ],
 "assets/js/paginas/pagina-emisor.js": [
  ('titulo: "Nueva solicitud"', 'titulo: "Cargar pedido"'),
  ('titulo: "Gestionar credencial"', 'titulo: "Gestionar una matrícula"'),
  ('titulo: "Credenciales de mi institución"', 'titulo: "Matrículas de mi institución"'),
  ('titulo: "Carga inicial"', 'titulo: "Matrículas anteriores"'),
 ],
 "assets/js/componentes/campo-referencia-acto.js": [
  ('"Escribí la referencia o adjuntá el PDF del acto. En la blockchain solo queda su huella."',
   '"Escribí el número de la resolución o adjuntá su PDF. En la blockchain solo queda una huella."'),
  ('texto: "PDF del acto (opcional, reemplaza al texto):"', 'texto: "PDF de la resolución (opcional, reemplaza al texto):"'),
 ],
}
errores = []
for archivo, pares in C.items():
    p = raiz / archivo
    t = p.read_text(encoding="utf-8")
    for viejo, nuevo in pares:
        n = t.count(viejo)
        if n != 1:
            errores.append(f"{archivo}: {n}x {viejo[:70]}")
            continue
        t = t.replace(viejo, nuevo)
    p.write_text(t, encoding="utf-8")
print("\n".join(errores) or "todo ok")
