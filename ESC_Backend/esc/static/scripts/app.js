const routes = {
    'login': {
        templateUri: "/static/login.html",
        logic: Login,
        auth: false,
    },
    'logout': {
        logic: Logout,
        auth: true
    },
    'cases': {
        templateUri: "/static/cases.html",
        logic: Cases,
        auth: true
    },
    'casedetails': {
        templateUri: "/static/case_details.html",
        logic: CaseDetails,
        auth: true
    },
    'newcase': {
        templateUri: "/static/case_details.html",
        logic: CaseNew,
        auth: true
    },
    'error': {
        template: `
        <div class="jumbotron">
        <h2> Error </h2> 
        <p>We encountered an error. Please click on a navigation link on the navbar or reload the page.</p>
        </div>`
    }

}

 const appRoot = document.querySelector("main");

let currentRoute = null;
//Initial setup for the home link (app logo) before the other nav links are created
document.querySelector("#logo-img-link").addEventListener("click", function() {goTo(this.dataset.route);});
document.querySelector("#logo-text-link").addEventListener("click", function () {goTo(this.dataset.route);});

updateNav();
let currentUser = sessionStorage.currentUser;
if (currentUser != null) {
    goTo("cases", null, false);
} else {
    goTo("login", null, false);
}


function addNavLink(panel, route, label) {
    const navLink = document.createElement("a");
    navLink.className = "e-nav-link";
    navLink.dataset.route = route;
    navLink.textContent = label;
    panel.appendChild(navLink);
    navLink.addEventListener("click", () => {
        goTo(navLink.dataset.route);
    });
}

function resetPanel(panel) {
    panel.innerHTML = "";
}

function updateNav() {
    const leftPanel = document.querySelector("#nav-left");
    const rightPanel = document.querySelector("#nav-right");

    leftPanel.innerHTML = "";
    rightPanel.innerHTML = "";

    let currentUser = sessionStorage.currentUser;
    if (currentUser != null) {
        currentUser = JSON.parse(currentUser);

        addNavLink(leftPanel, "cases", "Cases");
        addNavLink(rightPanel, "logout", "Logout");

        return true;
    } else {
        addNavLink(rightPanel, "register", "Register");
        addNavLink(rightPanel, "login", "Login");

        return false;
    }
}

