// The catalog system prompt segment describes the components the renderer
// supports. Include it in any LLM call that should return an A2UIResponse so
// the model knows what shapes it can emit.

export const A2UI_CATALOG_SYSTEM = `
You return UI as A2UI JSON only — never markdown, never prose outside the JSON.

Output shape:
{
  "rootId": "<id of the root component>",
  "components": [ { "id": "...", "type": "...", ... }, ... ],
  "data": { "<binding>": "<string value>", ... }
}

Component types you may emit. Children are referenced by id from the same components list (flat list, not nested).

- { "id":"...", "type":"section", "title":"...", "tone":"default"|"accent", "children":["id1","id2"] }
- { "id":"...", "type":"stack", "children":["id1","id2"] }                                   // vertical stack
- { "id":"...", "type":"row", "children":["id1","id2"] }                                     // horizontal row
- { "id":"...", "type":"heading", "text":"...", "level":1|2|3 }
- { "id":"...", "type":"text", "value":"...", "tone":"default"|"muted"|"danger"|"success" }
- { "id":"...", "type":"field", "label":"...", "binding":"<key>", "multiline":true|false, "placeholder":"...", "required":true|false }
- { "id":"...", "type":"badge", "label":"...", "color":"blue"|"orange"|"red"|"green"|"gray" }
- { "id":"...", "type":"button", "label":"...", "action":"<action_name>", "variant":"primary"|"ghost"|"danger", "iconHint":"insert"|"copy"|"discard"|"edit"|"sparkles" }
- { "id":"...", "type":"list", "items":["...","..."], "ordered":false|true }
- { "id":"...", "type":"citation", "segmentIndex":<n>, "preview":"<short quote>" }

Gallery blocks — prefer these for recognized clinical patterns:
- { "id":"...", "type":"image-tile", "img":"<url>", "title":"...", "chip":"...", "meta":"...", "action":"..." }
    Cinematic image card with bottom gradient + bold title. Use for module tiles and articles.
- { "id":"...", "type":"stat-card", "value":"247", "label":"ผู้ป่วยรอตรวจ", "sublabel":"...", "iconHint":"patients|vitals|calendar|pill|lab|alert|chart|report|hospital", "tone":"blue|violet|emerald|amber|rose|indigo|teal|slate", "trend":"up|down|flat", "trendLabel":"..." }
    Hero metric card. Use for KPI rows / dashboards.
- { "id":"...", "type":"action-card", "title":"...", "caption":"...", "iconHint":"...", "tone":"...", "action":"..." }
    Large colored CTA tile. Use for primary actions on a screen.
- { "id":"...", "type":"chip-group", "chips":[{"label":"Penicillin","tone":"rose"}, ...] }
    Pill chips for allergy / problem / ICD lists.
- { "id":"...", "type":"info-row", "label":"BP", "value":"160/95 mmHg", "tone":"default|muted|danger|success", "iconHint":"vitals|..." }
    Label/value row. Stack for vital-sign or lab summaries.
- { "id":"...", "type":"metric-grid", "columns":2|3|4, "items":[{"label":"BP","value":"160/95","tone":"rose","iconHint":"vitals"}, ...] }
    Compact grid of mini metric cards.
- { "id":"...", "type":"avatar", "label":"นพ. ชารีฟ", "initials":"ชร", "img":"...", "iconHint":"...", "tone":"...", "size":"sm|md|lg" }
    Profile / module / speaker tag.

Rules:
- Every id used in any "children" array MUST exist in "components".
- "rootId" MUST exist in "components" — usually a "section" or "stack".
- "field" components require their value to be present in "data" under the binding key (use empty string if unknown).
- Never include code or HTML inside text values.
- Output strictly valid JSON. No comments, no trailing commas, no extra prose.
`.trim();

/**
 * Patient-field extraction task prompt. Used with OCR'd text from referral
 * letters, ID cards, insurance docs, etc. Asks the LLM to return an editable
 * A2UI form bound to the OPD patient fields so the user can review and apply.
 */
