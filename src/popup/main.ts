import { saveProfile, loadProfile } from "../storage";
import type { Profile } from "../types";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// Basics / Address
const firstName = $("firstName") as HTMLInputElement;
const lastName = $("lastName") as HTMLInputElement;
const email = $("email") as HTMLInputElement;
const phone = $("phone") as HTMLInputElement;

const line1 = $("line1") as HTMLInputElement;
const line2 = $("line2") as HTMLInputElement;
const city = $("city") as HTMLInputElement;
const state = $("state") as HTMLInputElement;
const postalCode = $("postalCode") as HTMLInputElement;
const country = $("country") as HTMLInputElement;

// Dynamic sections
const linksContainer = $("linksContainer");
const educationContainer = $("educationContainer");
const workContainer = $("workContainer");

const addLinkBtn = $("addLink") as HTMLButtonElement;
const addEduBtn = $("addEducation") as HTMLButtonElement;
const addWorkBtn = $("addWork") as HTMLButtonElement;

const linkRowTmpl = $("linkRowTmpl") as HTMLTemplateElement;
const eduRowTmpl = $("eduRowTmpl") as HTMLTemplateElement;
const workRowTmpl = $("workRowTmpl") as HTMLTemplateElement;

// Demographics
const demoWorkAuth = $("demoWorkAuth") as HTMLSelectElement;
const demoNeedsSponsorship = $("demoNeedsSponsorship") as HTMLInputElement;
const demoGender = $("demoGender") as HTMLSelectElement;
const demoPronouns = $("demoPronouns") as HTMLInputElement;
const demoRaceGroup = $("demoRaceGroup") as HTMLDivElement; // contains checkboxes
const demoVeteran = $("demoVeteran") as HTMLSelectElement;
const demoDisability = $("demoDisability") as HTMLSelectElement;

// Other controls
const jsonArea = $("profileJson") as HTMLTextAreaElement;
const saveBtn = $("save") as HTMLButtonElement;
const fillBtn = $("fill") as HTMLButtonElement;
const undoBtn = $("undo") as HTMLButtonElement;
const status = $("status") as HTMLDivElement;

// ----- Row factories -----
function addLinkRow(data?: { label?: string; url?: string }) {
  const node = linkRowTmpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
  (node.querySelector(".link-label") as HTMLInputElement).value = data?.label ?? "";
  (node.querySelector(".link-url") as HTMLInputElement).value = data?.url ?? "";
  linksContainer.appendChild(node);
}
function addEduRow(data?: { school?: string; degree?: string; field?: string; start?: string; end?: string }) {
  const node = eduRowTmpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
  (node.querySelector(".edu-school") as HTMLInputElement).value = data?.school ?? "";
  (node.querySelector(".edu-degree") as HTMLInputElement).value = data?.degree ?? "";
  (node.querySelector(".edu-field") as HTMLInputElement).value = data?.field ?? "";
  (node.querySelector(".edu-start") as HTMLInputElement).value = data?.start ?? "";
  (node.querySelector(".edu-end") as HTMLInputElement).value = data?.end ?? "";
  educationContainer.appendChild(node);
}
function addWorkRow(data?: { company?: string; role?: string; start?: string; end?: string; summary?: string }) {
  const node = workRowTmpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
  (node.querySelector(".work-company") as HTMLInputElement).value = data?.company ?? "";
  (node.querySelector(".work-role") as HTMLInputElement).value = data?.role ?? "";
  (node.querySelector(".work-start") as HTMLInputElement).value = data?.start ?? "";
  (node.querySelector(".work-end") as HTMLInputElement).value = data?.end ?? "";
  (node.querySelector(".work-summary") as HTMLTextAreaElement).value = data?.summary ?? "";
  workContainer.appendChild(node);
}

