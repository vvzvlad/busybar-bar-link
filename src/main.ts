import { generateXpm2 } from "@busy-app/busy-lib";
import { formatHM } from "@shared/datetime";
import { createScreen, type Element } from "./screen";
import { loadValues } from "./settings";
import manifest from "./appmeta/manifest.json";

/** The name the app draws under; the device clears elements by this id. */
const APP = manifest.id;

/** A message's picture: the colors of its letters, and its frames, all of one size; frame(0) is the still picture. */
interface Picture {
  palette: Record<string, string>;
  frame: (step: number) => string[];
}

/** An empty grid, w by h. */
function blank(w: number, h: number): string[] {
  const rows: string[] = [];
  for (let i = 0; i < h; i++) rows.push(".".repeat(w));
  return rows;
}

/** `grid` with `part` drawn over it, the part's top left at x, y; "." in the part lets the grid show through. */
function overlay(grid: string[], part: string[], x: number, y: number): string[] {
  const out = grid.slice();
  part.forEach((row, i) => {
    const line = out[y + i];
    if (line === undefined) return;
    let cells = "";
    for (let j = 0; j < line.length; j++) {
      const cell = row[j - x];
      cells += cell !== undefined && cell !== "." ? cell : line[j];
    }
    out[y + i] = cells;
  });
  return out;
}

/** The grid leaning sideways by `by` px at its top row and less on the rows under it, its bottom row in place, with `pad` px of room on each side. */
function lean(grid: string[], by: number, pad: number): string[] {
  const room = ".".repeat(pad);
  return grid.map((row, i) => {
    const shift = Math.round((by * (grid.length - 1 - i)) / (grid.length - 1));
    const wide = room + row + room;
    return shift >= 0 ? ".".repeat(shift) + wide.slice(0, wide.length - shift) : wide.slice(-shift) + ".".repeat(-shift);
  });
}

/** A heart that beats: big, small, big, then small for a while. r red, d its shade, h the shine. */
const HEART_BIG = [
  "..rrrr...rrrr..",
  ".rhhrrr.rrrrrr.",
  "rhrrrrrrrrrrrrr",
  "rhrrrrrrrrrrrrr",
  "rrrrrrrrrrrrrrd",
  "rrrrrrrrrrrrrrd",
  ".rrrrrrrrrrrrd.",
  "..rrrrrrrrrrd..",
  "...rrrrrrrrd...",
  "....rrrrrrd....",
  ".....rrrrd.....",
  "......rrd......",
  ".......d.......",
];
const HEART_SMALL = overlay(
  blank(15, 13),
  [
    "..rrr...rrr..",
    ".rhhrr.rrrrr.",
    ".rhrrrrrrrrr.",
    ".rrrrrrrrrrd.",
    ".rrrrrrrrrrd.",
    "..rrrrrrrrd..",
    "...rrrrrrd...",
    "....rrrrd....",
    ".....rrd.....",
    "......d......",
  ],
  1,
  2,
);
const HEART: Picture = {
  palette: { ".": "none", r: "#FF2050", d: "#B0102E", h: "#FFC0D0" },
  frame: (step) => (step % 5 === 0 || step % 5 === 2 ? HEART_BIG : HEART_SMALL),
};

/** Lips blowing a little heart, which floats up from them and starts again. d the line between the lips, p the heart. */
const LIPS = [
  "..rrr...rrr..",
  ".rrhrr.rrhrr.",
  "rrrrrrrrrrrrr",
  "ddddddddddddd",
  "rrrrrrrrrrrrr",
  ".rrrhhhhrrrr.",
  "..rrrrrrrrr..",
  "....rrrrr....",
];
const LITTLE_HEART = [".p.p.", "ppppp", ".ppp.", "..p.."];
const KISS: Picture = {
  palette: { ".": "none", r: "#FF2050", d: "#900020", h: "#FF90A8", p: "#FF60A0" },
  frame: (step) => {
    const lips = overlay(blank(17, 15), LIPS, 0, 7);
    const s = step % 4;
    return s === 3 ? lips : overlay(lips, LITTLE_HEART, s === 0 ? 11 : 12, 4 - 2 * s);
  },
};

