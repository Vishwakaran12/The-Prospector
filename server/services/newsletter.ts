import { storage } from '../storage';
import { analyzeContent } from './gemini';
import { searchWeb } from './websearch';
import { enhancedEventDiscovery } from './event-discovery';
import type { IUserBehavior, INewsletter } from '../models/personalization';

export interface NewsletterGenerationOptions {
  userId: string;
  behaviorAnalysisDays?: number;
  maxTopics?: number;
  includeRecommendations?: boolean;
}

export interface NewsletterSection {
  title: string;
  content: string;
  sources?: string[];
  priority: number;
}

export interface GeneratedNewsletter {
  title: string;
  content: string;
  contentHtml: string;
  topics: string[];
  sections: NewsletterSection[];
  metadata: {
    generatedAt: Date;
    behaviorAnalyzed: number;
    topicsFound: number;
    sourcesUsed: string[];
  };
}

export class NewsletterGenerator {
  
  /**
   * Generate a personalized newsletter based on user behavior and interests
   */
  async generatePersonalizedNewsletter(options: NewsletterGenerationOptions): Promise<GeneratedNewsletter> {
    const { userId, behaviorAnalysisDays = 30, maxTopics = 5, includeRecommendations = true } = options;
    
    try {
      // 1. Get user profile and interests
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 2. Analyze recent user behavior
      const behaviors = await storage.getUserBehavior(userId, 100);
      const behaviorAnalysis = this.analyzeBehaviorPatterns(behaviors);

      // 3. Extract topics from user interests and behavior
      const userInterests = user.interests as string[] || [];
      const behaviorTopics = this.extractTopicsFromBehavior(behaviors);
      const allTopics = [...userInterests, ...behaviorTopics].slice(0, maxTopics);

      // 4. Generate content for each topic
      const sections: NewsletterSection[] = [];
      
      // Add events section first
      const eventsSection = await this.generateEventsSection(userId, userInterests);
      if (eventsSection) {
        sections.push(eventsSection);
      }
      
      for (const topic of allTopics) {
        try {
          const section = await this.generateTopicSection(topic, userId);
          if (section) {
            sections.push(section);
          }
        } catch (error) {
          console.error(`Error generating section for topic ${topic}:`, error);
        }
      }

      // 5. Add recommendations if enabled
      if (includeRecommendations && sections.length > 0) {
        const recommendationSection = await this.generateRecommendationsSection(userId, behaviorAnalysis);
        if (recommendationSection) {
          sections.push(recommendationSection);
        }
      }

      // 6. Compile newsletter
      const newsletter = this.compileNewsletter(sections, user.username || 'User', allTopics);

      return {
        ...newsletter,
        metadata: {
          generatedAt: new Date(),
          behaviorAnalyzed: behaviors.length,
          topicsFound: allTopics.length,
          sourcesUsed: sections.flatMap(s => s.sources || []),
        }
      };

    } catch (error) {
      console.error('Error generating newsletter:', error);
      throw new Error('Failed to generate newsletter');
    }
  }

