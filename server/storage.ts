
import { User, InsertUser, Content, InsertContent, Claim, InsertClaim, SearchRequest } from "../shared/schema";
import { randomUUID } from "crypto";
import { SearchModel, ISearch } from './models/search';
import { 
  UserModel, 
  ChatModel, 
  ChatMessageModel, 
  UserBehaviorModel, 
  NewsletterModel,
  ContentModel,
  ClaimModel,
  UserWishModel,
  type IUser,
  type IChat,
  type IChatMessage,
  type IUserBehavior,
  type INewsletter,
  type IContent,
  type IClaim,
  type IUserWish
} from './models/personalization';
import { connectMongo } from './mongo';
import dotenv from 'dotenv';
dotenv.config();

// Storage interface with CRUD operations for claims management and personalization
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Chat operations
  createChat(userId: string, title: string, description?: string): Promise<IChat>;
  getChat(id: string): Promise<IChat | undefined>;
  getUserChats(userId: string, limit?: number): Promise<IChat[]>;
  updateChat(id: string, updates: Partial<IChat>): Promise<IChat | undefined>;
  deleteChat(id: string): Promise<boolean>;
  archiveChat(id: string): Promise<boolean>;

  // Chat message operations
  createChatMessage(chatId: string, userId: string, role: string, content: string, metadata?: any): Promise<IChatMessage>;
  getChatMessages(chatId: string, limit?: number): Promise<IChatMessage[]>;
  deleteChatMessage(id: string): Promise<boolean>;

  // User behavior tracking
  trackUserBehavior(userId: string, action: string, entityType?: string, entityId?: string, context?: any): Promise<IUserBehavior>;
  getUserBehavior(userId: string, limit?: number, action?: string): Promise<IUserBehavior[]>;

  // Newsletter operations
  createNewsletter(userId: string, title: string, content: string, topics?: string[]): Promise<INewsletter>;
  getUserNewsletters(userId: string, limit?: number): Promise<INewsletter[]>;
  markNewsletterSent(id: string): Promise<boolean>;

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

  // User wishes operations
  createUserWish(userId: string, eventData: Partial<IUserWish>): Promise<IUserWish>;
  getUserWishes(userId: string, status?: string): Promise<IUserWish[]>;
  updateUserWish(id: string, updates: Partial<IUserWish>): Promise<IUserWish | undefined>;
  deleteUserWish(id: string): Promise<boolean>;
  getUserWishById(id: string): Promise<IUserWish | undefined>;
}

// MongoDB-backed storage implementation
export class MongoStorage implements IStorage {
  constructor() {
    connectMongo();
  }

  // Utility functions to convert MongoDB objects to expected types
  private toUser(mongoUser: any): User {
    return {
      id: mongoUser._id.toString(),
      username: mongoUser.username,
      email: mongoUser.email || null,
      password: mongoUser.password,
      firstName: mongoUser.firstName || null,
      lastName: mongoUser.lastName || null,
      avatar: mongoUser.avatar || null,
      timezone: mongoUser.timezone || null,
      preferences: mongoUser.preferences || null,
      interests: mongoUser.interests || null,
      newsletterEnabled: mongoUser.newsletterEnabled || null,
      lastActivityAt: mongoUser.lastActivityAt || null,
      createdAt: mongoUser.createdAt || null,
      updatedAt: mongoUser.updatedAt || null,
    };
  }

  private toChat(mongoChat: any): IChat {
    return {
      _id: mongoChat._id.toString(),
      userId: mongoChat.userId.toString(),
      title: mongoChat.title,
      description: mongoChat.description,
      isArchived: mongoChat.isArchived,
      tags: mongoChat.tags,
      metadata: mongoChat.metadata,
      createdAt: mongoChat.createdAt,
      updatedAt: mongoChat.updatedAt,
    };
  }

