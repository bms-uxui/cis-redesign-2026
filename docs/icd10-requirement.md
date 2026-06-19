# Requirement: ICD-10 Diagnosis Coding

> ฟีเจอร์: บันทึกการวินิจฉัย (Diagnosis) พร้อมรหัส ICD-10 ในขั้น "แพทย์ตรวจ → วางแผนการรักษา"
> สำหรับ: Dev
> สถานะ: Draft

---

## 1. Context & Goal
หมอต้องระบุการวินิจฉัยพร้อมรหัส ICD-10 เพื่อใช้ทั้งทางคลินิกและการเบิกจ่าย (สปสช./ประกันสังคม) ปัจจุบันยังไม่มีจุดบันทึก Dx ที่ชัดเจน และข้อมูล Dx ต้องไหลไปใช้ซ้ำในหลายส่วน (lab, ยา, ใบรับรอง, claim) โดยไม่ให้หมอกรอกซ้ำ

**เป้าหมาย:** หมอระบุ "โรค" → ระบบหา "รหัส" ให้ → Dx ไหลไป auto-fill จุดอื่น

## 2. ตำแหน่งใน Flow
- อยู่ท้ายขั้น **แพทย์ตรวจ** / ต้นขั้น **วางแผนการรักษา**
- เป็น prerequisite ก่อนสั่ง lab/ยา (ต้องมี Dx เพื่อผูกข้อบ่งชี้)

## 3. Functional Requirements

### 3.1 Search & Select
- หมอพิมพ์ **ชื่อโรค (ไทย/อังกฤษ) หรือรหัส** → ระบบ suggest รายการ ICD-10 (code + ชื่อไทย + ชื่ออังกฤษ)
- ไม่บังคับให้หมอจำรหัส — search by name เป็นหลัก
- รองรับ partial match + คำพ้อง (เช่น "เบาหวาน" → E11.x)

### 3.2 Multiple Diagnoses
- 1 encounter มีได้หลาย Dx
- ต้องระบุ **Primary 1 ตัว** (บังคับ) + **Secondary/Comorbidity** ได้หลายตัว
- จัดลำดับ/ลบได้
- ดึง comorbidity จาก problem list เดิมของผู้ป่วยมาเสนอได้ (เช่น เบาหวาน/HT ที่มีอยู่)

### 3.3 Downstream Auto-fill (กรอกที่เดียว ไหลทุกที่)
Dx ที่บันทึกต้องไหลไปเป็นค่าตั้งต้นที่:
- **สั่ง Lab** → ช่อง "ข้อบ่งชี้/Indication"
- **สั่งยา** → ผูก Dx
- **ใบรับรองแพทย์** → ช่องการวินิจฉัย
- **Claim/เบิกจ่าย** → ใช้รหัส ICD โดยตรง

### 3.4 Display
- แสดงเป็น chip: `[K52.9] ลำไส้อักเสบเฉียบพลัน` (primary เด่นกว่า)
- บนการ์ดสรุปเคส เห็น Dx ปัจจุบันได้ทันที

## 4. Data Model
```ts
interface Diagnosis {
  icd10: string;        // "K52.9"
  termTh: string;       // "ลำไส้อักเสบและกระเพาะอาหารอักเสบเฉียบพลัน"
  termEn: string;       // "Acute gastroenteritis"
  rank: "primary" | "secondary";
  source: "doctor" | "ai-suggested" | "problem-list";
  confidence?: number;  // ถ้ามาจาก AI suggest
}
// encounter.diagnoses: Diagnosis[]  (ต้องมี primary 1 ตัวเสมอ)
```

## 5. UX Rules
- **โรคก่อน รหัสทีหลัง** — หมอระบุโรคได้แม้ยังไม่เลือกรหัสเป๊ะ (mark pending, ให้เติม/เจ้าหน้าที่ coding ช่วยภายหลัง)
- ถ้า AI suggest Dx จากอาการ → ติดป้าย "เสนอโดย AI · รอยืนยัน" หมอต้อง confirm ก่อนใช้
- เปลี่ยน Dx → เตือนว่ามีจุดอื่นที่ผูกอยู่ (lab indication ฯลฯ) จะอัปเดตตาม

## 6. Edge Cases / ⚠️
- รหัสผิด → เบิกผิด/ถูกเรียกเงินคืน → ต้อง confirm ก่อนปิด encounter
- โรคที่ map หลายรหัส → ให้เลือก ไม่เดาเอง
- Primary หาย → block การปิด encounter
- ICD เวอร์ชัน/ชุดที่ รพ. ใช้ (ICD-10-TM ของไทย) — ยืนยัน master data กับทีมก่อน

## 7. Acceptance Criteria
- [ ] พิมพ์ชื่อโรคไทย → ได้รหัส ICD-10 ที่ถูกต้อง
- [ ] ระบุ primary + secondary ได้, primary บังคับ
- [ ] Dx ไหลไป lab indication / ยา / ใบรับรอง / claim โดยไม่กรอกซ้ำ
- [ ] AI-suggested Dx มีป้าย + ต้อง confirm
- [ ] ปิด encounter ไม่ได้ถ้าไม่มี primary

## 8. Out of Scope (เฟสนี้)
- ICD-9-CM procedure code
- DRG grouping
- Auto-coding เต็มรูปแบบ (เฟสนี้แค่ suggest)

---

## ภาคผนวก — Mock เคสตัวอย่าง (ปวดท้อง + เบาหวาน)
```ts
diagnoses: [
  { icd10: "K52.9", termTh: "ลำไส้อักเสบและกระเพาะอาหารอักเสบเฉียบพลัน",
    termEn: "Acute gastroenteritis", rank: "primary", source: "doctor" },
  { icd10: "E11.9", termTh: "เบาหวานชนิดที่ 2",
    termEn: "Type 2 diabetes mellitus", rank: "secondary", source: "problem-list" },
  { icd10: "I10",   termTh: "ความดันโลหิตสูง",
    termEn: "Essential hypertension", rank: "secondary", source: "problem-list" },
]
```