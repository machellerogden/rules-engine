export class Query {
    constructor(wmi, type) {
        this.wmi = wmi;
        this.type = type;
        this.predicate = null;
        this._limit = Infinity;
    }

    where(predicate) {
        this.predicate = predicate;
        return this;
    }

    limit(n) {
        this._limit = n;
        return this;
    }

    execute() {
        let results = this.type ? this.wmi.getByType(this.type) : this.wmi.allFacts();
        if (this.predicate) {
            results = results.filter(fact => this.predicate(fact.data));
        }
        if (this._limit !== Infinity) {
            results = results.slice(0, this._limit);
        }
        return results;
    }
}
