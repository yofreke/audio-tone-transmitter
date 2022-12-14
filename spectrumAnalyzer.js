import AudioMotionAnalyzer from './audiomotion-analyzer_3.6.0.js';

function drawCallback() {
}

let audioMotion;

function createAudioMotion() {
  if (audioMotion) {
    console.log('Already exists')
    // TODO: Cleanup and make again
    return;
  }

  try {
    const source = window.mainGainNode
    console.log('Using source:', source)

    audioMotion = new AudioMotionAnalyzer(
      document.getElementById('container'),
      {
        // main audio source is the HTML <audio> element
        source,
        audioCtx: window.mainAudioContext,
        connectSpeakers: false,
        // callback function used to add custom features for this demo
        onCanvasDraw: drawCallback,
        onCanvasResize: ( reason, instance ) => {
          console.log( `[${reason}] canvas size is: ${instance.canvas.width} x ${instance.canvas.height}` );
        }
      }
    );

    audioMotion.setOptions({
      // Classic LEDs
			mode: 3,
			barSpace: .4,
			gradient: 'classic',
			ledBars: true,
			lumiBars: false,
			radial: false,
			reflexRatio: 0,
			showBgColor: true,
			showPeaks: true
    });
  }
  catch( err ) {
    document.getElementById('container').innerHTML = `<p>audioMotion-analyzer failed with error: <em>${err}</em></p>`;
  }
}

window.createAudioMotion = createAudioMotion;
