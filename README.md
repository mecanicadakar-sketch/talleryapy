# TallerYa

Sitio para encontrar talleres mecánicos en Encarnación (Itapúa), Paraguay. Backend con
funciones serverless de **Vercel** y base de datos **Postgres en Neon**.

## Estructura del proyecto

```
public/index.html      → todo el frontend (HTML + CSS + JS en un solo archivo)
api/_db.js              → conexión a Neon + creación de tablas + datos de ejemplo
api/_auth.js             → login del administrador (cookie firmada)
api/login.js              → POST /api/login
api/logout.js              → POST /api/logout
api/talleres/index.js       → GET (listar) y POST (postular) talleres
api/talleres/[id].js         → PATCH (editar/aprobar/rechazar/destacar) y DELETE
api/auspicios/index.js      → GET (listar) y POST (crear) auspicios
api/auspicios/[id].js        → PATCH y DELETE
```

## 1. Creá la base de datos en Neon

1. Entrá a [neon.tech](https://neon.tech) y creá un proyecto gratuito.
2. En el dashboard del proyecto, copiá el **Connection string** (elegí la versión
   "pooled connection", termina en `-pooler...`). Se ve así:
   ```
   postgresql://usuario:password@ep-xxxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```
3. Guardalo, lo vas a necesitar en el paso 3. No hace falta crear tablas a mano:
   la app las crea sola la primera vez que recibe una petición (y carga los talleres
   de ejemplo si la tabla está vacía).

## 2. Subí el proyecto a GitHub

```bash
cd tallerya-app
git init
git add .
git commit -m "TallerYa"
gh repo create tallerya --private --source=. --push
```
(o subilo a mano desde github.com si no usás la CLI de GitHub)

> El archivo `.gitignore` ya excluye `node_modules` y `.env`, así que tus credenciales
> no se suben al repositorio.

## 3. Desplegá en Vercel

1. Entrá a [vercel.com](https://vercel.com) → **Add New → Project** → importá el
   repositorio de GitHub que acabás de crear.
2. Antes de darle a "Deploy", abrí **Environment Variables** y cargá:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | el connection string de Neon del paso 1 |
   | `ADMIN_USER` | `Mangucho` |
   | `ADMIN_PIN` | `Cajiri120588#` |
   | `ADMIN_TOKEN_SECRET` | cualquier texto largo y aleatorio (ej: generalo en [1password.com/password-generator](https://1password.com/password-generator/)) |

3. Hacé clic en **Deploy**. En 1-2 minutos vas a tener tu URL pública
   (`https://tallerya-tuusuario.vercel.app`).

Listo — desde ese momento, todo lo que se postule o edite (talleres, auspicios,
imágenes, ubicación en el mapa) queda guardado en la base de datos de Neon y es
visible para **cualquiera** que entre al link, no solo en tu navegador.

## Actualizar el sitio más adelante

Cualquier cambio que quieras (diseño, textos, nuevas funciones) se hace editando los
archivos y hacés `git push`; Vercel vuelve a desplegar automáticamente en cada push.

## Notas

- El panel de Administrador usa **un solo usuario** (definido por las variables
  `ADMIN_USER` / `ADMIN_PIN`). Si querés cambiar la contraseña, solo actualizá esas
  variables de entorno en Vercel y volvé a desplegar (Vercel → Settings →
  Environment Variables → Redeploy).
- Las imágenes que se suben desde el formulario se comprimen en el navegador y se
  guardan como texto (base64) directamente en la base de datos — no necesitás un
  servicio de almacenamiento de archivos aparte. Para un uso normal de un taller
  esto funciona perfecto; si en el futuro cargás cientos de fotos en alta resolución,
  se puede migrar a un almacenamiento de archivos (ej. Vercel Blob) sin tocar el resto
  de la app.
- El mapa usa OpenStreetMap (gratuito, sin API key) y necesita conexión a internet
  para mostrar las calles — igual que Google Maps.
