import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type SchoolLevel = "elementary" | "junior_high" | "senior_high";
export type GradeLevel = "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12";
export type PositionCategory = "Executive" | "Legislative" | "Departmental";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  referenceNumber: text("reference_number").notNull().unique(),
  studentName: text("student_name").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  votes: text("votes").array().notNull().default([]),
  schoolLevel: text("school_level"),
  gradeLevel: text("grade_level"),
  hasVoted: boolean("has_voted").notNull().default(false), // Added hasVoted field
});

export const partyLists = pgTable("party_lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  color: text("color").notNull().default("#0088FE"),
  platformImageUrl: text("platform_image_url"),
  partyListImages: text("party_list_images").array().default([]),
});

export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull(),
  maxVotes: integer("max_votes").notNull().default(1),
  category: text("category").notNull().default("Executive"),
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  positionId: integer("position_id").notNull(),
  partyListId: integer("party_list_id").notNull(),
  voteCount: integer("vote_count").notNull().default(0),
  schoolLevels: text("school_levels").array().notNull().default([]),
  gradeLevels: text("grade_levels").array().notNull().default([]),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  leftLogoUrl: text("left_logo_url").notNull(),
  rightLogoUrl: text("right_logo_url").notNull(),
  splashLogoUrl: text("splash_logo_url").notNull().default("https://images.unsplash.com/photo-1580982773321-5c9f15ea8559?w=128&h=128&fit=crop"),
  votingLogoUrl: text("voting_logo_url").notNull().default(""), // Added votingLogoUrl field
});

export const positionSchema = createInsertSchema(positions).extend({
  maxVotes: z.number().min(1).default(1),
  category: z.enum(["Executive", "Legislative", "Departmental"]).default("Executive"),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    referenceNumber: true,
    studentName: true,
  })
  .extend({
    referenceNumber: z.string().min(5).max(50),
    studentName: z.string().min(2).max(100),
  });

export const loginSchema = createInsertSchema(users)
  .pick({
    referenceNumber: true,
    studentName: true,
  });

export const candidateSchema = createInsertSchema(candidates);
export const systemSettingsSchema = createInsertSchema(systemSettings);
export const partyListSchema = createInsertSchema(partyLists);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type PartyList = typeof partyLists.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type SystemSettings = typeof systemSettings.$inferSelect;