  /**
   * Analyze user behavior patterns to understand interests
   */
  private analyzeBehaviorPatterns(behaviors: IUserBehavior[]) {
    const actionCounts: Record<string, number> = {};
    const entityTypes: Record<string, number> = {};
    const timePatterns: Record<string, number> = {};

    behaviors.forEach(behavior => {
      // Count actions
      actionCounts[behavior.action] = (actionCounts[behavior.action] || 0) + 1;
      
      // Count entity types
      if (behavior.entityType) {
        entityTypes[behavior.entityType] = (entityTypes[behavior.entityType] || 0) + 1;
      }
      
      // Analyze time patterns
      if (behavior.timestamp) {
        const hour = new Date(behavior.timestamp).getHours();
        const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        timePatterns[timeSlot] = (timePatterns[timeSlot] || 0) + 1;
      }
    });

    return {
      mostCommonActions: Object.entries(actionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      preferredEntityTypes: Object.entries(entityTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3),
      activeTimeSlots: Object.entries(timePatterns)
        .sort(([,a], [,b]) => b - a),
    };
  }

  /**
   * Extract topic keywords from user behavior context
   */
  private extractTopicsFromBehavior(behaviors: IUserBehavior[]): string[] {
    const topicKeywords: Set<string> = new Set();
    
    behaviors.forEach(behavior => {
      if (behavior.context && typeof behavior.context === 'object') {
        // Extract keywords from context
        const contextStr = JSON.stringify(behavior.context).toLowerCase();
        
        // Simple keyword extraction (in production, use NLP)
        const keywords = contextStr.match(/\b[a-z]{4,}\b/g) || [];
        keywords.forEach(keyword => {
          if (!['chat', 'user', 'message', 'content', 'data'].includes(keyword)) {
            topicKeywords.add(keyword);
          }
        });
      }
    });

    return Array.from(topicKeywords).slice(0, 10);
  }

  /**
   * Generate events section with TTU and Lubbock events
   */
  private async generateEventsSection(userId: string, userInterests: string[]): Promise<NewsletterSection | null> {
    try {
      console.log('Generating events section for user:', userId);
      
      // Get diverse events from multiple sources
      const ttuEvents = await enhancedEventDiscovery.getTTUEvents(5);
      const lubbockEvents = await enhancedEventDiscovery.getLubbockEvents(5);
      const academicEvents = await enhancedEventDiscovery.getEventsByCategory('academic', 3);
      const techEvents = await enhancedEventDiscovery.getEventsByCategory('tech', 3);
      
      const allEvents = [...ttuEvents, ...lubbockEvents, ...academicEvents, ...techEvents];
      
      if (allEvents.length === 0) {
        return null;
      }

      // Filter events based on user interests
      const relevantEvents = this.filterEventsByInterests(allEvents, userInterests);
      const topEvents = relevantEvents.slice(0, 8); // Limit to top 8 events

      const eventContent = topEvents.map(event => {
        const dateStr = event.date ? new Date(event.date).toLocaleDateString() : 'TBD';
        const timeStr = event.time ? ` at ${event.time}` : '';
        const tags = event.tags.length > 0 ? ` (${event.tags.join(', ')})` : '';
        
        return `🎯 **${event.title}**
📅 ${dateStr}${timeStr}
📍 ${event.location}
📝 ${event.description}
🏷️ ${event.source}${tags}
🔗 [More Info](${event.url})`;
      }).join('\n\n');

      // Track that user viewed events content
      await storage.trackUserBehavior(userId, 'newsletter_events_generated', 'events', 'mixed_sources');

      return {
        title: '🎉 Upcoming Events in Your Area',
        content: `Here are exciting events happening around TTU and Lubbock:\n\n${eventContent}`,
        sources: topEvents.map(e => e.url),
        priority: 0 // High priority for events
      };
    } catch (error) {
      console.error('Error generating events section:', error);
      return null;
    }
  }

  /**
   * Filter events based on user interests
   */
  private filterEventsByInterests(events: any[], userInterests: string[]): any[] {
    if (userInterests.length === 0) {
      return events;
    }

    return events.filter(event => {
      const eventText = `${event.title} ${event.description} ${event.tags.join(' ')}`.toLowerCase();
      return userInterests.some(interest => 
        eventText.includes(interest.toLowerCase()) ||
        event.tags.some((tag: string) => tag.toLowerCase().includes(interest.toLowerCase()))
      );
    }).concat(
      // Also include some general events even if they don't match interests
      events.filter(event => 
        event.source.includes('Texas Tech') || 
        event.tags.includes('student') ||
        event.tags.includes('free')
      ).slice(0, 3)
    );
  }

  /**
   * Generate a content section for a specific topic
   */
  private async generateTopicSection(topic: string, userId: string): Promise<NewsletterSection | null> {
    try {
      // Search for recent content related to the topic
      const searchResponse = await searchWeb(topic, { maxResults: 3 });
      
      if (searchResponse.results.length === 0) {
        return null;
      }

      // For now, create a simple summary from search results
      const topResult = searchResponse.results[0];
      
      const section: NewsletterSection = {
        title: `Latest on ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
        content: `Here are the latest updates on ${topic}:\n\n${searchResponse.results.map(r => `• ${r.title}: ${r.description}`).join('\n')}`,
        sources: searchResponse.results.map(r => r.url),
        priority: 1
      };

      // Track that user viewed topic content
      await storage.trackUserBehavior(userId, 'newsletter_topic_generated', 'topic', topic);

      return section;
    } catch (error) {
      console.error(`Error generating topic section for ${topic}:`, error);
      return null;
    }
  }

  /**
   * Generate recommendations based on user behavior
   */
  private async generateRecommendationsSection(userId: string, behaviorAnalysis: any): Promise<NewsletterSection | null> {
    try {
      const recommendations: string[] = [];

      // Generate recommendations based on most common actions
      if (behaviorAnalysis.mostCommonActions.length > 0) {
        const topAction = behaviorAnalysis.mostCommonActions[0][0];
        
        switch (topAction) {
          case 'view_content':
            recommendations.push("Continue exploring content that interests you - consider bookmarking articles for later reading.");
            break;
          case 'search':
            recommendations.push("Try using more specific search terms to find exactly what you're looking for.");
            break;
          case 'send_message':
            recommendations.push("Your active communication suggests you might enjoy collaborative content and discussion forums.");
            break;
          default:
            recommendations.push("Keep up the great engagement with the platform!");
        }
      }

      // Time-based recommendations
      if (behaviorAnalysis.activeTimeSlots.length > 0) {
        const preferredTime = behaviorAnalysis.activeTimeSlots[0][0];
        recommendations.push(`You're most active in the ${preferredTime} - consider scheduling important reading for this time.`);
      }

      if (recommendations.length === 0) {
        return null;
      }

      return {
        title: "Personalized Recommendations",
        content: recommendations.join('\n\n'),
        priority: 3
      };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return null;
    }
  }

  /**
   * Compile all sections into a cohesive newsletter
   */
  private compileNewsletter(sections: NewsletterSection[], username: string, topics: string[]): Omit<GeneratedNewsletter, 'metadata'> {
    // Sort sections by priority
    const sortedSections = sections.sort((a, b) => a.priority - b.priority);
    
    const title = `Personal Newsletter for ${username} - ${new Date().toLocaleDateString()}`;
    
    const content = `# ${title}

Hello ${username}!

Here's your personalized newsletter based on your interests and recent activity.

${sortedSections.map(section => `## ${section.title}

${section.content}

${section.sources ? `*Sources: ${section.sources.join(', ')}*` : ''}
`).join('\n---\n\n')}

---

*This newsletter was automatically generated based on your interests: ${topics.join(', ')}*

*Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*`;

    const contentHtml = this.convertToHtml(content);

    return {
      title,
      content,
      contentHtml,
      topics,
      sections: sortedSections
    };
  }

  /**
   * Convert markdown content to HTML
   */
  private convertToHtml(markdown: string): string {
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^• (.*$)/gim, '<li>$1</li>')
      .replace(/\n/gim, '<br>')
      .replace(/---/gim, '<hr>');
  }

  /**
   * Save generated newsletter to database
   */
  async saveNewsletter(userId: string, newsletter: GeneratedNewsletter): Promise<INewsletter> {
    return await storage.createNewsletter(
      userId,
      newsletter.title,
      newsletter.content,
      newsletter.topics
    );
  }
}

// Export singleton instance
export const newsletterGenerator = new NewsletterGenerator();
