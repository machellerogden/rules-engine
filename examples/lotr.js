import { RulesEngine } from '../lib/rules-engine.js'; // renamed as per your last note

// Create engine
const engine = new RulesEngine();

// Add facts: Characters and Artifacts
engine.addFact({ type: 'Hobbit', name: 'Frodo', age: 50 });
engine.addFact({ type: 'Hobbit', name: 'Sam', age: 38 });
engine.addFact({ type: 'Elf', name: 'Legolas', age: 200 });
engine.addFact({ type: 'Man', name: 'Aragorn', age: 87 });
engine.addFact({ type: 'Dwarf', name: 'Gimli', age: 139 });
engine.addFact({ type: 'Artifact', name: 'OneRing', ownerName: 'Frodo' });
// No orcs yet...

engine.addRule({
  name: 'OrcDistractionRule',
  salience: 0, // lower than OrcDangerWarning below
  conditions: {
    all: [
      { exists: { type: 'Orc', test: o => true } }
    ]
  },
  action: () => {
    console.log('Some heroes are distracted by the Orcs!');
  }
});

// High-salience rule warns of Orc danger
engine.addRule({
  name: 'OrcDangerWarning',
  salience: 10,
  conditions: {
    all: [
      { exists: { type: 'Orc', test: o => true } }
    ]
  },
  action: () => {
    console.log('WARNING: Orcs present! Danger awaits!');
    engine.addFact({ type: 'Event', name: 'Danger' });
  }
});

// Rule to form the fellowship if OneRing and a suitable Hobbit exist and no Orcs
engine.addRule({
  name: 'FormFellowship',
  conditions: {
    all: [
      // Find a Hobbit over 30
      { var: 'h', type: 'Hobbit', test: h => h.age > 30 },
      // Find the OneRing artifact
      { var: 'r', type: 'Artifact', test: a => a.name === 'OneRing' },
      // Beta test to ensure ring’s owner matches the hobbit
      { test: (facts, bindings) => {
          const hobbit = bindings.h.data;
          const ring = bindings.r.data;
          return ring.ownerName === hobbit.name;
        }
      },
      // No Orcs: using NOT
      { not: { type: 'Orc', test: o => true } }
    ]
  },
  action: (facts, eng, bindings) => {
    console.log(`The Fellowship is formed around ${bindings.h.data.name}!`);
    eng.addFact({ type: 'Event', name: 'FellowshipFormed' });

    // Add a tag to fellowship members (Hobbits and Elves)
    // We'll consider all Hobbits and Elves as fellowship members initially.
    for (const fact of eng.query().execute()) {
      if (fact.data.type === 'Hobbit' || fact.data.type === 'Elf') {
        eng.addFact({ type: 'FellowshipMember', name: fact.data.name });
      }
    }
  }
});

// Counting fellowship members if FellowshipFormed is present
engine.addRule({
  name: 'CountFellowship',
  conditions: {
    all: [
      { type: 'Event', test: e => e.name === 'FellowshipFormed' },
      {
        type: 'FellowshipMember',
        test: m => true,
        accumulate: {
          aggregator: fellows => fellows.length,
          test: count => count > 0
        }
      }
    ]
  },
  action: (facts, eng) => {
    const memberCount = facts.filter(f => f.data.type === 'FellowshipMember').length;
    console.log(`Fellowship count: ${memberCount} members.`);
  }
});

// Handle Quest activation if it’s not expired (demonstrating NOT again)
engine.addFact({ type: 'Event', name: 'QuestOfMountDoom', expired: false });
engine.addRule({
  name: 'ActiveQuest',
  conditions: {
    all: [
      { var: 'q', type: 'Event', test: e => e.name === 'QuestOfMountDoom' },
      { test: (facts, bindings) => {
          const quest = bindings.q.data;
          return quest.expired === false;
        }
      },
      // no expired quest event
      { not: { type: 'Event', test: e => e.name === 'ExpiredQuest' } }
    ]
  },
  action: () => {
    console.log('The quest is active! Let heroes embark on their journey.');
  }
});

// No Orcs initially, so no danger event triggered yet
console.log('Initial Run');
engine.run();

// Let's add an Orc and rerun to see the Orc danger rule with high salience
engine.addFact({ type: 'Orc', name: 'Snaga', age: 20 });

// Now, the Orc danger warning should trigger
console.log('Second Run');
engine.run();

// After forming the fellowship and adding orcs, let's query who ended up in the fellowship
const fellowshipMembers = engine.query('FellowshipMember').execute();
console.log('Fellowship Members:', fellowshipMembers.map(m => m.data.name));
