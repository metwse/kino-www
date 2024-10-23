const PAGES = ["home", "decks", "settings"];
const d = document;

const main = d.querySelector("main");
const styleExtention = d.createElement("style");

d.body.append(styleExtention);
main.attachShadow({ mode: "open" });

var app = { 
    historyFunctions: {},
};

// Lazily fetches pages
var pages = PAGES.map(page => fetch(`/pages/${page}.html`).then(r => r.text()));

// Default CSS for shadow roots.
var defaultCss = fetch(`/css/default.css`).then(r => r.text())
var defaultElementsCss = fetch(`/css/elements.css`).then(r => r.text())

// Global event listener that clear when new page loads
var listeners = []

window.onpopstate = e => {
    if (e.state) e.preventDefault();

    if (app.historyFunctions.back) app.historyFunctions.back()
    else if (e.state.page) app.page(e.state.page, false);
    console.log(app.historyFunctions.back)

    app.historyFunctions.back = app.historyFunctions[e.state.back];
}

app.pushState = (back) => {
    var functionId = Math.random();
    app.historyFunctions[functionId] = back;
    app.historyFunctions.back = back;
    history.pushState({ back: functionId }, null);
}

app.back = () => history.back();

// Loads HTML into <main>
async function parse(pageData) {
    window.root = document.createElement("div");
    root.innerHTML = pageData;

    for (let opt of listeners)
        window.removeEventListener(...opt)
    listeners = []

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

app.addEventListener = (...opt) => {
    listeners.push(opt);
    window.addEventListener(...opt);
}

app.page = async (name, pushState) => {
    if (pushState !== false) history.pushState({ page: name }, null);
    window.withLoading(parse(pages[PAGES.indexOf(name)]));
}

history.pushState({ page: "home" }, null)

window.app = app;
