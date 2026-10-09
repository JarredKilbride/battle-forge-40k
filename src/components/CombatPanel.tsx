import { useRef, useState } from "react";
import {
  applyWoundPackets,
  healthSummary,
  startingWounds,
  type Army,
  type ArmyModel,
  type ArmyUnit,
  type ArmyWeapon,
} from "../army";
import type { Action, Attack, Dice, Game, Profile } from "../types";
import type { BloodHit } from "../bloodMotion";
import { ArmyAttackPicker, type ArmyPick } from "./ArmyAttackPicker";
import { BloodSplat, useBloodSplash } from "./BloodSplat";
import { WoundBar } from "./WoundBar";
import { DiceRow, readDiceMotion, writeDiceMotion } from "./DiceRow";
import { Help } from "./Help";
import { ProfileForm } from "./ProfileForm";

const ATTACK_STEPS = [
  {
    id: "hits",
    label: "Hits",
    hint: "One die per attack. Meet the hit roll.",
  },
  {
    id: "wounds",
    label: "Wounds",
    hint: "Strength against the target's Toughness.",
  },
  {
    id: "saves",
    label: "Saves",
    hint: "Armour after AP, or an invulnerable save.",
  },
  {
    id: "damage",
    label: "Damage",
    hint: "Failed saves become harm to allocate.",
  },
] as const;

