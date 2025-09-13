
import { User, InsertUser, Content, InsertContent, Claim, InsertClaim, SearchRequest } from "../shared/schema";
import { randomUUID } from "crypto";
import { SearchModel, ISearch } from './models/search';
import { connectMongo } from './mongo';
import dotenv from 'dotenv';
dotenv.config();

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

// MongoDB-backed storage implementation
export class MongoStorage implements IStorage {
  constructor() {
    connectMongo();
  }

  // User operations (not implemented for MongoDB in MVP)
  async getUser(_id: string): Promise<User | undefined> { return undefined; }
  async getUserByUsername(_username: string): Promise<User | undefined> { return undefined; }
  async createUser(_user: InsertUser): Promise<User> { throw new Error('Not implemented'); }

  // Content operations
  async getContent(id: string): Promise<Content | undefined> {
    const doc = await SearchModel.findById(id).lean();
    return doc ? this.toContent(doc) : undefined;
  }

  async getContentByUrl(url: string): Promise<Content | undefined> {
    const doc = await SearchModel.findOne({ 'results.url': url }).lean();
    return doc ? this.toContent(doc) : undefined;
  }

  async createContent(insertContent: InsertContent): Promise<Content> {
    const doc = await SearchModel.create({
      query: insertContent.title || insertContent.url,
      results: [
        {
          title: insertContent.title || '',
          description: insertContent.description || '',
          url: insertContent.url,
          type: insertContent.contentType,
          metadata: insertContent.metadata || {},
        },
      ],
      createdAt: new Date(),
    });
    return this.toContent(doc.toObject());
  }

  async updateContent(id: string, updates: Partial<Content>): Promise<Content | undefined> {
    const doc = await SearchModel.findByIdAndUpdate(id, updates, { new: true }).lean();
    return doc ? this.toContent(doc) : undefined;
  }

  async searchContent(query: string, contentType?: string, limit = 10): Promise<Content[]> {
    const docs = await SearchModel.find({
      $or: [
        { 'results.title': { $regex: query, $options: 'i' } },
        { 'results.description': { $regex: query, $options: 'i' } },
      ],
    })
      .limit(limit)
      .lean();
    return docs.map(this.toContent);
  }

  async getContentsByIds(ids: string[]): Promise<Content[]> {
    const docs = await SearchModel.find({ _id: { $in: ids } }).lean();
    return docs.map(this.toContent);
  }

  // Claims operations (not implemented for MongoDB in MVP)
  async getClaim(_id: string): Promise<Claim | undefined> { return undefined; }
  async getClaimsByUser(_userId: string): Promise<Claim[]> { return []; }
  async getClaimsByContent(_contentId: string): Promise<Claim[]> { return []; }
  async getUserClaimForContent(_userId: string, _contentId: string): Promise<Claim | undefined> { return undefined; }
  async createClaim(_claim: InsertClaim): Promise<Claim> { throw new Error('Not implemented'); }
  async updateClaim(_id: string, _updates: Partial<Claim>): Promise<Claim | undefined> { return undefined; }
  async deleteClaim(_id: string): Promise<boolean> { return false; }
  async getClaimsByType(_userId: string, _claimType: string): Promise<Claim[]> { return []; }
  async getClaimsWithContent(_userId: string): Promise<Array<Claim & { content: Content }>> { return []; }

  // Helper to convert ISearch to Content
  private toContent(doc: any): Content {
    const first = doc.results[0];
    return {
      id: doc._id.toString(),
      url: first.url,
      title: first.title,
      description: first.description,
      content: '',
      contentType: first.type || '',
      metadata: first.metadata || {},
      scrapedAt: doc.createdAt,
      isProcessed: false,
      geminiAnalysis: null,
    };
  }
}

// In-memory storage implementation (for development/fallback)
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private content: Map<string, Content> = new Map();
  private claims: Map<string, Claim> = new Map();

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  // Content operations
  async getContent(id: string): Promise<Content | undefined> {
    return this.content.get(id);
  }
  async getContentByUrl(url: string): Promise<Content | undefined> {
    return Array.from(this.content.values()).find((content) => content.url === url);
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
      description: insertContent.description ?? null,
      metadata: insertContent.metadata ?? null,
      geminiAnalysis: insertContent.geminiAnalysis ?? null
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
    return Array.from(this.claims.values()).find(claim => claim.userId === userId && claim.contentId === contentId);
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
      tags: insertClaim.tags ?? null,
      claimedAt: now,
      updatedAt: now
    };
    this.claims.set(id, claim);
    return claim;
  }
  async updateClaim(id: string, updates: Partial<Claim>): Promise<Claim | undefined> {
    const existing = this.claims.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.claims.set(id, updated);
    return updated;
  }
  async deleteClaim(id: string): Promise<boolean> {
    return this.claims.delete(id);
  }
  async getClaimsByType(userId: string, claimType: string): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter(claim => claim.userId === userId && claim.claimType === claimType);
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

// Export the correct storage instance - start with MemStorage and upgrade if MongoDB connects
export let storage: IStorage = new MemStorage();

// Try to connect to MongoDB and upgrade storage if successful
if (process.env.MONGODB_URI) {
  connectMongo()
    .then(() => {
      console.log('MongoDB connected successfully, upgrading to MongoStorage');
      storage = new MongoStorage();
    })
    .catch((error) => {
      console.error('MongoDB connection failed, continuing with MemStorage:', error instanceof Error ? error.message : error);
    });
}