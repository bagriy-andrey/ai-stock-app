import { Injectable } from "@nestjs/common";

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

@Injectable()
export class InMemoryCacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  async getOrSet<T>(
    key: string,
    ttlMilliseconds: number,
    loadValue: () => Promise<T>,
  ): Promise<T> {
    const cached = this.entries.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    if (cached) {
      this.entries.delete(key);
    }

    const value = await loadValue();
    this.entries.set(key, {
      expiresAt: Date.now() + ttlMilliseconds,
      value,
    });

    return value;
  }
}
