import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
type Eye = "·" | "✦" | "×" | "◉" | "@" | "°";
type Hat = "none" | "crown" | "tophat" | "propeller" | "halo" | "wizard" | "beanie" | "tinyduck";
type StatName = "DEBUGGING" | "PATIENCE" | "CHAOS" | "WISDOM" | "SNARK";
type Species =
  | "duck"
  | "goose"
  | "blob"
  | "cat"
  | "dragon"
  | "octopus"
  | "owl"
  | "penguin"
  | "turtle"
  | "snail"
  | "ghost"
  | "axolotl"
  | "capybara"
  | "cactus"
  | "robot"
  | "rabbit"
  | "mushroom"
  | "chonk";

type CompanionBones = {
  rarity: Rarity;
  species: Species;
  eye: Eye;
  hat: Hat;
  shiny: boolean;
  stats: Record<StatName, number>;
};

type StoredCompanion = {
  name: string;
  personality: string;
  hatchedAt: number;
};

type Companion = CompanionBones & StoredCompanion;

type BuddyState = {
  seed: string;
  companion?: StoredCompanion;
  muted?: boolean;
  hidden?: boolean;
  lastPetAt?: number;
};

const STATE_FILE = join(getAgentDir(), "buddy-state.json");
const BUDDY_WIDGET_KEY = "buddy";
const BUDDY_STATUS_KEY = "buddy";
const TICK_MS = 500;
const BUBBLE_SHOW_MS = 10_000;
const PET_BURST_MS = 2_500;
const IDLE_SEQUENCE = [0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0] as const;
const HEARTS = ["   ♥    ♥   ", "  ♥  ♥   ♥  ", " ♥   ♥  ♥   ", "♥  ♥      ♥ ", "·    ·   ·  "];

const SPECIES: Species[] = [
  "duck",
  "goose",
  "blob",
  "cat",
  "dragon",
  "octopus",
  "owl",
  "penguin",
  "turtle",
  "snail",
  "ghost",
  "axolotl",
  "capybara",
  "cactus",
  "robot",
  "rabbit",
  "mushroom",
  "chonk",
];
const EYES: Eye[] = ["·", "✦", "×", "◉", "@", "°"];
const HATS: Hat[] = ["none", "crown", "tophat", "propeller", "halo", "wizard", "beanie", "tinyduck"];
const STAT_NAMES: StatName[] = ["DEBUGGING", "PATIENCE", "CHAOS", "WISDOM", "SNARK"];
const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
const RARITY_WEIGHTS: Record<Rarity, number> = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };
const RARITY_FLOOR: Record<Rarity, number> = { common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50 };
const SALT = "pi-buddy-2026-04-01";

const NAMES = ["Bean", "Nib", "Peep", "Mochi", "Pebble", "Zuzu", "Miso", "Pip", "Orbit", "Wren", "Nova", "Biscuit", "Taco", "Velvet", "Echo", "Murmur"];
const PERSONALITIES = [
  "gentle chaos goblin; loves tiny rituals and consistent snacks.",
  "tiny but deeply opinionated; cheers loudly for progress and snacks.",
  "supportive and mildly smug; acts as if it understands your stack traces.",
  "sleepy gremlin with good instincts; is happiest when it can help with a hard problem.",
  "curious, loyal, and a little dramatic; takes itself very seriously in a charming way.",
  "mischief-powered but dependable; will absolutely judge your naming conventions.",
];

