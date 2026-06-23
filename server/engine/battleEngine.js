const typeChart = require('./typeChart.json');

/**
 * Calculates the damage for a single attack using Gen 1/2 Damage Formula.
 */
function calculateDamage(attacker, defender, move, opts = {}) {
  if (move.power === 0 || move.category === 'Status') {
    return { damage: 0, effectiveness: 1 };
  }

  // Type effectiveness
  let effectiveness = 1;
  for (const type of defender.types) {
    if (typeChart[move.type] && typeChart[move.type][type] !== undefined) {
      effectiveness *= typeChart[move.type][type];
    }
  }

  if (effectiveness === 0) {
    return { damage: 0, effectiveness };
  }

  let atkStat = attacker.stats.atk;
  let defStat = defender.stats.def;

  if (move.category === 'Special') {
    atkStat = attacker.stats.spcAtk;
    defStat = defender.stats.spcDef;
  }

  // Burn halves physical attack
  if (attacker.status === 'burn' && move.category === 'Physical') {
    atkStat = Math.floor(atkStat / 2);
  }

  const isCrit = opts.isCrit || false;
  const levelToUse = isCrit ? attacker.level * 2 : attacker.level;

  let baseDamage = Math.floor(Math.floor((2 * levelToUse) / 5 + 2) * move.power * atkStat / defStat);
  baseDamage = Math.floor(baseDamage / 50) + 2;

  // STAB
  if (attacker.types.includes(move.type)) {
    baseDamage = Math.floor(baseDamage * 1.5);
  }

  // Type Effectiveness
  baseDamage = Math.floor(baseDamage * effectiveness);

  // Random Factor (217-255)
  const randomRoll = opts.randomRoll !== undefined ? opts.randomRoll : Math.floor(Math.random() * 39) + 217;
  
  let finalDamage = Math.floor((baseDamage * randomRoll) / 255);

  if (finalDamage < 1) finalDamage = 1;

  return { damage: finalDamage, effectiveness };
}

/**
 * Resolves a full turn, yielding a new state, events for animations, and a text log.
 */
