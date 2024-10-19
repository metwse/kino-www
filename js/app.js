const PAGES = ["home", "decks", "settings"];
const d = document;

const main = d.querySelector("main");
const styleExtention = d.createElement("style");

d.body.append(styleExtention);
main.attachShadow({ mode: "open" });

var app = {};


// Lazily fetches pages
var pages = PAGES.map(page => fetch(`/pages/${page}.html`).then(r => r.text()));

// Default CSS for shadow roots.
var defaultCss = fetch(`/css/default.css`).then(r => r.text())
var defaultElementsCss = fetch(`/css/elements.css`).then(r => r.text())


// Loads HTML into <main>
async function parse(pageData) {
    window.root = document.createElement("div");
    root.innerHTML = pageData;

    // Runs <script> elements in async scope.
    const scripts = Array.from(root.querySelectorAll("script")).map(script => `${script.innerHTML}\n`).join(";\n");
    await eval(`(async () => { ${scripts} })()`);

    var globalStyles = "";
    root.querySelectorAll("style").forEach(style => {
        if (style.hasAttribute("global")) {
            globalStyles += `${style.innerHTML}`;
            style.remove();
        }
    })

    var defaultCssElem = document.createElement("style");
    defaultCssElem.innerHTML = defaultCss + defaultElementsCss;
    root.appendChild(defaultCssElem);

    // Leak styles from <style global> elements.
    styleExtention.innerHTML = globalStyles;

    // exchange content of shadowRoot with new root
    main.shadowRoot.innerHTML = "";
    Array.from(root.childNodes).forEach(c => main.shadowRoot.appendChild(c))
    root = main.shadowRoot
}


app.init = async _ => {
    pages = await Promise.all(pages);
    defaultCss = await defaultCss;
    defaultElementsCss = await defaultElementsCss;
}

app.page = async name => {
    window.withLoading(parse(pages[PAGES.indexOf(name)]));
}

window.app = app;
