// Relational IDs are remapped on restore; user accounts are not part of this export.
export async function readSnapshot(client) {
  const { rows } = await client.query(`
    SELECT to_jsonb(e) - 'id' - 'category_id' - 'created_by' - 'updated_by' AS event,
           CASE WHEN c.id IS NULL THEN NULL ELSE to_jsonb(c) - 'id' END AS category,
           COALESCE((SELECT jsonb_agg(to_jsonb(s) - 'id' - 'event_id' ORDER BY s.id)
                     FROM event_sources s WHERE s.event_id = e.id), '[]'::jsonb) AS sources
    FROM historical_events e
    LEFT JOIN event_categories c ON c.id = e.category_id
    ORDER BY e.event_date, e.title, e.id
  `);
  return { formatVersion: 1, events: rows };
}

export async function restoreSnapshot(client, snapshot) {
  if (snapshot.formatVersion !== 1 || !Array.isArray(snapshot.events) || !snapshot.events.length) {
    throw new Error('Nieprawidłowy lub pusty eksport wydarzeń.');
  }
  await client.query('LOCK TABLE historical_events IN EXCLUSIVE MODE');
  const { rows } = await client.query('SELECT count(*)::integer AS count FROM historical_events');
  if (rows[0].count) {
    throw new Error('Baza zawiera wydarzenia. Odtwarzaj eksport w pustej bazie; istniejące dane nie zostały zmienione.');
  }
  const columns = new Map();
  for (const table of ['event_categories', 'historical_events', 'event_sources']) {
    const result = await client.query(`
      SELECT attname FROM pg_attribute
      WHERE attrelid = $1::regclass AND attnum > 0 AND NOT attisdropped
        AND attname NOT IN ('id', 'created_by', 'updated_by')
    `, [table]);
    columns.set(table, result.rows.map(({ attname }) => attname));
  }
  const insert = async (table, record) => {
    const names = columns.get(table).filter((name) => Object.hasOwn(record, name));
    const quoted = names.map((name) => `"${name.replaceAll('"', '""')}"`).join(', ');
    const result = await client.query(`
      INSERT INTO ${table} (${quoted})
      SELECT ${quoted} FROM jsonb_populate_record(NULL::${table}, $1::jsonb)
      RETURNING id
    `, [JSON.stringify(record)]);
    return result.rows[0].id;
  };
  const categories = new Map();
  for (const { event, category, sources } of snapshot.events) {
    let categoryId = null;
    if (category) {
      if (!categories.has(category.name)) {
        const existing = await client.query('SELECT id FROM event_categories WHERE name = $1', [category.name]);
        categories.set(category.name, existing.rows[0]?.id ?? await insert('event_categories', category));
      }
      categoryId = categories.get(category.name);
    }
    const eventId = await insert('historical_events', { ...event, category_id: categoryId });
    for (const source of sources) await insert('event_sources', { ...source, event_id: eventId });
  }
}
