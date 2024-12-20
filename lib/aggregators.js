// A helper for common aggregations.
// In a more complete system, you'd have more complex accumulators.
// For now, just provide a structure for aggregator and test.

export function countAggregator(facts) {
    return facts.length;
}

export function sumAggregator(attr) {
    return facts => facts.reduce((sum, f) => sum + (f.data[attr] || 0), 0);
}

export function maxAggregator(attr) {
    return facts => Math.max(...facts.map(f => f.data[attr]));
}
