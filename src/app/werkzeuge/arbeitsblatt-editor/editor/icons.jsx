import React from "react";
/* ============================================================
   Icon set — stroke-based, currentColor. <Icon name="..." />
   ============================================================ */
const ICON_PATHS = {
  // topbar / actions
  undo:    '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo:    '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  print:   '<path d="M6 9V3h12v6"/><rect x="5" y="9" width="14" height="8" rx="2"/><path d="M8 17h8v4H8z"/><circle cx="16.5" cy="12.5" r=".6" fill="currentColor"/>',
  download:'<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
  share:   '<circle cx="6" cy="12" r="2.6"/><circle cx="17" cy="6" r="2.6"/><circle cx="17" cy="18" r="2.6"/><path d="M8.4 10.8 14.6 7.4M8.4 13.2l6.2 3.4"/>',
  save:    '<path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M8 4v5h7V4"/><rect x="8" y="13" width="8" height="6" rx="1"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"/>',
  menu:    '<path d="M4 7h16M4 12h16M4 17h16"/>',
  grid:    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  zoomin:  '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  zoomout: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>',
  expand:  '<path d="M4 9V5a1 1 0 0 1 1-1h4"/><path d="M20 9V5a1 1 0 0 0-1-1h-4"/><path d="M4 15v4a1 1 0 0 0 1 1h4"/><path d="M20 15v4a1 1 0 0 1-1 1h-4"/>',
  compress:'<path d="M9 4v4a1 1 0 0 1-1 1H4"/><path d="M15 4v4a1 1 0 0 0 1 1h4"/><path d="M9 20v-4a1 1 0 0 0-1-1H4"/><path d="M15 20v-4a1 1 0 0 1 1-1h4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l1.7-1.3-1.7-3-2 .8a7.6 7.6 0 0 0-2.6-1.5L14.5 3h-5l-.3 2.2A7.6 7.6 0 0 0 6.6 6.7l-2-.8-1.7 3L4.6 10.5a7.8 7.8 0 0 0 0 3l-1.7 1.3 1.7 3 2-.8a7.6 7.6 0 0 0 2.6 1.5l.3 2.2h5l.3-2.2a7.6 7.6 0 0 0 2.6-1.5l2 .8 1.7-3Z"/>',
  layers:  '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  check:   '<path d="m5 12 4.5 4.5L19 7"/>',
  chevdown:'<path d="m6 9 6 6 6-6"/>',
  chevright:'<path d="m9 6 6 6-6 6"/>',
  close:   '<path d="M6 6l12 12M18 6 6 18"/>',
  plus:    '<path d="M12 5v14M5 12h14"/>',
  minus:   '<path d="M5 12h14"/>',
  search:  '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  // block toolbar
  drag:    '<circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
  copy:    '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  trash:   '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
  up:      '<path d="m6 14 6-6 6 6"/>',
  down:    '<path d="m6 10 6 6 6-6"/>',
  // palette block types
  title:   '<path d="M5 6h14M5 12h9M5 18h12"/>',
  syllable:'<rect x="3" y="6" width="8" height="12" rx="2"/><rect x="13" y="6" width="8" height="12" rx="2"/>',
  reading: '<path d="M4 5h16M4 9h16M4 13h11M4 17h14"/>',
  cloze:   '<path d="M4 7h6M14 7h6M4 12h16M4 17h9"/><rect x="11" y="4.5" width="2.5" height="5" rx=".5" stroke-dasharray="2 1.4"/>',
  lines:   '<path d="M3 8h18M3 12h18M3 16h18" stroke-dasharray="0"/><path d="M3 12h18" opacity=".4"/>',
  math:    '<path d="M5 7h5M7.5 4.5v5M14 6.5h5M14 17.5h5M14 14.5h5M5 17l4 4M9 17l-4 4"/>',
  wall:    '<rect x="9" y="4" width="6" height="5" rx="1"/><rect x="5" y="11" width="6" height="5" rx="1"/><rect x="13" y="11" width="6" height="5" rx="1"/><rect x="1.5" y="18" width="6" height="5" rx="1"/><rect x="16.5" y="18" width="6" height="5" rx="1"/>',
  numline: '<path d="M3 12h18M3 9v6M9 10v4M15 10v4M21 9v6"/>',
  mc:      '<rect x="3" y="4.5" width="5" height="5" rx="1.4"/><path d="m4.4 7 1 1 1.6-1.8" stroke-width="1.5"/><rect x="3" y="14.5" width="5" height="5" rx="1.4"/><path d="M11 7h10M11 17h10"/>',
  match:   '<circle cx="5" cy="7" r="1.8"/><circle cx="5" cy="17" r="1.8"/><circle cx="19" cy="7" r="1.8"/><circle cx="19" cy="17" r="1.8"/><path d="M6.8 7.4 17.2 16.6M6.8 16.6 17.2 7.4"/>',
  wordsearch: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18" opacity=".5"/><path d="m6 6 1.5 1.5M14 8l2-2M8 14l2 2" stroke-width="1.4"/>',
  mathtri: '<path d="M12 4 21 19H3Z"/><circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none"/><circle cx="3" cy="19" r="1.4" fill="currentColor" stroke="none"/><circle cx="21" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
  clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2.2"/>',
  eye:     '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  key:     '<circle cx="8" cy="14" r="4.5"/><path d="m11 11 8-8M16 6l2 2M19 3l2 2"/>',
  image:   '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m4 18 5-5 4 3 3-3 4 4"/>',
  name:    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h5M7 14h10"/><circle cx="16.5" cy="10" r="1.6"/>',
  // misc
  align_left:  '<path d="M4 6h16M4 10h10M4 14h14M4 18h8"/>',
  align_center:'<path d="M4 6h16M7 10h10M5 14h14M8 18h8"/>',
  align_right: '<path d="M4 6h16M10 10h10M6 14h14M12 18h8"/>',
  type:    '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.8-1.6 1.7-1.6H16a5 5 0 0 0 5-5c0-3.9-4-7.4-9-7.4Z"/><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="16.5" cy="11" r="1" fill="currentColor" stroke="none"/>',
  wand:    '<path d="M15 4V2M15 10V8M11 6H9M21 6h-2M6 21 18 9l-3-3L3 18Z"/>',
  bulb:    '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z"/>',
  star:    '<path d="m12 3 2.6 5.6L21 9.3l-4.6 4.3 1.2 6.4L12 17l-5.6 3 1.2-6.4L3 9.3l6.4-.7L12 3Z"/>',
  level:   '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  // added — markers, new blocks, operators, file actions
  target:  '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
  flag:    '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  table:   '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.3h18M3 14.6h18M9 4v16M15 4v16"/>',
  task:    '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3.4h6a1 1 0 0 1 1 1V6H8V4.4a1 1 0 0 1 1-1Z"/><path d="M8.5 11h7M8.5 15h5"/>',
  divider: '<path d="M3 12h5.5M15.5 12H21"/><circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none"/>',
  scissors:'<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><path d="M8 7.6 20 18M8 16.4 20 6M8.2 7.5 14.5 12"/>',
  pencil:  '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z"/><path d="M13.5 7.5l3 3"/>',
  ruler:   '<rect x="2.5" y="8.5" width="19" height="7" rx="1.5"/><path d="M6 8.5v3M9.5 8.5v4M13 8.5v3M16.5 8.5v4"/>',
  crayons: '<path d="M4 20h16"/><path d="M7 20V9l2-4 2 4v11M13 20V11l2-3 2 3v9"/>',
  speak:   '<path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 4v-4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/>',
  ear:     '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a2.5 2.5 0 0 1-5 0"/><path d="M9.6 9a2.4 2.4 0 0 1 4.8 0"/>',
  folder:  '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  file:    '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/>',
  docnew:  '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M12 11v6M9 14h6"/>',
  frame:   '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
  pagebreak: '<rect x="5" y="3" width="14" height="6" rx="1"/><rect x="5" y="15" width="14" height="6" rx="1"/><path d="M2 12h3.5M8.5 12h2.5M13 12h2.5M18.5 12H22"/>',
  selfcheck: '<circle cx="12" cy="12" r="9"/><path d="m8.2 12.2 2.4 2.4 5.2-5.2"/>',
  dotfield: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M12 6v12" opacity=".5"/><circle cx="6.5" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="9.5" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="6.5" cy="14" r="1.3" fill="currentColor" stroke="none"/><circle cx="9.5" cy="14" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.3"/><circle cx="18" cy="10" r="1.3"/><circle cx="15" cy="14" r="1.3"/><circle cx="18" cy="14" r="1.3"/>',
  hundred: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18" opacity=".55"/>',
  numhouse: '<path d="m4 10 8-6 8 6"/><path d="M6 9.5V20h12V9.5"/><path d="M9 20v-5h6v5"/>',
};

function Icon({ name, size = 18, stroke = 1.8, className = "", style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
         className={className} style={style}
         dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || "" }} />
  );
}
export { Icon, ICON_PATHS };
