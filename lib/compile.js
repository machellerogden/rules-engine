import { AlphaNode, BetaTestNode, LogicalAllNode, LogicalAnyNode, LogicalNotNode, LogicalExistsNode, AccumulatorNode } from './nodes.js';

function isBetaTestCondition(c) {
    return c.test && !c.type && !c.all && !c.any && !c.not && !c.exists && !c.accumulate;
}

export function compileConditions(conditions) {
    if (conditions.all) {
        return compileLogicalNode(conditions.all, 'all');
    } else if (conditions.any) {
        return compileLogicalNode(conditions.any, 'any');
    } else if (conditions.not) {
        return new LogicalNotNode(compileConditions(conditions.not));
    } else if (conditions.exists) {
        return new LogicalExistsNode(compileConditions(conditions.exists));
    } else if (isBetaTestCondition(conditions)) {
        // Beta test conditions can't stand alone at the top-level. They must be applied within an 'all' or 'any'.
        // We'll return a special marker (the test function) that indicates we need to wrap a previous node.
        return { betaTest: conditions.test };
    } else {
        // It's an alpha or accumulator condition
        const { type, test, var: varName, accumulate } = conditions;
        const alpha = new AlphaNode({ type, test, varName });
        if (accumulate) {
            const { aggregator, test: accTest } = accumulate;
            return new AccumulatorNode({ childNode: alpha, aggregator, accTest });
        } else {
            return alpha;
        }
    }
}

function compileLogicalNode(subConditions, operatorType) {
    const alphaAndLogicalNodes = [];
    const betaTests = [];

    for (const c of subConditions) {
        const result = compileConditions(c);

        if (result && result.betaTest) {
            // Store the beta test function to apply later
            betaTests.push(result.betaTest);
        } else {
            // This is an alpha or composite node, store it
            alphaAndLogicalNodes.push(result);
        }
    }

    // Now combine all alpha/logical nodes
    let combinedNode;
    if (alphaAndLogicalNodes.length === 0) {
        // If we have only beta tests and no alpha nodes,
        // that doesn't really make sense, but let's handle gracefully:
        // A beta test alone without facts? Let's create a dummy node that returns one empty match.
        combinedNode = new NoFactNode();
    } else if (alphaAndLogicalNodes.length === 1) {
        combinedNode = alphaAndLogicalNodes[0];
    } else {
        if (operatorType === 'all') {
            combinedNode = new LogicalAllNode(alphaAndLogicalNodes);
        } else {
            combinedNode = new LogicalAnyNode(alphaAndLogicalNodes);
        }
    }

    // Apply beta tests (each wraps the current node)
    for (const testFn of betaTests) {
        combinedNode = new BetaTestNode(combinedNode, testFn);
    }

    return combinedNode;
}

export function initializeNodesWithWMI(rootNode, wmi) {
    if (rootNode.setWMI) {
        rootNode.setWMI(wmi);
    }
}
