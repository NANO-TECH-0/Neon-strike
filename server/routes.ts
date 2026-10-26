import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Country, State, City } from "country-state-city";
import { storage } from "./storage";
import type { ScoreLocation } from "./storage";
import { pool } from "./db";
import { api } from "@shared/routes";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const PgSessionStore = connectPgSimple(session);
const scrypt = promisify(scryptCallback);
const passwordHashBytes = 64;
const authInputSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,24}$/),
  password: z.string().min(8).max(128)
});
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const locationInputSchema = z.object({
  countryCode: z.string().length(2),
  regionCode: z.string().min(1).max(10),
  cityName: z.string().min(1).max(100)
});
const progressionSchema = z.object({
  coins: z.number().int().min(0).max(100_000_000),
  unlockedPlanes: z.array(z.enum(["viper", "manta", "wraith", "inferno"])).max(4),
  selectedPlane: z.enum(["viper", "manta", "wraith", "inferno"]),
  unlockedAttacks: z.array(z.enum(["pulse", "spread", "rapid", "heavy"])).max(4),
  selectedAttack: z.enum(["pulse", "spread", "rapid", "heavy"]),
  unlockedSkills: z.array(z.enum(["laser", "nova", "boost"])).max(3).default([]),
  stats: z.object({
    coin: z.number().int().min(0),
    enemy: z.number().int().min(0),
    portal: z.number().int().min(0),
    score: z.number().int().min(0)
  }),
  claimedMissions: z.array(z.string().max(100)).max(100),
  missionDay: z.string().max(10),
  progressionStartedAt: z.string().max(40)
});

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(password, salt, passwordHashBytes) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("base64url")}`;
}

async function verifyPassword(password: string, storedHash: string | null): Promise<boolean> {
  if (!storedHash) return false;
  const [algorithm, salt, encodedKey] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !encodedKey) return false;
  const expectedKey = Buffer.from(encodedKey, "base64url");
  if (expectedKey.length !== passwordHashBytes) return false;
  const actualKey = await scrypt(password, salt, passwordHashBytes) as Buffer;
  return timingSafeEqual(actualKey, expectedKey);
}

function isRateLimited(req: Express["request"], action: string): boolean {
  const now = Date.now();
  for (const [key, attempt] of Array.from(authAttempts.entries())) {
    if (attempt.resetAt <= now) authAttempts.delete(key);
  }
  const key = `${action}:${req.ip}`;
  const current = authAttempts.get(key);
  if (current && current.resetAt > now && current.count >= 10) return true;
  if (current && current.resetAt > now) {
    current.count += 1;
  } else {
    authAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
  }
  return false;
}

async function establishSession(req: Express["request"], userId: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate(error => error ? reject(error) : resolve());
  });
  req.session.userId = userId;
  await new Promise<void>((resolve, reject) => {
    req.session.save(error => error ? reject(error) : resolve());
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured for production account sessions.");
  }
  app.set("trust proxy", 1);
  app.use(session({
    name: "neon-strike.sid",
    secret: sessionSecret || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    store: new PgSessionStore({ pool, createTableIfMissing: true }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000
    }
  }));

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.json({ user: null });
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => undefined);
      return res.json({ user: null });
    }
    res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        email: null,
        avatarUrl: null,
        provider: "password",
        countryCode: user.countryCode,
        countryName: user.countryName,
        regionCode: user.regionCode,
        regionName: user.regionName,
        cityName: user.cityName
      },
      progression: user.progression
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    if (isRateLimited(req, "register")) {
      return res.status(429).json({ message: "Demasiados intentos. Espera 15 minutos y vuelve a intentarlo." });
    }
    const parsed = authInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Usa un usuario de 3 a 24 letras, números o guiones bajos y una contraseña de 8 a 128 caracteres." });
    }
    const username = parsed.data.username.toLowerCase();
    try {
      const passwordHash = await hashPassword(parsed.data.password);
      const user = await storage.createPasswordUser(username, passwordHash);
      await establishSession(req, user.id);
      return res.status(201).json({ user: { id: user.id, displayName: user.displayName }, progression: user.progression });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        return res.status(409).json({ message: "Ese nombre de usuario ya está ocupado." });
      }
      throw error;
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    if (isRateLimited(req, "login")) {
      return res.status(429).json({ message: "Demasiados intentos. Espera 15 minutos y vuelve a intentarlo." });
    }
    const parsed = authInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Escribe un usuario válido y una contraseña de 8 a 128 caracteres." });
    }
    const user = await storage.getPasswordUser(parsed.data.username.toLowerCase());
    if (!user || !await verifyPassword(parsed.data.password, user.passwordHash)) {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos." });
    }
    await establishSession(req, user.id);
    return res.json({ user: { id: user.id, displayName: user.displayName }, progression: user.progression });
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie("neon-strike.sid", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
      res.status(204).end();
    });
  });

  app.get("/api/locations/countries", (_req, res) => {
    res.json(Country.getAllCountries().map(({ isoCode, name }) => ({ code: isoCode, name })));
  });
  app.get("/api/locations/countries/:countryCode/regions", (req, res) => {
    const countryCode = String(req.params.countryCode).toUpperCase();
    if (!Country.getCountryByCode(countryCode)) return res.status(404).json({ message: "Country not found." });
    res.json(State.getStatesOfCountry(countryCode).map(({ isoCode, name }) => ({ code: isoCode, name })));
  });
  app.get("/api/locations/countries/:countryCode/regions/:regionCode/cities", (req, res) => {
    const countryCode = String(req.params.countryCode).toUpperCase();
    const regionCode = String(req.params.regionCode);
    if (!State.getStateByCodeAndCountry(regionCode, countryCode)) {
      return res.status(404).json({ message: "Region not found." });
    }
    res.json(City.getCitiesOfState(countryCode, regionCode).map(({ name }) => name).sort((a, b) => a.localeCompare(b)));
  });

  app.put("/api/auth/location", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Sign in to save your ranking location." });
    const parsed = locationInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Select a valid country, region, and city." });
    const location: ScoreLocation = parsed.data;
    const country = Country.getCountryByCode(location.countryCode);
    const region = State.getStateByCodeAndCountry(location.regionCode, location.countryCode);
    const city = City.getCitiesOfState(location.countryCode, location.regionCode)
      .find(({ name }) => name === location.cityName);
    if (!country || !region || !city) return res.status(400).json({ message: "The selected location is not in our location list." });
    const user = await storage.updateUserLocation(req.session.userId, location, country.name, region.name);
    res.json({ countryName: user.countryName, regionName: user.regionName, cityName: user.cityName });
  });

  app.put("/api/auth/progression", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Sign in to sync your progression." });
    const parsed = progressionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid game progression payload." });
    const progression = parsed.data;
    if (!progression.unlockedPlanes.includes(progression.selectedPlane) ||
      !progression.unlockedAttacks.includes(progression.selectedAttack)) {
      return res.status(400).json({ message: "Selected plane and attack must be unlocked." });
    }
    await storage.saveUserProgression(req.session.userId, progression);
    res.status(204).end();
  });

  app.get(api.scores.list.path, async (req, res) => {
    try {
      const scope = typeof req.query.scope === "string" ? req.query.scope : "global";
      const countryCode = typeof req.query.countryCode === "string" ? req.query.countryCode.toUpperCase() : undefined;
      const regionCode = typeof req.query.regionCode === "string" ? req.query.regionCode : undefined;
      const cityName = typeof req.query.cityName === "string" ? req.query.cityName : undefined;
      if (!["global", "national", "regional", "city"].includes(scope)) {
        return res.status(400).json({ message: "Invalid leaderboard scope." });
      }
      if (scope === "national" && (!countryCode || !Country.getCountryByCode(countryCode))) {
        return res.status(400).json({ message: "Choose a country for the national ranking." });
      }
      if ((scope === "regional" || scope === "city") &&
        (!countryCode || !regionCode || !State.getStateByCodeAndCountry(regionCode, countryCode))) {
        return res.status(400).json({ message: "Choose a valid region for this ranking." });
      }
      if (scope === "city" && (!cityName || !City.getCitiesOfState(countryCode!, regionCode!).some(({ name }) => name === cityName))) {
        return res.status(400).json({ message: "Choose a valid city for this ranking." });
      }
      const topScores = await storage.getTopScores({ scope, countryCode, regionCode, cityName });
      res.json(topScores);
    } catch (err) {
      console.error("Failed to retrieve leaderboard scores.", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.scores.create.path, async (req, res) => {
    try {
      const input = api.scores.create.input.parse(req.body);
      const user = req.session.userId ? await storage.getUserById(req.session.userId) : undefined;
      const score = await storage.createScore(input, user);
      res.status(201).json(score);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Failed to save leaderboard score.", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
