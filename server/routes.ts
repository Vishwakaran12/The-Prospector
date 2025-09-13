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

  const httpServer = createServer(app);
  return httpServer;
}