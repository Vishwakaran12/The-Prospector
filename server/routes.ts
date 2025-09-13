import type { Express } from "express";
import { createServer, type Server } from "http";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function registerRoutes(app: Express): Promise<Server> {
  // Prospector Search Route (calls our Python aggregate scraper)
  app.get("/search/:type", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      // Call our Python aggregate scraper
      const scriptPath = process.cwd() + '/scraper_service/aggregate_scraper.py';
      const command = `python3 "${scriptPath}" "${query}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.error('Scraper stderr:', stderr);
      }
      
      const results = JSON.parse(stdout);
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

  const httpServer = createServer(app);
  return httpServer;
}
