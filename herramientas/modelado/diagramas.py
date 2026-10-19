"""Genera los diagramas SVG del documento de modelado (DIG Grupo 1).

Salida: flujo-procedimiento.svg, dte-integrado.svg, pescadito.svg en el directorio indicado.
"""
import sys
from pathlib import Path
from html import escape

AZUL = "#1b365d"
TURQUESA = "#0f7c8a"
TURQUESA_SUAVE = "#e3f2f3"
GRIS = "#8a99ad"
GRIS_SUAVE = "#eef3f8"
ROJO = "#b42318"
TEXTO = "#12263f"
FUENTE = "'Source Sans 3', Arial, sans-serif"


def texto_multilinea(x, y, lineas, tam=15, peso=400, color=TEXTO, ancla="middle", interlineado=1.25):
    """Texto centrado verticalmente en y, una línea por elemento."""
    alto = tam * interlineado
    y0 = y - (len(lineas) - 1) * alto / 2
    spans = "".join(
        f'<tspan x="{x}" y="{y0 + i * alto:.1f}">{escape(l)}</tspan>' for i, l in enumerate(lineas)
    )
    return (f'<text font-family="{FUENTE}" font-size="{tam}" font-weight="{peso}" fill="{color}" '
            f'text-anchor="{ancla}" dominant-baseline="middle">{spans}</text>')


def caja(cx, cy, w, h, lineas, relleno="#fff", borde=AZUL, tam=15, peso=400, radio=10, grosor=1.6, color=TEXTO):
    return (f'<rect x="{cx - w / 2}" y="{cy - h / 2}" width="{w}" height="{h}" rx="{radio}" '
            f'fill="{relleno}" stroke="{borde}" stroke-width="{grosor}"/>'
            + texto_multilinea(cx, cy, lineas, tam, peso, color))


def flecha(puntos, color=AZUL, discontinua=False, grosor=1.8, marcador="punta"):
    d = "M " + " L ".join(f"{x},{y}" for x, y in puntos)
    guion = ' stroke-dasharray="7 6"' if discontinua else ""
    return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{grosor}"{guion} '
            f'marker-end="url(#{marcador}-{color.strip("#")})"/>')


def marcadores(*colores):
    defs = ""
    for c in colores:
        defs += (f'<marker id="punta-{c.strip("#")}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" '
                 f'markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>')
    return f"<defs>{defs}</defs>"


def etiqueta(x, y, lineas, color=TEXTO, tam=13, fondo=True):
    w = max(len(l) for l in lineas) * tam * 0.52 + 12
    h = len(lineas) * tam * 1.25 + 6
    rect = (f'<rect x="{x - w / 2}" y="{y - h / 2}" width="{w}" height="{h}" rx="5" fill="#fff" opacity=".92"/>'
            if fondo else "")
    return rect + texto_multilinea(x, y, lineas, tam, 600, color)


