/**
 * Knowledge base about the CIS application that we hand to หมอเมย์ (the
 * chat assistant). Built dynamically from the same sources the app uses to
 * render itself — that way the assistant's answers stay in sync when the
 * sidebar or routes change.
 *
 * Output is a single markdown-ish blob the LLM can read; cached for the
 * lifetime of the module since the menu graph is static.
 */
import { getMenuEntries } from "../components/Sidebar/menuIndex";

interface RouteDoc {
  path: string;
  name: string;
  what: string;
}

/** Top-level routes registered in TabsHost. Keep this aligned with the
 *  Route table; the assistant references these paths directly. */
const ROUTES: RouteDoc[] = [
  { path: "/", name: "หน้าหลัก / Home", what: "Dashboard ส่วนตัว, frequent menus, AI search, widgets ที่ปักหมุดไว้" },
  { path: "/menus", name: "เมนูทั้งหมด", what: "ดูเมนูทุกตัวของระบบในรูปแบบ grid (ฉบับเต็มของ sidebar)" },
  { path: "/schedule", name: "ตารางออกตรวจ", what: "ตารางเวรของแพทย์ — เพิ่ม/ลบ/แก้ slot การออกตรวจ" },
  { path: "/automation", name: "Automation", what: "รายการ workflow อัตโนมัติทั้งหมด (เช่น ส่ง SMS แจ้งนัด)" },
  { path: "/automation/:id", name: "Automation Builder", what: "หน้าออกแบบ workflow ทีละ step (trigger → action)" },
  { path: "/dashboards", name: "แดชบอร์ดของฉัน", what: "รายการ dashboard ที่สร้างไว้ + ปุ่ม generate dashboard จาก prompt" },
  { path: "/dashboards/:id", name: "แดชบอร์ดรายตัว", what: "ดู/แก้ widget ของ dashboard หนึ่งตัว" },
  { path: "/opd", name: "OPD Card", what: "บัตรผู้ป่วยนอก — ค้นชื่อ/HN เพื่อเปิดประวัติ" },
  { path: "/opd/:hn", name: "OPD ผู้ป่วยรายบุคคล", what: "หน้ารวมประวัติ visit, vitals, dx, ยา, lab ของผู้ป่วยตาม HN" },
  { path: "/patient/new", name: "ลงทะเบียนผู้ป่วยใหม่ (Voice)", what: "ฟอร์มลงทะเบียนผู้ป่วยใหม่ พร้อม AI ฟังเสียงสกัด vitals/symptoms" },
  { path: "/soap", name: "บันทึก SOAP", what: "เครื่องมือเขียน SOAP note พร้อม AI ช่วยสรุปจาก dictation" },
  { path: "/settings", name: "ตั้งค่า", what: "ตั้งค่า theme, สี, ขนาดตัวอักษร, customize sidebar" },
];

/** Cross-cutting features (not pages — capabilities triggered from anywhere). */
const FEATURES = [
  {
    name: "หมอเมย์ (Aiva chat)",
    how: "กด Cmd+K (หรือ Ctrl+K) บนคีย์บอร์ดเปิด/ปิด drawer ทางขวา",
    what: "ผู้ช่วย AI ตอบคำถามเกี่ยวกับผู้ป่วย, ข้อมูลคลินิก, การใช้งานระบบ",
  },
  {
    name: "Menu Palette (Command-K)",
    how: "กด Cmd+K ที่ใดก็ได้เพื่อค้นเมนูแบบ fuzzy",
    what: "ค้นเมนูทุกตัวของระบบ พิมพ์ไทยหรืออังกฤษได้",
  },
  {
    name: "Dictation (Speech-to-text)",
    how: "กดไอคอนไมค์ในช่องพิมพ์ chat / SOAP / ลงทะเบียนผู้ป่วยใหม่",
    what: "ฟังเสียงแล้วถอดเป็น text + AI สรุปประเด็นทางคลินิก (อาการ, OLD CARTS, Social Hx)",
  },
  {
    name: "Generative Dashboards",
    how: "ไปที่ /dashboards แล้วพิมพ์ prompt ภาษาไทย/อังกฤษ",
    what: "AI สร้าง dashboard อัตโนมัติจาก natural language (KPI, charts, tables) ดึงข้อมูลจาก data sources ของระบบ",
  },
  {
    name: "Customize Sidebar",
    how: "กด ⚙️ ที่ sidebar หรือเข้า /settings → 'Customize sidebar'",
    what: "เลือก/ปักหมุดเมนูที่ใช้บ่อย, ซ่อนเมนูที่ไม่ใช้",
  },
  {
    name: "Theme & UI",
    how: "/settings → เลือก preset theme หรือปรับ slider สี/radius",
    what: "เปลี่ยน color scheme + การแสดงผลทั้งระบบ (รองรับ View Transitions API)",
  },
];