/** A ringing phone: the handset shakes and the rays around it flash. w the rays. */
const HANDSET = [
  ".gg..........",
  "gggg.........",
  "ggggg........",
  "gggg.........",
  ".ggg.........",
  ".gg..........",
  ".ggg.........",
  "..ggg........",
  "...ggg....g..",
  "....ggg.gggg.",
  ".....gggggggg",
  "......ggggggg",
  ".........ggg.",
];
const RAYS = [".w....", ".w..w.", "...w..", "......", "....ww"];
const PHONE: Picture = {
  palette: { ".": "none", g: "#30D050", w: "#FFFFFF" },
  frame: (step) => {
    const phone = overlay(blank(14, 14), HANDSET, step % 2, 1);
    return step % 4 < 2 ? overlay(phone, RAYS, 8, 0) : phone;
  },
};

/** A house with smoke rising from its chimney. r the roof, R the eaves, w the walls, d the door, y the lit window, c the chimney, s the smoke. */
const HOUSE = [
  ".......r...cc..",
  "......rrr..cc..",
  ".....rrrrr.cc..",
  "....rrrrrrrcc..",
  "...rrrrrrrrrr..",
  "..rrrrrrrrrrrr.",
  ".RRRRRRRRRRRRRR",
  "..wwwwwwwwwww..",
  "..wyywwwwddww..",
  "..wyywwwwddww..",
  "..wwwwwwwddww..",
  "..wwwwwwwddww..",
];
/** Puffs of smoke over the chimney, clear of its top, a row higher in every other frame. */
const SMOKE = [
  ["ss.", "...", "ss."],
  ["...", ".ss", "..."],
];
const HOME: Picture = {
  palette: { ".": "none", r: "#E04020", R: "#A02810", w: "#F0E0C0", d: "#8A5020", y: "#FFD030", c: "#808080", s: "#C0C0C0" },
  frame: (step) => overlay(overlay(blank(15, 16), HOUSE, 0, 4), SMOKE[step % 2], 11, 0),
};

/** A sad face with a tear running down from its eye. k the brows, eyes and mouth, b the tear. */
const FACE = [
  "....yyyyy....",
  "..yyyyyyyyy..",
  ".yyyyyyyyyyy.",
  ".yyykyyykyyy.",
  "yykyyyyyyykyy",
  "yyyyyyyyyyyyy",
  "yyykkyyykkyyy",
  "yyykkyyykkyyy",
  "yyyyyyyyyyyyy",
  "yyyyykkkyyyyy",
  ".yyykyyykyyy.",
  ".yyyyyyyyyyy.",
  "..yyyyyyyyy..",
  "....yyyyy....",
];
const SAD: Picture = {
  palette: { ".": "none", y: "#FFC820", k: "#402800", b: "#40B0FF" },
  frame: (step) => (step % 5 === 4 ? FACE : overlay(FACE, ["b", "b"], 9, 8 + (step % 5))),
};

/** A hand waving: it leans left and right from the wrist. */
const HAND = [
  ".....yy......",
  ".....yy.yy...",
  "..yy.yy.yy...",
  "..yy.yy.yy.yy",
  "..yy.yy.yy.yy",
  "..yy.yy.yy.yy",
  "y.yy.yy.yy.yy",
  "yyyyyyyyyyyyy",
  "yyyyyyyyyyyyy",
  ".yyyyyyyyyyyy",
  "..yyyyyyyyyy.",
  "...yyyyyyyyy.",
  "....yyyyyyy..",
  ".....yyyyy...",
];
const WAVE: Picture = {
  palette: { ".": "none", y: "#FFC830" },
  frame: (step) => lean(HAND, [0, -2, 0, 2][step % 4], 2),
};

/** The messages the wheel steps through, with their pictures. */
const MESSAGES: { word: string; picture: Picture }[] = [
  { word: "HEART", picture: HEART },
  { word: "KISS", picture: KISS },
  { word: "CALL ME", picture: PHONE },
  { word: "HOME", picture: HOME },
  { word: "MISS YOU", picture: SAD },
  { word: "WAVE", picture: WAVE },
];

/** The ntfy.sh topic of a pair is this prefix and their secret word. */
const TOPIC_URL = "https://ntfy.sh/busybar-";
const POLL_MS = 10 * 1000;
/** How long a message from the other bar stays on the front display, its picture moving on a frame every FRAME_MS. */
const SHOW_MS = 10 * 1000;
const FRAME_MS = 250;
/** The space between a picture and the text beside it. */
const PICTURE_GAP = 3;
/**
 * Advances of the small font for " " to "~", a base-36 digit each, as busy-lib's glyph map has them: its textWidth()
 * would bundle the maps of every font the app names, about 16 KiB of heap.
 */
