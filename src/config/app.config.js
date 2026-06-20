module.exports = {
  server: {
    port: process.env.PORT || 3005,
    env: process.env.NODE_ENV || 'development'
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0
  },

  session: {
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  todo: {
    prefix: 'todo:',
    listKey: 'todos:list',
    expiryDays: 7 * 24 * 60 * 60 // 7 days
  }
};
