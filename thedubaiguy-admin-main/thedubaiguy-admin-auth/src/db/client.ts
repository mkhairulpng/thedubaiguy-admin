import { drizzle } from "drizzle-orm/d1";
export function getDb(DB: D1Database) { return drizzle(DB); }