  private toChatMessage(mongoMessage: any): IChatMessage {
    return {
      _id: mongoMessage._id.toString(),
      chatId: mongoMessage.chatId.toString(),
      userId: mongoMessage.userId.toString(),
      role: mongoMessage.role,
      content: mongoMessage.content,
      contentType: mongoMessage.contentType,
      metadata: mongoMessage.metadata,
      createdAt: mongoMessage.createdAt,
    };
  }

  private toUserBehavior(mongoBehavior: any): IUserBehavior {
    return {
      _id: mongoBehavior._id.toString(),
      userId: mongoBehavior.userId.toString(),
      action: mongoBehavior.action,
      entityType: mongoBehavior.entityType,
      entityId: mongoBehavior.entityId,
      context: mongoBehavior.context,
      timestamp: mongoBehavior.timestamp,
    };
  }

  private toNewsletter(mongoNewsletter: any): INewsletter {
    return {
      _id: mongoNewsletter._id.toString(),
      userId: mongoNewsletter.userId.toString(),
      title: mongoNewsletter.title,
      content: mongoNewsletter.content,
      contentHtml: mongoNewsletter.contentHtml,
      topics: mongoNewsletter.topics,
      sentAt: mongoNewsletter.sentAt,
      status: mongoNewsletter.status,
      generationMetadata: mongoNewsletter.generationMetadata,
      createdAt: mongoNewsletter.createdAt,
      updatedAt: mongoNewsletter.updatedAt,
    };
  }

  private toUserWish(mongoWish: any): IUserWish {
    return {
      _id: mongoWish._id.toString(),
      userId: mongoWish.userId.toString(),
      eventTitle: mongoWish.eventTitle,
      eventDescription: mongoWish.eventDescription,
      eventDate: mongoWish.eventDate,
      eventTime: mongoWish.eventTime,
      eventLocation: mongoWish.eventLocation,
      eventUrl: mongoWish.eventUrl,
      source: mongoWish.source,
      category: mongoWish.category,
      tags: mongoWish.tags,
      notes: mongoWish.notes,
      priority: mongoWish.priority,
      isReminded: mongoWish.isReminded,
      status: mongoWish.status,
      createdAt: mongoWish.createdAt,
      updatedAt: mongoWish.updatedAt,
    };
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = await UserModel.findById(id).lean();
    return user ? this.toUser(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ username }).lean();
    return user ? this.toUser(user) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userData: IUser = {
      username: insertUser.username,
      password: insertUser.password,
      email: undefined,
      firstName: undefined,
      lastName: undefined,
      avatar: undefined,
      timezone: 'UTC',
      preferences: {},
      interests: [],
      newsletterEnabled: true,
      lastActivityAt: new Date(),
    };
    
