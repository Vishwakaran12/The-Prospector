import { searchWeb } from './websearch';
import { scrapeUrl } from './scraper-simple';

export interface EventSource {
  name: string;
  baseUrl: string;
  searchPatterns: string[];
  category: 'university' | 'local' | 'academic' | 'cultural' | 'sports' | 'tech';
}

export interface DiscoveredEvent {
  title: string;
  description: string;
  date: string;
  time?: string;
  location: string;
  source: string;
  url: string;
  category: string;
  tags: string[];
}

// Enhanced event sources focusing on TTU, Lubbock area, and major cities/colleges
const EVENT_SOURCES: EventSource[] = [
  // Texas Tech University Sources
  {
    name: 'Texas Tech University Events',
    baseUrl: 'ttu.edu',
    searchPatterns: [
      'site:ttu.edu events',
      'site:calendar.ttu.edu',
      'site:ttu.edu student activities',
      'site:ttu.edu campus events'
    ],
    category: 'university'
  },
  {
    name: 'TTU Student Activities',
    baseUrl: 'ttu.edu',
    searchPatterns: [
      'site:ttu.edu student organizations events',
      'site:ttu.edu RSO events',
      'site:ttu.edu club activities',
      'Texas Tech student life events'
    ],
    category: 'university'
  },
  {
    name: 'TTU Athletics',
    baseUrl: 'texastech.com',
    searchPatterns: [
      'site:texastech.com schedule',
      'site:texastech.com events',
      'Texas Tech Red Raiders games',
      'TTU sports events Lubbock'
    ],
    category: 'sports'
  },
  
  // Other Lubbock Colleges
  {
    name: 'Lubbock Christian University',
    baseUrl: 'lcu.edu',
    searchPatterns: [
      'site:lcu.edu events',
      'site:lcu.edu calendar',
      'Lubbock Christian University activities',
      'LCU campus events'
    ],
    category: 'university'
  },
  {
    name: 'South Plains College',
    baseUrl: 'southplainscollege.edu',
    searchPatterns: [
      'site:southplainscollege.edu events',
      'site:southplainscollege.edu calendar',
      'South Plains College Lubbock events',
      'SPC activities'
    ],
    category: 'university'
  },

  // Major Texas Universities
  {
    name: 'University of Texas at Austin',
    baseUrl: 'utexas.edu',
    searchPatterns: [
      'site:utexas.edu events',
      'site:calendar.utexas.edu',
      'UT Austin campus events',
      'University of Texas events'
    ],
    category: 'university'
  },
  {
    name: 'Texas A&M University',
    baseUrl: 'tamu.edu',
    searchPatterns: [
      'site:tamu.edu events',
      'site:calendar.tamu.edu',
      'Texas A&M Aggies events',
      'TAMU campus activities'
    ],
    category: 'university'
  },
  {
    name: 'Rice University',
    baseUrl: 'rice.edu',
    searchPatterns: [
      'site:rice.edu events',
      'site:calendar.rice.edu',
      'Rice University Houston events'
    ],
    category: 'university'
  },
  {
    name: 'University of Houston',
    baseUrl: 'uh.edu',
    searchPatterns: [
      'site:uh.edu events',
      'site:calendar.uh.edu',
      'University of Houston events'
    ],
    category: 'university'
  },

  // Major US Universities
  {
    name: 'Stanford University',
    baseUrl: 'stanford.edu',
    searchPatterns: [
      'site:stanford.edu events',
      'site:events.stanford.edu',
      'Stanford university events California'
    ],
    category: 'university'
  },
  {
    name: 'MIT Events',
    baseUrl: 'mit.edu',
    searchPatterns: [
      'site:mit.edu events',
      'site:calendar.mit.edu',
      'MIT campus events Boston'
    ],
    category: 'university'
  },
  {
    name: 'Harvard University',
    baseUrl: 'harvard.edu',
    searchPatterns: [
      'site:harvard.edu events',
      'site:calendar.harvard.edu',
      'Harvard university events Cambridge'
    ],
    category: 'university'
  },
  {
    name: 'UC Berkeley',
    baseUrl: 'berkeley.edu',
    searchPatterns: [
      'site:berkeley.edu events',
      'site:calendar.berkeley.edu',
      'UC Berkeley campus events'
    ],
    category: 'university'
  },

  // Major Cities Events
  {
    name: 'Austin Events',
    baseUrl: 'austintexas.gov',
    searchPatterns: [
      'site:austintexas.gov events',
      'Austin Texas events',
      'Austin city events',
      'Austin cultural events'
    ],
    category: 'local'
  },
  {
    name: 'Dallas Events',
    baseUrl: 'dallascityhall.com',
    searchPatterns: [
      'site:visitdallas.com events',
      'Dallas Texas events',
      'Dallas city events',
      'Dallas cultural events'
    ],
    category: 'local'
  },
  {
    name: 'Houston Events',
    baseUrl: 'houstontx.gov',
    searchPatterns: [
      'site:houstontx.gov events',
      'Houston Texas events',
      'Houston city events',
      'Visit Houston events'
    ],
    category: 'local'
  },
  {
    name: 'San Antonio Events',
    baseUrl: 'sanantonio.gov',
    searchPatterns: [
      'site:sanantonio.gov events',
      'San Antonio Texas events',
      'Visit San Antonio events'
    ],
    category: 'local'
  },
  {
    name: 'New York City Events',
    baseUrl: 'nyc.gov',
    searchPatterns: [
      'site:nyc.gov events',
      'NYC events',
      'New York City events',
      'Manhattan events Brooklyn events'
    ],
    category: 'local'
  },
  {
    name: 'Los Angeles Events',
    baseUrl: 'lacity.org',
    searchPatterns: [
      'site:lacity.org events',
      'Los Angeles events',
      'LA events California',
      'Visit LA events'
    ],
    category: 'local'
  },
  {
    name: 'Chicago Events',
    baseUrl: 'chicago.gov',
    searchPatterns: [
      'site:chicago.gov events',
      'Chicago events',
      'Chicago Illinois events',
      'Choose Chicago events'
    ],
    category: 'local'
  },
  {
    name: 'San Francisco Events',
    baseUrl: 'sf.gov',
    searchPatterns: [
      'site:sf.gov events',
      'San Francisco events',
      'SF events California',
      'Visit San Francisco events'
    ],
    category: 'local'
  },
  {
    name: 'Seattle Events',
    baseUrl: 'seattle.gov',
    searchPatterns: [
      'site:seattle.gov events',
      'Seattle events',
      'Seattle Washington events',
      'Visit Seattle events'
    ],
    category: 'local'
  },
  {
    name: 'Boston Events',
    baseUrl: 'boston.gov',
    searchPatterns: [
      'site:boston.gov events',
      'Boston events',
      'Boston Massachusetts events',
      'Visit Boston events'
    ],
    category: 'local'
  },

  // Tech Hubs and Innovation Centers
  {
    name: 'Silicon Valley Tech Events',
    baseUrl: '',
    searchPatterns: [
      'Silicon Valley tech events',
      'Bay Area startup events',
      'Palo Alto tech meetups',
      'San Jose technology events'
    ],
    category: 'tech'
  },
  {
    name: 'Austin Tech Events',
    baseUrl: '',
    searchPatterns: [
      'Austin tech events',
      'Austin startup community',
      'SXSW tech events',
      'Austin coding meetups'
    ],
    category: 'tech'
  },
  {
    name: 'NYC Tech Events',
    baseUrl: '',
    searchPatterns: [
      'NYC tech events',
      'New York startup events',
      'Manhattan tech meetups',
      'Brooklyn tech community'
    ],
    category: 'tech'
  },

  // National Academic Conferences
  {
    name: 'National Academic Conferences',
    baseUrl: '',
    searchPatterns: [
      'national academic conferences 2024',
      'university research symposiums',
      'academic conferences USA',
      'scholarly conferences'
    ],
    category: 'academic'
  },
  
  // Lubbock Local Events (keeping existing)
  {
    name: 'City of Lubbock Events',
    baseUrl: 'mylubbock.us',
    searchPatterns: [
      'site:mylubbock.us events',
      'site:mylubbock.us calendar',
      'Lubbock city events',
      'Lubbock municipal events'
    ],
    category: 'local'
  },
  {
    name: 'Lubbock Chamber of Commerce',
    baseUrl: 'lubbockchamber.com',
    searchPatterns: [
      'site:lubbockchamber.com events',
      'Lubbock business events',
      'Lubbock networking events',
      'Lubbock professional development'
    ],
    category: 'local'
  },
  {
    name: 'Visit Lubbock',
    baseUrl: 'visitlubbock.org',
    searchPatterns: [
      'site:visitlubbock.org events',
      'site:visitlubbock.org calendar',
      'Lubbock entertainment events',
      'Lubbock cultural events'
    ],
    category: 'cultural'
  },
  
  // Academic and Research Events (keeping existing enhanced)
  {
    name: 'TTU Research Events',
    baseUrl: 'ttu.edu',
    searchPatterns: [
      'site:ttu.edu research symposium',
      'site:ttu.edu academic conferences',
      'site:ttu.edu faculty lectures',
      'Texas Tech research events'
    ],
    category: 'academic'
  },
  
  // Cultural and Arts Events (keeping existing enhanced)
  {
    name: 'Lubbock Arts Events',
    baseUrl: '',
    searchPatterns: [
      'Lubbock symphony events',
      'Lubbock theater schedule',
      'Lubbock art gallery events',
      'Lubbock cultural district events',
      'Lubbock music events'
    ],
    category: 'cultural'
  },
  {
    name: 'Buddy Holly Center',
    baseUrl: 'buddyhollycenter.org',
    searchPatterns: [
      'site:buddyhollycenter.org events',
      'Buddy Holly Center Lubbock events',
      'Lubbock music hall events'
    ],
    category: 'cultural'
  }
];

