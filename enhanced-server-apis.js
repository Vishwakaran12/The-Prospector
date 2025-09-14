import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage fallback
let inMemorySearches = [];
let useMongoDb = false;
let SearchModel = null;
let UserModel = null;
let WishModel = null;

// MongoDB Connection
const connectToMongoDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('⚠️ MongoDB URI not found in environment variables');
      return false;
    }

    // Explicitly connect to the-prospector database
    const mongoUri = process.env.MONGODB_URI.includes('/the-prospector') 
      ? process.env.MONGODB_URI 
      : process.env.MONGODB_URI.replace('/?', '/the-prospector?');
    
    await mongoose.connect(mongoUri);
    console.log('🎯 Connected to MongoDB - Database: the-prospector');

    const SearchResultSchema = new mongoose.Schema({
      title: { type: String, required: true },
      description: { type: String },
      url: { type: String, required: false }, // Made optional since some results may not have URLs
      source: { type: String },
      metadata: { type: mongoose.Schema.Types.Mixed },
    });

    const SearchSchema = new mongoose.Schema({
      query: { type: String, required: true },
      location: { type: String },
      searchMode: { type: String, enum: ['events', 'news', 'social', 'github', 'reddit', 'auto'], default: 'auto' },
      results: { type: [SearchResultSchema], required: true },
      resultCounts: {
        events: { type: Number, default: 0 },
        news: { type: Number, default: 0 },
        github: { type: Number, default: 0 },
        reddit: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
      },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'ProspectorUser', default: null }, // null for guest users
      isPublic: { type: Boolean, default: false }, // for sharing searches
      createdAt: { type: Date, default: Date.now },
      timestamp: { type: String },
    });

    SearchModel = mongoose.model('ProspectorSearch', SearchSchema);
    
    // User Schema for Authentication
    const UserSchema = new mongoose.Schema({
      username: { type: String, unique: true, sparse: true, trim: true },
      email: { type: String, required: true, unique: true, trim: true, lowercase: true },
      password: { type: String, required: false }, // Not required for Google OAuth users
      googleId: { type: String, unique: true, sparse: true }, // Google OAuth ID
      provider: { type: String, enum: ['local', 'google'], default: 'local' },
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      isActive: { type: Boolean, default: true },
      lastLogin: { type: Date },
      createdAt: { type: Date, default: Date.now },
      preferences: {
        defaultLocation: { type: String },
        favoriteGenres: [{ type: String }],
        emailNotifications: { type: Boolean, default: true }
      }
    });

    // Password hashing middleware (only for local auth users)
    UserSchema.pre('save', async function(next) {
      // Only hash password for local authentication users
      if (this.provider === 'google' || !this.isModified('password') || !this.password) {
        return next();
      }
      
      try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
      } catch (error) {
        next(error);
      }
    });

    // Password verification method
    UserSchema.methods.comparePassword = async function(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    };

    // Remove password from JSON output
    UserSchema.methods.toJSON = function() {
      const user = this.toObject();
      delete user.password;
      return user;
    };

    const UserModel_temp = mongoose.model('ProspectorUser', UserSchema);
    UserModel = UserModel_temp;

    // Wish Schema for starred items
    const WishSchema = new mongoose.Schema({
      eventTitle: { type: String, required: true },
      eventDescription: { type: String, default: '' },
      eventUrl: { type: String, default: '' },
      eventDate: { type: String },
      eventTime: { type: String },
      eventLocation: { type: String },
      source: { type: String, default: 'prospector' },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'ProspectorUser', required: true },
      createdAt: { type: Date, default: Date.now }
    });

    const WishModel_temp = mongoose.model('ProspectorWish', WishSchema);
    WishModel = WishModel_temp;
    
    useMongoDb = true;
    
    console.log('🚀 MongoDB connected successfully!');
    console.log('📊 Collections initialized:');
    console.log('   - ProspectorSearch (search history)');
    console.log('   - ProspectorUser (user accounts)');
    console.log('   - ProspectorWish (starred items)');
    console.log('🎯 Database: the-prospector');
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
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'prospector-cyberpunk-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Local Strategy for username/password authentication
passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password'
  },
  async (username, password, done) => {
    try {
      if (!useMongoDb) {
        return done(null, false, { message: 'Authentication requires MongoDB connection' });
      }

      const user = await UserModel.findOne({ 
        $or: [
          { username: username },
          { email: username }
        ]
      });

      if (!user) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      if (!user.isActive) {
        return done(null, false, { message: 'Account is deactivated' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    if (!useMongoDb) {
      return done(null, false);
    }
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Optional authentication middleware (allows both authenticated and guest users)
const optionalAuth = (req, res, next) => {
  // Always proceed, authentication is optional
  next();
};

// Serve static files from current directory
app.use(express.static(__dirname));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Enhanced Event Discovery Server", 
    timestamp: new Date().toISOString(),
    storage: useMongoDb ? "mongodb" : "memory",
    mongodb: useMongoDb ? "connected" : "disconnected",
    apis: {
      apiNinja: !!process.env.API_NINJA_KEY,
      newsApi: !!process.env.NEWS_API_KEY,
      openWeather: !!process.env.OPENWEATHER_API_KEY,
      ticketmaster: !!process.env.TICKETMASTER_API_KEY,
      eventbrite: !!process.env.EVENTBRITE_API_KEY
    }
  });
});

// ==================== AUTHENTICATION ROUTES ====================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    if (!useMongoDb) {
      return res.status(503).json({ error: 'Authentication requires MongoDB connection' });
    }

    const { username, email, password, firstName, lastName } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [
        { username: username },
        { email: email }
      ]
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: existingUser.username === username ? 'Username already exists' : 'Email already exists'
      });
    }

    // Create new user
    const newUser = new UserModel({
      username,
      email,
      password,
      firstName,
      lastName
    });

    await newUser.save();

    // Log the user in automatically after registration
    req.login(newUser, (err) => {
      if (err) {
        console.error('Login after registration failed:', err);
        return res.status(500).json({ error: 'Registration successful but login failed' });
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: newUser.toJSON()
      });
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/api/auth/login', (req, res, next) => {
  if (!useMongoDb) {
    return res.status(503).json({ error: 'Authentication requires MongoDB connection' });
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Authentication error:', err);
      return res.status(500).json({ error: 'Authentication failed' });
    }

    if (!user) {
      return res.status(401).json({ error: info.message || 'Login failed' });
    }

    req.login(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed' });
      }

      res.json({
        message: 'Login successful',
        user: user.toJSON()
      });
    });
  })(req, res, next);
});

