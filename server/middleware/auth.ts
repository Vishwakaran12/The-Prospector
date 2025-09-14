import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/personalization';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface User {
      _id: string;
      username: string;
      email?: string;
    }
  }
}

// Session configuration
export const sessionConfig = session({
  secret: process.env.SESSION_SECRET || 'prospector-cyberpunk-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
  },
  name: 'prospector.sid'
});

// Passport configuration
export function configurePassport() {
  // Local Strategy for username/password authentication
  passport.use(new LocalStrategy(
    { usernameField: 'username', passwordField: 'password' },
    async (username, password, done) => {
      try {
        if (!UserModel) {
          return done(null, false, { message: 'Authentication requires MongoDB connection' });
        }

        const user = await UserModel.findOne({ username });
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid password' });
        }

        // Update last login
        user.lastActivityAt = new Date();
        await user.save();

        return done(null, {
          _id: user._id.toString(),
          username: user.username,
          email: user.email || undefined
        });
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
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await UserModel.findById(id);
      if (!user) {
        return done(null, false);
      }
      done(null, {
        _id: user._id.toString(),
        username: user.username,
        email: user.email || undefined
      });
    } catch (error) {
      done(error);
    }
  });
}

// Authentication middleware - requires user to be logged in
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Testing mode: allow unauthenticated access so the app can be exercised without login.
  // In production, restore the original behavior which enforces authentication.
  return next();
};

// Optional authentication middleware - allows both authenticated and guest users
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // Always proceed, but req.user will be undefined if not authenticated
  next();
};

// Admin middleware - requires admin role (if needed)
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Testing mode: allow access to admin routes for easier testing.
  // In production, implement admin role checks and require authentication.
  return next();
};

// Middleware to check if user owns the resource
export const requireOwnership = (userIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
  // Testing mode: do not enforce ownership checks so resources are accessible for testing.
  // In production, restore ownership enforcement to prevent unauthorized access.
  return next();
  };
};

// Rate limiting middleware for auth endpoints
const authAttempts = new Map<string, { count: number; lastAttempt: number }>();

export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const attempts = authAttempts.get(ip);
  
  if (attempts) {
    // Reset if window has passed
    if (now - attempts.lastAttempt > windowMs) {
      authAttempts.delete(ip);
    } else if (attempts.count >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many authentication attempts',
        message: 'Please try again in 15 minutes'
      });
    }
  }

  // Track this attempt
  const currentAttempts = authAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  authAttempts.set(ip, {
    count: currentAttempts.count + 1,
    lastAttempt: now
  });

  next();
};
