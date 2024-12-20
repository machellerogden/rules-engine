export class Fact {
    constructor(data) {
        // data should at least have a 'type' property.
        if (!data.type) {
            throw new Error("Fact data must have a 'type' property.");
        }
        this.data = data;
        this.id = Symbol(); // unique identifier
    }
}
