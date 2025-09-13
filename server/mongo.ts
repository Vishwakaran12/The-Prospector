import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.log('MONGODB_URI not defined, MongoDB connection will be skipped');
}

export const connectMongo = async () => {
  if (!mongoUri) {
    throw new Error('MongoDB URI not configured');
  }
  
  try {
    await mongoose.connect(mongoUri, {
      dbName: 'the-prospector',
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err; // Throw the error instead of exiting
  }
};
