// Web scraping service for content extraction
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { promisify } from 'util';
import { lookup } from 'dns';

const dnsLookup = promisify(lookup);

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

// Security constants
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB limit
const REQUEST_TIMEOUT = 10000; // 10 seconds
const BLOCKED_USER_AGENTS = ['bot', 'crawler', 'spider'];

// SSRF protection: Check if IP is private/internal
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  
  if (match) {
    const [, a, b, c, d] = match.map(Number);
    
    // Private ranges:
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    // Loopback: 127.0.0.0/8
    // Link-local: 169.254.0.0/16
    return (
      (a === 10) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 127) ||
      (a === 169 && b === 254) ||
      (a === 0) ||
      (a >= 224) // Multicast and reserved
    );
  }
  
  // IPv6 private/loopback patterns
  return (
    ip === '::1' ||
    ip.startsWith('::ffff:') ||
    ip.startsWith('fe80:') ||
    ip.startsWith('fc00:') ||
    ip.startsWith('fd00:')
  );
}

// Allowed hostname patterns for scraping
function isAllowedHostname(hostname: string): boolean {
  // Block localhost variants
  if (['localhost', '0.0.0.0'].includes(hostname)) {
    return false;
  }
  
  // Block internal domains commonly used in corporate networks
  const blockedDomains = [
    '.local', '.internal', '.corp', '.lan', '.intranet',
    'localhost', 'localdomain'
  ];
  
  return !blockedDomains.some(domain => 
    hostname.endsWith(domain) || hostname === domain.slice(1)
  );
}

export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    // Validate URL format
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are supported');
    }
    
    // Validate hostname
    if (!isAllowedHostname(urlObj.hostname)) {
      throw new Error('URL hostname is not allowed');
    }
    
    // DNS resolution check for SSRF protection
    try {
      const { address } = await dnsLookup(urlObj.hostname);
      if (isPrivateIP(address)) {
        throw new Error('Cannot access private/internal IP addresses');
      }
    } catch (dnsError) {
      throw new Error(`DNS resolution failed: ${dnsError instanceof Error ? dnsError.message : 'Unknown error'}`);
    }

    // Set up timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    // Fetch the content with security headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ContentDiscoveryBot/1.0 (+https://example.com/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
        'Connection': 'close', // Prevent connection reuse
      },
      signal: controller.signal,
      redirect: 'follow',
      follow: 5, // Limit redirects
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Check content type before processing
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      // Still allow but with warning
      console.warn(`Non-HTML content type detected: ${contentType}`);
    }
    
    // Check response size
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      throw new Error(`Response too large: ${contentLength} bytes`);
    }
    
    // Read response with size limit
    let html = '';
    let totalBytes = 0;
    const reader = response.body?.getReader();
    
    if (reader) {
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        totalBytes += value.length;
        if (totalBytes > MAX_RESPONSE_SIZE) {
          throw new Error(`Response exceeded size limit of ${MAX_RESPONSE_SIZE} bytes`);
        }
        
        html += decoder.decode(value, { stream: true });
      }
      
      html += decoder.decode(); // Flush remaining bytes
    } else {
      html = await response.text();
    }

    // Parse HTML with JSDOM
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Use Mozilla Readability for content extraction
    const readabilityReader = new Readability(document);
    const article = readabilityReader.parse();

    // Extract metadata
    const metadata = extractMetadata(document);

    // Determine content type
    const detectedType = determineContentType(url, contentType, document);

    const result: ScrapedContent = {
      url,
      title: article?.title || metadata.title || document.title,
      description: metadata.description,
      content: article?.textContent || extractPlainText(document),
      contentType: detectedType,
      metadata: {
        author: metadata.author,
        publishedDate: metadata.publishedDate,
        siteName: metadata.siteName,
        image: metadata.image,
        charset: metadata.charset,
        language: metadata.language,
      }
    };

    return result;

  } catch (error) {
    console.error('Error scraping URL:', url, error);
    
    // Sanitize error messages to prevent information leakage
    let errorMessage = 'Unknown scraping error';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout';
      } else if (error.message.includes('DNS resolution failed')) {
        errorMessage = 'Invalid or unreachable domain';
      } else if (error.message.includes('private/internal IP') || error.message.includes('not allowed')) {
        errorMessage = 'URL not accessible for security reasons';
      } else if (error.message.includes('Response too large') || error.message.includes('size limit')) {
        errorMessage = 'Content too large to process';
      } else {
        errorMessage = 'Failed to fetch content';
      }
    }
    
    return {
      url,
      contentType: 'error',
      metadata: {},
      error: errorMessage
    };
  }
}

function extractMetadata(document: Document) {
  const getMetaContent = (name: string) => {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return meta?.getAttribute('content') || undefined;
  };

  return {
    title: getMetaContent('og:title') || getMetaContent('twitter:title'),
    description: getMetaContent('description') || getMetaContent('og:description') || getMetaContent('twitter:description'),
    author: getMetaContent('author') || getMetaContent('article:author'),
    publishedDate: getMetaContent('article:published_time') || getMetaContent('pubdate'),
    siteName: getMetaContent('og:site_name') || getMetaContent('application-name'),
    image: getMetaContent('og:image') || getMetaContent('twitter:image'),
    charset: document.characterSet,
    language: document.documentElement.lang || getMetaContent('language'),
  };
}

function determineContentType(url: string, contentType: string, document: Document): string {
  // Check for video content
  if (url.includes('youtube.com') || url.includes('vimeo.com') || url.includes('video')) {
    return 'video';
  }

  // Check for image content
  if (contentType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
    return 'image';
  }

  // Check for PDF
  if (contentType.includes('pdf') || url.endsWith('.pdf')) {
    return 'document';
  }

  // Check for blog/article indicators
  const articleSelectors = ['article', '[role="article"]', '.post', '.blog-post', '.article'];
  if (articleSelectors.some(selector => document.querySelector(selector))) {
    return 'article';
  }

  // Check for news sites
  const newsIndicators = ['news', 'press', 'blog', 'journal'];
  if (newsIndicators.some(indicator => url.toLowerCase().includes(indicator))) {
    return 'article';
  }

  // Default to webpage
  return 'webpage';
}

function extractPlainText(document: Document): string {
  // Remove script and style elements
  const scripts = document.querySelectorAll('script, style, nav, header, footer, aside');
  scripts.forEach(el => el.remove());

  // Get main content areas
  const contentSelectors = [
    'main',
    '[role="main"]',
    '.content',
    '.main-content',
    '.post-content',
    '.article-content',
    'article',
    '.entry-content',
    '#content'
  ];

  let content = '';
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      content = element.textContent || '';
      break;
    }
  }

  // Fallback to body content
  if (!content) {
    content = document.body?.textContent || '';
  }

  // Clean up whitespace
  return content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

export async function scrapeMultipleUrls(urls: string[]): Promise<ScrapedContent[]> {
  const results = await Promise.allSettled(
    urls.map(url => scrapeUrl(url))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        url: urls[index],
        contentType: 'error',
        metadata: {},
        error: result.reason?.message || 'Scraping failed'
      };
    }
  });
}