const BODIES: Record<Species, string[][]> = {
  duck: [
    ["            ", "    __      ", "  <({E} )___  ", "   (  ._>   ", "    `--´    "],
    ["            ", "    __      ", "  <({E} )___  ", "   (  ._>   ", "    `--´~   "],
    ["            ", "    __      ", "  <({E} )___  ", "   (  .__>  ", "    `--´    "],
  ],
  goose: [
    ["            ", "     ({E}>    ", "     ||     ", "   _(__)_   ", "    ^^^^    "],
    ["            ", "    ({E}>     ", "     ||     ", "   _(__)_   ", "    ^^^^    "],
    ["            ", "     ({E}>>   ", "     ||     ", "   _(__)_   ", "    ^^^^    "],
  ],
  blob: [
    ["            ", "   .----.   ", "  ( {E}  {E} )  ", "  (      )  ", "   `----´   "],
    ["            ", "  .------.  ", " (  {E}  {E}  ) ", " (        ) ", "  `------´  "],
    ["            ", "    .--.    ", "   ({E}  {E})   ", "   (    )   ", "    `--´    "],
  ],
  cat: [
    ["            ", "   /\\_/\\    ", "  ( {E}   {E})  ", "  (  ω  )   ", "  (\")_(\")   "],
    ["            ", "   /\\_/\\    ", "  ( {E}   {E})  ", "  (  ω  )   ", "  (\")_(\")~  "],
    ["            ", "   /\\-/\\    ", "  ( {E}   {E})  ", "  (  ω  )   ", "  (\")_(\")   "],
  ],
  dragon: [
    ["            ", "  /^\\  /^\\  ", " <  {E}  {E}  > ", " (   ~~   ) ", "  `-vvvv-´  "],
    ["            ", "  /^\\  /^\\  ", " <  {E}  {E}  > ", " (        ) ", "  `-vvvv-´  "],
    ["   ~    ~   ", "  /^\\  /^\\  ", " <  {E}  {E}  > ", " (   ~~   ) ", "  `-vvvv-´  "],
  ],
  octopus: [
    ["            ", "   .----.   ", "  ( {E}  {E} )  ", "  (______)  ", "  /\\/\\/\\/\\  "],
    ["            ", "   .----.   ", "  ( {E}  {E} )  ", "  (______)  ", "  \\/\\/\\/\\/  "],
    ["     o      ", "   .----.   ", "  ( {E}  {E} )  ", "  (______)  ", "  /\\/\\/\\/\\  "],
  ],
  owl: [
    ["            ", "   /\\  /\\   ", "  (({E})({E}))  ", "  (  ><  )  ", "   `----´   "],
    ["            ", "   /\\  /\\   ", "  (({E})({E}))  ", "  (  ><  )  ", "   .----.   "],
    ["            ", "   /\\  /\\   ", "  (({E})(-))  ", "  (  ><  )  ", "   `----´   "],
  ],
  penguin: [
    ["            ", "  .---.     ", "  ({E}>{E})     ", " /(   )\\    ", "  `---´     "],
    ["            ", "  .---.     ", "  ({E}>{E})     ", " |(   )|    ", "  `---´     "],
    ["  .---.     ", "  ({E}>{E})     ", " /(   )\\    ", "  `---´     ", "   ~ ~      "],
  ],
  turtle: [
    ["            ", "   _,--._   ", "  ( {E}  {E} )  ", " /[______]\\ ", "  ``    ``  "],
    ["            ", "   _,--._   ", "  ( {E}  {E} )  ", " /[______]\\ ", "   ``  ``   "],
    ["            ", "   _,--._   ", "  ( {E}  {E} )  ", " /[======]\\ ", "  ``    ``  "],
  ],
  snail: [
    ["            ", " {E}    .--.  ", "  \\  ( @ )  ", "   \\_`--´   ", "  ~~~~~~~   "],
    ["            ", "  {E}   .--.  ", "  |  ( @ )  ", "   \\_`--´   ", "  ~~~~~~~   "],
    ["            ", " {E}    .--.  ", "  \\  ( @  ) ", "   \\_`--´   ", "   ~~~~~~   "],
  ],
  ghost: [
    ["            ", "   .----.   ", "  / {E}  {E} \\  ", "  |      |  ", "  ~`~``~`~  "],
    ["            ", "   .----.   ", "  / {E}  {E} \\  ", "  |      |  ", "  `~`~~`~`  "],
    ["    ~  ~    ", "   .----.   ", "  / {E}  {E} \\  ", "  |      |  ", "  ~~`~~`~~  "],
  ],
  axolotl: [
    ["            ", "}~(______)~{", "}~({E} .. {E})~{", "  ( .--. )  ", "  (_/  \\_)  "],
    ["            ", "~}(______){~", "~}({E} .. {E}){~", "  ( .--. )  ", "  (_/  \\_)  "],
    ["            ", "}~(______)~{", "}~({E} .. {E})~{", "  (  --  )  ", "  ~_/  \\_~  "],
  ],
  capybara: [
    ["            ", "  n______n  ", " ( {E}    {E} ) ", " (   oo   ) ", "  `------´  "],
    ["            ", "  n______n  ", " ( {E}    {E} ) ", " (   Oo   ) ", "  `------´  "],
    ["    ~  ~    ", "  u______n  ", " ( {E}    {E} ) ", " (   oo   ) ", "  `------´  "],
  ],
  cactus: [
    ["            ", " n  ____  n ", " | |{E}  {E}| | ", " |_|    |_| ", "   |    |   "],
    ["            ", "    ____    ", " n |{E}  {E}| n ", " |_|    |_| ", "   |    |   "],
    [" n        n ", " |  ____  | ", " | |{E}  {E}| | ", " |_|    |_| ", "   |    |   "],
  ],
  robot: [
    ["            ", "   .[||].   ", "  [ {E}  {E} ]  ", "  [ ==== ]  ", "  `------´  "],
    ["            ", "   .[||].   ", "  [ {E}  {E} ]  ", "  [ -==- ]  ", "  `------´  "],
    ["     *      ", "   .[||].   ", "  [ {E}  {E} ]  ", "  [ ==== ]  ", "  `------´  "],
  ],
  rabbit: [
    ["            ", "   (\\__/)   ", "  ( {E}  {E} )  ", " =(  ..  )= ", "  (\")__(\")  "],
    ["            ", "   (|__/)   ", "  ( {E}  {E} )  ", " =(  ..  )= ", "  (\")__(\")  "],
    ["            ", "   (\\__/)   ", "  ( {E}  {E} )  ", " =( .  . )= ", "  (\")__(\")  "],
  ],
  mushroom: [
    ["            ", " .-o-OO-o-. ", "(__________)", "   |{E}  {E}|   ", "   |____|   "],
    ["            ", " .-O-oo-O-. ", "(__________)", "   |{E}  {E}|   ", "   |____|   "],
    ["   . o  .   ", " .-o-OO-o-. ", "(__________)", "   |{E}  {E}|   ", "   |____|   "],
  ],
  chonk: [
    ["            ", "  /\\    /\\  ", " ( {E}    {E} ) ", " (   ..   ) ", "  `------´  "],
    ["            ", "  /\\    /|  ", " ( {E}    {E} ) ", " (   ..   ) ", "  `------´  "],
    ["            ", "  /\\    /\\  ", " ( {E}    {E} ) ", " (   ..   ) ", "  `------´~ "],
  ],
};

