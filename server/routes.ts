import type { Express } from "express";
import { createServer, type Server } from "http";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function registerRoutes(app: Express): Promise<Server> {
  // Add CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
  });

  // Prospector Search Route (calls our Python aggregate scraper)
  app.get("/search/:type", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      console.log(`[SEARCH] Query: "${query}"`);

      // Call our Python aggregate scraper
      const scriptPath = process.cwd() + '/scraper_service/aggregate_scraper.py';
      const command = `python3 "${scriptPath}" "${query}"`;
      
      console.log(`[SEARCH] Running command: ${command}`);
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.error('Scraper stderr:', stderr);
      }
      
      const results = JSON.parse(stdout);
      console.log(`[SEARCH] Found ${results.length} results`);
      res.json(results);
    } catch (error: any) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed', details: error?.message || 'Unknown error' });
    }
  });

  // Root endpoint
  app.get("/", (req, res) => {
    res.json({ message: "Welcome to The Prospector API! ⛏️ Ready to strike gold?" });
  });

  // Test endpoint for debugging
  app.get("/api/test", (req, res) => {
    res.json({ 
      message: "API is working!", 
      timestamp: new Date().toISOString(),
      endpoints: [
        "GET /search/:type?query=...",
        "GET /api/search/:type?query=...",
        "GET /api/test"
      ]
    });
  });

  // API prefix routes for compatibility
  app.get("/api/search/:type", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      console.log(`[API SEARCH] Query: "${query}"`);

      // Call our Python aggregate scraper
      const scriptPath = process.cwd() + '/scraper_service/aggregate_scraper.py';
      const command = `python3 "${scriptPath}" "${query}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.error('Scraper stderr:', stderr);
      }
      
      const results = JSON.parse(stdout);
      console.log(`[API SEARCH] Found ${results.length} results`);
      res.json(results);
    } catch (error: any) {
      console.error('API Search error:', error);
      res.status(500).json({ error: 'Search failed', details: error?.message || 'Unknown error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
