export class WorkingMemoryIndexer {
    constructor() {
        this.typeIndex = new Map(); // type -> Set of facts
    }

    insertFact(fact) {
        let typeSet = this.typeIndex.get(fact.data.type);
        if (!typeSet) {
            typeSet = new Set();
            this.typeIndex.set(fact.data.type, typeSet);
        }
        typeSet.add(fact);
    }

    getByType(type) {
        return Array.from(this.typeIndex.get(type) || []);
    }

    allFacts() {
        let all = [];
        for (const set of this.typeIndex.values()) {
            all = all.concat(Array.from(set));
        }
        return all;
    }
}