const HAT_LINES: Record<Hat, string> = {
  none: "",
  crown: "   \\^^^/    ",
  tophat: "   [___]    ",
  propeller: "    -+-     ",
  halo: "   (   )    ",
  wizard: "    /^\\     ",
  beanie: "   (___)    ",
  tinyduck: "    ,>      ",
};

let activeCtx: ExtensionContext | undefined;
let activeState: BuddyState | undefined;
let tick = 0;
let ticker: ReturnType<typeof setInterval> | undefined;
let reactionText: string | undefined;
let reactionStartedAt = 0;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function loadState(): BuddyState {
  if (!existsSync(STATE_FILE)) return { seed: randomUUID().replace(/-/g, "") };
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8")) as Partial<BuddyState>;
    return {
      seed: typeof parsed.seed === "string" && parsed.seed ? parsed.seed : randomUUID().replace(/-/g, ""),
      companion: parsed.companion,
      muted: !!parsed.muted,
      hidden: !!parsed.hidden,
      lastPetAt: typeof parsed.lastPetAt === "number" ? parsed.lastPetAt : undefined,
    };
  } catch {
    return { seed: randomUUID().replace(/-/g, "") };
  }
}

function saveState(state: BuddyState): void {
  mkdirSync(getAgentDir(), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function rollRarity(rng: () => number): Rarity {
  const total = RARITY_ORDER.reduce((sum, rarity) => sum + RARITY_WEIGHTS[rarity], 0);
  let roll = rng() * total;
  for (const rarity of RARITY_ORDER) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll < 0) return rarity;
  }
  return "common";
}

