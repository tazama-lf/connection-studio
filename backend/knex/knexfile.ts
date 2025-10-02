import type { Knex } from 'knex';
import path from 'path';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: process.env.USE_SQLITE === 'true' ? 'sqlite3' : 'pg',
    connection:
      process.env.USE_SQLITE === 'true'
        ? {
            filename: path.join(__dirname, '..', 'dev.db'),
          }
        : {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASS || 'newpassword',
            database: process.env.DB_NAME || 'postgres',
            port: parseInt(process.env.DB_PORT || '5432', 10),
          },
    pool: {
      min: 0,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 10000,
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts', // Changed from 'js' to 'ts'
      loadExtensions: ['.ts'], // Add this to load TypeScript files
    },
    useNullAsDefault: process.env.USE_SQLITE === 'true', // Required for SQLite
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
      port: parseInt(process.env.DB_PORT || '5432', 10),
    },
    pool: {
      min: 2,
      max: 30, // production pool, safe for Postgres defaults
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 60000, // hold idle connections longer in prod
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
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
