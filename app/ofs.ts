type Result = "win" | "draw" | "loss";
type Deviator = "user" | "opponent" | "none";

function clamp(v:number, a=0, b=100){ return Math.max(a, Math.min(b, v)); }

export function computeOFS({
  matchedMoves,
  depthCap = 30,
  gameMinutes,
  totalMoves,
  result,
  deviator
}: {
  matchedMoves: number;
  depthCap?: number;
  gameMinutes: number;
  totalMoves: number;
  result: Result;
  deviator: Deviator;
}) {
  // Components
  const Depth = Math.min(matchedMoves / depthCap, 1) * 100;

  const deficitPct = ((depthCap - matchedMoves) / depthCap) * 100;
  const UserDev = deviator === "user" ? clamp(deficitPct, 0, 100) : 0;
  const OppDev  = deviator === "opponent" ? clamp(deficitPct, 0, 100) : 0;

  const minutesFactor = Math.max(0, Math.min(gameMinutes / 30, 1));
  const movesFactor   = Math.max(0, Math.min(totalMoves / 40, 1));
  const Time = minutesFactor * movesFactor * 100;

  const Win = result === "win" ? 100 : (result === "draw" ? 50 : 0);

  // Weighted raw score
  const raw =
    0.5 * Depth +
    0.2 * Time  +
    0.3 * Win   -
    0.5 * UserDev -
    0.4 * OppDev;

  const OFS = clamp(Math.round(raw * 10) / 10, 0, 100); // round to 1 decimal
  return { OFS, Depth, Time, Win, UserDev, OppDev, raw };
}