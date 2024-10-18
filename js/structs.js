var fields = {
    Deck: "id, owner_id, name, card_count, interval",
    Card: "id, owner_id, deck_id, front, back, done_at",
    Face: "id, owner_id, extension_id, data",
    Extension: "id, owner_id, name, data",
};

// stores fields in snake case-camel case pairs
fields = 
    Object.fromEntries(
        Object.entries(fields)
            .map(([k, v]) => [
                k,
                v.split(", ").map(v => [v, v.toLowerCase().replace(/(\_\w)/, group => group[1].toUpperCase())])
            ])
    )


class APIBindings {
    constructor(data) {
        Object.assign(this, data);
    }

    // from snake case data
    static deserialize(data) {
        var obj = {};
        for (let [snake, camel] of fields[this.prototype.constructor.name])
            obj[camel] = data[snake];
        return new this(obj)
    }

    // to snake case data
    serialize() {
        var obj = {};
        for (let [snake, camel] of fields[Object.getPrototypeOf(this).constructor.name])
            obj[snake] = this[camel];
        return obj
    }

    loadForeinKeys(obj) {
        for (let [key, _value] of Object.entries(obj))
            eval(`this.${key} = _value`)
    }
}

class Deck extends APIBindings {
    get foreinKeys() {
        return { }
    }
}

class Card extends APIBindings {
    get foreinKeys() {
        var obj = {
            decks: [`deck:${this.deckId}`],
            faces: [`front:${this.front}`, ...this.back.map((face_id, i) => `back[${i}]:${face_id}`)],
        }
        this.back = []
        return obj
    }
}

class Face extends APIBindings {
    get foreinKeys() {
        return {
            extensions: [`extension:${this.extensionId}`],
        }
    }
}

class Extension extends APIBindings {
    get foreinKeys() {
        return { }
    }
}



window.structs = {
    APIBindings,
    Deck,
    Card,
    Face,
    Extension
}
