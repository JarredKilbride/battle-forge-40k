import type { Army, ArmyModel, ArmyUnit, ArmyWeapon } from "../army";
import type { Action, Game, Profile } from "../types";
import { ArmyAttackPicker, type ArmyPick } from "./ArmyAttackPicker";
import { DiceRow } from "./DiceRow";
import { Help } from "./Help";
import { ProfileForm } from "./ProfileForm";

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
          {attack && (
            <div className="result">
              <strong>{attack.damage}</strong>
              <span>potential damage · previous attack</span>
            </div>
          )}
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
            {["hits", "wounds", "saves", "damage"].map((s) => (
              <span key={s} className={attack.stage === s ? "selected" : ""}>
                {s}
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
              <div className="result">
                <strong>{attack.damage}</strong>
                <span>
                  potential damage
                  <br />
                  {attack.failed} failed saves · {attack.dev} devastating wounds
                </span>
              </div>
              <p>
                Allocate damage per attack. Excess damage on one model does not
                spill over. Apply defensive abilities manually.
              </p>
              <button
                className="primary"
                disabled={disabled || actor !== meId || !!game.undo}
                onClick={() => onAct({ type: "damage" })}
              >
                Damage applied · finish attack
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
          {attack.dice.map((d, i) => (
            <DiceRow key={i} dice={d} />
          ))}
        </>
      )}
    </section>
  );
}
