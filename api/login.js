import { checkCredentials, setAuthCookie } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { user, pin } = req.body || {};
  if (!checkCredentials(user, pin)) {
    res.status(401).json({ ok: false, error: 'Usuario o PIN incorrecto.' });
    return;
  }
  setAuthCookie(res);
  res.status(200).json({ ok: true });
}
