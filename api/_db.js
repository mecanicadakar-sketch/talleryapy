import { neon } from '@neondatabase/serverless';

let sqlClient;
export function getSql() {
  if (!sqlClient) {
    if (!process.env.DATABASE_URL) {
      throw new Error('Falta la variable de entorno DATABASE_URL (conexión a Neon).');
    }
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
  const sql = getSql();

  try {
    // Todas las creaciones/alteraciones de tablas van en UNA sola transacción
    // (un solo viaje de red) para evitar quedarnos sin tiempo si Neon tiene
    // que "despertar" la base de datos (plan gratuito con auto-suspend).
    await sql.transaction([
      sql`
        CREATE TABLE IF NOT EXISTS talleres (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          categoria TEXT DEFAULT '',
          ciudad TEXT DEFAULT '',
          direccion TEXT DEFAULT '',
          horario TEXT DEFAULT '',
          descripcion TEXT DEFAULT '',
          servicios JSONB DEFAULT '[]',
          telefono TEXT DEFAULT '',
          whatsapp TEXT DEFAULT '',
          email TEXT DEFAULT '',
          imagen TEXT DEFAULT '',
          lat DOUBLE PRECISION,
          lng DOUBLE PRECISION,
          estado TEXT DEFAULT 'pendiente',
          destacado BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `,
      sql`
        CREATE TABLE IF NOT EXISTS auspicios (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          categoria TEXT DEFAULT '',
          horario TEXT DEFAULT '',
          descripcion TEXT DEFAULT '',
          servicios JSONB DEFAULT '[]',
          direccion TEXT DEFAULT '',
          ciudad TEXT DEFAULT '',
          telefono TEXT DEFAULT '',
          whatsapp TEXT DEFAULT '',
          email TEXT DEFAULT '',
          imagen TEXT DEFAULT '',
          link TEXT DEFAULT '',
          lat DOUBLE PRECISION,
          lng DOUBLE PRECISION,
          destacado BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `,
      sql`
        CREATE TABLE IF NOT EXISTS categorias (
          id SERIAL PRIMARY KEY,
          nombre TEXT UNIQUE NOT NULL,
          orden INT DEFAULT 0
        )
      `,
      sql`
        CREATE TABLE IF NOT EXISTS productos (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          descripcion TEXT DEFAULT '',
          precio TEXT DEFAULT '',
          categoria TEXT DEFAULT '',
          imagen TEXT DEFAULT '',
          contacto TEXT DEFAULT '',
          whatsapp TEXT DEFAULT '',
          estado TEXT DEFAULT 'pendiente',
          destacado BOOLEAN DEFAULT false,
          folio SERIAL,
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `,
      sql`ALTER TABLE talleres ADD COLUMN IF NOT EXISTS destacado_solicitado BOOLEAN DEFAULT false`,
      sql`ALTER TABLE talleres ADD COLUMN IF NOT EXISTS auspicio_solicitado BOOLEAN DEFAULT false`,
      sql`ALTER TABLE talleres ADD COLUMN IF NOT EXISTS telefono_pago TEXT DEFAULT ''`,
      sql`ALTER TABLE talleres ADD COLUMN IF NOT EXISTS folio SERIAL`,
      sql`ALTER TABLE auspicios ADD COLUMN IF NOT EXISTS destacado_solicitado BOOLEAN DEFAULT false`,
      sql`ALTER TABLE auspicios ADD COLUMN IF NOT EXISTS telefono_pago TEXT DEFAULT ''`,
      sql`ALTER TABLE auspicios ADD COLUMN IF NOT EXISTS folio SERIAL`,
      sql`ALTER TABLE productos ADD COLUMN IF NOT EXISTS destacado_solicitado BOOLEAN DEFAULT false`,
      sql`ALTER TABLE productos ADD COLUMN IF NOT EXISTS telefono_pago TEXT DEFAULT ''`,
      sql`ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagenes JSONB DEFAULT '[]'`
    ]);
  } catch (e) {
    console.error('Error preparando la base de datos (migraciones):', e);
    throw e;
  }

  const countRows = await sql`SELECT COUNT(*)::int AS count FROM talleres`;
  if (countRows[0].count === 0) {
    await seedTalleres(sql);
  }
  const countAusp = await sql`SELECT COUNT(*)::int AS count FROM auspicios`;
  if (countAusp[0].count === 0) {
    await seedAuspicios(sql);
  }
  const countCat = await sql`SELECT COUNT(*)::int AS count FROM categorias`;
  if (countCat[0].count === 0) {
    await seedCategorias(sql);
  }

  schemaReady = true;
}

async function seedTalleres(sql) {
  const seed = [
    {
      id: 't1', nombre: 'Mecánica Cáceres', categoria: 'Mecánica General',
      ciudad: 'Encarnación (Itapúa)', direccion: 'Arroyo Pora, Encarnación (Itapúa)',
      horario: 'Lun-Vie 7:00 a 18:00 hs.', descripcion: 'Taller de mecánica general con más de 10 años de experiencia.',
      servicios: ['Motores', 'Mantenimientos', 'Frenos', 'Diagnóstico Computarizado'],
      whatsapp: '+59598 5143218', destacado: true
    },
    {
      id: 't2', nombre: 'Mecánica Dakar', categoria: 'Mecánica General',
      ciudad: 'Encarnación (Itapúa)', direccion: 'Barrio Santa María III km. 3.5 Ruta 6 detrás de Diesa, Encarnación (Itapúa)',
      horario: 'Lun-Vier 7:30 a 17:30', descripcion: 'Repuestos y servicios automotriz, diagnóstico computarizado e inyección electrónica.',
      servicios: ['Diagnóstico Computarizado', 'Frenos', 'Suspensión y Dirección'],
      whatsapp: '+59597 5635770', destacado: true
    },
    {
      id: 't3', nombre: 'Mecánica Dakar - Repuestos', categoria: 'Repuestos',
      ciudad: 'Encarnación (Itapúa)', direccion: 'Barrio Santa María III km. 3.5 Ruta 6 detrás de Diesa, Encarnación (Itapúa)',
      horario: 'Lun Vier 7:30 a17:30', descripcion: 'Auto-repuestos y servicios de inyección electrónica.',
      servicios: ['Accesorios', 'Frenos', 'Diagnóstico Computarizado'],
      whatsapp: '+59597 5635770', destacado: true
    }
  ];
  for (const t of seed) {
    await sql`
      INSERT INTO talleres (id, nombre, categoria, ciudad, direccion, horario, descripcion, servicios, whatsapp, estado, destacado)
      VALUES (${t.id}, ${t.nombre}, ${t.categoria}, ${t.ciudad}, ${t.direccion}, ${t.horario}, ${t.descripcion}, ${JSON.stringify(t.servicios)}::jsonb, ${t.whatsapp}, 'aprobado', ${t.destacado})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

async function seedAuspicios(sql) {
  await sql`
    INSERT INTO auspicios (id, nombre, categoria, descripcion)
    VALUES ('s1', 'Auto Repuestos Dakar', 'Repuestos', 'Venta de Repuestos Automotriz de Varias Marcas')
    ON CONFLICT (id) DO NOTHING
  `;
}

async function seedCategorias(sql) {
  const nombres = [
    "Mecánica General", "Electricidad Automotriz", "Carrocería y Pintura", "Frenos",
    "Suspensión y Dirección", "Alineación y Balanceo", "Diagnóstico Computarizado",
    "Inyección Electrónica", "Gomería", "Lavadero", "Grúa", "Repuestos",
    "Accesorios", "Estación de Servicio", "Servicios Múltiples", "Otros"
  ];
  for (let i = 0; i < nombres.length; i++) {
    await sql`
      INSERT INTO categorias (nombre, orden) VALUES (${nombres[i]}, ${i})
      ON CONFLICT (nombre) DO NOTHING
    `;
  }
}
