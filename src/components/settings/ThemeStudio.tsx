import {
  COLOR_TOKENS,
  THEME_PRESETS,
  contentColorFor,
  useTheme,
  type ColorToken,
  type ThemeRadius,
} from "../../contexts/ThemeContext";
import { Button } from "@heroui/react";
import { IconRefresh } from "@tabler/icons-react";

const TOKEN_LABELS: Record<ColorToken, { th: string; desc: string }> = {
  primary: { th: "สีหลัก", desc: "ปุ่ม / ลิงก์ / ไฮไลต์" },
  secondary: { th: "สีรอง", desc: "องค์ประกอบรอง" },
  accent: { th: "สีเน้น", desc: "ป้ายและองค์ประกอบเด่น" },
  neutral: { th: "สีเทา", desc: "ข้อความและพื้นหลังเข้ม" },
  base: { th: "พื้นหลัง", desc: "พื้นหลังของหน้า (canvas)" },
  surface: { th: "การ์ด / แผง", desc: "พื้นหลังของการ์ดและแผง" },
  info: { th: "ข้อมูล", desc: "การแจ้งข้อมูล" },
  success: { th: "สำเร็จ", desc: "การแจ้งสถานะสำเร็จ" },
  warning: { th: "คำเตือน", desc: "การแจ้งคำเตือน" },
  error: { th: "ผิดพลาด", desc: "การแจ้งข้อผิดพลาด" },
};

const RADIUS_LABELS: Record<keyof ThemeRadius, string> = {
  box: "การ์ด / แผง",
  field: "ช่องกรอก",
  selector: "ปุ่มเล็ก / ป้าย",
};

/**
 * Rich theme generator panel for the Settings page. Mirrors the daisyUI
 * theme generator vocabulary (preset row, per-token swatches & hex inputs,
 * radius scale). All changes write through useTheme() and apply via CSS
 * variables on the document root.
 */
export default function ThemeStudio() {
  const { config, colors, setColor, setRadius, applyPreset, resetToDefault } =
    useTheme();
  const activePresetId = config.presetId;

  return (
    <div className="flex flex-col gap-8">
      {/* Presets row */}
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-[var(--theme-neutral)]">ธีมพร้อมใช้</p>
            <p className="text-[12px] text-[var(--theme-neutral)]/55">
              เลือกชุดสีสำเร็จเป็นจุดเริ่มต้น แล้วปรับแต่งเพิ่มได้
            </p>
          </div>
          <Button
            size="sm"
            variant="light"
            radius="full"
            className="h-9 px-3 text-[12px] font-medium text-[var(--theme-neutral)]/60 data-[hover=true]:bg-[var(--theme-primary-soft)]"
            startContent={<IconRefresh className="h-3.5 w-3.5" stroke={1.75} />}
            onPress={() => resetToDefault()}
          >
            รีเซ็ต
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              aria-current={activePresetId === p.id ? "true" : undefined}
              className={[
                "group relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
                activePresetId === p.id
                  ? "border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]/30"
                  : "border-[var(--theme-neutral)]/15",
              ].join(" ")}
              // Each preset card paints with its OWN colors so users can see
              // the theme at a glance even before activating it.
              style={{
                backgroundColor: p.colors.surface,
                color: contentColorFor(p.colors.surface),
              }}
            >
              {/* Skeleton of the Home page: sidebar + topbar + hero banner
                  + two feature cards + menu-card row. Each block uses the
                  preset's actual tokens so the card previews as the real UI. */}
              <div
                className="flex h-24 gap-1.5 rounded p-1.5"
                style={{ backgroundColor: p.colors.base }}
              >
                {/* Sidebar rail */}
                <div
                  className="flex w-4 shrink-0 flex-col items-center gap-1.5 rounded-sm py-2"
                  style={{ backgroundColor: p.colors.surface }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: p.colors.primary }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: p.colors.neutral, opacity: 0.3 }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: p.colors.neutral, opacity: 0.3 }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: p.colors.neutral, opacity: 0.3 }}
                  />
                </div>
                {/* Right column */}
                <div className="flex flex-1 flex-col gap-1.5">
                  {/* Topbar with tab dot + user pill */}
                  <div
                    className="flex h-2.5 shrink-0 items-center gap-1 rounded-sm px-1.5"
                    style={{ backgroundColor: p.colors.surface }}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: p.colors.primary }}
                    />
                    <span
                      className="h-1 flex-1 rounded-full"
                      style={{
                        backgroundColor: p.colors.neutral,
                        opacity: 0.2,
                      }}
                    />
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: p.colors.neutral, opacity: 0.4 }}
                    />
                  </div>
                  {/* Hero banner — neutral placeholder for image area */}
                  <div
                    className="h-4 shrink-0 rounded-sm"
                    style={{ backgroundColor: p.colors.neutral, opacity: 0.5 }}
                  />
                  {/* Two feature cards: primary (records) + accent (tracking) */}
                  <div className="flex flex-1 gap-1.5">
                    <span
                      className="flex-1 rounded-sm"
                      style={{ backgroundColor: p.colors.primary }}
                    />
                    <span
                      className="flex-1 rounded-sm"
                      style={{ backgroundColor: p.colors.accent }}
                    />
                  </div>
                  {/* Menu-card row — 5 surface chips */}
                  <div className="flex h-3 shrink-0 gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="h-full flex-1 rounded-sm"
                        style={{ backgroundColor: p.colors.surface }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-[13px] font-medium">{p.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Color tokens grid */}
      <section className="flex flex-col gap-3">
        <p className="text-[14px] font-medium text-[var(--theme-neutral)]">สีหลักของระบบ</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {COLOR_TOKENS.map((token) => (
            <TokenRow
              key={token}
              token={token}
              value={colors[token]}
              onChange={(hex) => setColor(token, hex)}
            />
          ))}
        </div>
      </section>

      {/* Radius scale */}
      <section className="flex flex-col gap-3">
        <p className="text-[14px] font-medium text-[var(--theme-neutral)]">มุมโค้ง</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {(Object.keys(RADIUS_LABELS) as (keyof ThemeRadius)[]).map((key) => (
            <RadiusRow
              key={key}
              label={RADIUS_LABELS[key]}
              value={config.radius[key]}
              onChange={(v) => setRadius(key, v)}
            />
          ))}
        </div>
      </section>

      {/* Live preview */}
      <Preview />
    </div>
  );
}

