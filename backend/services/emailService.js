import nodemailer from "nodemailer";

const hasSmtpConfig = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
};

const getTransporter = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendOtpEmail = async ({ to, otp, username }) => {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[OTP DEV FALLBACK] ${to} -> ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: fromEmail,
    to,
    subject: "Your Solo Leveling verification code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
        <h2 style="margin: 0 0 16px; color: #111827;">Verify your email</h2>
        <p style="color: #374151;">Hi ${username || "Hunter"}, use the OTP below to complete your signup.</p>
        <div style="margin: 20px 0; padding: 14px 18px; background: #f3f4f6; border-radius: 10px; text-align: center; letter-spacing: 8px; font-size: 28px; font-weight: 700; color: #111827;">
          ${otp}
        </div>
        <p style="color: #6b7280; margin: 0;">This code expires in 10 minutes.</p>
      </div>
    `,
  });
};
