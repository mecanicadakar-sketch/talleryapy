import { getSql, ensureSchema } from '../_db.js';
import { isAuthorized } from '../_auth.js';

function rowToAuspicio(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    categoria: r.categoria,
    horario: r.horario,
    descripcion: r.descripcion,
    servicios: r.servicios || [],
    direccion: r.direccion,
    ciudad: r.ciudad,
    telefono: r.telefono,
    whatsapp: r.whatsapp,
    email: r.email,
    imagen: r.imagen,
    link: r.link,
    ubicacion: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null,
    destacado: r.destacado
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  await ensureSchema();
  const sql = getSql();

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM auspicios ORDER BY created_at DESC`;
    res.status(200).json(rows.map(rowToAuspicio));
    return;
  }

  if (req.method === 'POST') {
    if (!isAuthorized(req)) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    const b = req.body || {};
    if (!b.nombre) {
      res.status(400).json({ error: 'Falta el nombre del auspicio.' });
      return;
    }
    const id = 's' + Date.now() + Math.random().toString(36).slice(2, 7);
    const servicios = JSON.stringify(b.servicios || []);
    const lat = b.ubicacion ? b.ubicacion.lat : null;
    const lng = b.ubicacion ? b.ubicacion.lng : null;

    await sql`
      INSERT INTO auspicios (id, nombre, categoria, horario, descripcion, servicios, direccion, ciudad, telefono, whatsapp, email, imagen, link, lat, lng, destacado)
      VALUES (${id}, ${b.nombre}, ${b.categoria || ''}, ${b.horario || ''}, ${b.descripcion || ''}, ${servicios}::jsonb, ${b.direccion || ''}, ${b.ciudad || ''}, ${b.telefono || ''}, ${b.whatsapp || ''}, ${b.email || ''}, ${b.imagen || ''}, ${b.link || ''}, ${lat}, ${lng}, false)
    `;
    res.status(201).json({ ok: true, id });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
