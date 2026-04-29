"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Users,
  Heart,
  Settings2,
  Sparkles,
  ListPlus,
  FileText,
  Save,
  Trash2,
  Plus,
  X,
  Pin,
  Undo2,
  Download,
  Printer,
  ShieldCheck,
  Shuffle,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Upload,
  HeartCrack,
  Ban,
  UserPlus,
  ClipboardPaste,
  Mail,
} from "lucide-react";
import QRCode from "qrcode";
import {
  type ClassRoster,
  type Student,
  loadRosters,
  makeRoster,
  makeStudent,
  subscribeRosters,
  upsertRoster,
} from "@/lib/werkzeuge/classRosters";
import {
  type ClassResult,
  type DistributionConfig,
  type ResultScore,
  type UnmetWishReport,
  analyzeWishes,
  calcStats,
  distributeBest,
  exportResultCSV,
  formatClassLabel,
  scoreResult,
} from "@/lib/werkzeuge/klassenverteilung";
import {
  applyResultToRoster,
  buildPayloadForStudent,
  decodeResult,
  encodePayload,
} from "@/lib/werkzeuge/wunschShare";
import OnlineSessions from "./OnlineSessions";
import SetupWizard from "./SetupWizard";
import type { KlassenbildungRegistration } from "@/lib/klassenbildung/types";
import {
  exactNameMatch,
  findNameMatches,
  type NameSuggestion,
} from "@/lib/werkzeuge/nameMatching";

type Step = "schueler" | "wuensche" | "regeln" | "ergebnis";

const STEPS: { id: Step; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { id: "schueler", label: "Schüler*innen", icon: Users },
  { id: "wuensche", label: "Wünsche", icon: Heart },
  { id: "regeln", label: "Regeln", icon: Settings2 },
  { id: "ergebnis", label: "Ergebnis", icon: Sparkles },
];

const DEFAULT_CONFIG: DistributionConfig = {
  numClasses: 2,
  wishWeight: 3,
  maxWishes: 2,
  genderBalance: true,
  distributeNotes: true,
  prevClassSeparate: false,
  siblingRule: "separate",
  gradeLabel: "1",
};

interface PendingMatch {
  id: string;
  fromStudentId: string;
  category: "wish" | "noGo" | "sibling";
  rawName: string;
  // Bewusst KEINE Vorschläge gespeichert: Vorschläge werden im
  // PendingMatchesPanel live aus der aktuellen Schülerliste berechnet,
  // damit nachträglich hinzugefügte Schüler*innen automatisch als
  // mögliche Treffer auftauchen.
}

interface ResultSnapshot {
  result: ClassResult[];
  log: string[];
  label: string;
}

