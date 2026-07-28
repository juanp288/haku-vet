# Historias de usuario — MVP v1

Cada historia es una unidad de trabajo para una sesión de vibe-code. Se implementa una a la vez, con sus criterios de aceptación como tests, y se commitea antes de pasar a la siguiente.

Prioridad: **P0** = sin esto no hay sistema · **P1** = necesario para la v1 · **P2** = deseable, se puede cortar.

---

## Épica A — Acceso y usuarios

### A1 · Iniciar sesión — P0
> Como miembro del personal quiero entrar al sistema con correo y contraseña para que solo el equipo acceda a los datos clínicos.

**Criterios de aceptación**

- Con credenciales válidas recibo un token y aterrizo en la agenda del día.
- Con credenciales inválidas veo "Correo o contraseña incorrectos", sin distinguir cuál falló.
- Un usuario con `isActive: false` no puede entrar, aunque la contraseña sea correcta.
- Tras 5 intentos fallidos desde la misma IP en 10 minutos, se bloquea 15 minutos.
- Cada inicio de sesión exitoso escribe un `AuditLog` con acción `LOGIN`.
- El token expira a las 12 horas; refresco silencioso mientras la pestaña esté activa.

### A2 · Administrar usuarios — P1
> Como ADMIN quiero crear y desactivar usuarios y asignarles rol para controlar quién ve qué.

**Criterios de aceptación**

- Solo `ADMIN` accede a esta pantalla; los demás reciben 403.
- El correo es único; si se repite, error legible en el formulario.
- No puedo desactivar mi propio usuario.
- No puedo desactivar el último `ADMIN` activo.
- Un usuario con rol `VETERINARIO` aparece automáticamente como columna en la agenda.
- Desactivar un usuario no borra sus consultas ni sus citas históricas.

### A3 · Configuración de la clínica — P1
> Como ADMIN quiero editar nombre, logo, horarios y duración de cita por defecto para que el sistema refleje mi operación.

**Criterios de aceptación**

- Los horarios definidos limitan las franjas visibles de la agenda.
- Cambiar la duración por defecto no altera citas ya agendadas.
- El logo se muestra en el encabezado y en los documentos imprimibles.

---

## Épica B — Acudientes y mascotas

### B1 · Registrar un acudiente — P0
> Como RECEPCION quiero registrar un acudiente con sus datos de contacto para poder asociarle mascotas.

**Criterios de aceptación**

- Campos obligatorios: tipo y número de documento, nombres, apellidos, teléfono.
- La pareja (tipo, número) es única. Si ya existe, el sistema me ofrece abrir el registro existente en vez de mostrar un error crudo.
- No puedo guardar sin marcar la autorización de tratamiento de datos; al marcarla se guarda la fecha.
- El teléfono se normaliza a solo dígitos antes de guardar.
- Correo, si se ingresa, debe tener formato válido.

### B2 · Buscar acudiente o mascota — P0
> Como RECEPCION quiero un buscador único que encuentre por teléfono, documento, nombre del acudiente o nombre de la mascota para atender rápido a quien llama.

**Criterios de aceptación**

- Un solo campo de búsqueda; el sistema decide contra qué campos buscar.
- Resultados en menos de 300 ms con 5.000 pacientes cargados.
- Los resultados muestran mascota, especie, acudiente principal y teléfono en una sola línea.
- Búsqueda insensible a mayúsculas y a tildes ("Nuñez" encuentra "Núñez").
- Desde un resultado llego a la ficha en un clic.

### B3 · Registrar una mascota — P0
> Como RECEPCION quiero registrar una mascota y vincularla a su acudiente para tener su ficha desde la primera visita.

**Criterios de aceptación**

- Obligatorios: nombre, especie, al menos un acudiente vinculado.
- Si la especie es `OTRO`, `speciesOther` pasa a ser obligatorio.
- La raza se elige del catálogo filtrado por especie, con opción "otra" en texto libre.
- Fecha de nacimiento opcional, con casilla "es aproximada".
- La edad se muestra calculada ("3 años 2 meses"), nunca se digita.
- El microchip, si se ingresa, es único en todo el sistema.

### B4 · Vincular varios acudientes a una mascota — P1
> Como RECEPCION quiero asociar más de un acudiente a una mascota para manejar familias y cuidadores.

**Criterios de aceptación**

- Exactamente un acudiente está marcado como principal.
- Al marcar uno nuevo como principal, el anterior deja de serlo automáticamente.
- No se puede desvincular al último acudiente de una mascota.
- Los recordatorios se dirigen al acudiente principal.

### B5 · Ficha de la mascota — P0
> Como VETERINARIO quiero abrir la ficha y ver todo lo relevante sin navegar para decidir rápido en consulta.