export class EnhancedEventDiscovery {
  
  /**
   * Discover events from multiple sources with improved variety
   */
  async discoverEvents(options: {
    categories?: string[];
    maxEventsPerSource?: number;
    dateRange?: { start: Date; end: Date };
    keywords?: string[];
  } = {}): Promise<DiscoveredEvent[]> {
    const {
      categories = ['university', 'local', 'academic', 'cultural', 'tech'],
      maxEventsPerSource = 5,
      keywords = []
    } = options;

    const allEvents: DiscoveredEvent[] = [];
    
    // Filter sources by category
    const relevantSources = EVENT_SOURCES.filter(source => 
      categories.includes(source.category)
    );

    console.log(`Discovering events from ${relevantSources.length} sources...`);

    for (const source of relevantSources) {
      try {
        const events = await this.discoverFromSource(source, maxEventsPerSource, keywords);
        allEvents.push(...events);
        console.log(`Found ${events.length} events from ${source.name}`);
      } catch (error) {
        console.error(`Error discovering events from ${source.name}:`, error);
      }
    }

    // Deduplicate and sort events
    const uniqueEvents = this.deduplicateEvents(allEvents);
    return this.sortEventsByRelevance(uniqueEvents, keywords);
  }

  /**
   * Discover events from a specific source
   */
  private async discoverFromSource(
    source: EventSource, 
    maxResults: number, 
    keywords: string[]
  ): Promise<DiscoveredEvent[]> {
    const events: DiscoveredEvent[] = [];

    for (const pattern of source.searchPatterns) {
      try {
        // Add user keywords to the search pattern
        const enhancedPattern = keywords.length > 0 
          ? `${pattern} ${keywords.join(' ')}`
          : pattern;

        const searchResponse = await searchWeb(enhancedPattern, { maxResults: 3 });
        
        for (const result of searchResponse.results) {
          const event = await this.extractEventFromResult(result, source);
          if (event) {
            events.push(event);
          }
        }

        // Limit events per pattern to avoid overwhelming
        if (events.length >= maxResults) break;
      } catch (error) {
        console.error(`Error searching pattern "${pattern}":`, error);
      }
    }

    return events.slice(0, maxResults);
  }

