function calculateStat(base, level, isHp = false, dv = 15, statExp = 65535) {
  // Stat EXP formula: floor(min(ceil(sqrt(StatExp)), 255) / 4)
  const statExpBonus = Math.floor(Math.min(Math.ceil(Math.sqrt(statExp)), 255) / 4);
  const core = Math.floor((((base + dv) * 2 + statExpBonus) * level) / 100);
  
  if (isHp) {
    return core + level + 10;
  } else {
    return core + 5;
  }
}

module.exports = { calculateStat };
