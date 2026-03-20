export function requireTrustedOrigin(req, res, next) {
  const allowedOrigin = process.env.CLIENT_URL;
  const origin = req.get("origin");

  if (!origin || origin !== allowedOrigin) {
    return res.status(403).json({ error: "Invalid origin" });
  }

  next();
}