/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _internalAuth from "../_internalAuth.js";
import type * as convex_dispute_chat from "../convex_dispute_chat.js";
import type * as convex_escrows from "../convex_escrows.js";
import type * as convex_transactions from "../convex_transactions.js";
import type * as user_profiles from "../user_profiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _internalAuth: typeof _internalAuth;
  convex_dispute_chat: typeof convex_dispute_chat;
  convex_escrows: typeof convex_escrows;
  convex_transactions: typeof convex_transactions;
  user_profiles: typeof user_profiles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
