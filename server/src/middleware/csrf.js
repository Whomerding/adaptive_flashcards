export function requireCsrf(req, res, next) {
  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers["x-csrf-token"];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: "CSRF check failed" });
  }

  next();
}