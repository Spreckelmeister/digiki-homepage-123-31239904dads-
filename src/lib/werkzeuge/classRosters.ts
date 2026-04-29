// Gemeinsamer Klassenlisten-Store für alle Werkzeuge, die Klassenlisten
// brauchen (zufalls-auswahl, klassenverteilung). Liegt rein im
// localStorage des Browsers – kein Server, kein Sync.
//
// Migration: Alte Daten von zufalls-auswahl (`digiki.werkzeuge.zufalls.lists.v1`)
// werden beim ersten Lesen automatisch importiert.

export type Gender = "m" | "w" | "x";

export interface Student {
  id: string; // uuid
  name: string;
  gender: Gender;
  notes: string;
  wishes: string[]; // student ids
  noGo: string[]; // student ids
  siblings: string[]; // student ids
  prevClass: string;
  /** Klassenindex (1-basiert) – nur für Klassenverteilung relevant */
  lockedClass: number | null;
  /** Verknüpfung zu einer Online-Anmeldung (für spätere E-Mail-Benachrichtigung) */
  registrationId?: string;
  /** Verknüpfung zur Online-Session (für die Notify-API) */
  sessionId?: string;
}

export interface ClassRoster {
  id: string; // uuid
  name: string; // z.B. "Klasse 3b"
  students: Student[];
  createdAt: number;
  updatedAt: number;
}

export const ROSTER_STORAGE_KEY = "digiki.werkzeuge.classRosters.v1";
const LEGACY_ZUFALLS_KEY = "digiki.werkzeuge.zufalls.lists.v1";

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function makeStudent(partial: Partial<Student> & { name: string }): Student {
  return {
    id: partial.id ?? uuid(),
    name: partial.name,
    gender: partial.gender ?? "x",
    notes: partial.notes ?? "",
    wishes: Array.isArray(partial.wishes) ? partial.wishes : [],
    noGo: Array.isArray(partial.noGo) ? partial.noGo : [],
    siblings: Array.isArray(partial.siblings) ? partial.siblings : [],
    prevClass: partial.prevClass ?? "",
    lockedClass:
      typeof partial.lockedClass === "number" && partial.lockedClass > 0
        ? partial.lockedClass
        : null,
    registrationId:
      typeof partial.registrationId === "string" ? partial.registrationId : undefined,
    sessionId:
      typeof partial.sessionId === "string" ? partial.sessionId : undefined,
  };
}

export function makeRoster(name: string, students: Student[] = []): ClassRoster {
  const now = Date.now();
  return {
    id: uuid(),
    name,
    students,
    createdAt: now,
    updatedAt: now,
  };
}

// Robust gegen unbekannte Eingabeformen
function normalizeStudent(raw: unknown, fallbackId?: string): Student | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;
  const gender: Gender = r.gender === "m" || r.gender === "w" ? (r.gender as Gender) : "x";
  return {
    id: typeof r.id === "string" ? r.id : (fallbackId ?? uuid()),
    name,
    gender,
    notes: typeof r.notes === "string" ? r.notes : typeof r.note === "string" ? r.note : "",
    wishes: Array.isArray(r.wishes) ? (r.wishes.filter((x) => typeof x === "string") as string[]) : [],
    noGo: Array.isArray(r.noGo) ? (r.noGo.filter((x) => typeof x === "string") as string[]) : [],
    siblings: Array.isArray(r.siblings) ? (r.siblings.filter((x) => typeof x === "string") as string[]) : [],
    prevClass: typeof r.prevClass === "string" ? r.prevClass : "",
    lockedClass:
      typeof r.lockedClass === "number" && r.lockedClass > 0 ? r.lockedClass : null,
    registrationId:
      typeof r.registrationId === "string" ? r.registrationId : undefined,
    sessionId: typeof r.sessionId === "string" ? r.sessionId : undefined,
  };
}

function normalizeRoster(raw: unknown): ClassRoster | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;
  const id = typeof r.id === "string" ? r.id : uuid();
  const studentsArr = Array.isArray(r.students) ? r.students : [];
  const students = studentsArr
    .map((s) => normalizeStudent(s))
    .filter((s): s is Student => s !== null);
  // Aufräumen: Verweise (wishes/noGo/siblings) auf gelöschte IDs entfernen
  const validIds = new Set(students.map((s) => s.id));
  const cleaned = students.map((s) => ({
    ...s,
    wishes: s.wishes.filter((id) => validIds.has(id) && id !== s.id),
    noGo: s.noGo.filter((id) => validIds.has(id) && id !== s.id),
    siblings: s.siblings.filter((id) => validIds.has(id) && id !== s.id),
  }));
  return {
    id,
    name,
    students: cleaned,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Migration aus dem alten zufalls-auswahl-Store
// Format dort: { id: string, name: string, names: string[], createdAt: number }
// ──────────────────────────────────────────────────────────────────────

function migrateLegacy(): ClassRoster[] {
  try {
    const raw = window.localStorage.getItem(LEGACY_ZUFALLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const rosters: ClassRoster[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const listName = typeof obj.name === "string" ? obj.name : "Liste";
      const namesArr = Array.isArray(obj.names) ? obj.names : [];
      const students: Student[] = namesArr
        .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
        .map((n) => makeStudent({ name: n.trim() }));
      if (students.length === 0) continue;
      rosters.push({
        id: typeof obj.id === "string" ? obj.id : uuid(),
        name: listName,
        students,
        createdAt: typeof obj.createdAt === "number" ? obj.createdAt : Date.now(),
        updatedAt: Date.now(),
      });
    }
    return rosters;
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────

let _migrated = false;

export function loadRosters(): ClassRoster[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ROSTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeRoster).filter((r): r is ClassRoster => r !== null);
      }
    }
    // Beim ersten Laden: Legacy-Migration ausführen und persistieren.
    if (!_migrated) {
      _migrated = true;
      const migrated = migrateLegacy();
      if (migrated.length > 0) {
        saveRosters(migrated);
        return migrated;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function saveRosters(rosters: ClassRoster[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(rosters));
  } catch {
    /* Quota voll – ignorieren */
  }
}

/** Listener-Mechanismus, damit mehrere Tools im selben Tab auf Änderungen reagieren */
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeRosters(listener: Listener): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ROSTER_STORAGE_KEY) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => listeners.delete(listener);
}

function notify() {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* noop */
    }
  }
}

export function upsertRoster(roster: ClassRoster): ClassRoster[] {
  const all = loadRosters();
  const idx = all.findIndex((r) => r.id === roster.id);
  const next: ClassRoster = { ...roster, updatedAt: Date.now() };
  if (idx >= 0) {
    all[idx] = next;
  } else {
    all.unshift(next);
  }
  saveRosters(all);
  notify();
  return all;
}

export function deleteRoster(id: string): ClassRoster[] {
  const all = loadRosters().filter((r) => r.id !== id);
  saveRosters(all);
  notify();
  return all;
}

/** Bequemer Helfer: gibt nur die Namen zurück (für zufalls-auswahl). */
export function rosterNames(roster: ClassRoster): string[] {
  return roster.students.map((s) => s.name);
}

/** Erstellt einen Roster aus einem reinen Namen-Block (eine Zeile pro Name). */
export function rosterFromNamesText(name: string, raw: string): ClassRoster {
  const students = raw
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
    .map((n) => makeStudent({ name: n }));
  return makeRoster(name, students);
}
