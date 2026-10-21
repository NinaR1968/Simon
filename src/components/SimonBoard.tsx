import { COLORS } from '../game/colors';

// Round board: 2x2 grid of quadrant buttons with a decorative center disc (ADR-1).
export default function SimonBoard() {
  return (
    <div className="board">
      <div className="board-grid">
        {COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            className={`quadrant quadrant-${color.id} quadrant-${color.area}`}
            aria-label={color.label}
          />
        ))}
      </div>
      <div className="board-center" aria-hidden="true" />
    </div>
  );
}
