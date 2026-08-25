import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// Admin users. Passwords are stored ONLY as PBKDF2 hashes (see auth.ts hashPassword).
export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),  // pbkdf2$iter$salt$hash — NEVER a plaintext password
  name: text("name"),
  createdAt: text("created_at"),
});

export const qrLoginSessions = sqliteTable("qr_login_sessions", {
  id: text("id").primaryKey(),
  scanTokenHash: text("scan_token_hash").notNull(),
  pollTokenHash: text("poll_token_hash").notNull(),
  userId: integer("user_id"),
  status: text("status").notNull().default("pending"),
  nextPath: text("next_path").notNull().default("/admin"),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  approvedAt: text("approved_at"),
  claimedAt: text("claimed_at"),
});