# ───────────────────────── Diagrama de flujo del procedimiento ─────────────────────────
def flujo_procedimiento():
    W, H = 1960, 960
    carriles = [
        ("Médico", "titular de la matrícula"),
        ("Colegio · universidad|ministerio", "otorga la matrícula"),
        ("Contrato en Polygon", "RegistroCredencialesMedicas"),
        ("Hospital o clínica", "institución habilitada"),
        ("Cualquier persona", "paciente, empleador, público"),
    ]
    top, alto_carril, col_etiq = 90, 160, 250
    y = lambda i: top + i * alto_carril + alto_carril / 2
    xs = [370, 600, 830, 1060, 1290, 1520, 1800]
    bw, bh = 184, 84
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
         marcadores(AZUL, TURQUESA, GRIS, ROJO),
         f'<rect width="{W}" height="{H}" fill="#fff"/>']
    s.append(texto_multilinea(30, 40, ["Procedimiento: de la matrícula otorgada a la consulta"], 26, 700, AZUL, "start"))
    for i, (nombre, sub) in enumerate(carriles):
        y0 = top + i * alto_carril
        relleno = TURQUESA_SUAVE if i == 2 else (GRIS_SUAVE if i % 2 == 0 else "#f7f9fc")
        s.append(f'<rect x="20" y="{y0}" width="{W - 40}" height="{alto_carril}" fill="{relleno}" stroke="#d6dee8"/>')
        s.append(f'<rect x="20" y="{y0}" width="{col_etiq}" height="{alto_carril}" fill="{AZUL if i == 2 else "#dfe7f1"}" stroke="#d6dee8"/>')
        color = "#fff" if i == 2 else AZUL
        partes = nombre.split("|")
        s.append(texto_multilinea(20 + col_etiq / 2, y0 + alto_carril / 2 - 10 - (len(partes) - 1) * 10, partes, 17, 700, color))
        s.append(texto_multilinea(20 + col_etiq / 2, y0 + alto_carril / 2 + 16 + (len(partes) - 1) * 10, [sub], 13, 400, color))

    M, C, K, Hh, P = 0, 1, 2, 3, 4
    nodos = {
        "m1": (xs[0], y(M), ["Presenta título", "y documentación"]),
        "c1": (xs[1], y(C), ["Registra el pedido", "y revisa los papeles"]),
        "k1": (xs[1], y(K), ["Pendiente →", "Validada"]),
        "c2": (xs[2], y(C), ["Otorga la matrícula", "y emite el PDF"]),
        "k2": (xs[2], y(K), ["Guarda la huella", "del PDF · Activa"]),
        "m2": (xs[3], y(M), ["Recibe PDF + QR", "y lo presenta"]),
        "p1": (xs[4], y(P), ["Escanea el QR", "o sube el PDF"]),
        "k3": (xs[4], y(K), ["Responde estado", "e historial"]),
        "h1": (xs[5], y(Hh), ["Verifica antes de", "contratar y deja", "constancia"]),
        "k4": (xs[5], y(K), ["Registra hospital,", "fecha y estado visto"]),
        "m3": (xs[5], y(M), ["Confirma un código", "de 6 números", "(prueba que es suya)"]),
        "c3": (xs[6], y(C), ["Suspende, rehabilita", "o da de baja", "(con resolución)"]),
        "k5": (xs[6], y(K), ["Guarda el nuevo", "estado · lo ven", "todas las consultas"]),
    }
    registra = {"k1", "k2", "k4", "k5"}
    for clave, (cx, cy, lineas) in nodos.items():
        if clave == "k3":
            s.append(caja(cx, cy, bw, bh, lineas, "#fff", GRIS, 15, 600, grosor=1.6))
        elif clave in registra:
            s.append(caja(cx, cy, bw, bh, lineas, "#fff", TURQUESA, 15, 600, grosor=2.4))
        else:
            s.append(caja(cx, cy, bw, bh, lineas, "#fff", AZUL, 15, 400))

    def borde(clave, lado):
        cx, cy, _ = nodos[clave]
        return {"izq": (cx - bw / 2, cy), "der": (cx + bw / 2, cy), "arr": (cx, cy - bh / 2), "aba": (cx, cy + bh / 2)}[lado]

    def num(x, yy, n, color=AZUL):
        return (f'<circle cx="{x}" cy="{yy}" r="13" fill="{color}"/>'
                + texto_multilinea(x, yy + 1, [str(n)], 14, 700, "#fff"))

    a = s.append
    # 1 médico → colegio
    a(flecha([borde("m1", "aba"), (xs[0], y(C)), borde("c1", "izq")]))
    a(num(xs[0] - 22, (y(M) + y(C)) / 2 + 10, 1))
    # colegio → contrato (pendiente/validada)
    a(flecha([borde("c1", "aba"), borde("k1", "arr")], TURQUESA))
    # c1 → c2
    a(flecha([borde("c1", "der"), borde("c2", "izq")]))
    a(num((xs[1] + xs[2]) / 2, y(C) - 34, 2))
    a(flecha([borde("c2", "aba"), borde("k2", "arr")], TURQUESA))
    # c2 → m2 (entrega PDF + QR)
    a(flecha([borde("c2", "arr"), (xs[2], y(M)), borde("m2", "izq")]))
    a(num(xs[2] + 22, (y(M) + y(C)) / 2, 3))
    # m2 → público (presenta)
    a(flecha([borde("m2", "der"), ((xs[3] + xs[4]) / 2, y(M)), ((xs[3] + xs[4]) / 2, y(P)), borde("p1", "izq")], GRIS))
    # m2 → hospital
    a(flecha([((xs[3] + xs[4]) / 2, y(Hh)), ((xs[4] + xs[5]) / 2 + 20, y(Hh)), borde("h1", "izq")], GRIS))
    a(num((xs[3] + xs[4]) / 2 - 22, y(C) + 10, 4))
    # público → contrato (consulta, discontinua) y vuelta
    a(flecha([borde("p1", "arr"), borde("k3", "aba")], GRIS, discontinua=True))
    a(etiqueta(xs[4] + bw / 2 + 120, y(P), ["Consulta gratis y anónima:", "NO queda registrada"], "#5b6b80", 14))
    # hospital → contrato (registra)
    a(flecha([borde("h1", "arr"), borde("k4", "aba")], TURQUESA, grosor=2.4))
    a(etiqueta(xs[5] + 4, (y(K) + y(Hh)) / 2 + 2, ["SÍ queda registrada"], TURQUESA, 13))
    a(num(xs[5] - bw / 2 - 18, y(Hh) - 30, 5, TURQUESA))
    # hospital ↔ médico: código de titularidad (sube por fuera de las cajas del contrato)
    xr = xs[5] + bw / 2 + 34
    a(flecha([borde("h1", "der"), (xr, y(Hh)), (xr, y(M)), borde("m3", "der")], GRIS, discontinua=True))
    a(etiqueta(xr, y(C) + 30, ["código de", "6 números"], "#5b6b80", 12))
    # colegio sanción
    a(flecha([borde("c3", "aba"), borde("k5", "arr")], TURQUESA, grosor=2.4))
    a(num(xs[6] - bw / 2 - 18, y(C) - 30, 6))

    # Leyenda
    ly = H - 52
    a(f'<line x1="40" y1="{ly}" x2="100" y2="{ly}" stroke="{TURQUESA}" stroke-width="2.4" marker-end="url(#punta-{TURQUESA.strip("#")})"/>')
    a(texto_multilinea(110, ly, ["Se registra en la blockchain (transacción)"], 15, 400, TEXTO, "start"))
    a(f'<line x1="470" y1="{ly}" x2="530" y2="{ly}" stroke="{GRIS}" stroke-width="1.8" stroke-dasharray="7 6" marker-end="url(#punta-{GRIS.strip("#")})"/>')
    a(texto_multilinea(540, ly, ["Consulta o paso fuera de la blockchain: no se registra"], 15, 400, TEXTO, "start"))
    a(texto_multilinea(1010, ly, ["Nunca se guardan en la blockchain: el PDF, datos personales ni información clínica."], 15, 600, ROJO, "start"))
    s.append("</svg>")
    return "".join(s)


