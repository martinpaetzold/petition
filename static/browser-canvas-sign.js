//browser..

const canvas = document.querySelector("#signatureCanvas");
const context = canvas.getContext("2d");

let oldXPos = 0;
let oldYPos = 0;
let mouseBtnDown = false;

function drawLine(xPos, yPos) {
    context.strokeStyle = "#515151";
    context.lineWidth = 3;
    context.lineJoin = "round";
    context.lineCap = "round";
    if (mouseBtnDown) {
        context.beginPath();
        context.moveTo(oldXPos, oldYPos);
        context.lineTo(xPos, yPos);
        context.closePath();
        context.stroke();
    }

    document.querySelector("#signatureCode").value = canvas.toDataURL();

    oldXPos = xPos;
    oldYPos = yPos;
}
canvas.addEventListener("mousemove", (event) => {
    const canvasX = canvas.offsetLeft;
    const canvasY = canvas.offsetTop;
    const xPos = event.clientX - canvasX;
    const yPos = event.clientY + window.pageYOffset - canvasY;
    drawLine(xPos, yPos);
});

document.addEventListener("mousedown", () => (mouseBtnDown = true));
document.addEventListener("mouseup", () => (mouseBtnDown = false));
