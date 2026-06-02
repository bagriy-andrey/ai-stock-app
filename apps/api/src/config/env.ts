interface RequiredEnv {
  MONGODB_URI: string;
  GOOGLE_CLIENT_ID: string;
  JWT_SECRET: string;
}

const requiredKeys = [
  "MONGODB_URI",
  "GOOGLE_CLIENT_ID",
  "JWT_SECRET",
] as const;

export function validateEnv(env: NodeJS.ProcessEnv): RequiredEnv {
  const missing = requiredKeys.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const mongodbUri = env.MONGODB_URI;
  const googleClientId = env.GOOGLE_CLIENT_ID;
  const jwtSecret = env.JWT_SECRET;

  if (!mongodbUri || !googleClientId || !jwtSecret) {
    throw new Error("Required environment validation failed");
  }

  return {
    MONGODB_URI: mongodbUri,
    GOOGLE_CLIENT_ID: googleClientId,
    JWT_SECRET: jwtSecret,
  };
}

export function getRequiredEnv(key: keyof RequiredEnv): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
