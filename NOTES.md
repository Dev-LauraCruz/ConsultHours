# Notas — ConsultHours

## Lo que encontré y cómo lo corregí

**Inyección SQL en login y en la búsqueda.** En la versión original del ejercicio, tanto el login como `/api/time-entries/search` armaban el query con template strings (`WHERE username = '${username}'...`), lo cual es una inyección SQL clásica. Ya lo tenía corregido con consultas parametrizadas (`?` + `.get(username, password)`), así que solo confirmé que estuviera bien hecho en los dos endpoints.


**Autorización al eliminar registros (Ownership & Role Check)**: Inicialmente, la ruta no tenía restricciones y luego se limitó solo a administradores. Como el requisito establece que el propio consultor o un administrador pueden borrar el registro, moví la validación al controlador: se consulta el registro, se compara entry.consultant_id con el id del token JWT, y se retorna HTTP 403 si el usuario no cumple ninguna de las dos condiciones.

**Implementé el middleware de autenticación (`authMiddleware.js`) porque me di cuenta de que faltaba por completo** — el `server.js` oficial no verificaba sesión en ningún endpoint. Ya había trabajado con middlewares antes en la escuela, específicamente para capturar excepciones de la base de datos y devolver errores 400/409/500 con mensajes limpios sin exponer información sensible del servidor, así que el patrón de interceptar el request antes de que llegue al controller ya me era familiar; aquí lo apliqué para validar el token JWT y el rol antes de dejar pasar la petición a las rutas.

**El query de traslape estaba raro.** Tenía dos condiciones unidas con OR con los mismos parámetros repetidos, y la segunda no aportaba nada (era un subconjunto de la primera). Lo dejé con una sola condición, que es el patrón estándar para detectar traslape de rangos: `existente.start < nuevo.end AND existente.end > nuevo.start`.

**El `/api/summary` oficial no filtraba por `billable`.** Comparando contra el `server.js` original del ejercicio, su query es `SELECT * FROM time_entries WHERE client_id = ? AND date LIKE ?` — suma TODAS las horas del cliente en el mes, facturables y no facturables, pero el campo de respuesta se llama `billableHours`. Es justo el tipo de inconsistencia que el punto 3 del ejercicio pide detectar al verificar el número contra `seed.js`: por ejemplo, para Clínica San Rafael en agosto incluiría las 2 horas de "Capacitación interna sobre HIPAA (no facturable)" como si fueran facturables. Lo corregí agregando `AND billable = 1` al query.

## Verificación del resumen contra seed.js

Antes de confiar en `/api/summary`, revisé las horas facturables de Carla para Grupo Ferretero del Norte en agosto de 2026 directamente en seed.js y encontré un detalle clave: el 6 de agosto existen dos registros facturables que se traslapan (09:00–13:00 y 12:00–15:00), tal como lo plantea el enunciado del ejercicio.
Mi lógica de validación previene el registro de nuevos eventos con traslape, pero no altera ni limpia la información del seed. Como consecuencia, el endpoint contabiliza doble la hora de 12:00 a 13:00.
Decidí documentar este comportamiento en lugar de modificar o eliminar los datos de prueba, ya que no se trata de una falla en la implementación, sino de una condición de datos iniciales provista por el propio ejercicio.


## Decisiones de negocio (punto 5)

**Traslape de horarios (mismo consultor, mismo día):** decidí **rechazarlo** con un 400 en vez de solo advertir. Si dos registros facturables de un mismo consultor se cruzan en horario, se estaría cobrando al cliente por horas que en la práctica no pudo trabajar dos veces al mismo tiempo — prefiero que el sistema no permita crear ese dato desde el inicio, en vez de confiar en que alguien lo revise después a mano.

**Visibilidad del resumen facturable entre consultores:** decidí que **un consultor solo vea su propio resumen** por cliente/mes, y que el **admin pueda ver el de cualquiera** (o el agregado de todos si no filtra por consultor). La razón: el resumen no es solo "horas trabajadas", es directamente lo que se le cobra al cliente — y eso empieza a parecerse a información de desempeño/productividad de cada consultor frente a sus compañeros, que no me parece que deba ser visible entre pares sin que sea su rol gestionar eso. Si el objetivo fuera solo coordinación de equipo (¿cuánto llevamos facturado a este cliente en total?) la otra opción también sería defendible, pero preferí el lado más conservador.

## Sobre el uso de IA

Usé Claude como apoyo durante todo el proceso, principalmente para: revisar el código en busca de vulnerabilidades y bugs, explicarme por qué fallaban cosas que no entendía a la primera, y para escribir/ajustar el CSS.

Cosas que tuve que corregir o pedir de nuevo porque la primera propuesta no estaba completa:
- El formulario de "Registrar horas" fallaba en silencio cuando faltaba seleccionar un cliente — no era obvio hasta que probé y no pasaba nada. Tuve que pedir que agregara una alerta visible en ese caso.
- Al cerrar sesión, el formulario de login se quedaba con el usuario/contraseña anteriores y la búsqueda/resumen no se limpiaban — lo noté probando manualmente y pedí que se corrigiera.
- El botón "Eliminar" no tenía ninguna distinción visual de las demás acciones (mismo azul que "Agregar" o "Calcular"), lo cual no ayuda a evitar borrados por error — pedí que se le diera un tratamiento distinto.
- No agregó por su cuenta un botón para cerrar sesión ni para limpiar los filtros de búsqueda/resumen; tuve que pedirlo explícitamente después de notar que no estaban.

En general, la IA fue útil para no dejar pasar el hueco de autorización en el delete y para detectar el filtro `billable` faltante en el resumen, pero varias de las decisiones de UX y varios bugs de comportamiento (formulario silencioso, falta de limpieza de estado) los detecté yo probando la app, no porque la IA los hubiera anticipado.