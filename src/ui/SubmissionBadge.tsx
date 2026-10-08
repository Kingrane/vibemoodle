import { useSubmissionState } from "@/api/hooks";
import type { SubmissionState } from "@/api/types";
import { ACCENT_TEXT } from "@/lib/palette";
import { cx } from "@/lib/cx";

const LABELS: Record<SubmissionState, { text: string; accent: keyof typeof ACCENT_TEXT } | null> = {
  new: { text: "не сдано", accent: "orange" },
  draft: { text: "черновик", accent: "lilac" },
  submitted: { text: "сдано", accent: "blue" },
  graded: { text: "оценено", accent: "green" },
  reopened: { text: "на доработку", accent: "pink" },
  unknown: null,
};

export function SubmissionBadge({ assignid }: { assignid: number }) {
  const { data, isLoading } = useSubmissionState(assignid);
  if (isLoading || !data) return null;
  const meta = LABELS[data];
  if (!meta) return null;
  return (
    <span className={cx("text-caption", ACCENT_TEXT[meta.accent])}>
      {meta.text}
    </span>
  );
}
