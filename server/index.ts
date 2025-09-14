import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import passport from "passport";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { sessionConfig, configurePassport } from "./middleware/auth";

const app = express();
app.use(cors({
  credentials: true,
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : true // Allow all origins in development
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Development-only Content Security Policy header to align browser behavior with expected dev meta
// This ensures the response header allows Google APIs and common third-party connections during local dev.
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    const devCsp =
      "default-src 'self' http: https: data: blob:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://www.gstatic.com https://content.googleapis.com https://api.github.com; " +
      "connect-src 'self' https://www.googleapis.com https://content.googleapis.com https://api.github.com https://api.github.com http: https:; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:;";

    res.setHeader('Content-Security-Policy', devCsp);
    // Log a short snippet of the CSP header so developers can verify it's applied
    try {
      // `log` is imported from ./vite and is the project's logger helper
      log(`DEV-CSP applied for ${req.method} ${req.path}: ${String(devCsp).slice(0, 200)}`);
    } catch (e) {
      // fallback to console if log is unavailable
      // eslint-disable-next-line no-console
      console.log('DEV-CSP set for', req.method, req.path);
    }
    // also expose on res.locals for inspection by debug endpoints
    try { (res as any).locals = (res as any).locals || {}; (res as any).locals.devCsp = devCsp; } catch (e) {}
  }
  next();
});

// Session and authentication setup
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());

// Configure passport strategies
configurePassport();

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
