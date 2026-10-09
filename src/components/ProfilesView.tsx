import type { Profile } from "../types";
import { ProfileForm } from "./ProfileForm";

export function ProfilesView({
  profiles,
  profile,
  onProfile,
  onSave,
  onRemove,
}: {
  profiles: Profile[];
  profile: Profile;
  onProfile: (profile: Profile) => void;
  onSave: () => void;
  onRemove: (name: string) => void;
}) {
  return (
    <section className="panel profile-page">
      <p className="eyebrow">YOUR DEVICE · SAVED WEAPONS</p>
      <h2>Less typing. More playing.</h2>
      <p>
        Profiles stay on this browser. Starting an attack shares that weapon
        with your opponent.
      </p>
      <div className="saved-list">
        {profiles.map((p) => (
          <div key={p.name}>
            <button onClick={() => onProfile(p)}>{p.name}</button>
            <button
              className="quiet"
              aria-label={`Delete ${p.name}`}
              onClick={() => onRemove(p.name)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <ProfileForm p={profile} set={onProfile} />
      <button className="primary" onClick={onSave}>
        Save weapon profile
      </button>
      <small>Saving the same name replaces that profile.</small>
    </section>
  );
}
