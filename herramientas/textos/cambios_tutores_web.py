"""Cambios pedidos por los tutores (07/10/2026):
- Oscar: video de presentación al principio de la portada.
- María Eugenia (DT-16): las constancias de hospitales y clínicas dejan de verse en la consulta
  pública; las ve el médico en «Mis matrículas» y cada hospital en su panel.
Uso: python3 cambios_tutores_web.py <carpeta frontend>
"""
import pathlib, sys

raiz = pathlib.Path(sys.argv[1])
C = {
 "index.html": [
  ('''          Si escaneaste el QR con la cámara del teléfono, ya llegaste al resultado. ¿Tenés el PDF? Verificalo acá abajo.
        </p>
      </section>''',
   '''          Si escaneaste el QR con la cámara del teléfono, ya llegaste al resultado. ¿Tenés el PDF? Verificalo acá abajo.
        </p>
      </section>

      <section class="tarjeta seccion-video" aria-labelledby="titulo-video">
        <span class="rotulo-seccion">En dos minutos y medio</span>
        <h2 id="titulo-video">Qué es y cómo funciona</h2>
        <video class="video-presentacion" controls preload="none" playsinline poster="assets/video/video-pitch-portada.jpg">
          <source src="assets/video/video-pitch.mp4" type="video/mp4" />
          Tu navegador no puede reproducir el video. <a href="assets/video/video-pitch.mp4">Descargalo acá</a>.
        </video>
      </section>'''),
 ],
 "assets/css/componentes/portada.css": [
  (".portada .rotulo-seccion {", """/* Video de presentación debajo de la portada */
.seccion-video h2 {
  margin-top: 0;
}
.video-presentacion {
  display: block;
  width: 100%;
  max-width: 960px;
  aspect-ratio: 16 / 9;
  margin: 0 auto;
  border-radius: var(--radio);
  background: #0b1a2e;
}

.portada .rotulo-seccion {"""),
 ],
 "verificar.html": [
  ('''        <section class="tarjeta" aria-labelledby="titulo-verificaciones">
          <span class="rotulo-seccion">Quién la consultó</span>
          <h2 id="titulo-verificaciones">Hospitales y clínicas que dejaron constancia</h2>
          <div id="verificaciones-credencial"></div>
        </section>

''', ""),
 ],
 "assets/js/paginas/pagina-verificar.js": [
  ("// PDF, historial, verificaciones institucionales y antecedentes autodeclarados.",
   "// PDF, historial y antecedentes autodeclarados. Las constancias de hospitales no se\n// muestran acá (privacidad, DT-16): las ven el médico y cada hospital en su panel."),
  ("import { crearLineaTiempoHistorial, crearListaVerificaciones, crearListaAntecedentes }",
   "import { crearLineaTiempoHistorial, crearListaAntecedentes }"),
  ("  leerVerificacionesCredencial,\n", ""),
  ('''  const [historial, verificaciones, antecedentes] = await Promise.all([
    leerHistorialCredencial(ficha.id),
    leerVerificacionesCredencial(ficha.id),
    leerAntecedentesCredencial(ficha.id),
  ]);''', '''  const [historial, antecedentes] = await Promise.all([
    leerHistorialCredencial(ficha.id),
    leerAntecedentesCredencial(ficha.id),
  ]);'''),
  ('''  vaciarContenedor(buscarElemento("#verificaciones-credencial"), crearListaVerificaciones(verificaciones, institucionesPorId));
''', ""),
 ],
 "assets/js/paginas/pagina-titular.js": [
  ('import { crearListaAntecedentes } from "../componentes/linea-tiempo-historial.js";',
   'import { crearListaAntecedentes, crearListaVerificaciones } from "../componentes/linea-tiempo-historial.js";'),
  ('import { leerCredencialesDeCuentaTitular, leerInstitucion, leerAntecedentesCredencial } from "../nucleo/contrato-credenciales.js";',
   'import { leerCredencialesDeCuentaTitular, leerInstitucion, leerAntecedentesCredencial, leerVerificacionesCredencial, listarInstituciones } from "../nucleo/contrato-credenciales.js";'),
  ('  const [institucion, antecedentes] = await Promise.all([leerInstitucion(ficha.datos.institucionEmisora), leerAntecedentesCredencial(ficha.id)]);',
   '''  const [institucion, antecedentes, verificaciones, instituciones] = await Promise.all([
    leerInstitucion(ficha.datos.institucionEmisora),
    leerAntecedentesCredencial(ficha.id),
    leerVerificacionesCredencial(ficha.id),
    listarInstituciones(),
  ]);
  const institucionesPorId = new Map(instituciones.map((item) => [item.id, item]));'''),
  ('''    crearElementoSeguro("h3", { clase: "separacion-superior", texto: "Antecedentes autodeclarados" }),''',
   '''    crearElementoSeguro("h3", { clase: "separacion-superior", texto: "Hospitales y clínicas que verificaron tu matrícula" }),
    crearElementoSeguro("p", { clase: "texto-chico texto-secundario", texto: "No aparece en la consulta pública del sitio: la ves vos acá y cada hospital en su panel." }),
    crearListaVerificaciones(verificaciones, institucionesPorId),
    crearElementoSeguro("h3", { clase: "separacion-superior", texto: "Cursos y formación que agregaste" }),'''),
 ],
}
errores = []
for archivo, pares in C.items():
    p = raiz / archivo
    t = p.read_text(encoding="utf-8")
    for viejo, nuevo in pares:
        n = t.count(viejo)
        if n != 1:
            errores.append(f"{archivo}: {n}x {viejo[:70]!r}")
            continue
        t = t.replace(viejo, nuevo)
    p.write_text(t, encoding="utf-8")
print("\n".join(errores) or "todo ok")
