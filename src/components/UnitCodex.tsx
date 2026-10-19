import { useEffect, useMemo, useState } from "react";
import type { Army, ArmyUnit } from "../army";
import { codexToArmyUnit, draftArmy } from "../codexArmy";
import {
  groupRules,
  searchUnits,
  unitDetail,
  type Codex,
  type CodexModel,
  type CodexRule,
  type CodexWeapon,
  type UnitDetail,
} from "../codex";

const DRAFT_KEY = "bf.codex-draft";
const LIMITS = [1000, 2000, 3000];

type Draft = { name: string; faction: string; limit: number; units: ArmyUnit[] };

const emptyDraft: Draft = { name: "", faction: "", limit: 2000, units: [] };

export function UnitCodex({
  onBack,
  onSaveArmy,
}: {
  onBack?: () => void;
  onSaveArmy?: (army: Army) => void;
}) {
  const [codex, setCodex] = useState<Codex | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [factionId, setFactionId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [saved, setSaved] = useState("");
  const [armyNote, setArmyNote] = useState("");

  useEffect(() => {
    let cancel = false;
    fetch("/codex.json")
      .then((response) => {
        if (!response.ok) throw new Error("Catalog missing");
        return response.json() as Promise<Codex>;
      })
      .then((data) => {
        if (cancel) return;
        if (!data || !Array.isArray(data.units)) {
          setStatus("error");
          return;
        }
        setCodex(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancel) setStatus("error");
      });
    return () => {
      cancel = true;
    };
  }, []);

  const hits = useMemo(() => {
    if (!codex || (!query.trim() && !factionId)) return [];
    return searchUnits(codex, query, factionId);
  }, [codex, query, factionId]);
  const detail = useMemo(
    () => (codex && unitId ? unitDetail(codex, unitId) : null),
    [codex, unitId],
  );
  const spent = draft.units.reduce((sum, unit) => sum + unit.points, 0);

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  function addUnit(unit: UnitDetail, pointsIndex: number) {
    if (draft.faction && draft.faction !== unit.faction) {
      setArmyNote(`This list is ${draft.faction}. Clear it before adding ${unit.faction}.`);
      setSaved("");
      return;
    }
    const next = codexToArmyUnit(unit, pointsIndex);
    setDraft({
      ...draft,
      faction: draft.faction || unit.faction,
      units: [...draft.units, next],
    });
    setArmyNote("");
    setSaved("");
  }

  function saveArmy() {
    if (!draft.name.trim() || !draft.units.length || !onSaveArmy) return;
    onSaveArmy(draftArmy(draft.name, draft.faction, draft.limit, draft.units));
    setSaved(`${draft.name.trim()} is saved on this browser.`);
    setArmyNote("");
  }

  return (
    <section className="codex">
      <div className="panel codex-search">
        <p className="eyebrow">UNIT CODEX</p>
        <h1>Find a datasheet</h1>
        <p>
          Search the 10th edition catalog. Text is stored as plain text.{" "}
          <a href="https://wahapedia.ru/" target="_blank" rel="noreferrer">
            powered by Wahapedia
          </a>
          {codex?.updated ? ` · updated ${codex.updated}` : ""}
        </p>
        {onBack && (
          <button type="button" className="quiet" onClick={onBack}>
            Back
          </button>
        )}
        <label className="field">
          Unit name or keyword
          <input
            value={query}
            placeholder="Intercessor Squad"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="field">
          Faction
          <select value={factionId} onChange={(event) => setFactionId(event.target.value)}>
            <option value="">All factions</option>
            {codex?.factions.map((faction) => (
              <option key={faction.id} value={faction.id}>
                {faction.name}
              </option>
            ))}
          </select>
        </label>
        {status === "loading" && <p>Loading the catalog…</p>}
        {status === "error" && (
          <p>The unit catalog could not be loaded. Run the codex build, then refresh.</p>
        )}
        {status === "ready" && !query.trim() && !factionId && (
          <p>Type a unit name, or pick a faction to browse.</p>
        )}
        {status === "ready" && (query.trim() || factionId) && hits.length === 0 && (
          <p>No units match that search.</p>
        )}
        {hits.length > 0 && (
          <ul className="codex-hits">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  aria-current={hit.id === unitId ? "true" : undefined}
                  onClick={() => setUnitId(hit.id)}
                >
                  <strong>{hit.name}</strong>
                  <span>
                    {hit.faction}
                    {hit.role ? ` · ${hit.role}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {detail && (
        <UnitSheet key={detail.id} unit={detail} onAdd={onSaveArmy ? addUnit : undefined} />
      )}
      {onSaveArmy && (
        <ArmyTray
          draft={draft}
          spent={spent}
          saved={saved}
          note={armyNote}
          onDraft={setDraft}
          onSave={saveArmy}
          onClear={() => {
            setDraft(emptyDraft);
            setSaved("");
            setArmyNote("");
          }}
        />
      )}
    </section>
  );
}

function UnitSheet({
  unit,
  onAdd,
}: {
  unit: UnitDetail;
  onAdd?: (unit: UnitDetail, pointsIndex: number) => void;
}) {
  const [pointsIndex, setPointsIndex] = useState(0);
  const choice = unit.points[pointsIndex] ?? unit.points[0];
  return (
    <article className="panel codex-sheet">
      <p className="eyebrow">
        {unit.faction}
        {unit.role ? ` · ${unit.role}` : ""}
      </p>
      <h2>{unit.name}</h2>
      <p className="codex-meta">
        {unit.source}
        {unit.points.length
          ? ` · ${unit.points.map((point) => `${point.label} ${point.cost}`.trim()).join(", ")}`
          : ""}
      </p>
      {unit.link && (
        <p>
          <a href={unit.link} target="_blank" rel="noreferrer">
            Open on Wahapedia
          </a>
        </p>
      )}
      {unit.legend && <p className="codex-text">{unit.legend}</p>}
      {unit.points.length > 0 && (
        <div className="codex-table-wrap">
          <table className="codex-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {unit.points.map((point) => (
                <tr key={`${point.label}-${point.cost}`}>
                  <td>{point.label || "Unit"}</td>
                  <td>{point.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {onAdd && (
        <div className="codex-add">
          {unit.points.length > 1 && (
            <label className="field">
              Size to add
              <select
                value={pointsIndex}
                onChange={(event) => setPointsIndex(Number(event.target.value))}
              >
                {unit.points.map((point, index) => (
                  <option key={`${point.label}-${point.cost}`} value={index}>
                    {point.label || "Unit"} · {point.cost} pts
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" onClick={() => onAdd(unit, pointsIndex)}>
            Add to army
            {choice ? ` · ${choice.label || "unit"} ${choice.cost} pts` : ""}
          </button>
        </div>
      )}
      <ModelTable models={unit.models} />
      <WeaponTable title="Ranged weapons" skill="BS" weapons={rangedWeapons(unit.weapons)} />
      <WeaponTable title="Melee weapons" skill="WS" weapons={meleeWeapons(unit.weapons)} />
      <TextList title="Unit composition" lines={unit.composition} />
      {unit.loadout && (
        <>
          <h3>Loadout</h3>
          <p className="codex-text">{unit.loadout}</p>
        </>
      )}
      <TextList title="Wargear options" lines={unit.options} />
      {unit.abilities.length > 0 && (
        <>
          <h3>Abilities</h3>
          {unit.abilities.map((ability, index) => (
            <div key={`${ability.name}-${index}`} className="codex-block">
              <strong>
                {ability.name}
                {ability.type ? ` · ${ability.type}` : ""}
                {ability.model ? ` · ${ability.model}` : ""}
              </strong>
              {ability.description && <p className="codex-text">{ability.description}</p>}
            </div>
          ))}
        </>
      )}
      <NameList title="Leads" names={unit.leads} />
      <NameList title="Led by" names={unit.ledBy} />
      <KeywordLine title="Keywords" words={unit.keywords} />
      <KeywordLine title="Faction keywords" words={unit.factionKeywords} />
      {unit.transport && (
        <>
          <h3>Transport</h3>
          <p className="codex-text">{unit.transport}</p>
        </>
      )}
      {unit.damagedDescription && (
        <>
          <h3>Damaged {unit.damaged ? `(${unit.damaged} wounds remaining)` : ""}</h3>
          <p className="codex-text">{unit.damagedDescription}</p>
        </>
      )}
      <RuleGroups title="Detachment abilities" rules={unit.detachmentAbilities} />
      <RuleGroups title="Enhancements" rules={unit.enhancements} />
      <RuleGroups title="Stratagems" rules={unit.stratagems} />
    </article>
  );
}

function ModelTable({ models }: { models: CodexModel[] }) {
  if (!models.length) return null;
  return (
    <div className="codex-table-wrap">
      <table className="codex-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>M</th>
            <th>T</th>
            <th>Sv</th>
            <th>W</th>
            <th>Ld</th>
            <th>OC</th>
            <th>Inv</th>
            <th>Base</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <tr key={`${model.name}-${model.w}-${model.base}`}>
              <td>{model.name}</td>
              <td>{model.m || "—"}</td>
              <td>{model.t || "—"}</td>
              <td>{model.sv || "—"}</td>
              <td>{model.w || "—"}</td>
              <td>{model.ld || "—"}</td>
              <td>{model.oc || "—"}</td>
              <td>{model.invulnerable || "—"}</td>
              <td>{model.base || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeaponTable({
  title,
  skill,
  weapons,
}: {
  title: string;
  skill: string;
  weapons: CodexWeapon[];
}) {
  if (!weapons.length) return null;
  return (
    <>
      <h3>{title}</h3>
      <div className="codex-table-wrap">
        <table className="codex-table">
          <thead>
            <tr>
              <th>Weapon</th>
              <th>Range</th>
              <th>A</th>
              <th>{skill}</th>
              <th>S</th>
              <th>AP</th>
              <th>D</th>
              <th>Rules</th>
            </tr>
          </thead>
          <tbody>
            {weapons.map((weapon, index) => (
              <tr key={`${weapon.name}-${index}`}>
                <td>{weapon.name}</td>
                <td>{weapon.range || "—"}</td>
                <td>{weapon.attacks || "—"}</td>
                <td>{showSkill(weapon.skill)}</td>
                <td>{weapon.strength || "—"}</td>
                <td>{weapon.ap || "—"}</td>
                <td>{weapon.damage || "—"}</td>
                <td className="rules">{weapon.rules || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ArmyTray({
  draft,
  spent,
  saved,
  note,
  onDraft,
  onSave,
  onClear,
}: {
  draft: Draft;
  spent: number;
  saved: string;
  note: string;
  onDraft: (draft: Draft) => void;
  onSave: () => void;
  onClear: () => void;
}) {
  return (
    <aside className="panel codex-army">
      <p className="eyebrow">ARMY</p>
      <h2>Build a list</h2>
      <label className="field">
        Army name
        <input
          value={draft.name}
          maxLength={60}
          placeholder="Order of the Gate"
          onChange={(event) => onDraft({ ...draft, name: event.target.value })}
        />
      </label>
      <label className="field">
        Points limit
        <select
          value={draft.limit}
          onChange={(event) => onDraft({ ...draft, limit: Number(event.target.value) })}
        >
          {LIMITS.map((limit) => (
            <option key={limit} value={limit}>
              {limit}
            </option>
          ))}
        </select>
      </label>
      <p className={spent > draft.limit ? "codex-over" : "codex-meta"}>
        {spent} / {draft.limit} pts
        {draft.faction ? ` · ${draft.faction}` : ""}
      </p>
      {draft.units.length === 0 && <p>Open a unit, then add it.</p>}
      {draft.units.length > 0 && (
        <div className="codex-table-wrap">
          <table className="codex-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Models</th>
                <th>Pts</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {draft.units.map((unit, index) => (
                <tr key={`${unit.name}-${index}`}>
                  <td>{unit.name}</td>
                  <td>{unit.models[0]?.count ?? 1}</td>
                  <td>{unit.points}</td>
                  <td>
                    <button
                      type="button"
                      className="quiet"
                      onClick={() =>
                        onDraft({
                          ...draft,
                          faction: draft.units.length === 1 ? "" : draft.faction,
                          units: draft.units.filter((_, item) => item !== index),
                        })
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {note && <p>{note}</p>}
      {saved && <p>{saved}</p>}
      <button type="button" className="primary" disabled={!draft.name.trim() || !draft.units.length} onClick={onSave}>
        Save army
      </button>
      {draft.units.length > 0 && (
        <button type="button" className="quiet" onClick={onClear}>
          Clear list
        </button>
      )}
    </aside>
  );
}

function rangedWeapons(weapons: CodexWeapon[]) {
  return weapons.filter((weapon) => !isMelee(weapon));
}

function meleeWeapons(weapons: CodexWeapon[]) {
  return weapons.filter((weapon) => isMelee(weapon));
}

function isMelee(weapon: CodexWeapon) {
  return weapon.kind.toLowerCase().includes("melee") || weapon.range === "Melee";
}

function showSkill(skill: string) {
  const text = skill.trim();
  if (!text) return "—";
  return /^\d+$/.test(text) ? `${text}+` : text;
}

function readDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft;
    const value = JSON.parse(raw) as Partial<Draft>;
    if (!value || !Array.isArray(value.units)) return emptyDraft;
    return {
      name: typeof value.name === "string" ? value.name : "",
      faction: typeof value.faction === "string" ? value.faction : "",
      limit: LIMITS.includes(Number(value.limit)) ? Number(value.limit) : 2000,
      units: value.units.filter(
        (unit) => unit && typeof unit.name === "string" && Array.isArray(unit.models),
      ),
    };
  } catch {
    return emptyDraft;
  }
}

function TextList({ title, lines }: { title: string; lines: string[] }) {
  if (!lines.length) return null;
  return (
    <>
      <h3>{title}</h3>
      <ul className="codex-list">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </>
  );
}

function NameList({ title, names }: { title: string; names: string[] }) {
  if (!names.length) return null;
  return (
    <>
      <h3>{title}</h3>
      <p>{names.join(", ")}</p>
    </>
  );
}

function KeywordLine({ title, words }: { title: string; words: string[] }) {
  if (!words.length) return null;
  return (
    <p>
      <strong>{title}: </strong>
      {words.join(", ")}
    </p>
  );
}

function RuleGroups({ title, rules }: { title: string; rules: CodexRule[] }) {
  if (!rules.length) return null;
  const groups = groupRules(rules);
  return (
    <>
      <h3>
        {title} <span>({rules.length})</span>
      </h3>
      {groups.map(([name, group]) => (
        <details key={name} className="codex-rules">
          <summary>
            {name} ({group.length})
          </summary>
          {group.map((rule) => (
            <div key={rule.id} className="codex-block">
              <strong>
                {rule.name}
                {rule.cost ? ` · ${rule.cost}` : ""}
                {rule.phase ? ` · ${rule.phase}` : ""}
                {rule.type ? ` · ${rule.type}` : ""}
              </strong>
              {rule.description && <p className="codex-text">{rule.description}</p>}
            </div>
          ))}
        </details>
      ))}
    </>
  );
}