# ───────────────────────── DTE integrado (one-pager del modelado) ─────────────────────────
def dte_integrado():
    W, H = 1600, 900
    sw, sh = 176, 74
    est = {
        "Pendiente": (300, 400), "Validada": (560, 400), "Activa": (860, 400),
        "Suspendida": (860, 650), "Rechazada": (430, 650),
        "Vencida": (1230, 400), "Revocada": (1230, 650),
    }
    finales = {"Rechazada", "Vencida", "Revocada"}
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
         marcadores(AZUL, ROJO, GRIS), f'<rect width="{W}" height="{H}" fill="#fff"/>']
    a = s.append
    a(texto_multilinea(30, 40, ["Contrato RegistroCredencialesMedicas · Diagrama de transición de estados"], 24, 700, AZUL, "start"))
    a(texto_multilinea(30, 72, ["Activo: la matrícula (lógica, no transferible). Estados en los rectángulos; eventos (funciones) en las flechas; participantes como barras sobre los estados donde actúan."], 15, 400, TEXTO, "start"))

    # Barras de participantes
    barras = [
        (120, 212, 1318, "Colegio · universidad · ministerio (emisor de origen): todas las transiciones", AZUL, "#fff"),
        (165, 680, 1040, "Médico: QR, prueba de titularidad, cursos propios", TURQUESA, "#fff"),
        (210, 212, 1318, "Hospital o clínica: deja constancia en cualquier estado (no cambia el estado)", "#dfe7f1", AZUL),
        (255, 680, 1040, "Cualquiera: asienta el vencimiento", "#eef3f8", AZUL),
    ]
    for yb, x1, x2, txt, rel, col in barras:
        a(f'<rect x="{x1}" y="{yb}" width="{x2 - x1}" height="34" rx="17" fill="{rel}"/>')
        a(texto_multilinea((x1 + x2) / 2, yb + 17, [txt], 14, 600, col))
    for nombre, (cx, cy) in est.items():
        if cx in (300, 560, 860, 1230) and cy == 400:
            a(f'<line x1="{cx}" y1="290" x2="{cx}" y2="{cy - sh / 2}" stroke="#d6dee8" stroke-dasharray="3 5"/>')

    for nombre, (cx, cy) in est.items():
        final = nombre in finales
        nota = {"Activa": " (en el sitio: Vigente)", "Revocada": " (Dada de baja)", "Validada": " (En trámite)"}.get(nombre, "")
        a(caja(cx, cy - (8 if nota else 0), sw, sh, [nombre], "#fff" if not final else "#f6f8fb", AZUL, 19, 700, radio=12, grosor=3.2 if final else 1.8).replace(f'y="{cy - (8 if nota else 0) - sh / 2}"', f'y="{cy - sh / 2}"'))
        if nota:
            a(texto_multilinea(cx, cy + 20, [nota.strip()], 12, 600, "#5b6b80"))

    def b(n, lado, d=0):
        cx, cy = est[n]
        return {"izq": (cx - sw / 2, cy + d), "der": (cx + sw / 2, cy + d), "arr": (cx + d, cy - sh / 2), "aba": (cx + d, cy + sh / 2)}[lado]

    # inicio
    a(f'<circle cx="120" cy="400" r="12" fill="{AZUL}"/>')
    a(flecha([(132, 400), b("Pendiente", "izq")]))
    a(etiqueta(150, 372, ["registrarSolicitud"], AZUL, 12))
    a(f'<circle cx="660" cy="320" r="12" fill="{AZUL}"/>')
    a(flecha([(672, 326), (860 - sw / 2 + 10, 400 - sh / 2)]))
    a(etiqueta(690, 300, ["emitirEnLote (carga inicial)"], AZUL, 12))

    a(flecha([b("Pendiente", "der"), b("Validada", "izq")]))
    a(etiqueta(430, 382, ["validar"], AZUL, 13))
    a(flecha([b("Validada", "der"), b("Activa", "izq")]))
    a(etiqueta(710, 382, ["emitir · ancla huella"], AZUL, 13))
    a(flecha([b("Pendiente", "aba"), (300, 650), b("Rechazada", "izq")], ROJO))
    a(flecha([b("Validada", "aba"), (560, 650 - 0), b("Rechazada", "der")], ROJO))
    a(etiqueta(430, 590, ["rechazar (acto)"], ROJO, 13))
    a(flecha([b("Activa", "aba", -40), b("Suspendida", "arr", -40)]))
    a(etiqueta(780, 525, ["suspender", "(acto)"], AZUL, 13))
    a(flecha([b("Suspendida", "arr", 40), b("Activa", "aba", 40)]))
    a(etiqueta(944, 525, ["reactivar", "(acto)"], AZUL, 13))
    a(flecha([b("Activa", "der"), b("Vencida", "izq")]))
    a(etiqueta(1045, 382, ["vence por fecha"], AZUL, 13))
    a(flecha([b("Activa", "der", 20), (1080, 420), (1080, 630), b("Revocada", "izq", -20)], ROJO))
    a(flecha([b("Suspendida", "der"), b("Revocada", "izq", 10)], ROJO))
    a(etiqueta(1145, 560, ["revocar (acto)"], ROJO, 13))
    a(flecha([b("Suspendida", "aba"), (860, 770), (1390, 770), (1390, 400), b("Vencida", "der")], AZUL))
    a(etiqueta(1120, 788, ["vence por fecha (estando suspendida)"], AZUL, 13))

    # Notas
    ny = 820
    a(texto_multilinea(40, ny, ["Rectángulo de borde grueso = estado final. (acto) = exige la huella de la resolución que lo respalda."], 14, 400, TEXTO, "start"))
    a(texto_multilinea(40, ny + 26, ["Consultar (QR, código o PDF) no cambia el estado. Gobernanza: da de alta instituciones y habilita cuentas, pero el contrato le impide cambiar estados."], 14, 400, TEXTO, "start"))
    a(texto_multilinea(40, ny + 52, ["Red: Polygon PoS, red principal · Contrato 0x374adD49ce1101BC440b431EC24eee36a6A98565 · no actualizable"], 14, 600, AZUL, "start"))
    s.append("</svg>")
    return "".join(s)


