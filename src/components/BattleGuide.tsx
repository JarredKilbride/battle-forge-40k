import type { Army, ArmyModel, ArmyUnit, ArmyWeapon } from "../army";
import { phases, type Action, type Game, type Profile } from "../types";
import type { ArmyPick } from "./ArmyAttackPicker";
import { CombatPanel } from "./CombatPanel";
import { PhasePanel } from "./PhasePanel";

export function BattleGuide({
  game,
  myTurn,
  activeName,
  meId,
  disabled,
  army,
  armyUnit,
  armyPick,
  profiles,
  profile,
  mode,
  faces,
  onCheck,
  onFinish,
  onProfile,
  onArmyUnit,
  onArmyWeapon,
  onMode,
  onFaces,
  onAct,
}: {
  game: Game;
  myTurn: boolean;
  activeName: string | undefined;
  meId: string | undefined;
  disabled: boolean;
  army: Army | null;
  armyUnit: string;
  armyPick: ArmyPick | null;
  profiles: Profile[];
  profile: Profile;
  mode: "digital" | "physical";
  faces: string;
  onCheck: (key: string) => void;
  onFinish: () => void;
  onProfile: (profile: Profile) => void;
  onArmyUnit: (index: string) => void;
  onArmyWeapon: (unit: ArmyUnit, model: ArmyModel, weapon: ArmyWeapon) => void;
  onMode: (mode: "digital" | "physical") => void;
  onFaces: (faces: string) => void;
  onAct: (action: Action) => void;
}) {
  return (
    <>
      <ol className="phase-strip">
        {phases.map((p, i) => (
          <li key={p} aria-current={i === game.phase ? "step" : undefined}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {p}
          </li>
        ))}
      </ol>
      <div className="battle-grid">
        <PhasePanel
          game={game}
          myTurn={myTurn}
          activeName={activeName}
          disabled={disabled}
          onCheck={onCheck}
          onFinish={onFinish}
        />
        <CombatPanel
          game={game}
          meId={meId}
          myTurn={myTurn}
          disabled={disabled}
          army={army}
          armyUnit={armyUnit}
          armyPick={armyPick}
          profiles={profiles}
          profile={profile}
          mode={mode}
          faces={faces}
          onProfile={onProfile}
          onArmyUnit={onArmyUnit}
          onArmyWeapon={onArmyWeapon}
          onMode={onMode}
          onFaces={onFaces}
          onAct={onAct}
        />
      </div>
    </>
  );
}
