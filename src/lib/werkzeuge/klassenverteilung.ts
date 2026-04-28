// Verteilungs-Algorithmus für die Klassenbildung.
// Greedy-Zuweisung mit anschließender Swap-Optimierung. Mehrere Durchläufe
// mit zufälliger Reihenfolge, der beste wird zurückgegeben.

import type { Student } from "./classRosters";

export interface DistributionConfig {
  /** Klassen-Anzahl */
  numClasses: number;
  /** 0 = aus, 5 = sehr stark */
  wishWeight: number;
  /** Maximale Anzahl Wünsche pro Kind (für die UI) */
  maxWishes: number;
  /** Geschlechter-Balance optimieren */
  genderBalance: boolean;
  /** Förderkinder (mit Notiz) gleichmäßig verteilen */
  distributeNotes: boolean;
  /** Vorjahresklassen mischen (alte Klassengemeinschaften aufbrechen) */
  prevClassSeparate: boolean;
  /** Geschwister-Regel */
  siblingRule: "none" | "separate" | "together";
}

export interface ClassResult {
  id: number; // 1-basiert
  students: Student[];
}

export interface ResultScore {
  wishesMet: number;
  wishesTotal: number;
  noGoViolations: number;
  genderDiff: number;
  /** Aggregat-Score; höher = besser */
  score: number;
}

export interface ClassStat {
  id: number;
  total: number;
  boys: number;
  girls: number;
  diverse: number; // gender "x"
  notes: number;
  wishesMet: number;
  wishesTotal: number;
  noGoViolations: number;
}

export interface UnmetWishReport {
  student: Student;
  classId: number;
  met: string[]; // student ids
  unmet: string[]; // student ids
  details: { student: Student | null; inClass: number | "?" }[];
  /** Verhältnis erfüllter zu Gesamt-Wünschen, 0..1 */
  ratio: number;
}

// ──────────────────────────────────────────────────────────────────────
// Score-Funktion: bewertet, wie gut ein Schüler in eine Klasse passt
// ──────────────────────────────────────────────────────────────────────

function calcScore(
  st: Student,
  classStudents: Student[],
  cfg: DistributionConfig,
  total: number
): number {
  let s = 0;
  const ids = new Set(classStudents.map((x) => x.id));

  if (cfg.wishWeight > 0) {
    for (const w of st.wishes) {
      if (ids.has(w)) s += cfg.wishWeight * 10;
    }
  }
  // No-Go: harter Abzug
  for (const ng of st.noGo) {
    if (ids.has(ng)) s -= 100;
  }

  if (cfg.genderBalance) {
    const boys = classStudents.filter((x) => x.gender === "m").length;
    const girls = classStudents.filter((x) => x.gender === "w").length;
    const target =
      st.gender === "m" ? Math.abs(boys + 1 - girls) : Math.abs(boys - girls - 1);
    s -= target * 3;
  }

  if (cfg.distributeNotes && st.notes && st.notes.trim().length > 0) {
    s -= classStudents.filter((x) => x.notes && x.notes.trim().length > 0).length * 5;
  }

  if (cfg.siblingRule === "separate") {
    for (const sib of st.siblings) {
      if (ids.has(sib)) s -= 80;
    }
  } else if (cfg.siblingRule === "together") {
    for (const sib of st.siblings) {
      if (ids.has(sib)) s += 40;
    }
  }

  if (cfg.prevClassSeparate && st.prevClass) {
    const same = classStudents.filter(
      (x) => x.prevClass && x.prevClass === st.prevClass
    ).length;
    s -= same * 8;
  }

  // Gleichmäßige Klassengröße
  s -= Math.abs(classStudents.length - total / cfg.numClasses) * 2;

  return s;
}

// Fisher-Yates für deterministische Mischung wenn gewünscht
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ──────────────────────────────────────────────────────────────────────
// Distribute: ein Durchlauf
// ──────────────────────────────────────────────────────────────────────

