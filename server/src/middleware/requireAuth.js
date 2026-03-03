import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token; // or whatever you named it
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // e.g. { userId, email, ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}