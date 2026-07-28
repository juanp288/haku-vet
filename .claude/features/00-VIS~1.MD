# Visión y alcance — Sistema de gestión veterinaria

**Versión:** 1.0
**Fecha:** julio 2026
**Estado:** planeación previa a código

---

## 1. El problema

Una clínica veterinaria recién inaugurada opera hoy sin sistema: la agenda vive en un cuaderno o en WhatsApp, y la historia clínica de cada paciente existe en papel o en la memoria del veterinario. Esto genera tres pérdidas concretas:

1. **Citas perdidas o duplicadas** — no hay una fuente única de la agenda.
2. **Historia clínica inaccesible** — el veterinario no sabe qué se le hizo al paciente hace seis meses, ni qué vacunas tiene al día.
3. **Pacientes que no vuelven** — nadie recuerda avisarle al acudiente que el refuerzo vence esta semana.

## 2. La frase que define el éxito

> Que la recepcionista agende una cita en menos de 30 segundos, y que el veterinario abra la historia clínica completa de esa mascota en menos de 10 segundos desde que el paciente entra al consultorio.

Si el sistema logra eso y nada más, ya reemplazó al cuaderno. Todo lo demás se construye encima.

## 3. Usuarios

| Rol | Quién es | Qué hace en el sistema | Dispositivo |
|---|---|---|---|
| `RECEPCION` | Auxiliar de recepción | Agenda citas, registra acudientes y mascotas, marca llegadas | PC de mostrador |
| `VETERINARIO` | Médico veterinario | Consulta y escribe historia clínica, aplica vacunas | PC de consultorio o tablet |
| `AUXILIAR` | Auxiliar de clínica | Registra signos vitales, apoya en consulta | Tablet |
| `ADMIN` | Dueño de la clínica | Todo lo anterior + usuarios, catálogos, reportes | Cualquiera |

Escala esperada: 2 a 6 usuarios, 1 a 3 en simultáneo. Entre 10 y 40 citas diarias. Menos de 5.000 pacientes en los primeros tres años.

## 4. Alcance de la versión 1

**Dentro:**

- Gestión de acudientes (tutores) y sus datos de contacto
- Gestión de mascotas (pacientes), incluyendo relación mascota↔acudiente muchos-a-muchos
- Agenda de citas por veterinario, con vista día y semana
- Historia clínica en formato SOAP, ligada a la consulta
- Signos vitales y registro de peso en cada consulta
- Carnet de vacunación: aplicaciones, lotes y cálculo automático de próxima dosis
- Bandeja interna de recordatorios (vacunas vencidas y por vencer, controles pendientes)
- Adjuntos: fotos y PDFs asociados a una consulta o a un paciente
- Usuarios con roles y permisos
- Bitácora de auditoría sobre historia clínica
- Backup automático diario

**Fuera de la v1** (documentado aquí para que nadie lo asuma incluido):

- Facturación, cotizaciones y cierre de caja
- Inventario de medicamentos e insumos
- Envío automático por WhatsApp, SMS o correo
- Hospitalización y hoja de tratamientos por hora
- Módulo de cirugía y protocolos anestésicos
- Laboratorio con resultados estructurados
- Portal para el acudiente
- Peluquería, guardería y servicios no médicos
- Reportes financieros
- Multi-sede

Estos módulos están contemplados en el modelo de datos para que agregarlos después no implique reescribir. No se construyen ahora.

## 5. Restricciones de diseño

| Restricción | Implicación |
|---|---|
| Funciona en LAN, sin internet | Nada de servicios en la nube en el camino crítico. Auth propia, archivos en disco local |
| Varios dispositivos concurrentes | Postgres, no SQLite. Manejo explícito de conflictos de agenda |
| Mantenimiento mínimo del desarrollador | Backups automáticos, actualización de un comando, logs legibles, auto-restart |
| La historia clínica es un documento legal | No se borra ni se edita silenciosamente. Cierre + adendas + auditoría |
| Debe poder migrar a la nube después | Sin dependencias del sistema de archivos en la lógica de negocio; storage detrás de una interfaz |

## 6. Riesgos conocidos

- **El PC servidor se daña.** Mitigación: backup diario a carpeta local + copia a USB o carpeta sincronizada. Probar la restauración antes de entregar, no después.
- **El alcance crece durante el desarrollo.** Mitigación: este documento. Todo lo que no esté en la sección 4 va a una lista de v2.
- **El sistema se usa a medias y conviven papel y software.** Mitigación: la v1 debe ser más rápida que el cuaderno en el flujo de recepción, o no se adopta.
- **Datos personales de los acudientes.** Mitigación: casilla de autorización de tratamiento de datos con fecha, y política de retención definida antes de la entrega.

## 7. Definición de "terminado" para la v1

- Un día completo de operación real simulado con datos de prueba, sin caídas.
- Restauración de backup verificada desde cero en una máquina limpia.
- Los cuatro roles probados por una persona distinta al desarrollador.
- Manual de una página para el dueño: cómo arrancar, cómo restaurar, a quién llamar.
