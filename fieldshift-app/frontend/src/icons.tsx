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
