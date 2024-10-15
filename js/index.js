"use strict";


const d = document;

var token;
var session;

onload = async _ => {
    token = localStorage.getItem("token");

    session = new window.kino.Session(token);

    const loginUi = d.getElementById("login")
    window.google.accounts.id.initialize({
        client_id: "700878237197-mkgtttho9bah89s928hte3bdkvcmhjqd.apps.googleusercontent.com",
        callback: window.handler.googleSignin,
    });
    window.google.accounts.id.renderButton(loginUi.querySelector(".google-signin"), { theme: "filled_blue", shape: "pill" });
    if (token) { loginUi.style.display = "none"; }

    session.on("logout", window.handler.logout);
    
    await window.app.init();
    d.getElementById("initial-load").remove();
};
