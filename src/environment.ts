import { logger } from "./logger";

export enum Environment {
  DEV = "dev",
  STAGING = "staging",
  PRODUCTION = "production"
}

const JWT_SECRET_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\!\@\#\$\%\^\&\*\(\)\_\+])[0-9a-zA-Z\!\@\#\$\%\^\&\*\(\)\_\+\/\,\.\<\\\>\{\}\[\]\;\:\`\-\+\=]{64,}$/;
const IPFS_URL_REGEX = /^http(s)?:\/\/[a-zA-Z0-9\%\.\_\+\~\#\=]{1,256}\:[0-9]{1,5}([a-zA-Z0-9\(\)\@\:\%\_\+\.\~\#\?\&\/\=]*)$/;
const MONGO_HOST_REGEX = /^[a-zA-Z0-9\%\.\_\+\~\#\=\-]{1,256}$/;
const MONGO_API_USER_REGEX = /^[a-zA-Z0-9]{1,64}$/;
const SENDGRID_API_KEY_REGEX = /^SG\..{1,256}$/;
const MONGO_ROOT_PASS_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\!\@\#\$\%\^\&\*\(\)\_\+])[0-9a-zA-Z\!\@\#\$\%\^\&\*\(\)\_\+\/\,\.\<\\\>\{\}\[\]\;\:\`\-\+\=]{15,}$/;

// Check all environment variables are properly set and valid, exit if not
export function validateEnvironment() {
  try {
    // Check environment is properly set
    if (
      !process.env.WESTEGG_ENV ||
      (Environment.DEV !== process.env.WESTEGG_ENV &&
        Environment.STAGING !== process.env.WESTEGG_ENV &&
        Environment.PRODUCTION !== process.env.WESTEGG_ENV)
    ) {
      throw new Error(
        'Environment not set to "dev", "staging", or "production"!'
      );
    }

    // Warn on "dev" environment set
    if (Environment.DEV === process.env.WESTEGG_ENV) {
      logger.warn("Environment set to dev, DO NOT RUN IN PRODUCTION!");
    }

    // Validate JWT secret
    if (!process.env.JWT_SECRET) {
      throw new Error("No JWT secret key set!");
    } else if (
      Environment.PRODUCTION === process.env.WESTEGG_ENV ||
      Environment.STAGING === process.env.WESTEGG_ENV
    ) {
      let regexMatch = process.env.JWT_SECRET.match(
        JWT_SECRET_REGEX
      ) as string[];
      let matchString = regexMatch?.join("");
      if (matchString !== process.env.JWT_SECRET) {
        throw new Error("JWT secret key not complex enough!");
      }
    }

    // Validate MongoDB related environment variables
    if (
      !process.env.MONGO_PROTOCOL ||
      (process.env.MONGO_PROTOCOL !== "mongodb" &&
        process.env.MONGO_PROTOCOL !== "mongodb+srv")
    ) {
      throw new Error("MongoDB protocol missing or malformed!");
    }

    if (!process.env.MONGO_HOST) {
      throw new Error("MongoDB host missing!");
    } else {
      let regexMatch = process.env.MONGO_HOST?.match(
        MONGO_HOST_REGEX
      ) as string[];
      let matchString = regexMatch?.join("");
      if (matchString !== process.env.MONGO_HOST) {
        throw new Error("MongoDB host malformed!");
      }
    }

    if (!process.env.MONGO_API_PASS) {
      throw new Error("MongoDB api password missing!");
    } else if (
      Environment.PRODUCTION === process.env.WESTEGG_ENV ||
      Environment.STAGING === process.env.WESTEGG_ENV
    ) {
      let regexMatch = process.env.MONGO_API_PASS.match(
        MONGO_ROOT_PASS_REGEX
      ) as string[];
      let matchString = regexMatch?.join("");
      if (matchString !== process.env.MONGO_API_PASS) {
        throw new Error("MongoDB API password not complex enough!");
      }
    }

    // Validate MongoDB Root Password
    if (!process.env.MONGO_ROOT_PASS) {
      throw new Error("No MongoDB root password set!");
    } else if (
      Environment.PRODUCTION === process.env.WESTEGG_ENV ||
      Environment.STAGING === process.env.WESTEGG_ENV
    ) {
      let regexMatch = process.env.MONGO_ROOT_PASS.match(
        MONGO_ROOT_PASS_REGEX
      ) as string[];
      let matchString = regexMatch?.join("");
      if (matchString !== process.env.MONGO_ROOT_PASS) {
        throw new Error("MongoDB root password not complex enough!");
      }
    }

    if (!process.env.MONGO_API_USER) {
      throw new Error("MongoDB api user missing!");
    } else {
      let regexMatch = process.env.MONGO_API_USER.match(
        MONGO_API_USER_REGEX
      ) as string[];
      let matchString = regexMatch?.join("");
      if (matchString !== process.env.MONGO_API_USER) {
        throw new Error("MongoDB api user malformed!");
      }
    }

    // Validate IPFS host url
    if (
      Environment.PRODUCTION === process.env.WESTEGG_ENV ||
      Environment.STAGING === process.env.WESTEGG_ENV
    ) {
      let regexMatch = process.env.IPFS_URL?.match(IPFS_URL_REGEX) as string[];
      let matchString = regexMatch?.join("");
      if (matchString !== process.env.IPFS_URL || !process.env.IPFS_URL) {
        throw new Error("IPFS host missing or malformed!");
      }
    }

    // Validate Sendgrid API key
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SendGrid API key missing!");
    } else if (
      Environment.PRODUCTION === process.env.WESTEGG_ENV ||
      Environment.STAGING === process.env.WESTEGG_ENV
    ) {
      let regexMatch = process.env.SENDGRID_API_KEY.match(
        SENDGRID_API_KEY_REGEX
      ) as string[];
      let matchString = regexMatch?.join("");
      if (matchString !== process.env.SENDGRID_API_KEY) {
        throw new Error("SendGrid API key malformed!");
      }
    }
  } catch (error) {
    logger.error(`FATAL: ${error}`);
    process.exit(1);
  }
}
