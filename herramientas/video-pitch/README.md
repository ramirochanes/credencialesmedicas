# Video pitch — fuente reproducible

Versión vigente: **v2 con voz**, `entregables/DIG-Grupo1-Video-pitch-v2-voz-final.mp4` (1920×1080, 2:38).
Publicado en YouTube: https://www.youtube.com/watch?v=qY6CjE86R5Y (embebido en la portada del sitio).

Se arma en dos pasos: primero se graba la imagen a partir del sitio real (video mudo
`DIG-Grupo1-Video-pitch-v2.mp4`) y después se le mezclan la voz y la cortina.

## Archivos

- `video.html` / `video.css`: las 10 escenas (problema, escala, cómo funciona, el colegio otorga, consulta en el celular, lo que detecta, negocio, tecnología, equipo, cierre).
- `director.js`: el guion con los tiempos. Las pantallas del sitio son el sitio corriendo en iframes, no imágenes. La escena del colegio otorga una matrícula en vivo contra una red local.
- `flujo.svg`: el diagrama de la escena «Cómo funciona».
- `pdf/`: PDF de prueba (original y modificado) para la escena de detección.
- `grabar-video.mjs`: graba la página cuadro por cuadro (Chromium + Playwright) y arma la lista para ffmpeg.
- `mezclar-voz.py`: mezcla las tomas de voz y la cortina sobre el video mudo.
- `portada/portada.html`: la portada (miniatura) del video, 1920×1080. La versión exportada está en `entregables/DIG-Grupo1-Video-portada.jpg` y en `frontend/assets/video/video-pitch-portada.jpg`.

## 1 · Grabar la imagen

1. Copiar esta carpeta como `frontend/_video/`.
2. Levantar una red local con las matrículas de prueba cargadas y servir `frontend/` con un servidor estático en `http://127.0.0.1:8080`.
3. `RUTA_CHROMIUM=/ruta/a/chrome node grabar-video.mjs` (sin la variable usa el Chromium de Playwright).
4. `ffmpeg -f concat -safe 0 -i video/lista.txt -vf "fps=30,format=yuv420p" -c:v libx264 -crf 18 DIG-Grupo1-Video-pitch-v2.mp4`

`_video/` no se publica en el hosting: es solo para producir el video.

## 2 · Mezclar la voz

Desde `entregables/`: `python3 ../herramientas/video-pitch/mezclar-voz.py`

Las tomas están en `entregables/Audios/` y el texto grabado en `entregables/DIG-Grupo1-Speech-voz-en-off.md`.

| Bloque | Toma | Entra en |
|---|---|---|
| El problema | 8 | 0:01 |
| La escala | 9 | 0:13 |
| Cómo funciona | 10 | 0:26 |
| El colegio otorga | 11 | 0:51 |
| La consulta | 19 | 1:13 |
| Lo que detecta | 12 | 1:30 |
| El negocio | 13 | 1:57 |
| La tecnología | 14 | 2:12 |
| El equipo | 15 | 2:22 |
| El cierre | 17 | 2:29 |

- Los inicios de escena se midieron cuadro por cuadro sobre el video mudo: 0, 13, 25, 50, 72, 90, 117, 130, 141 y 148 s.
- Qué dice cada toma se verificó con transcripción automática (whisper-tiny). La toma 16 es una versión descartada del cierre.
- Voz a −16 LUFS, cortina a −24 LUFS con ducking (la música baja sola cuando hay voz).
- La toma del negocio dura un segundo más que su escena: la tecnología arranca 0,4 s después de que termina.

## Música

Cortina: «Corporate Technology», de ANtarcticbreeze. Antes de publicar fuera del curso, revisar que la licencia permita el uso y si pide atribución.

## Aclaración

La imagen se grabó contra una copia local del sitio con las mismas matrículas de prueba y los mismos estados que la red principal. La dirección del contrato que aparece en la escena de tecnología es la de la red principal de Polygon (`0x374adD49ce1101BC440b431EC24eee36a6A98565`).
