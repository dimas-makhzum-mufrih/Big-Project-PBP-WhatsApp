var lamaSplash = 2200; // dalam milidetik

function tutupSplash(mode = "instant") {
    var splash = document.getElementById('splash');

    if (!splash) return;

    splash.classList.add('hilang');

    if (mode === "instant") {
        splash.style.display = "none";
    } else {
        setTimeout(function () {
            splash.style.display = "none";
        }, 500);
    }
}

window.addEventListener('load', function () {

    var params = new URLSearchParams(window.location.search);
    var splashParam = params.get('splash');

    if (splashParam === 'none') {
        tutupSplash();
    } else {
        setTimeout(function () {
            tutupSplash("smooth");
        }, lamaSplash);
    }

    var elemenSplash = document.getElementById('splash');

    if (elemenSplash) {
        elemenSplash.addEventListener('click', tutupSplash);
    }

});