// Integration with Gemini API for content analysis
import { GoogleGenAI } from "@google/genai";

// Validate API key availability
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY not found. Gemini features will be disabled.');
}

// Initialize Gemini client only if API key is available
const genAI = GEMINI_API_KEY ? new GoogleGenAI(GEMINI_API_KEY) : null;

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
      console.warn('Content truncated for Gemini analysis');
      content = content.substring(0, 50000);
    }

    const prompt = `Analyze the following content and provide a comprehensive analysis.

Title: ${title || 'N/A'}
URL: ${url || 'N/A'}
Content: ${content.substring(0, 8000)}${content.length > 8000 ? '...' : ''}

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

    // Get the model (updated for @google/genai v1.x)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro"
    });
    
    // Generate content with generation config
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            sentiment: {
              type: "object",
              properties: {
                rating: { type: "number" },
                confidence: { type: "number" }
              },
              required: ["rating", "confidence"]
            },
            categories: {
              type: "array",
              items: { type: "string" }
            },
            keywords: {
              type: "array", 
              items: { type: "string" }
            },
            readingTime: { type: "number" },
            quality: {
              type: "object",
              properties: {
                score: { type: "number" },
                factors: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["score", "factors"]
            }
          },
          required: ["summary", "sentiment", "categories", "keywords", "readingTime", "quality"]
        }
      }
    });
    const response = result.response;

    const text = response.text();
    if (!text || text.trim().length === 0) {
      throw new Error("Empty response from Gemini model");
    }

    // Parse JSON with error handling
    let analysis: ContentAnalysis;
    try {
      analysis = JSON.parse(text);
      
      // Validate required fields
      if (!analysis.summary || !analysis.sentiment || !analysis.categories || !analysis.keywords) {
        throw new Error("Invalid analysis structure from Gemini");
      }
      
      return analysis;
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError, 'Raw response:', text);
      throw new Error("Failed to parse Gemini response as JSON");
    }
  } catch (error) {
    console.error('Error analyzing content with Gemini:', error);
    return getFallbackAnalysis(content);
  }
}

// Helper function for fallback analysis
function getFallbackAnalysis(content: string): ContentAnalysis {
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
  
  return {
    summary: "Content analysis unavailable - Gemini API not configured",
    sentiment: { rating: 3, confidence: 0.1 },
    categories: ["uncategorized"],
    keywords: [],
    readingTime: readingTime,
    quality: { score: 5, factors: ["analysis_unavailable"] }
  };
}

export async function generateContentRecommendations(
  userHistory: Array<{ title: string; categories: string[]; keywords: string[] }>,
  limit = 5
): Promise<string[]> {
  // Check if Gemini is available
  if (!genAI) {
    console.warn('Gemini API not configured, returning generic recommendations');
    return getGenericRecommendations(limit);
  }

  try {
    // Input validation
    if (!userHistory || userHistory.length === 0) {
      return getGenericRecommendations(limit);
    }

    const validLimit = Math.min(Math.max(limit, 1), 10); // Clamp between 1-10
    
    const historyText = userHistory.slice(0, 20).map(h => // Limit history size
      `Title: ${h.title.slice(0, 100)}, Categories: ${h.categories.slice(0, 5).join(', ')}, Keywords: ${h.keywords.slice(0, 10).join(', ')}`
    ).join('\n');

    const prompt = `Based on this user's content history, suggest ${validLimit} search queries they might be interested in:

User History:
${historyText}

Provide suggestions as a JSON array of strings:
["suggestion 1", "suggestion 2", ...]`;

    // Get the model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash"
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: { type: "string" }
        }
      }
    });
    const response = result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      return getGenericRecommendations(validLimit);
    }

    try {
      const recommendations = JSON.parse(text);
      if (Array.isArray(recommendations)) {
        return recommendations.slice(0, validLimit).filter(r => typeof r === 'string' && r.length > 0);
      } else {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('Failed to parse recommendations:', parseError, 'Raw response:', text);
      return getGenericRecommendations(validLimit);
    }

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return getGenericRecommendations(limit);
  }
}

// Helper function for generic recommendations
function getGenericRecommendations(limit: number): string[] {
  const generic = [
    "technology news",
    "web development",
    "artificial intelligence",
    "business strategy",
    "digital marketing",
    "software engineering",
    "data science",
    "cybersecurity",
    "cloud computing",
    "mobile development"
  ];
  return generic.slice(0, Math.min(limit, generic.length));
}