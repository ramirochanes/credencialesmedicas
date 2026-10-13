#!/usr/bin/env python3
"""Mezcla la voz en off y la cortina musical sobre el video pitch v2 (sin volver a codificar la imagen).

Se corre desde la carpeta `entregables/`:

    python3 ../herramientas/video-pitch/mezclar-voz.py

Necesita ffmpeg 4.4 o posterior. Genera `DIG-Grupo1-Video-pitch-v2-voz-final.mp4`.

Cada toma de voz es un archivo de `entregables/Audios/` y entra en el segundo en que empieza su
escena. Los inicios de escena se midieron cuadro por cuadro sobre `DIG-Grupo1-Video-pitch-v2.mp4`
(0, 13, 25, 50, 72, 90, 117, 130, 141 y 148 s). Qué dice cada toma se verificó con una
transcripción automática (whisper-tiny). El audio 16 es una versión descartada del cierre y no se usa.
"""
import subprocess
import sys
from pathlib import Path

VIDEO_BASE = "DIG-Grupo1-Video-pitch-v2.mp4"
CORTINA = "ANtarcticbreeze - Corporate Technology.mp3"
SALIDA = "DIG-Grupo1-Video-pitch-v2-voz-final.mp4"
DURACION_PITCH = 158.83  # segundos, igual al video base

# (bloque del speech, archivo de la toma, segundo del video donde empieza a hablar)
TOMAS_PITCH = [
    ("El problema",     "Audios/Vivero Del Botanico 8-esv2-35p-bg-10p-music-19p.wav",   1.5),
    ("La escala",       "Audios/Vivero Del Botanico 9-esv2-50p-bg-10p-music-10p.wav",  12.9),
    ("Cómo funciona",   "Audios/Vivero Del Botanico 10-esv2-50p-bg-10p-music-10p.wav", 25.8),
    ("El colegio",      "Audios/Vivero Del Botanico 11-esv2-50p-bg-10p-music-10p.wav", 50.6),
    ("La consulta",     "Audios/Vivero Del Botanico 19-esv2-50p-bg-10p-music-10p.wav", 72.6),
    ("Lo que detecta",  "Audios/Vivero Del Botanico 12-esv2-42p-bg-10p-music-10p.wav", 90.5),
    ("El negocio",      "Audios/Vivero Del Botanico 13-esv2-50p-bg-10p-music-10p.wav", 117.3),
    ("La tecnología",   "Audios/Vivero Del Botanico 14-esv2-50p-bg-10p-music-10p.wav", 132.0),
    ("El equipo",       "Audios/Vivero Del Botanico 15-esv2-50p-bg-10p-music-10p.wav", 141.6),
    ("El cierre",       "Audios/Vivero Del Botanico 17-esv2-50p-bg-10p-music-10p.wav", 148.6),
]


def componerFiltroMezclaPitch() -> str:
    """Arma el filter_complex: cada toma sin su silencio inicial, demorada a su escena, todas
    sumadas y normalizadas a -16 LUFS; la cortina a -24 LUFS baja sola cuando hay voz (ducking)."""
    partes = []
    for i, (_, _, segundo) in enumerate(TOMAS_PITCH):
        demora_ms = int(segundo * 1000) - 100  # silenceremove deja 0,1 s antes de la voz
        partes.append(
            f"[{i + 2}:a]silenceremove=start_periods=1:start_threshold=-35dB:start_silence=0.1,"
            f"aresample=48000,adelay={demora_ms},apad=whole_dur={DURACION_PITCH}[v{i}]"
        )
    n = len(TOMAS_PITCH)
    entradas = "".join(f"[v{i}]" for i in range(n))
    partes.append(
        f"{entradas}amix=inputs={n}:duration=first:dropout_transition=0,volume={n},"
        "loudnorm=I=-16:TP=-2:LRA=11,aresample=48000,"
        "aformat=sample_fmts=fltp:channel_layouts=stereo,asplit=2[voz][lateral]"
    )
    partes.append(
        f"[1:a]atrim=0:{DURACION_PITCH},asetpts=N/SR/TB,loudnorm=I=-24:TP=-3:LRA=11,"
        "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[base]"
    )
    partes.append(
        "[base][lateral]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=700,"
        f"afade=t=in:d=1,afade=t=out:st={DURACION_PITCH - 2.5:.2f}:d=2.5[cortina]"
    )
    partes.append(
        "[voz][cortina]amix=inputs=2:duration=first:dropout_transition=0,volume=2,"
        "alimiter=limit=0.79:level=0,aformat=sample_fmts=fltp:channel_layouts=stereo[mezcla]"
    )
    return ";".join(partes)


def mezclarVozPitch() -> int:
    faltantes = [p for p in [VIDEO_BASE, CORTINA] + [t[1] for t in TOMAS_PITCH] if not Path(p).exists()]
    if faltantes:
        print("Faltan archivos (correr desde entregables/):\n  " + "\n  ".join(faltantes), file=sys.stderr)
        return 1
    comando = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", VIDEO_BASE, "-i", CORTINA]
    for _, archivo, _ in TOMAS_PITCH:
        comando += ["-i", archivo]
    comando += [
        "-filter_complex", componerFiltroMezclaPitch(),
        "-map", "0:v", "-map", "[mezcla]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
        "-t", str(DURACION_PITCH), "-movflags", "+faststart", SALIDA,
    ]
    return subprocess.call(comando)


if __name__ == "__main__":
    sys.exit(mezclarVozPitch())
