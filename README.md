# Olimpiadas 369 — Digitador de Resultados

Aplicación web para digitar y exportar resultados de las Olimpiadas Escolares 369
en los cursos de **Matemática** y **Comunicación**.

---

## ¿Qué hace?

Permite a un digitador ingresar rápidamente los resultados de cada alumno durante
una olimpiada escolar. Por cada alumno se registra:

- Apellidos y nombre
- Institución educativa
- Respuestas correctas e incorrectas
- Hora de entrega y orden de llegada

El puntaje se calcula automáticamente con la fórmula **`(correctas × 20) − incorrectas`**.
Al terminar, se exporta un archivo Excel listo para entregar.

---

## Características principales

### Bloques de trabajo
Antes de ingresar registros se configura un **bloque**: la combinación de curso,
nivel educativo y grado. Ejemplo: "Matemática — Primaria — 3°". El sistema
recuerda el bloque y los registros aunque se cierre el navegador.

### Autocompletado inteligente
- **Campo Nombre**: autocompletado estilo Excel (ghost text). Al escribir un apellido
  aparece la sugerencia completa sombreada; solo Enter la acepta. Si ya se digitó
  el mismo grado en el curso par (Matemática ↔ Comunicación), el sistema sugiere
  directamente el nombre completo del alumno desde el historial anterior.
- **Campo Institución**: dropdown con búsqueda y navegación por teclado (↑↓ + Enter).
  Los colegios nuevos que se ingresan se guardan automáticamente para futuras sesiones.

### Tabla interactiva
- Ordenada por puntaje de mayor a menor en tiempo real.
- Cada fila permite **edición inline**: clic en el lápiz transforma la fila en campos
  editables con preview del puntaje.
- La hora y el orden de llegada se registran directamente en la tabla, sin interrumpir
  el flujo del formulario.

### Exportar a Excel
Genera un archivo `.xlsx` con todos los registros ordenados por puntaje, listo para
entregar o imprimir.

### Sin conexión a internet
La app funciona completamente offline. No tiene backend ni base de datos; toda la
información se guarda en el navegador con `localStorage`.

---

## Niveles y grados soportados

| Nivel       | Grados                              |
|-------------|-------------------------------------|
| Inicial     | 3 años, 4 años, 5 años              |
| Primaria    | 1° al 6°                            |
| Secundaria  | 1° al 5°                            |

---

## Cómo usar

1. Abrir `index.html` en el navegador (o con Live Server en VSCode).
2. Seleccionar **curso**, **nivel** y **grado**, luego clic en **Fijar bloque**.
3. Ingresar los datos del alumno en el formulario. Usar Enter para avanzar entre campos.
4. Clic en **Agregar alumno** (o Enter desde el último campo).
5. Registrar la hora de entrega haciendo clic en la columna correspondiente de la tabla.
6. Al terminar el grado, clic en **Marcar grado completo** para activar el historial
   en el curso par.
7. Clic en **Exportar Excel** para descargar el archivo.

---

## Estructura de archivos

```
olimpiadas369/
├── index.html          — Página principal
├── css/
│   └── styles.css      — Estilos (Inter, paleta institucional)
├── js/
│   ├── app.js          — Lógica completa de la aplicación
│   └── data.js         — Base de datos de apellidos, nombres y colegios peruanos
└── assets/
    ├── banner_mate.png
    └── banner_comu.png
```

---

## Tecnologías

- HTML / CSS / JavaScript puro (sin frameworks ni bundlers)
- [SheetJS](https://sheetjs.com/) para la exportación a Excel
- Google Fonts (Inter)
- `localStorage` para persistencia local

---

## Modo 2 — Historial entre cursos

Cuando se marca un grado como "completado" en un curso (ej: Matemática 3° Primaria),
la próxima vez que se ingrese el mismo grado en el curso par (Comunicación 3° Primaria)
el campo Nombre sugerirá directamente los nombres completos de los alumnos ya registrados,
acelerando la digitación del segundo examen.
