# PRD — Análisis de impacto de materiales (PLM VRANDED Haus)

17/11/2026 · Mónica

## Resumen

Una herramienta que responde en segundos a una pregunta clave del PLM: **si cambia un tejido, un avío o un proveedor, ¿qué prendas, qué clientes y cuánto coste se ven afectados?** Se construye sobre Airtable como fuente de verdad, con un prototipo web de simulación de impacto encima.

- **Para quién:** equipos de Compras, Producto y Cuentas (atención a cliente) de VRANDED Haus.
- **Ámbito:** PLM y gestión de proveedores, las áreas secundarias del puesto. No toca el core (Uniform Flow).
- **Estado:** propuesta de concepto preparada como candidata. Todos los datos son ficticios y el modelo es una hipótesis sobre cómo podría funcionar el negocio, a validar con el equipo.

## Problema y contexto

En un modelo de Uniforms as a Service, cada cliente tiene un catálogo de prendas que hay que reponer durante años. Cada prenda depende de varios tejidos y avíos, y cada uno de ellos depende de un proveedor. Cuando algo cambia en esa cadena (sube un precio, se descatalogan un tejido o un color, un proveedor alarga sus plazos), nadie tiene una respuesta rápida a tres preguntas:

1. ¿Qué prendas usan ese material?
2. ¿Qué clientes tienen esas prendas contratadas y cuántas unidades reponen?
3. ¿Cuánto cambia el coste y el plazo, y hay alternativa?

**Hipótesis de situación actual** (a validar): la respuesta se reconstruye a mano cruzando fichas técnicas, hojas de cálculo y conversaciones con proveedores. Se tarda horas o días, se escapan prendas afectadas y el equipo de Cuentas se entera tarde.

**Por qué ahora:** con más de 600 clientes y el objetivo de escalar como plataforma, cada cambio de material afecta a más catálogos. Responder rápido protege el margen y la relación con el cliente.

## Objetivos, no objetivos y métricas

**Objetivos**

- Saber en menos de 1 minuto qué prendas y clientes se ven afectados por un cambio de material o proveedor.
- Cuantificar el impacto en coste y plazo antes de decidir.
- Proponer alternativas compatibles y dejar registro de la decisión.

**No objetivos (fuera del MVP)**

- Sustituir el core (Uniform Flow) ni la gestión de pedidos de cliente.
- Compras, facturación o integración con ERP.
- Portal para proveedores (candidato a fase 3).
- Diseño de prenda o fichas técnicas completas.

**Métricas de éxito** (objetivos propuestos, a ajustar con el equipo)

| Métrica | Hoy (hipótesis) | Objetivo a 3 meses |
| --- | --- | --- |
| Tiempo para responder “¿a quién afecta?” | Horas o días | Menos de 1 minuto |
| Prendas en producción con BOM completa en Airtable | Desconocido | 100 % |
| Cambios de material analizados en la herramienta | 0 % | 80 % |
| Clientes avisados antes de que el cambio llegue a reposición | Desconocido | 90 % |
| Uso semanal por Compras y Cuentas | 0 | Todos los usuarios previstos |

## Usuarios e historias de usuario

| Usuario | Qué necesita | Frecuencia |
| --- | --- | --- |
| Compras | Evaluar cambios de proveedor y negociar con datos | Semanal |
| Producto | Mantener las BOM y el ciclo de vida de las prendas | Diaria |
| Cuentas | Avisar a tiempo a los clientes afectados | Cuando hay un cambio |
| Dirección | Ver el riesgo de suministro agregado | Mensual |

**HU-1. Ver dónde se usa un material.** Como responsable de Compras, quiero elegir un tejido o avío y ver todas las prendas y clientes que lo usan, para saber el alcance de un cambio.

- Muestra las prendas por fase de ciclo de vida y los clientes con unidades anuales estimadas.
- Responde en menos de 3 segundos con el volumen de la demo.

**HU-2. Simular un cambio de precio.** Como responsable de Compras, quiero aplicar un +X % al precio de un material y ver el nuevo coste por prenda y por cliente, para decidir si aceptar la subida.

- Muestra coste actual, coste simulado y diferencia en € y en %.
- La simulación no modifica los datos de Airtable.

**HU-3. Encontrar alternativas.** Como responsable de Producto, quiero ver materiales alternativos compatibles, para no parar la producción.

- Filtra por mismo tipo y composición y gramaje parecidos (±10 %).
- Ordena por riesgo, coste y plazo, y explica en una frase por qué propone cada uno.

**HU-4. Detectar prendas en riesgo.** Como responsable de Producto, quiero ver un semáforo de riesgo por prenda, para anticiparme.

- Rojo si una prenda en producción usa un material descatalogado; ámbar si está en revisión o el plazo supera los 60 días.

**HU-5. Avisar a Cuentas.** Como responsable de Cuentas, quiero recibir un aviso cuando un material pase a descatalogado, con la lista de mis clientes afectados.

