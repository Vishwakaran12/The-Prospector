# Overview

The Prospector is a professional content discovery platform that enables users to discover, analyze, and manage digital content with AI-powered insights. The application allows users to input URLs or search queries to scrape and analyze web content, then organize their findings through a claims management system. It combines web scraping capabilities with Google's Gemini AI for intelligent content analysis and recommendations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built using **React with TypeScript** and follows a modern component-based architecture:

- **UI Framework**: Utilizes shadcn/ui components built on top of Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with a custom design system featuring dark/light modes and professional Material Design principles
- **Routing**: wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **Build Tool**: Vite for fast development and optimized production builds

The design system emphasizes clean minimalism with a professional aesthetic, featuring:
- Dark mode primary color palette with charcoal backgrounds and professional blue accents
- Inter font family for modern typography
- Component library with consistent spacing using Tailwind's spacing scale

## Backend Architecture
The backend follows a **Node.js/Express** architecture with TypeScript:

- **Web Framework**: Express.js with custom route registration and middleware
- **API Design**: RESTful API structure with comprehensive endpoint coverage for content discovery, scraping, and claims management
- **Error Handling**: Centralized error handling with proper HTTP status codes and structured error responses
- **Request Validation**: Zod schemas for runtime type checking and request validation

## Data Storage Solutions
The application uses **PostgreSQL** as the primary database with **Drizzle ORM** for type-safe database operations:

- **Schema Design**: Three main entities - Users, Content, and Claims with proper foreign key relationships
- **Content Table**: Stores scraped content with metadata, processing status, and AI analysis results
- **Claims Table**: Manages user relationships to content with categorization (bookmark, favorite, research, todo)
- **Flexible Storage**: JSONB fields for metadata and AI analysis results to accommodate varying data structures

The storage layer includes both database and in-memory implementations, with the in-memory version providing MongoDB-compatible structure for development and testing.

## Authentication and Authorization
Currently implements a basic user system with:
- User registration and authentication endpoints
- Session-based authentication using express-session
- User-specific content and claims isolation
- Password hashing for security

## External Service Integrations

### Google Gemini AI Integration
- **Content Analysis**: Automated analysis of scraped content including sentiment analysis, categorization, and quality assessment
- **Recommendations**: AI-powered content recommendations based on user behavior and preferences
- **Fallback Handling**: Graceful degradation when API is unavailable with basic analysis capabilities

### Web Scraping Services
- **Content Extraction**: Mozilla Readability for clean content extraction from web pages
- **Security Features**: SSRF protection, private IP blocking, and request size limits
- **Multi-URL Support**: Batch scraping capabilities for processing multiple URLs simultaneously
- **Metadata Extraction**: Comprehensive extraction of page metadata including Open Graph tags and structured data

### Database Integration
- **Neon Database**: PostgreSQL hosting with connection pooling via @neondatabase/serverless
- **Connection Management**: Automatic connection handling with environment-based configuration
- **Migration Support**: Drizzle Kit for database schema migrations and updates

The architecture supports both development and production environments with environment-specific configurations and graceful fallbacks for missing external services.