  /**
   * Extract event information from search result
   */
  private async extractEventFromResult(
    result: any, 
    source: EventSource
  ): Promise<DiscoveredEvent | null> {
    try {
      // Try to scrape more detailed information
      let eventDetails = null;
      try {
        eventDetails = await scrapeUrl(result.url);
      } catch (error) {
        // If scraping fails, use search result data
        console.log(`Scraping failed for ${result.url}, using search data`);
      }

      // Extract date information (this is a simplified extraction)
      const dateInfo = this.extractDateFromText(result.description + ' ' + result.title);
      
      const event: DiscoveredEvent = {
        title: result.title,
        description: result.description,
        date: dateInfo.date || new Date().toISOString().split('T')[0],
        time: dateInfo.time,
        location: this.extractLocationFromText(result.description, source.name),
        source: source.name,
        url: result.url,
        category: source.category,
        tags: this.generateTags(result, source)
      };

      return event;
    } catch (error) {
      console.error(`Error extracting event from result:`, error);
      return null;
    }
  }

  /**
   * Extract date information from text
   */
  private extractDateFromText(text: string): { date?: string; time?: string } {
    const datePatterns = [
      /(\w+day),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/i, // Monday, January 15, 2024
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i, // January 15, 2024
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, // 01/15/2024
      /(\d{4})-(\d{2})-(\d{2})/g, // 2024-01-15
    ];

    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(AM|PM)/gi,
      /(\d{1,2})\s*(AM|PM)/gi
    ];

    let extractedDate = '';
    let extractedTime = '';

