import { device } from "@shared/device";

/** One display element in the firmware's own shape (POST /api/display/draw), addressed by its id. */
export type Element = Record<string, unknown> & { id: string };

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

  async function send(elements: Element[]): Promise<void> {
    const before = shown;
    // Until the request is answered the screen is unknown: a failed one leaves it so, and the next frame starts over.
    shown = null;
    forgotten = false;
    if (before) {
      const present = new Set(elements.map((e) => e.id));
      const gone = [...before.keys()].filter((id) => !present.has(id));
      const changed = elements.filter((e) => before.get(e.id) !== JSON.stringify(e));
      if (gone.length > 0) await device.DisplayClear({ application_name: app, element_ids: gone });
      // busy-lib's element types are stricter than the firmware about optional fields; these follow the firmware.
      if (changed.length > 0) await device.DisplayDraw({ application_name: app, priority: 50, elements: changed } as never);
    } else {
      await device.DisplayClear({ application_name: app });
      if (elements.length > 0) await device.DisplayDraw({ application_name: app, priority: 50, elements } as never);
    }
    if (!forgotten) shown = new Map(elements.map((e): [string, string] => [e.id, JSON.stringify(e)]));
  }

  return {
    /** Shows exactly these elements. Errors are reported, not thrown. */
    draw(elements: Element[]): void {
      next = elements;
      if (busy) return;
      busy = true;
      void (async () => {
        while (next) {
          const frame = next;
          next = null;
          await send(frame).catch(report);
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
