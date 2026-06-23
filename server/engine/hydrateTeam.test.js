const { hydrateTeam } = require('./hydrateTeam');

describe('hydrateTeam', () => {
  it('correctly hydrates Pikachu at level 100', () => {
    const raw = [{
      pokemonId: 25,
      nickname: 'Sparky',
      moveset: ['thunderbolt', 'quick-attack', 'thunder-wave', 'surf'],
      heldItem: 'Magnet'
    }];
    
    const team = hydrateTeam(raw);
    expect(team.length).toBe(1);
    
    const pika = team[0];
    expect(pika.name).toBe('pikachu');
    expect(pika.nickname).toBe('Sparky');
    expect(pika.level).toBe(100);
    
    // Pikachu base speed = 90
    // formula: floor(((90 + 15) * 2 + 63) * 100 / 100) + 5 = 210 + 63 + 5 = 278
    expect(pika.stats.spe).toBe(278);
    
    // Thunderbolt checks
    const tb = pika.moves.find(m => m.name === 'thunderbolt');
    expect(tb).toBeDefined();
    expect(tb.power).toBe(90);
    expect(tb.type).toBe('Electric');
    expect(tb.accuracy).toBe(100);
    expect(tb.category).toBe('Special');
    
    // Item checks
    expect(pika.item).toBeDefined();
    expect(pika.item.name).toBe('Magnet');
  });
});
