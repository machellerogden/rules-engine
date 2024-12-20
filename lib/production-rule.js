// A rule: { name, conditions, action }
// conditions is a DSL object that can contain:
//  - all: []
//  - any: []
//  - not: {...}
//  - exists: {...}
//  - single condition: { type, test, var, accumulate }

// action: function(matches, engine) { ... }

export class ProductionRule {
    constructor({ name, conditions, action }) {
        this.name = name;
        this.conditions = conditions; // DSL object
        this.action = action;
    }
}