function resolveTurn(state, action1, action2, opts = {}) {
  const turnEvents = [];
  const log = [];
  const newState = JSON.parse(JSON.stringify(state));

  const p1Randoms = opts.p1Randoms || {};
  const p2Randoms = opts.p2Randoms || {};
  const speedTieWinner = opts.speedTieWinner || null;

  // 1. Process forced/normal switches before moves
  if (action1 && action1.type === 'switch') {
    newState.p1.active = newState.p1.team[action1.switchTo];
    turnEvents.push({ type: 'switch', target: 'p1', pokemon: newState.p1.active.name });
    log.push(`Player 1 sent out ${newState.p1.active.name}!`);
  }
  if (action2 && action2.type === 'switch') {
    newState.p2.active = newState.p2.team[action2.switchTo];
    turnEvents.push({ type: 'switch', target: 'p2', pokemon: newState.p2.active.name });
    log.push(`Player 2 sent out ${newState.p2.active.name}!`);
  }

  const executeMove = (attackerSide, defenderSide, action, moveOpts) => {
    if (!action || action.type !== 'move') return;

    const attacker = newState[attackerSide].active;
    const defender = newState[defenderSide].active;

    if (attacker.hp <= 0) return;
    if (defender.hp <= 0) return;

    if (attacker.status === 'paralysis') {
      const skipRoll = moveOpts.paralysisRoll !== undefined ? moveOpts.paralysisRoll : Math.random();
      if (skipRoll < 0.25) {
        log.push(`${attacker.name} is paralyzed! It can't move!`);
        turnEvents.push({ type: 'miss', attacker: attackerSide, reason: 'paralysis' });
        return;
      }
    }

    if (attacker.status === 'sleep') {
      attacker.sleepTurns--;
      if (attacker.sleepTurns <= 0) {
        attacker.status = null;
        log.push(`${attacker.name} woke up!`);
      } else {
        log.push(`${attacker.name} is fast asleep.`);
        turnEvents.push({ type: 'miss', attacker: attackerSide, reason: 'sleep' });
        return;
      }
    }
    
    if (attacker.status === 'freeze') {
      const thawRoll = moveOpts.thawRoll !== undefined ? moveOpts.thawRoll : Math.random();
      if (thawRoll < 0.10) {
        attacker.status = null;
        log.push(`${attacker.name} thawed out!`);
      } else {
        log.push(`${attacker.name} is frozen solid!`);
        turnEvents.push({ type: 'miss', attacker: attackerSide, reason: 'freeze' });
        return;
      }
    }

    const move = action.move;
    log.push(`${attacker.name} used ${move.name}!`);

    if (move.accuracy && move.accuracy < 100) {
      const hitRoll = moveOpts.hitRoll !== undefined ? moveOpts.hitRoll : Math.floor(Math.random() * 100);
      if (hitRoll >= move.accuracy) {
        log.push(`${attacker.name}'s attack missed!`);
        turnEvents.push({ type: 'miss', attacker: attackerSide });
        return;
      }
    }

    const { damage, effectiveness } = calculateDamage(attacker, defender, move, moveOpts);

    if (effectiveness === 0) {
      log.push(`It doesn't affect ${defender.name}...`);
      turnEvents.push({ type: 'damage', target: defenderSide, amount: 0, effectiveness: 0 });
      return;
    }

    defender.hp -= damage;
    if (defender.hp < 0) defender.hp = 0;

    turnEvents.push({ type: 'damage', target: defenderSide, amount: damage, effectiveness });
    if (effectiveness > 1) {
      log.push(`It's super effective!`);
    } else if (effectiveness > 0 && effectiveness < 1) {
      log.push(`It's not very effective...`);
    }

    if (defender.hp === 0) {
      log.push(`${defender.name} fainted!`);
      turnEvents.push({ type: 'faint', target: defenderSide });
    }
  };

  // 2. Determine turn order
  let p1GoesFirst = true;
  if (action1 && action2 && action1.type === 'move' && action2.type === 'move') {
    const p1MovePri = action1.move.priority || 0;
    const p2MovePri = action2.move.priority || 0;

    if (p1MovePri > p2MovePri) {
      p1GoesFirst = true;
    } else if (p2MovePri > p1MovePri) {
      p1GoesFirst = false;
    } else {
      let p1Speed = newState.p1.active.stats.spe;
      let p2Speed = newState.p2.active.stats.spe;
      if (newState.p1.active.status === 'paralysis') p1Speed = Math.floor(p1Speed / 4);
      if (newState.p2.active.status === 'paralysis') p2Speed = Math.floor(p2Speed / 4);

      if (p1Speed > p2Speed) p1GoesFirst = true;
      else if (p2Speed > p1Speed) p1GoesFirst = false;
      else {
        if (speedTieWinner) {
          p1GoesFirst = speedTieWinner === 'p1';
        } else {
          p1GoesFirst = Math.random() < 0.5;
        }
      }
    }
  } else if (action1 && action1.type === 'move') {
    p1GoesFirst = true;
  } else if (action2 && action2.type === 'move') {
    p1GoesFirst = false;
  }

  // 3. Execute moves
  if (p1GoesFirst) {
    executeMove('p1', 'p2', action1, p1Randoms);
    executeMove('p2', 'p1', action2, p2Randoms);
  } else {
    executeMove('p2', 'p1', action2, p2Randoms);
    executeMove('p1', 'p2', action1, p1Randoms);
  }

  // 4. End of turn effects
  const applyEndOfTurn = (side) => {
    const active = newState[side].active;
    if (active.hp <= 0) return;

    if (active.status === 'burn') {
      const dmg = Math.max(1, Math.floor(active.stats.maxHp / 16));
      active.hp -= dmg;
      if (active.hp < 0) active.hp = 0;
      turnEvents.push({ type: 'status', target: side, condition: 'burn' });
      log.push(`${active.name} is hurt by its burn!`);
      if (active.hp === 0) {
        turnEvents.push({ type: 'faint', target: side });
        log.push(`${active.name} fainted!`);
      }
    } else if (active.status === 'poison') {
      const dmg = Math.max(1, Math.floor(active.stats.maxHp / 16));
      active.hp -= dmg;
      if (active.hp < 0) active.hp = 0;
      turnEvents.push({ type: 'status', target: side, condition: 'poison' });
      log.push(`${active.name} is hurt by poison!`);
      if (active.hp === 0) {
        turnEvents.push({ type: 'faint', target: side });
        log.push(`${active.name} fainted!`);
      }
    }

    if (active.hp > 0 && active.item === 'Leftovers') {
      const heal = Math.max(1, Math.floor(active.stats.maxHp / 16));
      active.hp = Math.min(active.stats.maxHp, active.hp + heal);
      turnEvents.push({ type: 'heal', target: side, amount: heal });
      log.push(`${active.name} restored a little HP using its Leftovers!`);
    }
  };

  applyEndOfTurn('p1');
  applyEndOfTurn('p2');

  return { newState, turnEvents, log };
}

module.exports = { calculateDamage, resolveTurn };
