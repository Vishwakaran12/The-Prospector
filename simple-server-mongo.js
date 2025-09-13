// Simple Express server - WITH MONGODB INTEGRATION
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Simple in-memory storage for saved searches (fallback)
const savedSearches = [];
let useMongoDb = false;
let SearchModel = null;

// MongoDB connection
const connectToMongoDB = async () => {
  try {
    const mongoose = await import('mongoose');
    
    if (!process.env.MONGODB_URI) {
      console.log('📝 MONGODB_URI not configured, using in-memory storage');
      return false;
    }

    await mongoose.default.connect(process.env.MONGODB_URI, {
      dbName: 'the-prospector',
    });
    
    // Define Search schema and model
    const SearchResultSchema = new mongoose.Schema({
      title: { type: String, required: true },
      description: { type: String, required: true },
      url: { type: String, required: true },
      source: { type: String },
      metadata: { type: mongoose.Schema.Types.Mixed },
    });

    const SearchSchema = new mongoose.Schema({
      query: { type: String, required: true },
      results: { type: [SearchResultSchema], required: true },
      createdAt: { type: Date, default: Date.now },
      timestamp: { type: String },
    });

    SearchModel = mongoose.default.model('Search', SearchSchema);
    useMongoDb = true;
    
    console.log('🚀 MongoDB connected successfully!');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('📝 Falling back to in-memory storage');
    return false;
  }
};

// Initialize MongoDB connection
connectToMongoDB();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files from current directory
app.use(express.static(__dirname));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server is running", 
    timestamp: new Date().toISOString(),
    storage: useMongoDb ? "mongodb" : "memory",
    mongodb: useMongoDb ? "connected" : "disconnected"
  });
});