export function distribute(
  students: Student[],
  cfg: DistributionConfig,
  rnd: () => number = Math.random
): ClassResult[] {
  const numCls = Math.max(1, cfg.numClasses);
  const cls: ClassResult[] = Array.from({ length: numCls }, (_, i) => ({
    id: i + 1,
    students: [],
  }));
  const asgn: Record<string, number> = {};

  // Phase 1: Fixierte Schüler platzieren
  for (const s of students) {
    if (s.lockedClass && s.lockedClass >= 1 && s.lockedClass <= numCls) {
      cls[s.lockedClass - 1].students.push(s);
      asgn[s.id] = s.lockedClass;
    }
  }

  // Phase 2: Greedy für den Rest
  const remaining = students.filter((s) => !asgn[s.id]);
  const tgt = Math.ceil(students.length / numCls);
  const shuffled = shuffle(remaining, rnd);

  for (const st of shuffled) {
    let best: ClassResult | null = null;
    let bestScore = -Infinity;
    for (const cl of cls) {
      if (cl.students.length >= tgt + 1) continue;
      const sc = calcScore(st, cl.students, cfg, students.length);
      if (sc > bestScore) {
        bestScore = sc;
        best = cl;
      }
    }
    if (best) {
      best.students.push(st);
      asgn[st.id] = best.id;
    }
  }

  // Phase 3: Übriggebliebene Schüler in kleinste Klasse
  for (const s of students) {
    if (!asgn[s.id]) {
      const smallest = cls.reduce((a, b) =>
        a.students.length <= b.students.length ? a : b
      );
      smallest.students.push(s);
      asgn[s.id] = smallest.id;
    }
  }

  // Phase 4: Swap-Optimierung
  const movable = new Set(students.filter((s) => !s.lockedClass).map((s) => s.id));
  for (let iter = 0; iter < 100; iter++) {
    let improved = false;
    for (let ai = 0; ai < students.length; ai++) {
      for (let bi = ai + 1; bi < students.length; bi++) {
        const s1 = students[ai];
        const s2 = students[bi];
        if (!movable.has(s1.id) || !movable.has(s2.id)) continue;
        const c1 = asgn[s1.id];
        const c2 = asgn[s2.id];
        if (!c1 || !c2 || c1 === c2) continue;
        const cl1 = cls[c1 - 1];
        const cl2 = cls[c2 - 1];
        if (!cl1 || !cl2) continue;

        const oldScore =
          calcScore(s1, cl1.students, cfg, students.length) +
          calcScore(s2, cl2.students, cfg, students.length);

        // Tausch durchführen, neu bewerten
        cl1.students = cl1.students.filter((s) => s.id !== s1.id);
        cl2.students = cl2.students.filter((s) => s.id !== s2.id);
        cl1.students.push(s2);
        cl2.students.push(s1);

        const newScore =
          calcScore(s2, cl1.students, cfg, students.length) +
          calcScore(s1, cl2.students, cfg, students.length);

        // Harte No-Go-Verletzung verhindern
        let noGoViol = false;
        for (const ng of s1.noGo) if (cl2.students.some((s) => s.id === ng)) noGoViol = true;
        for (const ng of s2.noGo) if (cl1.students.some((s) => s.id === ng)) noGoViol = true;

        if (newScore > oldScore && !noGoViol) {
          asgn[s1.id] = c2;
          asgn[s2.id] = c1;
          improved = true;
        } else {
          // Tausch zurücknehmen
          cl1.students = cl1.students.filter((s) => s.id !== s2.id);
          cl2.students = cl2.students.filter((s) => s.id !== s1.id);
          cl1.students.push(s1);
          cl2.students.push(s2);
        }
      }
    }
    if (!improved) break;
  }

  return cls;
}

// ──────────────────────────────────────────────────────────────────────
// Multi-Run: bester Vorschlag aus N Durchläufen
// ──────────────────────────────────────────────────────────────────────

