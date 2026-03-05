import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {

  try {
    const token = req.cookies?.access_token; // or whatever you named it
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { parentId: decoded.parentId };
    console.log("Authenticated user:", req.user);
next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}