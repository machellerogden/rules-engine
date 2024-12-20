import { WorkingMemoryIndexer } from './working-memory-indexer.js';
import { ProductionRule } from './production-rule.js';
import { compileConditions, initializeNodesWithWMI } from './compile.js';
import { Query } from './query.js';
import { Fact } from './fact.js';

const MAX_CYCLES = 100;

export class RulesEngine {
    constructor() {
        this.wmi = new WorkingMemoryIndexer();
        this.rules = [];
        this.cycleCount = 0;
        this.firedHistory = new Set();
        this.conflictResolver = this.defaultConflictResolver;
    }

    addFact(factData) {
        const fact = new Fact(factData);
        this.wmi.insertFact(fact);
        return fact;
    }

    addRule(ruleDef) {
        // Allow users to specify salience
        const salience = (typeof ruleDef.salience === 'number') ? ruleDef.salience : 0;
        const rule = new ProductionRule({ ...ruleDef, salience });
        this.rules.push(rule);
        return rule;
    }

    query(type) {
        return new Query(this.wmi, type);
    }

    setConflictResolver(resolverFn) {
        this.conflictResolver = resolverFn;
    }

    run() {
        let somethingFired = true;
        while (somethingFired && this.cycleCount < MAX_CYCLES) {
            this.cycleCount++;
            // 1. Collect all matches from all rules (match phase)
            const agenda = this.collectMatches();

            // 2. Resolve conflicts (filter & sort matches)
            const resolvedAgenda = this.conflictResolver(agenda);

            // 3. Fire selected matches
            somethingFired = this.fireMatches(resolvedAgenda);
        }

        if (this.cycleCount >= MAX_CYCLES) {
            throw new Error(`Max cycles (${MAX_CYCLES}) reached. Possible infinite loop.`);
        }
    }

    collectMatches() {
        const agenda = [];
        for (const rule of this.rules) {
            const rootNode = compileConditions(rule.conditions);
            initializeNodesWithWMI(rootNode, this.wmi);
            const matches = rootNode.evaluateAndGetPartialMatches();

            for (const match of matches) {
                const factIds = match.facts.map(f => f.id.toString()).sort().join(',');
                const signature = `${rule.name}::${factIds}`;
                agenda.push({
                    rule,
                    match,
                    signature,
                    salience: rule.salience
                });
            }
        }
        return agenda;
    }

    defaultConflictResolver(agenda) {
        // Remove matches that have fired before (refractoriness)
        const filtered = agenda.filter(a => !this.firedHistory.has(a.signature));

        // Sort by salience descending, then by signature (or any secondary stable sort)
        filtered.sort((a, b) => b.salience - a.salience || a.signature.localeCompare(b.signature));

        return filtered;
    }

    fireMatches(resolvedAgenda) {
        let somethingFired = false;
        // For this iteration, let's fire all matches in the resolved agenda
        // In more complex scenarios, you might choose only the top match or a subset.
        for (const { rule, match, signature } of resolvedAgenda) {
            rule.action(match.facts, this, match.bindings);
            this.firedHistory.add(signature);
            somethingFired = true;
        }

        return somethingFired;
    }
}
