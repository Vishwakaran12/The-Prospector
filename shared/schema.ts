import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
