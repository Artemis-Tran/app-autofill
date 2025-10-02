/**
 * @file This script is injected into web pages to autofill forms.
 * It listens for a message from the popup, then finds and fills form fields
 * based on a user-provided JSON profile. It also watches for DOM changes
 * to handle dynamically loaded forms in single-page applications (SPAs).
 */

import { FIELD_ALIASES } from "./aliases";

type AnyObj = Record<string, any>;

/**
 * Normalizes a string by converting it to lowercase, replacing multiple
 * whitespace characters with a single space, and trimming leading/trailing whitespace.
 * @param s The string to normalize.
 * @returns The normalized string.
 */
const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

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
 * Safely retrieves a nested property from an object using a dot-separated path.
 * @param obj The object to query.
 * @param path The path to the property (e.g., "user.address.city").
 * @returns The property value, or undefined if not found.
 */
function get(obj: AnyObj, path: string): unknown {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

/**
 * Sets the value of a form element. It handles different input types like
 * checkboxes, radio buttons, and select dropdowns.
 * @param el The form element to modify.
 * @param value The value to set.
 * @returns True if the value was set successfully, false otherwise.
 */
function setValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: any): boolean {
  const v = String(value);
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    const group = document.querySelectorAll<HTMLInputElement>(`input[name="${CSS.escape(el.name)}"]`);
    for (const opt of group) {
      const txt = norm(labelText(opt) || opt.value);
      if (txt.includes(norm(v))) { opt.click(); return true; }
    }
    return false;
  }
  if (el instanceof HTMLSelectElement) {
    const options = Array.from(el.options);
    const found = options.find(o => norm(o.text).includes(norm(v)) || norm(o.value) === norm(v));
    if (found) { el.value = found.value; el.dispatchEvent(new Event("change",{bubbles:true})); return true; }
    return false;
  }
  (el as HTMLInputElement | HTMLTextAreaElement).value = v;
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
  return true;
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


/**
 * The main autofill function. It uses `collectInputsDeep` to find all form
 * elements (including those in Shadow DOMs), matches them to keys in the
 * profile, and fills them with the corresponding values.
 * @param profile The user's data profile.
 * @param allowDemo Whether to fill fields marked as "demographics".
 */
async function fill(profile: AnyObj, allowDemo: boolean) {
  const inputs = collectInputsDeep()
    // Filter out hidden elements
     .filter(el => (el as HTMLElement).offsetParent !== null);
  let n = 0;
  for (const el of inputs) {
    const key = matchKey(el);
    if (!key) continue;
    // Skip demographic fields if not allowed
    if (!allowDemo && key.startsWith("demographics.")) continue;
    const val = get(profile, key);
    if (val == null || val === "") continue;
    // If value is set successfully, highlight the field and increment the counter
    if (setValue(el, val)) {
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
 * @param allowDemo Whether to fill fields marked as "demographics".
 * @returns A function that, when called, will trigger a fill after a short delay.
 */
function scheduleFill(profile: AnyObj, allowDemo: boolean) {
  let t: number | null = null;
  return () => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fill(profile, allowDemo), 150);
  };
}

let observer: MutationObserver | null = null;

/**
 * Sets up a MutationObserver to watch for changes to the DOM.
 * When changes are detected, it triggers a debounced fill operation.
 * This is crucial for handling forms that are loaded dynamically after the
 * initial page load (common in SPAs).
 * @param profile The user's data profile.
 * @param allowDemo Whether to fill fields marked as "demographics".
 */
function watchForChanges(profile: AnyObj, allowDemo: boolean) {
  const run = scheduleFill(profile, allowDemo);
  observer?.disconnect();
  observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  run(); // Run an initial fill
}

/**
 * Listens for the "FILL_EXECUTE" message from the popup.
 * When the message is received, it initiates the fill process and
 * starts watching for DOM changes to handle dynamic forms.
 */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "FILL_EXECUTE") return;
  const { profile, allowDemographics } = msg.payload ?? {};
  // Start watching so SPA/late-loaded forms get filled too
  watchForChanges(profile, !!allowDemographics);
});
