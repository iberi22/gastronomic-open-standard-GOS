# Cómo contribuir

## Resumen

Puedes proponer cambios o agregar nuevas recetas enviando un Pull Request.

Al crear una nueva receta, por favor copia y adapta la plantilla modelo disponible en: [Ejemplo de receta](./dishes/template/ejemplo_receta/ejemplo_receta.md).

Antes de contribuir, te recomendamos leer el [Código de Conducta](./CODE_OF_CONDUCT.es.md).

## Reglas básicas

- Utiliza el formato estándar con YAML Front Matter y sigue la metodología documentada.
- Incluye fuentes, imágenes libres y licencia open source en cada receta.
- Revisa y corrige lints de Markdown antes de enviar tu contribución.
- Sé respetuoso en los comentarios y revisiones.

¡Gracias por ayudar a mejorar este recetario colectivo!

## Licencia

Al enviar una contribución aceptas que tu aporte (código, datos y
documentación) se publique bajo **AGPL-3.0-or-later**, la misma licencia del
repositorio desde el 2026-10-15 (ver [LICENSE](./LICENSE)). El contenido de
terceros que incluyas debe traer su propia licencia y atribución.

## Tests

Para el desarrollo en Python (`gos/`), ejecuta la suite de tests usando `uv`:

```bash
uv sync && uv run pytest -q
```
