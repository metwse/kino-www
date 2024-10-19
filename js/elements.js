class KinoDeck extends HTMLElement {
    constructor() {
        super();
        this.cards = []
    }
    
    addCards(cards) {
        for (let card of cards) {
            if (card != this.card?.data)
                this.cards.push(card)
        }
    }

    get cardCount() {
        return this.cards.length + (this.card ? 1 : 0)
    }

    next(up, move) {
        return new Promise(async resolve => {
            if (this.blocked) return resolve("no-card");

            var timeout = false;
            var action = "no-card";
            var card;

            if (this.card) {
                timeout = true;
                let targetX = window.screen.width * (up ? 1 : -1);
                card = this.card;
                card.animate(
                    [
                       this.card.style.transform ? { transform: this.card.style.transform } : {},
                        { transform: `translateX(${targetX}px)`},
                    ],
                    {
                        fill: "forwards",
                        easing: "ease-in",
                        duration: 300
                    }
                )

                if (move) action = await card.data.move(up)
                else action = "free"
            } 

            var newCard = async _ => {
                if (timeout) card.remove()
                this.card = false;

                let newCard = this.cards.pop();
                this.blocked = false;
                if (newCard) {
                    this.card = KinoCard.new(newCard);
                    this.appendChild(this.card);
                }
                resolve(action)
            };

            if (!timeout) newCard()
            else setTimeout(newCard, 300)
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

    flipToFront() {
        let child = this.back.children[this.back.closeCounter]
        if (child) {
            child.style.display = "none"
        }
        if (this.back.closeCounter + 1 == this.back.children.length) {
            this.back.style.display = "none"
        }
        this.back.closeCounter += 1
        this.back.onclick = null
    }

    flip() {
        this.back.style.display = ""
        this.back.closeCounter = 0;
        for (let elem of Array.from(this.back.children)) {
            elem.style.display = ""
        }
        this.back.onclick = _ => this.flipToFront()
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