    const user = await UserModel.create(userData);
    return this.toUser(user.toObject());
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = await UserModel.findByIdAndUpdate(id, updates, { new: true }).lean();
    return user ? this.toUser(user) : undefined;
  }

  // Chat operations
  async createChat(userId: string, title: string, description?: string): Promise<IChat> {
    const chat = await ChatModel.create({
      userId,
      title,
      description,
      isArchived: false,
      tags: [],
      metadata: {},
    });
    return this.toChat(chat.toObject());
  }

  async getChat(id: string): Promise<IChat | undefined> {
    const chat = await ChatModel.findById(id).lean();
    return chat ? this.toChat(chat) : undefined;
  }

  async getUserChats(userId: string, limit = 50): Promise<IChat[]> {
    console.log(`Storage: getUserChats called for userId: ${userId}, limit: ${limit}`);
    
    const chats = await ChatModel.find({ userId, isArchived: false })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
      
    console.log(`Storage: Found ${chats.length} chats in database for user ${userId}`);
    console.log(`Storage: Chat userIds: ${chats.map(c => c.userId).join(', ')}`);
    
    return chats.map(chat => this.toChat(chat));
  }

  async updateChat(id: string, updates: Partial<IChat>): Promise<IChat | undefined> {
    const chat = await ChatModel.findByIdAndUpdate(id, updates, { new: true }).lean();
    return chat ? this.toChat(chat) : undefined;
  }

  async deleteChat(id: string): Promise<boolean> {
    const result = await ChatModel.findByIdAndDelete(id);
    return !!result;
  }

  async archiveChat(id: string): Promise<boolean> {
    const result = await ChatModel.findByIdAndUpdate(id, { isArchived: true });
    return !!result;
  }

  // Chat message operations
  async createChatMessage(chatId: string, userId: string, role: string, content: string, metadata?: any): Promise<IChatMessage> {
    const message = await ChatMessageModel.create({
      chatId,
      userId,
      role,
      content,
      contentType: 'text',
      metadata: metadata || {},
    });
    return this.toChatMessage(message.toObject());
  }

  async getChatMessages(chatId: string, limit = 100): Promise<IChatMessage[]> {
    const messages = await ChatMessageModel.find({ chatId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
    return messages.map(message => this.toChatMessage(message));
  }

  async deleteChatMessage(id: string): Promise<boolean> {
    const result = await ChatMessageModel.findByIdAndDelete(id);
    return !!result;
  }

  // User behavior tracking
  async trackUserBehavior(userId: string, action: string, entityType?: string, entityId?: string, context?: any): Promise<IUserBehavior> {
    const behavior = await UserBehaviorModel.create({
      userId,
      action,
      entityType,
      entityId,
      context: context || {},
      timestamp: new Date(),
    });
    return this.toUserBehavior(behavior.toObject());
  }

  async getUserBehavior(userId: string, limit = 100, action?: string): Promise<IUserBehavior[]> {
    const filter: any = { userId };
    if (action) filter.action = action;
    
    const behaviors = await UserBehaviorModel.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    return behaviors.map(behavior => this.toUserBehavior(behavior));
  }

  // Newsletter operations
  async createNewsletter(userId: string, title: string, content: string, topics?: string[]): Promise<INewsletter> {
    const newsletter = await NewsletterModel.create({
      userId,
      title,
      content,
      contentHtml: '',
      topics: topics || [],
      status: 'draft',
      generationMetadata: {},
    });
    return this.toNewsletter(newsletter.toObject());
  }

  async getUserNewsletters(userId: string, limit = 20): Promise<INewsletter[]> {
    const newsletters = await NewsletterModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return newsletters.map(newsletter => this.toNewsletter(newsletter));
  }

  async markNewsletterSent(id: string): Promise<boolean> {
    const result = await NewsletterModel.findByIdAndUpdate(id, {
      status: 'sent',
      sentAt: new Date(),
    });
    return !!result;
  }

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

  // User wishes operations
  async createUserWish(userId: string, eventData: Partial<IUserWish>): Promise<IUserWish> {
    const userWish = new UserWishModel({
      userId,
      ...eventData,
    });
    const saved = await userWish.save();
    return this.toUserWish(saved);
  }

  async getUserWishes(userId: string, status?: string): Promise<IUserWish[]> {
    const filter: any = { userId };
    if (status) {
      filter.status = status;
    }
    const wishes = await UserWishModel.find(filter).sort({ createdAt: -1 });
    return wishes.map(wish => this.toUserWish(wish));
  }

  async updateUserWish(id: string, updates: Partial<IUserWish>): Promise<IUserWish | undefined> {
    const updated = await UserWishModel.findByIdAndUpdate(id, updates, { new: true });
    return updated ? this.toUserWish(updated) : undefined;
  }

  async deleteUserWish(id: string): Promise<boolean> {
    const result = await UserWishModel.findByIdAndDelete(id);
    return !!result;
  }

  async getUserWishById(id: string): Promise<IUserWish | undefined> {
    const wish = await UserWishModel.findById(id);
    return wish ? this.toUserWish(wish) : undefined;
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
    const user: User = { 
      id,
      username: insertUser.username,
      email: null,
      password: insertUser.password,
      firstName: null,
      lastName: null,
      avatar: null,
      timezone: null,
      preferences: null,
      interests: null,
      newsletterEnabled: null,
      lastActivityAt: null,
      createdAt: new Date(),
      updatedAt: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  // Chat operations (in-memory stubs for development)
  async createChat(userId: string, title: string, description?: string): Promise<IChat> {
    throw new Error('Chat operations not implemented in MemStorage');
  }

  async getChat(id: string): Promise<IChat | undefined> {
    throw new Error('Chat operations not implemented in MemStorage');
  }

  async getUserChats(userId: string, limit?: number): Promise<IChat[]> {
    return [];
  }

  async updateChat(id: string, updates: Partial<IChat>): Promise<IChat | undefined> {
    throw new Error('Chat operations not implemented in MemStorage');
  }

  async deleteChat(id: string): Promise<boolean> {
    return false;
  }

  async archiveChat(id: string): Promise<boolean> {
    return false;
  }

  // Chat message operations (in-memory stubs for development)
  async createChatMessage(chatId: string, userId: string, role: string, content: string, metadata?: any): Promise<IChatMessage> {
    throw new Error('Chat message operations not implemented in MemStorage');
  }

  async getChatMessages(chatId: string, limit?: number): Promise<IChatMessage[]> {
    return [];
  }

  async deleteChatMessage(id: string): Promise<boolean> {
    return false;
  }

  // User behavior tracking (in-memory stubs for development)
  async trackUserBehavior(userId: string, action: string, entityType?: string, entityId?: string, context?: any): Promise<IUserBehavior> {
    throw new Error('User behavior tracking not implemented in MemStorage');
  }

  async getUserBehavior(userId: string, limit?: number, action?: string): Promise<IUserBehavior[]> {
    return [];
  }

  // Newsletter operations (in-memory stubs for development)
  async createNewsletter(userId: string, title: string, content: string, topics?: string[]): Promise<INewsletter> {
    throw new Error('Newsletter operations not implemented in MemStorage');
  }

  async getUserNewsletters(userId: string, limit?: number): Promise<INewsletter[]> {
    return [];
  }

  async markNewsletterSent(id: string): Promise<boolean> {
    return false;
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

  // User wishes operations (in-memory implementation)
  private userWishes: Map<string, IUserWish> = new Map();

  async createUserWish(userId: string, eventData: Partial<IUserWish>): Promise<IUserWish> {
    const id = randomUUID();
    const userWish: IUserWish = {
      _id: id,
      userId,
      eventTitle: eventData.eventTitle || '',
      eventDescription: eventData.eventDescription,
      eventDate: eventData.eventDate,
      eventTime: eventData.eventTime,
      eventLocation: eventData.eventLocation,
      eventUrl: eventData.eventUrl,
      source: eventData.source,
      category: eventData.category,
      tags: eventData.tags || [],
      notes: eventData.notes,
      priority: eventData.priority || 'medium',
      isReminded: eventData.isReminded || false,
      status: eventData.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userWishes.set(id, userWish);
    return userWish;
  }

  async getUserWishes(userId: string, status?: string): Promise<IUserWish[]> {
    const allWishes = Array.from(this.userWishes.values()).filter(wish => wish.userId === userId);
    if (status) {
      return allWishes.filter(wish => wish.status === status);
    }
    return allWishes.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updateUserWish(id: string, updates: Partial<IUserWish>): Promise<IUserWish | undefined> {
    const existing = this.userWishes.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.userWishes.set(id, updated);
    return updated;
  }

  async deleteUserWish(id: string): Promise<boolean> {
    return this.userWishes.delete(id);
  }

  async getUserWishById(id: string): Promise<IUserWish | undefined> {
    return this.userWishes.get(id);
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