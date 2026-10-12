// The app's icon set, in one place, so screens and the design-system page stay in sync.
import {
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  Lock,
  Menu,
  Minus,
  PencilLine,
  PlayCircle,
  Plus,
  Presentation,
  Sun,
  Target,
  type LucideIcon,
} from "lucide-react";

export const ICONS = {
  today: Sun,
  program: BookOpen,
  log: Plus,
  progress: Target,
  more: Menu,
  check: Check,
  skip: Minus,
  next: ChevronRight,
  lock: Lock,
  slides: Presentation,
  worksheet: PencilLine,
  reading: FileText,
  recording: PlayCircle,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  const Glyph = ICONS[name];
  return <Glyph size={size} strokeWidth={2} className={className} aria-hidden />;
}
