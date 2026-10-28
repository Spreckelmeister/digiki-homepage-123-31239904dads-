// Sicherheits-Audit der npm-Abhängigkeiten für die CI
// (.github/workflows/security-audit.yml).
//
// Bricht ab bei:
//   - Lücken ab „high" in Produktions-Abhängigkeiten,
//   - „critical" überall, auch in Dev-Abhängigkeiten
//     (darunter fallen auch als Malware gemeldete Pakete),
//   - abgelaufenen Einträgen in .github/audit-allowlist.json.
// Bewusst akzeptierte Funde stehen mit Begründung und Ablaufdatum in der
// Allowlist. Ohne zusätzliche Pakete, damit der Audit selbst keine neue
// Lieferkette mitbringt.

import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";

const RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

const allowlist = JSON.parse(
  readFileSync(new URL("../.github/audit-allowlist.json", import.meta.url), "utf8"),
).advisories;
const today = new Date().toISOString().slice(0, 10);

function audit(args) {
  const r = spawnSync("npm", ["audit", "--json", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const data = JSON.parse(r.stdout || "{}");
  if (data.error) throw new Error(`npm audit fehlgeschlagen: ${data.error.summary}`);
  const out = new Map();
  for (const [pkg, v] of Object.entries(data.vulnerabilities ?? {})) {
    for (const via of v.via) {
      if (typeof via !== "object") continue; // nur Folge einer anderen Lücke
      const id = via.url?.split("/").pop() ?? String(via.source);
      out.set(`${pkg}|${id}`, {
        pkg,
        id,
        url: via.url,
        severity: via.severity,
        title: via.title,
        range: via.range,
        fix: v.fixAvailable === true ? "npm audit fix" : v.fixAvailable ? "Major-Update" : "keiner",
      });
    }
  }
  return out;
}

const all = audit([]);
const prod = audit(["--omit=dev"]);

const rows = [];
let failed = false;
for (const [key, a] of all) {
  const isProd = prod.has(key);
  const blocking = isProd ? RANK[a.severity] >= RANK.high : a.severity === "critical";
  const allowed = allowlist.find((e) => e.id === a.id);
  const expired = allowed && allowed.expires < today;
  let status = "Hinweis";
  if (blocking && allowed && !expired) status = `akzeptiert bis ${allowed.expires}`;
  else if (blocking) {
    status = expired ? "**Allowlist abgelaufen**" : "**blockiert**";
    failed = true;
  }
  rows.push({ ...a, scope: isProd ? "prod" : "dev", status });
}
rows.sort((x, y) => RANK[y.severity] - RANK[x.severity]);

const lines = [
  "## npm-Sicherheitsaudit",
  "",
  rows.length === 0
    ? "Keine bekannten Lücken."
    : "| Schwere | Paket | Bereich | Lücke | Fix | Status |\n|---|---|---|---|---|---|\n" +
      rows
        .map(
          (r) =>
            `| ${r.severity} | \`${r.pkg}\` | ${r.scope} | [${r.title.replace(/\|/g, "/")}](${r.url}) | ${r.fix} | ${r.status} |`,
        )
        .join("\n"),
  "",
  failed
    ? "❌ Blockierende Lücken gefunden – bitte Abhängigkeiten aktualisieren oder begründet in `.github/audit-allowlist.json` eintragen."
    : "✅ Keine blockierenden Lücken.",
];
const report = lines.join("\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");
process.exit(failed ? 1 : 0);
