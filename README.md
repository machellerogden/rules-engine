# RulesEngine

> A flexible, forward-chaining rules engine for JavaScript applications.

It provides a declarative way to define conditions and actions, then automatically applies them to a working memory of facts. The engine supports a robust DSL, logical operators, accumulations, beta tests for variable-based relationships, salience-based conflict resolution, and more.

## Key Features

- **Declarative DSL for Conditions:** Define complex rules using all, any, not, exists operators, and nest them for sophisticated logic.
- **Typed Facts & Indexed Memory:** Facts are stored in working memory, indexed by type for fast lookups.
- **Alpha & Beta Nodes Under the Hood:** Internally uses a network of nodes to match and combine facts, and a BetaTestNode to apply conditions that cross-reference previously matched variables.
- **Accumulations / Aggregations:** Aggregate sets of facts with custom aggregator functions (e.g., counting, summation) and apply tests to the aggregated result.
- **Salience and Conflict Resolution:** Apply custom priority (salience) to rules so that important rules fire first when multiple matches appear simultaneously.
- **Prevent Infinite Loops:** A firing history prevents repeated firing of the exact same scenario, achieving a stable state.
- **Queryable Working Memory:** After facts and rules have been processed, run queries over working memory for inspection or further processing.

## Public API

### Instantiation

```js
import { RulesEngine } from './lib/rules-engine.js';

const engine = new RulesEngine();
```

### Adding Facts

```js
engine.addFact({ type: 'Person', name: 'Frodo', age: 50 });
engine.addFact({ type: 'Event', category: 'Birthday', personName: 'Frodo' });
```

- `engine.addFact(factData)` inserts a fact into working memory. `factData` must have at least a type property.

### Defining Rules

Rules are objects with at least name, conditions, and action. Conditions can be nested logical structures or simple type filters:

```js
engine.addRule({
    name: 'AdultBirthdayRule',
    // Optional priority to control firing order:
    salience: 10,
    conditions: {
        all: [
            { var: 'p', type: 'Person', test: p => p.age >= 18 },
            { var: 'e', type: 'Event', test: e => e.category === 'Birthday' },
            // A beta-level test: cross-check personName == person's name
            { test: (facts, bindings) => bindings.e.data.personName === bindings.p.data.name },
            { not: { type: 'Orc', test: o => true } }
        ]
    },
    action: (facts, engine, bindings) => {
        console.log(`Rule fired for ${bindings.p.data.name}!`);
        // Modify memory if desired:
        engine.addFact({ type: 'FellowshipMember', name: bindings.p.data.name });
    }
});
```

- **conditions**: A DSL object supporting:
- `all`, `any`, `not`, exists
- Conditions with type and test functions
- Accumulation with accumulate: `{ aggregator, test }`
- Beta tests (`{ test: (facts, bindings) => ... }`) to filter matches after variable bindings
- `action(facts, engine, bindings)`: A function invoked when conditions are met. It can modify the working memory by adding more facts, and can reference the engine for queries or further insertions.

### Running the Engine

```js
engine.run();
```

- Evaluates all rules against the current set of facts.
- Continues forward-chaining until no new matches appear or a maximum cycle count is reached.
- Prevents infinite loops by tracking fired scenarios.

### Querying Facts

```js
const fellowship = engine.query('FellowshipMember').execute();
console.log('Fellowship:', fellowship.map(f => f.data.name));
```

- `engine.query(type)` creates a query builder.
- `.where(predicate)` can filter by attributes.
- `.limit(n)` limits results.
- `.execute()` returns an array of matched facts.

## Examples

See the `./examples` directory.

## Roadmap
- Additional indexing strategies for performance.
- More comprehensive conflict resolution policies.
- Better error handling and logging.
- Additional accumulators.
- Fun name.

## Contributing

Contributions are welcome. Please open an issue or submit a pull request if you have ideas, bug reports, or improvements.

## License

MIT License. See LICENSE for details.
