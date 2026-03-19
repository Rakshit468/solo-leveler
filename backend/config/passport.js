import dotenv from "dotenv";
dotenv.config();
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import User from "../models/User.js";

// Automatically pick callback URL based on environment
const isProduction = process.env.NODE_ENV === "production";
const callbackBaseURL = isProduction
  ? process.env.API_URL // e.g., https://solo-leveler-production.up.railway.app
  : "http://localhost:5000";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${callbackBaseURL}/api/auth/google/callback`,
      proxy: true, // important for Railway/Heroku
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ "google.id": profile.id });

        if (!user) {
          // Check if a user with this email already exists
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Link Google account to the existing user
            user.google.id = profile.id;
            user.google.displayName = profile.displayName;
            user.isEmailVerified = true;
            await user.save();
          } else {
            // Create a new user with a unique username
            const newUsername = `${profile.displayName.replace(
              /\s/g,
              ""
            )}_${crypto.randomBytes(4).toString("hex")}`;
            user = await User.create({
              username: newUsername,
              email: profile.emails[0].value,
              isEmailVerified: true,
              google: {
                id: profile.id,
                displayName: profile.displayName,
              },
              character: {
                name: profile.displayName,
              },
            });
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;
