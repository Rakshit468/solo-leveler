import nodemailer from "nodemailer";

const hasSmtpConfig = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  return value.trim().toLowerCase() === "true";
};

const getTransporter = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const secure =
    typeof process.env.SMTP_SECURE === "string"
      ? parseBoolean(process.env.SMTP_SECURE, smtpPort === 465)
      : smtpPort === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10000,
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 10000,
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 20000,
    requireTLS: parseBoolean(process.env.SMTP_REQUIRE_TLS, false),
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
