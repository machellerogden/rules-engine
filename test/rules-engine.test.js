import { jest } from '@jest/globals';
import { RulesEngine } from '../index.js';

describe('RulesEngine', () => {
    let engine;

    beforeEach(() => {
        engine = new RulesEngine();
    });

    test('Inserting and querying facts', () => {
        engine.addFact({ type: 'Person', name: 'Alice', age: 30 });
        engine.addFact({ type: 'Person', name: 'Bob', age: 17 });
        const adults = engine.query('Person').where(p => p.age >= 18).execute();
        expect(adults.length).toBe(1);
        expect(adults[0].data.name).toBe('Alice');
    });

    test('Basic rule firing - single condition', () => {
        const actionSpy = jest.fn();
        engine.addFact({ type: 'Person', name: 'Charlie', age: 25 });

        engine.addRule({
            name: 'AdultRule',
            conditions: {
                all: [
                    { type: 'Person', test: p => p.age >= 18 }
                ]
            },
            action: actionSpy
        });

        engine.run();
        expect(actionSpy).toHaveBeenCalledTimes(1);
        const [[facts]] = actionSpy.mock.calls;
        expect(facts[0].data.name).toBe('Charlie');
    });

    test('Multiple rules with salience', () => {
        const firedRules = [];
        engine.addFact({ type: 'Person', name: 'Dave', age: 40 });

        engine.addRule({
            name: 'LowPriorityRule',
            salience: -10,
            conditions: {
                all: [
                    { type: 'Person', test: p => p.age >= 18 }
                ]
            },
            action: () => firedRules.push('LowPriorityRule')
        });

        engine.addRule({
            name: 'HighPriorityRule',
            salience: 10,
            conditions: {
                all: [
                    { type: 'Person', test: p => p.age >= 18 }
                ]
            },
            action: () => firedRules.push('HighPriorityRule')
        });

        engine.run();
        // HighPriorityRule should fire first
        expect(firedRules).toEqual(['HighPriorityRule', 'LowPriorityRule']);
    });

    test('Accumulation test - counting adults', () => {
        engine.addFact({ type: 'Person', name: 'Eve', age: 20 });
        engine.addFact({ type: 'Person', name: 'Frank', age: 22 });
        engine.addFact({ type: 'Person', name: 'George', age: 17 });

        const actionSpy = jest.fn();

        engine.addRule({
            name: 'MoreThanOneAdult',
            conditions: {
                all: [
                    {
                        type: 'Person',
                        test: p => p.age >= 18,
                        accumulate: {
                            aggregator: facts => facts.length,
                            test: count => count > 1
                        }
                    }
                ]
            },
            action: actionSpy
        });

        engine.run();
        expect(actionSpy).toHaveBeenCalledTimes(1);
    });

    test('Beta test node - joining conditions by variable', () => {
        // Person and event must match by name
        engine.addFact({ type: 'Person', name: 'Hannah', age: 25 });
        engine.addFact({ type: 'Event', category: 'Birthday', personName: 'Hannah' });
        engine.addFact({ type: 'Event', category: 'Birthday', personName: 'NotHannah' });

        const actionSpy = jest.fn();

        engine.addRule({
            name: 'BirthdayForThatPerson',
            conditions: {
                all: [
                    { var: 'p', type: 'Person', test: p => p.age >= 18 },
                    { var: 'e', type: 'Event', test: e => e.category === 'Birthday' },
                    // Beta test condition to ensure personName matches person.name
                    { test: (facts, bindings) => {
                        const person = bindings.p.data;
                        const event = bindings.e.data;
                        return event.personName === person.name;
                    }
                    }
                ]
            },
            action: actionSpy
        });

        engine.run();
        expect(actionSpy).toHaveBeenCalledTimes(1);
        const [[facts, , bindings]] = actionSpy.mock.calls;
        expect(bindings.p.data.name).toBe('Hannah');
        expect(bindings.e.data.personName).toBe('Hannah');
    });

    test('Not conditions - ensuring no expired events', () => {
        engine.addFact({ type: 'Person', name: 'Ian', age: 19 });
        engine.addFact({ type: 'Event', category: 'Birthday', personName: 'Ian' });
        // No 'Expired' event in memory

        const actionSpy = jest.fn();

        engine.addRule({
            name: 'AdultWithNoExpiredEvents',
            conditions: {
                all: [
                    { var: 'p', type: 'Person', test: p => p.age >= 18 },
                    { not: { type: 'Event', test: e => e.category === 'Expired' } }
                ]
            },
            action: actionSpy
        });

        engine.run();
        expect(actionSpy).toHaveBeenCalledTimes(1);
        const [[facts, , bindings]] = actionSpy.mock.calls;
        expect(bindings.p.data.name).toBe('Ian');
    });

    test('Exists condition - at least one match', () => {
        engine.addFact({ type: 'Task', title: 'Do Laundry', status: 'open' });
        engine.addFact({ type: 'Task', title: 'Buy Groceries', status: 'done' });

        const actionSpy = jest.fn();

        engine.addRule({
            name: 'AtLeastOneOpenTask',
            conditions: {
                all: [
                    { exists: { type: 'Task', test: t => t.status === 'open' } }
                ]
            },
            action: actionSpy
        });

        engine.run();
        expect(actionSpy).toHaveBeenCalledTimes(1);
    });

    test('No repeated firings of the same scenario (firedHistory)', () => {
        // Insert a fact that triggers a rule
        engine.addFact({ type: 'Person', name: 'Jack', age: 30 });

        const actionSpy = jest.fn();
        engine.addRule({
            name: 'AdultOnce',
            conditions: {
                all: [
                    { type: 'Person', test: p => p.age > 18 }
                ]
            },
            action: actionSpy
        });

        engine.run();
        // Without changes, re-running won't fire again because scenario already fired once
        engine.run();

        // Should have fired only once
        expect(actionSpy).toHaveBeenCalledTimes(1);
    });

    test('Query after rules have fired', () => {
        // If rules add or remove facts, test queries here.
        // For now, just test that queries still work after rules run.
        engine.addFact({ type: 'Person', name: 'Kelly', age: 29 });
        const actionSpy = jest.fn(() => {
            // Insert a new fact during rule firing
            engine.addFact({ type: 'Tag', value: 'VIP' });
        });

        engine.addRule({
            name: 'AddTagOnAdult',
            conditions: {
                all: [
                    { type: 'Person', test: p => p.age >= 18 }
                ]
            },
            action: actionSpy
        });

        engine.run();
        const tags = engine.query('Tag').execute();
        expect(tags.length).toBe(1);
        expect(tags[0].data.value).toBe('VIP');
    });
});
