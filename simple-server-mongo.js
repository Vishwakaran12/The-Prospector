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
    const { location, genre, eventType, radius = 25, timeframe = 'upcoming' } = req.body;
    
    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }
    
    console.log(`Searching for ${eventType || 'events'} in ${location} - Genre: ${genre || 'any'} - Timeframe: ${timeframe}`);
    
    const results = [];
    const currentDate = new Date();
    const todayFormatted = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const thisWeekend = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    // Enhanced search queries with date filters and real-time focus
    const searchQueries = [
      // Current and immediate events
      `${genre || ''} ${eventType || 'events'} ${location} today ${todayFormatted}`,
      `${genre || ''} ${eventType || 'events'} ${location} tonight`,
      `${genre || ''} ${eventType || 'events'} ${location} this weekend`,
      `${genre || ''} ${eventType || 'events'} ${location} happening now`,
      
      // Platform-specific searches with date context
      `${genre || ''} ${eventType || 'events'} ${location} ${todayFormatted} site:eventbrite.com`,
      `${genre || ''} ${eventType || 'events'} ${location} this week site:meetup.com`,
      `${genre || ''} ${eventType || 'events'} ${location} tonight site:facebook.com/events`,
      `${genre || ''} ${eventType || 'events'} ${location} site:allevents.in`,
      
      // Local discovery
      `things to do ${location} today`,
      `events near me ${location} tonight`,
      `${genre || ''} workshops ${location} this week`,
      `${genre || ''} networking events ${location} ${thisWeekend}`,
      `live music ${location} tonight`,
      `art gallery openings ${location} this week`,
      
      // Social and community specific
      `${location} community events facebook groups`,
      `${location} ${genre || ''} meetup groups active`,
      `${location} nightlife events tonight`,
      `${location} cultural events this week`,
      
      // Venue-based searches
      `${location} event venues today schedule`,
      `${location} concert halls tonight`,
      `${location} community centers events`,
      `${location} libraries events workshops`,
      
      // News and announcement sources
      `${location} events news announcements ${todayFormatted}`,
      `${location} event calendar city official`,
      `${location} chamber commerce events`,
      
      // Time-sensitive searches
      `last minute events ${location}`,
      `drop in events ${location} no registration`,
      `free events ${location} today`,
      
      // Specific categories with urgency
      `${location} tech meetups this week`,
      `${location} food events tonight`,
      `${location} fitness classes drop in`,
      `${location} art shows opening reception`
    ];
    
    // Search each query with enhanced processing
    for (const query of searchQueries) {
      try {
        const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        // Process DuckDuckGo results with enhanced metadata
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics.slice(0, 4)) {
            if (topic.FirstURL && topic.Text) {
              // Enhanced platform detection and categorization
              let detectedType = 'general';
              let platform = 'web';
              let urgency = 'normal';
              let category = genre || 'general';
              
              // Platform detection
              if (topic.FirstURL.includes('eventbrite.com')) {
                platform = 'Eventbrite';
                detectedType = 'ticketed';
              } else if (topic.FirstURL.includes('meetup.com')) {
                platform = 'Meetup';
                detectedType = 'community';
              } else if (topic.FirstURL.includes('facebook.com')) {
                platform = 'Facebook';
                detectedType = 'social';
              } else if (topic.FirstURL.includes('allevents.in')) {
                platform = 'AllEvents';
                detectedType = 'aggregated';
              } else if (topic.FirstURL.includes('yelp.com')) {
                platform = 'Yelp';
                detectedType = 'venue';
              } else if (topic.FirstURL.includes('ticketmaster.com')) {
                platform = 'Ticketmaster';
                detectedType = 'ticketed';
              }
              
              // Urgency detection
              const textLower = topic.Text.toLowerCase();
              if (textLower.includes('tonight') || textLower.includes('today') || textLower.includes('now')) {
                urgency = 'immediate';
              } else if (textLower.includes('this week') || textLower.includes('weekend')) {
                urgency = 'soon';
              }
              
              // Category enhancement
              if (textLower.includes('music') || textLower.includes('concert')) category = 'music';
              else if (textLower.includes('food') || textLower.includes('restaurant')) category = 'food';
              else if (textLower.includes('art') || textLower.includes('gallery')) category = 'arts';
              else if (textLower.includes('tech') || textLower.includes('startup')) category = 'tech';
              else if (textLower.includes('fitness') || textLower.includes('workout')) category = 'fitness';
              else if (textLower.includes('business') || textLower.includes('networking')) category = 'business';
              
              // Date extraction (basic)
              let extractedDate = null;
              const dateMatches = topic.Text.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
              if (dateMatches) {
                extractedDate = dateMatches[0];
              }
              
              results.push({
                title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
                url: topic.FirstURL,
                description: topic.Text,
                source: platform,
                eventType: detectedType,
                location: location,
                genre: category,
                urgency: urgency,
                extractedDate: extractedDate,
                searchQuery: query,
                confidence: calculateRelevanceScore(topic.Text, location, genre, eventType),
                timestamp: new Date().toISOString()
              });
            }
          }
        }
        
        // Add abstract if available and relevant
        if (data.Abstract && data.AbstractURL && data.Abstract.toLowerCase().includes(location.toLowerCase())) {
          results.push({
            title: data.Heading || `${location} Events`,
            url: data.AbstractURL,
            description: data.Abstract,
            source: 'DuckDuckGo Featured',
            eventType: 'featured',
            location: location,
            genre: genre || 'general',
            urgency: 'reference',
            searchQuery: query,
            confidence: 0.9,
            timestamp: new Date().toISOString()
          });
        }
        
        // Reduced delay for faster response
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (searchError) {
        console.error(`Search error for query "${query}":`, searchError);
      }
    }
    
    // Enhanced result processing
    const uniqueResults = results
      .filter((result, index, self) => 
        index === self.findIndex(r => r.url === result.url)
      )
      .sort((a, b) => {
        // Sort by urgency, then confidence, then relevance
        const urgencyOrder = { 'immediate': 3, 'soon': 2, 'normal': 1, 'reference': 0 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        }
        return (b.confidence || 0) - (a.confidence || 0);
      })
      .slice(0, 25); // Limit to top 25 results
    
    // Categorize results
    const categorized = {
      immediate: uniqueResults.filter(r => r.urgency === 'immediate'),
      upcoming: uniqueResults.filter(r => r.urgency === 'soon'),
      general: uniqueResults.filter(r => r.urgency === 'normal'),
      reference: uniqueResults.filter(r => r.urgency === 'reference')
    };
    
    res.json({
      location,
      genre: genre || 'any',
      eventType: eventType || 'any',
      timeframe,
      radius,
      results: uniqueResults,
      categorized,
      total: uniqueResults.length,
      searchCount: searchQueries.length,
      timestamp: new Date().toISOString(),
      summary: {
        immediate: categorized.immediate.length,
        upcoming: categorized.upcoming.length,
        general: categorized.general.length,
        platforms: [...new Set(uniqueResults.map(r => r.source))]
      }
    });
    
  } catch (error) {
    console.error('Event search endpoint error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to calculate relevance score
function calculateRelevanceScore(text, location, genre, eventType) {
  let score = 0.5; // Base score
  
  const textLower = text.toLowerCase();
  const locationLower = location.toLowerCase();
  
  // Location relevance
  if (textLower.includes(locationLower)) score += 0.3;
  
  // Genre relevance
  if (genre && textLower.includes(genre.toLowerCase())) score += 0.2;
  
  // Event type relevance
  if (eventType && textLower.includes(eventType.toLowerCase())) score += 0.2;
  
  // Time relevance
  if (textLower.includes('today') || textLower.includes('tonight')) score += 0.3;
  else if (textLower.includes('this week') || textLower.includes('weekend')) score += 0.2;
  else if (textLower.includes('upcoming') || textLower.includes('soon')) score += 0.1;
  
  // Platform reliability
  if (textLower.includes('eventbrite') || textLower.includes('meetup')) score += 0.1;
  
  return Math.min(score, 1.0); // Cap at 1.0
}

// Enhanced real-time event discovery endpoint
app.post("/api/discover-events", async (req, res) => {
  try {
    const { location, radius = 25, urgent = false } = req.body;
    
    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }
    
    console.log(`🔍 Discovering real-time events in ${location} (urgent: ${urgent})`);
    
    const results = [];
    const currentTime = new Date();
    const todayStr = currentTime.toISOString().split('T')[0];
    const tonightStr = "tonight";
    const thisWeekendStr = "this weekend";
    
    // Multi-platform real-time discovery
    const discoveryQueries = [
      // Immediate/Tonight focus
      `events happening now ${location}`,
      `things to do tonight ${location}`,
      `last minute events ${location}`,
      `drop in events ${location}`,
      `open mic night ${location}`,
      `happy hour events ${location}`,
      
      // Platform scraping with current date
      `site:eventbrite.com events ${location} ${todayStr}`,
      `site:meetup.com groups ${location} happening soon`,
      `site:facebook.com/events ${location} tonight`,
      `site:allevents.in ${location} today`,
      `site:ticketmaster.com ${location} tonight`,
      
      // Local venue discovery
      `${location} bars live music tonight`,
      `${location} restaurants events tonight`,
      `${location} coffee shops events`,
      `${location} bookstores events readings`,
      `${location} galleries opening reception`,
      `${location} theaters shows tonight`,
      `${location} clubs events tonight`,
      
      // Community and social
      `${location} community center events today`,
      `${location} library events workshops`,
      `${location} university events public`,
      `${location} chamber commerce networking`,
      `${location} volunteer opportunities immediate`,
      
      // Activity-specific
      `${location} fitness classes drop in`,
      `${location} yoga studios open classes`,
      `${location} dance classes beginner friendly`,
      `${location} cooking classes tonight`,
      `${location} art classes walk in`,
      
      // News and announcements
      `${location} events today news`,
      `${location} events calendar official`,
      `${location} visitor bureau events`,
      
      // Social discovery
      `${location} facebook groups events`,
      `${location} instagram events hashtags`,
      `${location} reddit meetups`,
      `${location} discord events local`
    ];
    
    // Execute searches with error handling
    const searchPromises = discoveryQueries.map(async (query, index) => {
      try {
        // Stagger requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 100));
        
        const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const response = await fetch(searchUrl, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EventDiscovery/1.0)',
          }
        });
        
        if (!response.ok) return [];
        
        const data = await response.json();
        const queryResults = [];
        
        // Process results with enhanced metadata
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics.slice(0, 5)) {
            if (topic.FirstURL && topic.Text) {
              const eventData = extractEventData(topic, location, query, currentTime);
              if (eventData) {
                queryResults.push(eventData);
              }
            }
          }
        }
        
        // Process abstract if highly relevant
        if (data.Abstract && data.AbstractURL && 
            data.Abstract.toLowerCase().includes(location.toLowerCase()) &&
            (data.Abstract.toLowerCase().includes('event') || 
             data.Abstract.toLowerCase().includes('tonight') ||
             data.Abstract.toLowerCase().includes('today'))) {
          
          queryResults.push({
            title: data.Heading || `${location} Events Directory`,
            url: data.AbstractURL,
            description: data.Abstract,
            source: 'Featured Directory',
            eventType: 'directory',
            urgency: 'reference',
            confidence: 0.85,
            category: 'directory',
            searchQuery: query,
            timestamp: currentTime.toISOString()
          });
        }
        
        return queryResults;
        
      } catch (error) {
        console.error(`Discovery error for "${query}":`, error.message);
        return [];
      }
    });
    
    // Wait for all searches to complete
    const allResults = await Promise.allSettled(searchPromises);
    
    // Flatten and process results
    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      } else {
        console.error(`Search ${index} failed:`, result.reason);
      }
    });
    
    // Advanced deduplication and scoring
    const uniqueResults = deduplicateAndScore(results, location, urgent);
    
    // Categorize by time relevance
    const categorized = categorizeByTimeRelevance(uniqueResults, currentTime);
    
    // Generate response with rich metadata
    res.json({
      location,
      searchTime: currentTime.toISOString(),
      urgent,
      radius,
      results: uniqueResults.slice(0, 30), // Top 30 results
      categorized,
      summary: {
        total: uniqueResults.length,
        immediate: categorized.immediate.length,
        tonight: categorized.tonight.length,
        thisWeek: categorized.thisWeek.length,
        ongoing: categorized.ongoing.length,
        platforms: [...new Set(uniqueResults.map(r => r.source))],
        categories: [...new Set(uniqueResults.map(r => r.category))],
        avgConfidence: uniqueResults.reduce((acc, r) => acc + (r.confidence || 0), 0) / uniqueResults.length
      },
      meta: {
        queriesExecuted: discoveryQueries.length,
        searchStrategy: urgent ? 'immediate' : 'comprehensive',
        timestamp: currentTime.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Event discovery endpoint error:', error);
    res.status(500).json({ error: "Event discovery failed", details: error.message });
  }
});

