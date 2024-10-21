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

class KinoSearch extends HTMLElement {
    constructor() {
        super()
    }

    init(opt) {
        this.api = {
            suggest: opt.suggest,
            suggestSearch: opt.suggestSearch
        }

        this.input = document.createElement("input");
        this.button = document.createElement("button");
        this.button.innerText = "add"
        this.suggestions = document.createElement("ul");

        this.appendChild(this.input);
        this.appendChild(this.button);
        this.appendChild(this.suggestions);

        this.selectedIndex = -1;
        this.suggestionList = [];

        var random;
        this.input.onkeydown = async e => {
            if (e.key == "Enter") {
                let word = (await this.api.suggestSearch(this.input.value))[this.selectedIndex == -1 ? 0 : this.selectedIndex]
                if (word) this.emitword(word)
                else
                    this.setSuggestions(await this.api.suggest(this.input.value))
                return
            }
            if (["ArrowUp", "ArrowDown"].includes(e.key)) {
                e.preventDefault()
                var elem = this.suggestionList[this.selectedIndex];
                if (elem) elem.classList.remove("highlighted");

                if (e.key == "ArrowDown") {
                    if (this.selectedIndex < this.suggestionList.length - 1)
                        this.selectedIndex++
                    else
                        this.selectedIndex = 0
                } else if (this.selectedIndex > 0) {
                    this.selectedIndex--
                } else 
                    this.selectedIndex = this.suggestionList.length - 1

                elem = this.suggestionList[this.selectedIndex];
                if (elem) elem.classList.add("highlighted");
                
                return
            }

            var thisRandom = random = Math.random()
            setTimeout(async _ => {
                if (!this.input.value.length) return this.suggestions.innerText = ""
                if (random != thisRandom) return
                this.selectedIndex = -1;
                this.setSuggestions(await this.api.suggestSearch(this.input.value))
            }, 100)
        }
    }

    emitword(word) {
        this.onword(word)
        this.input.value = this.suggestions.innerText = ""
    }

    setSuggestions(words) {
        this.suggestions.innerText = "";
        this.suggestionList = [];
        let first = true
        for (let word of words) {
            let li = document.createElement("li");
            li.innerText = word;
            this.suggestions.appendChild(li);
            li.onclick = _ => this.emitword(word);
            this.suggestionList.push(li);
            if (first) {
                first = false; li.classList.add("highlighted")
            }
        }
    }
}

customElements.define("kino-deck", KinoDeck)
customElements.define("kino-card", KinoCard)
customElements.define("kino-face", KinoFace)
customElements.define("kino-search", KinoSearch)

window.kinoElements = {
    KinoDeck, 
    KinoCard,
    KinoFace
}
