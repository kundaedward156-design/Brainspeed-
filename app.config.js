const { expo } = require("./app.json");

/**
 * Bake the two PUBLIC Supabase values into the build so the APK works even if EAS
 * env injection misses. Nothing secret is read here.
 */
module.exports = () => ({
  ...expo,
  extra: {
    ...(expo.extra || {}),
    supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim(),
    supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim(),
  },
});
