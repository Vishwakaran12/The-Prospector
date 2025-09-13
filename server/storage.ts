import { 
  type User, 
  type InsertUser, 
  type Content, 
  type InsertContent,
  type Claim,
  type InsertClaim,
  type SearchRequest
} from "@shared/schema";
import { randomUUID } from "crypto";

// Storage interface with CRUD operations for claims management
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Content operations
  getContent(id: string): Promise<Content | undefined>;
  getContentByUrl(url: string): Promise<Content | undefined>;
  createContent(content: InsertContent): Promise<Content>;
  updateContent(id: string, updates: Partial<Content>): Promise<Content | undefined>;
  searchContent(query: string, contentType?: string, limit?: number): Promise<Content[]>;
  getContentsByIds(ids: string[]): Promise<Content[]>;
  
  // Claims operations
  getClaim(id: string): Promise<Claim | undefined>;
  getClaimsByUser(userId: string): Promise<Claim[]>;
  getClaimsByContent(contentId: string): Promise<Claim[]>;
  getUserClaimForContent(userId: string, contentId: string): Promise<Claim | undefined>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: string, updates: Partial<Claim>): Promise<Claim | undefined>;
  deleteClaim(id: string): Promise<boolean>;
  getClaimsByType(userId: string, claimType: string): Promise<Claim[]>;
  getClaimsWithContent(userId: string): Promise<Array<Claim & { content: Content }>>;
}

// In-memory storage implementation (MongoDB-compatible structure)
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private content: Map<string, Content>;
  private claims: Map<string, Claim>;

  constructor() {
    this.users = new Map();
    this.content = new Map();
    this.claims = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Content operations
  async getContent(id: string): Promise<Content | undefined> {
    return this.content.get(id);
  }

  async getContentByUrl(url: string): Promise<Content | undefined> {
    return Array.from(this.content.values()).find(
      (content) => content.url === url
    );
  }

  async createContent(insertContent: InsertContent): Promise<Content> {
    const id = randomUUID();
    const content: Content = {
      ...insertContent,
      id,
      scrapedAt: new Date(),
      isProcessed: insertContent.isProcessed ?? false,
      content: insertContent.content ?? null,
      title: insertContent.title ?? null,
      description: insertContent.description ?? null
    };
    this.content.set(id, content);
    return content;
  }

  async updateContent(id: string, updates: Partial<Content>): Promise<Content | undefined> {
    const existing = this.content.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.content.set(id, updated);
    return updated;
  }

  async searchContent(query: string, contentType?: string, limit = 10): Promise<Content[]> {
    const allContent = Array.from(this.content.values());
    
    let filtered = allContent.filter(content => {
      const matchesQuery = !query || 
        content.title?.toLowerCase().includes(query.toLowerCase()) ||
        content.description?.toLowerCase().includes(query.toLowerCase()) ||
        content.content?.toLowerCase().includes(query.toLowerCase());
      
      const matchesType = !contentType || contentType === 'any' || content.contentType === contentType;
      
      return matchesQuery && matchesType;
    });

    // Sort by scrapedAt (newest first)
    filtered.sort((a, b) => new Date(b.scrapedAt!).getTime() - new Date(a.scrapedAt!).getTime());
    
    return filtered.slice(0, limit);
  }

  async getContentsByIds(ids: string[]): Promise<Content[]> {
    return ids.map(id => this.content.get(id)).filter(Boolean) as Content[];
  }

  // Claims operations
  async getClaim(id: string): Promise<Claim | undefined> {
    return this.claims.get(id);
  }

  async getClaimsByUser(userId: string): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter(claim => claim.userId === userId);
  }

  async getClaimsByContent(contentId: string): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter(claim => claim.contentId === contentId);
  }

  async getUserClaimForContent(userId: string, contentId: string): Promise<Claim | undefined> {
    return Array.from(this.claims.values()).find(
      claim => claim.userId === userId && claim.contentId === contentId
    );
  }

  async createClaim(insertClaim: InsertClaim): Promise<Claim> {
    const id = randomUUID();
    const now = new Date();
    const claim: Claim = {
      ...insertClaim,
      id,
      status: insertClaim.status || 'active',
      priority: insertClaim.priority || 'medium',
      notes: insertClaim.notes ?? null,
      claimedAt: now,
      updatedAt: now
    };
    this.claims.set(id, claim);
    return claim;
  }

  async updateClaim(id: string, updates: Partial<Claim>): Promise<Claim | undefined> {
    const existing = this.claims.get(id);
    if (!existing) return undefined;
    
    const updated = { 
      ...existing, 
      ...updates, 
      updatedAt: new Date()
    };
    this.claims.set(id, updated);
    return updated;
  }

  async deleteClaim(id: string): Promise<boolean> {
    return this.claims.delete(id);
  }

  async getClaimsByType(userId: string, claimType: string): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter(
      claim => claim.userId === userId && claim.claimType === claimType
    );
  }

  async getClaimsWithContent(userId: string): Promise<Array<Claim & { content: Content }>> {
    const userClaims = await this.getClaimsByUser(userId);
    const contentIds = userClaims.map(claim => claim.contentId);
    const contents = await this.getContentsByIds(contentIds);
    
    const contentMap = new Map(contents.map(c => [c.id, c]));
    
    return userClaims
      .map(claim => {
        const content = contentMap.get(claim.contentId);
        return content ? { ...claim, content } : null;
      })
      .filter(Boolean) as Array<Claim & { content: Content }>;
  }
}

export const storage = new MemStorage();

// MongoDB connection setup (for future use)
// Uncomment and configure when migrating to MongoDB:
/*
import { MongoClient, Db } from 'mongodb';

export class MongoStorage implements IStorage {
  private db: Db;
  private client: MongoClient;

  constructor(mongoUrl: string, dbName: string) {
    this.client = new MongoClient(mongoUrl);
    this.db = this.client.db(dbName);
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.close();
  }

  // Implement all IStorage methods using MongoDB operations
  // Example:
  // async createContent(content: InsertContent): Promise<Content> {
  //   const result = await this.db.collection('content').insertOne({
  //     ...content,
  //     _id: new ObjectId(),
  //     scrapedAt: new Date(),
  //     isProcessed: content.isProcessed ?? false
  //   });
  //   return result.ops[0];
  // }
}
*/