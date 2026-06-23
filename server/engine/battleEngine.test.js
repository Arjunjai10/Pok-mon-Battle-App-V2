const { calculateDamage, resolveTurn } = require('./battleEngine');
const { calculateStat } = require('./statCalc');

const createMockPokemon = (overrides = {}) => ({
  name: 'Pikachu',
  level: 100,
  types: ['Electric'],
  hp: 300,
  status: null,
  stats: {
    maxHp: 300,
    atk: 200,
    def: 200,
    spcAtk: 200,
    spcDef: 200,
    spe: 200
  },
  ...overrides
});

const createState = (p1, p2) => ({
  p1: { active: p1, team: [p1] },
  p2: { active: p2, team: [p2] }
});

describe('Battle Engine Phase 1', () => {

  describe('Stat Calculation', () => {
    it('calculates HP correctly', () => {
      // Mewtwo base 106 HP, Level 100, DV 15, StatExp 65535
      const hp = calculateStat(106, 100, true);
      expect(hp).toBe(415);
    });

    it('calculates other stats correctly', () => {
      // Mewtwo base 154 SpA, Level 100, DV 15, StatExp 65535
      const spa = calculateStat(154, 100, false);
      expect(spa).toBe(406);
    });
  });

  describe('Damage Formula', () => {
    it('applies STAB and Type Effectiveness', () => {
      const p1 = createMockPokemon({ types: ['Fire'], stats: { atk: 200, def: 200, spcAtk: 200, spcDef: 200, spe: 200 } });
      const p2 = createMockPokemon({ types: ['Grass'] });
      const move = { name: 'Flamethrower', power: 90, type: 'Fire', category: 'Special' };

      const { damage, effectiveness } = calculateDamage(p1, p2, move, { randomRoll: 255 }); // Max roll
      
      expect(effectiveness).toBe(2);
      expect(damage).toBeGreaterThan(0);
      
      // Let's test a non-STAB move
      const move2 = { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' };
      const nonStab = calculateDamage(p1, p2, move2, { randomRoll: 255 });
      expect(nonStab.effectiveness).toBe(1);
    });

    it('handles deterministic random rolls', () => {
      const p1 = createMockPokemon();
      const p2 = createMockPokemon();
      const move = { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' };

      const dmgMax = calculateDamage(p1, p2, move, { randomRoll: 255 });
      const dmgMin = calculateDamage(p1, p2, move, { randomRoll: 217 });

      expect(dmgMax.damage).toBeGreaterThan(dmgMin.damage);
    });

    it('applies Burn attack halving correctly', () => {
      const p1Burned = createMockPokemon({ status: 'burn', stats: { atk: 200, def: 200 } });
      const p1Healthy = createMockPokemon({ stats: { atk: 200, def: 200 } });
      const p2 = createMockPokemon();
      const physicalMove = { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' };
      
      const dmgBurned = calculateDamage(p1Burned, p2, physicalMove, { randomRoll: 255 });
      const dmgHealthy = calculateDamage(p1Healthy, p2, physicalMove, { randomRoll: 255 });

      expect(dmgBurned.damage).toBeLessThan(dmgHealthy.damage);
    });
  });

  describe('Type Chart', () => {
    it('Gen 2 Ghost vs Psychic is super effective (2x)', () => {
      const p1 = createMockPokemon({ types: ['Ghost'] });
      const p2 = createMockPokemon({ types: ['Psychic'] });
      const move = { name: 'Shadow Ball', power: 80, type: 'Ghost', category: 'Special' };
      const { effectiveness } = calculateDamage(p1, p2, move, {});
      expect(effectiveness).toBe(2);
    });

    it('Gen 2 Poison vs Bug is neutral (1x)', () => {
      const p1 = createMockPokemon({ types: ['Poison'] });
      const p2 = createMockPokemon({ types: ['Bug'] });
      const move = { name: 'Sludge Bomb', power: 90, type: 'Poison', category: 'Special' };
      const { effectiveness } = calculateDamage(p1, p2, move, {});
      expect(effectiveness).toBe(1);
    });

    it('Gen 2 Steel immunities and resistances', () => {
      const p1 = createMockPokemon();
      const p2 = createMockPokemon({ types: ['Steel'] });
      
      const poisonMove = { power: 40, type: 'Poison', category: 'Physical' };
      expect(calculateDamage(p1, p2, poisonMove, {}).effectiveness).toBe(0);

      const dragonMove = { power: 40, type: 'Dragon', category: 'Physical' };
      expect(calculateDamage(p1, p2, dragonMove, {}).effectiveness).toBe(0.5);

      const fireMove = { power: 40, type: 'Fire', category: 'Special' };
      expect(calculateDamage(p1, p2, fireMove, {}).effectiveness).toBe(2);
    });

    it('Gen 2 Dark immunities', () => {
      const p1 = createMockPokemon();
      const p2 = createMockPokemon({ types: ['Dark'] });
      
      const psychicMove = { power: 90, type: 'Psychic', category: 'Special' };
      expect(calculateDamage(p1, p2, psychicMove, {}).effectiveness).toBe(0);
    });
  });

  describe('Turn Resolution', () => {
    it('returns exactly { newState, turnEvents, log }', () => {
      const p1 = createMockPokemon();
      const p2 = createMockPokemon();
      const state = createState(p1, p2);
      
      const action1 = { type: 'move', move: { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' } };
      const action2 = { type: 'move', move: { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' } };

      const result = resolveTurn(state, action1, action2, { p1Randoms: { hitRoll: 100 }, p2Randoms: { hitRoll: 100 } });
      
      expect(result).toHaveProperty('newState');
      expect(result).toHaveProperty('turnEvents');
      expect(result).toHaveProperty('log');
      expect(Array.isArray(result.turnEvents)).toBe(true);
      expect(Array.isArray(result.log)).toBe(true);
    });

    it('handles speed tie and deterministic tiebreaker', () => {
      const p1 = createMockPokemon({ stats: { spe: 100 } });
      const p2 = createMockPokemon({ stats: { spe: 100 } });
      const state = createState(p1, p2);
      
      const action1 = { type: 'move', move: { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' } };
      const action2 = { type: 'move', move: { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' } };

      const resultP1 = resolveTurn(state, action1, action2, { speedTieWinner: 'p1' });
      // p1 goes first, so p2 takes damage first
      expect(resultP1.turnEvents[0].target).toBe('p2');

      const resultP2 = resolveTurn(state, action1, action2, { speedTieWinner: 'p2' });
      expect(resultP2.turnEvents[0].target).toBe('p1');
    });

    it('handles forced switches correctly', () => {
      // Simulate p1 sending in a switch action instead of move
      const p1 = createMockPokemon({ name: 'FaintedMon', hp: 0 });
      const p1New = createMockPokemon({ name: 'FreshMon', hp: 100 });
      const p2 = createMockPokemon();
      
      const state = {
        p1: { active: p1, team: [p1, p1New] },
        p2: { active: p2, team: [p2] }
      };

      const action1 = { type: 'switch', switchTo: 1 };
      const action2 = { type: 'move', move: { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' } };

      const result = resolveTurn(state, action1, action2, {});

      expect(result.turnEvents[0].type).toBe('switch');
      expect(result.turnEvents[0].pokemon).toBe('FreshMon');
      // P2 then attacks P1
      expect(result.turnEvents[1].type).toBe('damage');
      expect(result.turnEvents[1].target).toBe('p1');
    });
  });

  describe('Status Effects', () => {
    it('Sleep: Pokémon skips turn and sleep counter decrements', () => {
      const p1 = createMockPokemon({ status: 'sleep', sleepTurns: 2, stats: { spe: 200 } });
      const p2 = createMockPokemon({ stats: { spe: 100 } });
      const state = createState(p1, p2);
      
      const action1 = { type: 'move', move: { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' } };
      const action2 = { type: 'move', move: { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' } };

      const result = resolveTurn(state, action1, action2, {});
      
      expect(result.turnEvents[0].type).toBe('miss');
      expect(result.turnEvents[0].reason).toBe('sleep');
      expect(result.newState.p1.active.sleepTurns).toBe(1);
    });

    it('Paralysis: 25% chance to skip turn', () => {
      const p1 = createMockPokemon({ status: 'paralysis', stats: { spe: 500 } });
      const p2 = createMockPokemon({ stats: { spe: 100 } });
      const state = createState(p1, p2);
      
      const action1 = { type: 'move', move: { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' } };
      const action2 = { type: 'move', move: { name: 'Tackle', power: 40, type: 'Normal', category: 'Physical' } };

      // Force paralyze
      const resultPara = resolveTurn(state, action1, action2, { p1Randoms: { paralysisRoll: 0.1 } });
      expect(resultPara.turnEvents[0].type).toBe('miss');
      expect(resultPara.turnEvents[0].reason).toBe('paralysis');

      // Force move success
      const resultMove = resolveTurn(state, action1, action2, { p1Randoms: { paralysisRoll: 0.5 } });
      expect(resultMove.turnEvents[0].type).toBe('damage');
    });
  });

});
