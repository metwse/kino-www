const BACKEND = "/api";

class Session {
    constructor(token) {
        this.eventHandlers = {};
        this.token = token ? token : false;
        this.cards = [];
        this.cache = { 
            users: {},
            structs: {},
            dictionary: {}
        }
    }

    // Creates event listener.
    on(event, fn) {
        let handlers = this.eventHandlers;
        if (!handlers[event]) { handlers[event] = []; } 
        handlers[event].push(fn);
    }

    // Notifies event liseteners.
    emit(event, ...data) {
        let handlers = this.eventHandlers[event];
        if (handlers)
            handlers.forEach(handler => handler(...data));
    }

    request(path, opt) {
        return new Promise(async resolve => {
            await fetch(BACKEND + path, Object.assign(opt ?? {}, {
                // parse body from json 
                body: opt?.json ? JSON.stringify(opt.json) : opt?.body,
                headers: Object.assign(opt?.headers ?? {}, {
                    "Token": this.token,
                    // adds Content-Type: application/json if opt.json is present
                    ...(opt?.json ? { 'Content-Type': 'application/json' } : {})
                }),
                method: opt?.method ?? (opt?.json || opt?.body) ? "POST" : "GET"
            }))
                .then(async res => {
                    let body = await res.text();
                    try { body = JSON.parse(body); } 
                    catch { }
                    switch (res.status) {
                        case 401: 
                            this.logout();
                            break
                        case 429:
                            resolve(await new Promise(resolve2 => {
                                setTimeout(async () => {
                                    resolve2(await this.request(path, opt))
                                }, body * 1000);
                            }));
                            break
                    }
                    resolve([body, res.ok, res]);
                });
        });
    }

    get parsedToken() {
        if (!this.token) 
            return null

        if (!this._token) // caches parsed token
            this._token = JSON.parse(atob(this.token.split(".")[1]));
        return this._token
    }

    logout() {
        this.emit("logout");
        this.token = this._token = false;
    }

    async googleSignin(credential) {
        // tries to signin with google token
        let [token, ok] = await this.request(`/signin?${credential}`);
        if (ok) { this.token = token; }
        return !!ok 
    }

    async newCard(deck_id, front, back) {
        let apiRequest = {
            deck_id,
            front,
            back
        }

        let [json, ok] = await this.request("/cards/new", { json: apiRequest })
        if (!ok) return null

        let data = await this.bulk({
            cards: [json.card_id],
            faces: [json.front, ...json.back]
        });

        var card = data.cards[0]
        this.addCard(card.id, card.deckId, card.doneAt.getTime())
        return card
    }

    async getUser(selector) {
        var query = typeof selector == "number" ? `id=${selector}` : `username=${selector}`;
        if (this.cache.users[query]) return this.cache.users[query] // returns cached value if exists
        var [data, status] = await this.request(`/users?${query}`);
        if (!status) return null

        var user = new User(data);
        [`id=${selector}`, `username=${selector}`].forEach(v => this.cache.users[v] = user);
        return user
    }

    async getWord(database, word2) {
        var word;
        if (database == "wn") word = word2.replaceAll(" ", "_");
        else word = word2;

        if (!this.cache.dictionary[database])
            this.cache.dictionary[database] = {}
        let db = this.cache.dictionary[database];
        if (db[word] !== undefined) return db[word]
        let data = (await this.request(`/${database}/get?${word}`))[0]
        return db[word] = data
    }
    async suggestWord(database, word2) {
        var word;
        if (database == "wn") word = word2.replaceAll(" ", "_");
        else word = word2;

        let data = (await this.request(`/${database}/suggest?${word}`))[0]
        if (database == "wn") data = data.map(d => d.replaceAll("_", " "))
        return data
    }
    async suggestWordSearch(database, word2) {
        var word;
        if (database == "wn") word = word2.replaceAll(" ", "_");
        else word = word2;

        let data = (await this.request(`/${database}/suggest_search?${word}`))[0]
        if (database == "wn") data = data.map(d => d.replaceAll("_", " "))
        return data
    }

