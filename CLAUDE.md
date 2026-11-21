# Análisis de impacto de materiales (demo PLM)

## Qué es
Prototipo de portfolio. Dado un tejido, un avío o un proveedor, muestra qué prendas y qué clientes se ven afectados por un cambio y cuánto varía el coste anual. Todos los datos son ficticios. El PRD completo está en docs/PRD.md.

## Stack
- Frontend: Vue 3 + Vite + TypeScript, en /src
- Backend: funciones serverless de Vercel (Node 20), en /api
- Datos: Airtable como fuente de verdad, API REST
- LLM: API de Anthropic, solo para redactar la explicación de alternativas
- Datos de demo: script en /scripts/seed.ts
- Entorno de desarrollo: Windows

## Reglas
- El navegador nunca llama a Airtable ni al LLM. Todo pasa por /api.
- Secretos solo en variables de entorno, nunca en el código: AIRTABLE_BASE_ID, AIRTABLE_TOKEN_READ (app y Vercel), AIRTABLE_TOKEN_WRITE (solo local, para el seed), ANTHROPIC_API_KEY. En local están en .env.local, que no se sube al repositorio. Los scripts lo cargan explícitamente (dotenv con path .env.local).
- Nunca leas ni muestres el contenido de .env.local. Si falta una variable, dime su nombre.
- Ninguna variable de entorno lleva el prefijo VITE_: así Vite no las expone al navegador.
- La app es de solo lectura. La simulación de precios se calcula en memoria y nunca escribe en Airtable.
- Las alternativas se filtran con una regla determinista: mismo tipo de material, composición parecida y gramaje dentro de ±10 %. El LLM solo escribe una frase por alternativa ya filtrada.
- Interfaz en español y con lenguaje de negocio: "prendas" y "clientes", nunca "registros".
- El semáforo de riesgo siempre lleva texto además de color.
- Airtable admite 5 peticiones por segundo por base y 10 registros por escritura: agrupa en lotes y cachea las lecturas 60 s en la función.
- Cambios pequeños: un commit por funcionalidad, con mensaje descriptivo. Antes de un cambio grande, propón un plan y espera mi visto bueno.

## Esquema de Airtable (8 tablas)
El campo primario va primero en cada tabla.

| Tabla | Campos (tipo) |
|---|---|
| Proveedores | Nombre (texto), País (selección), Plazo entrega días (número), Valoración (rating 1–5), Estado (selección: Activo, En revisión, Inactivo) |
| Tejidos | Código (texto, ej. TJ-001), Nombre, Composición (texto, ej. "65 % poliéster, 35 % algodón"), Gramaje g/m² (número), Color (selección), Precio €/m (moneda), Estado (selección: Activo, En revisión, Descatalogado), Proveedor (enlace), Precio actualizado el (fecha) |
| Avíos | Referencia (texto, ej. AV-001), Tipo (selección: Botón, Cremallera, Etiqueta, Velcro, Cinta reflectante), Precio €/ud (moneda), Estado (igual que Tejidos), Proveedor (enlace), Precio actualizado el (fecha) |
| Prendas | Nombre (texto), Código (ej. PR-001), Categoría (selección), Fase (selección: Diseño, Muestra, Aprobada, Producción, Retirada) |
| BOM | Línea (texto, ej. "PR-001 · TJ-003"), Prenda (enlace), Tejido (enlace), Avío (enlace), Cantidad (número), Unidad (selección: m, ud). Cada línea enlaza exactamente un tejido o un avío. |
| Muestras | Muestra (texto), Prenda (enlace), Versión (número), Fecha (fecha), Resultado (selección: Aprobada, Rechazada), Comentarios (texto largo) |
| Clientes | Nombre (texto, ficticio), Sector (selección), Empleados (número) |
| Catálogo | Línea (texto), Cliente (enlace), Prenda (enlace), Unidades anuales (número) |

## Campos calculados
La API de Airtable no permite crear fórmulas, lookups ni rollups: se crean a mano en la interfaz. El código lee los campos finales, nunca los recalcula. Configuración exacta y valores de comprobación: docs/campos-calculados.md.

Un rollup solo recorre un campo de enlace. Como cada línea de BOM enlaza un tejido o un avío, BOM usa campos auxiliares por enlace (Precio tejido/avío, Plazo tejido/avío, Estado tejido/avío) que se combinan en fórmulas.

Campos finales que lee el código:
- Tejidos y Avíos: Plazo proveedor (lookup de Proveedor).
- BOM: Precio material (fórmula: Precio tejido + Precio avío), Coste línea (fórmula: Cantidad × Precio material), Plazo línea (fórmula: MAX de Plazo tejido y Plazo avío), Descatalogado (fórmula: 1 si el material está descatalogado), En revisión (fórmula: 1 si está en revisión).
- Prendas: Coste materiales (rollup SUM de Coste línea), Plazo crítico (rollup MAX de Plazo línea), Riesgo (fórmula: Rojo si está en Producción y algún material está descatalogado; Ámbar si alguno está en revisión o el plazo crítico supera 60 días; Verde en el resto). Riesgo usa los auxiliares Materiales descatalogados y Materiales en revisión (rollups SUM).
- Catálogo: Coste anual (fórmula: Unidades anuales × Coste materiales prenda, un rollup auxiliar de la prenda).

## Datos de demo
Unos 15 proveedores, 30 tejidos, 20 avíos, 25 prendas, 60 líneas de BOM, 30 muestras, 8 clientes y 40 líneas de catálogo. Incluye casos que luzcan en la demo:
- un tejido descatalogado usado en 3 prendas en producción y por 4 clientes;
- 2 materiales en revisión y un proveedor con 75 días de plazo;
- para el tejido descatalogado, 2 o 3 alternativas compatibles con distinto precio y plazo;
- un material sin ningún uso, para probar el estado vacío.

## API interna
- GET /api/search?q= → tejidos, avíos y proveedores que coinciden
- GET /api/impact?tipo=tejido|avio|proveedor&id= → prendas afectadas (fase, coste, riesgo) y clientes con unidades y coste anual
- GET /api/alternatives?id= → hasta 3 materiales compatibles, con coste, plazo, riesgo y una frase del LLM

## Comandos
- npm run dev → vercel dev en local
- npm run seed → crea tablas y datos de demo en la base (usa AIRTABLE_TOKEN_WRITE)
- npm run build → build de producción