# ───────────────────────── Espina de pescado (Eriksson–Penker) ─────────────────────────
def pescadito():
    W, H = 1600, 640  # recorte con viewBox
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="50 95 1510 510" width="1510" height="510">',
         marcadores(AZUL, TURQUESA), f'<rect width="{W}" height="{H}" fill="#fff"/>']
    a = s.append
    # cuerpo
    a(f'<path d="M 460 330 Q 760 170 1100 330 Q 760 490 460 330 Z" fill="{TURQUESA_SUAVE}" stroke="{TURQUESA}" stroke-width="2"/>')
    a(f'<circle cx="1050" cy="300" r="9" fill="{AZUL}"/>')
    a(f'<path d="M 460 330 L 400 280 L 400 380 Z" fill="{TURQUESA_SUAVE}" stroke="{TURQUESA}" stroke-width="2"/>')
    a(texto_multilinea(790, 330, ["Validación de", "matrículas médicas"], 26, 700, AZUL))
    # objetivo (línea de arriba)
    a(f'<line x1="470" y1="150" x2="1100" y2="150" stroke="{AZUL}" stroke-width="2"/>')
    a(texto_multilinea(785, 110, ["OBJETIVO"], 14, 700, TURQUESA))
    a(texto_multilinea(785, 132, ["Que cualquiera compruebe en segundos quién otorgó una matrícula, que no fue adulterada y si es válida hoy."], 17, 600, TEXTO))
    # entradas
    a(flecha([(70, 330), (390, 330)], AZUL, grosor=3))
    a(texto_multilinea(70, 200, ["ENTRADAS"], 14, 700, TURQUESA, "start"))
    for i, t in enumerate(["Solicitud del médico", "Título de origen", "Documentación respaldatoria"]):
        a(texto_multilinea(70, 228 + i * 26, ["· " + t], 17, 400, TEXTO, "start"))
    # salidas
    a(flecha([(1110, 330), (1540, 330)], AZUL, grosor=3))
    a(texto_multilinea(1210, 200, ["SALIDAS"], 14, 700, TURQUESA, "start"))
    for i, t in enumerate(["Matrícula otorgada y anclada", "QR verificable", "Estado vigente + historial", "Constancia de verificación"]):
        a(texto_multilinea(1210, 228 + i * 26, ["· " + t], 17, 400, TEXTO, "start"))
    # recursos (espinas inferiores)
    recursos = [["Colegios, universidades", "y ministerios"], ["Contrato en Polygon", "(red principal)"],
                ["Sistema del colegio", "(guarda el PDF)"], ["Cuentas institucionales", "habilitadas"], ["Sitio de", "verificación"]]
    a(texto_multilinea(330, 520, ["RECURSOS"], 14, 700, TURQUESA, "start"))
    for i, lineas in enumerate(recursos):
        x = 540 + i * 165
        a(f'<line x1="{x}" y1="{388 if i in (0, 4) else 408}" x2="{x - 60}" y2="540" stroke="{AZUL}" stroke-width="2"/>')
        a(texto_multilinea(x - 60, 575, lineas, 14, 400, TEXTO))
    s.append("</svg>")
    return "".join(s)


if __name__ == "__main__":
    destino = Path(sys.argv[1])
    destino.mkdir(parents=True, exist_ok=True)
    (destino / "flujo-procedimiento.svg").write_text(flujo_procedimiento(), encoding="utf-8")
    (destino / "dte-integrado.svg").write_text(dte_integrado(), encoding="utf-8")
    (destino / "pescadito.svg").write_text(pescadito(), encoding="utf-8")
    print("ok")
