window.mouseControl = {
    _active: true,
    set active(state) {
        this._active = state;
        document.getElementById("disable-mouse").style.display = state ? "none" : ""
    },
    get active() {
        return this._active
    }
}

async function withLoading(promise) {
    window.mouseControl = false;
    await promise;
    window.mouseControl = true;
}
window.withLoading = withLoading;