// Remove row (event delegation)
function installRemoveHandler(container: HTMLElement) {
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target?.dataset?.remove !== undefined || target?.getAttribute("data-remove") !== null) {
      const row = (target.closest(".row") as HTMLElement) ?? undefined;
      row?.remove();
      syncJsonFromForm();
    }
  });
}
installRemoveHandler(linksContainer);
installRemoveHandler(educationContainer);
installRemoveHandler(workContainer);

// Add row buttons
addLinkBtn.addEventListener("click", () => { addLinkRow(); syncJsonFromForm(); });
addEduBtn.addEventListener("click", () => { addEduRow(); syncJsonFromForm(); });
addWorkBtn.addEventListener("click", () => { addWorkRow(); syncJsonFromForm(); });

// ----- Build ↔ Fill -----
function buildProfileFromForm(): Profile {
  const links = Array.from(linksContainer.querySelectorAll(".link-row")).map(row => ({
    label: (row.querySelector(".link-label") as HTMLInputElement).value.trim(),
    url: (row.querySelector(".link-url") as HTMLInputElement).value.trim(),
  })).filter(l => l.label || l.url);

  const education = Array.from(educationContainer.querySelectorAll(".edu-row")).map(row => ({
    school: (row.querySelector(".edu-school") as HTMLInputElement).value.trim(),
    degree: (row.querySelector(".edu-degree") as HTMLInputElement).value.trim(),
    field: (row.querySelector(".edu-field") as HTMLInputElement).value.trim(),
    start: (row.querySelector(".edu-start") as HTMLInputElement).value.trim(),
    end: (row.querySelector(".edu-end") as HTMLInputElement).value.trim(),
  })).filter(e => e.school || e.degree || e.field);

  const work = Array.from(workContainer.querySelectorAll(".work-row")).map(row => ({
    company: (row.querySelector(".work-company") as HTMLInputElement).value.trim(),
    role: (row.querySelector(".work-role") as HTMLInputElement).value.trim(),
    start: (row.querySelector(".work-start") as HTMLInputElement).value.trim(),
    end: (row.querySelector(".work-end") as HTMLInputElement).value.trim(),
    summary: (row.querySelector(".work-summary") as HTMLTextAreaElement).value.trim(),
  })).filter(w => w.company || w.role || w.summary);

  const profile: Profile = {
    basics: {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
    },
    address: {
      line1: line1.value.trim(),
      line2: line2.value.trim() || undefined,
      city: city.value.trim(),
      state: state.value.trim(),
      postalCode: postalCode.value.trim(),
      country: country.value.trim() || "US",
    },
    links,
    education,
    work,
    demographics: {
      workAuthorization: demoWorkAuth.value || undefined,
      needsSponsorship: !!demoNeedsSponsorship.checked,
      gender: demoGender.value || undefined,
      pronouns: demoPronouns.value.trim() || undefined,
      raceEthnicity: getCheckedValues(demoRaceGroup),
      veteranStatus: demoVeteran.value || undefined,
      disability: demoDisability.value || undefined,
    },
  } as unknown as Profile;

  return profile;
}

function getCheckedValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked'))
    .map(cb => cb.value);
}

function setCheckedValues(container: HTMLElement, values: string[] | undefined) {
  const set = new Set(values ?? []);
  container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
    cb.checked = set.has(cb.value);
  });
}


