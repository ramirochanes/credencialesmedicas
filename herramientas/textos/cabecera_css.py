"""Cabecera: menú de hamburguesa hasta 1180 px y sin cortes de línea en marca y menú."""
import pathlib, sys
p = pathlib.Path(sys.argv[1]) / "assets/css/layout.css"
t = p.read_text(encoding="utf-8")
rep = [
 ("  color: #8fd3db;\n  font-weight: 700;\n}", "  color: #8fd3db;\n  font-weight: 700;\n  white-space: nowrap;\n}"),
 ("  padding: 0 var(--espacio-3);\n  border-radius: var(--radio-chico);", "  padding: 0 var(--espacio-3);\n  white-space: nowrap;\n  border-radius: var(--radio-chico);"),
 ("@media (max-width: 760px) {\n  .cabecera-sitio__interior {", "/* El menú completo entra en una línea desde ~1180 px; debajo, menú de hamburguesa. */\n@media (max-width: 1180px) {\n  .cabecera-sitio__interior {"),
 ("  .indicador-red {\n    display: none;\n  }\n  main {", "  .indicador-red {\n    display: none;\n  }\n}\n\n@media (max-width: 760px) {\n  main {"),
]
err = []
for a, b in rep:
    if t.count(a) != 1: err.append(a[:50]); continue
    t = t.replace(a, b)
p.write_text(t, encoding="utf-8")
print(err or "todo ok")
