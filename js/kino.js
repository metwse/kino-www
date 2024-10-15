const BACKEND = "/api";

class Session {
    constructor(token) {
        this.eventHandlers = {};
        this.token = token ? token : false;
        this.cache = { 
            users: {}
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
                            this.emit("logout");
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
        this.token = this._user = false;
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
