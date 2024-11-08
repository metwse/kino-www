var fields = {
    Deck: "id, owner_id, card_count, interval, level",
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

    init() {
        this.interval = this.interval.days * 24 + this.interval.microseconds / 36e8
    }
}

class Card extends APIBindings {
    get foreinKeys() {
        var obj = {
            decks: [`deck:${this.deckId}`],
            faces: [`front:${this.front}`, ...this.back.map((face_id, i) => `back[${i}]:${face_id}`)],
        }
        return obj
    }

    init() {
        this.doneAt = new Date(this.doneAt);
        this.backIds = [...this.back];
        this.frontId = this.front;
    }

    async move(up) {
        var currentLevel = this.deck.level;
        var nextDeck, prevDeck;

        if (up) nextDeck = this.session.decks.find(deck => deck.level == currentLevel + 1);
        else prevDeck = this.session.decks.find(deck => deck.level == currentLevel - 1);

        var cardIndex = this.session.cards.findIndex(card => card.id == this.id);
        var indexedCard = this.session.cards[cardIndex];
        indexedCard.doneAt = new Date().getTime();
        this.doneAt = new Date();

        if (up) {
            if (nextDeck) {
                this.deck = indexedCard.deck = nextDeck;
                await this.session.request(`/cards/${this.id}/move?${nextDeck.id}`);
                return "moved"
            } else {
                this.session.cards.splice(cardIndex, 1)[0];
                await this.session.request(`/cards/${this.id}/delete`);
                return "removed"
            }
        } else {
            if (prevDeck) {
                this.deck = indexedCard.deck = prevDeck;
                await this.session.request(`/cards/${this.id}/move?${prevDeck.id}`);
                return "moved"
            } else {
                await this.session.request(`/cards/${this.id}/done`);
                return "kept"
            }
        }
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
