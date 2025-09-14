import type { Express } from "express";
import { createServer, type Server } from "http";
import fetch from 'node-fetch';
import passport from "passport";
import bcrypt from "bcrypt";
import { requireAuth, optionalAuth, authRateLimit } from "./middleware/auth";
import { UserModel } from "./models/personalization";
import { UserWishModel } from "./models/personalization";
import { storage } from "./storage";
import { scrapeUrl, scrapeMultipleUrls } from "./services/scraper-simple";
import { analyzeContent, generateContentRecommendations } from "./services/gemini";
import { searchWeb, searchPlatformSpecific } from "./services/websearch";
import { newsletterGenerator } from "./services/newsletter";
import { enhancedEventDiscovery } from "./services/event-discovery";
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

  // Authentication Routes
  
  // POST /api/auth/register - Register new user
  app.post("/api/auth/register", authRateLimit, async (req, res) => {
    try {
      const { username, password, email } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Check if user already exists
      const existingUser = await UserModel.findOne({ username });
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = new UserModel({
        username,
        password: hashedPassword,
        email: email || undefined,
        lastActivityAt: new Date()
      });

      await user.save();

      res.status(201).json({ 
        message: "User registered successfully",
        user: { 
          id: user._id,
          username: user.username,
          email: user.email 
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  // POST /api/auth/login - Login user
  app.post("/api/auth/login", authRateLimit, (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ 
          error: "Authentication failed",
          message: info?.message || "Invalid credentials"
        });
      }
      
  // Cast user to any for passport session login
  req.logIn(user as any, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        res.json({
          message: "Login successful",
          user: {
            id: user._id,
            username: user.username,
            email: user.email
          }
        });
      });
    })(req, res, next);
  });

  // POST /api/auth/google - Login or register with Google ID token
  app.post('/api/auth/google', authRateLimit, async (req, res) => {
    try {
      const { idToken, mode } = req.body || {};
      if (!idToken) {
        return res.status(400).json({ error: 'Missing idToken' });
      }

      // Verify ID token with Google's tokeninfo endpoint
      const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      const verifyResp = await fetch(verifyUrl);
      if (!verifyResp.ok) {
        const text = await verifyResp.text().catch(() => '');
        console.error('Google token verification failed:', verifyResp.status, text);
        return res.status(401).json({ error: 'Invalid Google ID token' });
      }

      const tokenInfo = await verifyResp.json();
      // tokenInfo contains fields like email, email_verified, name, picture, sub
      const email = tokenInfo.email;
      if (!email) {
        return res.status(400).json({ error: 'Google token did not contain email' });
      }

      // Find or create user
      let user = await UserModel.findOne({ email });
      if (!user) {
        // Create a unique username based on email local part
        const local = email.split('@')[0].replace(/[^a-zA-Z0-9_\-]/g, '').toLowerCase() || 'user';
        let username = local;
        let suffix = 0;
        while (await UserModel.findOne({ username })) {
          suffix += 1;
          username = `${local}${suffix}`;
        }

        // Generate a random password (stored hashed) because schema requires it
        const randomPass = Math.random().toString(36).slice(-12);
        const hashed = await bcrypt.hash(randomPass, 10);

        user = new UserModel({
          username,
          email,
          password: hashed,
          firstName: tokenInfo.given_name || undefined,
          lastName: tokenInfo.family_name || undefined,
          avatar: tokenInfo.picture || undefined,
          lastActivityAt: new Date()
        });

        await user.save();
      } else {
        // Update last activity and optional profile fields
        user.lastActivityAt = new Date();
        if (!user.avatar && tokenInfo.picture) user.avatar = tokenInfo.picture;
        await user.save();
      }

  // Log the user in using passport session
  // Cast user to any to satisfy passport TypeScript typings (Mongoose ObjectId vs expected string)
  req.logIn(user as any, (err) => {
        if (err) {
          console.error('req.logIn error for Google auth:', err);
          return res.status(500).json({ error: 'Failed to create session' });
        }

        return res.json({
          message: 'Google authentication successful',
          user: {
            id: user._id,
            username: user.username,
            email: user.email
          }
        });
      });

    } catch (error) {
      console.error('Error in /api/auth/google:', error);
      res.status(500).json({ error: 'Google authentication failed' });
    }
  });

  // POST /api/auth/logout - Logout user
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // ===== User wishes (favorites) - saved to MongoDB =====
  // GET /api/user/wishes - list wishes for current user
  app.get('/api/user/wishes', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?._id || (req.user as any)?.id;
      const wishes = await UserWishModel.find({ userId }).sort({ createdAt: -1 }).lean();
      res.json({ wishes });
    } catch (err) {
      console.error('Error fetching user wishes:', err);
      res.status(500).json({ error: 'Failed to fetch wishes' });
    }
  });

  // POST /api/user/wishes - create a new wish (favorite)
  app.post('/api/user/wishes', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?._id || (req.user as any)?.id;
      const { eventTitle, eventDescription, eventDate, eventTime, eventLocation, eventUrl, source, category, tags } = req.body || {};

      if (!eventTitle) {
        return res.status(400).json({ error: 'eventTitle is required' });
      }

      const wish = new UserWishModel({
        userId,
        eventTitle,
        eventDescription,
        eventDate,
        eventTime,
        eventLocation,
        eventUrl,
        source,
        category,
        tags,
      });

      await wish.save();
      res.status(201).json({ wish });
    } catch (err) {
      console.error('Error creating user wish:', err);
      res.status(500).json({ error: 'Failed to create wish' });
    }
  });

  // DELETE /api/user/wishes/:id - remove a wish
  app.delete('/api/user/wishes/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?._id || (req.user as any)?.id;
      const wishId = req.params.id;
      const wish = await UserWishModel.findOne({ _id: wishId, userId });
      if (!wish) return res.status(404).json({ error: 'Wish not found' });
      await wish.deleteOne();
      res.json({ message: 'Deleted' });
    } catch (err) {
      console.error('Error deleting wish:', err);
      res.status(500).json({ error: 'Failed to delete wish' });
    }
  });


  // GET /api/auth/me - Get current user
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email
        }
      });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Content Discovery Routes
  
  // POST /api/content/discover - Discover content from URL or search query
  app.post("/api/content/discover", async (req, res) => {
    try {
      console.log('Content discovery request received:', req.body);
      
      // Validate request body with Zod schema
      const validationResult = contentDiscoverySchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log('Validation failed:', validationResult.error.errors);
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      console.log('Validation passed:', validationResult.data);
      const { url, query, useGemini } = validationResult.data;

      if (url) {
        // Scrape specific URL
        const scrapedContent = await scrapeUrl(url);
        
        if (scrapedContent.error) {
          return res.status(400).json({ error: scrapedContent.error });
        }

        // Check if content already exists
        const existingContent = await storage.getContentByUrl(url);
        if (existingContent) {
          return res.json({ content: existingContent, isNew: false });
        }

        // Create content record
        const contentData = {
          url: scrapedContent.url,
          title: scrapedContent.title || undefined,
          description: scrapedContent.description || undefined,
          content: scrapedContent.content || undefined,
          contentType: scrapedContent.contentType,
          metadata: scrapedContent.metadata,
          isProcessed: false,
          geminiAnalysis: undefined
        };

        const content = await storage.createContent(contentData);

        // Analyze with Gemini if requested and content is available
        if (useGemini && content.content) {
          try {
            const analysis = await analyzeContent(content.content, content.title || undefined, content.url);
            await storage.updateContent(content.id, { 
              geminiAnalysis: analysis as any,
              isProcessed: true 
            });
            content.geminiAnalysis = analysis;
            content.isProcessed = true;
          } catch (error) {
            console.error('Gemini analysis failed:', error);
          }
        }

        res.json({ content, isNew: true });

      } else if (query) {
        console.log('Performing web search for query:', query);
        
        // Search the web for new content
        const webSearchResults = await searchWeb(query, {
          engine: 'duckduckgo',
          maxResults: 20,
          includeSocial: true,
          platforms: ['reddit', 'youtube']
        });
        
        console.log(`Found ${webSearchResults.results.length} web search results`);
        
        // Also search existing local content
        const localResults = await storage.searchContent(query);
        console.log(`Found ${localResults.length} local results`);
        
        // Combine and format results
        const combinedResults = {
          query,
          webResults: webSearchResults.results,
          localResults,
          totalWebResults: webSearchResults.totalResults,
          searchEngine: webSearchResults.searchEngine,
          timestamp: new Date().toISOString(),
          suggestions: localResults.length > 0 ? await generateContentRecommendations(
            localResults.map(c => ({
              title: c.title || 'Untitled',
              categories: (c.geminiAnalysis && typeof c.geminiAnalysis === 'object' && 'categories' in c.geminiAnalysis && Array.isArray(c.geminiAnalysis.categories)) ? c.geminiAnalysis.categories : [],
              keywords: (c.geminiAnalysis && typeof c.geminiAnalysis === 'object' && 'keywords' in c.geminiAnalysis && Array.isArray(c.geminiAnalysis.keywords)) ? c.geminiAnalysis.keywords : []
            }))
          ) : []
        };
        
        res.json(combinedResults);
      }

    } catch (error) {
      console.error('Content discovery error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to discover content", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // POST /api/search/web - Direct web search
  app.post("/api/search/web", async (req, res) => {
    try {
      const { query, engine = 'duckduckgo', maxResults = 10, platforms = [] } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }
      
      console.log(`Web search request: "${query}"`);
      
      const results = await searchWeb(query, {
        engine,
        maxResults,
        includeSocial: true,
        platforms
      });
      
      res.json(results);
      
    } catch (error) {
      console.error('Web search error:', error);
      res.status(500).json({ error: "Web search failed", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // POST /api/search/platform - Search specific social media platform
  app.post("/api/search/platform", async (req, res) => {
    try {
      const { query, platform, maxResults = 10 } = req.body;
      
      if (!query || !platform) {
        return res.status(400).json({ error: "Query and platform are required" });
      }
      
      console.log(`Platform search: "${query}" on ${platform}`);
      
      const results = await searchPlatformSpecific(platform, query, maxResults);
      
      res.json({
        query,
        platform,
        results,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Platform search error:', error);
      res.status(500).json({ error: "Platform search failed", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // POST /api/content/batch-scrape - Scrape multiple URLs
  app.post("/api/content/batch-scrape", async (req, res) => {
    try {
      // Validate request body with Zod schema
      const validationResult = batchScrapeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      const { urls } = validationResult.data;

      const scrapedResults = await scrapeMultipleUrls(urls);
      const createdContent: Content[] = [];

      for (const scraped of scrapedResults) {
        if (!scraped.error) {
          try {
            // Check if content already exists
            const existing = await storage.getContentByUrl(scraped.url);
            if (existing) {
              createdContent.push(existing);
              continue;
            }

            const content = await storage.createContent({
              url: scraped.url,
              title: scraped.title || undefined,
              description: scraped.description || undefined,
              content: scraped.content || undefined,
              contentType: scraped.contentType,
              metadata: scraped.metadata,
              isProcessed: false,
              geminiAnalysis: undefined
            });

            createdContent.push(content);
          } catch (error) {
            console.error('Error creating content for', scraped.url, error);
          }
        }
      }

      res.json({ 
        results: createdContent,
        errors: scrapedResults.filter(r => r.error).map(r => ({ url: r.url, error: r.error }))
      });

    } catch (error) {
      console.error('Batch scrape error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to scrape URLs" });
    }
  });

  // GET /api/content/:id - Get specific content
  app.get("/api/content/:id", async (req, res) => {
    try {
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error('Get content error:', error);
      res.status(500).json({ error: "Failed to retrieve content" });
    }
  });

  // POST /api/content/:id/analyze - Analyze content with Gemini
  app.post("/api/content/:id/analyze", async (req, res) => {
    try {
      // Validate content ID format
      const validationResult = contentAnalysisSchema.safeParse({ contentId: req.params.id });
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid content ID format", 
          details: validationResult.error.errors
        });
      }
      
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      if (!content.content) {
        return res.status(400).json({ error: "No content available to analyze" });
      }

      const analysis = await analyzeContent(content.content, content.title || undefined, content.url);
      
      const updatedContent = await storage.updateContent(content.id, {
        geminiAnalysis: analysis as any,
        isProcessed: true
      });

      res.json({ analysis, content: updatedContent });

    } catch (error) {
      console.error('Content analysis error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to analyze content" });
    }
  });

  // Claims Management Routes

  // GET /api/claims - Get user's claims (TODO: Add authentication)
  app.get("/api/claims", async (req, res) => {
    try {
      // Validate query parameters with Zod schema
      const validationResult = claimsQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      const { userId, type: claimType, includeContent } = validationResult.data;

      let claims;
      if (includeContent) {
        claims = await storage.getClaimsWithContent(userId);
      } else if (claimType) {
        claims = await storage.getClaimsByType(userId, claimType);
      } else {
        claims = await storage.getClaimsByUser(userId);
      }

      res.json(claims);

    } catch (error) {
      console.error('Get claims error:', error);
      res.status(500).json({ error: "Failed to retrieve claims" });
    }
  });

  // POST /api/claims - Create a new claim
  app.post("/api/claims", async (req, res) => {
    try {
      const claimData = insertClaimSchema.parse(req.body);
      
      // Check if user already has a claim for this content
      const existingClaim = await storage.getUserClaimForContent(
        claimData.userId, 
        claimData.contentId
      );

      if (existingClaim) {
        return res.status(409).json({ 
          error: "Claim already exists", 
          existingClaim 
        });
      }

      // Verify content exists
      const content = await storage.getContent(claimData.contentId);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      const claim = await storage.createClaim(claimData);
      res.status(201).json(claim);

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid claim data", details: error.errors });
      }
      console.error('Create claim error:', error);
      res.status(500).json({ error: "Failed to create claim" });
    }
  });

  // PUT /api/claims/:id - Update a claim
  app.put("/api/claims/:id", async (req, res) => {
    try {
      const claimId = req.params.id;
      const updates = req.body;

      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.userId;
      delete updates.contentId;
      delete updates.claimedAt;

      const updatedClaim = await storage.updateClaim(claimId, updates);
      
      if (!updatedClaim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      res.json(updatedClaim);

    } catch (error) {
      console.error('Update claim error:', error);
      res.status(500).json({ error: "Failed to update claim" });
    }
  });

  // DELETE /api/claims/:id - Delete a claim
  app.delete("/api/claims/:id", async (req, res) => {
    try {
      const claimId = req.params.id;
      const deleted = await storage.deleteClaim(claimId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Claim not found" });
      }

      res.status(204).send();

    } catch (error) {
      console.error('Delete claim error:', error);
      res.status(500).json({ error: "Failed to delete claim" });
    }
  });

  // GET /api/content/:id/claims - Get all claims for specific content
  app.get("/api/content/:id/claims", async (req, res) => {
    try {
      const contentId = req.params.id;
      const claims = await storage.getClaimsByContent(contentId);
      res.json(claims);
    } catch (error) {
      console.error('Get content claims error:', error);
      res.status(500).json({ error: "Failed to retrieve content claims" });
    }
  });

  // Search and Recommendations Routes

  // GET /api/search - Search content
  app.get("/api/search", async (req, res) => {
    try {
      // Validate query parameters with Zod schema
      const validationResult = searchQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid search parameters", 
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      const { q: query, type: contentType, limit: searchLimit } = validationResult.data;
      
      const results = await storage.searchContent(
        query, 
        contentType, 
        searchLimit
      );

      res.json({ 
        query, 
        results,
        total: results.length 
      });

    } catch (error) {
      console.error('Search error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Search failed" });
    }
  });

  // GET /api/recommendations - Get content recommendations for user
  app.get("/api/recommendations", async (req, res) => {
    try {
      // Validate query parameters with Zod schema
      const validationResult = recommendationsQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      const { userId, limit } = validationResult.data;

      // Get user's claim history to generate recommendations
      const userClaims = await storage.getClaimsWithContent(userId);
      
      const userHistory = userClaims.map(claim => ({
        title: claim.content.title || 'Untitled',
        categories: (claim.content.geminiAnalysis && typeof claim.content.geminiAnalysis === 'object' && 'categories' in claim.content.geminiAnalysis && Array.isArray(claim.content.geminiAnalysis.categories)) 
          ? claim.content.geminiAnalysis.categories 
          : [],
        keywords: (claim.content.geminiAnalysis && typeof claim.content.geminiAnalysis === 'object' && 'keywords' in claim.content.geminiAnalysis && Array.isArray(claim.content.geminiAnalysis.keywords)) 
          ? claim.content.geminiAnalysis.keywords 
          : []
      }));

      const recommendations = await generateContentRecommendations(userHistory, limit);
      
      res.json({ recommendations, basedOnClaims: userClaims.length, limit });

    } catch (error) {
      console.error('Recommendations error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  });

  // User Personalization Routes
  
  // POST /api/users/:userId/chats - Create a new chat
  app.post("/api/users/:userId/chats", requireAuth, async (req, res) => {
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
      
      console.log(`Fetching chats for user: ${userId}`);
      
      const chats = await storage.getUserChats(userId, limit);
      
      console.log(`Found ${chats.length} chats for user ${userId}`);
      
      res.json(chats);
    } catch (error) {
      console.error('Error fetching user chats:', error);
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  });

  // POST /api/chats/:chatId/messages - Add message to chat
  app.post("/api/chats/:chatId/messages", requireAuth, async (req, res) => {
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

  // POST /api/users/:userId/newsletters/generate - Generate newsletter
  app.post("/api/users/:userId/newsletters/generate", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Generate personalized newsletter
      const generatedNewsletter = await newsletterGenerator.generatePersonalizedNewsletter({
        userId,
        behaviorAnalysisDays: 30,
        maxTopics: 5,
        includeRecommendations: true
      });
      
      // Save newsletter to database
      const savedNewsletter = await newsletterGenerator.saveNewsletter(userId, generatedNewsletter);
      
      // Track newsletter generation
      await storage.trackUserBehavior(userId, 'generate_newsletter', 'newsletter', savedNewsletter._id);
      
      res.json({
        newsletter: savedNewsletter,
        metadata: generatedNewsletter.metadata
      });
    } catch (error) {
      console.error('Error generating newsletter:', error);
      res.status(500).json({ error: "Failed to generate newsletter" });
    }
  });

  // Event Discovery Routes
  
  // GET /api/events/ttu - Get TTU specific events
  app.get("/api/events/ttu", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 15;
      const events = await enhancedEventDiscovery.getTTUEvents(limit);
      res.json({ events, source: 'TTU' });
    } catch (error) {
      console.error('Error fetching TTU events:', error);
      res.status(500).json({ error: "Failed to fetch TTU events" });
    }
  });

  // GET /api/events/lubbock - Get Lubbock local events
  app.get("/api/events/lubbock", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 15;
      const events = await enhancedEventDiscovery.getLubbockEvents(limit);
      res.json({ events, source: 'Lubbock' });
    } catch (error) {
      console.error('Error fetching Lubbock events:', error);
      res.status(500).json({ error: "Failed to fetch Lubbock events" });
    }
  });

  // GET /api/events/category/:category - Get events by category
  app.get("/api/events/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const events = await enhancedEventDiscovery.getEventsByCategory(category, limit);
      res.json({ events, category });
    } catch (error) {
      console.error(`Error fetching ${req.params.category} events:`, error);
      res.status(500).json({ error: `Failed to fetch ${req.params.category} events` });
    }
  });

  // GET /api/events/discover - Discover events with custom options
  app.get("/api/events/discover", async (req, res) => {
    try {
      const categories = req.query.categories ? (req.query.categories as string).split(',') : undefined;
      const keywords = req.query.keywords ? (req.query.keywords as string).split(',') : [];
      const maxEventsPerSource = parseInt(req.query.maxEventsPerSource as string) || 5;
      
      const events = await enhancedEventDiscovery.discoverEvents({
        categories,
        keywords,
        maxEventsPerSource
      });
      
      res.json({ 
        events, 
        metadata: {
          categoriesSearched: categories,
          keywordsUsed: keywords,
          totalEvents: events.length
        }
      });
    } catch (error) {
      console.error('Error discovering events:', error);
      res.status(500).json({ error: "Failed to discover events" });
    }
  });

  // POST /api/user/behavior - Track user behavior
  app.post("/api/user/behavior", requireAuth, async (req, res) => {
    try {
      const { action, entityType, entityId, context } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const userId = req.user._id;
      
      if (!action) {
        return res.status(400).json({ error: "action is required" });
      }

      await storage.trackUserBehavior(userId, action, entityType, entityId, context);
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking user behavior:', error);
      res.status(500).json({ error: "Failed to track behavior" });
    }
  });

  // User Wishlist Routes
  
  // POST /api/user/wishes - Save an event to user's wishlist
  app.post("/api/user/wishes", requireAuth, async (req, res) => {
    try {
      const { eventData } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const userId = req.user._id;
      
      if (!eventData) {
        return res.status(400).json({ error: "eventData is required" });
      }

      const userWish = await storage.createUserWish(userId, eventData);
      res.json({ success: true, wish: userWish });
    } catch (error) {
      console.error('Error saving user wish:', error);
      res.status(500).json({ error: "Failed to save event to wishlist" });
    }
  });

  // GET /api/user/wishes/:userId - Get user's wishlist
  app.get("/api/user/wishes/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.query;
      
      const wishes = await storage.getUserWishes(userId, status as string);
      res.json({ wishes });
    } catch (error) {
      console.error('Error fetching user wishes:', error);
      res.status(500).json({ error: "Failed to fetch wishlist" });
    }
  });

  // PUT /api/user/wishes/:id - Update a wish
  app.put("/api/user/wishes/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedWish = await storage.updateUserWish(id, updates);
      if (!updatedWish) {
        return res.status(404).json({ error: "Wish not found" });
      }
      
      res.json({ success: true, wish: updatedWish });
    } catch (error) {
      console.error('Error updating user wish:', error);
      res.status(500).json({ error: "Failed to update wish" });
    }
  });

  // DELETE /api/user/wishes/:id - Remove from wishlist
  app.delete("/api/user/wishes/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const deleted = await storage.deleteUserWish(id);
      if (!deleted) {
        return res.status(404).json({ error: "Wish not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user wish:', error);
      res.status(500).json({ error: "Failed to remove from wishlist" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}