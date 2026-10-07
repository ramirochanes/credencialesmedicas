# Video pitch — fuente reproducible

Genera `entregables/DIG-Grupo1-Video-pitch.mp4` (1920×1080, ~1:56) a partir del sitio real.

## Archivos

- `video.html` / `video.css`: las 7 escenas (problema, escala, solución en celular, detección en notebook, negocio, tecnología y equipo, cierre).
- `director.js`: el guion con los tiempos. Las pantallas del sitio son el sitio corriendo en iframes, no imágenes.
- `grabar-video.mjs`: graba la página cuadro por cuadro (Chromium + Playwright) y arma la lista para ffmpeg.

## Cómo regenerarlo

1. Copiar esta carpeta como `frontend/_video/` y poner en `frontend/_video/pdf/` el PDF de prueba `demo/documentos/demo-credencial-001.pdf` (como `matricula-001.pdf`) y una copia modificada (`matricula-001-modificada.pdf`, basta agregar una línea al final).
2. Servir `frontend/` con un servidor estático contra una red con las matrículas de prueba cargadas.
3. `node grabar-video.mjs` (ajustar la URL y la ruta de Chromium).
4. `ffmpeg -f concat -safe 0 -i video/lista.txt -vf "fps=30,format=yuv420p" -c:v libx264 -crf 18 salida.mp4`

## Aclaración

La versión entregada se grabó contra una copia local del sitio con las mismas 6 matrículas de prueba y los mismos estados que la red principal. La dirección del contrato que aparece en la escena de tecnología es la de la red principal de Polygon (`0x374adD49ce1101BC440b431EC24eee36a6A98565`).

`_video/` no se publica en el hosting: es solo para producir el video.
