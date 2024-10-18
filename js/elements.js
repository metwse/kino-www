class KinoDeck extends HTMLElement {
    constructor() {
        super();
        this.cards = []
    }
    
    addCards(cards) {
        this.cards.push(...cards)
    }

    next(up, move) {
        return new Promise(resolve => {
            if (this.blocked) return resolve()
            let timeout = 1;
            this.blocked = true;
            if (this.card) {
                timeout = 300
                let targetX = window.screen.width * (up ? 1 : -1)
                this.card.animate(
                    [
                        { transform: `${this.card.style.transform}`},
                        { transform: `translateX(${targetX}px)`},
                    ],
                    {
                        fill: "forwards",
                        easing: "ease-in",
                        duration: 300
                    }
                )
                if (move)
                    this.card.data.move(up)
            } 
            setTimeout(_ => {
                this.blocked = false;
                this.card = this.cards.pop();
                if (this.card) {
                    this.card = KinoCard.new(this.card);
                    this.innerHTML = "";
                    this.appendChild(this.card);
                    resolve()
                }
            }, timeout);
        })
    }
}

class KinoCard extends HTMLElement {
    constructor() {
        super();
    }

    static new(data) {
        let card = document.createElement("kino-card");
        card.data = data;
        card.load();
        return card
    }

    load() {
        this.front = document.createElement("kino-face");
        this.front.className = "front";
        this.sharedData = this.data.front.data;
        this.front.load(this.data.front);
        this.appendChild(this.front);
        this.back = document.createElement("div")
        this.back.className = "kino-back";
        this.back.style.display = "none"
        
        for (let back of this.data.back) {
            let elem = document.createElement("kino-face");
            elem.load(back, this.sharedData);
            this.back.appendChild(elem);
        }
    }

    connectedCallback() {
        document.body.appendChild(this.back)
    }

    disconnectedCallback() {
        this.back.remove()
    }
}

class KinoFace extends HTMLElement {
    constructor() {
        super()
    }

    async load(face, sharedData) {
        let constructor = eval(face.extension.data);
        let faceHandler = new constructor(this, face, sharedData);

        if (faceHandler.init) 
            await faceHandler.init()
    }
}

customElements.define("kino-deck", KinoDeck)
customElements.define("kino-card", KinoCard)
customElements.define("kino-face", KinoFace)

window.kinoElements = {
    KinoDeck, 
    KinoCard,
    KinoFace
}
