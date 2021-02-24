// open menu
var hamburgerIcon = document.getElementById("hamburger");

hamburgerIcon.addEventListener("click", function () {
    var hamburgerMenu = document.getElementById("hamburger-menu");
    hamburgerMenu.classList.add("on");
});

var closeElement = document.getElementById("close");

// close menu
// via close button
closeElement.addEventListener("click", function () {
    var hamburgerMenu = document.getElementById("hamburger-menu");
    hamburgerMenu.classList.remove("on");
});

var closeElementBG = document.getElementById("hamburger-menu");

// via background click
closeElementBG.addEventListener("click", function () {
    var hamburgerMenu = document.getElementById("hamburger-menu");
    hamburgerMenu.classList.remove("on");
});
