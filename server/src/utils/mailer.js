export async function sendPasswordResetEmail({ to, resetUrl }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME || "True North Productions",
        email: process.env.EMAIL_FROM,
      },
      to: [{ email: to }],
      subject: "Reset your password",
      htmlContent: `
        <p>You requested a password reset.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
      textContent: `You requested a password reset. Use this link: ${resetUrl}`,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Brevo API error: ${response.status} ${JSON.stringify(data)}`
    );
  }

  return data;
}