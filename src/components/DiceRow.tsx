import { useEffect, useState } from "react";
import { load, save } from "../api";
import type { Dice } from "../types";

const MOTION_KEY = "bf.dice-motion";
const TICKS = 9;
const TICK_MS = 75;

const PIP_ON: Record<number, boolean[]> = {
  1: [false, false, false, false, true, false, false, false, false],
  2: [true, false, false, false, false, false, false, false, true],
  3: [true, false, false, false, true, false, false, false, true],
  4: [true, false, true, false, false, false, true, false, true],
  5: [true, false, true, false, true, false, true, false, true],
  6: [true, false, true, true, false, true, true, false, true],
};

export function readDiceMotion(): boolean {
  const stored = load<boolean | null>(MOTION_KEY, null);
  if (typeof stored === "boolean") return stored;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function writeDiceMotion(enabled: boolean) {
  save(MOTION_KEY, enabled);
}

export function DiceRow({
  dice,
  animate = false,
}: {
  dice: Dice;
  animate?: boolean;
}) {
  const play = animate && dice.mode === "digital" && dice.faces.length > 0;
  const [tick, setTick] = useState(play ? 0 : TICKS);

  useEffect(() => {
    if (!play) return;
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setTick(n);
      if (n >= TICKS) window.clearInterval(id);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [play]);

  const rolling = play && tick < TICKS;

  return (
    <div className="dice-block">
      <small>
        {dice.label.toUpperCase()} ·{" "}
        {dice.target <= 6 ? `${dice.target}+` : "No possible save"} ·{" "}
        {dice.mode}
      </small>
      <div className="dice-grid" aria-busy={rolling || undefined}>
        {dice.faces.map((final, i) => {
          const settleAt = Math.min(TICKS, 6 + (i % 4));
          const settled = !play || tick >= settleAt;
          const shown = settled ? final : ((i * 2 + tick) % 6) + 1;
          const pass = final >= dice.target && final !== 1;
          const rerolled = !!dice.originals && dice.originals[i] !== final;
          const title = settled
            ? rerolled
              ? `Re-rolled ${dice.originals?.[i]} to ${final}`
              : `${final}${pass ? ", success" : ", fail"}`
            : "Rolling";
          return (
            <span
              key={i}
              className={`die ${settled ? (pass ? "pass" : "fail") : "rolling"}${settled && final === 6 ? " critical" : ""}`}
              title={title}
              role="img"
              aria-label={title}
            >
              {(PIP_ON[shown] ?? PIP_ON[1]).map((on, pip) => (
                <i key={pip} className={on ? "pip" : "pip off"} />
              ))}
              {settled && rerolled && <sup>↻</sup>}
            </span>
          );
        })}
        {!dice.faces.length && <span>No dice needed.</span>}
      </div>
    </div>
  );
}