interface TokenRowProps {
  token: ColorToken;
  value: string;
  onChange: (hex: string) => void;
}

function TokenRow({ token, value, onChange }: TokenRowProps) {
  const meta = TOKEN_LABELS[token];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-3">
      <label
        className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg ring-1 ring-black/10 transition hover:ring-2 hover:ring-[var(--theme-primary)]"
        style={{ backgroundColor: value, color: contentColorFor(value) }}
        title={`เลือก${meta.th}`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
          {token.slice(0, 3)}
        </span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute h-0 w-0 opacity-0"
          aria-label={meta.th}
        />
      </label>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-medium text-[var(--theme-neutral)]">
            {meta.th}
          </p>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className="h-7 w-[88px] rounded-md border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-2 text-right font-mono text-[12px] text-[var(--theme-neutral)] outline-none transition focus:border-[var(--theme-primary)]"
          />
        </div>
        <p className="truncate text-[11px] text-[var(--theme-neutral)]/55">{meta.desc}</p>
      </div>
    </div>
  );
}

interface RadiusRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function RadiusRow({ label, value, onChange }: RadiusRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[var(--theme-neutral)]">{label}</p>
        <span className="font-mono text-[12px] text-[var(--theme-neutral)]/55">{value}px</span>
      </div>
      <input
        type="range"
        min={0}
        max={32}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-[var(--theme-primary)]"
        aria-label={label}
      />
      <div
        aria-hidden
        className="mt-1 h-8 w-full border-2 border-dashed border-[var(--theme-primary)]/40 bg-[var(--theme-primary)]/[0.06]"
        style={{ borderRadius: value }}
      />
    </div>
  );
}

/** Small live preview block that exercises all the tokens at once. */
function Preview() {
  return (
    <section className="flex flex-col gap-3">
      <p className="text-[14px] font-medium text-[var(--theme-neutral)]">ตัวอย่าง</p>
      <div
        className="grid grid-cols-1 gap-3 border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-4 sm:grid-cols-2"
        style={{ borderRadius: "var(--theme-radius-box)" }}
      >
        <button
          type="button"
          className="h-11 px-4 text-[14px] font-medium"
          style={{
            backgroundColor: "var(--theme-primary)",
            color: "var(--theme-primary-content)",
            borderRadius: "var(--theme-radius-field)",
          }}
        >
          ปุ่มหลัก
        </button>
        <button
          type="button"
          className="h-11 px-4 text-[14px] font-medium"
          style={{
            backgroundColor: "var(--theme-secondary)",
            color: "var(--theme-secondary-content)",
            borderRadius: "var(--theme-radius-field)",
          }}
        >
          ปุ่มรอง
        </button>
        <div className="col-span-full grid grid-cols-2 gap-2 sm:grid-cols-4">
          <PreviewBadge token="info" label="ข้อมูล" />
          <PreviewBadge token="success" label="สำเร็จ" />
          <PreviewBadge token="warning" label="คำเตือน" />
          <PreviewBadge token="error" label="ผิดพลาด" />
        </div>
      </div>
    </section>
  );
}

function PreviewBadge({ token, label }: { token: ColorToken; label: string }) {
  return (
    <div
      className="flex items-center justify-center px-3 py-2 text-[12px] font-medium"
      style={{
        backgroundColor: `var(--theme-${token})`,
        color: `var(--theme-${token}-content)`,
        borderRadius: "var(--theme-radius-selector)",
      }}
    >
      {label}
    </div>
  );
}
