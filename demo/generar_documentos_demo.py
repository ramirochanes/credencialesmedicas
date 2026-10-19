"""Genera los documentos PDF de demostración y el archivo demo/credenciales-demo.json.

Los PDF son ficticios y llevan la leyenda "DOCUMENTO DE DEMOSTRACIÓN — SIN VALIDEZ".
Con rl_config.invariant = 1 la salida es byte a byte reproducible, de modo que el
SHA-256 anclado on-chain se puede recalcular en cualquier máquina:

    python3 demo/generar_documentos_demo.py
    shasum -a 256 demo/documentos/*.pdf
"""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from reportlab import rl_config
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

rl_config.invariant = 1

RAIZ = Path(__file__).resolve().parent
CARPETA_DOCUMENTOS = RAIZ / "documentos"
RUTA_SALIDA_JSON = RAIZ / "credenciales-demo.json"

AZUL = HexColor("#1B365D")
TURQUESA = HexColor("#0F7C8A")
GRIS = HexColor("#5B6B7F")
ROJO = HexColor("#B3261E")

# Vencimiento fijo antes del Demo Day (10/11/2026) para mostrar el vencimiento automático.
VENCE_ANTES_DEMO_DAY = int(datetime(2026, 11, 1, 3, 0, tzinfo=timezone.utc).timestamp())
VENCE_2028 = int(datetime(2028, 12, 31, 3, 0, tzinfo=timezone.utc).timestamp())

CREDENCIALES_DEMO = [
    # etiqueta, tipo (TipoCredencial), estadoObjetivo, profesional, numero, venceEl
    ("demo-credencial-001", 2, "Activa", "Dra. Ana Ejemplo", "DEMO-A-0001", VENCE_2028),
    ("demo-credencial-002", 2, "Suspendida", "Dr. Bruno Muestra", "DEMO-A-0002", VENCE_2028),
    ("demo-credencial-003", 2, "Revocada", "Dra. Carla Prueba", "DEMO-A-0003", 0),
    ("demo-credencial-004", 4, "Activa", "Dr. Diego Ficticio", "DEMO-ESP-0004", VENCE_ANTES_DEMO_DAY),
    ("demo-credencial-005", 2, "Validada", "Dra. Elena Simulada", "DEMO-A-0005", VENCE_2028),
    ("demo-credencial-006", 2, "Pendiente", "Dr. Franco Demo", "DEMO-A-0006", 0),
]
NOMBRE_TIPO = {2: "Credencial colegial", 4: "Certificado de especialidad (Clínica Médica)"}


def dibujar_documento(ruta: Path, profesional: str, numero: str, tipo: int, vence_el: int) -> None:
    hoja = canvas.Canvas(str(ruta), pagesize=A4)
    ancho, alto = A4
    hoja.setTitle(f"{NOMBRE_TIPO[tipo]} {numero} (DEMO)")
    hoja.setFillColor(AZUL)
    hoja.rect(0, alto - 110, ancho, 110, stroke=0, fill=1)
    hoja.setFillColor(HexColor("#FFFFFF"))
    hoja.setFont("Helvetica-Bold", 20)
    hoja.drawString(50, alto - 60, "Colegio Médico Demo A")
    hoja.setFont("Helvetica", 11)
    hoja.drawString(50, alto - 82, "Institución ficticia — Proyecto DIG, Diplomatura Blockchain UTN 2026")

    hoja.setFillColor(ROJO)
    hoja.setFont("Helvetica-Bold", 12)
    hoja.drawString(50, alto - 140, "DOCUMENTO DE DEMOSTRACIÓN — SIN VALIDEZ LEGAL")

    hoja.setFillColor(AZUL)
    hoja.setFont("Helvetica-Bold", 16)
    hoja.drawString(50, alto - 190, NOMBRE_TIPO[tipo])
    filas = [
        ("Número", numero),
        ("Profesional (ficticio)", profesional),
        ("Jurisdicción", "Jurisdicción Demo A"),
        ("Vencimiento", datetime.fromtimestamp(vence_el, tz=timezone.utc).strftime("%d/%m/%Y") if vence_el else "Sin vencimiento"),
    ]
    hoja.setFont("Helvetica", 12)
    y = alto - 230
    for etiqueta, valor in filas:
        hoja.setFillColor(GRIS)
        hoja.drawString(50, y, etiqueta)
        hoja.setFillColor(AZUL)
        hoja.drawString(230, y, valor)
        y -= 26

    hoja.setStrokeColor(TURQUESA)
    hoja.setLineWidth(2)
    hoja.line(50, y - 10, ancho - 50, y - 10)
    hoja.setFillColor(GRIS)
    hoja.setFont("Helvetica", 10)
    hoja.drawString(50, y - 34, "La huella SHA-256 de este archivo está anclada en la red Polygon.")
    hoja.drawString(50, y - 50, "Cualquier modificación del archivo cambia la huella y la verificación falla.")
    hoja.showPage()
    hoja.save()


def main() -> None:
    CARPETA_DOCUMENTOS.mkdir(parents=True, exist_ok=True)
    salida = []
    for etiqueta, tipo, estado, profesional, numero, vence_el in CREDENCIALES_DEMO:
        ruta = CARPETA_DOCUMENTOS / f"{etiqueta}.pdf"
        dibujar_documento(ruta, profesional, numero, tipo, vence_el)
        huella = hashlib.sha256(ruta.read_bytes()).hexdigest()
        salida.append({
            "etiqueta": etiqueta,
            "tipo": tipo,
            "estadoObjetivo": estado,
            "hashDocumento": "0x" + huella,
            "venceEl": vence_el,
            "archivo": f"demo/documentos/{ruta.name}",
        })
    RUTA_SALIDA_JSON.write_text(json.dumps({"credenciales": salida}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(salida, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
