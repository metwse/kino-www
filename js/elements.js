class KinoDict extends HTMLElement {
    constructor() {
        super();
    }
    
}

class KinoCard extends HTMLElement {
    constructor() {
        super();
    }
}

customElements.define("kino-dict", KinoDict)
customElements.define("kino-card", KinoCard)

window.kinoElements = {
    KinoDict, 
    KinoCard
}
