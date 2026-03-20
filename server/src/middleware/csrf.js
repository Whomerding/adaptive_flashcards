export function requireCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers["x-csrf-token"];
  const csrfBody = req.body?.csrfToken;
  const csrf = csrfHeader || csrfBody;

  console.log("CSRF check", {
    method: req.method,
    path: req.path,
    csrfCookie,
    csrfHeader,
    csrfBody,
    cookies: req.cookies,
  });

  if (!csrfCookie || !csrf || csrfCookie !== csrf) {
    return res.status(403).json({ error: "CSRF check failed" });
  }

  next();
}