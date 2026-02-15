import "server-only";
import Ably from "ably";

const ablyApiKey = process.env.ABLY_API_KEY;

if (!ablyApiKey) {
  console.warn("ABLY_API_KEY not configured. Realtime features will be disabled.");
}

/**
 * Create an Ably server client instance
 */
export const createAblyServer = () => {
  if (!ablyApiKey) {
    return null;
  }

  return new Ably.Rest({ key: ablyApiKey });
};

/**
 * Get Ably server client instance
 */
export const getAblyServer = () => {
  return createAblyServer();
};
