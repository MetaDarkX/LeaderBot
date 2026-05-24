// ============================================================
//  web/auth.js
//  Autenticação opcional via WEB_TOKEN (HTTP + Socket.IO).
// ============================================================

/**
 * Middleware Express: exige token em rotas /api/* quando configurado.
 * GET / e assets estáticos permanecem públicos.
 */
export function createApiAuthMiddleware(token) {
  if (!token) return (_req, _res, next) => next();

  return (req, res, next) => {
    if (!req.path.startsWith('/api')) return next();
    const sent =
      req.headers['x-auth-token'] ||
      (req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
      (req.method === 'GET' && typeof req.query.token === 'string' ? req.query.token : '');
    if (sent === token) return next();
    return res.status(401).json({ error: 'unauthorized' });
  };
}

/**
 * Middleware Socket.IO: exige token no handshake quando configurado.
 */
export function createSocketAuthMiddleware(token) {
  if (!token) return null;

  return (socket, next) => {
    const sent =
      socket.handshake.auth?.token ||
      socket.handshake.headers['x-auth-token'];
    if (sent === token) return next();
    return next(new Error('unauthorized'));
  };
}
