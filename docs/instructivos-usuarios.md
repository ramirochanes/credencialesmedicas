# Instructivos para usuarios

Base para armar los instructivos de usuario final, uno por perfil. Todas las pantallas tienen el menú arriba: Verificar · Instituciones emisoras · Profesionales · Verificadores · Gobernanza.

---

## A. Verificar una credencial (público, sin registrarse)

**Con el QR:** escanealo con la cámara del teléfono. Se abre la página de resultado.

**Con el identificador o el link:** en Inicio, pegalo en el buscador y tocá **Verificar**.

**Con el PDF:** en Inicio, arrastrá el archivo a «Verificar un PDF». El archivo **no se sube**: se calcula su huella en tu equipo.

**Cómo leer el resultado:**

| Estado | Significa |
|---|---|
| Activa | Emitida por una institución autorizada y vigente. |
| Suspendida | Suspendida transitoriamente por la institución emisora. |
| Vencida | Superó su fecha de vencimiento. |
| Revocada | Dada de baja por la institución. No es válida. |
| Pendiente / Validada | En trámite: todavía no fue emitida. |
| Rechazada | La solicitud no fue aprobada. |
| No registrada | No existe en el registro. |

En «Contrastar el documento» podés subir el PDF que te presentaron: si dice **El documento NO coincide**, el archivo fue alterado o es de otra credencial.

**¿Quien me muestra la credencial es su titular?** El QR y el PDF se pueden copiar. Si la credencial tiene una wallet de titular vinculada, pedile una **prueba de titularidad**:

1. En el resultado, sección «Prueba de titularidad», tocá **Generar código**. Aparece un código de 6 dígitos.
2. Dictáselo o mostráselo al profesional. Él lo firma con su wallet (no cuesta nada ni queda registrado) y te muestra un QR de respuesta.
3. Escaneá ese QR con el **mismo teléfono** en el que generaste el código (o pegá el link en «Comprobar»).

| Resultado | Qué hacer |
|---|---|
| Titularidad comprobada | Firmó tu código la wallet del titular. |
| Firma válida del titular. Confirmá el código: … | La firma es buena, pero el código no se generó en este dispositivo. Confirmá que es el que le pediste; si no, pedí uno nuevo. |
| La firma NO es del titular | Quien presenta la credencial no controla la wallet vinculada. |
| Prueba vencida | Se firmó hace más de 10 minutos. Generá un código nuevo. |

Si la credencial no tiene wallet vinculada, verificá la identidad con el DNI.

---

## B. Institución emisora (universidad, colegio, ministerio)

**Antes de empezar:**

- Instalar MetaMask.
- Pedirle a la gobernanza que vincule la wallet de la institución.
- Tener POL de prueba para el gas.

1. Entrá a **Instituciones emisoras** → **Conectar billetera**. Tiene que aparecer «Opera para: <tu institución>».
2. **Nueva solicitud:** elegí el tipo de credencial. Opcionalmente, cargá la referencia interna (expediente) y la wallet del profesional. Tocá **Registrar solicitud** y confirmá en MetaMask. Guardá el identificador que aparece.
3. **Gestionar credencial:** pegá el identificador y tocá **Cargar**. Solo se muestran las acciones que permite el estado actual:
   - **Validar requisitos** (desde Pendiente).
   - **Emitir y activar** (desde Validada): elegí el **PDF final** de la credencial y, si corresponde, la fecha de vencimiento. Después de emitir, aparece la **credencial digital con QR**: descargala y entregásela al profesional junto con el PDF.
   - **Suspender / Reactivar / Revocar / Rechazar:** indicá el acto administrativo (número de resolución o PDF del acto). Revocar y rechazar piden confirmación porque son **irreversibles**.
   - **Vincular wallet del titular:** si el profesional da su wallet después, o la perdió.
4. **Credenciales de mi institución:** listado reconstruido desde la blockchain. Tocá **Actualizar listado** y después **Gestionar** en la credencial que necesites.
5. **Carga inicial:** para matrículas emitidas antes de usar el sistema. Elegí hasta 50 PDF, el tipo y la fecha de emisión original. Al terminar, **descargá el CSV**: relaciona cada archivo con su identificador.

> Importante: el PDF que se ancla tiene que ser **exactamente** el que se entrega. Cualquier cambio posterior (otra firma, otra impresión) cambia la huella.

---

## C. Profesional (titular)

1. Pedile a tu institución que vincule tu wallet a tu credencial.
2. Entrá a **Profesionales** → **Conectar billetera**. Vas a ver tus credenciales con su QR.
3. **Presentar la credencial:** mostrá el QR o tocá **Descargar QR** para guardarlo.
4. **Probar que sos el titular:** cuando un verificador te pase un código de 6 dígitos, cargalo en **Probar que soy el titular** y tocá **Firmar con mi wallet**. MetaMask te muestra el mensaje: firmalo (no mueve fondos ni cuesta gas). Mostrale el QR de respuesta al verificador o mandale el link.
5. **Declarar un antecedente:** escribí una descripción breve (máximo 140 caracteres) y adjuntá el certificado en PDF (se publica solo su huella). Queda marcado como **autodeclarado**. No incluyas datos de salud ni de terceros. Podés **retirarlo** después, pero el registro histórico permanece.

---

## D. Verificador institucional (hospital, clínica, colegio de otra jurisdicción)

1. La gobernanza vincula la wallet de tu institución.
2. Entrá a **Verificadores** → **Conectar billetera**.
3. Pegá el identificador o el link del QR → **Consultar**.
4. Si la credencial tiene wallet de titular, usá **Prueba de titularidad** para confirmar que quien la presenta es el profesional (ver sección A).
5. Tocá **Registrar verificación on-chain**: queda constancia de que tu institución verificó, cuándo y con qué estado. Sirve como evidencia ante auditorías, por ejemplo antes de asignar guardias.

---

## E. Gobernanza del registro

1. Entrá a **Gobernanza** → **Conectar billetera** (wallet con rol de gobernanza).
2. **Alta de institución:** nombre, naturaleza, jurisdicción y tipos de credencial que puede emitir. Los prestadores de salud solo verifican.
3. **Cuentas operadoras:** vincular o desvincular wallets. Ante un cambio de autoridades, desvinculá la cuenta saliente y vinculá la nueva.
4. **Deshabilitar** una institución bloquea a sus cuentas. Las credenciales que ya emitió siguen siendo verificables.
5. **Pausa de emergencia:** la activa el guardián ante un incidente y solo la gobernanza la levanta.

---

## Preguntas frecuentes

- **¿Cuesta verificar?** No. Las consultas son gratuitas y no requieren billetera.
- **¿Dónde están mis datos personales?** En el sistema de la institución emisora, nunca en la blockchain.
- **Algo falló, ¿qué hago?** Abrí «Diagnóstico» en el pie de página, tocá **Descargar JSON** y mandalo al equipo.
