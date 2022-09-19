var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

ctx.fillStyle = "#000000";
ctx.font = "8px Arial";
ctx.fillText("hello world!", 2, 15);
ctx.fillRect(0, 0, 10, 10);

// Canvas is 50px, then scaled up with css
const canvasSize = 50;

canvas.addEventListener("mousemove", (event) => {
  // Left mouse button is pressed
  if (event.buttons === 1) {
    // Draw a circle on the canvas
    var rect = canvas.getBoundingClientRect();
    var posx = event.clientX - rect.left;
    var posy = event.clientY - rect.top;

    const scaledX = (posx / rect.width) * canvasSize;
    const scaledY = (posy / rect.height) * canvasSize;

    ctx.beginPath();
    ctx.arc(scaledX, scaledY, 1, 0, 2 * Math.PI);
    ctx.fill();
  }
});

const clearCanvas = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

window.clearCanvas = clearCanvas;

/** Return the canvas data as an array of bits. */
const getCanvasData = () => {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const resultData = [];

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = y * imgData.width + x;
      const pixelIndex = i * 4;
      // Returns array [R,G,B,A]
      // console.log(
      //   imgData.data[pixelIndex],
      //   imgData.data[pixelIndex + 1],
      //   imgData.data[pixelIndex + 2],
      //   imgData.data[pixelIndex + 3]
      // );

      // Black pixels are 0, 0, 0, 255. We will send anything with an alpha
      // above some threshold
      resultData.push(imgData.data[pixelIndex + 3] > 128);
    }
  }

  return resultData;
};

window.getCanvasData = getCanvasData;
