// Web scraping service for content extraction - SIMPLIFIED VERSION
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ScrapedContent {
  url: string;
  title?: string;
  description?: string;
  content?: string;
  contentType: string;
  metadata: {
    author?: string;
    publishedDate?: string;
    siteName?: string;
    image?: string;
    charset?: string;
    language?: string;
  };
  error?: string;
}

/**
 * Scrape content from a single URL - NO SECURITY RESTRICTIONS
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  console.log(`Scraping URL: ${url}`);
  
  try {
    // Simple fetch without any security restrictions
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return parseContent(url, html);
    
  } catch (error) {
    console.error(`Scraping failed for ${url}:`, error);
    return {
      url,
      contentType: 'error',
      metadata: {},
      error: error instanceof Error ? error.message : 'Unknown scraping error'
    };
  }
}

/**
 * Parse HTML content and extract meaningful information
 */
function parseContent(url: string, html: string): ScrapedContent {
  try {
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Extract basic metadata
    const title = 
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
      document.querySelector('title')?.textContent ||
      'Untitled';

    const description = 
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      '';

    const author = 
      document.querySelector('meta[name="author"]')?.getAttribute('content') ||
      document.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
      '';

    const siteName = 
      document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
      '';

    const image = 
      document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
      '';

    const publishedDate = 
      document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
      document.querySelector('meta[name="date"]')?.getAttribute('content') ||
      '';

    // Use Readability to extract main content
    let readableContent = '';
    try {
      const reader = new Readability(document);
      const article = reader.parse();
      readableContent = article?.textContent || '';
    } catch (readabilityError) {
      console.warn('Readability parsing failed, using fallback:', readabilityError);
      // Fallback: extract text from common content containers
      const contentSelectors = [
        'article', 
        '[role="main"]', 
        '.content', 
        '.post-content', 
        '.entry-content',
        '.main-content',
        'main',
        'body'
      ];
      
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          readableContent = element.textContent || '';
          if (readableContent.length > 100) break;
        }
      }
    }

    // Determine content type
    let contentType = 'webpage';
    const urlLower = url.toLowerCase();
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      contentType = 'video';
    } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      contentType = 'social';
    } else if (urlLower.includes('reddit.com')) {
      contentType = 'discussion';
    } else if (urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      contentType = 'image';
    } else if (urlLower.match(/\.(pdf)$/)) {
      contentType = 'document';
    }

    return {
      url,
      title: title.trim(),
      description: description.trim(),
      content: readableContent.trim(),
      contentType,
      metadata: {
        author: author.trim(),
        publishedDate,
        siteName: siteName.trim(),
        image,
        charset: document.characterSet,
        language: document.documentElement.lang || 'en'
      }
    };

  } catch (error) {
    console.error('Content parsing failed:', error);
    return {
      url,
      contentType: 'error',
      metadata: {},
      error: 'Failed to parse content'
    };
  }
}

/**
 * Scrape multiple URLs concurrently
 */
export async function scrapeMultipleUrls(urls: string[]): Promise<ScrapedContent[]> {
  console.log(`Scraping ${urls.length} URLs concurrently`);
  
  const scrapePromises = urls.map(url => scrapeUrl(url));
  const results = await Promise.allSettled(scrapePromises);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        url: urls[index],
        contentType: 'error',
        metadata: {},
        error: 'Scraping promise rejected: ' + result.reason
      };
    }
  });
}