function fillFormFromProfile(profile: Profile) {
  const b = (profile as any).basics ?? {};
  const a = (profile as any).address ?? {};
  const links = (profile as any).links as Array<any> | undefined;
  const education = (profile as any).education as Array<any> | undefined;
  const work = (profile as any).work as Array<any> | undefined;
  const d = (profile as any).demographics ?? {};

  firstName.value = b.firstName ?? "";
  lastName.value  = b.lastName ?? "";
  email.value     = b.email ?? "";
  phone.value     = b.phone ?? "";

  line1.value     = a.line1 ?? "";
  line2.value     = a.line2 ?? "";
  city.value      = a.city ?? "";
  state.value     = a.state ?? "";
  postalCode.value= a.postalCode ?? "";
  country.value   = a.country ?? "";

  demoWorkAuth.value = d.workAuthorization ?? "";
  demoNeedsSponsorship.checked = !!d.needsSponsorship;
  demoGender.value = d.gender ?? "";
  demoPronouns.value = d.pronouns ?? "";
  setCheckedValues(demoRaceGroup, d.raceEthnicity);
  demoVeteran.value = d.veteranStatus ?? "";
  demoDisability.value = d.disability ?? "";

  // Rebuild dynamic lists
  linksContainer.innerHTML = "";
  (links ?? []).forEach(l => addLinkRow({ label: l.label, url: l.url }));

  educationContainer.innerHTML = "";
  (education ?? []).forEach(e => addEduRow({
    school: e.school, degree: e.degree, field: e.field, start: e.start, end: e.end
  }));

  workContainer.innerHTML = "";
  (work ?? []).forEach(w => addWorkRow({
    company: w.company, role: w.role, start: w.start, end: w.end, summary: w.summary
  }));
}

function syncJsonFromForm() {
  try {
    const profile = buildProfileFromForm();
    jsonArea.value = JSON.stringify(profile, null, 2);
  } catch {}
}
function syncFormFromJson() {
  try {
    const parsed = JSON.parse(jsonArea.value) as Profile;
    fillFormFromProfile(parsed);
    status.textContent = "JSON parsed ✓";
  } catch {
    status.textContent = "Invalid JSON";
  }
}
function flash(msg: string) { status.textContent = msg; }

(async () => {
  const { profile, allowDemographics } = await loadProfile();

  if (profile) {
    fillFormFromProfile(profile);
    jsonArea.value = JSON.stringify(profile, null, 2);
  } else {
    addLinkRow({ label: "LinkedIn", url: "" });
    addLinkRow({ label: "GitHub", url: "" });
    syncJsonFromForm();
  }
})();

// Live sync inputs → JSON
[
  firstName, lastName, email, phone,
  line1, line2, city, state, postalCode, country,
  demoWorkAuth, demoNeedsSponsorship, demoGender, demoPronouns,
  demoVeteran, demoDisability
].forEach(el => el.addEventListener("input", () => { syncJsonFromForm(); status.textContent = ""; }));

demoRaceGroup.addEventListener("change", () => { syncJsonFromForm(); status.textContent = ""; });
// Listeners that also update JSON when users type in dynamic rows
const dynamicInputObserver = (container: HTMLElement) => {
  container.addEventListener("input", () => { syncJsonFromForm(); status.textContent = ""; });
};
dynamicInputObserver(linksContainer);
dynamicInputObserver(educationContainer);
dynamicInputObserver(workContainer);

// JSON → form on blur
jsonArea.addEventListener("blur", () => { syncFormFromJson(); });

// Save
saveBtn.addEventListener("click", async () => {
  try {
    const profile = buildProfileFromForm();
    await saveProfile(profile);
    syncJsonFromForm();
    flash("Saved ✓");
  } catch (e) {
    console.error(e);
    flash("Save failed");
  }
});

// Fill current tab
fillBtn.addEventListener("click", async () => {
  console.log("hello")
  try {
    const profile = buildProfileFromForm();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "FILL_EXECUTE",
        payload: { profile }
      });
      flash("Fill sent. Review highlighted fields.");
    } else {
      flash("Cannot find active tab.");
    }
  } catch (e) {
    console.error(e);
    flash("Fill failed");
  }
});

undoBtn.addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: "FILL_UNDO" });
      status.textContent = "Cleared fields I filled.";
    } else {
      status.textContent = "Cannot find active tab.";
    }
  } catch (e) {
    console.error(e);
    status.textContent = "Undo failed";
  }
});

// FILL_DONE feedback
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "FILL_DONE") {
    flash(`Filled ${msg.count} fields.`);
  }
});