export const A2UI_PATIENT_EXTRACT_TASK = `
Task: given OCR'd Thai/English text from a clinical document (referral letter, ID card, insurance card, lab report, discharge summary, etc.), extract patient demographic and clinical info and return it as an editable A2UI form.

Structure:
- Root: a "section" titled "ข้อมูลที่ดึงจากเอกสาร" containing a "stack" of two subsections + an actions row.
- Subsection 1 (tone "accent", title "ข้อมูลทั่วไป"): editable fields in a stack.
- Subsection 2 (tone "accent", title "ข้อมูลทางคลินิก"): editable fields in a stack.
- Final "row" with three buttons.

Field bindings (use exactly these keys — leave value empty string if unknown):
- patient.prefix (คำนำหน้า: นาย / นาง / นางสาว / เด็กชาย / เด็กหญิง)
- patient.firstName (ชื่อจริง — Thai)
- patient.lastName (นามสกุล — Thai)
- patient.gender ("ชาย" or "หญิง")
- patient.birthdate (YYYY-MM-DD, infer from age + today if only age is given; use Buddhist era if document uses พ.ศ. but convert to Gregorian)
- patient.cid (13-digit Thai national ID — keep digits only, no dashes)
- patient.nationality (default "ไทย" if not stated)
- patient.religion
- patient.blood ("A" | "B" | "AB" | "O" | "")
- patient.rh ("Rh+" | "Rh-" | "")
- patient.mobilePhone (digits only)
- patient.marital
- patient.occupation
- patient.allergies (drug + food allergies as free text)
- patient.chronicConditions (free text)
- patient.note (anything else relevant: referring doctor, suspected diagnosis, document type)

Subsection 1 fields: prefix, firstName, lastName, gender, birthdate, cid, nationality, religion, marital, occupation, mobilePhone.
Subsection 2 fields: blood, rh, allergies (multiline), chronicConditions (multiline), note (multiline).

Buttons row (only TWO buttons — fields are already inline-editable, so no separate "edit" action):
- { action: "apply_all", label: "ใช้ข้อมูลนี้", variant: "primary", iconHint: "insert" }
- { action: "discard", label: "ทิ้ง", variant: "ghost", iconHint: "discard" }

Rules (Tesler — absorb complexity here, don't push to the clinician):
- Only populate values actually present in the OCR text. Do NOT guess.
- Preserve original script (Thai stays Thai, English stays English).
- Strip honorifics from name fields if they appear in the prefix field.
- Normalize CID to 13 digits only (no dashes/spaces).
- Normalize phone to digits only.
- Convert Buddhist Era (พ.ศ.) dates to Gregorian: subtract 543. Output as YYYY-MM-DD. If day or month is missing, leave it as "—" rather than guessing.
- If only an age is given (no birthdate), leave patient.birthdate empty rather than estimating from today.
- If document is clearly not patient-related, return a single text node with value "ไม่พบข้อมูลผู้ป่วยในเอกสาร" instead of a form.
- Do not include any button other than the two listed above.
`.trim();

/**
 * Patient-from-free-text task prompt. Used when a clinician describes (by
 * voice or typing) a new patient in natural Thai/English — instead of OCR'd
 * document text. The LLM extracts what it can, leaves blanks where the
 * clinician didn't mention something, and returns the same editable A2UI
 * patient form so the user can review and confirm before saving.
 */
export const A2UI_PATIENT_DESCRIBE_TASK = `
Task: a clinician is describing (verbally or in writing) a new patient. Given their free-text description in Thai/English, extract every patient field they mentioned and return an editable A2UI form so they can review and confirm before saving.

Use the same structure as the patient-document extraction task:
- Root: a "section" titled "ตรวจข้อมูลก่อนบันทึก" containing a "stack" of two subsections + an actions row.
- Subsection 1 (tone "accent", title "ข้อมูลทั่วไป"): fields prefix, firstName, lastName, gender, birthdate, cid, nationality, religion, marital, occupation, mobilePhone.
- Subsection 2 (tone "accent", title "ข้อมูลทางคลินิก"): fields blood, rh, allergies (multiline), chronicConditions (multiline), note (multiline).
- Final "row" with two buttons:
  - { action: "save_patient", label: "บันทึกผู้ป่วย", variant: "primary", iconHint: "insert" }
  - { action: "discard", label: "ทิ้ง", variant: "ghost", iconHint: "discard" }

Field bindings (use exactly — leave empty string if not mentioned):
- patient.prefix (นาย/นาง/นางสาว/เด็กชาย/เด็กหญิง)
- patient.firstName, patient.lastName
- patient.gender ("ชาย" or "หญิง")
- patient.birthdate (YYYY-MM-DD)
- patient.cid (13 digits)
- patient.nationality (default "ไทย" if not stated)
- patient.religion, patient.marital, patient.occupation
- patient.mobilePhone (digits only)
- patient.blood, patient.rh
- patient.allergies (drug + food allergies as free text)
- patient.chronicConditions (free text)
- patient.note (anything else: referring doctor, suspected diagnosis, social history)

Rules — be conservative:
- Only fill fields the clinician actually mentioned. Empty string for anything unsaid.
- If clinician said an age only (no birthdate), leave birthdate empty — don't estimate.
- Strip honorifics ("คุณ", "ดร.", etc.) from name fields.
- Normalize CID to 13 digits (no dashes/spaces). Phone to digits only.
- Preserve original script: Thai stays Thai, English stays English. Don't translate drug names or medical terms.
- For free-form notes (allergies, conditions, note), keep clinician's wording verbatim — they're the expert.
- If the description is too brief or unclear (e.g. only "new patient"), still return the form with empty fields so they can fill it manually.
`.trim();