    async bulk(request) {
        var cache = this.cache.structs;
        var response = {}
        var apiRequest = {}
        var willRequest = false
        for (let [type, ids] of Object.entries(request)) {
            if (cache[type] === undefined)
                cache[type] = {}
            response[type] = []

            apiRequest[type] = Array.from(ids).filter(id => {
                let cached = cache[type][id];
                if (cached) {
                    response[type].push(cached)
                    return false
                }
                willRequest = true;
                return true
            })
        }

        if (willRequest) {
            var apiResponse = 
                Object.entries(
                    (await this.request("/bulk", { json: apiRequest }))[0]
                )
                .map(([type, rawStructs]) => {
                    if (Array.isArray(rawStructs))
                        return [
                            type, 
                            rawStructs
                            .map(
                                rawStruct => {
                                    let struct = window.structs
                                        [type.charAt(0).toUpperCase() + type.slice(1, -1)]
                                        .deserialize(rawStruct);
                                    struct.session = this;
                                    if (struct.init)
                                        struct.init();
                                    return struct
                                }
                            )
                        ]
                    else 
                        return [type, []]
                }
                );
            apiResponse = Object.fromEntries(apiResponse)
        } else {
            apiResponse = {}
        }

        function pushApiResponse() {
            for (let [type, structs] of Object.entries(apiResponse)) {
                if (!cache[type])
                    cache[type] = []
                for (let struct of structs)
                    cache[type][struct.id] = struct
                if (!response[type])
                    response[type] = []
                response[type].push(...structs)
            }
        }
        pushApiResponse();

        // collect forein keys
        var foreinKeys = {};
        var nextRequest = {};
        var willRequest = false;
        for (let [type, structs] of Object.entries(apiResponse)) {
            if (foreinKeys[type] === undefined)
                foreinKeys[type] = [];
            for (let struct of structs) {
                for (let [keyType, keys] of Object.entries(struct.foreinKeys)) {
                    if (nextRequest[keyType] === undefined)
                        nextRequest[keyType] = new Set();
                    for (let key of keys) {
                        willRequest = true;
                        nextRequest[keyType].add(+key.split(":")[1]);
                    }
                }
            }
        }
        
        if (willRequest)
            foreinKeys = await this.bulk(nextRequest);
        
        // load forein keys
        for (let [_, structs] of Object.entries(apiResponse)) {
            for (let struct of structs) {
                let newKeys = {}
                Object.entries(struct.foreinKeys).map(
                    ([type, keys]) => {
                        for (let key of keys) {
                            let [path, id] = key.split(":");
                            newKeys[path] = cache[type][id]
                        }
                    }
                )
                struct.loadForeinKeys(newKeys);
            }
        }

        const LIMITS = {
            decks: 16,
            cards: 64,
            faces: 192,
            extensions: 8
        };

        nextRequest = {};
        willRequest = false;
        for (let [type, ids] of Object.entries(request)) {
            let nextIds = Array.from(ids).splice(LIMITS[type])
            if (nextIds.length > 0) {
                nextRequest[type] = nextIds
            }
        }

        var nextResponse = {}
        if (willRequest)
            nextResponse = this.bulk(nextRequest)
        for (let [type, ids] of Object.entries(nextResponse)) 
            response[type].push(...ids)

        return response
    }

    addCard(id, deckId, doneAt) {
        this.cards.push({
            id, 
            //TODO: single struct get
            deck: this.decks.find(d => d.id == deckId), 
            doneAt: new Date(doneAt).getTime(),
            done() {
                return (new Date().getTime() - this.doneAt) / 36e5 < this.deck.interval
            }
        })
    }

    async init() {
        let home = (await this.request("/home"))[0];

        this.decks = (await this.bulk({ 
            decks: home.decks 
        })).decks;

        home.cards.forEach(opts => this.addCard(...opts))
    }

    get cardCount() { return this.cards.length }
    get cardsDone() { return this.cards.filter(card => card.done()).length }

    async home(free) {
        let selected = [];
        if (free) {
            selected = new Set();
            let tried = 0;
            while (
                selected.size < this.cards.length &&
                selected.size < 16 &&
                tried < 32
            ) {
                selected.add(this.cards[Math.floor(Math.random() * this.cards.length)].id);
                tried += 1
            }
            selected = Array.from(selected);
        } else {
            for (let card of this.cards) {
                if (selected.length == 16) break
                if (!card.done()) selected.push(card.id)
            }
        }

        return (await this.bulk({ cards: selected })).cards
    }
}

class User {
    constructor({ id, name, username, picture }) {
        this.id = id;
        this.name = name; this.username = username;
        this.picture = picture;
    }
}

window.kino = {
    Session: Session,
}
