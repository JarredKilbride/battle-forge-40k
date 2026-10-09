import { useState } from "react";
import { save } from "./api";
import type { Army, ArmyModel, ArmyUnit, ArmyWeapon } from "./army";
import type { BloodHit } from "./bloodMotion";
import { healthSummary, parseArmyJson } from "./army";
import { BloodSplat, useBloodSplash } from "./components/BloodSplat";
import { WoundBar } from "./components/WoundBar";

export function ArmyPanel({
  army,
  blood = false,
  bloodHit = null,
  onArmy,
  onUseWeapon,
  compact = false,
}: {
  army: Army | null;
  blood?: boolean;
  bloodHit?: BloodHit | null;
  onArmy: (army: Army | null) => void;
  onUseWeapon?: (unit: ArmyUnit, model: ArmyModel, weapon: ArmyWeapon) => void;
  compact?: boolean;
}) {
  const splash = useBloodSplash(bloodHit, blood);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");

  function importText(text: string) {
    try {
      const next = parseArmyJson(text);
      save("bf.army", next);
      onArmy(next);
      setError("");
      setPaste("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not import that roster.",
      );
    }
  }

  async function importFile(file: File) {
    try {
      importText(await file.text());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not read that file.",
      );
    }
  }

  function clearArmy() {
    localStorage.removeItem("bf.army");
    onArmy(null);
    setError("");
  }

  const units = army?.units ?? [];
  const modelCount = units.reduce(
    (sum, unit) =>
      sum + unit.models.reduce((models, model) => models + model.count, 0),
    0,
  );
  const list = (
    <ArmyList
      army={army}
      units={units}
      onUseWeapon={onUseWeapon}
      splash={splash ? bloodHit : null}
    />
  );

  return (
    <section
      className={compact ? "army-panel army-compact" : "panel army-panel"}
    >
      {!compact && <p className="eyebrow">YOUR DEVICE · IMPORTED ROSTER</p>}
      <h2>{army ? army.name : "Import a roster"}</h2>
      {army ? (
        <div className="army-meta">
          {army.faction && <span>{army.faction}</span>}
          <span>
            <strong>{army.points}</strong> / {army.limit} pts
          </span>
          <span>
            {units.length} units · {modelCount} models
          </span>
        </div>
      ) : (
        <p>
          Import a New Recruit or BattleScribe roster JSON. It stays on this
          browser.
        </p>
      )}
      {error && (
        <p className="army-error" role="alert">
          {error}
        </p>
      )}
      <div className="army-import">
        <label className="field">
          Roster file (.json)
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void importFile(file);
            }}
          />
        </label>
        <label className="field">
          Paste roster JSON
          <textarea
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            placeholder='{"roster":{"name":"Army","forces":[]}}'
          />
        </label>
        <div className="actions">
          <button
            type="button"
            disabled={!paste.trim()}
            onClick={() => importText(paste)}
          >
            Import pasted roster
          </button>
          {army && (
            <button type="button" className="quiet" onClick={clearArmy}>
              Clear army
            </button>
          )}
        </div>
      </div>
      {army &&
        (compact ? (
          <details className="help">
            <summary>
              Show units<span aria-hidden>+</span>
            </summary>
            <div>{list}</div>
          </details>
        ) : (
          list
        ))}
    </section>
  );
}

function imageSearchUrl(faction: string, modelName: string) {
  const query = ["Warhammer 40k", faction, modelName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/search?${new URLSearchParams({
    tbm: "isch",
    q: query,
  })}`;
}

function ArmyList({
  army,
  units,
  onUseWeapon,
  splash,
}: {
  army: Army | null;
  units: ArmyUnit[];
  onUseWeapon?: (unit: ArmyUnit, model: ArmyModel, weapon: ArmyWeapon) => void;
  splash: BloodHit | null;
}) {
  if (!army) return null;
  return (
    <ol className="army-units">
      {units.map((unit, unitIndex) => (
        <li className="army-unit" key={`${unit.name}-${unitIndex}`}>
          <h3>{unit.name}</h3>
          <p>{unit.points} pts</p>
          <div className="army-models">
            {unit.models.map((model, modelIndex) => (
              <div className="army-model" key={`${model.name}-${modelIndex}`}>
                {splash?.unit === unitIndex && splash.model === modelIndex && (
                  <BloodSplat />
                )}
                <div className="model-title">
                  <strong>
                    {model.name}
                    {model.count > 1 ? ` ×${model.count}` : ""}
                  </strong>
                  <a
                    href={imageSearchUrl(army.faction, model.name)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google images
                  </a>
                </div>
                <WoundBar model={model} />
                <div className="army-stats">
                  <span>M {model.m}</span>
                  <span>T {model.t}</span>
                  <span>SV {model.sv}</span>
                  <span>{healthSummary(model)}</span>
                  <span>
                    Invuln {model.invuln ? `${model.invuln}+` : "none"}
                  </span>
                </div>
                <ul className="army-weapons">
                  {model.weapons.map((weapon, weaponIndex) => (
                    <li
                      className="army-weapon"
                      key={`${weapon.kind}-${weapon.name}-${weaponIndex}`}
                    >
                      <div>
                        <strong>{weapon.name}</strong>
                        <p>
                          {weapon.kind} · ×{weapon.count} · {weapon.range} · A{" "}
                          {weapon.attacks} ·{" "}
                          {weapon.kind === "ranged" ? "BS" : "WS"}{" "}
                          {weapon.skill} · S {weapon.strength} · AP {weapon.ap}{" "}
                          · D {weapon.damage}
                          {weapon.keywords && weapon.keywords !== "—"
                            ? ` · ${weapon.keywords}`
                            : ""}
                        </p>
                      </div>
                      {onUseWeapon && (
                        <button
                          type="button"
                          onClick={() => onUseWeapon(unit, model, weapon)}
                        >
                          Use weapon
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
