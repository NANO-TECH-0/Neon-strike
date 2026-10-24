import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Country, State, City } from "country-state-city";
import { storage } from "./storage";
import type { OAuthProfile, ScoreLocation } from "./storage";
import { pool } from "./db";
import { api } from "@shared/routes";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    oauthState?: string;
    oauthProvider?: "google" | "facebook";
  }
}

const PgSessionStore = connectPgSimple(session);
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

function getAppUrl(req: Express["request"]): string {
  const configured = process.env.APP_URL;
  return (configured || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
}

function providerSettings(provider: "google" | "facebook") {
  const prefix = provider === "google" ? "GOOGLE" : "FACEBOOK";
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function exchangeOAuthCode(
  provider: "google" | "facebook",
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<OAuthProfile> {
  const tokenUrl = provider === "google"
    ? "https://oauth2.googleapis.com/token"
    : "https://graph.facebook.com/v23.0/oauth/access_token";
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });
  if (!tokenResponse.ok) throw new Error(`${provider} token exchange failed (${tokenResponse.status}).`);
  const tokenBody: unknown = await tokenResponse.json();
  if (!isObject(tokenBody) || typeof tokenBody.access_token !== "string") {
    throw new Error(`${provider} returned an invalid access token response.`);
  }

  const userInfoUrl = provider === "google"
    ? "https://openidconnect.googleapis.com/v1/userinfo"
    : "https://graph.facebook.com/me?fields=id,name,email,picture.type(large)";
  const userInfoResponse = await fetch(userInfoUrl, {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` }
  });
  if (!userInfoResponse.ok) throw new Error(`${provider} profile request failed (${userInfoResponse.status}).`);
  const userInfo: unknown = await userInfoResponse.json();
  if (!isObject(userInfo) || typeof userInfo.sub !== "string" && typeof userInfo.id !== "string") {
    throw new Error(`${provider} returned an invalid user profile.`);
  }
  const picture = isObject(userInfo.picture) && typeof userInfo.picture.data === "object" && userInfo.picture.data !== null
    ? (userInfo.picture.data as Record<string, unknown>).url
    : userInfo.picture;
  const providerUserId = provider === "google" ? userInfo.sub : userInfo.id;
  return {
    provider,
    providerUserId: providerUserId as string,
    displayName: typeof userInfo.name === "string" ? userInfo.name.slice(0, 100) : `${provider} player`,
    email: typeof userInfo.email === "string" ? userInfo.email.slice(0, 254) : null,
    avatarUrl: typeof picture === "string" ? picture.slice(0, 2048) : null
  };
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

  app.get("/api/auth/providers", (_req, res) => {
    res.json({
      google: Boolean(providerSettings("google")),
      facebook: Boolean(providerSettings("facebook"))
    });
  });

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
        email: user.email,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        countryCode: user.countryCode,
        countryName: user.countryName,
        regionCode: user.regionCode,
        regionName: user.regionName,
        cityName: user.cityName
      },
      progression: user.progression
    });
  });

  for (const provider of ["google", "facebook"] as const) {
    app.get(`/api/auth/${provider}`, (req, res) => {
      const settings = providerSettings(provider);
      if (!settings) {
        return res.status(503).json({ message: `${provider} sign-in is not configured on this server.` });
      }
      const state = randomBytes(32).toString("hex");
      req.session.oauthState = state;
      req.session.oauthProvider = provider;
      const redirectUri = `${getAppUrl(req)}/api/auth/${provider}/callback`;
      const params = new URLSearchParams({
        client_id: settings.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        state,
        ...(provider === "google"
          ? { scope: "openid email profile", access_type: "online" }
          : { scope: "public_profile email" })
      });
      const authorizeUrl = provider === "google"
        ? `https://accounts.google.com/o/oauth2/v2/auth?${params}`
        : `https://www.facebook.com/v23.0/dialog/oauth?${params}`;
      res.redirect(authorizeUrl);
    });

    app.get(`/api/auth/${provider}/callback`, async (req, res) => {
      const state = typeof req.query.state === "string" ? req.query.state : "";
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const validState = Boolean(state && req.session.oauthState && state === req.session.oauthState &&
        req.session.oauthProvider === provider);
      delete req.session.oauthState;
      delete req.session.oauthProvider;
      if (!validState || !code) {
        return res.redirect(`${getAppUrl(req)}/?authError=invalid_oauth_response`);
      }
      const settings = providerSettings(provider);
      if (!settings) return res.redirect(`${getAppUrl(req)}/?authError=provider_not_configured`);
      try {
        const redirectUri = `${getAppUrl(req)}/api/auth/${provider}/callback`;
        const profile = await exchangeOAuthCode(provider, code, redirectUri, settings.clientId, settings.clientSecret);
        const user = await storage.findOrCreateOAuthUser(profile);
        await new Promise<void>((resolve, reject) => {
          req.session.regenerate(error => error ? reject(error) : resolve());
        });
        req.session.userId = user.id;
        await new Promise<void>((resolve, reject) => {
          req.session.save(error => error ? reject(error) : resolve());
        });
        res.redirect(getAppUrl(req));
      } catch (error) {
        console.error(`${provider} account sign-in failed.`, error);
        res.redirect(`${getAppUrl(req)}/?authError=sign_in_failed`);
      }
    });
  }

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