const SMALL_ADVANCES = "22464552334423234344444444234444555555555245465555554546444333444444443442342644443434464444245";

/** The width of text in the small font; a character the table lacks counts as 4 px. */
function smallWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    const advance = SMALL_ADVANCES[ch.charCodeAt(0) - 32];
    width += advance === undefined ? 4 : parseInt(advance, 36);
  }
  return width;
}
/** Ids of this bar's own posts kept to tell them apart from the other bar's. */
const OWN_IDS = 20;
/** The localStorage key of this bar's own post ids. */
const OWN_KEY = "own_ids";

const WHITE = "#FFFFFFFF";
const GRAY = "#A0A0A0FF";
const PINK = "#FF4080FF";

type Received = { msg: string; from: string; time: number };

/** One line of ntfy's JSON stream. */
type NtfyEvent = { id?: string; event?: string; time?: number; message?: string };

/** A line of text across the middle of the front display. */
function single(text: string): Element[] {
  return [{ id: "main", type: "text", text, font: "bold", color: WHITE, x: 36, y: 8, align: "center" }];
}

/**
 * A frame of a picture with one or two lines of small text beside it, together in the middle of the front display.
 * Two lines keep "from" and an eight-letter name beside the widest picture.
 */
function card(picture: Picture, step: number, lines: string[], color: string): Element[] {
  const grid = picture.frame(step);
  const width = grid[0].length;
  const x = Math.max(0, Math.floor((72 - width - PICTURE_GAP - Math.max(...lines.map(smallWidth))) / 2));
  const top = lines.length === 1 ? 4 : 0;
  return [
    { id: "pic", type: "xpmbitmap", data: generateXpm2({ palette: picture.palette, grid }), x, y: (16 - grid.length) >> 1, align: "top_left" },
    ...lines.map((text, i): Element => ({
      id: `label${i}`,
      type: "text",
      text,
      font: "small",
      color,
      x: x + width + PICTURE_GAP,
      y: top + i * 7,
      align: "top_left",
    })),
  ];
}

/** The picture of a message from the other bar; none for a message this version does not know. */
function pictureOf(msg: string): Picture | undefined {
  return MESSAGES.find((m) => m.word === msg)?.picture;
}

/** A message from the other bar without a picture: what it says and who sent it. */
function incoming(r: Received): Element[] {
  return [
    { id: "msg", type: "text", text: r.msg, font: "bold", color: PINK, x: 36, y: -1, align: "top_mid" },
    { id: "from", type: "text", text: `from ${r.from}`, font: "small", color: GRAY, x: 36, y: 8, align: "top_mid" },
  ];
}

/** The back display, without the status bar's 12 px on the right: who sent the last message and when. */
function back(last: Received | null): Element {
  const text = last ? `From ${last.from} ${formatHM(new Date(last.time * 1000))}` : "From --";
  return { id: "last", type: "text", text, font: "normal", color: WHITE, x: 74, y: 40, align: "center", display: "back" };
}

/**
 * Entry point, called at the end of the file: the device runs this script from top to bottom and starts nothing by itself.
 */