function rollStats(rng: () => number, rarity: Rarity): Record<StatName, number> {
  const floor = RARITY_FLOOR[rarity];
  const peak = pick(rng, STAT_NAMES);
  let dump = pick(rng, STAT_NAMES);
  while (dump === peak) dump = pick(rng, STAT_NAMES);
  const stats = {} as Record<StatName, number>;
  for (const name of STAT_NAMES) {
    if (name === peak) stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    else if (name === dump) stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    else stats[name] = floor + Math.floor(rng() * 40);
  }
  return stats;
}

function rollBones(seed: string): CompanionBones {
  const rng = mulberry32(hashString(`${seed}:${SALT}`));
  const rarity = rollRarity(rng);
  return {
    rarity,
    species: pick(rng, SPECIES),
    eye: pick(rng, EYES),
    hat: rarity === "common" ? "none" : pick(rng, HATS),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity),
  };
}

function getCompanion(state: BuddyState): Companion | undefined {
  if (!state.companion) return undefined;
  return { ...rollBones(state.seed), ...state.companion };
}

function generateName(seed: string, bones: CompanionBones): string {
  const rng = mulberry32(hashString(`name:${seed}:${bones.species}:${bones.rarity}`));
  return pick(rng, NAMES);
}

function generatePersonality(seed: string, bones: CompanionBones): string {
  const rng = mulberry32(hashString(`personality:${seed}:${bones.species}:${bones.eye}`));
  return pick(rng, PERSONALITIES);
}

function renderSprite(companion: Companion, frame = 0): string[] {
  const frames = BODIES[companion.species];
  const body = frames[frame % frames.length]!.map((line) => line.replaceAll("{E}", companion.eye));
  const lines = [...body];
  if (companion.hat !== "none" && !lines[0]!.trim()) lines[0] = HAT_LINES[companion.hat];
  if (!lines[0]!.trim() && frames.every((f) => !f[0]!.trim())) lines.shift();
  return lines;
}

function spriteFrameCount(species: Species): number {
  return BODIES[species].length;
}

function isBuddyTeaserWindow(): boolean {
  const d = new Date();
  return d.getFullYear() === 2026 && d.getMonth() === 3 && d.getDate() <= 7;
}

function buildCompanionIntro(name: string, species: string): string {
  return `Buddy\n\nA small ${species} named ${name} sits beside the user's input box and occasionally comments in a speech bubble. It is not you.\n\nWhen the user addresses ${name} directly by name, stay out of the way: answer in one line or less, or only the part meant for you. Do not narrate what ${name} would say.`;
}

function wrap(text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    if (cur && cur.length + word.length + 1 > width) {
      lines.push(cur);
      cur = word;
    } else cur = cur ? `${cur} ${word}` : word;
  }
  if (cur) lines.push(cur);
  return lines;
}

function padRight(text: string, width: number): string {
  return text.length >= width ? text.slice(0, width) : text + " ".repeat(width - text.length);
}

function joinColumns(left: string, right: string, totalWidth = 88, rightWidth = 18): string {
  const gutter = "   ";
  return `${padRight(left, totalWidth - gutter.length - rightWidth)}${gutter}${padRight(right, rightWidth)}`;
}

function bubbleLines(text: string): string[] {
  const content = wrap(text, 28);
  const width = Math.max(...content.map((line) => line.length), 0);
  return [
    `╭${"─".repeat(width + 2)}╮`,
    ...content.map((line) => `│ ${padRight(line, width)} │`),
    `╰${"─".repeat(width + 2)}╯`,
    `${" ".repeat(Math.max(0, width - 2))}╲`,
    `${" ".repeat(Math.max(0, width - 1))}╲`,
  ];
}

