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
        this.elem.innerText = this.word.replaceAll("_", " ") + " ";
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
        let data = await window.session.getWord("wn", this.word);
        let lemma = data?.lemma ?? "word not found";
        this.elem.innerHTML = `
            <div class="kino-wn">
                <h2>${lemma.replaceAll("_", " ")}</h2>
            </div>
        `;
        let elem = this.elem.querySelector("div");

        for (let type of ["noun", "verb", "adj", "adv"]) {
            let gloassary = data?.[type]
            if (gloassary && gloassary.length > 0) {
                let typeElem = document.createElement("div");
                typeElem.className = "type";
                typeElem.innerHTML = `<span class="type-name">${type}</span>`
                for (let meaning of gloassary) {
                    let meaningElem = document.createElement("div")
                    typeElem.className = "meaning";
                    meaningElem.innerHTML = `
                        <b>${meaning.meanings}</b>
                        <div class="synonyms"></div>
                        <div class="examples"></div>
                    `
                    if (meaning.synonyms.length > 1) {
                        let synonyms = meaningElem.querySelector(".synonyms");
                        for (let synonym of meaning.synonyms) {
                            if (synonym == lemma) continue
                            let i = document.createElement("i");
                            i.innerText = synonym.replaceAll("_", " ");
                            synonyms.appendChild(i)
                        }
                    }
                    if (meaning.examples.length > 0) {
                        let examples = meaningElem.querySelector(".examples");
                        for (let example of meaning.examples) {
                            let span = document.createElement("span");
                            span.innerText = `⎯ ${example}`;
                            examples.appendChild(span)
                        }
                    }
                    typeElem.appendChild(meaningElem)
                }
                elem.appendChild(typeElem)
            }
        }
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
