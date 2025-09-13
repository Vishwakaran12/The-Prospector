
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