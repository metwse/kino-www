const BACKEND = "/api";

class Session {
    constructor(token) {
        this.eventHandlers = {}
        if (token) {
            this.token = token
        } else {
            this.token = false;
        }
    }

    on(event, fn) {
        let handlers = this.eventHandlers;
        if (!handlers[event]) { handlers[event] = []; } 
        handlers[event].push(fn);
    }

    emit(event, data) {
        let handlers = this.eventHandlers[event];
        if (handlers) {
            for (let handler of handlers) {
                handler(data);
            }
        }
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
                method: opt?.method ?? ((opt?.json || opt?.body) ? "POST" : "GET")
            }))
                .then(async res => {
                    var body;
                    body = await res.text();
                    try {
                        body = JSON.parse(body);
                    } catch { }

                    resolve([body, res.ok, res]);
                });
        });
    }

    get user() {
        if (!this._user) {
            this._user = JSON.parse(atob(this.token.split(".")[1]));
        }
        return this._user
    }

    logout() {
        this.emit("logout");
        this.token = false;
        this._user = false;
    }

    async googleSignin(credential) {
        // tries to signin with google token
        let [token, ok] = await this.request(`/signin?${credential}`);
        if (ok) { this.token = token; }
        return !!ok 
    }
}

window.kino = {
    Session: Session,
}
