-- 00009: Vista disponibilità camere — adattata per multi-tenant con properties
-- Dipende da: rooms (00007), room_types (00007), room_blocks (00007)
-- Nota: le reservations non esistono ancora in questo slice; la vista mostra
-- solo lo stato camera e i blocchi attivi. Sarà estesa quando arrivano le prenotazioni.

CREATE OR REPLACE VIEW v_room_availability AS
SELECT
  rm.property_id,
  rm.id AS room_id,
  rm.room_number,
  rm.floor,
  rm.status AS room_status,
  rt.name AS room_type_name,
  rt.category,
  rb.id AS current_block_id,
  rb.block_type,
  rb.reason AS block_reason,
  rb.date_from AS block_from,
  rb.date_to AS block_to
FROM rooms rm
JOIN room_types rt ON rm.room_type_id = rt.id
LEFT JOIN room_blocks rb ON rm.id = rb.room_id
  AND CURRENT_DATE BETWEEN rb.date_from AND rb.date_to
WHERE rm.is_active = true;

GRANT SELECT ON v_room_availability TO authenticated;
