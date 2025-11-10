// SPDX-License-Identifier: Apache-2.0
/**
 * Mock implementation of ioredis for Jest testing
 * Prevents actual Redis connections during unit tests
 */

class RedisMock {
  constructor() {
    this.data = new Map();
    this.subscribers = new Map();
    this.pubsubChannels = new Map();
  }

  // Basic key-value operations
  async get(key) {
    return this.data.get(key) || null;
  }

  async set(key, value, ...args) {
    this.data.set(key, value);
    return 'OK';
  }

  async del(key) {
    return this.data.delete(key) ? 1 : 0;
  }

  async exists(key) {
    return this.data.has(key) ? 1 : 0;
  }

  async expire(key, seconds) {
    return 1;
  }

  async ttl(key) {
    return -1;
  }

  async keys(pattern) {
    return Array.from(this.data.keys());
  }

  async flushdb() {
    this.data.clear();
    return 'OK';
  }

  // Hash operations
  async hget(key, field) {
    const hash = this.data.get(key);
    return hash ? hash[field] : null;
  }

  async hset(key, field, value) {
    let hash = this.data.get(key);
    if (!hash) {
      hash = {};
      this.data.set(key, hash);
    }
    hash[field] = value;
    return 1;
  }

  async hgetall(key) {
    return this.data.get(key) || {};
  }

  async hdel(key, field) {
    const hash = this.data.get(key);
    if (hash && hash[field]) {
      delete hash[field];
      return 1;
    }
    return 0;
  }

  // List operations
  async lpush(key, value) {
    let list = this.data.get(key);
    if (!Array.isArray(list)) {
      list = [];
      this.data.set(key, list);
    }
    list.unshift(value);
    return list.length;
  }

  async rpush(key, value) {
    let list = this.data.get(key);
    if (!Array.isArray(list)) {
      list = [];
      this.data.set(key, list);
    }
    list.push(value);
    return list.length;
  }

  async lrange(key, start, stop) {
    const list = this.data.get(key);
    if (!Array.isArray(list)) return [];
    return list.slice(start, stop === -1 ? undefined : stop + 1);
  }

  // Pub/Sub operations
  async publish(channel, message) {
    const subscribers = this.pubsubChannels.get(channel) || [];
    subscribers.forEach(callback => callback(channel, message));
    return subscribers.length;
  }

  async subscribe(channel, callback) {
    if (!this.pubsubChannels.has(channel)) {
      this.pubsubChannels.set(channel, []);
    }
    this.pubsubChannels.get(channel).push(callback);
    return 'OK';
  }

  async unsubscribe(channel) {
    this.pubsubChannels.delete(channel);
    return 'OK';
  }

  // Connection management
  async connect() {
    return Promise.resolve();
  }

  async disconnect() {
    return Promise.resolve();
  }

  async quit() {
    this.data.clear();
    this.pubsubChannels.clear();
    return 'OK';
  }

  on(event, callback) {
    return this;
  }

  once(event, callback) {
    return this;
  }

  off(event, callback) {
    return this;
  }

  // Pipeline support
  pipeline() {
    const commands = [];
    const mock = this;
    
    return {
      get(key) {
        commands.push(['get', key]);
        return this;
      },
      set(key, value, ...args) {
        commands.push(['set', key, value, ...args]);
        return this;
      },
      del(key) {
        commands.push(['del', key]);
        return this;
      },
      async exec() {
        return commands.map(([cmd, ...args]) => {
          return [null, mock[cmd](...args)];
        });
      }
    };
  }

  // Multi/transaction support
  multi() {
    return this.pipeline();
  }

  // Duplicate (for creating new connections)
  duplicate() {
    return new RedisMock();
  }

  // Status
  get status() {
    return 'ready';
  }
}

// Export as both default and named export to match ioredis patterns
module.exports = RedisMock;
module.exports.default = RedisMock;
module.exports.Redis = RedisMock;
