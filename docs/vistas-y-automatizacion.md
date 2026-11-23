# Vistas y automatización (se configuran a mano en Airtable)

Esta guía completa la base para el equipo que trabaja dentro de Airtable: un kanban de prendas por fase (RF-6), dos vistas de apoyo y un aviso a Cuentas cuando un material pasa a descatalogado (RF-8).

Antes de empezar, crea los campos de [campos-calculados.md](campos-calculados.md): las vistas y el aviso usan **Riesgo**, **Coste materiales** y **Plazo crítico**.

Nada de esto cambia la app web: la app sigue leyendo los mismos campos y nunca escribe en Airtable.

## 1. Kanban de prendas por fase (RF-6)

En la tabla **Prendas**, crea una vista nueva de tipo **Kanban** llamada `Por fase`:

| Ajuste | Valor |
|---|---|
| Agrupar por | Fase |
| Orden de las columnas | Diseño, Muestra, Aprobada, Producción, Retirada |
| Campos en la tarjeta | Código, Categoría, Riesgo, Coste materiales, Plazo crítico |
| Ordenar | Riesgo (A → Z), así Ámbar y Rojo quedan arriba |

Mover una tarjeta de columna cambia la **Fase** de la prenda, y con ella el riesgo: una prenda que pasa a Producción con un material descatalogado se vuelve Rojo.

## 2. Vistas de apoyo

| Tabla | Vista | Tipo | Configuración |
|---|---|---|---|
| Prendas | `En riesgo` | Cuadrícula | Filtro: Riesgo **no es** Verde. Agrupar por Riesgo. |
| Muestras | `Por resultado` | Cuadrícula | Agrupar por Resultado. Ordenar por Fecha (más reciente primero). |

## 3. Clientes afectados por material

El aviso necesita saber qué prendas y qué clientes usan cada material. Un rollup solo recorre un enlace, así que se construye en tres saltos: Prendas → BOM → Tejidos y Avíos.

| Tabla | Campo | Tipo | Configuración |
|---|---|---|---|
| Prendas | Clientes | Lookup | Catálogo → Cliente |
| BOM | Clientes prenda | Lookup | Prenda → Clientes |
| Tejidos | Prendas afectadas | Rollup | BOM → Prenda · `ARRAYJOIN(ARRAYUNIQUE(values), ", ")` |
| Tejidos | Clientes afectados | Rollup | BOM → Clientes prenda · `ARRAYJOIN(ARRAYUNIQUE(values), ", ")` |
| Avíos | Prendas afectadas | Rollup | igual que en Tejidos |
| Avíos | Clientes afectados | Rollup | igual que en Tejidos |

## 4. Aviso a Cuentas al descatalogar un material (RF-8)

Una automatización solo vigila una tabla, así que se crean dos iguales: una para **Tejidos** y otra para **Avíos**.

1. Abre **Automatizaciones** y crea una llamada `Aviso a Cuentas · tejido descatalogado`.
2. **Disparador:** *When a record matches conditions*.
   - Tabla: Tejidos.
   - Condición: Estado **es** Descatalogado.
   - Salta cuando un material **entra** en esa condición, no por los que ya estaban descatalogados al activarla.
3. **Acción:** *Send email*.
   - Para: la dirección de Cuentas. En la demo, usa la tuya.
   - Asunto: `Material descatalogado: {Código} · {Nombre}`
   - Cuerpo (inserta los campos del registro del disparador donde van las llaves):

     ```text
     {Código} · {Nombre} ha pasado a descatalogado.

     Prendas que lo usan: {Prendas afectadas}
     Clientes afectados: {Clientes afectados}

     Consulta el impacto en coste y las alternativas compatibles en la app de análisis de impacto.
     ```

4. Repite los pasos para **Avíos**, con `{Referencia}` y `{Tipo}` en lugar de `{Código}` y `{Nombre}`.
5. Activa las dos automatizaciones.

### Probarlo sin tocar los datos de la demo

En el paso del disparador, pulsa **Test trigger** y elige **TJ-007** como registro de ejemplo; después, en la acción, pulsa **Test action**. Llega el correo real sin cambiar ningún estado.

Si prefieres verlo en vivo, cambia **TJ-015** de En revisión a Descatalogado y devuélvelo después a En revisión. No uses TJ-008, TJ-009 ni TJ-010: son las alternativas de TJ-007 y dejarían de proponerse.

## Comprobación con los datos de demo

- **Kanban:** PR-001, PR-002 y PR-003 aparecen en Producción con Riesgo Rojo.
- **Vista En riesgo:** PR-001, PR-002 y PR-003 (Rojo); PR-006, PR-009, PR-010 y PR-018 (Ámbar).
- **TJ-007 · Prendas afectadas:** Pantalón multibolsillos, Chaqueta de trabajo, Peto de trabajo.
- **TJ-007 · Clientes afectados:** Clínica Mirasol, Logística Portal Sur, Hoteles Brisa Atlántica, Vigía Seguridad Integral (el orden puede variar).
- **TJ-030 · Clientes afectados:** vacío, porque no se usa en ninguna prenda.
