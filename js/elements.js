class KinoDeck extends HTMLElement {
    constructor() {
        super();
        this.cards = [];
        this.cardElems = [];
    }

    get currentCard() { return this.cardElems[0] }

    get cardCount() { return this.cards.length + this.cardElems.length }

    
    addCards(cards) {
        for (let card of 
            cards
            .filter(card => 
                !this.cardElems.find(cardElem => card == cardElem.data) && 
                !this.cards.find(queuedCard => card == queuedCard)
            ))
            this.cards.push(card);

        this.fillWithCards();
    }

    fillWithCards() {
        while (this.children.length < 6) {
            let added = this.loadNextCard();
            if (!added) break
        }
    }

    loadNextCard() {
        let card = this.cards.pop();
        if (card) {
            let cardElem = KinoCard.new(card);
            this.insertBefore(cardElem, this.children[0]);
            cardElem.x = 0;
            cardElem.style.rotate = (Math.random() * 16 - 8) + "deg";
            this.cardElems.push(cardElem);
            return true
        }
        return false
    }

    emit(action) {
        if (this.eventHandler)
            this.eventHandler({ action, cardsLeft: this.cardCount })
    }

    init() {
        this.fillWithCards();

        var startX;
        var prevTimestamp;
        this.ontouchstart = ({ timeStamp, targetTouches: [touch] }) => {
            let card = this.currentCard;
            if (!card) return

            startX = touch.screenX;
            prevTimestamp = timeStamp;

            if (this.easeCenter) card.x = card.x / (2 ** this.easeCenterPow)

            card.speed = card.acceleration = 0;
            this.applyPhysics = this.easeCenter = false;

            this.drag = { speed: 0 }
        }

        this.ontouchmove = ({ timeStamp, targetTouches: [touch] }) => {
            let card = this.currentCard;
            if (!card) return

            var dx = touch.screenX - startX;
            startX = touch.screenX;
            var dt = timeStamp - prevTimestamp;
            var speed = dx / dt * 1000;

            card.x += dx
            card.style.transform = `translateX(${card.x}px)`

            this.drag = { dx, dt, speed };
            this.applyPhysics = this.easeCenter = false;
        }

        this.ontouchend = () => {
            let card = this.currentCard;
            if (!card || !this.drag) return

            var { speed } = this.drag

            this.applyPhysics = true;
            card.speed = speed
        }
        
        this.onclick = () => { 
            let card = this.currentCard;
            if (card) card.flip()
        }
    }

    physics(t) {
        let card = this.currentCard;
        if (this.physicsT && card && this.applyPhysics) {
            let dt = (t - this.physicsT) / 1000;
            card.x += card.speed * dt
            card.speed += card.acceleration * dt;

            let easeToCenter = () => {
                if (!this.easeCenter) this.easeCenterPow = 0
                this.easeCenter = true
                card.speed = card.acceleration = 0;
            }

            if (!card.keyboardMove) {
                if (Math.abs(card.speed) > card.offsetWidth / 2 || Math.abs(card.x) > card.offsetWidth / 2) {
                    if (Math.sign(card.x) != Math.sign(card.speed)) easeToCenter()
                    else card.acceleration = Math.sign(card.x) * card.offsetWidth * 10;
                }
                else easeToCenter()
            }

            if (this.easeCenter) {
                this.easeCenterPow += 1 / (dt * 200)
                if (Math.abs(card.x / (2 ** this.easeCenterPow)) < 1) {
                    this.easeCenter = this.applyPhysics = false;
                    this.easeCenterPow = card.x = 0
                }
            }
            card.style.transform = `translateX(${this.easeCenter ? card.x / (2 ** this.easeCenterPow) : card.x}px)`
        }
        if (card) {
            if (Math.abs(card.x) > card.offsetWidth / 2) {
                card.style.opacity = 1.25 - Math.abs(this.easeCenter ? card.x / (2 ** this.easeCenterPow) : card.x) / card.offsetWidth / 2
            } else { card.style.opacity = 1 }


            if (Math.abs(card.x) > this.offsetWidth / 2 + card.offsetWidth) {
                this.cardElems.shift();
                card.remove();
                this.fillWithCards();
                if (!this.freeMode) card.data.move(card.x > 0);
                this.emit();
                this.applyPhysics = this.easeCenter = false;
            }
        }
        
        this.physicsT = t
        requestAnimationFrame(t => { 
            if (!this.disconnected) this.physics(t)
        })
    }

    connectedCallback() {
        requestAnimationFrame(t => this.physics(t))

        this.keyboardHander = ({ key }) => {
            var card = this.cardElems[0];
            if (!card) return
            if (card.keyboardMove) return

            var up = ["d", "ArrowRight"].includes(key);
            if (up || ["a", "ArrowLeft"].includes(key)) {
                this.applyPhysics = true;
                card.speed = card.x = 0;
                card.acceleration = (up ? 1 : -1) * card.offsetWidth * 20;
                card.keyboardMove = true;
            }

            if (["s", "ArrowDown"].includes(key)) card.flip()
        }

        window.addEventListener("keydown", this.keyboardHander)
    }

    disconnectedCallback() {
        this.disconnected = true
        window.removeEventListener("keydown", this.keyboardHander)
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
        this.back.onclick = _ => window.app.back()
        window.app.pushState(() => this.flipToFront())
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
        this.button.onclick = _ => this.input.onkeydown({ key: "Enter" });
        this.suggestions = document.createElement("ul");

        this.appendChild(this.input);
        this.appendChild(this.button);
        this.appendChild(this.suggestions);

        this.selectedIndex = 0;
        this.suggestionList = [];

        var random;
        this.input.onkeydown = async e => {
            if (e.key == "Enter") {
                let val = this.input.value.toLowerCase();
                if (!val) return
                window.withLoading(new Promise(async r => {
                    let word = (await this.api.suggestSearch(val))[this.selectedIndex] ?? this.suggestionList[this.selectedIndex]?.word
                    if (word) this.emitword(word)
                    else {
                        this.setSuggestions(await this.api.suggest(val))
                        this.selectedIndex = 0;
                    }
                    r();
                }))
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

            if (e.key.startsWith("Arrow")) return

            var thisRandom = random = Math.random()
            setTimeout(async _ => {
                var val = this.input.value.toLowerCase()
                if (!val.length) return this.suggestions.innerText = ""
                if (random != thisRandom) return
                this.selectedIndex = 0;
                this.setSuggestions(await this.api.suggestSearch(val))
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
            li.word = word;
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