// Enhanced event data extraction
function extractEventData(topic, location, query, currentTime) {
  try {
    const url = topic.FirstURL;
    const text = topic.Text;
    const textLower = text.toLowerCase();
    
    // Skip irrelevant results
    if (!url || !text || text.length < 20) return null;
    
    // Platform detection with confidence scoring
    let platform = 'web';
    let eventType = 'general';
    let confidence = 0.5;
    let category = 'general';
    
    // Enhanced platform detection
    if (url.includes('eventbrite.com')) {
      platform = 'Eventbrite';
      eventType = 'ticketed';
      confidence += 0.2;
    } else if (url.includes('meetup.com')) {
      platform = 'Meetup';
      eventType = 'community';
      confidence += 0.25;
    } else if (url.includes('facebook.com')) {
      platform = 'Facebook';
      eventType = 'social';
      confidence += 0.15;
    } else if (url.includes('allevents.in')) {
      platform = 'AllEvents';
      eventType = 'aggregated';
      confidence += 0.2;
    } else if (url.includes('ticketmaster.com')) {
      platform = 'Ticketmaster';
      eventType = 'ticketed';
      confidence += 0.2;
    } else if (url.includes('yelp.com')) {
      platform = 'Yelp';
      eventType = 'venue';
      confidence += 0.1;
    }
    
    // Category detection
    if (textLower.includes('music') || textLower.includes('concert') || textLower.includes('band')) {
      category = 'music';
      confidence += 0.1;
    } else if (textLower.includes('food') || textLower.includes('restaurant') || textLower.includes('dining')) {
      category = 'food';
      confidence += 0.1;
    } else if (textLower.includes('art') || textLower.includes('gallery') || textLower.includes('exhibition')) {
      category = 'arts';
      confidence += 0.1;
    } else if (textLower.includes('tech') || textLower.includes('startup') || textLower.includes('coding')) {
      category = 'tech';
      confidence += 0.1;
    } else if (textLower.includes('fitness') || textLower.includes('yoga') || textLower.includes('workout')) {
      category = 'fitness';
      confidence += 0.1;
    } else if (textLower.includes('business') || textLower.includes('networking') || textLower.includes('professional')) {
      category = 'business';
      confidence += 0.1;
    }
    
    // Urgency detection
    let urgency = 'normal';
    if (textLower.includes('tonight') || textLower.includes('today') || textLower.includes('now') || textLower.includes('happening')) {
      urgency = 'immediate';
      confidence += 0.3;
    } else if (textLower.includes('this week') || textLower.includes('weekend') || textLower.includes('soon')) {
      urgency = 'soon';
      confidence += 0.2;
    } else if (textLower.includes('upcoming') || textLower.includes('next week')) {
      urgency = 'upcoming';
      confidence += 0.1;
    }
    
    // Location relevance
    if (textLower.includes(location.toLowerCase())) {
      confidence += 0.2;
    }
    
    // Date extraction
    let extractedDate = null;
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/,
      /\d{4}-\d{2}-\d{2}/,
      /\b(today|tonight|tomorrow)\b/i,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedDate = match[0];
        confidence += 0.1;
        break;
      }
    }
    
    // Time extraction
    let extractedTime = null;
    const timePattern = /\b\d{1,2}:\d{2}\s*(AM|PM|am|pm)?\b/;
    const timeMatch = text.match(timePattern);
    if (timeMatch) {
      extractedTime = timeMatch[0];
      confidence += 0.1;
    }
    
    return {
      title: text.split(' - ')[0]?.trim() || text.substring(0, 100),
      url: url,
      description: text,
      source: platform,
      eventType: eventType,
      category: category,
      urgency: urgency,
      confidence: Math.min(confidence, 1.0),
      extractedDate: extractedDate,
      extractedTime: extractedTime,
      location: location,
      searchQuery: query,
      timestamp: currentTime.toISOString(),
      relevanceScore: calculateRelevanceScore(text, location, category, eventType)
    };
    
  } catch (error) {
    console.error('Event data extraction error:', error);
    return null;
  }
}

