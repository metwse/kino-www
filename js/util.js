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
    window.mouseControl.active = false;
    await promise;
    window.mouseControl.active = true;
}
window.withLoading = withLoading;