let cached: string | null = null;

/** Compose the full knowledge blob for the LLM. Cached for the session. */
export function buildCisKnowledge(): string {
  if (cached) return cached;
  const lines: string[] = [];

  lines.push("# ระบบ EHP-CIS (Clinical Information System)");
  lines.push("");
  lines.push(
    "เป็นระบบ EMR/CIS ของโรงพยาบาลไทยสไตล์ HOSxP — มี sidebar ซ้าย (rail + 2nd panel), tab-strip ด้านบน, AI chat drawer ขวา (หมอเมย์), workspace กลาง.",
  );
  lines.push("");

  // ── Routes table ──
  lines.push("## หน้าหลักของระบบ (paths)");
  for (const r of ROUTES) lines.push(`- \`${r.path}\` — **${r.name}**: ${r.what}`);
  lines.push("");

  // ── Sidebar menu graph (compact, deduped) ──
  lines.push("## โครงสร้างเมนู Sidebar (rail → group → item)");
  const entries = getMenuEntries();
  const byRail = new Map<string, typeof entries>();
  for (const e of entries) {
    const arr = byRail.get(e.railLabel) ?? [];
    arr.push(e);
    byRail.set(e.railLabel, arr);
  }
  for (const [rail, items] of byRail) {
    lines.push(`### ${rail}`);
    // Group by groupLabel within each rail
    const byGroup = new Map<string, typeof entries>();
    for (const it of items) {
      const g = it.groupLabel ?? "";
      const arr = byGroup.get(g) ?? [];
      arr.push(it);
      byGroup.set(g, arr);
    }
    for (const [group, list] of byGroup) {
      if (group) lines.push(`- **${group}**`);
      for (const it of list) {
        if (!it.groupLabel) continue; // skip the rail-self entry
        const aliases = it.aliases.length ? ` (อีกชื่อ: ${it.aliases.join(", ")})` : "";
        lines.push(`  - ${it.label}${aliases}`);
      }
    }
    lines.push("");
  }

  // ── Features ──
  lines.push("## ฟีเจอร์ที่ใช้ได้ทุกหน้า");
  for (const f of FEATURES) {
    lines.push(`- **${f.name}** — ${f.what}. วิธีใช้: ${f.how}`);
  }
  lines.push("");

  // ── Navigation guidance to the LLM ──
  lines.push("## คำแนะนำสำหรับหมอเมย์");
  lines.push(
    "- เมื่อ user ถามว่าจะเข้าหน้าไหน/ใช้ฟีเจอร์ไหน ตอบให้ระบุ **path** (เช่น `/opd`) หรือ **เส้นทางใน sidebar** (เช่น 'ระเบียนผู้ป่วยนอก → การนัดหมาย') อย่างใดอย่างหนึ่งให้ชัด",
  );
  lines.push(
    "- ถ้ามี shortcut (Cmd+K) ใช้ได้แทน บอกด้วย",
  );
  lines.push(
    "- ห้ามแต่งหน้า/path ที่ไม่อยู่ในรายการนี้ ถ้าไม่มีในรายการ บอก user ตรง ๆ ว่าระบบยังไม่มีหน้านั้น",
  );
  lines.push("");

  cached = lines.join("\n");
  return cached;
}
