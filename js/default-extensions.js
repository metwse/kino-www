window.EXTENSION_TYPES = [
    "word",
    "interactive",
    "dict",
    "readonly",
]

class Extension {
    constructor(elem) {
        this.elem = elem
    }
}

class Word extends Extension {
    static type = "word"

    constructor(elem, word) {
        super(elem);
        this.word = word;
    }
}

class Note extends Extension {
    static type = "readonly"

    constructor(elem, note) {
        super(elem);
        this.note = note;
    }
}

class WN extends Extension {
    static type = "dictionary"

    constructor(elem, data, word) {
        super(elem)
        this.word = data ?? word
    }
}


window.extensions = {
    Extension,
    default: {
        Word,
        Note,
        dictonaries: {
            WN
        }
    }
}
