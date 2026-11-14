/* Small line icons, 24px grid, stroke = currentColor */
const base = {
  width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
};

export const IconDraw = () => (
  <svg {...base}><path d="M4 17 9 5l9 4-3 11z" /><circle cx="4" cy="17" r="1.6" fill="currentColor" /><circle cx="9" cy="5" r="1.6" fill="currentColor" /><circle cx="18" cy="9" r="1.6" fill="currentColor" /><circle cx="15" cy="20" r="1.6" fill="currentColor" /></svg>
);
export const IconEdit = () => (
  <svg {...base}><path d="M14.5 5.5 18.5 9.5M4 20l1-5L15.5 4.5a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2L9 19z" /></svg>
);
export const IconTrash = () => (
  <svg {...base}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>
);
export const IconLocate = () => (
  <svg {...base}><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
);
export const IconLayers = () => (
  <svg {...base}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></svg>
);
export const IconPlus = () => <svg {...base}><path d="M12 5v14M5 12h14" /></svg>;
export const IconMinus = () => <svg {...base}><path d="M5 12h14" /></svg>;
export const IconSearch = () => (
  <svg {...base}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
);
export const IconClose = () => <svg {...base}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const IconFit = () => (
  <svg {...base}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
);
export const IconUp = () => <svg {...base} width={18} height={18}><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
export const IconDown = () => <svg {...base} width={18} height={18}><path d="M12 5v14M6 13l6 6 6-6" /></svg>;
export const IconSame = () => <svg {...base} width={18} height={18}><path d="M5 12h14" /></svg>;
export const IconWarn = () => (
  <svg {...base} width={18} height={18}><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.5M12 17.2v.1" /></svg>
);
export const IconLeaf = () => (
  <svg {...base} width={18} height={18}><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7" /></svg>
);
export const IconAsk = () => (
  <svg {...base} width={18} height={18}><path d="M4 5h16v11H9l-5 4z" /><path d="M10 9a2 2 0 1 1 2.5 2c-.4.2-.5.5-.5 1M12 14v.1" /></svg>
);
export const IconArrow = ({ dir }: { dir: "left" | "right" }) => (
  <svg {...base}>{dir === "right" ? <path d="M5 12h14M13 6l6 6-6 6" /> : <path d="M19 12H5M11 6l-6 6 6 6" />}</svg>
);
export const IconHelp = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.6v.1" /></svg>
);
export const IconPin = () => (
  <svg {...base} width={18} height={18}><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>
);
export const IconDrop = () => (
  <svg {...base} width={18} height={18}><path d="M12 3.5s6 6.6 6 10.8a6 6 0 0 1-12 0C6 10.1 12 3.5 12 3.5z" /></svg>
);
export const IconRain = () => (
  <svg {...base} width={18} height={18}><path d="M7 15a4.5 4.5 0 1 1 1.2-8.8A5.5 5.5 0 0 1 18.5 9 3.5 3.5 0 0 1 17.5 15z" /><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5" /></svg>
);
export const IconSprout = () => (
  <svg {...base} width={18} height={18}><path d="M12 21v-9M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" /></svg>
);
export const IconCoin = () => (
  <svg {...base} width={18} height={18}><circle cx="12" cy="12" r="8" /><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 1.9 0 2.7 5 1.4 5 4.2 0 1.1-1 1.9-2.5 1.9-1.1 0-2-.4-2.5-1.2M12 6.5V8M12 16v1.5" /></svg>
);
export const IconChevron = () => <svg {...base} width={18} height={18}><path d="m9 6 6 6-6 6" /></svg>;
export const IconBug = () => (
  <svg {...base} width={18} height={18}><ellipse cx="12" cy="13.5" rx="4.5" ry="6" /><path d="M12 7.5V19.5M9.5 7.5 8 5M14.5 7.5 16 5M7.5 12H4M16.5 12H20M7.8 16.5 5 18.5M16.2 16.5 19 18.5" /></svg>
);
export const IconCheck = () => <svg {...base} width={18} height={18}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