- El aviso salta automáticamente al cambiar el estado en Airtable.

## Requisitos funcionales del MVP

El MVP cubre HU-1, HU-2 y HU-4; HU-3 y HU-5 entran si caben en la primera iteración.

| ID | Requisito | HU | Prioridad |
| --- | --- | --- | --- |
| RF-1 | Modelo de datos en Airtable con BOM (prenda → materiales → proveedor) y catálogo de prendas por cliente | Todas | Imprescindible |
| RF-2 | Buscador de tejido, avío o proveedor con vista “dónde se usa” (prendas y clientes) | HU-1 | Imprescindible |
| RF-3 | Coste de materiales por prenda calculado en Airtable (rollup de la BOM) | HU-2 | Imprescindible |
| RF-4 | Simulador de % de precio con impacto por prenda y por cliente, sin escribir en Airtable | HU-2 | Imprescindible |
| RF-5 | Semáforo de riesgo por prenda (estado del material y plazo del proveedor) | HU-4 | Importante |
| RF-6 | Kanban de prendas por fase de ciclo de vida | HU-4 | Importante |
| RF-7 | Alternativas compatibles con explicación generada por un LLM | HU-3 | Importante |
| RF-8 | Automatización de aviso a Cuentas al descatalogar un material | HU-5 | Deseable |
| RF-9 | Exportar el informe de impacto (PDF o enlace) para compartir con el cliente | HU-5 | Deseable |

## Modelo de datos en Airtable

Ocho tablas. La tabla **BOM** es la pieza central: une cada prenda con sus materiales y es la que permite recorrer la cadena en ambos sentidos (prenda → materiales → proveedor y material → prendas → catálogo → clientes). La tabla Catálogo une cada cliente con las prendas que repone y sus unidades anuales, lo que permite calcular el impacto en € por cliente.

| Tabla | Campos principales | Relaciones |
| --- | --- | --- |
| Proveedores | Nombre, país, plazo de entrega (días), valoración (1–5), estado | 1:N con Tejidos y Avíos |
| Tejidos | Código, composición, gramaje (g/m²), color, precio (€/m), estado (activo / en revisión / descatalogado) | N:1 Proveedor; 1:N BOM |
| Avíos | Tipo (botón, cremallera, etiqueta…), referencia, precio (€/ud), estado | N:1 Proveedor; 1:N BOM |
| Prendas | Nombre, categoría, fase (diseño → muestra → aprobada → producción → retirada) | 1:N BOM; 1:N Muestras; 1:N Catálogo |
| BOM (tabla puente) | Prenda, tejido o avío, cantidad (m o ud) | N:1 Prenda; N:1 Tejido o Avío |
| Muestras | Prenda, versión, fecha, resultado (aprobada / rechazada), comentarios | N:1 Prenda |
| Clientes | Nombre (ficticio), sector, nº de empleados | 1:N Catálogo |
| Catálogo (tabla puente) | Cliente, prenda, unidades anuales | N:1 Cliente; N:1 Prenda |

**Campos calculados**

- **Coste de línea (BOM):** cantidad × precio del material (lookup del precio).
- **Coste de materiales (Prendas):** rollup con la suma del coste de línea de su BOM.
- **Plazo crítico (Prendas):** rollup con el máximo de los plazos de los proveedores de su BOM.
- **Riesgo (Prendas):** fórmula. Rojo si está en producción y algún material está descatalogado; ámbar si alguno está en revisión o el plazo crítico supera los 60 días; verde en el resto.
- **Coste anual (Catálogo):** unidades anuales × coste de materiales de la prenda.
- **Clientes afectados (Tejidos y Avíos):** lookup a través de BOM → Prendas → Catálogo → Clientes.

**Vistas y automatizaciones:** kanban de Prendas por fase, Muestras agrupadas por resultado, vista “En riesgo” filtrada por semáforo, y una automatización que avisa a Cuentas cuando un material pasa a descatalogado.

**Datos de demo:** unos 15 proveedores, 30 tejidos, 20 avíos, 25 prendas, 60 líneas de BOM, 8 clientes y 40 líneas de catálogo, generados por script.

## Flujo y UX del prototipo

Una sola pantalla con tres zonas: buscador arriba, impacto en el centro y alternativas a la derecha. El flujo principal tiene cinco pasos:

1. **Buscar.** El usuario escribe un código o nombre de tejido, avío o proveedor y elige uno.
2. **Ver dónde se usa.** Aparecen las prendas afectadas (con fase y semáforo) y los clientes con sus unidades anuales.
3. **Simular.** Con un deslizador de −20 % a +40 %, el usuario ve el nuevo coste por prenda y el impacto anual por cliente en €.
4. **Comparar alternativas.** Panel lateral con hasta 3 materiales compatibles, cada uno con coste, plazo, riesgo y una frase de justificación.
5. **Compartir.** Botón para copiar un resumen del impacto y enviarlo a Cuentas o Compras.

