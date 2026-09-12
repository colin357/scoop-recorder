/** Line icons in the same 2px ink stroke as Rocky's outlines. */
import type { SVGProps } from "react";

export type IconName =
  | "home" | "video" | "check" | "folder" | "calendar" | "users" | "search" | "mic" | "clock" | "user"
  | "settings" | "chart" | "menu" | "close" | "play" | "spark" | "shield" | "chat" | "mail" | "bolt" | "paw" | "chevron";

const PATHS: Record<IconName, string> = {
  home: "M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10",
  video: "M4 6h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm12 5 5-3v8l-5-3",
  check: "M5 12.5 9.5 17 19 7",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  users: "M16 19v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 0a3 3 0 1 0-1-5.83M21 19v-2a3 3 0 0 0-2-2.83",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm10.5 4-5.5-5.5",
  mic: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-6-3a6 6 0 0 0 12 0M12 18v3m-4 0h8",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 8a8 8 0 0 0-16 0",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3 1.6-1-1.5-2.6-1.8.5a7 7 0 0 0-1.7-1L15.5 6h-3l-.5 1.9a7 7 0 0 0-1.7 1L8.5 8.4 7 11l1.6 1a7 7 0 0 0 0 2L7 15l1.5 2.6 1.8-.5a7 7 0 0 0 1.7 1l.5 1.9h3l.5-1.9a7 7 0 0 0 1.7-1l1.8.5L21 15l-1.6-1a7 7 0 0 0 0-2Z",
  chart: "M4 20h16M7 16v-5M12 16V6M17 16v-8",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  play: "M8 5v14l11-7z",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Zm-3 9 2 2 4-4",
  chat: "M4 5h16v10H9l-5 4z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  chevron: "M6 9L12 15L18 9",
  paw: "M12 21c-3 0-6-1.6-6-4.2 0-2.2 2.8-3.8 6-3.8s6 1.6 6 3.8C18 19.4 15 21 12 21Zm-6.5-8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm13 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm6 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
};

export function Icon({ name, size = 20, className = "", ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden {...rest}>
      <path d={PATHS[name]} />
    </svg>
  );
}
