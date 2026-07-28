-- B2: buscador único insensible a mayúsculas y tildes ("Nuñez" encuentra
-- "Núñez"). unaccent() de Postgres strippea diacríticos; combinado con
-- ILIKE (ya case-insensitive) cubre ambos casos. No agrega índices: a la
-- escala documentada (< 5.000 pacientes) un ILIKE '%...%' con unaccent() no
-- necesita índice funcional para cumplir el objetivo de <300ms — un índice
-- de verdad para substring search requeriría pg_trgm, que no se agrega acá
-- para no ampliar el alcance sin necesidad medida.
CREATE EXTENSION IF NOT EXISTS unaccent;
