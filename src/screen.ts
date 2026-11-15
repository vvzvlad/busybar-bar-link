import { device } from "@shared/device";

/** One display element in the firmware's own shape (POST /api/display/draw), addressed by its id. */
export type Element = Record<string, unknown> & { id: string };

/** A picture with nothing in it: what an xpmbitmap is turned into to hide it. */
const NOTHING = ["! XPM2", "1 1 1 1", ". c none", "."].join("\n");

/**
 * The element made invisible, keeping its id and type: the firmware refuses to change the type under an id. Text
 * becomes fully transparent, pictures empty.
 */
function hidden(e: Element): Element {
  return e.type === "xpmbitmap" ? { ...e, data: NOTHING } : { ...e, color: "#00000000" };
}

/**
 * Draws frames by sending only the elements that changed since the last frame and clearing the ones that are gone.
 * One request is in flight at a time; a frame asked for meanwhile replaces the one waiting.
 */
export function createScreen(app: string, report: (err: unknown) => void) {
  /** What is on the displays now: element id → its description as sent; null when unknown. */
  let shown: Map<string, string> | null = new Map();
  /** Set by forget(): a frame in flight meanwhile does not make the screen known again. */
  let forgotten = false;
  let busy = false;
  let next: Element[] | null = null;
  /** The colour the waiting frame blinks the status LED with; a newer frame that replaces it keeps the blink. */
  let nextLed: string | undefined;

  async function send(elements: Element[], led: string | undefined): Promise<void> {
    const before = shown;
    // Until the request is answered the screen is unknown: a failed one leaves it so, and the next frame starts over.
    shown = null;
    forgotten = false;
    if (before) {
      const present = new Set(elements.map((e) => e.id));
      const gone = [...before.keys()].filter((id) => !present.has(id));
      const changed = elements.filter((e) => before.get(e.id) !== JSON.stringify(e));
      // Drawn before the old ones are cleared: clearing all of them first would close the app's screen for a moment.
      // The old ones are hidden in the same request, so that the new frame never shows over the remains of the last.
      const sent = [...changed, ...gone.map((id) => hidden(JSON.parse(before.get(id) as string) as Element))];
      // busy-lib's element types are stricter than the firmware about optional fields; these follow the firmware.
      // The blink rides on a draw request, so a frame that blinks with nothing changed is sent whole.
      if (sent.length > 0 || led) {
        const body = sent.length > 0 ? sent : elements;
        await device.DisplayDraw({ application_name: app, priority: 50, led_notification_color: led, elements: body } as never);
      }
      if (gone.length > 0) await device.DisplayClear({ application_name: app, element_ids: gone });
    } else {
      await device.DisplayClear({ application_name: app });
      if (elements.length > 0) await device.DisplayDraw({ application_name: app, priority: 50, led_notification_color: led, elements } as never);
    }
    if (!forgotten) shown = new Map(elements.map((e): [string, string] => [e.id, JSON.stringify(e)]));
  }

  return {
    /**
     * Shows exactly these elements; with `led` ("#RRGGBBAA") the status LED blinks that colour. Errors are reported,
     * not thrown.
     */
    draw(elements: Element[], led?: string): void {
      next = elements;
      if (led) nextLed = led;
      if (busy) return;
      busy = true;
      void (async () => {
        while (next) {
          const frame = next;
          const blink = nextLed;
          next = null;
          nextLed = undefined;
          await send(frame, blink).catch(report);
        }
        busy = false;
      })();
    },
    /** Forgets what is on the screen: the next frame clears it and is sent whole. */
    forget(): void {
      shown = null;
      forgotten = true;
    },
  };
}
