const BACKEND = "/api";

class Session {
    constructor(token) {
        this.eventHandlers = {};
        this.token = token ? token : false;
        this.cache = { 
            users: {},
            structs: {},
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

    async getUser(selector) {
        var query = typeof selector == "number" ? `id=${selector}` : `username=${selector}`;
        if (this.cache.users[query]) return this.cache.users[query] // returns cached value if exists
        var [data, status] = await this.request(`/users?${query}`);
        if (!status) return null

        var user = new User(data);
        [`id=${selector}`, `username=${selector}`].forEach(v => this.cache.users[v] = user);
        return user
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

            apiRequest[type] = ids.filter(id => {
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
                                rawStruct => 
                                window.structs
                                [type.charAt(0).toUpperCase() + type.slice(1, -1)]
                                .deserialize(rawStruct)
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
                        nextRequest[keyType] = [];
                    for (let key of keys) {
                        willRequest = true;
                        nextRequest[keyType].push(+key.split(":")[1]);
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
                            eval(`newKeys.${path} = cache["${type}"][${id}]`);
                        }
                    }
                )
                struct.loadForeinKeys(newKeys);
            }
        }

        for (let [type, structs] of Object.entries(apiResponse)) {
            if (!cache[type])
                cache[type] = []
            for (let struct of structs)
                cache[type][struct.id] = struct
            if (!response[type])
                response[type] = []
            response[type].push(...structs)
        }

        for (let [type, ids] of Object.entries(request)) {
            if (response[type].length != ids.length) {
                return this.bulk(request)
            }
        }
        return response
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
