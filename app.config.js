const { expo } = require("./app.json");

/** Bake EXPO_PUBLIC_* into extra so the APK still has keys if EAS env injection misses. */
module.exports = () => ({
  ...expo,
  extra: {
    ...(expo.extra || {}),
    supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim(),
    supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim(),
    lipilaMerchantId: (process.env.EXPO_PUBLIC_LIPILA_MERCHANT_ID || "").trim(),
    lipilaApiBase: (process.env.EXPO_PUBLIC_LIPILA_API_BASE || "").trim(),
  },
});
