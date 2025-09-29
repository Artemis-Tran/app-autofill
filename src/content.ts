import { FIELD_ALIASES } from "./aliases";

type AnyObj = Record<string, any>;
const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();


function labelText(el: Element): string {
  const id = (el as HTMLElement).id;
  if (id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (lbl) return (lbl as HTMLElement).innerText;
  }
  const parentLbl = el.closest("label");
  return parentLbl ? (parentLbl as HTMLElement).innerText : "";
}

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

function matchKey(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string | null {
  const c = candidates(el);
  for (const [k, regs] of Object.entries(FIELD_ALIASES)) {
    if (regs.some(r => r.test(c))) return k;
  }
  return null;
}

function get(obj: AnyObj, path: string): unknown {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

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

async function fill(profile: AnyObj, allowDemo: boolean) {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea"))
    .filter(el => el.offsetParent !== null);
  let n = 0;
  for (const el of inputs) {
    const key = matchKey(el);
    if (!key) continue;
    if (!allowDemo && key.startsWith("demographics.")) continue;
    const val = get(profile, key);
    if (val == null || val === "") continue;
    if (setValue(el, val)) { (el as HTMLElement).style.outline = "2px solid #f7d560"; n++; }
  }
  chrome.runtime.sendMessage({ type: "FILL_DONE", count: n });
}

chrome.runtime.onMessage.addListener((msg, _s, _res) => {
  if (msg?.type === "FILL_EXECUTE") {
    const { profile, allowDemographics } = msg.payload ?? {};
    fill(profile, !!allowDemographics);
  }
});
