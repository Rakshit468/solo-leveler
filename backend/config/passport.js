import dotenv from "dotenv";
dotenv.config();
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import User from "../models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${
        process.env.API_URL || "http://localhost:5000"
      }/api/auth/google/callback`,
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ "google.id": profile.id });

        if (!user) {
          // Check if a user with this email already exists (e.g., local account)
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Link Google account to the existing local user
            user.google.id = profile.id;
            user.google.displayName = profile.displayName;
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