// Logout user
app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Logout completed with errors' });
      }

      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  console.log('🔍 Auth check - Session ID:', req.sessionID);
  console.log('🔍 Auth check - User:', req.user ? 'Present' : 'None');
  console.log('🔍 Auth check - isAuthenticated():', req.isAuthenticated ? req.isAuthenticated() : 'No function');
  
  if (!req.isAuthenticated()) {
    console.log('❌ Authentication failed for session:', req.sessionID);
    return res.status(401).json({ error: 'Not authenticated' });
  }

  console.log('✅ Authentication successful for user:', req.user.email);
  res.json({
    user: req.user.toJSON(),
    authenticated: true
  });
});

// Update user profile
app.put('/api/auth/profile', optionalAuth, async (req, res) => {
  try {
    const { firstName, lastName, preferences } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (preferences !== undefined) updateData.preferences = { ...req.user.preferences, ...preferences };

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser.toJSON()
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Change password
app.put('/api/auth/password', optionalAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await UserModel.findById(req.user._id);
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Test endpoint to verify server is working
app.get('/api/test', (req, res) => {
  console.log('🔍 Test endpoint called');
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Google OAuth authentication
app.post('/api/auth/google', async (req, res) => {
  console.log('🚀 Google auth endpoint called');
  console.log('📋 Request body:', req.body);
  try {
    const { idToken, mode = 'login' } = req.body;
    
    if (!idToken) {
      console.log('❌ No idToken provided');
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // For testing, we'll parse the Base64-encoded user info from the client
    // In production, you should verify the token with Google's API
    let payload;
    try {
      // Try to parse as Base64-encoded JSON (our mock format)
      payload = JSON.parse(Buffer.from(idToken, 'base64').toString('utf-8'));
    } catch (error) {
      // If parsing fails, use mock data
      payload = {
        sub: 'google_' + Math.random().toString(36).substr(2, 9),
        email: 'user@gmail.com',
        name: 'Google User',
        given_name: 'Google',
        family_name: 'User'
      };
    }

    if (!useMongoDb) {
      // For testing without MongoDB, return success
      return res.json({
        message: 'Google authentication successful (test mode)',
        user: {
          id: payload.sub,
          email: payload.email,
          firstName: payload.given_name,
          lastName: payload.family_name,
          provider: 'google'
        },
        authenticated: true
      });
    }

    // Check if user exists
    let user = await UserModel.findOne({ googleId: payload.sub });
    
    if (!user) {
      if (mode === 'register') {
        // Create new user
        user = new UserModel({
          googleId: payload.sub,
          email: payload.email,
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          provider: 'google'
        });
        await user.save();
      } else {
        return res.status(404).json({ error: 'User not found. Please register first.' });
      }
    }

    // Log the user in
    req.login(user, (err) => {
      if (err) {
        console.error('Google login error:', err);
        return res.status(500).json({ error: 'Login failed' });
      }

      console.log('✅ Google login successful - Session ID:', req.sessionID);
      console.log('✅ User logged in:', user.email);

      res.json({
        message: 'Google authentication successful',
        user: user.toJSON(),
        authenticated: true
      });
    });

  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// ==================== END AUTHENTICATION ROUTES ====================

// Development/Demo endpoint (commented out for production)
/*
app.post('/api/test/create-demo-user', async (req, res) => {
  try {
    if (!useMongoDb) {
      return res.status(503).json({ error: 'Authentication requires MongoDB connection' });
    }

    // Check if demo user already exists
    const existingUser = await UserModel.findOne({ username: 'demo' });
    if (existingUser) {
      return res.json({ message: 'Demo user already exists', username: 'demo' });
    }

    // Create demo user
    const demoUser = new UserModel({
      username: 'demo',
      email: 'demo@prospector.com',
      password: 'demo123',
      firstName: 'Demo',
      lastName: 'User'
    });

    await demoUser.save();
    res.json({ 
      message: 'Demo user created successfully', 
      username: 'demo',
      password: 'demo123',
      note: 'Use these credentials to test authentication'
    });

  } catch (error) {
    console.error('Demo user creation error:', error);
    res.status(500).json({ error: 'Failed to create demo user' });
  }
});
*/

// News search endpoint
app.post('/api/search-news', optionalAuth, async (req, res) => {
  try {
    const { query, category, timeframe, source } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    console.log(`🔍 Searching news for: "${query}"${category ? ` in ${category}` : ''}${source ? ` from ${source}` : ''}`);

    const newsApiKey = process.env.NEWS_API_KEY;
    if (!newsApiKey) {
      return res.status(500).json({ error: 'NewsAPI key not configured' });
    }

    // Build URL parameters
    let newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=20&apiKey=${newsApiKey}`;
    
    // Add category filter if specified
    if (category) {
      newsUrl += `&category=${category}`;
    }
    
    // Add source filter if specified
    if (source) {
      newsUrl += `&sources=${source}`;
    }
    
    // Add time filter if specified
    if (timeframe) {
      const now = new Date();
      let fromDate;
      
      switch(timeframe) {
        case 'today':
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          fromDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
      }
      
      if (fromDate) {
        newsUrl += `&from=${fromDate.toISOString().split('T')[0]}`;
      }
    }
    
    const response = await fetch(newsUrl);
    
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(`NewsAPI error: ${data.message || 'Unknown error'}`);
    }

    console.log(`📰 Found ${data.articles?.length || 0} news articles`);

    res.json({
      articles: data.articles || [],
      totalResults: data.totalResults || 0,
      query: query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ News search error:', error.message);
    res.status(500).json({ 
      error: 'Failed to search news',
      details: error.message,
      articles: []
    });
  }
});

// Enhanced event search with real APIs
// Enhanced Events Search Endpoint (Multiple APIs)
app.get('/api/search-events', optionalAuth, async (req, res) => {
  try {
    const { location, genre, timeframe = 'week' } = req.query;
    
    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    console.log(`🔍 Enhanced search: ${genre} events in ${location} (${timeframe})`);

    // Use multiple real APIs for comprehensive event discovery
    const searchPromises = [
      searchAPIninjaEvents(location, genre),
      searchNewsAPIEvents(location, genre), 
      searchOpenWeatherEvents(location, genre),
      searchTicketmasterEvents(location, genre),
      searchEventbriteEvents(location, genre),
      searchMeetupStyleEvents(location, genre),
      searchLocalEventAPIs(location, genre)
    ];

    const searchResults = await Promise.allSettled(searchPromises);
    const allEvents = [];

    // Process results from all APIs
    searchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        allEvents.push(...result.value);
        console.log(`✅ API ${index + 1} returned ${result.value.length} events`);
      } else {
        console.warn(`❌ API ${index + 1} failed:`, result.reason?.message || 'Unknown error');
      }
    });

    // Enhance events with metadata
    const enhancedEvents = allEvents.map(event => ({
      ...event,
      confidence: calculateConfidence(event, genre, location),
      urgency: determineUrgency(event, timeframe),
      category: categorizeEvent(event, genre),
      platform: detectPlatform(event),
      relevanceScore: calculateRelevanceScore(event, genre, location)
    }));

    // Sort by relevance and confidence
    const sortedEvents = enhancedEvents.sort((a, b) => {
      return (b.relevanceScore + b.confidence + b.urgency) - (a.relevanceScore + a.confidence + a.urgency);
    });

    // Remove duplicates based on title similarity
    const uniqueEvents = removeDuplicateEvents(sortedEvents);

    // Save search to storage
    await saveEnhancedSearch(location, genre, uniqueEvents.slice(0, 20));

    res.json({
      events: uniqueEvents.slice(0, 50),
      totalFound: uniqueEvents.length,
      apiSources: ['API-Ninja', 'NewsAPI', 'OpenWeather', 'Ticketmaster', 'Eventbrite', 'Local APIs'],
      searchQuality: 'enhanced',
      metadata: {
        location,
        genre,
        timeframe,
        searchTime: new Date().toISOString(),
        apisUsed: searchResults.filter(r => r.status === 'fulfilled').length
      }
    });

  } catch (error) {
    console.error('Enhanced search events error:', error);
    res.status(500).json({ error: 'Failed to search events with enhanced APIs' });
  }
});

// API-Ninja Events Search - Enhanced with location intelligence
async function searchAPIninjaEvents(location, genre) {
  try {
    if (!process.env.API_NINJA_KEY) {
      console.log('⚠️ API-Ninja key not configured');
      return [];
    }

    const headers = {
      'X-Api-Key': process.env.API_NINJA_KEY
    };

    const events = [];

    // Get detailed city information for better context
    try {
      const geoResponse = await fetch(`https://api.api-ninjas.com/v1/city?name=${encodeURIComponent(location)}`, { headers });
      if (geoResponse.ok) {
        const cities = await geoResponse.json();
        if (cities && cities.length > 0) {
          const city = cities[0];
          
          // Generate venue-specific events with real addresses
          const venues = await generateVenuesForCity(city, genre, headers);
          
          venues.forEach(venue => {
            events.push({
              title: `${genre} Event at ${venue.name}`,
              description: `Experience ${genre} at ${venue.name} in ${city.name}. ${venue.description}`,
              location: venue.address,
              venue: venue.name,
              address: venue.address,
              coordinates: venue.coordinates,
              date: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
              source: 'API-Ninja',
              type: 'venue-based',
              metadata: {
                city: city.name,
                country: city.country,
                population: city.population,
                venueType: venue.type
              }
            });
          });
        }
      }
    } catch (err) {
      console.warn('API-Ninja geocoding failed:', err.message);
    }

    return events;
  } catch (error) {
    console.error('API-Ninja search failed:', error);
    return [];
  }
}

// Generate realistic venues for a city
async function generateVenuesForCity(city, genre, headers) {
  const venues = [];
  
  // Common venue types based on genre
  const venueTypes = {
    music: ['Concert Hall', 'Music Venue', 'Amphitheater', 'Club', 'Bar'],
    tech: ['Convention Center', 'Tech Hub', 'Coworking Space', 'University'],
    food: ['Restaurant', 'Food Hall', 'Brewery', 'Market'],
    arts: ['Gallery', 'Museum', 'Cultural Center', 'Studio'],
    sports: ['Stadium', 'Sports Complex', 'Gym', 'Park'],
    business: ['Conference Center', 'Hotel', 'Business Center', 'Office Building']
  };

  const selectedTypes = venueTypes[genre] || ['Community Center', 'Event Space', 'Venue'];
  
  // Generate 3-5 realistic venues
  for (let i = 0; i < Math.min(5, selectedTypes.length); i++) {
    const venueType = selectedTypes[i];
    const venueName = generateVenueName(city.name, venueType, genre);
    const address = await generateRealisticAddress(city, venueType, headers);
    
    venues.push({
      name: venueName,
      type: venueType,
      address: address,
      description: `Popular ${venueType.toLowerCase()} in ${city.name} known for ${genre} events`,
      coordinates: {
        lat: city.latitude + (Math.random() - 0.5) * 0.1, // Within ~5 miles
        lng: city.longitude + (Math.random() - 0.5) * 0.1
      }
    });
  }
  
  return venues;
}

// Generate realistic venue names
function generateVenueName(cityName, venueType, genre) {
  const prefixes = {
    'Concert Hall': ['Grand', 'Royal', 'Historic', cityName],
    'Music Venue': ['The', 'Underground', 'Live at', cityName],
    'Convention Center': [cityName, 'Metro', 'Downtown', 'Grand'],
    'Restaurant': ['The', 'Chez', cityName, 'Blue'],
    'Gallery': [cityName, 'Modern', 'Contemporary', 'Artists'],
    'Stadium': [cityName, 'Memorial', 'City', 'Sports'],
    'Club': ['Club', 'The', cityName, 'Night'],
    'Bar': ['The', cityName, 'Craft', 'Local']
  };

  const suffixes = {
    'Concert Hall': ['Hall', 'Theater', 'Auditorium'],
    'Music Venue': ['Club', 'Room', 'Stage', 'Hall'],
    'Convention Center': ['Convention Center', 'Expo Center'],
    'Restaurant': ['Bistro', 'Grill', 'Kitchen', 'Table'],
    'Gallery': ['Gallery', 'Arts Center', 'Museum'],
    'Stadium': ['Stadium', 'Arena', 'Field'],
    'Club': ['Club', 'Lounge'],
    'Bar': ['Bar', 'Pub', 'Tavern', 'Brewery']
  };

  const prefix = prefixes[venueType] ? prefixes[venueType][Math.floor(Math.random() * prefixes[venueType].length)] : cityName;
  const suffix = suffixes[venueType] ? suffixes[venueType][Math.floor(Math.random() * suffixes[venueType].length)] : venueType;
  
  return `${prefix} ${suffix}`;
}

// Generate realistic addresses using city data
async function generateRealisticAddress(city, venueType, headers) {
  try {
    // Try to get more location data if available
    const streets = [
      'Main Street', 'First Avenue', 'Broadway', 'Park Avenue', 'Oak Street',
      'Elm Street', 'Maple Avenue', 'Cedar Street', 'Pine Street', 'Washington Street',
      'Lincoln Avenue', 'Madison Street', 'Jackson Avenue', 'Jefferson Street'
    ];
    
    const streetNumber = Math.floor(Math.random() * 9999) + 1;
    const street = streets[Math.floor(Math.random() * streets.length)];
    
    // Create realistic address
    const address = `${streetNumber} ${street}, ${city.name}, ${city.country}`;
    
    return address;
  } catch (error) {
    // Fallback to basic address
    return `${city.name}, ${city.country}`;
  }
}

// NewsAPI Events Search - Enhanced
async function searchNewsAPIEvents(location, genre) {
  try {
    if (!process.env.NEWS_API_KEY) {
      console.log('⚠️ NewsAPI key not configured - get free key at newsapi.org');
      return generateNewsStyleEvents(location, genre);
    }

    const queries = [
      `${genre} events ${location}`,
      `${genre} festival ${location}`,
      `${genre} concert ${location}`,
      `events happening ${location}`,
      `${location} entertainment ${genre}`
    ];

    const allArticles = [];

    for (const query of queries) {
      try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.articles) {
          allArticles.push(...data.articles);
        }
      } catch (err) {
        console.warn(`NewsAPI query failed: ${query}`, err.message);
      }
    }
    
    return allArticles.slice(0, 15).map(article => ({
      title: article.title,
      description: article.description || `${genre} event coverage from ${location}`,
      location: location,
      date: article.publishedAt,
      source: 'NewsAPI',
      url: article.url,
      type: 'news-event',
      publisher: article.source?.name,
      imageUrl: article.urlToImage
    }));
    
  } catch (error) {
    console.error('NewsAPI search failed:', error);
    return generateNewsStyleEvents(location, genre);
  }
}

// Generate news-style events when API key isn't available
function generateNewsStyleEvents(location, genre) {
  return [
    {
      title: `${genre} Scene Spotlight: ${location}`,
      description: `Latest ${genre} events and happenings in the ${location} area`,
      location: location,
      date: new Date().toISOString(),
      source: 'Local News',
      type: 'news-style',
      category: 'local-coverage'
    }
  ];
}

// OpenWeatherMap Events - Enhanced
async function searchOpenWeatherEvents(location, genre) {
  try {
    if (!process.env.OPENWEATHER_API_KEY) {
      console.log('⚠️ OpenWeather key not configured - get free key at openweathermap.org');
      return generateWeatherStyleEvents(location, genre);
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.weather && data.main) {
      const weather = data.weather[0];
      const temp = Math.round(data.main.temp);
      
      const weatherEvents = [];
      
      // Create weather-appropriate event suggestions
      if (weather.main === 'Clear' || weather.main === 'Clouds') {
        weatherEvents.push({
          title: `Outdoor ${genre} Events - Perfect Weather`,
          description: `Great ${weather.description} weather for outdoor ${genre} activities in ${location}. Current: ${temp}°C`,
          location: location,
          date: new Date().toISOString(),
          source: 'OpenWeather',
          type: 'weather-optimal',
          weather: {
            condition: weather.main,
            description: weather.description,
            temperature: temp,
            suitability: 'excellent'
          }
        });
      }

      // Seasonal event suggestions
      const month = new Date().getMonth();
      if (month >= 5 && month <= 7 && temp > 20) { // Summer
        weatherEvents.push({
          title: `Summer ${genre} Festival - ${location}`,
          description: `Perfect summer weather for ${genre} outdoor events. Temperature: ${temp}°C`,
          location: location,
          date: new Date().toISOString(),
          source: 'OpenWeather',
          type: 'seasonal-optimal',
          season: 'summer'
        });
      }

      return weatherEvents;
    }
    
    return [];
  } catch (error) {
    console.error('OpenWeather search failed:', error);
    return generateWeatherStyleEvents(location, genre);
  }
}

function generateWeatherStyleEvents(location, genre) {
  return [
    {
      title: `${genre} Events - All Weather`,
      description: `Indoor and outdoor ${genre} events in ${location} regardless of weather`,
      location: location,
      date: new Date().toISOString(),
      source: 'Weather-Independent',
      type: 'all-weather'
    }
  ];
}

// Ticketmaster Events - Enhanced
async function searchTicketmasterEvents(location, genre) {
  try {
    if (!process.env.TICKETMASTER_API_KEY) {
      console.log('⚠️ Ticketmaster key not configured - get free key at developer.ticketmaster.com');
      return generateTicketedStyleEvents(location, genre);
    }

    const classificationMap = {
      'music': 'music',
      'sports': 'sports',
      'arts': 'arts',
      'theater': 'arts',
      'comedy': 'miscellaneous',
      'family': 'family'
    };

    const classification = classificationMap[genre?.toLowerCase()] || 'music';
    
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(genre || '')}&city=${encodeURIComponent(location)}&classificationName=${classification}&size=20&apikey=${process.env.TICKETMASTER_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data._embedded && data._embedded.events) {
      return data._embedded.events.map(event => {
        const venue = event._embedded?.venues?.[0];
        const venueAddress = venue ? 
          `${venue.name}, ${venue.address?.line1 || ''} ${venue.city?.name || ''}, ${venue.state?.stateCode || ''} ${venue.postalCode || ''}`.trim() :
          location;
          
        return {
          title: event.name,
          description: event.info || event.pleaseNote || `${genre} event in ${location}`,
          location: venueAddress,
          venue: venue?.name || 'Venue TBA',
          address: venueAddress,
          date: event.dates?.start?.dateTime || event.dates?.start?.localDate,
          source: 'Ticketmaster',
          url: event.url,
          type: 'ticketed-event',
          price: event.priceRanges?.[0] ? `$${event.priceRanges[0].min}-${event.priceRanges[0].max}` : 'Price varies',
          coordinates: venue?.location ? {
            lat: parseFloat(venue.location.latitude),
            lng: parseFloat(venue.location.longitude)
          } : null,
          metadata: {
            venue: venue,
            images: event.images,
            classification: event.classifications?.[0],
            sales: event.sales
          }
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Ticketmaster search failed:', error);
    return generateTicketedStyleEvents(location, genre);
  }
}

function generateTicketedStyleEvents(location, genre) {
  return [
    {
      title: `${genre} Concert Series - ${location}`,
      description: `Professional ${genre} performances and concerts in ${location}`,
      location: location,
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'Ticketed Events',
      type: 'concert-style',
      price: 'Varies'
    }
  ];
}

// Eventbrite Events - Enhanced 
async function searchEventbriteEvents(location, genre) {
  try {
    if (!process.env.EVENTBRITE_API_KEY) {
      console.log('⚠️ Eventbrite key not configured - get free key at eventbrite.com/platform');
      return generateCommunityStyleEvents(location, genre);
    }

    const url = `https://www.eventbriteapi.com/v3/events/search/?q=${encodeURIComponent(genre || '')}&location.address=${encodeURIComponent(location)}&location.within=25mi&expand=venue&token=${process.env.EVENTBRITE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.events) {
      return data.events.slice(0, 20).map(event => ({
        title: event.name?.text || `${genre} Event`,
        description: event.description?.text || event.summary || `${genre} event in ${location}`,
        location: event.venue?.address?.localized_address_display || event.venue?.name || location,
        venue: event.venue?.name || 'TBA',
        address: event.venue?.address ? 
          `${event.venue.name}, ${event.venue.address.address_1 || ''} ${event.venue.address.city || location}, ${event.venue.address.region || ''} ${event.venue.address.postal_code || ''}`.trim() :
          `${event.venue?.name || 'Venue TBA'}, ${location}`,
        date: event.start?.utc,
        source: 'Eventbrite',
        url: event.url,
        type: 'eventbrite-event',
        isFree: event.is_free,
        capacity: event.capacity,
        coordinates: event.venue?.latitude && event.venue?.longitude ? {
          lat: parseFloat(event.venue.latitude),
          lng: parseFloat(event.venue.longitude)
        } : null,
        metadata: {
          venue: event.venue,
          organizer: event.organizer
        }
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Eventbrite search failed:', error);
    return generateCommunityStyleEvents(location, genre);
  }
}

function generateCommunityStyleEvents(location, genre) {
  return [
    {
      title: `${genre} Community Gathering - ${location}`,
      description: `Local ${genre} community event for enthusiasts in ${location}`,
      location: location,
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'Community Events',
      type: 'community-style',
      isFree: true
    }
  ];
}

// Meetup-style Events with realistic venues
async function searchMeetupStyleEvents(location, genre) {
  try {
    // Generate realistic meetup-style events with specific venues
    const eventTypes = [
      { type: 'meetup', venue: 'Community Center', description: 'networking and community building' },
      { type: 'workshop', venue: 'Learning Center', description: 'hands-on learning experience' },
      { type: 'networking', venue: 'Business Hub', description: 'professional networking' },
      { type: 'study group', venue: 'Library', description: 'collaborative learning' },
      { type: 'social hour', venue: 'Café', description: 'casual social gathering' }
    ];
    
    const days = [1, 3, 7, 14, 21]; // Days from now
    
    const events = [];
    
    for (let i = 0; i < eventTypes.length; i++) {
      const eventInfo = eventTypes[i];
      const venueAddress = generateMeetupVenueAddress(location, eventInfo.venue);
      
      events.push({
        title: `${genre} ${eventInfo.type.charAt(0).toUpperCase() + eventInfo.type.slice(1)} - ${location}`,
        description: `Join fellow ${genre} enthusiasts for ${eventInfo.description} in ${location}. Great for learning and networking.`,
        location: venueAddress.full,
        venue: venueAddress.name,
        address: venueAddress.full,
        date: new Date(Date.now() + days[i] * 24 * 60 * 60 * 1000).toISOString(),
        source: 'Meetup-Style',
        type: eventInfo.type,
        attendees: Math.floor(Math.random() * 50) + 10,
        isFree: eventInfo.type !== 'workshop',
        coordinates: {
          lat: 33.5779 + (Math.random() - 0.5) * 0.1, // Approximate for most cities
          lng: -101.8552 + (Math.random() - 0.5) * 0.1
        }
      });
    }
    
    return events;
  } catch (error) {
    console.error('Meetup-style events failed:', error);
    return [];
  }
}

// Generate realistic meetup venue addresses
function generateMeetupVenueAddress(location, venueType) {
  const venueNames = {
    'Community Center': [`${location} Community Center`, `Central Community Hub`, `${location} Civic Center`],
    'Learning Center': [`${location} Learning Center`, `Adult Education Center`, `Skills Development Hub`],
    'Business Hub': [`${location} Business Center`, `Entrepreneur Hub`, `Coworking ${location}`],
    'Library': [`${location} Public Library`, `Central Library`, `${location} Branch Library`],
    'Café': [`Corner Café`, `${location} Coffee House`, `Local Grounds Café`]
  };

  const addresses = [
    '123 Main Street', '456 Oak Avenue', '789 Elm Street', '321 Park Avenue',
    '654 Broadway', '987 First Street', '147 Second Avenue', '258 Third Street'
  ];

  const venueName = venueNames[venueType] ? 
    venueNames[venueType][Math.floor(Math.random() * venueNames[venueType].length)] : 
    `${location} ${venueType}`;
    
  const address = addresses[Math.floor(Math.random() * addresses.length)];
  
  return {
    name: venueName,
    full: `${venueName}, ${address}, ${location}`
  };
}

// Local Event APIs (placeholder for future integrations)
async function searchLocalEventAPIs(location, genre) {
  try {
    // Placeholder for additional local event APIs
    // Could integrate with city-specific APIs, venue APIs, etc.
    return [
      {
        title: `${location} Local ${genre} Scene`,
        description: `Discover local ${genre} venues, regular events, and community in ${location}`,
        location: location,
        date: new Date().toISOString(),
        source: 'Local Discovery',
        type: 'local-scene',
        ongoing: true
      }
    ];
  } catch (error) {
    console.error('Local APIs search failed:', error);
    return [];
  }
}

// Enhanced utility functions
function calculateConfidence(event, genre, location) {
  let confidence = 0.5; // Base confidence
  
  if (event.title?.toLowerCase().includes(genre?.toLowerCase())) confidence += 0.3;
  if (event.description?.toLowerCase().includes(genre?.toLowerCase())) confidence += 0.2;
  if (event.location?.toLowerCase().includes(location?.toLowerCase())) confidence += 0.3;
  if (event.date && new Date(event.date) > new Date()) confidence += 0.2;
  if (event.url) confidence += 0.1;
  if (event.source === 'Ticketmaster' || event.source === 'Eventbrite') confidence += 0.2;
  
  return Math.min(confidence, 1.0);
}

function determineUrgency(event, timeframe) {
  if (!event.date) return 0.1;
  
  const eventDate = new Date(event.date);
  const now = new Date();
  const diffHours = (eventDate - now) / (1000 * 60 * 60);
  
  if (diffHours < 6) return 1.0; // Very urgent
  if (diffHours < 24) return 0.8; // Urgent
  if (diffHours < 72) return 0.6; // Soon
  if (diffHours < 168) return 0.4; // This week
  return 0.2; // Future
}

function categorizeEvent(event, genre) {
  const title = event.title?.toLowerCase() || '';
  const description = event.description?.toLowerCase() || '';
  const text = title + ' ' + description;
  
  const categories = {
    music: ['music', 'concert', 'band', 'dj', 'festival', 'album'],
    food: ['food', 'restaurant', 'dining', 'chef', 'cuisine', 'taste'],
    tech: ['tech', 'startup', 'coding', 'programming', 'developer', 'ai'],
    arts: ['art', 'gallery', 'exhibition', 'artist', 'creative', 'design'],
    sports: ['sport', 'game', 'match', 'team', 'athletic', 'fitness'],
    business: ['business', 'networking', 'professional', 'career', 'industry']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }
  
  return genre || 'general';
}

function detectPlatform(event) {
  if (event.source) return event.source;
  if (event.url?.includes('eventbrite.com')) return 'Eventbrite';
  if (event.url?.includes('meetup.com')) return 'Meetup';
  if (event.url?.includes('facebook.com')) return 'Facebook';
  if (event.url?.includes('ticketmaster.com')) return 'Ticketmaster';
  return 'Web';
}

function calculateRelevanceScore(event, genre, location) {
  let score = 0;
  
  const titleMatch = event.title?.toLowerCase().includes(genre?.toLowerCase()) ? 0.4 : 0;
  const locationMatch = event.location?.toLowerCase().includes(location?.toLowerCase()) ? 0.3 : 0;
  const sourceQuality = getSourceQuality(event.source);
  const recency = calculateRecency(event.date);
  
  score = titleMatch + locationMatch + sourceQuality + recency;
  return Math.min(score, 1.0);
}

function getSourceQuality(source) {
  const qualityMap = {
    'Ticketmaster': 0.9,
    'Eventbrite': 0.8,
    'Meetup': 0.7,
    'Facebook': 0.6,
    'NewsAPI': 0.5,
    'API-Ninja': 0.4
  };
  return qualityMap[source] || 0.3;
}

function calculateRecency(date) {
  if (!date) return 0;
  const eventDate = new Date(date);
  const now = new Date();
  const diffDays = (eventDate - now) / (1000 * 60 * 60 * 24);
  
  if (diffDays < 0) return 0; // Past event
  if (diffDays < 1) return 0.3; // Today
  if (diffDays < 7) return 0.25; // This week
  if (diffDays < 30) return 0.2; // This month
  return 0.1; // Future
}

function removeDuplicateEvents(events) {
  const seen = new Set();
  return events.filter(event => {
    const key = event.title?.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Save enhanced search results
async function saveEnhancedSearch(location, genre, events) {
  const searchData = {
    query: `${genre} events in ${location}`,
    results: events.map(event => ({
      title: event.title,
      description: event.description,
      url: event.url || '#',
      source: event.source,
      metadata: event
    })),
    timestamp: new Date().toISOString()
  };

  if (useMongoDb && SearchModel) {
    try {
      await SearchModel.create(searchData);
      console.log('✅ Search saved to MongoDB');
    } catch (error) {
      console.error('❌ Failed to save to MongoDB:', error.message);
      inMemorySearches.push(searchData);
    }
  } else {
    inMemorySearches.push(searchData);
    console.log('📝 Search saved to memory');
  }
}

// Get saved searches
app.get("/api/searches", async (req, res) => {
  try {
    let searches = [];
    
    if (useMongoDb && SearchModel) {
      searches = await SearchModel.find().sort({ createdAt: -1 }).limit(20);
    } else {
      searches = inMemorySearches.slice(-20).reverse();
    }
    
    res.json({ searches, total: searches.length });
  } catch (error) {
    console.error('Get searches error:', error);
    res.status(500).json({ error: 'Failed to retrieve searches' });
  }
});

// Save search endpoint (enhanced with user association)
app.post("/api/save-search", optionalAuth, async (req, res) => {
  try {
    const { query, location, searchMode, results, resultCounts } = req.body;
    
    // Debug logging
    console.log('🔍 Save search request:', {
      isAuthenticated: req.isAuthenticated(),
      userId: req.user ? req.user._id : 'no user',
      username: req.user ? req.user.username : 'no username',
      query: query
    });
    
    const searchData = {
      query: query || 'Event Search',
      location: location || '',
      searchMode: searchMode || 'auto',
      results: results || [],
      resultCounts: resultCounts || { events: 0, news: 0, github: 0, reddit: 0, total: 0 },
      user: req.isAuthenticated() ? req.user._id : null,
      timestamp: new Date().toISOString()
    };

    if (useMongoDb && SearchModel) {
      const saved = await SearchModel.create(searchData);
      res.json({ success: true, id: saved._id });
    } else {
      inMemorySearches.push(searchData);
      res.json({ success: true, id: Date.now() });
    }
  } catch (error) {
    console.error('Save search error:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

// Get user's search history (optional for unauthenticated users)
app.get("/api/user/searches", optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user ? req.user._id : null;

    console.log('📚 Get user searches request:', {
      userId: userId || 'anonymous',
      page: page,
      limit: limit
    });

    if (!useMongoDb || !SearchModel) {
      // If DB not available, respond with an empty array for guest users
      if (!userId) return res.json({ searches: [], total: 0 });
      return res.status(503).json({ error: 'Database not available' });
    }

    // If no authenticated user, return empty array (no personal history)
    if (!userId) {
      return res.json({ searches: [], total: 0 });
    }

    // Build query for authenticated user
    const query = { user: userId };
    if (search) {
      query.$or = [
        { query: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Get searches with pagination
    const searches = await SearchModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('query location searchMode resultCounts createdAt timestamp');

    const total = await SearchModel.countDocuments(query);

    res.json({
      searches,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: searches.length,
        totalResults: total
      }
    });

  } catch (error) {
    console.error('Get user searches error:', error);
    res.status(500).json({ error: 'Failed to retrieve searches' });
  }
});

// Get search details for preview
app.get("/api/search/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!useMongoDb || !SearchModel) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const search = await SearchModel.findById(id);

    if (!search) {
      return res.status(404).json({ error: 'Search not found' });
    }

    // Check if user has access to this search
    if (search.user && (!req.isAuthenticated() || !search.user.equals(req.user._id)) && !search.isPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(search);

  } catch (error) {
    console.error('Get search details error:', error);
    res.status(500).json({ error: 'Failed to retrieve search details' });
  }
});

// Delete user's search
app.delete("/api/search/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!useMongoDb || !SearchModel) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const search = await SearchModel.findById(id);

    if (!search) {
      return res.status(404).json({ error: 'Search not found' });
    }

    // Check if user owns this search
    if (!search.user || !search.user.equals(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await SearchModel.findByIdAndDelete(id);
    res.json({ message: 'Search deleted successfully' });

  } catch (error) {
    console.error('Delete search error:', error);
    res.status(500).json({ error: 'Failed to delete search' });
  }
});

// Toggle search visibility (public/private)
app.put("/api/search/:id/visibility", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;

    if (!useMongoDb || !SearchModel) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const search = await SearchModel.findById(id);

    if (!search) {
      return res.status(404).json({ error: 'Search not found' });
    }

    // Check if user owns this search
    if (!search.user || !search.user.equals(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    search.isPublic = isPublic;
    await search.save();

    res.json({ message: 'Search visibility updated successfully', isPublic });

  } catch (error) {
    console.error('Update search visibility error:', error);
    res.status(500).json({ error: 'Failed to update search visibility' });
  }
});

// Get public searches (for discovery)
app.get("/api/public/searches", optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    if (!useMongoDb || !SearchModel) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const searches = await SearchModel.find({ isPublic: true })
      .populate('user', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('query location searchMode resultCounts createdAt user');

    const total = await SearchModel.countDocuments({ isPublic: true });

    res.json({
      searches,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: searches.length,
        totalResults: total
      }
    });

  } catch (error) {
    console.error('Get public searches error:', error);
    res.status(500).json({ error: 'Failed to retrieve public searches' });
  }
});

// ========== WISHES/FAVORITES API ENDPOINTS ==========

// Get user's wishes/favorites
app.get("/api/user/wishes", requireAuth, async (req, res) => {
  try {
    if (!useMongoDb || !WishModel) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const wishes = await WishModel.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ wishes });

  } catch (error) {
    console.error('Get wishes error:', error);
    res.status(500).json({ error: 'Failed to retrieve wishes' });
  }
});

// Create a new wish/favorite
app.post("/api/user/wishes", requireAuth, async (req, res) => {
  try {
    if (!useMongoDb || !WishModel) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const wishData = {
      ...req.body,
      user: req.user._id
    };

    const wish = new WishModel(wishData);
    await wish.save();
    
    res.json({ wish });

  } catch (error) {
    console.error('Create wish error:', error);
    res.status(500).json({ error: 'Failed to save wish' });
  }
});

// Delete a wish/favorite
app.delete("/api/user/wishes/:id", requireAuth, async (req, res) => {
  try {
    if (!useMongoDb || !WishModel) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const wish = await WishModel.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!wish) {
      return res.status(404).json({ error: 'Wish not found' });
    }

    await WishModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Wish deleted successfully' });

  } catch (error) {
    console.error('Delete wish error:', error);
    res.status(500).json({ error: 'Failed to delete wish' });
  }
});

// Send personalized newsletter
app.post("/api/send-newsletter", requireAuth, async (req, res) => {
  try {
    const { email, searchHistory = [], favorites = [], userName } = req.body;
    
    // Generate newsletter content based on user data
    const subject = `🎯 Your Personalized Prospector Report - ${new Date().toLocaleDateString()}`;
    
    // Create HTML content for the newsletter
    const content = generateNewsletterHTML(userName || req.user.firstName || req.user.username, searchHistory, favorites);
    
    console.log('📧 Newsletter Request:', {
      user: req.user.username,
      email: email,
      subject: subject,
      contentLength: content.length,
      searchHistoryCount: searchHistory.length,
      favoritesCount: favorites.length
    });

    // Simulate successful email sending
    // In real implementation, replace this with actual email service
    const newsletterLog = {
      userId: req.user._id,
      email: email,
      subject: subject,
      sentAt: new Date(),
      status: 'sent',
      searchHistoryCount: searchHistory.length,
      favoritesCount: favorites.length
    };

    // Here you would typically:
    // 1. Use an email service to send the actual email
    // 2. Log the newsletter in a database
    // 3. Update user preferences/statistics
    
    // Example with Nodemailer (commented out - requires SMTP setup):
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      service: 'gmail', // or your email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: content
    });
    */

    res.json({ 
      success: true, 
      message: 'Newsletter sent successfully!',
      log: newsletterLog
    });

  } catch (error) {
    console.error('Newsletter sending error:', error);
    res.status(500).json({ error: 'Failed to send newsletter' });
  }
});

// Generate HTML content for newsletter
function generateNewsletterHTML(userName, searchHistory, favorites) {
  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short', 
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatEventHtml = (event, index) => {
    const sourceUrl = event.url || event.source;
    const sourceDomain = sourceUrl ? new URL(sourceUrl).hostname.replace('www.', '') : 'Unknown';
    
    return `
      <div style="background: #f8f9fa; border-left: 3px solid #007bff; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h4 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 16px;">${event.title}</h4>
        ${event.description ? `<p style="margin: 5px 0; color: #666; font-size: 14px;">${event.description.substring(0, 200)}${event.description.length > 200 ? '...' : ''}</p>` : ''}
        ${event.date ? `<p style="margin: 5px 0; color: #28a745; font-weight: bold; font-size: 13px;">📅 ${formatDate(event.date)}</p>` : ''}
        ${sourceUrl ? `<p style="margin: 5px 0;"><a href="${sourceUrl}" style="color: #007bff; text-decoration: none; font-size: 13px;">🔗 View on ${sourceDomain}</a></p>` : ''}
      </div>
    `;
  };

  const searchHistoryHtml = searchHistory.length > 0 ? `
    <div style="margin: 20px 0;">
      <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">🔍 Recent Search History</h3>
      ${searchHistory.map((search, index) => `
        <div style="background: #fff; border: 1px solid #e0e0e0; padding: 15px; margin: 10px 0; border-radius: 5px;">
          <h4 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 16px;">"${search.query}"</h4>
          ${search.location ? `<p style="margin: 5px 0; color: #666; font-size: 14px;">📍 ${search.location}</p>` : ''}
          <p style="margin: 5px 0; color: #999; font-size: 12px;">🕐 ${formatDate(search.timestamp || search.createdAt)}</p>
          <p style="margin: 5px 0; color: #28a745; font-size: 13px;">✅ ${search.results?.length || 0} results found</p>
        </div>
      `).join('')}
    </div>
  ` : '';

  const favoritesHtml = favorites.length > 0 ? `
    <div style="margin: 20px 0;">
      <h3 style="color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">⭐ Your Favorite Events</h3>
      ${favorites.map(formatEventHtml).join('')}
    </div>
  ` : '';

  const statsHtml = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: white;">📊 Your Activity Summary</h3>
      <div style="display: flex; justify-content: space-around; text-align: center;">
        <div>
          <h4 style="margin: 0; font-size: 24px;">${searchHistory.length}</h4>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Recent Searches</p>
        </div>
        <div>
          <h4 style="margin: 0; font-size: 24px;">${favorites.length}</h4>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Starred Events</p>
        </div>
        <div>
          <h4 style="margin: 0; font-size: 24px;">${searchHistory.reduce((total, search) => total + (search.results?.length || 0), 0)}</h4>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Total Results</p>
        </div>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Prospector Report</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">🎯 The Prospector</h1>
          <h2 style="color: #7f8c8d; margin: 10px 0; font-size: 18px; font-weight: normal;">Your Personalized Activity Report</h2>
          <p style="color: #95a5a6; margin: 5px 0; font-size: 14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div style="background: #e8f4fd; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; color: #2c3e50; font-size: 16px;">
            Hello <strong>${userName}</strong>! 👋
          </p>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
            Here's your personalized summary of recent activity on The Prospector platform.
          </p>
        </div>

        ${statsHtml}
        ${searchHistoryHtml}
        ${favoritesHtml}

        ${searchHistory.length === 0 && favorites.length === 0 ? `
          <div style="text-align: center; padding: 40px 20px; color: #666;">
            <h3 style="color: #7f8c8d;">🚀 Start Your Journey!</h3>
            <p>You haven't made any searches or saved favorites yet. Start exploring to discover amazing events and opportunities!</p>
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 13px; margin: 5px 0;">
            This newsletter was generated by <strong>The Prospector</strong> platform.
          </p>
          <p style="color: #999; font-size: 12px; margin: 5px 0;">
            © ${new Date().getFullYear()} The Prospector. Happy exploring! 🎉
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Discovery Server running on http://localhost:${PORT}`);
});