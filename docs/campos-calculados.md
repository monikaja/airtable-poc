# Campos calculados (se crean a mano en Airtable)

La API de Airtable no permite crear fórmulas, lookups ni rollups. Después de `npm run seed`, crea estos campos en la interfaz **en este orden**, porque cada grupo usa los anteriores. El código de la app lee los campos marcados como **finales** y nunca los recalcula.

Un rollup solo puede recorrer un campo de enlace. Por eso BOM necesita campos auxiliares para el tejido y para el avío, que luego se combinan en una fórmula.

Los campos de enlace inversos los crea Airtable al ejecutar el seed y normalmente se llaman como la tabla de origen: `Tejidos` y `Avíos` en Proveedores; `BOM` en Prendas, Tejidos y Avíos; `Muestras` en Prendas; `Catálogo` en Prendas y Clientes.

## 1. Tejidos y Avíos

| Campo | Tipo | Configuración |
|---|---|---|
| **Plazo proveedor** (final) | Lookup | Proveedor → Plazo entrega días |

## 2. BOM

| Campo | Tipo | Configuración |
|---|---|---|
| Precio tejido | Rollup | Tejido → Precio €/m · `SUM(values)` |
| Precio avío | Rollup | Avío → Precio €/ud · `SUM(values)` |
| **Precio material** (final) | Fórmula | `{Precio tejido} + {Precio avío}` |
| **Coste línea** (final) | Fórmula | `{Cantidad} * {Precio material}` |
| Plazo tejido | Rollup | Tejido → Plazo proveedor · `MAX(values)` |
| Plazo avío | Rollup | Avío → Plazo proveedor · `MAX(values)` |
| **Plazo línea** (final) | Fórmula | `MAX({Plazo tejido}, {Plazo avío})` |
| Estado tejido | Rollup | Tejido → Estado · `ARRAYJOIN(values)` |
| Estado avío | Rollup | Avío → Estado · `ARRAYJOIN(values)` |
| **Descatalogado** (final) | Fórmula | `IF(FIND("Descatalogado", {Estado tejido} & {Estado avío}), 1, 0)` |
| **En revisión** (final) | Fórmula | `IF(FIND("En revisión", {Estado tejido} & {Estado avío}), 1, 0)` |

## 3. Prendas

| Campo | Tipo | Configuración |
|---|---|---|
| **Coste materiales** (final) | Rollup | BOM → Coste línea · `SUM(values)` |
| **Plazo crítico** (final) | Rollup | BOM → Plazo línea · `MAX(values)` |
| Materiales descatalogados | Rollup | BOM → Descatalogado · `SUM(values)` |
| Materiales en revisión | Rollup | BOM → En revisión · `SUM(values)` |
| **Riesgo** (final) | Fórmula | ver abajo |

```
IF(
  AND({Fase} = "Producción", {Materiales descatalogados} > 0),
  "Rojo",
  IF(OR({Materiales en revisión} > 0, {Plazo crítico} > 60), "Ámbar", "Verde")
)
```

## 4. Catálogo

| Campo | Tipo | Configuración |
|---|---|---|
| Coste materiales prenda | Rollup | Prenda → Coste materiales · `SUM(values)` |
| **Coste anual** (final) | Fórmula | `{Unidades anuales} * {Coste materiales prenda}` |

## Comprobación con los datos de demo

Si los campos están bien, deberías ver:

- **Riesgo Rojo:** PR-001, PR-002 y PR-003 (usan TJ-007, descatalogado).
- **Riesgo Ámbar:** PR-006 y PR-018 (proveedor con 75 días), PR-009 (TJ-015 en revisión) y PR-010 (AV-005 en revisión).
- **Riesgo Verde:** el resto.
- **Coste materiales de PR-001:** 8,00 € (1,4 m × 4,80 € + 0,08 € + 1,20 €).
- **Coste anual de "Logística Portal Sur · PR-001":** 7.200,00 € (900 × 8,00 €).
