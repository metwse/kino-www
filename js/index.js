"use strict";


const d = document;

var token;
var session;

onload = async _ => {
    token = localStorage.getItem("token");

    session = new window.kino.Session(token);

    const loginUi = d.getElementById("login");
    if (token) loginUi.style.display = "none"; 

    // initializes&loads Google sign in button 
    window.google.accounts.id.initialize({
        client_id: "700878237197-mkgtttho9bah89s928hte3bdkvcmhjqd.apps.googleusercontent.com",
        callback: window.handler.googleSignin,
    });
    window.google.accounts.id.renderButton(loginUi.querySelector(".google-signin"), { theme: "filled_blue", shape: "pill" });

    session.on("logout", window.handler.logout);
    
    await Promise.all([window.app.init(), window.session.init()]);
    if (token) await window.app.page("home")
    d.getElementById("initial-load").remove();
};
