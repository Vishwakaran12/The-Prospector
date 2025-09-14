import mongoose from 'mongoose';

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  avatar: String,
  timezone: { type: String, default: 'UTC' },
  preferences: mongoose.Schema.Types.Mixed,
  interests: mongoose.Schema.Types.Mixed,
  newsletterEnabled: { type: Boolean, default: true },
  lastActivityAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Chat schema
const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  isArchived: { type: Boolean, default: false },
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

// Chat message schema
const chatMessageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true, enum: ['user', 'assistant', 'system'] },
  content: { type: String, required: true },
  contentType: { type: String, default: 'text' },
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
});

// User behavior schema
const userBehaviorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entityType: String,
  entityId: String,
  context: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
});

// Newsletter schema
const newsletterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  contentHtml: String,
  topics: [String],
  sentAt: Date,
  status: { type: String, default: 'draft', enum: ['draft', 'sent', 'failed'] },
  generationMetadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

// Content schema (enhanced)
const contentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  title: String,
  description: String,
  content: String,
  contentType: { type: String, required: true },
  metadata: mongoose.Schema.Types.Mixed,
  scrapedAt: { type: Date, default: Date.now },
  isProcessed: { type: Boolean, default: false },
  geminiAnalysis: mongoose.Schema.Types.Mixed,
});

// Claim schema (enhanced)
const claimSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
  claimType: { type: String, required: true, enum: ['bookmark', 'favorite', 'research', 'todo'] },
  status: { type: String, default: 'active', enum: ['active', 'archived', 'deleted'] },
  notes: String,
  tags: [String],
  priority: { type: String, default: 'medium', enum: ['low', 'medium', 'high'] },
  claimedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// User event wishes schema
const userWishSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventTitle: { type: String, required: true },
  eventDescription: String,
  eventDate: String,
  eventTime: String,
  eventLocation: String,
  eventUrl: String,
  source: String,
  category: String,
  tags: [String],
  notes: String,
  priority: { type: String, default: 'medium', enum: ['low', 'medium', 'high'] },
  isReminded: { type: Boolean, default: false },
  status: { type: String, default: 'active', enum: ['active', 'attended', 'cancelled', 'archived'] },
}, {
  timestamps: true,
});

// Indexes for better performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
chatSchema.index({ userId: 1, createdAt: -1 });
chatMessageSchema.index({ chatId: 1, createdAt: 1 });
userBehaviorSchema.index({ userId: 1, timestamp: -1 });
newsletterSchema.index({ userId: 1, createdAt: -1 });
contentSchema.index({ url: 1 });
claimSchema.index({ userId: 1, claimType: 1 });
claimSchema.index({ contentId: 1 });
userWishSchema.index({ userId: 1, createdAt: -1 });
userWishSchema.index({ userId: 1, status: 1 });

// Models
export const UserModel = mongoose.model('User', userSchema);
export const ChatModel = mongoose.model('Chat', chatSchema);
export const ChatMessageModel = mongoose.model('ChatMessage', chatMessageSchema);
export const UserBehaviorModel = mongoose.model('UserBehavior', userBehaviorSchema);
export const NewsletterModel = mongoose.model('Newsletter', newsletterSchema);
export const ContentModel = mongoose.model('Content', contentSchema);
export const ClaimModel = mongoose.model('Claim', claimSchema);
export const UserWishModel = mongoose.model('UserWish', userWishSchema);

// Type definitions
export interface IUser {
  _id?: string;
  username: string;
  email?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  timezone?: string;
  preferences?: any;
  interests?: any;
  newsletterEnabled?: boolean;
  lastActivityAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IChat {
  _id?: string;
  userId: string;
  title: string;
  description?: string;
  isArchived?: boolean;
  tags?: string[];
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IChatMessage {
  _id?: string;
  chatId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contentType?: string;
  metadata?: any;
  createdAt?: Date;
}

export interface IUserBehavior {
  _id?: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  context?: any;
  timestamp?: Date;
}

export interface INewsletter {
  _id?: string;
  userId: string;
  title: string;
  content: string;
  contentHtml?: string;
  topics?: string[];
  sentAt?: Date;
  status?: 'draft' | 'sent' | 'failed';
  generationMetadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IContent {
  _id?: string;
  url: string;
  title?: string;
  description?: string;
  content?: string;
  contentType: string;
  metadata?: any;
  scrapedAt?: Date;
  isProcessed?: boolean;
  geminiAnalysis?: any;
}

export interface IClaim {
  _id?: string;
  userId: string;
  contentId: string;
  claimType: 'bookmark' | 'favorite' | 'research' | 'todo';
  status?: 'active' | 'archived' | 'deleted';
  notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  claimedAt?: Date;
  updatedAt?: Date;
}

export interface IUserWish {
  _id?: string;
  userId: string;
  eventTitle: string;
  eventDescription?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  eventUrl?: string;
  source?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  isReminded?: boolean;
  status?: 'active' | 'attended' | 'cancelled' | 'archived';
  createdAt?: Date;
  updatedAt?: Date;
}
