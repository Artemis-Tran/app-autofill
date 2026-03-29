/**
 * @file This script is injected into web pages to autofill forms.
 * It listens for a message from the popup, then finds and fills form fields
 * based on a user-provided JSON profile. It also watches for DOM changes
 * to handle dynamically loaded forms in single-page applications (SPAs).
 */

import { FIELD_ALIASES } from "./aliases";
import { isScriptedChangeInProgress, runWithScriptedChange } from "./editTracking";
import { getProfileValue } from "./profileLookup";
import { findBestSelectOption } from "./selectMatcher";

type AnyObj = Record<string, any>;

/**
 * Normalizes a string by converting it to lowercase, replacing multiple
 * whitespace characters with a single space, and trimming leading/trailing whitespace.
 * @param s The string to normalize.
 * @returns The normalized string.
 */
const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

function isFormEl(n: any): n is HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement {
  return n instanceof HTMLInputElement || n instanceof HTMLSelectElement || n instanceof HTMLTextAreaElement;
}

document.addEventListener("input", (e) => {
  const t = e.target as any;
  if (isScriptedChangeInProgress()) return;
  if (isFormEl(t)) { t.dataset.userEdited = "1"; t.dataset.autofilled = ""; }
}, true);
document.addEventListener("change", (e) => {
  const t = e.target as any;
  if (isScriptedChangeInProgress()) return;
  if (isFormEl(t)) { t.dataset.userEdited = "1"; t.dataset.autofilled = ""; }
}, true);

/**
 * Finds the text of a label associated with a form element.
 * It checks for text from various sources in a specific order:
 * 1. A <label> element with a `for` attribute matching the element's ID.
 * 2. A parent <label> element.
 * 3. The element's `aria-label` attribute.
 * 4. Elements referenced by the `aria-labelledby` attribute.
 * 5. A <legend> element if the element is within a <fieldset>.
 * @param el The form element.
 * @returns A space-separated string of all found label texts, or an empty string if none are found.
 */
function labelText(el: Element): string {
  const id = (el as HTMLElement).id;
  const ariaLabel = el.getAttribute("aria-label") || "";
  const ariaLblBy = el.getAttribute("aria-labelledby");
  let byText = "";
  if (ariaLblBy) {
    byText = ariaLblBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.innerText || "")
      .join(" ");
  }
  const forLabel = id ? (document.querySelector(`label[for="${CSS.escape(id)}"]`) as HTMLElement | null)?.innerText || "" : "";
  const parentLbl = (el.closest("label") as HTMLElement | null)?.innerText || "";
  const legend = (el.closest("fieldset")?.querySelector("legend") as HTMLElement | null)?.innerText || "";
  return [forLabel, parentLbl, ariaLabel, byText, legend].filter(Boolean).join(" ");
}


/**
 * Gathers a list of candidate strings from a form element's attributes
 * that can be used to identify the field's purpose (e.g., "email", "first name").
 * @param el The form element.
 * @returns A single string with all candidates joined by " | ".
 */
function candidates(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  const arr: Array<string | null | undefined> = [
    el.getAttribute("name"),
    el.getAttribute("id"),
    (el as HTMLInputElement).placeholder,
    labelText(el),
    el.getAttribute("aria-label")
  ];

  const isNonEmptyString = (v: unknown): v is string =>
    typeof v === "string" && v.trim().length > 0;

  return arr.filter(isNonEmptyString).map(norm).join(" | ");
}

/**
 * Matches a form element to a key in the user's profile data.
 * It uses a predefined set of regular expressions (FIELD_ALIASES) to test
 * against the candidate strings from the element.
 * @param el The form element.
 * @returns The matching key (e.g., "user.email"), or null if no match is found.
 */