**Principios de UX**

- La respuesta clave (“afecta a N prendas y M clientes, +X €/año”) aparece arriba, en una frase, antes que cualquier tabla.
- Lenguaje del negocio, no de base de datos: “prendas” y “clientes”, nunca “registros”.
- La simulación se distingue claramente de los datos reales (color y etiqueta “Simulación”).
- Estados vacíos y de error explicados (material sin uso, proveedor sin plazo informado).
- La dirección de arte corresponde al equipo creativo; el prototipo usa un estilo neutro.

## Arquitectura técnica y requisitos no funcionales

```
App web (Vue + Vite) --HTTPS--> Función serverless (Vercel) --API REST--> Airtable (8 tablas)
                                       |                                     |
                                    prompt                           cambio de estado
                                       v                                     v
                                  API de LLM                 Automatización: email a Cuentas
```

La web nunca habla directamente con Airtable: una función serverless guarda el token, cachea las lecturas y llama al LLM solo para redactar la explicación de alternativas ya filtradas.

**Stack:** Vue 3 + Vite, despliegue y funciones en Vercel, API REST de Airtable con token personal de solo lectura, y Claude Code para generar el código y el script de datos de demo.

**Requisitos no funcionales**

- **Rendimiento:** análisis de impacto en menos de 3 segundos con el volumen de la demo.
- **Seguridad:** el token nunca llega al navegador; permisos de solo lectura en el MVP.
- **Coste:** plan gratuito de Airtable y Vercel para la demo; coste del LLM por debajo de céntimos por consulta.
- **Mantenibilidad:** el esquema de Airtable se documenta en el repositorio (`CLAUDE.md`) y el script de datos permite regenerar la base.
- **Accesibilidad:** contraste suficiente y el semáforo acompañado de texto, no solo de color.

## Plan de lanzamiento y adopción

| Fase | Semanas | Contenido | Puerta para pasar a la siguiente |
| --- | --- | --- | --- |
| 0 · Validar | 1–2 | Entrevistas con Compras y Cuentas; auditar las BOM | BOM en producción completas al 100 % |
| 1 · MVP | 3–6 | Base en Airtable, dónde se usa, simulador y riesgo, piloto con Compras | Compras lo usa en 3 cambios reales |
| 2 · Ampliar | 7–10 | Alternativas (LLM), avisos a Cuentas, informe de impacto | 80 % de cambios analizados aquí |
| 3 · Escalar | Desde la 11 | Portal de proveedor, conexión con Uniform Flow | — |

Cada fase solo arranca si se cumple el criterio de la puerta anterior. Las duraciones son una propuesta y dependen de lo que salga en la validación.

**Adopción**

- Empezar con un usuario piloto de Compras y un cambio de material real.
- Sesiones cortas de 20 minutos con Compras y Cuentas para validar cada iteración.
- Retirar la hoja de cálculo equivalente cuando la herramienta la cubra, para no duplicar trabajo.
- Ritmo de entregas pequeño y frecuente, que el equipo pueda asimilar: una mejora visible cada una o dos semanas.

## Riesgos, supuestos y preguntas abiertas

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| BOM incompletas o desactualizadas | El análisis omite prendas afectadas | Empezar por las prendas en producción; métrica de completitud visible |
| Precios y plazos de proveedor desfasados | Simulaciones poco fiables | Fecha de última actualización por material y aviso si supera 90 días |
| Límites de Airtable (registros, llamadas a la API) | Lentitud al crecer | Caché en la función intermedia; revisar plan y volumen antes de la fase 2 |
| Baja adopción si duplica trabajo | Vuelta a las hojas de cálculo | Integrarlo en el flujo de Compras y no pedir datos que ya existan en otro sitio |
| Alternativas del LLM poco fundadas | Decisiones erróneas | El LLM solo explica; el filtro de compatibilidad es una regla determinista |

**Supuestos**

- Existe (o puede existir) una BOM por prenda con cantidades por material.
- Cada material tiene un proveedor principal identificable.
- Se puede estimar el consumo anual por cliente y prenda.

**Preguntas para el equipo**

- [ ] ¿Dónde viven hoy las fichas técnicas y las BOM? ¿En Airtable, en hojas de cálculo o en el sistema del proveedor?
- [ ] ¿Cuántos cambios de material o proveedor hay al mes y quién se entera primero?
- [ ] ¿El cliente ve su catálogo en algún portal? ¿Querríais avisarle desde ahí?
- [ ] ¿Cómo se gestionan hoy las muestras rechazadas y sus versiones?
- [ ] ¿Qué parte de esto ya cubre Uniform Flow y dónde debe estar la frontera?
- [ ] ¿Hay materiales con proveedor alternativo ya homologado?
