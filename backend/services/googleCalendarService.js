import jwt from "jsonwebtoken";
import { google } from "googleapis";

const getRedirectUri = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const apiBase = isProduction ? process.env.API_URL : "http://localhost:5000";
  return `${apiBase}/api/quests/google-calendar/callback`;
};

const createOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
};

const formatLocalDate = (dateValue) => {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateInTimeZone = (dateValue, timeZone = "UTC") => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(dateValue));
};

const addDaysToDateString = (dateString, days) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return formatLocalDate(utcDate);
};

export const buildGoogleCalendarAuthUrl = (userId) => {
  const oauth2Client = createOAuthClient();

  const state = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "openid",
    ],
    state,
  });

  return authUrl;
};

export const exchangeGoogleCalendarCode = async (code, state) => {
  const decoded = jwt.verify(state, process.env.JWT_SECRET);
  const oauth2Client = createOAuthClient();

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
  const userInfo = await oauth2.userinfo.get();

  return {
    userId: decoded.userId,
    tokens,
    calendarEmail: userInfo.data.email,
  };
};

const getQuestEventTimes = (quest) => {
  const timeZone = quest.timezone || "UTC";

  if (quest.startDateTime) {
    const start = new Date(quest.startDateTime);
    const end = quest.endDateTime
      ? new Date(quest.endDateTime)
      : new Date(start.getTime() + 60 * 60 * 1000);

    return {
      start: { dateTime: start.toISOString(), timeZone },
      end: { dateTime: end.toISOString(), timeZone },
    };
  }

  if (quest.dueDate) {
    const dateInZone = formatDateInTimeZone(quest.dueDate, timeZone);
    const nextDateInZone = addDaysToDateString(dateInZone, 1);

    return {
      start: { date: dateInZone },
      end: { date: nextDateInZone },
    };
  }

  return null;
};

const getCalendarClientForUser = (user) => {
  const integration = user.integrations?.googleCalendar;
  if (!integration?.connected) {
    return null;
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
    scope: integration.scope,
    expiry_date: integration.expiryDate
      ? new Date(integration.expiryDate).getTime()
      : undefined,
  });

  return {
    oauth2Client,
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
  };
};

export const syncQuestWithGoogleCalendar = async (user, quest) => {
  const client = getCalendarClientForUser(user);
  const eventTimes = getQuestEventTimes(quest);

  if (!client || !eventTimes) {
    return null;
  }

  const eventPayload = {
    summary: quest.title,
    description: quest.description || "Solo Leveling quest",
    ...eventTimes,
    extendedProperties: {
      private: {
        questId: String(quest._id),
      },
    },
    reminders: {
      useDefault: true,
    },
  };

  let response;

  if (quest.googleCalendarEventId) {
    response = await client.calendar.events.update({
      calendarId: "primary",
      eventId: quest.googleCalendarEventId,
      requestBody: eventPayload,
    });
  } else {
    response = await client.calendar.events.insert({
      calendarId: "primary",
      requestBody: eventPayload,
    });
  }

  return response.data;
};

export const removeGoogleCalendarEvent = async (user, eventId) => {
  if (!eventId) {
    return;
  }

  const client = getCalendarClientForUser(user);
  if (!client) {
    return;
  }

  try {
    await client.calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
  } catch (error) {
    // Ignore not-found errors to keep local delete resilient.
    if (error?.code !== 404) {
      throw error;
    }
  }
};
