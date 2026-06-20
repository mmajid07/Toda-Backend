const { createClient } = require('redis');

// Redis Client Factory
async function createRedisClient(options = {}) {
  const config = {
    host: options.host || process.env.REDIS_HOST || 'localhost',
    port: options.port || process.env.REDIS_PORT || 6379,
    password: options.password || process.env.REDIS_PASSWORD || undefined,
    ...options
  };

  // Remove undefined password
  if (!config.password) {
    delete config.password;
  }

  try {
    const client = createClient(config);
    
    client.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Redis client connected');
    });

    client.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    client.on('reconnecting', () => {
      console.log('🔄 Redis client reconnecting...');
    });

    return client;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    throw error;
  }
}

// Test Redis connection
async function testRedisConnection(client) {
  try {
    const response = await client.ping();
    console.log('✅ Redis ping response:', response);
    return true;
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    return false;
  }
}

// Get Redis info
async function getRedisInfo(client) {
  try {
    const info = await client.info();
    return info;
  } catch (error) {
    console.error('Failed to get Redis info:', error);
    return null;
  }
}

module.exports = {
  createRedisClient,
  testRedisConnection,
  getRedisInfo
};