// Simple web search endpoint
app.post("/api/search", async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    console.log(`Searching for: "${query}"`);
    
    // Simple DuckDuckGo search
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    try {
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      const results = [];
      
      // Process DuckDuckGo results
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 10)) {
          if (topic.FirstURL && topic.Text) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
              url: topic.FirstURL,
              description: topic.Text,
              source: 'DuckDuckGo'
            });
          }
        }
      }
      
      // Add abstract if available
      if (data.Abstract && data.AbstractURL) {
        results.unshift({
          title: data.Heading || query,
          url: data.AbstractURL,
          description: data.Abstract,
          source: 'DuckDuckGo - Featured'
        });
      }
      
      res.json({
        query,
        results,
        total: results.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (searchError) {
      console.error('Search API error:', searchError);
      res.json({
        query,
        results: [],
        total: 0,
        error: "Search temporarily unavailable",
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Search endpoint error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Specialized event search endpoint
app.post("/api/search-events", async (req, res) => {
  try {
    const { location, genre, eventType, radius = 25 } = req.body;
    
    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }
    
    console.log(`Searching for ${eventType || 'events'} in ${location} - Genre: ${genre || 'any'}`);
    
    const results = [];
    
    // Build search queries for different platforms
    const searchQueries = [
      `${genre || ''} ${eventType || 'events'} ${location} site:eventbrite.com`,
      `${genre || ''} ${eventType || 'events'} ${location} site:meetup.com`,
      `${genre || ''} ${eventType || 'events'} ${location} site:facebook.com/events`,
      `${genre || ''} community events ${location}`,
      `${genre || ''} workshops ${location}`,
      `${genre || ''} networking events ${location}`
    ];
    
    // Search each query
    for (const query of searchQueries) {
      try {
        const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        // Process DuckDuckGo results
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics.slice(0, 3)) {
            if (topic.FirstURL && topic.Text) {
              // Determine event type from URL and content
              let detectedType = 'general';
              let platform = 'web';
              
              if (topic.FirstURL.includes('eventbrite.com')) {
                platform = 'Eventbrite';
                detectedType = 'ticketed';
              } else if (topic.FirstURL.includes('meetup.com')) {
                platform = 'Meetup';
                detectedType = 'community';
              } else if (topic.FirstURL.includes('facebook.com')) {
                platform = 'Facebook';
                detectedType = 'social';
              }
              
              results.push({
                title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
                url: topic.FirstURL,
                description: topic.Text,
                source: platform,
                eventType: detectedType,
                location: location,
                genre: genre || 'general',
                searchQuery: query
              });
            }
          }
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (searchError) {
        console.error(`Search error for query "${query}":`, searchError);
      }
    }
    
    // Remove duplicates and sort
    const uniqueResults = results.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );
    
    res.json({
      location,
      genre: genre || 'any',
      eventType: eventType || 'any',
      radius,
      results: uniqueResults,
      total: uniqueResults.length,
      timestamp: new Date().toISOString(),
      searchQueries: searchQueries
    });
    
  } catch (error) {
    console.error('Event search endpoint error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save search results endpoint
app.post("/api/save-search", async (req, res) => {
  try {
    const { query, results } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    const searchRecord = {
      query,
      results: results || [],
      createdAt: new Date(),
      timestamp: new Date().toISOString()
    };
    
    if (useMongoDb && SearchModel) {
      // Save to MongoDB
      try {
        const savedSearch = await SearchModel.create(searchRecord);
        console.log(`💾 MongoDB: Saved search "${query}" with ${results?.length || 0} results`);
        
        res.json({
          success: true,
          saved: {
            id: savedSearch._id.toString(),
            ...searchRecord
          },
          message: "Search saved to MongoDB",
          storage: "mongodb"
        });
      } catch (mongoError) {
        console.error('MongoDB save error:', mongoError);
        // Fallback to in-memory
        searchRecord.id = Date.now().toString();
        savedSearches.unshift(searchRecord);
        if (savedSearches.length > 50) savedSearches.splice(50);
        
        res.json({
          success: true,
          saved: searchRecord,
          message: "Search saved to memory (MongoDB failed)",
          storage: "memory"
        });
      }
    } else {
      // Save to in-memory storage
      searchRecord.id = Date.now().toString();
      savedSearches.unshift(searchRecord);
      if (savedSearches.length > 50) savedSearches.splice(50);
      
      console.log(`💾 Memory: Saved search "${query}" with ${results?.length || 0} results`);
      
      res.json({
        success: true,
        saved: searchRecord,
        message: "Search saved to memory",
        storage: "memory"
      });
    }
    
  } catch (error) {
    console.error('Save search error:', error);
    res.status(500).json({ error: "Failed to save search" });
  }
});

// Get saved searches endpoint
app.get("/api/saved-searches", async (req, res) => {
  try {
    if (useMongoDb && SearchModel) {
      // Get from MongoDB
      try {
        const searches = await SearchModel.find({})
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
        
        const formattedSearches = searches.map(search => ({
          id: search._id.toString(),
          query: search.query,
          results: search.results,
          createdAt: search.createdAt.toISOString(),
          timestamp: search.timestamp || search.createdAt.toISOString()
        }));
        
        res.json({
          searches: formattedSearches,
          total: formattedSearches.length,
          timestamp: new Date().toISOString(),
          storage: "mongodb"
        });
      } catch (mongoError) {
        console.error('MongoDB get error:', mongoError);
        // Fallback to in-memory
        res.json({
          searches: savedSearches,
          total: savedSearches.length,
          timestamp: new Date().toISOString(),
          storage: "memory",
          note: "MongoDB failed, showing memory data"
        });
      }
    } else {
      // Get from in-memory storage
      res.json({
        searches: savedSearches,
        total: savedSearches.length,
        timestamp: new Date().toISOString(),
        storage: "memory"
      });
    }
  } catch (error) {
    console.error('Get saved searches error:', error);
    res.status(500).json({ error: "Failed to retrieve saved searches" });
  }
});

// Delete saved search endpoint
app.delete("/api/saved-searches/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (useMongoDb && SearchModel) {
      // Delete from MongoDB
      try {
        const deleted = await SearchModel.findByIdAndDelete(id);
        
        if (!deleted) {
          return res.status(404).json({ error: "Search not found in MongoDB" });
        }
        
        res.json({
          success: true,
          deleted: {
            id: deleted._id.toString(),
            query: deleted.query,
            results: deleted.results
          },
          message: "Search deleted from MongoDB",
          storage: "mongodb"
        });
      } catch (mongoError) {
        console.error('MongoDB delete error:', mongoError);
        // Fallback to in-memory deletion
        const index = savedSearches.findIndex(search => search.id === id);
        if (index === -1) {
          return res.status(404).json({ error: "Search not found" });
        }
        
        const deleted = savedSearches.splice(index, 1)[0];
        res.json({
          success: true,
          deleted,
          message: "Search deleted from memory (MongoDB failed)",
          storage: "memory"
        });
      }
    } else {
      // Delete from in-memory storage
      const index = savedSearches.findIndex(search => search.id === id);
      
      if (index === -1) {
        return res.status(404).json({ error: "Search not found" });
      }
      
      const deleted = savedSearches.splice(index, 1)[0];
      
      res.json({
        success: true,
        deleted,
        message: "Search deleted from memory",
        storage: "memory"
      });
    }
    
  } catch (error) {
    console.error('Delete search error:', error);
    res.status(500).json({ error: "Failed to delete search" });
  }
});

// Simple page scraper endpoint
app.post("/api/scrape", async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    
    console.log(`Scraping: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      
      // Extract title using regex (simple approach)
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'No title found';
      
      // Extract meta description
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      const description = descMatch ? descMatch[1].trim() : 'No description found';
      
      res.json({
        url,
        title,
        description,
        contentLength: html.length,
        scraped: true,
        timestamp: new Date().toISOString()
      });
      
    } catch (scrapeError) {
      console.error('Scraping error:', scrapeError);
      res.status(400).json({
        url,
        error: scrapeError.message,
        scraped: false,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Scrape endpoint error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Simple server running at http://localhost:${port}`);
  console.log(`📋 Health check: http://localhost:${port}/api/health`);
  console.log(`🔍 Search: POST http://localhost:${port}/api/search`);
  console.log(`💾 Save search: POST http://localhost:${port}/api/save-search`);
  console.log(`📚 Saved searches: GET http://localhost:${port}/api/saved-searches`);
  console.log(`📄 Scrape: POST http://localhost:${port}/api/scrape`);
  console.log(`💾 Storage: ${useMongoDb ? 'MongoDB + Memory fallback' : 'Memory only'}`);
});