// Advanced deduplication and scoring
function deduplicateAndScore(results, location, urgent) {
  const seen = new Set();
  const unique = [];
  
  // Sort by confidence and relevance first
  const sorted = results.sort((a, b) => {
    if (urgent) {
      // For urgent searches, prioritize immediacy
      const urgencyOrder = { 'immediate': 4, 'soon': 3, 'upcoming': 2, 'normal': 1 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      }
    }
    return (b.confidence || 0) - (a.confidence || 0);
  });
  
  for (const result of sorted) {
    const urlKey = result.url.toLowerCase().replace(/[?#].*$/, ''); // Remove query params
    const titleKey = result.title.toLowerCase().substring(0, 50);
    const combinedKey = `${urlKey}|${titleKey}`;
    
    if (!seen.has(combinedKey)) {
      seen.add(combinedKey);
      unique.push(result);
    }
  }
  
  return unique;
}

// Time-based categorization
function categorizeByTimeRelevance(results, currentTime) {
  const now = currentTime.getHours();
  const categorized = {
    immediate: [],
    tonight: [],
    thisWeek: [],
    ongoing: [],
    reference: []
  };
  
  for (const result of results) {
    switch (result.urgency) {
      case 'immediate':
        categorized.immediate.push(result);
        break;
      case 'soon':
        if (now >= 17) { // After 5 PM
          categorized.tonight.push(result);
        } else {
          categorized.thisWeek.push(result);
        }
        break;
      case 'upcoming':
        categorized.thisWeek.push(result);
        break;
      case 'reference':
        categorized.reference.push(result);
        break;
      default:
        categorized.ongoing.push(result);
    }
  }
  
  return categorized;
}

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
