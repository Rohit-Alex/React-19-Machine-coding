export type CategoryId = string;

/** One row of the banner, as the Configuration Service describes it. */
export interface CategoryConfig {
  id: CategoryId; // "analytics"
  label: string;
  description: string;
  required?: boolean; // "necessary": always on, the user can't turn it off
  cookies?: string[]; // cookie names to delete when this category is denied
}

/** What the Configuration Service returns. Owned by the legal/privacy team, not by this code. */
export interface ConsentConfig {
  version: number; // bump it and every user is asked again
  expiryDays: number; // ask again after this long, even with no changes
  categories: CategoryConfig[];
}

export type FetchConfig = (signal: AbortSignal) => Promise<ConsentConfig>;

/** Where the user's decision is kept. A first-party cookie in production, so the server can read it too. */
export interface ConsentStorage {
  read(): string | null;
  write(value: string, maxAgeSeconds: number): void;
}

/** What is saved: the decision, plus which config it was made against and when. */
export interface ConsentRecord {
  version: number;
  decidedAt: number;
  choices: Record<CategoryId, boolean>;
}

export interface ConsentState {
  status: "idle" | "loading" | "ready" | "error";
  config: ConsentConfig | null;
  /** The choices in force right now. A category missing or `false` means denied. */
  choices: Record<CategoryId, boolean>;
  /** True → show the banner. */
  needsDecision: boolean;
  error: string | null;
}

/** A script that may only run with consent: analytics, marketing pixel, ad tracker. */
export interface Consumer {
  name: string;
  categories: CategoryId[]; // needs ALL of these
  onGrant(): void; // start: load the script, set its cookies
  onRevoke?(): void; // stop: unload, stop sending events
}

interface Deps {
  fetchConfig: FetchConfig;
  storage: ConsentStorage;
  now?: () => number;
  timeoutMs?: number;
}

const DAY = 24 * 60 * 60 * 1000;

/*
 * The SDK core: no React, no DOM rendering. One instance per page, shared by
 * the banner UI and every consumer script. Denied is the default — nothing
 * runs until the config has loaded AND the user has said yes.
 */
export class ConsentManager {
  private state: ConsentState = { status: "idle", config: null, choices: {}, needsDecision: false, error: null };
  private readonly listeners = new Set<() => void>();
  /** Each consumer → whether it was granted the last time we told it. Lets us call it only on a change. */
  private readonly consumers = new Map<Consumer, boolean>();
  private loading: Promise<void> | null = null;
  private readonly deps: Deps;
  private readonly now: () => number;
  private readonly timeoutMs: number;

  constructor(deps: Deps) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
    this.timeoutMs = deps.timeoutMs ?? 5000;
  }

  /** Safe to call from every script on the page: only the first call fetches. */
  init(): Promise<void> {
    this.loading ??= this.load();
    return this.loading;
  }

  private async load() {
    this.set({ status: "loading", error: null });
    try {
      const config = parseConfig(await this.deps.fetchConfig(AbortSignal.timeout(this.timeoutMs)));
      const record = readRecord(this.deps.storage.read());
      const current = record !== null && isCurrent(record, config, this.now());
      this.set({
        status: "ready",
        config,
        needsDecision: !current,
        // An outdated decision isn't honoured: deny until the user decides again.
        choices: resolve(config, current ? record.choices : {}),
      });
    } catch (error) {
      // Fail closed: no config means no categories, so nothing optional runs.
      this.loading = null; // a later init() may retry
      this.set({ status: "error", choices: {}, needsDecision: false, error: String(error) });
    }
  }

  /** Save the user's choices. Required categories are forced on; anything not passed is off. */
  save(input: Record<CategoryId, boolean>) {
    const { config } = this.state;
    if (!config) return; // Nothing to decide on until the config is here.
    const choices = resolve(config, input);
    const record: ConsentRecord = { version: config.version, decidedAt: this.now(), choices };
    this.deps.storage.write(JSON.stringify(record), (config.expiryDays * DAY) / 1000);
    this.set({ choices, needsDecision: false });
  }

  acceptAll() {
    const categories = this.state.config?.categories ?? [];
    this.save(Object.fromEntries(categories.map((c) => [c.id, true])));
  }

  rejectAll() {
    this.save({});
  }

  /** Synchronous check for one-off calls: `if (consent.has("marketing")) firePixel()`. */
  has(category: CategoryId) {
    return this.state.choices[category] === true;
  }

  /**
   * Register a dependent service. It's told right away if it's already
   * granted (late scripts don't miss the event), then again on every change
   * of ITS answer — not on every save.
   */
  register(consumer: Consumer) {
    this.consumers.set(consumer, false);
    this.syncConsumer(consumer);
    return () => {
      this.consumers.delete(consumer);
    };
  }

  private syncConsumer(consumer: Consumer) {
    const granted = consumer.categories.every((id) => this.state.choices[id] === true);
    if (granted === this.consumers.get(consumer)) return;
    this.consumers.set(consumer, granted); // Set first, so a consumer that calls save() inside its callback can't loop.
    try {
      if (granted) consumer.onGrant();
      else consumer.onRevoke?.();
    } catch (error) {
      // One broken vendor script must not stop the others being told.
      console.error(`[consent] consumer "${consumer.name}" threw`, error);
    }
  }

  private set(patch: Partial<ConsentState>) {
    this.state = { ...this.state, ...patch }; // New object each time: React compares snapshots by reference.
    // A denied category's cookies never survive — even ones set before a decision expired.
    for (const category of this.state.config?.categories ?? []) {
      if (!this.has(category.id)) category.cookies?.forEach(deleteCookie);
    }
    this.consumers.forEach((_, consumer) => this.syncConsumer(consumer));
    this.listeners.forEach((listener) => listener());
  }

  // --- external-store plumbing for React (and anything else) ---
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.state;
}

/** Required → on. Everything else → only an explicit `true`. Unknown ids in the input are dropped. */
function resolve(config: ConsentConfig, input: Record<CategoryId, boolean>) {
  return Object.fromEntries(config.categories.map((c) => [c.id, c.required === true || input[c.id] === true]));
}

/** A saved decision counts only if it was made on this config version, isn't expired, and covers every category. */
function isCurrent(record: ConsentRecord, config: ConsentConfig, now: number) {
  return (
    record.version === config.version &&
    now - record.decidedAt < config.expiryDays * DAY &&
    config.categories.every((c) => c.required || typeof record.choices[c.id] === "boolean")
  );
}

/** Storage is user-editable: anything that isn't a well-formed record is treated as "no decision". */
function readRecord(raw: string | null): ConsentRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value?.version !== "number" || typeof value.decidedAt !== "number") return null;
    if (typeof value.choices !== "object" || value.choices === null) return null;
    return value;
  } catch {
    return null;
  }
}

/** The config comes over the network: check its shape before trusting it. */
function parseConfig(config: ConsentConfig): ConsentConfig {
  if (typeof config?.version !== "number" || !Array.isArray(config.categories)) {
    throw new Error("Invalid consent config");
  }
  return config;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; max-age=0; path=/`;
}

/** Production storage: a first-party cookie the server can read before rendering any tags. */
export const cookieStorage = (name = "cc_consent"): ConsentStorage => ({
  read: () => {
    const pair = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
    return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
  },
  write: (value, maxAgeSeconds) => {
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${Math.round(maxAgeSeconds)}; path=/; SameSite=Lax; Secure`;
  },
});
