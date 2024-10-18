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

    constructor(elem, face) {
        super(elem);
        this.word = face.data;
    }

    init() {
        this.elem.innerText = this.word.replaceAll("_", " ");
    }
}

//TODO
class Note extends Extension {
    static type = "readonly"

    constructor(elem, face) {
        super(elem);
        this.note = face.data;
    }
}

class WN extends Extension {
    static type = "dictionary"

    constructor(elem, face, word) {
        super(elem)
        this.word = face.data ?? word

    }

    async init() {
        let data = await window.session.getWord("wn", this.word)
        this.elem.innerText = data.lemma
    }
}


window.extensions = {
    Extension,
    default: {
        Word,
        Note,
        dictionaries: {
            WN
        }
    }
}