**Criterios de aceptación**

- Encabezado fijo: nombre, foto, especie, raza, sexo, edad, peso más reciente.
- Alergias, condiciones crónicas y alerta clínica se muestran destacadas y siempre visibles, incluso al hacer scroll.
- Pestañas: Historia clínica · Vacunas · Citas · Adjuntos.
- La historia carga las últimas 10 consultas en orden cronológico inverso, con paginación.
- Si la mascota está marcada como fallecida, la ficha muestra un aviso y la agenda bloquea nuevas citas.

---

## Épica C — Agenda

### C1 · Ver la agenda del día — P0
> Como RECEPCION quiero ver las citas del día por veterinario para saber quién está libre.

**Criterios de aceptación**

- Vista de columnas: una por veterinario activo, con franjas horarias.
- Solo se muestran las horas dentro del horario configurado de la clínica.
- Cada cita muestra hora, mascota, acudiente y motivo, con color por estado.
- Navegación a día anterior/siguiente y salto a "hoy".
- La vista se refresca sola cada 60 segundos (otro dispositivo pudo agendar).

### C2 · Agendar una cita — P0
> Como RECEPCION quiero agendar una cita seleccionando mascota, veterinario, fecha y hora en menos de 30 segundos.

**Criterios de aceptación**

- Al hacer clic en una franja libre se abre el formulario con veterinario y hora precargados.
- La mascota se elige con el buscador del B2, sin salir del formulario.
- Si la mascota no existe, puedo crearla desde el mismo flujo sin perder lo digitado.
- La duración se precarga con el valor por defecto y es editable.
- **No se permite** solapar dos citas del mismo veterinario. Error claro con la cita en conflicto.
- No se permite agendar en el pasado, salvo que el rol sea `ADMIN`.
- No se permite agendar a una mascota marcada como fallecida.
- Si otro usuario tomó la franja mientras yo llenaba el formulario, recibo conflicto (409) y la agenda se refresca.

### C3 · Mover, cancelar y cambiar estado de una cita — P1
> Como RECEPCION quiero reprogramar o cancelar una cita y marcar la llegada del paciente.

**Criterios de aceptación**

- Transiciones válidas: `AGENDADA → CONFIRMADA | EN_SALA | CANCELADA | NO_ASISTIO`; `EN_SALA → EN_ATENCION | NO_ASISTIO`; `EN_ATENCION → ATENDIDA`; `ATENDIDA` y `CANCELADA` son finales.
- Cualquier transición inválida devuelve 422 con el mensaje de por qué.
- Cancelar exige motivo y guarda quién y cuándo.
- Marcar `EN_SALA` guarda `arrivedAt`.
- Mover una cita revalida el solapamiento.
- Una cita con consulta cerrada asociada no se puede cancelar ni mover.

### C4 · Vista semanal — P2
> Como ADMIN quiero ver la semana completa para planear turnos.

---

## Épica D — Historia clínica

### D1 · Crear una consulta — P0
> Como VETERINARIO quiero abrir una consulta desde la cita y registrar la atención en formato SOAP.

**Criterios de aceptación**

- Desde una cita en estado `EN_SALA` o `EN_ATENCION`, un botón crea la consulta con paciente, veterinario y cita precargados.
- También puedo crear una consulta sin cita previa (urgencia), eligiendo el paciente.
- La consulta nace en estado `BORRADOR` y solo la ve su autor y los `ADMIN`.
- Guardado automático de borrador cada 30 segundos y al cambiar de campo.
- El motivo de consulta es obligatorio; los campos SOAP no lo son mientras esté en borrador.
- Solo el rol `VETERINARIO` o `ADMIN` puede crear consultas.

### D2 · Registrar signos vitales — P1
> Como AUXILIAR quiero registrar peso, temperatura y frecuencias en la consulta para que el veterinario los tenga listos.

**Criterios de aceptación**

- El rol `AUXILIAR` puede editar únicamente los campos de signos vitales de una consulta en borrador.
- Rangos validados: peso 0.05–120 kg, temperatura 30–45 °C, FC 20–300, FR 5–150, condición corporal 1–9.
- Un valor fuera de rango fisiológico advierte pero no bloquea (puede ser real).
- El peso se muestra junto al último registrado y su variación porcentual.

### D3 · Cerrar una consulta — P0
> Como VETERINARIO quiero cerrar la consulta para que quede como registro clínico definitivo.

**Criterios de aceptación**

- Para cerrar se exige al menos motivo, `objective` y `assessment` diligenciados.
- Al cerrar se guarda `closedAt`, el estado pasa a `CERRADA` y se escribe un `AuditLog`.
- Una consulta cerrada **no admite edición de ningún campo**, ni por el `ADMIN`.
- Al cerrar, la cita asociada pasa automáticamente a `ATENDIDA`.
- Si se diligenció `nextControlAt`, se genera un `Reminder` de tipo `CONTROL`.

