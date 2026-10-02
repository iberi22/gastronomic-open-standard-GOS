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

## Tests

Para el desarrollo en Python (`gos/`), ejecuta la suite de tests usando `uv`:

```bash
uv sync && uv run pytest -q
```