export default function KlassenverteilungApp() {
  // ── Persistente Daten ────────────────────────────────────────────
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [activeRosterId, setActiveRosterId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [config, setConfig] = useState<DistributionConfig>(DEFAULT_CONFIG);

  // ── Workflow ─────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("schueler");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState<"m" | "w" | "x">("m");
  const [newNotes, setNewNotes] = useState("");

  // ── Verteilungs-Ergebnis ────────────────────────────────────────
  const [result, setResult] = useState<ClassResult[] | null>(null);
  const [resultScore, setResultScore] = useState<ResultScore | null>(null);
  const [moveStudent, setMoveStudent] = useState<{ studentId: string; fromClassId: number } | null>(null);
  const [history, setHistory] = useState<ResultSnapshot[]>([]);
  const [scenarios, setScenarios] = useState<
    | {
        config: DistributionConfig;
        label: string;
        result: ClassResult[];
        score: ResultScore;
      }[]
    | null
  >(null);
  const [distributing, setDistributing] = useState(false);

  // ── Roster-Speicher ─────────────────────────────────────────────
  const [saveName, setSaveName] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);

  // ── Kontakt-Info für die Eltern-Druckformulare (lokal persistent,
  //    damit die Lehrkraft sie nicht jedes Mal neu eintippen muss) ────
  const [printSchoolName, setPrintSchoolName] = useState("");
  const [printContactName, setPrintContactName] = useState("");
  const [printContactEmail, setPrintContactEmail] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(
      "digiki.klassenverteilung.printContact.v1"
    );
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      if (typeof obj?.schoolName === "string") setPrintSchoolName(obj.schoolName);
      if (typeof obj?.contactName === "string") setPrintContactName(obj.contactName);
      if (typeof obj?.contactEmail === "string") setPrintContactEmail(obj.contactEmail);
    } catch {
      /* noop */
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "digiki.klassenverteilung.printContact.v1",
      JSON.stringify({
        schoolName: printSchoolName,
        contactName: printContactName,
        contactEmail: printContactEmail,
      })
    );
  }, [printSchoolName, printContactName, printContactEmail]);

  useEffect(() => {
    setRosters(loadRosters());
    const unsub = subscribeRosters(() => setRosters(loadRosters()));
    return unsub;
  }, []);

  // ── Aktiv-Roster-Auswahl ─────────────────────────────────────────
  const loadFromRoster = useCallback((r: ClassRoster) => {
    setActiveRosterId(r.id);
    setStudents(r.students.map((s) => ({ ...s })));
    setSaveName(r.name);
    setResult(null);
    setResultScore(null);
    setHistory([]);
    setScenarios(null);
  }, []);

  const startBlank = useCallback(() => {
    setActiveRosterId(null);
    setStudents([]);
    setSaveName("");
    setResult(null);
    setResultScore(null);
    setHistory([]);
    setScenarios(null);
  }, []);

  // ── Pending-Matches: Eltern-Eingaben, die nicht eindeutig zugeordnet
  //    werden konnten. Lehrkraft entscheidet manuell.
  const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([]);

  // ── Import aus Online-Anmeldungen ────────────────────────────────
  // MERGE-Verhalten: bereits vorhandene lokale Schüler*innen bleiben
  // erhalten. Neue Anmeldungen werden hinzugefügt. Bereits importierte
  // Anmeldungen (gleiche registrationId) werden nicht doppelt angelegt.
  //
  // Pending-Matches werden APPEND-only — vorhandene Bestätigungen
  // gehen durch erneuten Import nicht verloren. Auflösung erfolgt
  // gegen die zusammengeführte Schülerliste, sodass auch zuvor
  // manuell angelegte Kinder als Match in Frage kommen.
  const importFromRegistrations = useCallback(
    (
      sessionId: string,
      rosterName: string,
      registrations: KlassenbildungRegistration[]
    ) => {
      setStudents((prevStudents) => {
        // 1) Welche Registrations sind schon lokal? (über registrationId)
        const existingByRegId = new Map<string, Student>();
        for (const s of prevStudents) {
          if (s.registrationId) existingByRegId.set(s.registrationId, s);
        }

        // 2) Für jede neue Registration: entweder bestehenden Student
        //    behalten oder neuen anlegen.
        const importedStudents: Student[] = registrations.map((r) => {
          const existing = existingByRegId.get(r.id);
          if (existing) return existing;
          return makeStudent({
            name: r.child_name,
            gender: (r.gender as "m" | "w" | "x" | null) ?? "x",
            notes: r.notes ?? "",
            prevClass: r.prev_class ?? "",
            registrationId: r.id,
            sessionId,
          });
        });

        // 3) Vorhandene Schüler*innen ohne registrationId (= manuell
        //    angelegt) bleiben unverändert. Neue Online-Schüler*innen
        //    werden ans Ende angehängt.
        const existingRegIds = new Set(existingByRegId.keys());
        const onlyNewlyImported = importedStudents.filter(
          (s) => !s.registrationId || !existingRegIds.has(s.registrationId)
        );
        const merged: Student[] = [...prevStudents, ...onlyNewlyImported];

        // 4) Wishes/NoGo/Siblings auf Basis der ZUSAMMENGEFÜHRTEN
        //    Schülerliste auflösen — auch manuell angelegte Kinder
        //    können so als exakter Match dienen.
        const candidates = merged.map((s) => ({ id: s.id, name: s.name }));

        let pIdx = 0;
        const makeId = () => `pm-${Date.now()}-${pIdx++}`;
        const newPending: PendingMatch[] = [];

        const resolve = (
          fromStudent: Student,
          names: string[],
          category: "wish" | "noGo" | "sibling"
        ): string[] => {
          const matched: string[] = [];
          for (const raw of names) {
            const exact = exactNameMatch(raw, candidates);
            if (exact && exact.id !== fromStudent.id) {
              matched.push(exact.id);
              continue;
            }
            if (exact && exact.id === fromStudent.id) continue;
            // Kein exakter Treffer → Pending (Vorschläge live im UI)
            newPending.push({
              id: makeId(),
              fromStudentId: fromStudent.id,
              category,
              rawName: raw,
            });
          }
          return matched;
        };

        // 5) Bei den NEUEN Imports die Wünsche aus der Registration auflösen
        const finalStudents = merged.map((s) => {
          if (existingRegIds.has(s.registrationId ?? "")) {
            // Schon vorher importiert – unverändert lassen
            return s;
          }
          const r = registrations.find((x) => x.id === s.registrationId);
          if (!r) return s;
          return {
            ...s,
            wishes: resolve(s, r.wishes, "wish"),
            noGo: resolve(s, r.no_go, "noGo"),
            siblings: resolve(s, r.siblings, "sibling"),
          };
        });

        // Pending-Matches anhängen (nicht ersetzen)
        setPendingMatches((prev) => [...prev, ...newPending]);
        return finalStudents;
      });

      setSaveName(rosterName);
      // Result/History invalidieren, weil Schülerliste sich ändert
      setResult(null);
      setResultScore(null);
      setHistory([]);
      // Roster-Bezug aufheben (gemischte Quelle: lokal + online)
      setActiveRosterId(null);
      setStep("wuensche");
    },
    []
  );

  // Lehrkraft akzeptiert einen Vorschlag (oder „kein Match")
  const acceptPending = useCallback(
    (pendingId: string, targetStudentId: string | null) => {
      setPendingMatches((curr) => {
        const item = curr.find((p) => p.id === pendingId);
        if (!item) return curr;
        if (targetStudentId) {
          setStudents((prev) =>
            prev.map((s) => {
              if (s.id !== item.fromStudentId) return s;
              const key: "wishes" | "noGo" | "siblings" =
                item.category === "noGo"
                  ? "noGo"
                  : item.category === "sibling"
                    ? "siblings"
                    : "wishes";
              if (s[key].includes(targetStudentId)) return s;
              return { ...s, [key]: [...s[key], targetStudentId] };
            })
          );
        }
        return curr.filter((p) => p.id !== pendingId);
      });
    },
    []
  );
  const dismissAllPending = useCallback(() => setPendingMatches([]), []);

  // ── CSV-Import: Name; Geschlecht; Notiz; Vorjahresklasse ─────────
  const handleCSV = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const raw = String(ev.target?.result ?? "").replace(/^﻿/, "");
        const lines = raw.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          alert("CSV braucht eine Kopfzeile und mindestens eine Datenzeile.");
          return;
        }
        const delim = lines[0].includes(";")
          ? ";"
          : lines[0].includes("\t")
            ? "\t"
            : ",";
        const head = lines[0].toLowerCase().split(delim).map((x) => x.trim().replace(/^"|"$/g, ""));
        const ni = head.findIndex((x) => x.includes("name"));
        const gi = head.findIndex((x) => x.includes("geschlecht") || x.includes("gender"));
        const noi = head.findIndex((x) => x.includes("notiz") || x.includes("bemerkung"));
        const pi = head.findIndex((x) => x.includes("vorjahr") || x.includes("klasse"));
        if (ni === -1) {
          alert("Spalte 'Name' nicht gefunden.");
          return;
        }
        const next: Student[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delim).map((x) => x.trim().replace(/^"|"$/g, ""));
          const name = cols[ni];
          if (!name) continue;
          const gr = gi >= 0 ? (cols[gi] || "").toLowerCase() : "";
          const gender: "m" | "w" | "x" =
            gr.startsWith("w") || gr.startsWith("f") ? "w" : gr.startsWith("m") || gr.startsWith("j") ? "m" : "x";
          next.push(
            makeStudent({
              name,
              gender,
              notes: noi >= 0 ? cols[noi] || "" : "",
              prevClass: pi >= 0 ? cols[pi] || "" : "",
            })
          );
        }
        if (next.length > 0) {
          setStudents(next);
          setResult(null);
          setHistory([]);
        }
      };
      reader.readAsText(file, "UTF-8");
    },
    []
  );

  // ── Schüler CRUD ─────────────────────────────────────────────────
  const addStudent = useCallback(() => {
    if (!newName.trim()) return;
    setStudents((p) => [
      ...p,
      makeStudent({
        name: newName.trim(),
        gender: newGender,
        notes: newNotes.trim(),
      }),
    ]);
    setNewName("");
    setNewNotes("");
  }, [newName, newGender, newNotes]);

  const removeStudent = useCallback(
    (id: string) => {
      setStudents((p) =>
        p
          .filter((s) => s.id !== id)
          .map((s) => ({
            ...s,
            wishes: s.wishes.filter((w) => w !== id),
            noGo: s.noGo.filter((n) => n !== id),
            siblings: s.siblings.filter((x) => x !== id),
          }))
      );
      // Pending-Matches verwerfen, deren Ursprungs-Kind gelöscht wurde
      setPendingMatches((prev) => prev.filter((m) => m.fromStudentId !== id));
      if (editingId === id) setEditingId(null);
    },
    [editingId]
  );

  const updateStudent = useCallback((id: string, patch: Partial<Student>) => {
    setStudents((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  // ── Wünsche / NoGo / Geschwister ────────────────────────────────
  const toggleWish = useCallback(
    (sid: string, tid: string) => {
      setStudents((p) =>
        p.map((s) => {
          if (s.id !== sid) return s;
          const has = s.wishes.includes(tid);
          if (has) return { ...s, wishes: s.wishes.filter((w) => w !== tid) };
          if (s.wishes.length >= config.maxWishes) return s;
          return {
            ...s,
            wishes: [...s.wishes, tid],
            noGo: s.noGo.filter((n) => n !== tid),
          };
        })
      );
    },
    [config.maxWishes]
  );

  const toggleNoGo = useCallback((sid: string, tid: string) => {
    setStudents((p) =>
      p.map((s) => {
        if (s.id !== sid) return s;
        const has = s.noGo.includes(tid);
        return {
          ...s,
          noGo: has ? s.noGo.filter((n) => n !== tid) : [...s.noGo, tid],
          wishes: has ? s.wishes : s.wishes.filter((w) => w !== tid),
        };
      })
    );
  }, []);

  const toggleSibling = useCallback((sid: string, tid: string) => {
    setStudents((p) =>
      p.map((s) => {
        if (s.id === sid) {
          return {
            ...s,
            siblings: s.siblings.includes(tid)
              ? s.siblings.filter((x) => x !== tid)
              : [...s.siblings, tid],
          };
        }
        if (s.id === tid) {
          return {
            ...s,
            siblings: s.siblings.includes(sid)
              ? s.siblings.filter((x) => x !== sid)
              : [...s.siblings, sid],
          };
        }
        return s;
      })
    );
  }, []);

  // ── Verteilung ────────────────────────────────────────────────────
  const runDistribution = useCallback(() => {
    if (students.length < config.numClasses) {
      alert(`Mindestens ${config.numClasses} Schüler*innen für ${config.numClasses} Klassen nötig.`);
      return;
    }
    setDistributing(true);
    // Im nächsten Tick rechnen, damit die UI den Loading-State zeigen kann.
    setTimeout(() => {
      try {
        const { result: best, score } = distributeBest(students, config, 15);
        setResult(best);
        setResultScore(score);
        setMoveStudent(null);
        setHistory([]);
        setScenarios(null);
        setStep("ergebnis");
      } catch (e) {
        console.error(e);
        alert("Fehler bei der Verteilung – siehe Konsole.");
      }
      setDistributing(false);
    }, 50);
  }, [students, config]);

  const runScenarios = useCallback(() => {
    if (students.length < config.numClasses) return;
    const base: DistributionConfig[] = [
      { ...config, wishWeight: 5 },
      { ...config, wishWeight: 3 },
      { ...config, wishWeight: 0 },
    ];
    const labels = ["Wünsche priorisiert", "Ausgewogen", "Balance priorisiert"];
    const out = base.map((cf, i) => {
      const { result: best, score } = distributeBest(students, cf, 12);
      return { config: cf, label: labels[i], result: best, score };
    });
    setScenarios(out);
  }, [students, config]);

  // ── Move / Lock / Undo ───────────────────────────────────────────
  const snapshot = useCallback(
    (label: string) => {
      if (!result) return;
      setHistory((p) => [
        ...p.slice(-19),
        { result: JSON.parse(JSON.stringify(result)), log: [], label },
      ]);
    },
    [result]
  );

  const doMove = useCallback(
    (toClassId: number) => {
      if (!moveStudent || !result) return;
      const { studentId, fromClassId } = moveStudent;
      if (fromClassId === toClassId) {
        setMoveStudent(null);
        return;
      }
      const student = result.find((c) => c.id === fromClassId)?.students.find((s) => s.id === studentId);
      if (!student) return;
      snapshot(`Verschiebe ${student.name}`);
      const next = result.map((c) => {
        if (c.id === fromClassId)
          return { ...c, students: c.students.filter((s) => s.id !== studentId) };
        if (c.id === toClassId) return { ...c, students: [...c.students, student] };
        return c;
      });
      setResult(next);
      setResultScore(scoreResult(next));
      setMoveStudent(null);
    },
    [moveStudent, result, snapshot]
  );

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setResult(last.result);
    setResultScore(scoreResult(last.result));
    setHistory((p) => p.slice(0, -1));
    setMoveStudent(null);
  }, [history]);

  const toggleLock = useCallback(
    (studentId: string, classId: number) => {
      const student = students.find((x) => x.id === studentId);
      if (!student) return;
      const newLocked = student.lockedClass === classId ? null : classId;
      setStudents((p) =>
        p.map((x) => (x.id === studentId ? { ...x, lockedClass: newLocked } : x))
      );
      if (result) {
        const next = result.map((c) => ({
          ...c,
          students: c.students.map((x) =>
            x.id === studentId ? { ...x, lockedClass: newLocked } : x
          ),
        }));
        setResult(next);
      }
    },
    [students, result]
  );

  // ── Persistieren als Roster ──────────────────────────────────────
  const persistRoster = useCallback(() => {
    if (!saveName.trim() || students.length === 0) return;
    const id = activeRosterId ?? makeRoster("temp").id;
    const roster: ClassRoster = {
      id,
      name: saveName.trim(),
      students,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    upsertRoster(roster);
    setActiveRosterId(id);
  }, [activeRosterId, saveName, students]);

  // ── Eltern-Wunsch-Code übernehmen ────────────────────────────────
  // Decodiert einen Rück-Code und schreibt Wünsche/NoGo in den passenden
  // Schüler. Sucht zuerst im aktiven Roster, dann in allen anderen.
  const importWunschCode = useCallback(
    (codeRaw: string): { ok: boolean; message: string } => {
      const code = codeRaw.trim().split(/\s+/).pop() ?? "";
      const result = decodeResult(code);
      if (!result) {
        return {
          ok: false,
          message: "Code konnte nicht gelesen werden – bitte erneut prüfen.",
        };
      }
      // Erst im aktuell geladenen Schüler-Set suchen
      const localRoster: ClassRoster = {
        id: activeRosterId ?? "tmp",
        name: saveName || "aktuelle Klasse",
        students,
        createdAt: 0,
        updatedAt: 0,
      };
      const local = applyResultToRoster(localRoster, result);
      if (local) {
        setStudents((p) =>
          p.map((s) =>
            s.id === local.student.id
              ? {
                  ...s,
                  wishes: local.wishes,
                  noGo: local.noGo,
                  // Eltern-Kontakt nur überschreiben, wenn neu mitgegeben
                  parentEmail: local.parentEmail ?? s.parentEmail,
                  parentName: local.parentName ?? s.parentName,
                }
              : s
          )
        );
        return {
          ok: true,
          message: `Wunsch von ${local.student.name} übernommen (${local.wishes.length} Wünsche${
            local.noGo.length > 0 ? `, ${local.noGo.length} NoGo` : ""
          }${local.parentEmail ? ", inkl. Eltern-E-Mail" : ""}).`,
        };
      }
      // Fallback: in allen gespeicherten Rostern suchen (z. B. wenn der Code
      // aus einer anderen Klasse stammt). In dem Fall laden wir den Roster.
      const allRosters = loadRosters();
      for (const r of allRosters) {
        const m = applyResultToRoster(r, result);
        if (m) {
          // Roster-Snapshot aktualisieren
          const updated: ClassRoster = {
            ...r,
            students: r.students.map((s) =>
              s.id === m.student.id
                ? {
                    ...s,
                    wishes: m.wishes,
                    noGo: m.noGo,
                    parentEmail: m.parentEmail ?? s.parentEmail,
                    parentName: m.parentName ?? s.parentName,
                  }
                : s
            ),
            updatedAt: Date.now(),
          };
          upsertRoster(updated);
          // In aktive Ansicht laden, damit Lehrkraft direkt sieht was passierte
          setActiveRosterId(r.id);
          setStudents(updated.students.map((s) => ({ ...s })));
          setSaveName(r.name);
          return {
            ok: true,
            message: `Wunsch von ${m.student.name} aus Liste „${r.name}" übernommen${
              m.parentEmail ? " (inkl. Eltern-E-Mail)" : ""
            }.`,
          };
        }
      }
      return {
        ok: false,
        message:
          "Kein passendes Kind in den Klassenlisten gefunden. Wurden Schüler*innen umbenannt oder gelöscht?",
      };
    },
    [activeRosterId, saveName, students]
  );

  // Beim Mount: Hash auf #import=… prüfen → automatisch übernehmen.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#import=")) return;
    const code = decodeURIComponent(hash.slice(8));
    const r = importWunschCode(code);
    // Hash entfernen, damit ein Reload nicht erneut importiert.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (r.ok) {
      setStep("wuensche");
    }
    // (Nachricht wird beim nächsten Render im WunschStep gezeigt, sobald
    //  der Lehrkraft-Workflow dort ankommt. Für die Sofortrückmeldung im
    //  Edge-Case zeigen wir einen kurzen Alert.)
    if (typeof window !== "undefined" && !r.ok) {
      // Nur bei Fehler explizit anzeigen — Erfolge sind im Datenstand sichtbar.
      window.alert(r.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Eltern per E-Mail benachrichtigen (Online-Sessions) ──────────
  const [notifyState, setNotifyState] = useState<
    | { stage: "idle" }
    | { stage: "running" }
    | {
        stage: "done";
        sent: number;
        skipped: number;
        smtpReady: boolean;
        eligible: number;
      }
    | { stage: "error"; message: string }
  >({ stage: "idle" });

  const notifyParents = useCallback(async () => {
    if (!result) return;

    // 1) Online-Sessions: Schüler mit registrationId+sessionId
    const sessionIds = new Set<string>();
    const sessionAssignments: {
      registration_id: string;
      assigned_class: number;
      class_label?: string;
    }[] = [];
    // 2) Offline-Wunsch-Imports: Schüler mit parentEmail (aber ohne registrationId)
    const localNotifications: {
      email: string;
      child_name: string;
      parent_name?: string;
      assigned_class: number;
      class_label?: string;
    }[] = [];

    for (const cls of result) {
      const label = formatClassLabel(cls.id, config.gradeLabel);
      for (const s of cls.students) {
        if (s.registrationId && s.sessionId) {
          sessionIds.add(s.sessionId);
          sessionAssignments.push({
            registration_id: s.registrationId,
            assigned_class: cls.id,
            class_label: label,
          });
        } else if (s.parentEmail) {
          localNotifications.push({
            email: s.parentEmail,
            child_name: s.name,
            parent_name: s.parentName,
            assigned_class: cls.id,
            class_label: label,
          });
        }
      }
    }

    const total = sessionAssignments.length + localNotifications.length;
    if (total === 0) {
      setNotifyState({
        stage: "error",
        message:
          "Keine Eltern-E-Mails gefunden. Eltern müssen entweder per Online-Anmeldung erfasst sein oder im Offline-Wunschzettel eine E-Mail eingetragen haben.",
      });
      return;
    }
    if (sessionIds.size > 1) {
      setNotifyState({
        stage: "error",
        message:
          "Schüler*innen stammen aus mehreren Online-Sessions – das wird aktuell nicht unterstützt.",
      });
      return;
    }

    if (
      !confirm(
        `${total} Eltern werden per E-Mail über die Klassenzuteilung informiert (${sessionAssignments.length} aus Online-Anmeldungen, ${localNotifications.length} aus Offline-Wunschzetteln). Fortfahren?`
      )
    ) {
      return;
    }
    setNotifyState({ stage: "running" });

    let sent = 0;
    let skipped = 0;
    let eligible = 0;
    let smtpReady = false;
    let errMsg = "";

    try {
      // Online-Anmeldungen → bestehende Session-Notify-Route
      if (sessionAssignments.length > 0) {
        const sid = [...sessionIds][0];
        const res = await fetch(
          `/api/klassenbildung/session/${encodeURIComponent(sid)}/notify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignments: sessionAssignments }),
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          errMsg = json?.error ?? "Versand fehlgeschlagen.";
        } else {
          sent += json.mails_sent ?? 0;
          skipped += json.mails_skipped ?? 0;
          eligible += json.eligible_emails ?? 0;
          smtpReady = smtpReady || (json.smtp_configured ?? false);
        }
      }

      // Offline-Wunsch-Eltern → notify-local
      if (localNotifications.length > 0) {
        const res = await fetch(`/api/klassenbildung/notify-local`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_label: saveName || "Klassenbildung",
            school_name: printSchoolName || undefined,
            contact_name: printContactName || undefined,
            contact_email: printContactEmail || undefined,
            notifications: localNotifications,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          errMsg ||= json?.error ?? "Lokale Mails fehlgeschlagen.";
        } else {
          sent += json.mails_sent ?? 0;
          skipped += json.mails_skipped ?? 0;
          eligible += json.eligible_emails ?? 0;
          smtpReady = smtpReady || (json.smtp_configured ?? false);
        }
      }

      if (errMsg && sent === 0) {
        setNotifyState({ stage: "error", message: errMsg });
        return;
      }
      setNotifyState({
        stage: "done",
        sent,
        skipped,
        smtpReady,
        eligible,
      });
    } catch {
      setNotifyState({
        stage: "error",
        message: "Verbindung zum Server fehlgeschlagen.",
      });
    }
  }, [
    result,
    saveName,
    printSchoolName,
    printContactName,
    printContactEmail,
    config.gradeLabel,
  ]);

  // ── Export & Print ───────────────────────────────────────────────
  const downloadCSV = useCallback(() => {
    if (!result) return;
    const csv = exportResultCSV(result, config.gradeLabel);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `klassenverteilung_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, config.gradeLabel]);

  // ── Statistiken (memoized) ────────────────────────────────────────
  const stats = useMemo(() => (result ? calcStats(result) : []), [result]);
  const wishReport = useMemo(
    () => (result ? analyzeWishes(result, students) : []),
    [result, students]
  );
  const wishesEntered = students.filter((s) => s.wishes.length > 0).length;
  const lockedCount = students.filter((s) => s.lockedClass).length;

  const studentCountWord = students.length === 1 ? "Schüler*in" : "Schüler*innen";

  // Setup-Wizard: beim ersten Besuch zeigen, danach nur auf Wunsch
  const [wizardForceOpen, setWizardForceOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 xl:gap-10 print:!grid-cols-1 print:!gap-0">
      <SetupWizard
        forceOpen={wizardForceOpen}
        onClose={() => setWizardForceOpen(false)}
      />
      {/* ╭─────── SIDEBAR: Klassenliste & Steps ───────╮ */}
      <aside className="space-y-5 print:hidden">
        {/* Klassenliste-Picker */}
        <div className="rounded-xl bg-white border border-border p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-3">
            Geteilte Klassenliste
          </p>
          {rosters.length > 0 ? (
            <ul className="space-y-1 max-h-44 overflow-y-auto -mx-1 px-1 mb-3">
              {rosters.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => loadFromRoster(r)}
                    className={`w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                      activeRosterId === r.id
                        ? "bg-primary text-white"
                        : "hover:bg-primary/5"
                    }`}
                  >
                    <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate flex-1">{r.name}</span>
                    <span
                      className={`font-mono text-[10px] tabular-nums shrink-0 ${
                        activeRosterId === r.id
                          ? "text-white/70"
                          : "text-text-light/70"
                      }`}
                    >
                      {r.students.length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-light mb-3">
              Noch keine Klassenlisten gespeichert.
            </p>
          )}
          <button
            type="button"
            onClick={startBlank}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-bg/40 px-3 py-2 text-xs font-bold text-text hover:bg-primary/5 hover:border-primary/30 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Leer beginnen
          </button>
          <button
            type="button"
            onClick={() => csvRef.current?.click()}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            CSV importieren
          </button>
          <input
            ref={csvRef}
            type="file"
            accept=".csv,.txt"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCSV(f);
              if (e.target) e.target.value = "";
            }}
            className="hidden"
          />
        </div>

        {/* Online-Anmeldung (server-backed) */}
        <OnlineSessions
          defaultName={saveName}
          onImport={importFromRegistrations}
        />

        {/* Schritte */}
        <nav aria-label="Arbeitsschritte" className="rounded-xl bg-white border border-border p-2 shadow-sm">
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const done =
                (s.id === "schueler" && students.length >= 2) ||
                (s.id === "wuensche" && wishesEntered > 0) ||
                (s.id === "regeln" && students.length >= config.numClasses) ||
                (s.id === "ergebnis" && !!result);
              const Icon = s.icon;
              const active = step === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStep(s.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active ? "bg-primary text-white" : "hover:bg-primary/5 text-text"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                        active
                          ? "bg-white text-primary"
                          : done
                            ? "bg-primary/10 text-primary"
                            : "bg-bg text-text-light"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="font-bold flex-1 text-left">{s.label}</span>
                    {done && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Speichern als Roster */}
        <div className="rounded-xl bg-white border border-border p-4 shadow-sm space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
            Als Klassenliste sichern
          </p>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="z. B. Jahrgang 2026"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
          />
          <button
            type="button"
            onClick={persistRoster}
            disabled={students.length === 0 || !saveName.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            Sichern
          </button>
          <p className="text-[11px] text-text-light leading-relaxed pt-1">
            Sichtbar auch in der{" "}
            <Link
              href="/werkzeuge/zufalls-auswahl"
              className="text-primary underline decoration-accent-strong/40 underline-offset-2"
            >
              Zufalls-Auswahl
            </Link>
            .
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-text leading-relaxed">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            Alles bleibt lokal in diesem Browser. Kein Server, keine Konten,
            kein Upload.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setWizardForceOpen(true)}
          className="text-[11px] text-text-light hover:text-primary underline-offset-2 hover:underline transition-colors text-left"
        >
          Tutorial wieder anzeigen
        </button>
      </aside>

      {/* ╭─────── HAUPTINHALT ───────╮ */}
      <div className="min-w-0 space-y-6 print:space-y-3">
        {/* Druck-Titel: ersetzt sichtbar die ausgeblendete Tool-Hülle */}
        <h1 className="hidden print:block text-xl font-bold text-primary border-b border-border pb-2 mb-2">
          Klassenverteilung
          {saveName && ` · ${saveName}`}
        </h1>
        {/* Status-Leiste */}
        <div className="hidden md:flex items-center gap-3 rounded-lg bg-white border border-border px-4 py-3 shadow-sm print:hidden">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-light">
            Stand
          </span>
          <span className="text-sm text-text">
            <strong className="font-bold tabular-nums">{students.length}</strong>{" "}
            {studentCountWord} ·{" "}
            <strong className="font-bold tabular-nums">{wishesEntered}</strong>{" "}
            mit Wünschen ·{" "}
            <strong className="font-bold tabular-nums">{config.numClasses}</strong>{" "}
            Klassen
            {lockedCount > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="text-amber-700">
                  <Pin className="inline h-3.5 w-3.5 mr-0.5" aria-hidden="true" />
                  {lockedCount} fixiert
                </span>
              </>
            )}
          </span>
        </div>

        {/* STEP 1: Schüler */}
        {step === "schueler" && (
          <SchuelerStep
            students={students}
            newName={newName}
            setNewName={setNewName}
            newGender={newGender}
            setNewGender={setNewGender}
            newNotes={newNotes}
            setNewNotes={setNewNotes}
            addStudent={addStudent}
            updateStudent={updateStudent}
            removeStudent={removeStudent}
            onNext={() => setStep("wuensche")}
          />
        )}

        {/* STEP 2: Wünsche */}
        {step === "wuensche" && (
          <WunschStep
            students={students}
            editingId={editingId}
            setEditingId={setEditingId}
            toggleWish={toggleWish}
            toggleNoGo={toggleNoGo}
            toggleSibling={toggleSibling}
            updatePrevClass={(id, value) => updateStudent(id, { prevClass: value })}
            maxWishes={config.maxWishes}
            rosterName={saveName || "aktuelle Klassenliste"}
            onPrev={() => setStep("schueler")}
            onNext={() => setStep("regeln")}
            onImportCode={importWunschCode}
            pendingMatches={pendingMatches}
            acceptPending={acceptPending}
            dismissAllPending={dismissAllPending}
            printSchoolName={printSchoolName}
            setPrintSchoolName={setPrintSchoolName}
            printContactName={printContactName}
            setPrintContactName={setPrintContactName}
            printContactEmail={printContactEmail}
            setPrintContactEmail={setPrintContactEmail}
          />
        )}

        {/* STEP 3: Regeln */}
        {step === "regeln" && (
          <RegelnStep
            config={config}
            setConfig={setConfig}
            students={students}
            onPrev={() => setStep("wuensche")}
            distributing={distributing}
            runDistribution={runDistribution}
            runScenarios={runScenarios}
            scenarios={scenarios}
            setScenarios={setScenarios}
            applyScenario={(s) => {
              setResult(s.result);
              setResultScore(s.score);
              setConfig(s.config);
              setScenarios(null);
              setStep("ergebnis");
              setHistory([]);
            }}
            lockedCount={lockedCount}
            unlockAll={() =>
              setStudents((p) => p.map((s) => ({ ...s, lockedClass: null })))
            }
          />
        )}

        {/* STEP 4: Ergebnis */}
        {step === "ergebnis" && (
          <ErgebnisStep
            result={result}
            score={resultScore}
            stats={stats}
            wishReport={wishReport}
            students={students}
            moveStudent={moveStudent}
            setMoveStudent={setMoveStudent}
            doMove={doMove}
            undo={undo}
            history={history}
            toggleLock={toggleLock}
            runDistribution={runDistribution}
            distributing={distributing}
            downloadCSV={downloadCSV}
            notifyParents={notifyParents}
            notifyState={notifyState}
            gradeLabel={config.gradeLabel}
          />
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// STEP 1: Schüler
// ════════════════════════════════════════════════════════════════════════

interface SchuelerStepProps {
  students: Student[];
  newName: string;
  setNewName: (v: string) => void;
  newGender: "m" | "w" | "x";
  setNewGender: (v: "m" | "w" | "x") => void;
  newNotes: string;
  setNewNotes: (v: string) => void;
  addStudent: () => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  removeStudent: (id: string) => void;
  onNext: () => void;
}

function SchuelerStep({
  students,
  newName,
  setNewName,
  newGender,
  setNewGender,
  newNotes,
  setNewNotes,
  addStudent,
  updateStudent,
  removeStudent,
  onNext,
}: SchuelerStepProps) {
  return (
    <div className="space-y-5">
      <SectionHeader
        index="01"
        eyebrow="Erster Schritt"
        title="Schüler*innen erfassen"
        body="Tragen Sie alle Kinder ein – mit Geschlecht und optionaler Notiz (z. B. „LRS“, „Förderbedarf“). Wünsche und Geschwister kommen im nächsten Schritt."
      />

      {/* Neuer Schüler */}
      <div className="rounded-xl bg-white border border-border p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-3">
          + Neue*r Schüler*in
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_auto_1fr_auto] gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Vor- und Nachname"
            onKeyDown={(e) => {
              if (e.key === "Enter") addStudent();
            }}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
          />
          <div className="grid grid-cols-3 gap-1 p-1 bg-bg rounded-lg border border-border">
            {(["m", "w", "x"] as const).map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => setNewGender(g)}
                aria-pressed={newGender === g}
                className={`rounded-md px-2 py-1 text-xs font-bold transition-colors ${
                  newGender === g
                    ? "bg-white text-primary shadow-sm"
                    : "text-text-light hover:text-primary"
                }`}
                title={g === "m" ? "Junge" : g === "w" ? "Mädchen" : "divers / unbekannt"}
              >
                {g === "m" ? "♂" : g === "w" ? "♀" : "—"}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Notiz (optional)"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
          />
          <button
            type="button"
            onClick={addStudent}
            disabled={!newName.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-text hover:bg-accent-hover transition-colors disabled:opacity-40"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Schülerliste */}
      {students.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-white/40 p-10 text-center">
          <Users className="h-8 w-8 text-text-light mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-text-light">
            Noch keine Schüler*innen erfasst – tippen Sie oben einen Namen ein
            oder importieren Sie eine CSV / wählen Sie eine vorhandene
            Klassenliste in der linken Spalte.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {students.map((s) => (
            <StudentRow
              key={s.id}
              student={s}
              updateStudent={updateStudent}
              removeStudent={removeStudent}
            />
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          disabled={students.length < 2}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          Weiter zu Wünschen
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function StudentRow({
  student,
  updateStudent,
  removeStudent,
}: {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  removeStudent: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg bg-white border border-border p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm shrink-0 ${
            student.gender === "m"
              ? "bg-blue-100 text-blue-700"
              : student.gender === "w"
                ? "bg-pink-100 text-pink-800"
                : "bg-bg text-text-light"
          }`}
          aria-hidden="true"
        >
          {student.gender === "m" ? "♂" : student.gender === "w" ? "♀" : "—"}
        </span>
        <input
          type="text"
          value={student.name}
          onChange={(e) => updateStudent(student.id, { name: e.target.value })}
          className="flex-1 min-w-0 bg-transparent border-0 px-1 py-1 text-sm font-bold text-text focus:ring-0 focus:outline-none focus:bg-bg/50 rounded"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-text-light hover:text-primary transition-colors px-2"
        >
          {open ? "↑" : "↓"}
        </button>
        <button
          type="button"
          onClick={() => removeStudent(student.id)}
          aria-label={`${student.name} entfernen`}
          className="text-text-light hover:text-red-700 transition-colors"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-text-light">
            Geschlecht
            <div className="mt-1 grid grid-cols-3 gap-1 p-1 bg-bg rounded-md">
              {(["m", "w", "x"] as const).map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => updateStudent(student.id, { gender: g })}
                  className={`rounded-sm px-2 py-0.5 text-xs font-bold transition-colors ${
                    student.gender === g
                      ? "bg-white text-primary shadow-sm"
                      : "text-text-light"
                  }`}
                >
                  {g === "m" ? "♂ Junge" : g === "w" ? "♀ Mädchen" : "— divers"}
                </button>
              ))}
            </div>
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-text-light">
            Notiz
            <input
              type="text"
              value={student.notes}
              onChange={(e) => updateStudent(student.id, { notes: e.target.value })}
              placeholder="z. B. Förderbedarf, hochbegabt"
              className="mt-1 w-full rounded-md border border-border bg-white px-2 py-1 text-sm font-normal normal-case tracking-normal focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-text-light">
            Vorjahresklasse
            <input
              type="text"
              value={student.prevClass}
              onChange={(e) => updateStudent(student.id, { prevClass: e.target.value })}
              placeholder="z. B. A"
              className="mt-1 w-full rounded-md border border-border bg-white px-2 py-1 text-sm font-normal normal-case tracking-normal focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// STEP 2: Wünsche
// ════════════════════════════════════════════════════════════════════════

interface WunschStepProps {
  students: Student[];
  editingId: string | null;
  setEditingId: (v: string | null) => void;
  toggleWish: (sid: string, tid: string) => void;
  toggleNoGo: (sid: string, tid: string) => void;
  toggleSibling: (sid: string, tid: string) => void;
  updatePrevClass: (id: string, value: string) => void;
  maxWishes: number;
  rosterName: string;
  onPrev: () => void;
  onNext: () => void;
  onImportCode: (code: string) => { ok: boolean; message: string };
  pendingMatches: PendingMatch[];
  acceptPending: (id: string, targetStudentId: string | null) => void;
  dismissAllPending: () => void;
  printSchoolName: string;
  setPrintSchoolName: (v: string) => void;
  printContactName: string;
  setPrintContactName: (v: string) => void;
  printContactEmail: string;
  setPrintContactEmail: (v: string) => void;
}

function WunschStep(props: WunschStepProps) {
  const {
    students,
    editingId,
    setEditingId,
    toggleWish,
    toggleNoGo,
    toggleSibling,
    maxWishes,
    rosterName,
    onPrev,
    onNext,
    onImportCode,
    pendingMatches,
    acceptPending,
    dismissAllPending,
    printSchoolName,
    setPrintSchoolName,
    printContactName,
    setPrintContactName,
    printContactEmail,
    setPrintContactEmail,
  } = props;
  const [importInput, setImportInput] = useState("");
  const [importMsg, setImportMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const handleImport = () => {
    if (!importInput.trim()) return;
    const r = onImportCode(importInput.trim());
    setImportMsg(r);
    if (r.ok) setImportInput("");
    setTimeout(() => setImportMsg(null), 4500);
  };

  return (
    <>
    <div className="space-y-5 print:hidden">
      <SectionHeader
        index="02"
        eyebrow="Wünsche & Beziehungen"
        title="Wer möchte mit wem? Wer auf keinen Fall?"
        body={
          <>
            Pro Kind bis zu <strong>{maxWishes}</strong> Wünsche (💚) und beliebig
            viele NoGo-Paare (🚫). Geschwister (👫) lassen sich gezielt zusammen
            oder getrennt verteilen.
          </>
        }
      />

      {/* Pending-Matches Review (Online-Import) */}
      {pendingMatches.length > 0 && (
        <PendingMatchesPanel
          pendingMatches={pendingMatches}
          students={students}
          acceptPending={acceptPending}
          dismissAllPending={dismissAllPending}
        />
      )}

      {/* Eltern-Erfassung: Druckformulare + Code-Import */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PrintCard
          students={students}
          schoolName={printSchoolName}
          setSchoolName={setPrintSchoolName}
          contactName={printContactName}
          setContactName={setPrintContactName}
          contactEmail={printContactEmail}
          setContactEmail={setPrintContactEmail}
        />
        <div className="rounded-xl bg-white border border-border p-4 shadow-sm">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
            <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
            Wunsch-Code von Eltern übernehmen
          </p>
          <p className="text-xs text-text-light leading-relaxed mb-2">
            Code aus E-Mail / Zettel hier einfügen.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Code einfügen…"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleImport();
              }}
              className="flex-1 min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={!importInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-text px-3 py-2 text-xs font-bold hover:bg-accent-hover transition-colors disabled:opacity-40 shrink-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Übernehmen
            </button>
          </div>
          {importMsg && (
            <p
              className={`mt-2 text-xs leading-relaxed ${
                importMsg.ok ? "text-emerald-700" : "text-red-700"
              }`}
              role="status"
            >
              {importMsg.ok ? (
                <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
              ) : (
                <AlertTriangle className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
              )}
              {importMsg.message}
            </p>
          )}
        </div>
      </div>

      {/* Schülerkarten */}
      <div className="space-y-2">
        {students.map((s) => {
          const isEd = editingId === s.id;
          const wishesNames = s.wishes
            .map((id) => students.find((x) => x.id === id)?.name)
            .filter(Boolean);
          const noGoNames = s.noGo
            .map((id) => students.find((x) => x.id === id)?.name)
            .filter(Boolean);
          const siblingNames = s.siblings
            .map((id) => students.find((x) => x.id === id)?.name)
            .filter(Boolean);
          return (
            <div
              key={s.id}
              className={`rounded-xl bg-white border shadow-sm transition-colors ${
                isEd ? "border-accent-strong" : "border-border"
              }`}
            >
              <div
                className="flex items-center gap-2 p-3 cursor-pointer"
                onClick={() => setEditingId(isEd ? null : s.id)}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm shrink-0 ${
                    s.gender === "m"
                      ? "bg-blue-100 text-blue-700"
                      : s.gender === "w"
                        ? "bg-pink-100 text-pink-800"
                        : "bg-bg text-text-light"
                  }`}
                  aria-hidden="true"
                >
                  {s.gender === "m" ? "♂" : s.gender === "w" ? "♀" : "—"}
                </span>
                <span className="font-bold text-sm flex-1 min-w-0 truncate">
                  {s.name}
                </span>
                <span className="hidden sm:flex items-center gap-2 text-xs text-text-light">
                  {wishesNames.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                      <span className="tabular-nums">{wishesNames.length}</span>
                    </span>
                  )}
                  {noGoNames.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Ban className="h-3 w-3 text-red-600" aria-hidden="true" />
                      <span className="tabular-nums">{noGoNames.length}</span>
                    </span>
                  )}
                  {siblingNames.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3 text-violet-700" aria-hidden="true" />
                      <span className="tabular-nums">{siblingNames.length}</span>
                    </span>
                  )}
                </span>
                <span className="text-text-light text-xs">
                  {isEd ? "Schließen" : "Bearbeiten"}
                </span>
              </div>
              {isEd && (
                <div className="border-t border-border p-3 bg-bg/30">
                  <p className="text-[11px] text-text-light mb-2">
                    Klick auf 💚 = Wunsch · 🚫 = NoGo · 👫 = Geschwister
                    {s.wishes.length > 0 && (
                      <>
                        {" "}
                        · Wünsche: {s.wishes.length}/{maxWishes}
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {students
                      .filter((o) => o.id !== s.id)
                      .map((o) => {
                        const isW = s.wishes.includes(o.id);
                        const isN = s.noGo.includes(o.id);
                        const isSib = s.siblings.includes(o.id);
                        return (
                          <div
                            key={o.id}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs border ${
                              isW
                                ? "bg-emerald-50 border-emerald-300"
                                : isN
                                  ? "bg-red-50 border-red-300"
                                  : isSib
                                    ? "bg-violet-50 border-violet-300"
                                    : "bg-white border-border"
                            }`}
                          >
                            <span className="font-medium">
                              {o.name.split(" ")[0]}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleWish(s.id, o.id)}
                              className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] transition-colors ${
                                isW
                                  ? "bg-emerald-600 text-white"
                                  : "bg-white border border-border text-text-light hover:bg-emerald-50 hover:text-emerald-600"
                              }`}
                              title="Wunsch"
                            >
                              💚
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleNoGo(s.id, o.id)}
                              className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] transition-colors ${
                                isN
                                  ? "bg-red-600 text-white"
                                  : "bg-white border border-border text-text-light hover:bg-red-50 hover:text-red-600"
                              }`}
                              title="NoGo"
                            >
                              🚫
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSibling(s.id, o.id)}
                              className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] transition-colors ${
                                isSib
                                  ? "bg-violet-600 text-white"
                                  : "bg-white border border-border text-text-light hover:bg-violet-50 hover:text-violet-700"
                              }`}
                              title="Geschwister"
                            >
                              👫
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-bold text-text hover:bg-bg transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Zurück
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
        >
          Weiter zu Regeln
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    {/* Druck-Vorlagen für Eltern – nur beim Drucken sichtbar */}
    <PrintForms
      students={students}
      maxWishes={maxWishes}
      rosterName={rosterName}
      schoolName={printSchoolName}
      contactName={printContactName}
      contactEmail={printContactEmail}
    />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Pending-Matches-Review Panel
// Editorial-„Korrektur-Stapel": jede ungeklärte Eltern-Eingabe als Karte
// mit Vorschlägen. Confidence-gefärbt; Lehrkraft entscheidet manuell.
// ════════════════════════════════════════════════════════════════════════

function PendingMatchesPanel({
  pendingMatches,
  students,
  acceptPending,
  dismissAllPending,
}: {
  pendingMatches: PendingMatch[];
  students: Student[];
  acceptPending: (id: string, targetStudentId: string | null) => void;
  dismissAllPending: () => void;
}) {
  const studentsById = useMemo(() => {
    const m = new Map<string, Student>();
    for (const s of students) m.set(s.id, s);
    return m;
  }, [students]);

  // Vorschlags-Kandidaten = aktuelle Schülerliste. Wird sich ändern,
  // wenn Lehrkraft nachträglich Schüler*innen ergänzt – Vorschläge
  // werden dann automatisch neu berechnet.
  const candidates = useMemo(
    () => students.map((s) => ({ id: s.id, name: s.name })),
    [students]
  );

  // Filter: Pending, deren fromStudent gar nicht mehr existiert,
  // werden gar nicht erst angezeigt (Robustheit gegen Löschungen).
  const validPending = useMemo(
    () => pendingMatches.filter((p) => studentsById.has(p.fromStudentId)),
    [pendingMatches, studentsById]
  );

  // Gruppiere nach Eltern-Eingabe (Kind), damit zusammenhängende
  // Korrekturen visuell zusammenbleiben.
  const grouped = useMemo(() => {
    const map = new Map<string, PendingMatch[]>();
    for (const p of validPending) {
      const arr = map.get(p.fromStudentId) ?? [];
      arr.push(p);
      map.set(p.fromStudentId, arr);
    }
    return Array.from(map.entries());
  }, [validPending]);

  if (validPending.length === 0) return null;

  return (
    <section
      role="region"
      aria-label="Eltern-Eingaben zur Bestätigung"
      className="relative overflow-hidden rounded-2xl bg-white border-2 border-accent-strong/35 shadow-md"
    >
      {/* Diagonale Warn-Streifen oben (Korrektur-Signal) */}
      <div
        aria-hidden="true"
        className="h-2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #AB7A0E 0 12px, #E8A838 12px 24px)",
        }}
      />
      {/* Subtiles Raster */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #AB7A0E 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, #AB7A0E 0 1px, transparent 1px 24px)",
        }}
      />

      <header className="relative flex items-start gap-4 p-5 md:p-6 border-b border-border">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-strong text-white shrink-0 shadow-lg shadow-accent/30">
          <Sparkles className="h-6 w-6" aria-hidden="true" strokeWidth={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-strong mb-1 inline-flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-strong" />
            Eltern-Eingaben prüfen
          </p>
          <h3 className="text-lg md:text-xl font-bold text-primary leading-tight tracking-tight">
            {validPending.length} freie Eingabe
            {validPending.length === 1 ? "" : "n"} – Zuordnung bestätigen
          </h3>
          <p className="text-xs text-text-light leading-relaxed mt-1.5 max-w-2xl">
            Eltern haben die folgenden Namen frei eingetippt. Ein eindeutiger
            Treffer wurde nicht gefunden – meist wegen Schreibweise (z. B. nur
            Vorname, Initialen, Umlaute). Bitte einmal pro Eintrag bestätigen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                "Alle offenen Vorschläge verwerfen? Die Eltern-Eingaben gehen verloren – die Klassenverteilung läuft dann ohne diese Wünsche."
              )
            )
              dismissAllPending();
          }}
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-light hover:text-red-700 underline-offset-2 hover:underline transition-colors shrink-0"
        >
          Alle verwerfen
        </button>
      </header>

      <div className="relative divide-y divide-border">
        {grouped.map(([fromId, items], gi) => {
          const child = studentsById.get(fromId);
          return (
            <div
              key={fromId}
              className="p-5 md:p-6 space-y-3"
              style={{
                animation: `pending-in 320ms ${Math.min(gi * 60, 360)}ms cubic-bezier(0.22,0.61,0.36,1) both`,
              }}
            >
              <div className="flex items-baseline gap-3 pb-2">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs shrink-0 ${
                    child?.gender === "m"
                      ? "bg-blue-100 text-blue-700"
                      : child?.gender === "w"
                        ? "bg-pink-100 text-pink-800"
                        : "bg-bg text-text-light"
                  }`}
                  aria-hidden="true"
                >
                  {child?.gender === "m"
                    ? "♂"
                    : child?.gender === "w"
                      ? "♀"
                      : "—"}
                </span>
                <p className="font-bold text-text">
                  {child?.name ?? "Unbekanntes Kind"}
                </p>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-light">
                  {items.length} offen
                </span>
              </div>

              <ul className="space-y-2">
                {items.map((item) => (
                  <PendingRow
                    key={item.id}
                    item={item}
                    candidates={candidates}
                    onAccept={(targetId) => acceptPending(item.id, targetId)}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pending-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation: pending-in"] { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

function PendingRow({
  item,
  candidates,
  onAccept,
}: {
  item: PendingMatch;
  candidates: { id: string; name: string }[];
  onAccept: (targetId: string | null) => void;
}) {
  // Vorschläge live aus aktueller Schülerliste — so kommen nachträglich
  // angelegte Schüler*innen automatisch als mögliche Treffer dazu.
  const suggestions = useMemo(() => {
    return findNameMatches(item.rawName, candidates).filter(
      (s) => s.id !== item.fromStudentId
    );
  }, [item.rawName, item.fromStudentId, candidates]);

  const catLabel =
    item.category === "wish"
      ? "möchte mit"
      : item.category === "noGo"
        ? "lieber NICHT mit"
        : "Geschwisterkind";
  const catIcon =
    item.category === "wish" ? (
      <Heart className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
    ) : item.category === "noGo" ? (
      <Ban className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
    ) : (
      <Users className="h-3.5 w-3.5 text-violet-700" aria-hidden="true" />
    );

  return (
    <li className="rounded-xl bg-bg/40 border border-border p-3 md:p-4">
      <div className="flex items-baseline gap-2 mb-2.5">
        {catIcon}
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-light">
          {catLabel}
        </span>
        <span className="font-mono text-base font-bold text-primary px-2 py-0.5 rounded bg-white border border-border tabular-nums">
          „{item.rawName}"
        </span>
      </div>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <SuggestionChip
              key={s.id}
              suggestion={s}
              onPick={() => onAccept(s.id)}
            />
          ))}
          <button
            type="button"
            onClick={() => onAccept(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-text-light hover:bg-bg hover:text-text transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Niemand / verwerfen
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-text-light leading-relaxed flex-1 min-w-[14rem]">
            <AlertTriangle
              className="inline h-3.5 w-3.5 mr-1 text-amber-600"
              aria-hidden="true"
            />
            Noch kein passendes Kind. Sobald Sie diese*n Schüler*in manuell
            anlegen, erscheint hier automatisch ein Vorschlag.
          </p>
          <button
            type="button"
            onClick={() => onAccept(null)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-text-light/10 border border-border px-3 py-2 text-xs font-bold text-text hover:bg-bg transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Verwerfen
          </button>
        </div>
      )}
    </li>
  );
}

function SuggestionChip({
  suggestion,
  onPick,
}: {
  suggestion: NameSuggestion;
  onPick: () => void;
}) {
  const pct = Math.round(suggestion.score * 100);
  const tone =
    suggestion.score >= 0.9
      ? "border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
      : suggestion.score >= 0.78
        ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
        : "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100";
  const barColor =
    suggestion.score >= 0.9
      ? "bg-emerald-600"
      : suggestion.score >= 0.78
        ? "bg-primary"
        : "bg-amber-600";

  return (
    <button
      type="button"
      onClick={onPick}
      className={`group relative inline-flex flex-col items-stretch gap-1.5 rounded-lg border-2 px-3 py-2 text-left transition-colors min-w-[140px] ${tone}`}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold leading-tight">{suggestion.name}</span>
        <span className="font-mono text-[10px] tabular-nums opacity-70 ml-auto">
          {pct}%
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/60 overflow-hidden">
        <span
          className={`block h-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
}

// Druckansicht: Eltern-Wunschzettel — eine ganze A4-Seite pro Kind.
// Primärer CTA: QR-Code zum Online-Ausfüllen am Smartphone.
// Backup unten: Papier-Checkboxen, falls kein Smartphone zur Hand.
/**
 * Sind für dieses Kind bereits Präferenzen erfasst (lokal oder online)?
 * Solche Kinder bekommen kein Eltern-Druckformular mehr.
 */
function alreadyHasPreferences(s: Student): boolean {
  return (
    !!s.registrationId ||
    s.wishes.length > 0 ||
    s.noGo.length > 0 ||
    s.siblings.length > 0
  );
}

/**
 * UI-Karte mit dem Druck-Button — informiert über automatisch
 * ausgenommene Kinder und enthält ein einklappbares Feld für die
 * Schul-Ansprechperson, die in jedem QR/Druckformular landet.
 */
function PrintCard({
  students,
  schoolName,
  setSchoolName,
  contactName,
  setContactName,
  contactEmail,
  setContactEmail,
}: {
  students: Student[];
  schoolName: string;
  setSchoolName: (v: string) => void;
  contactName: string;
  setContactName: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
}) {
  const printable = students.filter((s) => !alreadyHasPreferences(s));
  const excluded = students.length - printable.length;
  const hasContact = !!(schoolName || contactName || contactEmail);
  const [contactOpen, setContactOpen] = useState(hasContact);
  return (
    <div className="rounded-xl bg-white border border-border p-4 shadow-sm">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-text-light mb-2">
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        Eltern-Formulare drucken
      </p>
      <p className="text-xs text-text-light leading-relaxed mb-3">
        Eine A4-Seite pro Kind mit großem QR-Code für die Online-Erfassung
        am Smartphone — kein Schneiden nötig.
      </p>

      {/* Kontakt-Block (einklappbar) */}
      <div className="mb-3 rounded-lg border border-dashed border-border bg-bg/40">
        <button
          type="button"
          onClick={() => setContactOpen((o) => !o)}
          aria-expanded={contactOpen}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg/60 transition-colors rounded-lg"
        >
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 rounded-full shrink-0 ${
              hasContact ? "bg-emerald-500" : "bg-text-light/40"
            }`}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-light flex-1">
            Schul-Ansprechperson{" "}
            <span className="font-normal normal-case tracking-normal text-text-light/70">
              {hasContact ? "· erfasst" : "· empfohlen"}
            </span>
          </span>
          <span className="text-[10px] text-text-light">
            {contactOpen ? "▲" : "▼"}
          </span>
        </button>
        {contactOpen && (
          <div className="px-3 pb-3 space-y-1.5 border-t border-border/60 pt-2">
            <p className="text-[10px] text-text-light leading-relaxed mb-1">
              Erscheint in jedem gedruckten Wunschzettel und auch in der
              QR-Online-Maske, sodass Eltern wissen, wen sie ansprechen können.
            </p>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Schulname (z. B. Mustergrundschule)"
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Ansprechperson (z. B. Frau Müller)"
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="kontakt@schule.de"
              autoComplete="email"
              inputMode="email"
              className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        disabled={printable.length === 0}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-3 py-2 text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
      >
        <Printer className="h-3.5 w-3.5" aria-hidden="true" />
        {printable.length} Formular{printable.length === 1 ? "" : "e"} drucken
      </button>
      {excluded > 0 && (
        <p className="mt-2 text-[11px] text-text-light leading-relaxed">
          <CheckCircle2
            className="inline h-3 w-3 mr-1 text-emerald-600"
            aria-hidden="true"
          />
          <strong className="text-text">{excluded}</strong> Kind
          {excluded === 1 ? "" : "er"} übersprungen — Wünsche schon erfasst
          oder Online-Anmeldung vorhanden.
        </p>
      )}
      {printable.length === 0 && students.length > 0 && (
        <p className="mt-2 text-[11px] text-emerald-700 leading-relaxed font-bold">
          Alle Kinder haben bereits Präferenzen — keine Druckformulare nötig.
        </p>
      )}
    </div>
  );
}

function PrintForms({
  students,
  maxWishes,
  rosterName,
  schoolName,
  contactName,
  contactEmail,
}: {
  students: Student[];
  maxWishes: number;
  rosterName: string;
  schoolName: string;
  contactName: string;
  contactEmail: string;
}) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState("");

  // Nur Kinder ohne Präferenzen werden gedruckt — alles andere wäre
  // verschwendetes Papier (online angemeldet, Wünsche schon gesetzt).
  const studentsToPrint = useMemo(
    () => students.filter((s) => !alreadyHasPreferences(s)),
    [students]
  );

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      // Wir bauen einen Roster-ähnlichen Container ohne realen ID/Timestamps,
      // weil buildPayloadForStudent nur students[] und name braucht.
      const fakeRoster = {
        id: "tmp",
        name: rosterName || "Klassenliste",
        students,
        createdAt: 0,
        updatedAt: 0,
      };
      for (const s of studentsToPrint) {
        const payload = buildPayloadForStudent(fakeRoster, s, maxWishes, {
          schoolName,
          contactName,
          contactEmail,
        });
        const url = `${origin}/werkzeuge/klassenverteilung/wunsch#p=${encodePayload(payload)}`;
        try {
          next[s.id] = await QRCode.toDataURL(url, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 480,
          });
        } catch {
          next[s.id] = "";
        }
      }
      if (!cancelled) setQrMap(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    students,
    studentsToPrint,
    maxWishes,
    rosterName,
    origin,
    schoolName,
    contactName,
    contactEmail,
  ]);

  // SSR-Schutz: Portal nur clientseitig
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (studentsToPrint.length === 0) {
    // Nichts zu drucken — keine Eltern-Formulare nötig.
    return null;
  }
  if (!mounted) return null;

  // Wir rendern via Portal direkt an document.body, um aus allen
  // Grid-/Flex-Eltern-Containern auszubrechen. Beim Druck wird ALLES
  // andere im body ausgeblendet, sodass nur unsere Formulare bleiben –
  // das macht Page-Breaks zuverlässig.
  return createPortal(
    <div className="wunsch-print-host">
      <style>{`
        @media screen {
          .wunsch-print-host { display: none; }
        }
        @media print {
          @page { margin: 1.4cm; }
          html, body { background: white !important; }
          /* Im Druck: alles im Body ausblenden außer unserem Container.
             Damit gibt es keine konkurrierenden Layouts und keine
             versehentlichen Leerseiten. */
          body > *:not(.wunsch-print-host) {
            display: none !important;
          }
          .wunsch-print-host {
            display: block !important;
            position: static !important;
            width: 100% !important;
          }
          .wunsch-form-wrapper {
            display: block !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            /* Page-Break NACH jeder Karte, damit jedes Kind seine
               eigene A4-Seite bekommt. */
            break-after: page !important;
            page-break-after: always !important;
          }
          .wunsch-form-wrapper:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }
          .wunsch-form {
            display: block !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      {studentsToPrint.map((s) => (
        <div key={s.id} className="wunsch-form-wrapper">
        <div
          className="wunsch-form bg-white"
        >
          {/* Kopfzeile */}
          <div className="flex items-baseline justify-between border-b-2 border-primary pb-2 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-text-light">
                {schoolName ? schoolName : "DigiKI · Klassenbildung"}
              </p>
              <p className="text-sm font-bold text-primary">Wunschzettel</p>
            </div>
            <p className="text-[10px] text-text-light font-mono">
              {rosterName}
            </p>
          </div>

          {/* Name */}
          <p className="text-[11px] uppercase tracking-[0.18em] text-text-light mb-1">
            Für
          </p>
          <h2 className="text-4xl font-bold text-primary tracking-tight mb-6">
            {s.name}
          </h2>

          {/* Hauptteil: QR + Anleitung */}
          <div className="grid grid-cols-[auto_1fr] gap-6 items-start mb-6">
            <div className="border-2 border-text/15 rounded-xl p-3 bg-white">
              {qrMap[s.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrMap[s.id]}
                  alt={`QR-Code für ${s.name}`}
                  width={220}
                  height={220}
                  className="block"
                />
              ) : (
                <div className="h-[220px] w-[220px] flex items-center justify-center text-xs text-text-light">
                  Code wird vorbereitet…
                </div>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] font-bold text-accent-strong mb-1">
                Online ausfüllen — geht in 2 Minuten
              </p>
              <h3 className="text-lg font-bold text-text leading-tight mb-3">
                📱 Smartphone-Kamera auf den Code richten
              </h3>
              <ol className="space-y-1.5 text-[12px] text-text leading-relaxed list-decimal list-inside">
                <li>Kamera-App öffnen, auf den QR-Code richten.</li>
                <li>Auf den Hinweis tippen, der erscheint.</li>
                <li>Bis zu <strong>{maxWishes} Wunschkinder</strong> auswählen.</li>
                <li>Auf <strong>„Fertig"</strong> tippen, der entstandene Code geht zurück an die Schule.</li>
              </ol>
              <p className="text-[10px] text-text-light leading-relaxed mt-3 border-l-2 border-border pl-2">
                Daten verlassen Ihr Handy nicht. Erst wenn Sie aktiv den
                Bestätigungs-Code zurückgeben, sieht die Schule die Auswahl.
              </p>
            </div>
          </div>

          {/* Backup-Eintragsbereich */}
          <div className="border border-dashed border-border rounded-lg p-4 bg-bg/40">
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-light mb-3">
              Falls kein Smartphone griffbereit ist — Backup
            </p>
            <div className="mb-3">
              <p className="text-xs font-bold text-emerald-800 mb-1.5">
                💚 Wunschkinder (bis zu {maxWishes} ankreuzen):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {students
                  .filter((o) => o.id !== s.id)
                  .map((o) => (
                    <span
                      key={o.id}
                      className="rounded border border-text/20 bg-white px-2 py-0.5 text-[10px]"
                    >
                      ☐ {o.name}
                    </span>
                  ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-red-800 mb-1.5">
                🚫 NoGo — lieber nicht zusammen (optional, Namen eintragen):
              </p>
              <div className="border-b border-text/30 h-5" />
            </div>
          </div>

          {/* Kontakt + Legal Footer auf dem Druckbogen */}
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-4 pt-3 border-t border-text/15">
            <div className="text-[9px] text-text leading-relaxed">
              {(contactName || contactEmail) && (
                <>
                  <p className="text-[8px] uppercase tracking-[0.18em] text-text-light mb-0.5">
                    Bei Rückfragen
                  </p>
                  {contactName && (
                    <p className="font-bold text-text">{contactName}</p>
                  )}
                  {contactEmail && (
                    <p className="font-mono text-text-light">{contactEmail}</p>
                  )}
                </>
              )}
            </div>
            <div className="text-[8px] text-text-light text-right leading-relaxed">
              <p>digiki-os.de/impressum</p>
              <p>digiki-os.de/datenschutz</p>
              <p>digiki-os.de/barrierefreiheit</p>
            </div>
          </div>

          <p className="text-[8px] text-text-light leading-relaxed mt-3">
            Lokale Verarbeitung im Browser der Schule, Löschung nach Abschluss
            der Klassenbildung. Rechtsgrundlage: Art. 6 Abs. 1 lit. e DSGVO
            i. V. m. § 31 NSchG. Onlineformular: kein Server-Upload, Daten
            verbleiben im Browser.
          </p>
        </div>
        </div>
      ))}
    </div>,
    document.body
  );
}

// ════════════════════════════════════════════════════════════════════════
// STEP 3: Regeln
// ════════════════════════════════════════════════════════════════════════

interface RegelnStepProps {
  config: DistributionConfig;
  setConfig: React.Dispatch<React.SetStateAction<DistributionConfig>>;
  students: Student[];
  onPrev: () => void;
  distributing: boolean;
  runDistribution: () => void;
  runScenarios: () => void;
  scenarios:
    | {
        config: DistributionConfig;
        label: string;
        result: ClassResult[];
        score: ResultScore;
      }[]
    | null;
  setScenarios: (
    s:
      | {
          config: DistributionConfig;
          label: string;
          result: ClassResult[];
          score: ResultScore;
        }[]
      | null
  ) => void;
  applyScenario: (s: {
    config: DistributionConfig;
    label: string;
    result: ClassResult[];
    score: ResultScore;
  }) => void;
  lockedCount: number;
  unlockAll: () => void;
}

function RegelnStep(props: RegelnStepProps) {
  const {
    config,
    setConfig,
    students,
    onPrev,
    distributing,
    runDistribution,
    runScenarios,
    scenarios,
    applyScenario,
    lockedCount,
    unlockAll,
  } = props;

  const expectedSize = Math.ceil(students.length / config.numClasses);

  return (
    <div className="space-y-5">
      <SectionHeader
        index="03"
        eyebrow="Konfiguration"
        title="Verteilungsregeln festlegen"
        body="Definieren Sie, wie die Klassen aufgeteilt werden sollen. Sie können später jederzeit Schüler*innen manuell verschieben."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white border border-border p-5 shadow-sm">
          <h3 className="text-[15px] font-bold text-primary mb-4">
            Grundeinstellungen
          </h3>
          <div className="space-y-5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-light block mb-2">
                Jahrgangsstufe (Vorzeichen)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={config.gradeLabel}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      gradeLabel: e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 2),
                    }))
                  }
                  inputMode="numeric"
                  placeholder="1"
                  className="w-16 h-10 rounded-lg border border-border bg-white px-2 text-center text-base font-bold text-primary focus:ring-2 focus:ring-accent-strong focus:border-accent-strong outline-none"
                />
                <span className="text-xs text-text-light">
                  → Klassen heißen z. B.{" "}
                  <strong className="font-mono text-primary">
                    {formatClassLabel(1, config.gradeLabel)}
                  </strong>
                  ,{" "}
                  <strong className="font-mono text-primary">
                    {formatClassLabel(2, config.gradeLabel)}
                  </strong>
                  {config.numClasses > 2 && (
                    <>
                      ,{" "}
                      <strong className="font-mono text-primary">
                        {formatClassLabel(3, config.gradeLabel)}
                      </strong>
                    </>
                  )}
                  {" …"}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-text-light">
                Standard: 1. Buchstaben werden automatisch vergeben.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-light block mb-2">
                Anzahl Klassen
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setConfig((p) => ({ ...p, numClasses: n }))}
                    aria-pressed={config.numClasses === n}
                    className={`h-10 w-10 rounded-lg text-sm font-bold transition-colors ${
                      config.numClasses === n
                        ? "bg-primary text-white shadow-sm"
                        : "bg-bg text-primary hover:bg-primary/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-text-light">
                {students.length} Kinder, {config.numClasses} Klassen → ca.{" "}
                <strong className="text-text tabular-nums">{expectedSize}</strong>{" "}
                pro Klasse
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-light block mb-2">
                Maximale Wünsche pro Kind: {config.maxWishes}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={config.maxWishes}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, maxWishes: parseInt(e.target.value, 10) }))
                }
                className="w-full accent-primary"
              />
              <p className="text-xs text-text-light mt-1">
                <strong>1–2:</strong> Hohe Erfüllungsquote ·{" "}
                <strong>3–5:</strong> Mehr Mitsprache, schwerer erfüllbar
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-light block mb-2">
                Wunsch-Gewichtung:{" "}
                <strong className="text-text">
                  {config.wishWeight === 0
                    ? "Aus"
                    : config.wishWeight <= 1
                      ? "Niedrig"
                      : config.wishWeight <= 3
                        ? "Mittel"
                        : "Hoch"}
                </strong>
              </label>
              <input
                type="range"
                min={0}
                max={5}
                value={config.wishWeight}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, wishWeight: parseInt(e.target.value, 10) }))
                }
                className="w-full accent-accent-strong"
              />
              <p className="text-xs text-text-light mt-1">
                <strong>Hoch:</strong> Wunschpaare zusammen ·{" "}
                <strong>Aus:</strong> nur Gleichverteilung
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-border p-5 shadow-sm">
          <h3 className="text-[15px] font-bold text-primary mb-4">
            Verteilungsregeln
          </h3>
          <div className="space-y-1">
            <ToggleRow
              label="Geschlechterbalance"
              desc="♂ und ♀ möglichst gleich verteilen"
              value={config.genderBalance}
              onChange={(v) => setConfig((p) => ({ ...p, genderBalance: v }))}
            />
            <ToggleRow
              label="Förderkinder verteilen"
              desc="Notizen aufteilen, nicht in einer Klasse häufen"
              value={config.distributeNotes}
              onChange={(v) => setConfig((p) => ({ ...p, distributeNotes: v }))}
            />
            <ToggleRow
              label="Vorjahresklassen mischen"
              desc="Alte Klassengemeinschaften aufbrechen"
              value={config.prevClassSeparate}
              onChange={(v) => setConfig((p) => ({ ...p, prevClassSeparate: v }))}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-light mb-2">
              👫 Geschwister
            </p>
            <div className="grid grid-cols-3 gap-1 p-1 bg-bg rounded-lg">
              {(
                [
                  { v: "none", l: "Egal" },
                  { v: "separate", l: "Trennen" },
                  { v: "together", l: "Zusammen" },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, siblingRule: o.v }))}
                  aria-pressed={config.siblingRule === o.v}
                  className={`rounded-md px-2 py-1.5 text-xs font-bold transition-colors ${
                    config.siblingRule === o.v
                      ? "bg-white text-primary shadow-sm"
                      : "text-text-light hover:text-primary"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {lockedCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4">
          <Pin className="h-5 w-5 text-amber-700 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">
              {lockedCount} Schüler*in{lockedCount === 1 ? "" : "nen"} fixiert
            </p>
            <p className="text-xs text-amber-800">
              Diese Kinder bleiben bei jeder Neuberechnung in ihrer Klasse.
            </p>
          </div>
          <button
            type="button"
            onClick={unlockAll}
            className="text-xs font-bold text-amber-900 underline hover:text-amber-950"
          >
            Alle lösen
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={runDistribution}
          disabled={students.length < config.numClasses || distributing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-4 text-base font-bold text-text hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          {distributing ? (
            <Shuffle className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          )}
          {distributing ? "Berechne…" : "Beste Verteilung finden"}
        </button>
        <button
          type="button"
          onClick={runScenarios}
          disabled={students.length < config.numClasses}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-4 text-base font-bold text-primary hover:bg-primary/5 transition-colors disabled:opacity-40"
        >
          <ListPlus className="h-5 w-5" aria-hidden="true" />
          3 Szenarien vergleichen
        </button>
      </div>

      {scenarios && (
        <div className="space-y-2">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.18em] text-text-light">
            Szenario-Vergleich
          </h3>
          {scenarios.map((s, i) => {
            const pct =
              s.score.wishesTotal > 0
                ? Math.round((s.score.wishesMet / s.score.wishesTotal) * 100)
                : 0;
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border bg-white p-4"
              >
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg font-bold tabular-nums shrink-0 ${
                    i === 0
                      ? "bg-red-100 text-red-700"
                      : i === 1
                        ? "bg-accent/15 text-accent-strong"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {pct}%
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{s.label}</p>
                  <p className="text-xs text-text-light">
                    Wünsche {s.score.wishesMet}/{s.score.wishesTotal} · ♂♀±
                    {s.score.genderDiff} · 🚫 {s.score.noGoViolations}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => applyScenario(s)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary text-white px-3 py-2 text-xs font-bold hover:bg-primary/90 transition-colors"
                >
                  Übernehmen
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-bold text-text hover:bg-bg transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Zurück
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
          value ? "bg-primary" : "bg-text-light/30"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text">{label}</p>
        <p className="text-xs text-text-light">{desc}</p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// STEP 4: Ergebnis
// ════════════════════════════════════════════════════════════════════════

type NotifyState =
  | { stage: "idle" }
  | { stage: "running" }
  | {
      stage: "done";
      sent: number;
      skipped: number;
      smtpReady: boolean;
      eligible: number;
    }
  | { stage: "error"; message: string };

interface ErgebnisStepProps {
  result: ClassResult[] | null;
  score: ResultScore | null;
  stats: ReturnType<typeof calcStats>;
  wishReport: UnmetWishReport[];
  students: Student[];
  moveStudent: { studentId: string; fromClassId: number } | null;
  setMoveStudent: (
    s: { studentId: string; fromClassId: number } | null
  ) => void;
  doMove: (toClassId: number) => void;
  undo: () => void;
  history: ResultSnapshot[];
  toggleLock: (studentId: string, classId: number) => void;
  runDistribution: () => void;
  distributing: boolean;
  downloadCSV: () => void;
  notifyParents: () => void;
  notifyState: NotifyState;
  gradeLabel: string;
}

function ErgebnisStep(props: ErgebnisStepProps) {
  const {
    result,
    score,
    stats,
    wishReport,
    students,
    moveStudent,
    setMoveStudent,
    doMove,
    undo,
    history,
    toggleLock,
    runDistribution,
    distributing,
    downloadCSV,
    notifyParents,
    notifyState,
    gradeLabel,
  } = props;

  // Anzahl Schüler*innen mit Eltern-E-Mail (Online-Session ODER
  // Offline-QR-Wunschzettel) – Notify-Banner erscheint, sobald
  // mindestens eine versendbare Adresse vorliegt.
  const onlineLinkedCount = result
    ? result.reduce(
        (n, c) =>
          n +
          c.students.filter(
            (s) => (s.registrationId && s.sessionId) || s.parentEmail
          ).length,
        0
      )
    : 0;

  if (!result) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-white/40 p-12 text-center">
        <Sparkles className="h-10 w-10 text-text-light mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-text-light">
          Noch kein Vorschlag berechnet – bitte zuerst zum Schritt{" "}
          <strong className="text-text">Regeln</strong> wechseln und die
          Verteilung starten.
        </p>
      </div>
    );
  }

  const pct = score && score.wishesTotal > 0
    ? Math.round((score.wishesMet / score.wishesTotal) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <SectionHeader
        index="04"
        eyebrow="Vorschlag"
        title="Beste Verteilung – feinjustierbar"
        body="Klick auf ein Kind → Zielklasse wählen, um es zu verschieben. Pin-Symbol fixiert das Kind in seiner Klasse."
      />

      {/* Score-Card */}
      <div className="relative overflow-hidden rounded-xl bg-primary text-white p-5 md:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, #ffffff 0 1px, transparent 1px 28px)",
          }}
        />
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 mb-1">
              Wünsche erfüllt (15 Durchläufe)
            </p>
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {score?.wishesMet} / {score?.wishesTotal}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[60px] font-bold tabular-nums leading-none text-accent">
              {pct}
              <span className="text-3xl">%</span>
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="opacity-80">
              Geschlechter-Differenz: ±
              <span className="tabular-nums">{score?.genderDiff}</span>
            </p>
            {score && score.noGoViolations > 0 ? (
              <p className="text-amber-300 font-bold mt-1">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                {score.noGoViolations} NoGo-Konflikt
                {score.noGoViolations === 1 ? "" : "e"}
              </p>
            ) : (
              <p className="text-emerald-300 font-bold mt-1">
                <CheckCircle2 className="inline h-4 w-4 mr-1" />
                Keine NoGo-Konflikte
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Move Bar */}
      {moveStudent && (
        <div className="rounded-xl border-2 border-violet-400 bg-violet-50 p-4">
          <p className="text-sm font-bold text-violet-900 mb-2">
            <Shuffle className="inline h-4 w-4 mr-1.5" aria-hidden="true" />
            {students.find((s) => s.id === moveStudent.studentId)?.name}{" "}
            verschieben in:
          </p>
          <div className="flex flex-wrap gap-2">
            {result.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => doMove(c.id)}
                disabled={c.id === moveStudent.fromClassId}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                  c.id === moveStudent.fromClassId
                    ? "bg-bg text-text-light"
                    : "bg-violet-600 text-white hover:bg-violet-700"
                }`}
              >
                Klasse {formatClassLabel(c.id, gradeLabel)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMoveStudent(null)}
              className="rounded-lg bg-white border border-border px-3 py-2 text-sm font-bold text-text hover:bg-bg transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div
        className="grid gap-3 print:gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(stats.length, 6)},minmax(0,1fr))`,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.id}
            className="rounded-lg bg-white border border-border p-3 text-center shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-light">
              Klasse
            </p>
            <p className="text-2xl font-bold text-primary leading-none">
              {formatClassLabel(s.id, gradeLabel)}
            </p>
            <p className="text-3xl font-bold tabular-nums leading-none mt-1">
              {s.total}
            </p>
            <p className="text-[11px] text-text-light mt-1">
              ♂{s.boys} ♀{s.girls}
              {s.diverse > 0 && ` · —${s.diverse}`}
            </p>
            <p className="text-[11px] mt-0.5">
              <span className="text-emerald-600">💚{s.wishesMet}</span>
              <span className="text-text-light">/{s.wishesTotal}</span>
              {s.noGoViolations > 0 && (
                <span className="text-red-600 ml-1">🚫{s.noGoViolations}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Tooltip + Undo */}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-white border border-border px-4 py-2.5 print:hidden">
        <p className="text-xs text-text-light leading-snug flex-1">
          <strong>Klick auf ein Kind</strong> → Zielklasse wählen ·{" "}
          <span className="text-emerald-600">💚</span> erfüllt ·{" "}
          <span className="text-text-light">💔</span> offen ·{" "}
          <span className="text-red-600">🚫</span> Konflikt ·{" "}
          <Pin className="inline h-3 w-3" aria-hidden="true" /> fixiert
        </p>
        <button
          type="button"
          onClick={undo}
          disabled={history.length === 0}
          className="inline-flex items-center gap-1 rounded-lg bg-bg border border-border px-2.5 py-1.5 text-xs font-bold text-text hover:bg-primary/5 disabled:opacity-30 transition-colors"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          Undo ({history.length})
        </button>
      </div>

      {/* Class Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {result.map((cls) => {
          const ids = new Set(cls.students.map((s) => s.id));
          return (
            <div
              key={cls.id}
              className="rounded-xl bg-white border border-border shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-primary/20 bg-bg/30">
                <h3 className="text-base font-bold text-primary">
                  Klasse {formatClassLabel(cls.id, gradeLabel)}
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 font-bold tabular-nums">
                    {cls.students.length}
                  </span>
                  <span className="text-text-light">
                    ♂{stats.find((s) => s.id === cls.id)?.boys ?? 0} ♀
                    {stats.find((s) => s.id === cls.id)?.girls ?? 0}
                  </span>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {[...cls.students]
                  .sort((a, b) => a.name.localeCompare(b.name, "de"))
                  .map((s) => {
                    const met = s.wishes.filter((w) => ids.has(w));
                    const unmet = s.wishes.filter((w) => !ids.has(w));
                    const ngHits = s.noGo.filter((n) => ids.has(n));
                    const isSel = moveStudent?.studentId === s.id;
                    const isLocked = s.lockedClass === cls.id;
                    return (
                      <li
                        key={s.id}
                        className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                          isSel
                            ? "bg-violet-50"
                            : ngHits.length > 0
                              ? "bg-red-50"
                              : isLocked
                                ? "bg-amber-50/60"
                                : "hover:bg-bg/50"
                        }`}
                      >
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs shrink-0 ${
                            s.gender === "m"
                              ? "bg-blue-100 text-blue-700"
                              : s.gender === "w"
                                ? "bg-pink-100 text-pink-800"
                                : "bg-bg text-text-light"
                          }`}
                          aria-hidden="true"
                        >
                          {s.gender === "m" ? "♂" : s.gender === "w" ? "♀" : "—"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (moveStudent?.studentId === s.id) setMoveStudent(null);
                            else
                              setMoveStudent({
                                studentId: s.id,
                                fromClassId: cls.id,
                              });
                          }}
                          className="flex-1 min-w-0 text-left text-sm font-medium truncate cursor-pointer"
                        >
                          {s.name}
                        </button>
                        {s.notes && (
                          <span
                            className="hidden sm:inline-block rounded bg-accent/10 text-accent-strong px-1.5 py-0.5 text-[10px] font-bold"
                            title={s.notes}
                          >
                            {s.notes.length > 12
                              ? s.notes.slice(0, 12) + "…"
                              : s.notes}
                          </span>
                        )}
                        {met.length > 0 && (
                          <span
                            className="text-xs text-emerald-600 tabular-nums"
                            title={`${met.length} Wunsch erfüllt`}
                          >
                            <Heart className="inline h-3 w-3" aria-hidden="true" />
                            {met.length}
                          </span>
                        )}
                        {unmet.length > 0 && (
                          <span
                            className="text-xs text-text-light tabular-nums"
                            title={`${unmet.length} Wunsch offen`}
                          >
                            <HeartCrack className="inline h-3 w-3" aria-hidden="true" />
                            {unmet.length}
                          </span>
                        )}
                        {ngHits.length > 0 && (
                          <span
                            className="text-xs text-red-600 font-bold"
                            title="NoGo-Konflikt"
                          >
                            <Ban className="inline h-3 w-3" aria-hidden="true" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleLock(s.id, cls.id)}
                          aria-label={
                            isLocked
                              ? "Fixierung aufheben"
                              : `${s.name} an Klasse ${formatClassLabel(cls.id, gradeLabel)} fixieren`
                          }
                          className={`inline-flex h-6 w-6 items-center justify-center rounded transition-colors ${
                            isLocked
                              ? "bg-amber-700 text-white"
                              : "text-text-light hover:bg-amber-50 hover:text-amber-700"
                          }`}
                          title={isLocked ? "Fixiert" : "Fixieren"}
                        >
                          <Pin className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Wish Report */}
      <div className="rounded-xl bg-white border border-border border-l-4 border-l-accent-strong shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-accent-strong" aria-hidden="true" />
          <h3 className="text-base font-bold text-primary">
            Elterngesprächs-Report
          </h3>
        </div>
        <p className="text-xs text-text-light mb-4">
          Nicht erfüllte Wünsche – nach Dringlichkeit sortiert.
        </p>
        {wishReport.length === 0 ? (
          <div className="rounded-lg bg-emerald-50 p-4 text-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-700 mx-auto mb-1" aria-hidden="true" />
            <p className="text-sm font-bold text-emerald-800">
              Alle Wünsche wurden erfüllt!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <SmallCount
                label="0 erfüllt"
                value={wishReport.filter((r) => r.ratio === 0).length}
                tone="bad"
              />
              <SmallCount
                label="Teilweise"
                value={
                  wishReport.filter((r) => r.ratio > 0 && r.ratio < 1).length
                }
                tone="warn"
              />
              <SmallCount
                label="Alle erfüllt"
                value={
                  students.filter((s) => s.wishes.length > 0).length -
                  wishReport.length
                }
                tone="good"
              />
            </div>
            <ul className="space-y-2">
              {wishReport.map((r) => (
                <li
                  key={r.student.id}
                  className={`rounded-lg p-3 ${
                    r.ratio === 0 ? "bg-red-50" : "bg-amber-50"
                  }`}
                >
                  <p className="text-sm">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold mr-2 ${
                        r.ratio === 0
                          ? "bg-red-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      {r.ratio === 0
                        ? "0 erfüllt"
                        : `${r.met.length}/${r.met.length + r.unmet.length}`}
                    </span>
                    <strong>{r.student.name}</strong>
                    <span className="text-xs text-text-light ml-2">
                      Klasse {formatClassLabel(r.classId, gradeLabel)}
                    </span>
                  </p>
                  {r.met.length > 0 && (
                    <p className="text-xs text-emerald-700 mt-1">
                      ✅ Bei:{" "}
                      {r.met
                        .map((w) => students.find((x) => x.id === w)?.name)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  <p
                    className={`text-xs mt-0.5 ${
                      r.ratio === 0 ? "text-red-700" : "text-amber-700"
                    }`}
                  >
                    ❌ Getrennt von:{" "}
                    {r.details
                      .map(
                        (d) =>
                          `${d.student?.name ?? "?"} (Klasse ${
                            typeof d.inClass === "number"
                              ? formatClassLabel(d.inClass, gradeLabel)
                              : d.inClass
                          })`
                      )
                      .join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={runDistribution}
          disabled={distributing}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-text hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Neu berechnen
        </button>
        <button
          type="button"
          onClick={downloadCSV}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          CSV exportieren
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Drucken
        </button>
      </div>

      {/* Notify-Bereich: nur wenn Online-Anmeldungen verknüpft sind */}
      {onlineLinkedCount > 0 && (
        <div className="rounded-xl bg-primary text-white p-5 print:hidden">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent mb-1">
                Online-Eltern benachrichtigen
              </p>
              <h4 className="text-base font-bold leading-tight mb-1">
                Klassenzuteilung per E-Mail versenden
              </h4>
              <p className="text-xs text-white/80 leading-relaxed">
                {onlineLinkedCount} Schüler*in
                {onlineLinkedCount === 1 ? "" : "nen"} mit Online-Anmeldung
                erkannt. Eltern, die bei der Anmeldung eine E-Mail-Adresse
                hinterlegt haben, erhalten automatisch eine Rückmeldung mit
                ihrer Klasse — inklusive Hinweis, dass sich Zuteilungen bis
                Schuljahresbeginn noch ändern können.
              </p>

              {notifyState.stage === "done" && (
                <div className="mt-3 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-xs">
                  <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 text-emerald-300" aria-hidden="true" />
                  <strong>{notifyState.sent}</strong> von {notifyState.eligible} E-Mails versendet
                  {notifyState.skipped > 0 && (
                    <>
                      , <strong>{notifyState.skipped}</strong> übersprungen
                    </>
                  )}
                  .
                  {!notifyState.smtpReady && (
                    <>
                      {" "}
                      <span className="text-amber-200">
                        SMTP nicht konfiguriert – Klassen wurden in der DB
                        gespeichert, aber keine Mails versendet.
                      </span>
                    </>
                  )}
                </div>
              )}
              {notifyState.stage === "error" && (
                <div className="mt-3 rounded-lg bg-red-500/20 border border-red-300/40 px-3 py-2 text-xs">
                  <AlertTriangle className="inline h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  {notifyState.message}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={notifyParents}
              disabled={notifyState.stage === "running"}
              className="inline-flex items-center gap-2 rounded-lg bg-accent text-text px-4 py-2.5 text-sm font-bold hover:bg-accent-hover transition-colors disabled:opacity-50 shrink-0"
            >
              {notifyState.stage === "running" ? (
                <>Sende…</>
              ) : (
                <>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {onlineLinkedCount} Eltern informieren
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SmallCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "bad";
}) {
  const map = {
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-lg p-3 text-center ${map[tone]}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5">{label}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Section Header (geteilt)
// ════════════════════════════════════════════════════════════════════════

function SectionHeader({
  index,
  eyebrow,
  title,
  body,
}: {
  index: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <header className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-8 items-start">
      <div className="flex md:flex-col items-baseline md:items-start gap-3 md:gap-1">
        <span
          aria-hidden="true"
          className="font-bold text-5xl md:text-6xl text-primary/15 leading-none tabular-nums tracking-tighter select-none"
        >
          {index}
        </span>
        <span className="hidden md:block w-10 h-0.5 bg-accent-strong" />
      </div>
      <div className="md:pt-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-strong mb-1">
          {eyebrow}
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-primary mb-2 leading-tight tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-text-light max-w-3xl leading-relaxed">
          {body}
        </p>
      </div>
    </header>
  );
}
