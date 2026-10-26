import { db } from "./db";
import { scores, users, type InsertScore, type Score, type User } from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";

export interface ScoreLocation {
  countryCode: string;
  regionCode: string;
  cityName: string;
}

export interface IStorage {
  getTopScores(location?: { scope: string; countryCode?: string; regionCode?: string; cityName?: string }, limit?: number): Promise<Score[]>;
  createScore(score: InsertScore, user?: User): Promise<Score>;
  createPasswordUser(username: string, passwordHash: string): Promise<User>;
  getPasswordUser(username: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUserLocation(userId: string, location: ScoreLocation, countryName: string, regionName: string): Promise<User>;
  saveUserProgression(userId: string, progression: Record<string, unknown>): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getTopScores(
    location?: { scope: string; countryCode?: string; regionCode?: string; cityName?: string },
    limit = 100
  ): Promise<Score[]> {
    const conditions = [];
    if (location?.scope === "national" && location.countryCode) {
      conditions.push(eq(scores.countryCode, location.countryCode));
    } else if (location?.scope === "regional" && location.countryCode && location.regionCode) {
      conditions.push(eq(scores.countryCode, location.countryCode), eq(scores.regionCode, location.regionCode));
    } else if (location?.scope === "city" && location.countryCode && location.regionCode && location.cityName) {
      conditions.push(
        eq(scores.countryCode, location.countryCode),
        eq(scores.regionCode, location.regionCode),
        eq(scores.cityName, location.cityName)
      );
    }
    const query = db.select().from(scores).orderBy(desc(scores.score)).limit(limit);
    return conditions.length ? query.where(and(...conditions)) : query;
  }

  async createScore(insertScore: InsertScore, user?: User): Promise<Score> {
    const [score] = await db.insert(scores).values({
      ...insertScore,
      playerName: user?.displayName ?? insertScore.playerName,
      userId: user?.id ?? null,
      countryCode: user?.countryCode ?? null,
      regionCode: user?.regionCode ?? null,
      cityName: user?.cityName ?? null
    }).returning();
    return score;
  }

  async createPasswordUser(username: string, passwordHash: string): Promise<User> {
    const [user] = await db.insert(users).values({
      provider: "password",
      providerUserId: username,
      passwordHash,
      displayName: username,
      progression: {},
      updatedAt: new Date()
    }).returning();
    return user;
  }

  async getPasswordUser(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(and(eq(users.provider, "password"), eq(users.providerUserId, username)))
      .limit(1);
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async updateUserLocation(
    userId: string,
    location: ScoreLocation,
    countryName: string,
    regionName: string
  ): Promise<User> {
    const [user] = await db.update(users).set({
      ...location,
      countryName,
      regionName,
      updatedAt: new Date()
    }).where(eq(users.id, userId)).returning();
    if (!user) throw new Error("Authenticated user was not found while updating location.");
    return user;
  }

  async saveUserProgression(userId: string, progression: Record<string, unknown>): Promise<User> {
    const [user] = await db.update(users).set({
      progression,
      updatedAt: new Date()
    }).where(eq(users.id, userId)).returning();
    if (!user) throw new Error("Authenticated user was not found while saving progression.");
    return user;
  }
}

export const storage = new DatabaseStorage();
