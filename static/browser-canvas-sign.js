//browser..

const canvas = document.querySelector("#signatureCanvas");
const context = canvas.getContext("2d");

let oldXPos = 0;
let oldYPos = 0;

//console.log("Before: ", window.pageYOffset);

function drawLine(xPos, yPos) {
    context.strokeStyle = "#515151";
    context.lineWidth = 3;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(oldXPos, oldYPos);
    context.lineTo(xPos, yPos);
    context.closePath();
    context.stroke();

    document.querySelector("#signatureCode").value = canvas.toDataURL();

    oldXPos = xPos;
    oldYPos = yPos;
}

$("#signatureCanvas").on("mousedown", function (e) {
    e.preventDefault();
    $("#signatureCanvas").on("mousemove", function (event) {
        //oldXPos = event.mouseX;
        //oldYPos = event.mouseY;
        const canvasX = canvas.offsetLeft;
        const canvasY = canvas.offsetTop;
        const xPos = event.clientX - canvasX;
        const yPos = event.clientY - canvasY + pageYOffset;
        drawLine(xPos, yPos);
    });
});

$("#signatureCanvas").on("mouseup", function () {
    $("#signatureCanvas").off("mousemove");
});

// check if scroll for canvas offset
/*
$(document).scroll(function () {
    console.log("scrolled: true");
    console.log(window.pageYOffset);
});
*/
