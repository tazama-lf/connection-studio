import type { Knex } from 'knex';
import path from 'path';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '5432'),
    },
    pool: {
      min: 4, // minimum idle connections
      max: 20, // maximum connections
      acquireTimeoutMillis: 30000, // 30 seconds
      idleTimeoutMillis: 30000, // 30 seconds
      reapIntervalMillis: 1000, // 1 second
      createRetryIntervalMillis: 200,
      propagateCreateError: false,
    },
    acquireConnectionTimeout: 30000,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'js',
    },
    // Enable logging for connection pool debugging
    log: {
      warn(message: string) {
        console.warn('Knex Warning:', message);
      },
      error(message: string) {
        console.error('Knex Error:', message);
      },
      deprecate(message: string) {
        console.log('Knex Deprecation:', message);
      },
      debug(message: string) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Knex Debug:', message);
        }
      },
    },
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '5432'),
    },
    pool: {
      min: 2, // minimum idle connections for production
      max: 30, // maximum connections for production
      acquireTimeoutMillis: 30000, // 30 seconds
      idleTimeoutMillis: 60000, // 60 seconds for production
      reapIntervalMillis: 1000, // 1 second
      createRetryIntervalMillis: 200,
      propagateCreateError: false,
    },
    acquireConnectionTimeout: 30000,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'js',
    },
    // Enable error logging for production
    log: {
      warn(message: string) {
        console.warn('Knex Warning:', message);
      },
      error(message: string) {
        console.error('Knex Error:', message);
      },
    },
  },
};

module.exports = config;
