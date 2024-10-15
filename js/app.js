const PAGES = ["home", "decks", "settings"];
const d = document;

const main = d.querySelector("main");
const styleExtention = d.createElement("style");

d.body.append(styleExtention);
main.attachShadow({ mode: "open" });

var app = {};


// Lazily fetches pages
var pages = PAGES.map(page => fetch(`/pages/${page}.html`).then(r => r.text()));


// Loads HTML into <main>
function parse(pageData) {
    const root = main.shadowRoot;
    root.innerHTML = pageData;

    // Runs <script> elements in async scope.
    const scripts = Array.from(root.querySelectorAll("script")).map(script => `${script.innerHTML}\n`).join(";\n");
    eval(`(async () => { ${scripts} })()`);

    var globalStyles = "";
    root.querySelectorAll("style").forEach(style => {
        if (style.hasAttribute("global")) {
            globalStyles += `${style.innerHTML}`;
            style.remove();
        }
    })
    // Leak styles from <style global> elements.
    styleExtention.innerHTML = globalStyles;
}


app.init = async _ => {
    pages = await Promise.all(pages);
}

app.page = async name => {
    parse(pages[PAGES.indexOf(name)])
}

window.app = app;
