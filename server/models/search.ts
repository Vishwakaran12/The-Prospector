import mongoose, { Schema, Document } from 'mongoose';

export interface ISearchResult {
  title: string;
  description: string;
  url: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface ISearch extends Document {
  query: string;
  results: ISearchResult[];
  createdAt: Date;
}

const SearchResultSchema = new Schema<ISearchResult>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String },
  metadata: { type: Schema.Types.Mixed },
});

const SearchSchema = new Schema<ISearch>({
  query: { type: String, required: true },
  results: { type: [SearchResultSchema], required: true },
  createdAt: { type: Date, default: Date.now },
});

export const SearchModel = mongoose.model<ISearch>('Search', SearchSchema);
