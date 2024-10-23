let loginUi = document.getElementById("login");

async function googleSignin({ credential }) {
    if (await window.session.googleSignin(credential)) {
        localStorage.setItem("token", window.session.token);
        //loginUi.style.display = "none";
        //window.app.page("home")
        // TODO: reload session
        window.location.reload()
    } else {
        logout();
    }
}

function logout() {
    loginUi.style.display = ""
    window.token = null;
    localStorage.removeItem("token")
}


window.handler = {
    googleSignin, logout
}