export function distributeBest(
  students: Student[],
  cfg: DistributionConfig,
  runs = 15
): { result: ClassResult[]; score: ResultScore } {
  let best: ClassResult[] | null = null;
  let bestScore: ResultScore | null = null;
  for (let i = 0; i < runs; i++) {
    const r = distribute(students, cfg);
    const s = scoreResult(r);
    if (!bestScore || s.score > bestScore.score) {
      best = r;
      bestScore = s;
    }
  }
  // best ist garantiert nicht null, da runs >= 1 (oder 0 → fallback)
  return {
    result: best ?? distribute(students, cfg),
    score: bestScore ?? { wishesMet: 0, wishesTotal: 0, noGoViolations: 0, genderDiff: 0, score: 0 },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Auswertung
// ──────────────────────────────────────────────────────────────────────

export function scoreResult(classes: ClassResult[]): ResultScore {
  let wishesMet = 0;
  let wishesTotal = 0;
  let noGoViolations = 0;
  let genderDiff = 0;
  for (const c of classes) {
    const ids = new Set(c.students.map((s) => s.id));
    for (const s of c.students) {
      wishesTotal += s.wishes.length;
      for (const w of s.wishes) if (ids.has(w)) wishesMet++;
      for (const n of s.noGo) if (ids.has(n)) noGoViolations++;
    }
    const boys = c.students.filter((s) => s.gender === "m").length;
    const girls = c.students.filter((s) => s.gender === "w").length;
    genderDiff += Math.abs(boys - girls);
  }
  const score = wishesMet * 10 - noGoViolations * 50 - genderDiff * 2;
  return { wishesMet, wishesTotal, noGoViolations, genderDiff, score };
}

export function calcStats(classes: ClassResult[]): ClassStat[] {
  return classes.map((c) => {
    const ids = new Set(c.students.map((s) => s.id));
    let wishesMet = 0;
    let wishesTotal = 0;
    for (const s of c.students) {
      wishesTotal += s.wishes.length;
      for (const w of s.wishes) if (ids.has(w)) wishesMet++;
    }
    let noGoViolations = 0;
    for (const s of c.students) for (const n of s.noGo) if (ids.has(n)) noGoViolations++;
    return {
      id: c.id,
      total: c.students.length,
      boys: c.students.filter((s) => s.gender === "m").length,
      girls: c.students.filter((s) => s.gender === "w").length,
      diverse: c.students.filter((s) => s.gender === "x").length,
      notes: c.students.filter((s) => s.notes && s.notes.trim().length > 0).length,
      wishesMet,
      wishesTotal,
      noGoViolations,
    };
  });
}

export function analyzeWishes(
  classes: ClassResult[],
  allStudents: Student[]
): UnmetWishReport[] {
  const reports: UnmetWishReport[] = [];
  for (const cls of classes) {
    const ids = new Set(cls.students.map((s) => s.id));
    for (const s of cls.students) {
      if (s.wishes.length === 0) continue;
      const met: string[] = [];
      const unmet: string[] = [];
      for (const w of s.wishes) {
        if (ids.has(w)) met.push(w);
        else unmet.push(w);
      }
      if (unmet.length === 0) continue;
      const details = unmet.map((wid) => {
        const student = allStudents.find((x) => x.id === wid) ?? null;
        const wCls = classes.find((c) => c.students.some((x) => x.id === wid));
        return { student, inClass: (wCls ? wCls.id : "?") as number | "?" };
      });
      reports.push({
        student: s,
        classId: cls.id,
        met,
        unmet,
        details,
        ratio: met.length / s.wishes.length,
      });
    }
  }
  reports.sort((a, b) => a.ratio - b.ratio);
  return reports;
}

// ──────────────────────────────────────────────────────────────────────
// CSV-Export
// ──────────────────────────────────────────────────────────────────────

export function exportResultCSV(result: ClassResult[]): string {
  const rows: string[][] = [
    [
      "Name",
      "Geschlecht",
      "Klasse",
      "Wuensche_erfuellt",
      "Wuensche_gesamt",
      "NoGo_Konflikte",
      "Geschwister_zusammen",
      "Vorjahresklasse",
      "Notiz",
      "Fixiert",
    ],
  ];
  for (const cls of result) {
    const ids = new Set(cls.students.map((s) => s.id));
    const sorted = [...cls.students].sort((a, b) => a.name.localeCompare(b.name, "de"));
    for (const s of sorted) {
      const wMet = s.wishes.filter((w) => ids.has(w)).length;
      const ngH = s.noGo.filter((n) => ids.has(n)).length;
      const sibT = s.siblings.filter((sib) => ids.has(sib)).length;
      rows.push([
        s.name,
        s.gender === "m" ? "Junge" : s.gender === "w" ? "Mädchen" : "divers",
        `Klasse ${cls.id}`,
        String(wMet),
        String(s.wishes.length),
        String(ngH),
        String(sibT),
        s.prevClass || "",
        s.notes || "",
        s.lockedClass ? "ja" : "nein",
      ]);
    }
  }
  return (
    "﻿" +
    rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n")
  );
}

/** Kürzelcode aus Initialen + ID-Suffix, z.B. "EM-a3f". */
export function genCode(name: string, idSuffix = ""): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((p) => (p[0] || "").toUpperCase())
    .join("")
    .slice(0, 2);
  const tail = idSuffix.replace(/[^a-z0-9]/gi, "").slice(-3).toUpperCase();
  return tail ? `${initials}-${tail}` : initials;
}
