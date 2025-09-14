import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapeUrl, scrapeMultipleUrls } from "./services/scraper-simple";
import { analyzeContent, generateContentRecommendations } from "./services/gemini";
import { searchWeb, searchPlatformSpecific } from "./services/websearch";
import { 
  insertContentSchema, 
  insertClaimSchema, 
  contentDiscoverySchema,
  batchScrapeSchema,
  searchQuerySchema,
  contentAnalysisSchema,
  claimsQuerySchema,
  recommendationsQuerySchema,
  searchRequestSchema,
  type Content,
  type Claim,
  type ContentDiscoveryRequest,
  type BatchScrapeRequest,
  type SearchQueryRequest
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "OK", message: "Server is running" });
  });

  // User Personalization Routes
  
  // POST /api/users/:userId/chats - Create a new chat
  app.post("/api/users/:userId/chats", async (req, res) => {
    try {
      const { userId } = req.params;
      const { title, description } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Chat title is required" });
      }
      
      const chat = await storage.createChat(userId, title, description);
      
      // Track user behavior
      await storage.trackUserBehavior(userId, 'create_chat', 'chat', chat._id);
      
      res.json(chat);
    } catch (error) {
      console.error('Error creating chat:', error);
      res.status(500).json({ error: "Failed to create chat" });
    }
  });

  // GET /api/users/:userId/chats - Get user's chats
  app.get("/api/users/:userId/chats", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const chats = await storage.getUserChats(userId, limit);
      res.json(chats);
    } catch (error) {
      console.error('Error fetching user chats:', error);
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  });

  // GET /api/chats/:chatId - Get specific chat
  app.get("/api/chats/:chatId", async (req, res) => {
    try {
      const { chatId } = req.params;
      const chat = await storage.getChat(chatId);
      
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      res.json(chat);
    } catch (error) {
      console.error('Error fetching chat:', error);
      res.status(500).json({ error: "Failed to fetch chat" });
    }
  });

  // PUT /api/chats/:chatId - Update chat
  app.put("/api/chats/:chatId", async (req, res) => {
    try {
      const { chatId } = req.params;
      const updates = req.body;
      
      const chat = await storage.updateChat(chatId, updates);
      
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      res.json(chat);
    } catch (error) {
      console.error('Error updating chat:', error);
      res.status(500).json({ error: "Failed to update chat" });
    }
  });

  // DELETE /api/chats/:chatId - Delete chat
  app.delete("/api/chats/:chatId", async (req, res) => {
    try {
      const { chatId } = req.params;
      const success = await storage.deleteChat(chatId);
      
      if (!success) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting chat:', error);
      res.status(500).json({ error: "Failed to delete chat" });
    }
  });

  // POST /api/chats/:chatId/messages - Add message to chat
  app.post("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const { userId, role, content, metadata } = req.body;
      
      if (!userId || !role || !content) {
        return res.status(400).json({ error: "userId, role, and content are required" });
      }
      
      const message = await storage.createChatMessage(chatId, userId, role, content, metadata);
      
      // Track user behavior
      await storage.trackUserBehavior(userId, 'send_message', 'chat_message', message._id, { chatId });
      
      res.json(message);
    } catch (error) {
      console.error('Error creating chat message:', error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // GET /api/chats/:chatId/messages - Get chat messages
  app.get("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const messages = await storage.getChatMessages(chatId, limit);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // POST /api/users/:userId/behavior - Track user behavior
  app.post("/api/users/:userId/behavior", async (req, res) => {
    try {
      const { userId } = req.params;
      const { action, entityType, entityId, context } = req.body;
      
      if (!action) {
        return res.status(400).json({ error: "Action is required" });
      }
      
      const behavior = await storage.trackUserBehavior(userId, action, entityType, entityId, context);
      res.json(behavior);
    } catch (error) {
      console.error('Error tracking user behavior:', error);
      res.status(500).json({ error: "Failed to track behavior" });
    }
  });

  // GET /api/users/:userId/behavior - Get user behavior
  app.get("/api/users/:userId/behavior", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const action = req.query.action as string;
      
      const behaviors = await storage.getUserBehavior(userId, limit, action);
      res.json(behaviors);
    } catch (error) {
      console.error('Error fetching user behavior:', error);
      res.status(500).json({ error: "Failed to fetch behavior" });
    }
  });

  // Newsletter Routes
  
  // GET /api/users/:userId/newsletters - Get user's newsletters
  app.get("/api/users/:userId/newsletters", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const newsletters = await storage.getUserNewsletters(userId, limit);
      res.json(newsletters);
    } catch (error) {
      console.error('Error fetching newsletters:', error);
      res.status(500).json({ error: "Failed to fetch newsletters" });
    }
  });

  // POST /api/users/:userId/newsletters/generate - Generate newsletter
  app.post("/api/users/:userId/newsletters/generate", async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get user behavior and interests for newsletter generation
      const behaviors = await storage.getUserBehavior(userId, 50);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Track newsletter generation request
      await storage.trackUserBehavior(userId, 'generate_newsletter', 'newsletter');
      
      // Placeholder for now - will implement actual generation later
      const newsletter = await storage.createNewsletter(
        userId, 
        `Personal Newsletter - ${new Date().toLocaleDateString()}`,
        "Newsletter generation is being implemented...",
        ["placeholder"]
      );
      
      res.json(newsletter);
    } catch (error) {
      console.error('Error generating newsletter:', error);
      res.status(500).json({ error: "Failed to generate newsletter" });
    }
  });

  // PUT /api/newsletters/:newsletterId/send - Mark newsletter as sent
  app.put("/api/newsletters/:newsletterId/send", async (req, res) => {
    try {
      const { newsletterId } = req.params;
      const success = await storage.markNewsletterSent(newsletterId);
      
      if (!success) {
        return res.status(404).json({ error: "Newsletter not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking newsletter as sent:', error);
      res.status(500).json({ error: "Failed to update newsletter" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
