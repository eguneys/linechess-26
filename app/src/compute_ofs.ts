export type Result = "win" | "draw" | "loss";
export type Deviator = "user" | "opponent" | "none";

function clamp(v:number, a=0, b=100){ return Math.max(a, Math.min(b, v)); }

export function computeOFS({
  matchedMoves,
  totalMoves,
  result,
  deviator
}: {
  matchedMoves: number;
  totalMoves: number;
  result: Result;
  deviator: Deviator;
}) {
  // Components
  const Depth = Math.min(matchedMoves / totalMoves, 1) * 100;

  const deficitPct = ((totalMoves - matchedMoves) / totalMoves) * 100;
  const UserDev = deviator === "user" ? clamp(deficitPct, 0, 100) : 0;
  const OppDev  = deviator === "opponent" ? clamp(deficitPct, 0, 100) : 0;

  const Win = result === "win" ? 100 : (result === "draw" ? 50 : 0);

  // Weighted raw score
  const raw =
    0.6 * Depth +
    0.4 * Win   -
    0.5 * UserDev -
    0.5 * OppDev;

  const OFS = clamp(Math.round(raw * 10) / 10, 0, 100); // round to 1 decimal

  /*
  console.log(matchedMoves, totalMoves, result, deviator)
  console.log({ OFS, Depth, Win, UserDev, OppDev, raw })
  */
  return { OFS, Depth, Win, UserDev, OppDev, raw };
}