function main(): void {
  const report = (err: unknown) => console.error(`${APP}: ${err instanceof Error ? err.message : String(err)}`);
  const screen = createScreen(APP, report);

  let word: string | null = null;
  let name = "ME";
  let pick = 0;
  /** ntfy's `since`: the last message id seen, or the last 10 minutes before the first poll. */
  let since = "10m";
  /** Ids ntfy gave this bar's own posts, kept across launches: the first poll looks 10 minutes back. */
  let own: string[] = [];
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(OWN_KEY) ?? "[]");
    if (Array.isArray(saved)) own = saved as string[];
  } catch (err) {
    report(err);
  }
  /** The message on the front display now, and the last one received, for the back display. */
  let showing: Received | null = null;
  let last: Received | null = null;
  /**
   * One request at a time: a poll that starts while a post is unanswered could return the post before its id is
   * known, and show this bar's own message as the other's. A Start meanwhile waits for the poll to end.
   */
  let busy = false;
  let queued: string | null = null;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  /** Moves the picture of the message shown on a frame; runs only while a message with a picture is shown. */
  let frameTimer: ReturnType<typeof setInterval> | undefined;
  let step = 0;
  let stopped = false;

  function draw(): void {
    if (stopped || word === null) return;
    if (word === "") {
      screen.draw(single("SET WORD"));
    } else if (showing) {
      const picture = pictureOf(showing.msg);
      screen.draw([...(picture ? card(picture, step, ["from", showing.from], GRAY) : incoming(showing)), back(last)]);
    } else {
      screen.draw([...card(MESSAGES[pick].picture, 0, [MESSAGES[pick].word], WHITE), back(last)]);
    }
  }

  function stopFrames(): void {
    if (frameTimer !== undefined) clearInterval(frameTimer);
    frameTimer = undefined;
  }

  function show(r: Received): void {
    showing = r;
    last = r;
    step = 0;
    if (showTimer !== undefined) clearTimeout(showTimer);
    stopFrames();
    if (pictureOf(r.msg)) {
      frameTimer = setInterval(() => {
        step += 1;
        draw();
      }, FRAME_MS);
    }
    showTimer = setTimeout(() => {
      showTimer = undefined;
      stopFrames();
      showing = null;
      draw();
    }, SHOW_MS);
    draw();
  }

  /** Reads ntfy's answer to a poll: every message moves `since` on; the newest one not posted here is shown. */
  function received(text: string): void {
    if (stopped) return;
    let newest: Received | null = null;
    for (const line of text.split("\n")) {
      if (line === "") continue;
      try {
        const event = JSON.parse(line) as NtfyEvent;
        if (event.event !== "message" || typeof event.id !== "string") continue;
        since = event.id;
        if (own.includes(event.id)) continue;
        const body = JSON.parse(event.message ?? "") as { from?: unknown; msg?: unknown };
        newest = { msg: String(body.msg), from: String(body.from), time: event.time ?? Math.floor(Date.now() / 1000) };
      } catch (err) {
        report(err);
      }
    }
    if (newest) show(newest);
  }

  /** Runs one request; a Start that waited for it is sent after it. */
  function request(work: Promise<void>): void {
    busy = true;
    void work.catch(report).then(() => {
      busy = false;
      // A message queued before Back is still sent: the post keeps the app alive until it ends.
      if (queued !== null) {
        const msg = queued;
        queued = null;
        send(msg);
      }
    });
  }

  function poll(): void {
    if (busy || stopped) return;
    request(
      fetch(`${TOPIC_URL}${word}/json?poll=1&since=${since}`)
        .then((res) => res.text())
        .then(received),
    );
  }

  function send(msg: string): void {
    if (busy) {
      queued = msg;
      return;
    }
    request(
      fetch(`${TOPIC_URL}${word}`, { method: "POST", body: JSON.stringify({ from: name, msg }) })
        .then((res) => res.json())
        .then((posted: { id?: unknown }) => {
          if (typeof posted.id !== "string") return;
          own.push(posted.id);
          if (own.length > OWN_IDS) own.shift();
          localStorage.setItem(OWN_KEY, JSON.stringify(own));
        }),
    );
  }

  // The listener keeps the app alive; a long Back is handled by the firmware and quits it.
  const unbind = listen("input", (event) => {
    if (stopped) return;
    if (event.key === "encoder") {
      if (!word) return;
      pick = (pick + event.delta + MESSAGES.length) % MESSAGES.length;
      draw();
    } else if (event.action !== "short") {
      return;
    } else if (event.key === "back") {
      quit();
    } else if (event.key === "start" && word) {
      send(MESSAGES[pick].word);
    }
  });

  /** Back leaves the app: with the timers cleared and the handler detached, nothing keeps it alive. */
  function quit(): void {
    stopped = true;
    if (pollTimer !== undefined) clearInterval(pollTimer);
    if (showTimer !== undefined) clearTimeout(showTimer);
    stopFrames();
    // Not detached from inside the handler itself: the unbind would stop the app while this handler still runs.
    setTimeout(unbind, 0);
  }

  void loadValues()
    .then((values) => {
      word = typeof values?.word === "string" ? values.word : "";
      if (typeof values?.name === "string") name = values.name;
      draw();
      if (word === "" || stopped) return;
      poll();
      pollTimer = setInterval(poll, POLL_MS);
    })
    .catch(report);
}

main();
