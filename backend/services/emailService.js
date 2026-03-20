import nodemailer from "nodemailer";
import { google } from "googleapis";

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

const hasGmailApiConfig = () => {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  return Boolean(clientId && clientSecret && process.env.GMAIL_REFRESH_TOKEN);
};

const buildOtpHtml = ({ otp, username }) => `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
    <h2 style="margin: 0 0 16px; color: #111827;">Verify your email</h2>
    <p style="color: #374151;">Hi ${username || "Hunter"}, use the OTP below to complete your signup.</p>
    <div style="margin: 20px 0; padding: 14px 18px; background: #f3f4f6; border-radius: 10px; text-align: center; letter-spacing: 8px; font-size: 28px; font-weight: 700; color: #111827;">
      ${otp}
    </div>
    <p style="color: #6b7280; margin: 0;">This code expires in 10 minutes.</p>
  </div>
`;

const toBase64Url = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const getTimeouts = () => ({
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10000,
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 10000,
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 20000,
});

const getPrimaryTransportConfig = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const secure =
    typeof process.env.SMTP_SECURE === "string"
      ? parseBoolean(process.env.SMTP_SECURE, smtpPort === 465)
      : smtpPort === 465;

  return {
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure,
    requireTLS: parseBoolean(process.env.SMTP_REQUIRE_TLS, false),
  };
};

const buildTransportConfigs = () => {
  const primary = getPrimaryTransportConfig();
  if (!primary) {
    return [];
  }

  const configs = [primary];
  const smtpUser = (process.env.SMTP_USER || "").toLowerCase();
  const isGmailUser = smtpUser.endsWith("@gmail.com") || smtpUser.endsWith("@googlemail.com");
  const forceGmailFallback = parseBoolean(process.env.SMTP_FORCE_GMAIL_FALLBACK, true);

  if (isGmailUser && forceGmailFallback) {
    configs.push(
      {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
      },
      {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        requireTLS: false,
      }
    );
  }

  const seen = new Set();
  return configs.filter((config) => {
    const key = `${config.host}:${config.port}:${config.secure}:${config.requireTLS}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sendWithTransportConfig = async (config, mailOptions) => {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    requireTLS: config.requireTLS,
    ...getTimeouts(),
  });

  return transporter.sendMail(mailOptions);
};

const sendWithGmailApi = async (mailOptions) => {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({
    version: "v1",
    auth: oauth2Client,
  });

  const rawMessage = [
    `From: ${mailOptions.from}`,
    `To: ${mailOptions.to}`,
    `Subject: ${mailOptions.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    mailOptions.html,
  ].join("\r\n");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: toBase64Url(rawMessage),
    },
  });
};

export const sendOtpEmail = async ({ to, otp, username }) => {
  const gmailApiOnly = parseBoolean(process.env.GMAIL_API_ONLY, false);
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transportConfigs = gmailApiOnly ? [] : buildTransportConfigs();

  const mailOptions = {
    from: fromEmail,
    to,
    subject: "Your Solo Leveling verification code",
    html: buildOtpHtml({ otp, username }),
  };

  const errors = [];
  if (transportConfigs.length) {
    for (const config of transportConfigs) {
      try {
        await sendWithTransportConfig(config, mailOptions);
        return;
      } catch (error) {
        errors.push(
          `${config.host}:${config.port} secure=${config.secure} tls=${config.requireTLS} -> ${error?.code || error?.message || "unknown error"}`
        );
      }
    }
  } else {
    errors.push("SMTP not configured");
  }

  if (hasGmailApiConfig()) {
    try {
      await sendWithGmailApi(mailOptions);
      return;
    } catch (error) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.response?.data?.error ||
        error?.message ||
        error?.code ||
        "unknown error";
      const status = error?.response?.status || error?.status || "";
      errors.push(`gmail-api -> ${status ? `HTTP ${status}: ` : ""}${detail}`);
    }
  } else {
    errors.push("gmail-api -> missing GMAIL_REFRESH_TOKEN (and/or client credentials)");
  }

  if (!transportConfigs.length && !hasGmailApiConfig()) {
    console.log(`[OTP DEV FALLBACK] ${to} -> ${otp}`);
    return;
  }

  throw new Error(`All SMTP transport attempts failed. ${errors.join(" | ")}`);
};
