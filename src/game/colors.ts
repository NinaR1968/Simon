export type ColorId = 'green' | 'red' | 'yellow' | 'blue';

export type BoardColor = {
  id: ColorId;
  label: string; // Hebrew accessible name
  area: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
};

// Spatial layout from DESIGN §1.1 (Mockups); it does not flip in RTL.
export const COLORS: BoardColor[] = [
  { id: 'green', label: 'ירוק', area: 'top-left' },
  { id: 'red', label: 'אדום', area: 'top-right' },
  { id: 'yellow', label: 'צהוב', area: 'bottom-left' },
  { id: 'blue', label: 'כחול', area: 'bottom-right' },
];