function countLabel(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`;
}

function saveNeed(profile: Profile) {
  const armour = profile.save - profile.ap;
  if (profile.invuln && profile.invuln < armour) {
    return `a ${profile.invuln}+ invulnerable save, better than ${armour}+ after AP`;
  }
  if (armour > 6) return "no possible save after AP";
  if (profile.ap === 0) return `a ${profile.save}+ save`;
  return `a ${armour}+ save (${profile.save}+ armour, AP ${profile.ap})`;
}

function saveOutcome(failed: number, stopped: number) {
  if (failed === 0)
    return `${countLabel(stopped, "save")} stopped the attack.`;
  if (stopped === 0)
    return `${countLabel(failed, "save")} failed. None were stopped.`;
  return `${countLabel(failed, "save")} failed and ${countLabel(stopped, "save")} stopped the attack.`;
}

function DamageStory({
  attack,
  splash,
}: {
  attack: Attack;
  splash?: boolean;
}) {
  const profile = attack.profile;
  const stopped = Math.max(0, attack.wounds - attack.failed);
  const through = attack.failed + attack.dev;
  const hitSummary = `${profile.name} made ${countLabel(profile.attacks, "attack")} and scored ${countLabel(attack.hits, "hit")}${
    attack.auto > 0
      ? `, including ${countLabel(attack.auto, "lethal hit")} that skipped the wound roll`
      : ""
  }.`;
  const sources = [
    attack.failed > 0 ? countLabel(attack.failed, "failed save") : "",
    attack.dev > 0 ? countLabel(attack.dev, "devastating wound") : "",
  ].filter(Boolean);
  const deal =
    through === 0
      ? "Nothing got through, so there is no damage to allocate."
      : through === 1
        ? `${sources[0]} deals ${profile.damage} damage.`
        : `${sources.join(" and ")} each deal ${profile.damage} damage, for ${attack.damage} total.`;

  return (
    <div className="result">
      {splash && <BloodSplat />}
      <strong>{attack.damage}</strong>
      <div className="result-copy">
        <span className="result-label">damage to allocate</span>
        <p>{hitSummary}</p>
        <p>
          {attack.wounds > 0
            ? `${countLabel(attack.wounds, "wound")} reached ${saveNeed(profile)}. ${saveOutcome(attack.failed, stopped)}`
            : attack.dev > 0
              ? "No normal saves were rolled."
              : "Nothing reached a save."}
          {attack.dev > 0
            ? ` ${countLabel(attack.dev, "devastating wound")} skipped the save.`
            : ""}
        </p>
        <p>{deal}</p>
      </div>
    </div>
  );
}

function CasualtyPicker({
  army,
  unitIndex,
  modelIndex,
  onUnit,
  onModel,
}: {
  army: Army;
  unitIndex: string;
  modelIndex: string;
  onUnit: (index: string) => void;
  onModel: (index: string) => void;
}) {
  const unit = unitIndex !== "" ? army.units[Number(unitIndex)] : undefined;
  const model = unit?.models[Number(modelIndex)] ?? unit?.models[0];
  const fixed = model ? startingWounds(model) : null;
  return (
    <>
      <label className="field">
        Your model taking this damage
        <select
          value={unit ? unitIndex : ""}
          onChange={(event) => {
            onUnit(event.target.value);
            onModel("0");
          }}
        >
          <option value="">Don't track these wounds</option>
          {army.units.map((entry, index) => (
            <option key={`${entry.name}-${index}`} value={String(index)}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      {unit && unit.models.length > 1 && (
        <label className="field">
          Model
          <select
            value={modelIndex}
            onChange={(event) => onModel(event.target.value)}
          >
            {unit.models.map((entry, index) => (
              <option key={`${entry.name}-${index}`} value={String(index)}>
                {entry.name} · {healthSummary(entry)}
              </option>
            ))}
          </select>
        </label>
      )}
      {model && (
        <p>
          {fixed == null
            ? `${model.name} lists wounds as ${model.w}, so those stay on the tabletop.`
            : `${healthSummary(model)}. The most wounded model of this type is hurt first.`}
          {fixed != null && <WoundBar model={model} />}
        </p>
      )}
    </>
  );
}

function diceKey(dice: Dice, index: number) {
  return `${index}:${dice.label}:${dice.faces.join(",")}`;
}

function wound(s: number, t: number) {
  return s >= t * 2 ? 2 : s > t ? 3 : s === t ? 4 : s * 2 <= t ? 6 : 5;
}

export function CombatPanel({
  game,
  meId,
  myTurn,
  disabled,
  army,
  armyUnit,
  armyPick,
  profiles,
  profile,
  mode,
  faces,
  onProfile,
  onArmyUnit,
  onArmyWeapon,
  onRecordWounds,
  blood,
  bloodHit,
  onMode,
  onFaces,
  onAct,
}: {
  game: Game;
  meId: string | undefined;
  myTurn: boolean;
  disabled: boolean;
  army: Army | null;
  armyUnit: string;
  armyPick: ArmyPick | null;
  profiles: Profile[];
  profile: Profile;
  mode: "digital" | "physical";
  faces: string;
  onProfile: (profile: Profile) => void;
  onArmyUnit: (index: string) => void;
  onArmyWeapon: (unit: ArmyUnit, model: ArmyModel, weapon: ArmyWeapon) => void;
  onRecordWounds: (
    army: Army,
    hit?: { unit: number; model: number },
  ) => void;
  blood: boolean;
  bloodHit: BloodHit | null;
  onMode: (mode: "digital" | "physical") => void;
  onFaces: (faces: string) => void;
  onAct: (action: Action) => void;
}) {
  const attack = game.attack;
  const rollCount = attack
    ? attack.stage === "hits"
      ? attack.profile.attacks
      : attack.stage === "wounds"
        ? attack.hits - attack.auto
        : attack.wounds
    : 0;
  const actor = attack
    ? attack.stage === "saves" || attack.stage === "damage"
      ? attack.defender
      : attack.attacker
    : null;
  const rollTarget = attack
    ? attack.stage === "hits"
      ? attack.profile.hit
      : attack.stage === "wounds"
        ? wound(attack.profile.strength, attack.profile.toughness)
        : Math.min(
            attack.profile.save - attack.profile.ap,
            attack.profile.invuln || 99,
          )
    : 0;
  const canStart =
    game.status === "battle" &&
    (game.phase === 4 || (game.phase === 2 && myTurn)) &&
    (!attack || attack.stage === "done");
  const [animateRolls, setAnimateRolls] = useState(readDiceMotion);
  const splash = useBloodSplash(bloodHit, blood);
  const [casualtyUnit, setCasualtyUnit] = useState("");
  const [casualtyModel, setCasualtyModel] = useState("0");
  const knownDice = useRef<number | null>(null);
  const freshFrom = useRef<number | null>(null);
  const diceCount = attack?.dice.length ?? 0;
  if (knownDice.current === null) knownDice.current = diceCount;
  else if (diceCount > knownDice.current) {
    freshFrom.current = knownDice.current;
    knownDice.current = diceCount;
  } else if (diceCount < knownDice.current) {
    knownDice.current = diceCount;
    freshFrom.current = null;
  }

  return (
    <section className="panel combat-panel">
      <p className="eyebrow">SHARED COMBAT</p>
      <h2>
        {attack && attack.stage !== "done"
          ? attack.profile.name
          : "Resolve an attack"}
      </h2>
      {!attack || attack.stage === "done" ? (
        <>
          {attack && <DamageStory attack={attack} splash={splash} />}
          {game.status === "ended" ? (
            <p>Your final results are saved in action history.</p>
          ) : canStart ? (
            <>
              <p>
                Agree on the unit, target and eligible weapon before starting.
              </p>
              {army && (
                <ArmyAttackPicker
                  army={army}
                  phase={game.phase}
                  unitIndex={armyUnit}
                  pick={armyPick}
                  onUnit={onArmyUnit}
                  onWeapon={onArmyWeapon}
                />
              )}
              {profiles.length > 0 && (
                <label className="field">
                  Load saved weapon
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const p = profiles[Number(e.target.value)];
                      if (p) onProfile(p);
                    }}
                  >
                    <option value="" disabled>
                      Choose a profile
                    </option>
                    {profiles.map((p, i) => (
                      <option key={p.name} value={i}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <ProfileForm p={profile} set={onProfile} />
              <button
                className="primary"
                disabled={disabled || !!game.undo}
                onClick={() => onAct({ type: "attack", profile })}
              >
                Start attack →
              </button>
              <Help title="Abilities and supported rolls">
                <p>
                  Fixed attacks and damage, unmodified hit/wound rolls, hit
                  re-rolls of 1, Lethal Hits, Sustained Hits 1 and Devastating
                  Wounds are supported. Selecting Lethal Hits chooses
                  auto-wounds. Resolve other modifiers, defensive abilities and
                  variable damage on the tabletop, then record a note.
                </p>
              </Help>
            </>
          ) : (
            <div className="empty-state">
              <span className="large-symbol">⚄</span>
              <h3>
                {game.phase === 2
                  ? "Waiting for the attacker"
                  : "Get ready for combat"}
              </h3>
              <p>
                Guided attacks are available during Shooting and Fight. Complete
                the current phase on the tabletop.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="attack-steps">
            {ATTACK_STEPS.map((step) => (
              <span
                key={step.id}
                className={attack.stage === step.id ? "selected" : ""}
              >
                {step.label}
                <small>{step.hint}</small>
              </span>
            ))}
          </div>
          <p className="actor">
            {game.players.find((p) => p.id === actor)?.name}:{" "}
            {attack.stage === "damage"
              ? "apply damage on the tabletop"
              : `roll ${rollCount} dice for ${attack.stage}`}
          </p>
          {attack.stage === "damage" ? (
            <>
              <DamageStory attack={attack} splash={splash} />
              <p>
                Allocate each unsaved attack to one of your models. Extra
                damage on that model does not move to the next. Apply defensive
                abilities manually.
              </p>
              {actor === meId && army && (
                <CasualtyPicker
                  army={army}
                  unitIndex={casualtyUnit}
                  modelIndex={casualtyModel}
                  onUnit={setCasualtyUnit}
                  onModel={setCasualtyModel}
                />
              )}
              <button
                className="primary"
                disabled={disabled || actor !== meId || !!game.undo}
                onClick={() => {
                  const packets = attack.failed + attack.dev;
                  if (army && casualtyUnit !== "" && packets > 0) {
                    const next = applyWoundPackets(
                      army,
                      Number(casualtyUnit),
                      Number(casualtyModel),
                      packets,
                      attack.profile.damage,
                    );
                    if (next.applied > 0) {
                      onRecordWounds(next.army, {
                        unit: Number(casualtyUnit),
                        model: Number(casualtyModel),
                      });
                    } else onRecordWounds(next.army);
                  }
                  onAct({ type: "damage" });
                }}
              >
                {casualtyUnit !== ""
                  ? "Assign wounds · finish attack"
                  : "Damage applied · finish attack"}
              </button>
            </>
          ) : (
            <>
              <div className="target">
                {rollTarget <= 6 ? (
                  <>
                    <strong>{rollTarget}+</strong>
                    <span>needed on each die</span>
                  </>
                ) : (
                  <>
                    <strong>—</strong>
                    <span>No possible save</span>
                  </>
                )}
              </div>
              {actor === meId ? (
                <>
                  <fieldset className="dice-mode">
                    <legend>Dice method</legend>
                    <label>
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "digital"}
                        onChange={() => onMode("digital")}
                      />
                      Digital
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "physical"}
                        onChange={() => onMode("physical")}
                      />
                      Physical dice
                    </label>
                  </fieldset>
                  {mode === "physical" && (
                    <label className="field">
                      Enter all {rollCount} final dice faces (1–6, separated by
                      spaces)
                      <textarea
                        value={faces}
                        onChange={(e) => onFaces(e.target.value)}
                        placeholder="6 3 1 5"
                      />
                      {attack.stage === "hits" && attack.profile.reroll && (
                        <small>
                          Re-roll 1s once on the tabletop, then enter the final
                          faces.
                        </small>
                      )}
                    </label>
                  )}
                  <button
                    className="primary"
                    disabled={disabled || !!game.undo}
                    onClick={() =>
                      onAct({
                        type: "roll",
                        mode,
                        faces: faces.trim()
                          ? faces
                              .trim()
                              .split(/[\s,]+/)
                              .map(Number)
                          : [],
                      })
                    }
                  >
                    {mode === "digital"
                      ? `Roll ${rollCount} dice`
                      : "Submit dice results"}{" "}
                    →
                  </button>
                </>
              ) : (
                <div className="notice">
                  Waiting for your opponent. Their result will appear here.
                </div>
              )}
              <Help title="Explain this roll">
                <p>
                  {attack.stage === "hits"
                    ? "Roll one die per attack. Meet the hit target to score a hit; a natural 6 is critical. Selected abilities are applied automatically."
                    : attack.stage === "wounds"
                      ? "Compare Strength and Toughness. Wound on 4+ when equal, 3+ when stronger, 2+ at double; 5+ when weaker, 6+ at half or less."
                      : "The defender uses the better of armour adjusted by AP or an invulnerable save. A natural 1 fails. Devastating wounds bypass this step."}
                </p>
              </Help>
            </>
          )}
          <label className="animate-toggle">
            <input
              type="checkbox"
              checked={animateRolls}
              onChange={(e) => {
                setAnimateRolls(e.target.checked);
                writeDiceMotion(e.target.checked);
              }}
            />
            Animate digital rolls
          </label>
          {attack.dice.map((d, i) => (
            <DiceRow
              key={diceKey(d, i)}
              dice={d}
              animate={
                animateRolls &&
                freshFrom.current !== null &&
                i >= freshFrom.current
              }
            />
          ))}
        </>
      )}
    </section>
  );
}
