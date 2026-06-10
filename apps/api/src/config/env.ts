interface RequiredEnv {
  MONGODB_URI: string;
  GOOGLE_CLIENT_ID: string;
  JWT_SECRET: string;
  FINNHUB_API_KEY: string;
}

type AppEnvKey =
  | keyof RequiredEnv
  | "APPLE_CLIENT_ID"
  | "APPLE_TEAM_ID"
  | "APPLE_KEY_ID"
  | "APPLE_PRIVATE_KEY"
  | "APPLE_REDIRECT_URI";

const requiredKeys = [
  "MONGODB_URI",
  "GOOGLE_CLIENT_ID",
  "JWT_SECRET",
  "FINNHUB_API_KEY",
] as const;

export function validateEnv(env: NodeJS.ProcessEnv): RequiredEnv {
  const missing = requiredKeys.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const mongodbUri = env.MONGODB_URI;
  const googleClientId = env.GOOGLE_CLIENT_ID;
  const jwtSecret = env.JWT_SECRET;
  const finnhubApiKey = env.FINNHUB_API_KEY;

  if (!mongodbUri || !googleClientId || !jwtSecret || !finnhubApiKey) {
    throw new Error("Required environment validation failed");
  }

  return {
    MONGODB_URI: mongodbUri,
    GOOGLE_CLIENT_ID: googleClientId,
    JWT_SECRET: jwtSecret,
    FINNHUB_API_KEY: finnhubApiKey,
  };
}

export function getRequiredEnv(key: keyof RequiredEnv): string {
  const value = getOptionalEnv(key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getRequiredAuthEnv(key: AppEnvKey): string {
  const value = getOptionalEnv(key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getOptionalEnv(key: AppEnvKey): string | undefined {
  const value = process.env[key];
  return value && value.trim() ? value : undefined;
}

export function getOptionalPrivateKeyEnv(
  key: Extract<AppEnvKey, "APPLE_PRIVATE_KEY">,
): string | undefined {
  return getOptionalEnv(key)?.replace(/\\n/g, "\n");
}