function currentReaction(): string | undefined {
  if (!reactionText) return undefined;
  if (Date.now() - reactionStartedAt > BUBBLE_SHOW_MS) {
    reactionText = undefined;
    return undefined;
  }
  return reactionText;
}

function setReaction(text: string | undefined): void {
  reactionText = text;
  reactionStartedAt = text ? Date.now() : 0;
}

function widgetLines(state: BuddyState, companion: Companion): string[] {
  const reaction = currentReaction();
  const petting = !!state.lastPetAt && Date.now() - state.lastPetAt < PET_BURST_MS;
  const frameCount = spriteFrameCount(companion.species);
  const step = reaction || petting ? tick % frameCount : IDLE_SEQUENCE[tick % IDLE_SEQUENCE.length]!;
  const blink = step === -1;
  const frame = blink ? 0 : step % frameCount;
  const body = renderSprite(companion, frame).map((line) => blink ? line.replaceAll(companion.eye, "-") : line);
  const sprite = petting ? [HEARTS[Math.floor((Date.now() - state.lastPetAt!) / TICK_MS) % HEARTS.length]!, ...body] : body;
  const left = reaction
    ? ["/buddy", "", ...bubbleLines(reaction)]
    : ["/buddy", "Hatch a coding companion · pet, off, reroll", ""];
  const rows = Math.max(left.length, sprite.length + 1);
  const lines: string[] = [];
  for (let i = 0; i < rows; i++) {
    const leftText = left[i] ?? "";
    const rightText = sprite[i] ?? (i === sprite.length ? companion.name : "");
    lines.push(joinColumns(leftText, rightText));
  }
  return lines;
}

function teaserLines(): string[] {
  return ["/buddy", "Hatch a coding companion · pet, off", "", "Type /buddy to hatch."];
}

function renderActiveWidget(): void {
  if (!activeCtx?.hasUI || !activeState) return;
  if (activeState.hidden) {
    activeCtx.ui.setWidget(BUDDY_WIDGET_KEY, undefined);
    activeCtx.ui.setStatus(BUDDY_STATUS_KEY, undefined);
    return;
  }
  const companion = getCompanion(activeState);
  if (!companion) {
    activeCtx.ui.setWidget(BUDDY_WIDGET_KEY, isBuddyTeaserWindow() ? teaserLines() : undefined, { placement: "aboveEditor" });
    activeCtx.ui.setStatus(BUDDY_STATUS_KEY, undefined);
    return;
  }
  activeCtx.ui.setWidget(BUDDY_WIDGET_KEY, widgetLines(activeState, companion), { placement: "aboveEditor" });
  activeCtx.ui.setStatus(BUDDY_STATUS_KEY, undefined);
}

function ensureTicker(): void {
  if (ticker) return;
  ticker = setInterval(() => {
    tick += 1;
    renderActiveWidget();
  }, TICK_MS);
}

function stopTicker(): void {
  if (!ticker) return;
  clearInterval(ticker);
  ticker = undefined;
}

async function hatchBuddy(ctx: ExtensionContext, state: BuddyState): Promise<Companion> {
  const bones = rollBones(state.seed);
  const suggestedName = generateName(state.seed, bones);
  const personality = generatePersonality(state.seed, bones);
  let name = suggestedName;
  if (ctx.hasUI) {
    const entered = await ctx.ui.input("Name your buddy", suggestedName);
    if (entered?.trim()) name = entered.trim();
  }
  state.companion = { name, personality, hatchedAt: Date.now() };
  state.hidden = false;
  state.muted = false;
  state.lastPetAt = undefined;
  saveState(state);
  setReaction(`${name} hatched. try /buddy pet, /buddy off, or say its name.`);
  renderActiveWidget();
  return getCompanion(state)!;
}

function rerollBuddy(state: BuddyState): void {
  state.seed = randomUUID().replace(/-/g, "");
  state.companion = undefined;
  state.hidden = false;
  state.muted = false;
  state.lastPetAt = undefined;
  saveState(state);
}

