import mongoose from 'mongoose';
import dns from 'dns';

// Ensure Windows environments resolve MongoDB Atlas SRV records smoothly
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setting DNS servers is restricted
}

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/narisafe';

  try {
    const conn = await mongoose.connect(mongoUri, {
      dbName: 'narisafe',
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 8000,
    });

    isConnected = true;
    console.log(`[NariSafe DB] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.warn(`[NariSafe DB] Primary MongoDB connection warning: ${err.message}`);
    console.warn('[NariSafe DB] Tip: Ensure local MongoDB service is running (mongod) or provide MONGODB_URI in .env');
    
    // Fallback: If disconnected, keep retrying in background
    setTimeout(() => {
      console.log('[NariSafe DB] Re-attempting MongoDB connection in background...');
      mongoose.connect(mongoUri, { dbName: 'narisafe', serverSelectionTimeoutMS: 5000 })
        .then(() => {
          isConnected = true;
          console.log('[NariSafe DB] MongoDB Connected on retry.');
        })
        .catch(() => {
          // Silent retry without crashing process
        });
    }, 5000);
  }
};

export const getDbStatus = () => {
  return {
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || 'disconnected',
    name: mongoose.connection.name || 'narisafe',
  };
};
