// Re-export all mocks for convenience
export * from "./mongoose.js";
export * from "./auth.js";
export * from "./stripe.js";
export * from "./fs.js";
export * from "./resend.js";

// Combined reset function
import { resetAllMocks as resetMongooseMocks } from "./mongoose.js";
import { resetAuthMocks } from "./auth.js";
import { resetStripeMocks } from "./stripe.js";
import { resetFsMocks } from "./fs.js";
import { resetResendMocks } from "./resend.js";

export const resetAllMocks = () => {
  resetMongooseMocks();
  resetAuthMocks();
  resetStripeMocks();
  resetFsMocks();
  resetResendMocks();
};
