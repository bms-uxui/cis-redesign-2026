import { Tooltip } from "@heroui/react";
import { IconVolume } from "@tabler/icons-react";
import { speakText } from "../services/ttsPrefs";

/** Small speaker button placed next to a section title. Clicking it reads the
 *  section's text aloud through the global <SelectionTTS> dock. `getText` is
 *  resolved at click time so it always reads the latest content. Stops event
 *  propagation so it's safe inside an Accordion trigger. */
export default function SpeakButton({
  getText,
  className = "",
}: {
  getText: () => string;
  className?: string;
}) {
  // Rendered as a span[role=button] (not <button>) so it's valid inside other
  // button elements — e.g. a HeroUI Accordion trigger, which is itself a button.
  const trigger = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    speakText(getText());
  };
  return (
    <Tooltip content="อ่านออกเสียง" placement="top" delay={250} closeDelay={0}>
      <span
        role="button"
        tabIndex={0}
        aria-label="อ่านออกเสียง"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={trigger}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") trigger(e);
        }}
        className={[
          "grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-[#3965e1]/70 transition-colors hover:bg-[#3965e1]/10 hover:text-[#3965e1]",
          className,
        ].join(" ")}
      >
        <IconVolume className="h-4 w-4" stroke={2} />
      </span>
    </Tooltip>
  );
}
