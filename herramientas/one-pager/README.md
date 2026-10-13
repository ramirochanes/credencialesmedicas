# One pager — fuente

Genera `entregables/DIG-Grupo1-One-pager.pdf` (A4, una página).

- `one-pager.html`: el contenido y el estilo (mismas fuentes y colores que el sitio y el video).
- `qr-sitio.svg`: QR a https://dasder.com/utn-dig/ (generado con `segno`).

Para regenerar el PDF: abrir `one-pager.html` en Chrome → Imprimir → Guardar como PDF, tamaño A4, márgenes «Ninguno» y «Gráficos de fondo» activado. O con Playwright: `page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true })`.

Los datos salen del Canvas y precio, el speech del video y el README; si cambian, actualizar acá también.
