(() => {
  const $ = (id) => document.getElementById(id);
  const d6 = () => Math.floor(Math.random() * 6) + 1;
  const clamp = (value, min, max) => {
    const parsed = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(parsed) ? parsed : min));
  };
  const phaseNames = ["Command", "Movement", "Shooting", "Charge", "Fight"];
  let phase = 0;
  let round = 1;

  function woundTarget(strength, toughness) {
    if (strength >= toughness * 2) return 2;
    if (strength > toughness) return 3;
    if (strength === toughness) return 4;
    if (strength * 2 <= toughness) return 6;
    return 5;
  }

  function renderPhases() {
    const wrap = $("phases");
    wrap.replaceChildren();
    phaseNames.forEach((name, index) => {
      const item = document.createElement("div");
      item.className = `phase${index === phase ? " active" : ""}${index < phase ? " done" : ""}`;
      item.dataset.number = index < phase ? "✓" : String(index + 1);
      item.textContent = name;
      item.setAttribute("aria-current", index === phase ? "step" : "false");
      wrap.appendChild(item);
    });
    $("roundNo").textContent = round;
  }

  function resetProfile() {
    $("attacks").value = 10;
    $("hit").value = 3;
    $("strength").value = 5;
    $("toughness").value = 4;
    $("ap").value = -2;
    $("save").value = 3;
    $("damage").value = 2;
    $("invuln").value = 0;
    ["rerollOnes", "lethal", "sustained", "devastating"].forEach((id) => $(id).checked = false);
  }

  function rollCombat() {
    const button = $("rollCombat");
    button.classList.add("rolling");

    const attacks = clamp($("attacks").value, 1, 200);
    const hitTarget = clamp($("hit").value, 2, 6);
    const strength = clamp($("strength").value, 1, 30);
    const toughness = clamp($("toughness").value, 1, 30);
    const ap = clamp($("ap").value, -6, 0);
    const baseSave = clamp($("save").value, 2, 6);
    const damage = clamp($("damage").value, 1, 20);
    const invuln = Number($("invuln").value);
    const rerollOnes = $("rerollOnes").checked;
    const lethal = $("lethal").checked;
    const sustained = $("sustained").checked;
    const devastating = $("devastating").checked;

    $("attacks").value = attacks;
    $("strength").value = strength;
    $("toughness").value = toughness;
    $("ap").value = ap;
    $("damage").value = damage;

    let successfulHits = 0;
    let criticalHits = 0;
    let autoWounds = 0;
    for (let i = 0; i < attacks; i += 1) {
      let roll = d6();
      if (roll === 1 && rerollOnes) roll = d6();
      if (roll >= hitTarget) {
        successfulHits += 1;
        if (roll === 6) {
          criticalHits += 1;
          if (lethal) autoWounds += 1;
          if (sustained) successfulHits += 1;
        }
      }
    }

    const neededToWound = woundTarget(strength, toughness);
    const woundRolls = successfulHits - autoWounds;
    let normalWounds = autoWounds;
    let devastatingWounds = 0;
    for (let i = 0; i < woundRolls; i += 1) {
      const roll = d6();
      if (roll >= neededToWound) {
        if (devastating && roll === 6) devastatingWounds += 1;
        else normalWounds += 1;
      }
    }

    const armorSave = Math.min(7, baseSave - ap);
    const saveTarget = invuln > 0 ? Math.min(armorSave, invuln) : armorSave;
    let failedSaves = 0;
    for (let i = 0; i < normalWounds; i += 1) {
      if (saveTarget === 7 || d6() < saveTarget) failedSaves += 1;
    }

    const unsaved = failedSaves + devastatingWounds;
    const totalDamage = unsaved * damage;
    $("hitsOut").textContent = successfulHits;
    $("woundsOut").textContent = normalWounds + devastatingWounds;
    $("failsOut").textContent = failedSaves;
    $("devOut").textContent = devastatingWounds;
    $("damageOut").textContent = totalDamage;
    $("woundTargetOut").textContent = `${neededToWound}+`;
    $("saveUsed").textContent = saveTarget === 7 ? "NO SAVE" : `SAVE ${saveTarget}+`;
    $("rollLog").textContent = `${attacks} attacks → ${successfulHits} hits (${criticalHits} critical) → ${normalWounds + devastatingWounds} wounds → ${unsaved} unsaved → ${totalDamage} damage.`;

    window.setTimeout(() => button.classList.remove("rolling"), 360);
  }

  $("rollCombat").addEventListener("click", rollCombat);
  $("resetProfile").addEventListener("click", resetProfile);
  $("nextPhase").addEventListener("click", () => {
    if (phase === phaseNames.length - 1) { phase = 0; round += 1; }
    else phase += 1;
    renderPhases();
  });
  $("newRound").addEventListener("click", () => { round += 1; phase = 0; renderPhases(); });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") rollCombat();
  });

  renderPhases();
})();