    // Try to extract date
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedDate = match[0];
        break;
      }
    }

    // Try to extract time
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedTime = match[0];
        break;
      }
    }

    return {
      date: extractedDate || undefined,
      time: extractedTime || undefined
    };
  }

  /**
   * Extract location from text based on source context
   */
  private extractLocationFromText(text: string, sourceName: string): string {
    // Common locations for each source type
    const locationHints = {
      'Texas Tech University': ['Lubbock, TX', 'TTU Campus', 'Texas Tech'],
      'Lubbock Christian University': ['Lubbock, TX', 'LCU Campus'],
      'South Plains College': ['Lubbock, TX', 'SPC Campus'],
      'City of Lubbock': ['Lubbock, TX', 'Downtown Lubbock'],
    };

    // Try to extract specific locations from text
    const locationPatterns = [
      /at\s+([^,]+(?:,\s*[^,]+)*)/i,
      /in\s+([^,]+(?:,\s*[^,]+)*)/i,
      /(\d+\s+[^,]+(?:,\s*Lubbock)?)/i
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Fallback to source-based location
    for (const [key, locations] of Object.entries(locationHints)) {
      if (sourceName.includes(key)) {
        return locations[0];
      }
    }

    return 'Lubbock, TX';
  }

  /**
   * Generate relevant tags for the event
   */
  private generateTags(result: any, source: EventSource): string[] {
    const tags: string[] = [];
    const text = (result.title + ' ' + result.description).toLowerCase();

    // Source-based tags
    tags.push(source.category);

    // Content-based tags
    const tagKeywords = {
      'student': ['student', 'undergraduate', 'graduate'],
      'faculty': ['faculty', 'professor', 'staff'],
      'research': ['research', 'study', 'thesis', 'dissertation'],
      'sports': ['game', 'match', 'tournament', 'athletics'],
      'music': ['concert', 'band', 'orchestra', 'music'],
      'art': ['art', 'gallery', 'exhibition', 'museum'],
      'technology': ['tech', 'coding', 'programming', 'computer'],
      'business': ['business', 'networking', 'professional', 'career'],
      'community': ['community', 'volunteer', 'service'],
      'food': ['food', 'dining', 'restaurant', 'cook'],
      'free': ['free', 'no cost', 'complimentary']
    };

    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        tags.push(tag);
      }
    }

    // TTU specific tags
    if (text.includes('texas tech') || text.includes('ttu')) {
      tags.push('ttu', 'red-raiders');
    }

    return Array.from(new Set(tags)); // Remove duplicates
  }

  /**
   * Remove duplicate events based on title and date similarity
   */
  private deduplicateEvents(events: DiscoveredEvent[]): DiscoveredEvent[] {
    const unique: DiscoveredEvent[] = [];
    const seen = new Set<string>();

    for (const event of events) {
      const key = `${event.title.toLowerCase().slice(0, 50)}-${event.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(event);
      }
    }

    return unique;
  }

  /**
   * Sort events by relevance based on keywords and date
   */
  private sortEventsByRelevance(events: DiscoveredEvent[], keywords: string[]): DiscoveredEvent[] {
    return events.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Keyword relevance scoring
      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        if (a.title.toLowerCase().includes(keywordLower)) scoreA += 3;
        if (a.description.toLowerCase().includes(keywordLower)) scoreA += 2;
        if (a.tags.includes(keywordLower)) scoreA += 1;

        if (b.title.toLowerCase().includes(keywordLower)) scoreB += 3;
        if (b.description.toLowerCase().includes(keywordLower)) scoreB += 2;
        if (b.tags.includes(keywordLower)) scoreB += 1;
      }

      // Date relevance (prefer upcoming events)
      const now = new Date();
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (dateA >= now && dateB >= now) {
        // Both future events, prefer sooner
        scoreA += dateA < dateB ? 1 : 0;
        scoreB += dateB < dateA ? 1 : 0;
      } else if (dateA >= now) {
        scoreA += 2; // Future event bonus
      } else if (dateB >= now) {
        scoreB += 2; // Future event bonus
      }

      return scoreB - scoreA;
    });
  }

  /**
   * Get events by specific category
   */
  async getEventsByCategory(category: string, limit: number = 10): Promise<DiscoveredEvent[]> {
    const events = await this.discoverEvents({ categories: [category] });
    return events.slice(0, limit);
  }

  /**
   * Get TTU specific events
   */
  async getTTUEvents(limit: number = 15): Promise<DiscoveredEvent[]> {
    return this.discoverEvents({
      categories: ['university'],
      keywords: ['Texas Tech', 'TTU', 'Red Raiders'],
      maxEventsPerSource: 5
    }).then(events => events.slice(0, limit));
  }

  /**
   * Get local Lubbock events
   */
  async getLubbockEvents(limit: number = 15): Promise<DiscoveredEvent[]> {
    return this.discoverEvents({
      categories: ['local', 'cultural'],
      keywords: ['Lubbock'],
      maxEventsPerSource: 5
    }).then(events => events.slice(0, limit));
  }
}

// Export singleton instance
export const enhancedEventDiscovery = new EnhancedEventDiscovery();
