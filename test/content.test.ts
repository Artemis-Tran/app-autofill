// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("content autofill flow", () => {
  let onMessageListener: ((msg: any) => void) | undefined;
  const sendMessage = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    onMessageListener = undefined;
    sendMessage.mockReset();

    document.body.innerHTML = `
      <form>
        <input id="first-name" aria-label="First name" />
      </form>
    `;

    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return document.body;
      }
    });

    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: {
        runtime: {
          onMessage: {
            addListener: vi.fn((listener: (msg: any) => void) => {
              onMessageListener = listener;
            })
          },
          sendMessage
        }
      }
    });

    Object.defineProperty(globalThis, "CSS", {
      configurable: true,
      value: {
        escape: (value: string) => value
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fills again after undo clears scripted changes", async () => {
    await import("../src/content");

    const firstName = document.getElementById("first-name") as HTMLInputElement;
    const profile = { basics: { firstName: "Taylor" } };

    onMessageListener?.({ type: "FILL_EXECUTE", payload: { profile } });
    await vi.advanceTimersByTimeAsync(200);

    expect(firstName.value).toBe("Taylor");
    expect(firstName.dataset.autofilled).toBe("1");
    expect(firstName.dataset.userEdited).not.toBe("1");

    onMessageListener?.({ type: "FILL_UNDO" });

    expect(firstName.value).toBe("");
    expect(firstName.dataset.autofilled).toBe("");
    expect(firstName.dataset.userEdited).toBe("");

    onMessageListener?.({ type: "FILL_EXECUTE", payload: { profile } });
    await vi.advanceTimersByTimeAsync(200);

    expect(firstName.value).toBe("Taylor");
    expect(sendMessage).toHaveBeenCalledWith({ type: "FILL_DONE", count: 1 });
  });
});