function matchKey(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string | null {
  const c = candidates(el);
  for (const [k, regs] of Object.entries(FIELD_ALIASES)) {
    if (regs.some(r => r.test(c))) return k;
  }
  return null;
}

/**
 * Sets the value of a form element. It handles different input types like
 * checkboxes, radio buttons, and select dropdowns.
 * @param el The form element to modify.
 * @param value The value to set.
 * @returns True if the value was set successfully, false otherwise.
 */
function setValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: any): boolean {
  if ((el as any).dataset?.userEdited === "1") return false;

  return runWithScriptedChange(() => {
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      const group = document.querySelectorAll<HTMLInputElement>(`input[name="${CSS.escape(el.name)}"]`);
      const want = Array.isArray(value) ? value.map(v => norm(String(v))) : [norm(String(value))];

      let clicked = 0;

      if (el.type === "radio") {
        for (const target of group) {
          const lbl = norm(labelText(target) || target.value);
          if (want.some(w => w === lbl || lbl.includes(w))) {
            if (!target.checked) target.click();
            clicked = 1;
            break;
          }
        }
        return clicked > 0;
      }

      const desired = new Set(want);
      for (const target of group) {
        const lbl = norm(labelText(target) || target.value);
        const shouldBeChecked = Array.from(desired).some(w => w === lbl || lbl.includes(w));
        if (target.checked !== shouldBeChecked) {
          target.click();
          clicked++;
        }
      }
      return clicked > 0;
    }

    if (el instanceof HTMLSelectElement) {
      const v = String(value ?? "").trim();
      const candidate = findBestSelectOption(el.options, v);
      if (candidate) {
        el.value = candidate.value ?? "";
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      return false;
    }

    // Text/textarea
    (el as HTMLInputElement | HTMLTextAreaElement).value = String(value ?? "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  });
}


/**
 * Recursively traverses the DOM and any open Shadow DOMs to find all input elements.
 * This is necessary to handle forms that are encapsulated in web components.
 * @param root The starting point for the traversal (defaults to `document`).
 * @returns An array of all found input, select, and textarea elements.
 */
function collectInputsDeep(root: Document | ShadowRoot = document): (HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement)[] {
  const results: Element[] = [];

  const walk = (node: Document | ShadowRoot) => {
    // Gather inputs at the current level
    results.push(...Array.from(node.querySelectorAll("input,select,textarea")));

    // Visit descendants and dive into any open shadow roots
    const all = node.querySelectorAll<HTMLElement>("*");
    for (const el of all) {
      const sr = (el as HTMLElement).shadowRoot;
      if (sr) walk(sr);
    }
  };

  walk(root);

  // Filter the results to ensure they are the correct element types
  return results.filter(
    (el): el is HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement =>
      el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
  );
}

function clearAutofilled() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-autofilled="1"]'));

  runWithScriptedChange(() => {
    for (const el of els) {
      el.style.outline = "";
      el.dataset.autofilled = "";
      el.dataset.userEdited = "";

      if (el instanceof HTMLInputElement) {
        if (el.type === "checkbox") {
          if (el.checked) el.click();
          continue;
        }
        if (el.type === "radio") {
          if (el.checked) el.checked = false;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          continue;
        }

        el.value = "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        continue;
      }

      if (el instanceof HTMLSelectElement) {
        if (el.options.length > 0) {
          el.selectedIndex = 0;
        } else {
          (el as any).value = "";
        }
        el.dispatchEvent(new Event("change", { bubbles: true }));
        continue;
      }

      if (el instanceof HTMLTextAreaElement) {
        el.value = "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        continue;
      }
    }
  });

  chrome.runtime.sendMessage({ type: "FILL_DONE", count: 0 });
}


/**
 * The main autofill function. It uses `collectInputsDeep` to find all form
 * elements (including those in Shadow DOMs), matches them to keys in the
 * profile, and fills them with the corresponding values.
 * @param profile The user's data profile.
 */
async function fill(profile: AnyObj) {
  const inputs = collectInputsDeep()
    // Filter out hidden elements
     .filter(el => (el as HTMLElement).offsetParent !== null);
  let n = 0;
  for (const el of inputs) {
    if ((el as any).dataset?.userEdited === "1") continue;
    const key = matchKey(el);
    if (!key) continue;
    const val = getProfileValue(profile, key);
    if (val == null || val === "") continue;
    // If value is set successfully, highlight the field and increment the counter
    if (setValue(el, val)) {
      (el as HTMLElement).dataset.autofilled = "1";
      (el as HTMLElement).style.outline = "2px solid #f7d560";
      n++;
    }
  }
  // Send a message back to the popup with the number of fields filled
  chrome.runtime.sendMessage({ type: "FILL_DONE", count: n });
}

/**
 * Creates a debounced version of the fill function. This prevents the fill
 * logic from running too frequently when the DOM is changing rapidly.
 * @param profile The user's data profile.
 * @returns A function that, when called, will trigger a fill after a short delay.
 */
function scheduleFill(profile: AnyObj) {
  let t: number | null = null;
  return () => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fill(profile), 150);
  };
}

let observer: MutationObserver | null = null;

/**
 * Sets up a MutationObserver to watch for changes to the DOM.
 * When changes are detected, it triggers a debounced fill operation.
 * This is crucial for handling forms that are loaded dynamically after the
 * initial page load (common in SPAs).
 * @param profile The user's data profile.
 */
function watchForChanges(profile: AnyObj) {
  const run = scheduleFill(profile);
  observer?.disconnect();
  observer = new MutationObserver((muts) => {
    if (muts.some(m => m.addedNodes && m.addedNodes.length > 0)) run();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  run(); 
}

/**
 * Listens for the "FILL_EXECUTE" message from the popup.
 * When the message is received, it initiates the fill process and
 * starts watching for DOM changes to handle dynamic forms.
 */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "FILL_EXECUTE") {
    const { profile } = msg.payload ?? {};
    watchForChanges(profile);
  }
  else if (msg?.type === "FILL_UNDO") {
    clearAutofilled();
  }
});
