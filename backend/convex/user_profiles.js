import { query } from "./_generated/server";
import { v } from "convex/values";

function assertInternalKey(providedKey) {
  const expectedKey = process.env.CONVEX_INTERNAL_API_KEY;
  if (!expectedKey || providedKey !== expectedKey) {
    throw new Error("Unauthorized");
  }
}

export const get = query({
  args: { internal_key: v.string() },
  handler: async ({ db }, args) => {
    assertInternalKey(args.internal_key);
    return await db.query("user_profiles").collect();
  },
});
