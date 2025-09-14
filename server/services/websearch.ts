// Web search service for finding content across the internet
import { ScrapedContent } from './scraper-simple';

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  source: string;
  publishedDate?: string;
  thumbnail?: string;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchEngine: string;
}

// Search engines and social media platforms
const SEARCH_ENGINES = {
  GOOGLE: 'google',
  BING: 'bing',
  DUCKDUCKGO: 'duckduckgo'
};

const SOCIAL_PLATFORMS = {
  TWITTER: 'twitter',
  REDDIT: 'reddit',
  YOUTUBE: 'youtube',
  LINKEDIN: 'linkedin',
  INSTAGRAM: 'instagram'
};

/**
 * Search the web for content using multiple sources
 */
export async function searchWeb(query: string, options: {
  engine?: string;
  maxResults?: number;
  includeSocial?: boolean;
  platforms?: string[];
}): Promise<WebSearchResponse> {
  const { engine = 'duckduckgo', maxResults = 10, includeSocial = true, platforms = [] } = options;
  
  console.log(`Searching web for: "${query}" using ${engine}`);
  
  try {
    // For now, let's implement DuckDuckGo search as it doesn't require API keys
    const results = await searchDuckDuckGo(query, maxResults);
    
    // If social media search is enabled, add social platform results
    if (includeSocial) {
      const socialResults = await searchSocialPlatforms(query, platforms, maxResults);
      results.push(...socialResults);
    }
    
    return {
      query,
      results: results.slice(0, maxResults),
      totalResults: results.length,
      searchEngine: engine
    };
    
  } catch (error) {
    console.error('Web search failed:', error);
    return {
      query,
      results: [],
      totalResults: 0,
      searchEngine: engine
    };
  }
}

/**
 * Search using DuckDuckGo (no API key required)
 */
async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    // DuckDuckGo Instant Answer API
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'The-Prospector-Bot/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed: ${response.status}`);
    }
    
    const data = await response.json();
    const results: SearchResult[] = [];
    
    // Process DuckDuckGo results
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, maxResults)) {
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
            url: topic.FirstURL,
            description: topic.Text,
            source: 'DuckDuckGo',
            thumbnail: topic.Icon?.URL
          });
        }
      }
    }
    
    // If no related topics, try the abstract
    if (results.length === 0 && data.Abstract && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        description: data.Abstract,
        source: 'DuckDuckGo - Abstract'
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

/**
 * Search social media platforms
 */
async function searchSocialPlatforms(query: string, platforms: string[], maxResults: number): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  // Reddit search (using Reddit's JSON API)
  if (platforms.includes('reddit') || platforms.length === 0) {
    try {
      const redditResults = await searchReddit(query, Math.min(maxResults, 5));
      results.push(...redditResults);
    } catch (error) {
      console.error('Reddit search failed:', error);
    }
  }
  
  // YouTube search (basic implementation)
  if (platforms.includes('youtube') || platforms.length === 0) {
    try {
      const youtubeResults = await searchYouTubeBasic(query, Math.min(maxResults, 5));
      results.push(...youtubeResults);
    } catch (error) {
      console.error('YouTube search failed:', error);
    }
  }
  
  return results;
}

/**
 * Search Reddit using their JSON API
 */
async function searchReddit(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}&sort=relevance`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'The-Prospector-Bot/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Reddit search failed: ${response.status}`);
    }
    
    const data = await response.json();
    const results: SearchResult[] = [];
    
    if (data.data && data.data.children) {
      for (const post of data.data.children.slice(0, maxResults)) {
        const postData = post.data;
        results.push({
          title: postData.title,
          url: `https://reddit.com${postData.permalink}`,
          description: postData.selftext ? postData.selftext.substring(0, 200) + '...' : 'Reddit post',
          source: `Reddit - r/${postData.subreddit}`,
          publishedDate: new Date(postData.created_utc * 1000).toISOString(),
          thumbnail: postData.thumbnail !== 'self' ? postData.thumbnail : undefined
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Reddit search error:', error);
    return [];
  }
}

/**
 * Basic YouTube search (without API key)
 */
async function searchYouTubeBasic(query: string, maxResults: number): Promise<SearchResult[]> {
  // For now, return YouTube search URLs since we don't have API access
  return [{
    title: `YouTube search: ${query}`,
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    description: `Search YouTube for videos about "${query}"`,
    source: 'YouTube Search'
  }];
}

/**
 * Search specific social media platforms with custom queries
 */
export async function searchPlatformSpecific(platform: string, query: string, maxResults = 10): Promise<SearchResult[]> {
  switch (platform.toLowerCase()) {
    case 'twitter':
      return [{
        title: `Twitter search: ${query}`,
        url: `https://twitter.com/search?q=${encodeURIComponent(query)}`,
        description: `Search Twitter for posts about "${query}"`,
        source: 'Twitter Search'
      }];
      
    case 'linkedin':
      return [{
        title: `LinkedIn search: ${query}`,
        url: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`,
        description: `Search LinkedIn for posts and articles about "${query}"`,
        source: 'LinkedIn Search'
      }];
      
    case 'instagram':
      return [{
        title: `Instagram search: ${query}`,
        url: `https://www.instagram.com/explore/tags/${encodeURIComponent(query.replace(/\s+/g, ''))}/`,
        description: `Search Instagram for posts about "${query}"`,
        source: 'Instagram Search'
      }];
      
    case 'reddit':
      return await searchReddit(query, maxResults);
      
    case 'youtube':
      return await searchYouTubeBasic(query, maxResults);
      
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