### D4 · Agregar adenda — P1
> Como VETERINARIO quiero corregir o complementar una consulta cerrada sin alterar el original.

**Criterios de aceptación**

- La adenda se muestra bajo la consulta, con autor y fecha, visualmente diferenciada.
- Puede haber varias adendas sobre una misma consulta.
- Una adenda no se edita ni se borra.
- Solo el autor de la consulta o un `ADMIN` puede agregar adendas.

### D5 · Ver la historia clínica completa — P0
> Como VETERINARIO quiero recorrer todas las consultas del paciente para entender su evolución.

**Criterios de aceptación**

- Lista cronológica inversa, con consulta más reciente expandida.
- Cada entrada muestra fecha, veterinario, motivo y diagnóstico como resumen colapsado.
- Filtro por rango de fechas y por veterinario.
- Los borradores propios se ven marcados como tal; los borradores ajenos no se ven.
- Gráfica de evolución del peso a partir de las consultas con `weightKg`.

### D6 · Imprimir consulta y receta — P2
> Como VETERINARIO quiero imprimir la consulta y la fórmula con los datos de la clínica.

**Criterios de aceptación**

- Salida en PDF con logo, datos de la clínica, paciente, acudiente y veterinario con su registro profesional.
- Solo se imprimen consultas cerradas.

---

## Épica E — Vacunación

### E1 · Registrar aplicación de vacuna — P0
> Como VETERINARIO quiero registrar la vacuna aplicada con su lote para tener trazabilidad.

**Criterios de aceptación**

- El catálogo de biológicos se filtra por la especie del paciente.
- Obligatorios: biológico, fecha de aplicación, veterinario.
- La fecha de aplicación no puede ser futura.
- `nextDueAt` se calcula como fecha de aplicación + `boosterIntervalDays` del biológico, y queda editable.
- Si el biológico no tiene intervalo (dosis única), `nextDueAt` queda vacío.
- Si el lote tiene fecha de vencimiento anterior a la aplicación, se advierte antes de guardar.
- Al guardar con `nextDueAt`, se crea un `Reminder` de tipo `VACUNA`.

### E2 · Ver el carnet de vacunación — P0
> Como VETERINARIO quiero ver todas las vacunas del paciente y cuáles están vencidas.

**Criterios de aceptación**

- Tabla por biológico con fecha de aplicación, dosis, lote, veterinario y próxima dosis.
- Semáforo: al día (verde), por vencer en 30 días (amarillo), vencida (rojo).
- Se puede imprimir como carnet en PDF.

### E3 · Bandeja de recordatorios — P1
> Como RECEPCION quiero ver qué pacientes tienen vacunas o controles pendientes para llamarlos.

**Criterios de aceptación**

- Un cron diario a las 6:00 genera y actualiza los recordatorios de los próximos 30 días.
- La bandeja lista: mascota, acudiente principal, teléfono, motivo y fecha objetivo.
- Filtros por tipo y por rango de vencimiento.
- Puedo marcar un recordatorio como `ATENDIDO` (ya llamé) o `DESCARTADO` (con motivo).
- Un recordatorio se marca `ATENDIDO` automáticamente si se registra la aplicación correspondiente.
- El cron es idempotente: correrlo dos veces el mismo día no duplica recordatorios.

---

## Épica F — Adjuntos

### F1 · Subir archivos a un paciente o consulta — P1
> Como VETERINARIO quiero adjuntar radiografías y resultados de laboratorio a la consulta.

**Criterios de aceptación**

- Tipos permitidos: `jpg`, `png`, `webp`, `pdf`. Máximo 20 MB por archivo.
- El archivo se guarda en disco bajo `STORAGE_ROOT/{patientId}/{uuid}.{ext}`; la BD solo guarda la ruta relativa.
- El nombre original se preserva para mostrarlo.
- Las imágenes muestran miniatura; los PDFs, un ícono.
- Solo usuarios autenticados descargan archivos; la ruta directa sin token devuelve 401.
- Eliminar un adjunto lo marca como inactivo y conserva el archivo en disco.

---

## Épica G — Auditoría

### G1 · Bitácora de historia clínica — P1
> Como ADMIN quiero saber quién creó, cerró o adendó cada consulta.

**Criterios de aceptación**

- Se registra automáticamente: creación y cierre de consulta, adendas, creación y modificación de pacientes y acudientes, inicios de sesión.
- La bitácora es de solo lectura; no existe endpoint de borrado ni de edición.
- Filtros por usuario, entidad y rango de fechas.
- El campo `changes` guarda el diff de los campos modificados, nunca contraseñas.
