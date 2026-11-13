import { formatHM } from "@shared/datetime";
import { createScreen, type Element } from "./screen";
import { loadValues } from "./settings";
import manifest from "./appmeta/manifest.json";

/** The name the app draws under; the device clears elements by this id. */
const APP = manifest.id;

/** The messages the wheel steps through. */
const MESSAGES = ["HEART", "KISS", "CALL ME", "HOME", "MISS YOU", "WAVE"];

/** The ntfy.sh topic of a pair is this prefix and their secret word. */
const TOPIC_URL = "https://ntfy.sh/busybar-";
const POLL_MS = 10 * 1000;
/** How long a message from the other bar stays on the front display. */
const SHOW_MS = 10 * 1000;
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

/** A message from the other bar: what it says and who sent it. */
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
  let stopped = false;

  function draw(): void {
    if (stopped || word === null) return;
    if (word === "") screen.draw(single("SET WORD"));
    else if (showing) screen.draw([...incoming(showing), back(last)]);
    else screen.draw([...single(MESSAGES[pick]), back(last)]);
  }

  function show(r: Received): void {
    showing = r;
    last = r;
    if (showTimer !== undefined) clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      showTimer = undefined;
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
      send(MESSAGES[pick]);
    }
  });

  /** Back leaves the app: with the timers cleared and the handler detached, nothing keeps it alive. */
  function quit(): void {
    stopped = true;
    if (pollTimer !== undefined) clearInterval(pollTimer);
    if (showTimer !== undefined) clearTimeout(showTimer);
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