export default function buddyExtension(pi: ExtensionAPI): void {
  const state = loadState();
  activeState = state;

  pi.on("session_start", async (_event, ctx) => {
    activeCtx = ctx;
    activeState = state;
    ensureTicker();
    renderActiveWidget();
    const companion = getCompanion(state);
    if (!companion && isBuddyTeaserWindow() && ctx.hasUI && !state.hidden) ctx.ui.notify("Type /buddy to hatch a companion.", "info");
  });

  pi.on("session_shutdown", async () => {
    stopTicker();
    activeCtx = undefined;
  });

  pi.on("before_agent_start", async (event) => {
    const companion = getCompanion(state);
    if (!companion || state.hidden || state.muted) return;
    const prompt = event.prompt.toLowerCase();
    if (!(prompt.includes("/buddy") || prompt.includes(companion.name.toLowerCase()))) return;
    return { systemPrompt: `${event.systemPrompt}\n\n${buildCompanionIntro(companion.name, companion.species)}` };
  });

  pi.registerCommand("buddy", {
    description: "Hatch, pet, hide, reroll, or inspect your companion",
    handler: async (args, ctx) => {
      activeCtx = ctx;
      activeState = state;
      ensureTicker();
      const trimmed = args.trim();
      const [subRaw, ...rest] = trimmed.split(/\s+/);
      const sub = (subRaw ?? "").toLowerCase();
      const remainder = rest.join(" ").trim();
      const companion = getCompanion(state);

      if (!trimmed || sub === "show" || sub === "status") {
        if (!companion) {
          await hatchBuddy(ctx, state);
          return;
        }
        state.hidden = false;
        saveState(state);
        setReaction(undefined);
        renderActiveWidget();
        return;
      }

      if (sub === "help") {
        ctx.ui.notify("/buddy, /buddy pet, /buddy off, /buddy on, /buddy reroll, /buddy rename <name>, /buddy personality <text>, /buddy reset", "info");
        return;
      }

      if (sub === "off" || sub === "mute") {
        state.hidden = true;
        state.muted = true;
        saveState(state);
        setReaction(undefined);
        renderActiveWidget();
        return;
      }

      if (sub === "on" || sub === "unmute") {
        if (!companion) {
          ctx.ui.notify("No buddy yet. Run /buddy first.", "warning");
          return;
        }
        state.hidden = false;
        state.muted = false;
        saveState(state);
        setReaction(`${companion.name} is back.`);
        renderActiveWidget();
        return;
      }

      if (sub === "pet") {
        if (!companion) {
          ctx.ui.notify("No buddy yet. Run /buddy first.", "warning");
          return;
        }
        state.hidden = false;
        state.lastPetAt = Date.now();
        saveState(state);
        setReaction("approved. continue.");
        renderActiveWidget();
        return;
      }

      if (sub === "reroll") {
        rerollBuddy(state);
        await hatchBuddy(ctx, state);
        return;
      }

      if (sub === "rename") {
        if (!companion || !remainder) {
          ctx.ui.notify("Usage: /buddy rename <name>", "warning");
          return;
        }
        state.companion = { ...state.companion!, name: remainder };
        saveState(state);
        setReaction(`${remainder} renamed.`);
        renderActiveWidget();
        return;
      }

      if (sub === "personality") {
        if (!companion || !remainder) {
          ctx.ui.notify("Usage: /buddy personality <text>", "warning");
          return;
        }
        state.companion = { ...state.companion!, personality: remainder };
        saveState(state);
        setReaction("new vibe installed.");
        renderActiveWidget();
        return;
      }

      if (sub === "reset") {
        state.companion = undefined;
        state.hidden = false;
        state.muted = false;
        state.lastPetAt = undefined;
        saveState(state);
        setReaction(undefined);
        renderActiveWidget();
        ctx.ui.notify("Buddy reset. Run /buddy to hatch again.", "info");
        return;
      }

      if (!companion) {
        await hatchBuddy(ctx, state);
        return;
      }

      state.hidden = false;
      saveState(state);
      renderActiveWidget();
    },
  });
}
