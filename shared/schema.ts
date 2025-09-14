import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced User schema with personalization features
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatar: text("avatar"), // Profile picture URL
  timezone: text("timezone").default('UTC'),
  preferences: jsonb("preferences"), // User preferences for newsletter, notifications, etc.
  interests: jsonb("interests"), // Manual interests for newsletter generation
  newsletterEnabled: boolean("newsletter_enabled").default(true),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chats schema - conversations belonging to users
export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  isArchived: boolean("is_archived").default(false),
  tags: jsonb("tags"), // Array of tags for chat categorization
  metadata: jsonb("metadata"), // Additional chat metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat Messages schema
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  contentType: text("content_type").default('text'), // 'text', 'markdown', 'code', 'image'
  metadata: jsonb("metadata"), // Additional message metadata (tokens, model used, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

// User Behavior Tracking for newsletter personalization
export const userBehavior = pgTable("user_behavior", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // 'view_content', 'bookmark', 'search', 'chat_message', etc.
  entityType: text("entity_type"), // 'content', 'chat', 'calendar_event'
  entityId: varchar("entity_id"), // ID of the entity being interacted with
  context: jsonb("context"), // Additional context about the action
  timestamp: timestamp("timestamp").defaultNow(),
});

// Newsletter schema
export const newsletters = pgTable("newsletters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  content: text("content").notNull(), // Generated newsletter content
  contentHtml: text("content_html"), // HTML version
  topics: jsonb("topics"), // Array of topics covered
  sentAt: timestamp("sent_at"),
  status: text("status").default('draft'), // 'draft', 'sent', 'failed'
  generationMetadata: jsonb("generation_metadata"), // How it was generated
  createdAt: timestamp("created_at").defaultNow(),
});

// Content schema - for scraped/discovered content
export const content = pgTable("content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  title: text("title"),
  description: text("description"),
  content: text("content"), // Scraped content
  contentType: text("content_type").notNull(), // 'article', 'video', 'image', etc.
  metadata: jsonb("metadata"), // Additional scraped metadata
  scrapedAt: timestamp("scraped_at").defaultNow(),
  isProcessed: boolean("is_processed").default(false),
  geminiAnalysis: jsonb("gemini_analysis"), // AI analysis results
});

// Claims schema - for user claims on content
export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  contentId: varchar("content_id").notNull().references(() => content.id),
  claimType: text("claim_type").notNull(), // 'bookmark', 'favorite', 'research', 'todo'
  status: text("status").notNull().default('active'), // 'active', 'archived', 'deleted'
  notes: text("notes"),
  tags: jsonb("tags"), // Array of tags
  priority: text("priority").default('medium'), // 'low', 'medium', 'high'
  claimedAt: timestamp("claimed_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertContentSchema = createInsertSchema(content).pick({
  url: true,
  title: true,
  description: true,
  content: true,
  contentType: true,
  metadata: true,
  isProcessed: true,
  geminiAnalysis: true,
});

export const insertClaimSchema = createInsertSchema(claims).pick({
  userId: true,
  contentId: true,
  claimType: true,
  status: true,
  notes: true,
  tags: true,
  priority: true,
});

// URL validation schema
// Simplified URL schema without security restrictions
export const urlSchema = z.string().url("Must be a valid URL");

// Content discovery request schema
export const contentDiscoverySchema = z.object({
  url: urlSchema.optional(),
  query: z.string().min(1).max(500).optional(),
  useGemini: z.boolean().default(true),
}).refine(
  (data) => !!(data.url || data.query),
  "Either 'url' or 'query' must be provided"
).refine(
  (data) => !(data.url && data.query),
  "Cannot provide both 'url' and 'query' - choose one"
);

// Batch scrape request schema
export const batchScrapeSchema = z.object({
  urls: z.array(urlSchema)
    .min(1, "At least one URL is required")
    .max(10, "Maximum 10 URLs allowed per batch")
    .refine((urls) => {
      const uniqueUrls = new Set(urls);
      return uniqueUrls.size === urls.length;
    }, "Duplicate URLs are not allowed")
});

// Search query schema
export const searchQuerySchema = z.object({
  q: z.string()
    .min(1, "Search query is required")
    .max(200, "Search query too long")
    .regex(/^[\w\s\-\.\,\!\?]+$/, "Search query contains invalid characters"),
  type: z.enum(['article', 'video', 'image', 'document', 'webpage']).optional(),
  limit: z.coerce.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(50, "Limit cannot exceed 50")
    .default(10)
});

// Content analysis request schema
export const contentAnalysisSchema = z.object({
  contentId: z.string().uuid("Invalid content ID format")
});

// User claims query schema
export const claimsQuerySchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  type: z.enum(['bookmark', 'favorite', 'research', 'todo']).optional(),
  includeContent: z.enum(['true', 'false']).default('false')
    .transform((val) => val === 'true')
});

// Recommendations query schema
export const recommendationsQuerySchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  limit: z.coerce.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(20, "Limit cannot exceed 20")
    .default(5)
});

// Legacy search schema (kept for backward compatibility)
export const searchRequestSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  contentType: z.enum(['article', 'video', 'image', 'any']).default('any'),
  limit: z.number().min(1).max(50).default(10),
  useGemini: z.boolean().default(true),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;

export type Claim = typeof claims.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;

export type ContentDiscoveryRequest = z.infer<typeof contentDiscoverySchema>;
export type BatchScrapeRequest = z.infer<typeof batchScrapeSchema>;
export type SearchQueryRequest = z.infer<typeof searchQuerySchema>;
export type ContentAnalysisRequest = z.infer<typeof contentAnalysisSchema>;
export type ClaimsQueryRequest = z.infer<typeof claimsQuerySchema>;
export type RecommendationsQueryRequest = z.infer<typeof recommendationsQuerySchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;

// MongoDB-compatible document types (for future migration)
export interface MongoContent {
  _id?: string;
  url: string;
  title?: string;
  description?: string;
  content?: string;
  contentType: string;
  metadata?: Record<string, any>;
  scrapedAt: Date;
  isProcessed: boolean;
  geminiAnalysis?: Record<string, any>;
}

export interface MongoClaim {
  _id?: string;
  userId: string;
  contentId: string;
  claimType: string;
  status: string;
  notes?: string;
  tags?: string[];
  priority: string;
  claimedAt: Date;
  updatedAt: Date;
}
