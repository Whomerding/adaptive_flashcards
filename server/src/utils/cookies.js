
export function cookieOptions(isProd = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  };
}