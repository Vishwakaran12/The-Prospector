// Integration with Gemini API for content analysis
import { GoogleGenerativeAI } from "@google/generative-ai";

// Validate API key availability
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY not found. Gemini features will be disabled.');
}

// Initialize Gemini client only if API key is available
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface ContentAnalysis {
  summary: string;
  sentiment: {
    rating: number;
    confidence: number;
  };
  categories: string[];
  keywords: string[];
  readingTime: number;
  quality: {
    score: number;
    factors: string[];
  };
}

export async function analyzeContent(
  content: string,
  title?: string,
  url?: string
): Promise<ContentAnalysis> {
  // Check if Gemini is available
  if (!genAI) {
    console.warn('Gemini API not configured, returning fallback analysis');
    return getFallbackAnalysis(content);
  }

  try {
    // Input validation
    if (!content || content.trim().length === 0) {
      throw new Error('Content is required for analysis');
    }
    
    if (content.length > 50000) {
      content = content.substring(0, 50000) + '...';
    }

    const prompt = `Analyze the following content and provide a comprehensive analysis.

Title: ${title || 'N/A'}
URL: ${url || 'N/A'}
Content: ${content}

Please provide analysis in the following JSON format:
{
  "summary": "Brief 2-3 sentence summary",
  "sentiment": {
    "rating": number from 1-5,
    "confidence": number from 0-1
  },
  "categories": ["array", "of", "relevant", "categories"],
  "keywords": ["important", "keywords", "extracted"],
  "readingTime": estimated_reading_time_minutes,
  "quality": {
    "score": number from 1-10,
    "factors": ["quality", "assessment", "factors"]
  }
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawJson = response.text();

    if (rawJson) {
      try {
        const analysis: ContentAnalysis = JSON.parse(rawJson);
        return analysis;
      } catch (parseError) {
        console.error('Failed to parse Gemini JSON response:', parseError);
        return getFallbackAnalysis(content);
      }
    } else {
      throw new Error("Empty response from Gemini model");
    }
  } catch (error) {
    console.error('Error analyzing content with Gemini:', error);
    return getFallbackAnalysis(content);
  }
}

export async function generateContentRecommendations(
  userHistory: Array<{ title: string; categories: string[]; keywords: string[] }>,
  limit = 5
): Promise<string[]> {
  // Check if Gemini is available
  if (!genAI) {
    console.warn('Gemini API not configured, returning generic recommendations');
    return getGenericRecommendations(userHistory, limit);
  }

  try {
    // Input validation
    if (!userHistory || userHistory.length === 0) {
      return getGenericRecommendations(userHistory, limit);
    }

    const historyText = userHistory
      .slice(0, 10) // Limit history to prevent token overflow
      .map(h => 
        `Title: ${h.title}, Categories: ${h.categories.join(', ')}, Keywords: ${h.keywords.join(', ')}`
      ).join('\n');

    const prompt = `Based on this user's content history, suggest ${limit} search queries they might be interested in. Focus on related topics, emerging trends, and deeper exploration of their interests.

User History:
${historyText}

Provide suggestions as a JSON array of strings with search queries:
["specific search query 1", "related topic query 2", "trending area query 3"]

Keep queries practical and searchable.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawJson = response.text();

    if (rawJson) {
      try {
        const suggestions: string[] = JSON.parse(rawJson);
        return Array.isArray(suggestions) ? suggestions.slice(0, limit) : [];
      } catch (parseError) {
        console.error('Failed to parse Gemini recommendations:', parseError);
        return getGenericRecommendations(userHistory, limit);
      }
    } else {
      return getGenericRecommendations(userHistory, limit);
    }
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return getGenericRecommendations(userHistory, limit);
  }
}

// Fallback analysis when Gemini is unavailable
function getFallbackAnalysis(content: string): ContentAnalysis {
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200); // Assume 200 words per minute
  
  // Basic keyword extraction (simple approach)
  const words = content.toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 4)
    .slice(0, 10);

  return {
    summary: "Content analysis unavailable - Gemini API not configured",
    sentiment: { rating: 3, confidence: 0.1 },
    categories: ["uncategorized"],
    keywords: words,
    readingTime,
    quality: { score: 5, factors: ["analysis_unavailable"] }
  };
}

// Generic recommendations when Gemini is unavailable
function getGenericRecommendations(
  userHistory: Array<{ title: string; categories: string[]; keywords: string[] }>,
  limit: number
): string[] {
  const genericQueries = [
    "latest technology trends",
    "industry best practices",
    "emerging market insights",
    "innovation strategies",
    "digital transformation",
    "future predictions",
    "expert opinions",
    "case studies",
    "research findings",
    "thought leadership"
  ];

  // If user has history, try to make recommendations more relevant
  if (userHistory && userHistory.length > 0) {
    const allCategories = userHistory.flatMap(h => h.categories);
    const allKeywords = userHistory.flatMap(h => h.keywords);
    
    const relevantQueries = [];
    if (allCategories.length > 0) {
      relevantQueries.push(`${allCategories[0]} trends`);
      relevantQueries.push(`${allCategories[0]} insights`);
    }
    if (allKeywords.length > 0) {
      relevantQueries.push(`${allKeywords[0]} analysis`);
    }
    
    return [...relevantQueries, ...genericQueries].slice(0, limit);
  }

  return genericQueries.slice(0, limit);
}