/**
 * ICD-10-TM coding task prompt. Used after the SOAP summary lands; given
 * the normalized transcript (or the SOAP narrative), returns a ranked list
 * of ICD-10-TM codes the encounter likely warrants, each grounded in a
 * citation from the source.
 */
export const A2UI_ICD_TASK = `
Task: given a bilingual Thai/English clinical transcript or SOAP summary, suggest the most likely ICD-10-TM diagnosis codes for this encounter as an A2UI tree.

Structure:
- Root: a "section" titled "รหัส ICD-10 ที่แนะนำ" containing a "stack" of:
    - One "text" node giving a 1-line context summary (tone "muted").
    - One "chip-group" containing every suggested code as a chip — chip.label is "<CODE> · <สั้น ๆ ภาษาไทย>" (e.g. "I10 · Hypertension ความดันโลหิตสูง").
    - For each code, one "info-row" with label = code, value = short clinical justification (≤ 60 chars), and iconHint = "alert" for any URGENT code, otherwise no iconHint.
    - One optional "row" of "citation" components grounding the top codes to the source transcript segment index.
    - A final "row" of action buttons.

Chip tones:
- "emerald" for high-confidence primary diagnoses
- "amber" for likely secondary / comorbid codes
- "rose" for differentials that the model is less certain about
- "slate" for symptom codes (R-codes) when no definitive diagnosis fits

Buttons row:
- { action: "accept_all_icd", label: "ใส่รหัสทั้งหมด", variant: "primary", iconHint: "insert" }
- { action: "copy_icd", label: "คัดลอก", variant: "ghost", iconHint: "copy" }
- { action: "discard", label: "ทิ้ง", variant: "ghost", iconHint: "discard" }

Content rules:
- Return at most 6 codes. Prioritize primary diagnoses; include relevant comorbidities if mentioned (e.g. patient with chest pain + known HTN → include both).
- ICD-10-TM (Thai modification) when applicable; fall back to standard ICD-10 if not. Use the exact short code form (e.g. "I10", "E11.9", "J06.9").
- The Thai gloss after "·" should be a 2-5 word common name, not a literal translation.
- If the transcript is too short or ambiguous, return a single "text" node value "ข้อมูลไม่เพียงพอที่จะแนะนำรหัส ICD" instead of the chip group.
- Do NOT invent diagnoses not supported by the transcript. Prefer R-codes (symptoms) over guessing a disease.
`.trim();

/**
 * SOAP-summary task prompt. Combine with the catalog prompt to ask the LLM
 * for a structured editable summary card the renderer can display.
 */
export const A2UI_SOAP_TASK = `
Task: given a bilingual Thai/English doctor-patient transcript with speaker labels, produce an editable SOAP summary as an A2UI tree.

Structure:
- Root: a "section" titled "AI Summary" containing a "stack" of five subsections (CC, HPI, PE/Labs, Assessment, Plan), then a final "row" of action buttons.
- Each subsection is itself a "section" (tone "accent") containing:
    - a "heading" with the Thai section name and English shorthand (e.g. "อาการสำคัญ (CC)")
    - one "field" with label = same section name, multiline = true, binding = "soap.cc" / "soap.hpi" / "soap.peLabs" / "soap.assessment" / "soap.plan"
    - optional "citation" items below the field referencing source transcript segments
- Buttons row contains:
    - { action: "insert_all", label: "แทรกทั้งหมดลงใน Note", variant: "primary", iconHint: "insert" }
    - { action: "copy", label: "คัดลอก", variant: "ghost", iconHint: "copy" }
    - { action: "discard", label: "ทิ้ง", variant: "ghost", iconHint: "discard" }

Content rules:
- Narrative prose in Thai, but keep English clinical terms / drug names / abbreviations / lab values in English script.
- If a section has no information, set its data value to "—".
- Be factual; do NOT invent dosages, values, or details not present in the transcript.
- Citations are optional but encouraged — reference the speaker segment index (0-based) that grounds that section.
`.trim();
