import nodemailer from "nodemailer";

export async function sendPasswordResetEmail({ to, resetUrl }) {


  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });



  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Reset your password for True North Fact Quest",
    text: `You requested a password reset for your Fact Quest account. Use this link: ${resetUrl}`,
    html: `
      <p>You requested a password reset for your Fact Quest account.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}