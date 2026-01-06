import type { ElementType } from "react";
import ToolTip from "../../common/ToolTip";

export default function ToggleButton({
  Icon,
  Enabled,
  onClick,
  ToolTipText,
  Disabled,
  SkipColor,
  Hidden,
}: {
  Icon: ElementType;
  Enabled: boolean;
  onClick: () => void;
  ToolTipText: string;
  Disabled?: boolean;
  SkipColor?: boolean;
  Hidden?: boolean;
}) {
  if (Hidden) return;
  return (
    <ToolTip className="z-9999" side="top" text={ToolTipText}>
      <button
        disabled={Disabled}
        className={`p-1 hover:bg-neutral-200 transition-all dark:hover:bg-neutral-700 delay-150 rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:cursor-pointer active:scale-95`}
        onClick={onClick}
      >
        <Icon size={20} />
      </button>
    </ToolTip>
  );
}
