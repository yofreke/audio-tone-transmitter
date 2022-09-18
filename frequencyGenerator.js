// one context per document
var context = new (window.AudioContext || window.webkitAudioContext)();
window.mainAudioContext = context;

var osc;
var vol;
function newOsc() {
  // instantiate an oscillator
  osc = context.createOscillator()
  window.mainOscillatorNode = osc
  vol = context.createGain()
  window.mainGainNode = vol

  // this is the default - also square, sawtooth, triangle
  osc.type = 'sine'

  // Connect volume
   // connect osc to vol
  osc.connect(vol)
  // connect vol to context destination
  vol.connect(context.destination)

  // Do not connect directly if trying to use gain node
  // connect it to the destination
  // osc.connect(context.destination)

  updateValues()
}

window.newOsc = newOsc

// let duration = 4;

function updateValues() {
  const frequencyEl = document.getElementById('frequencyInput')
  const frequencyDisplayEl = document.getElementById('frequencyDisplay')
  const frequencyInput = frequencyEl.value
  // Hz
  osc.frequency.value = frequencyInput
  frequencyDisplayEl.innerHTML = frequencyInput

  const volumeEl = document.getElementById('volumeInput')
  const volumeDisplayEl = document.getElementById('volumeDisplay')
  const volumeInput = volumeEl.value
  // from 0 to 1, 1 full volume, 0 is muted
  vol.gain.value = volumeInput / 100
  volumeDisplayEl.innerHTML = volumeInput

  // const durationEl = document.getElementById('durationInput')
  // const durationDisplayEl = document.getElementById('durationDisplay')
  // const durationInput = durationEl.value
  // duration = durationInput
  // durationDisplayEl.innerHTML = durationInput
}

function startOutput() {
  console.log('startOutput');
  osc.start(context.currentTime); // start the oscillator
  // osc.stop(context.currentTime + duration); // stop 2 seconds after the current time
}

window.startOutput = startOutput;

function stopOutput() {
  console.log('stopOutput');
  // osc.stop(context.currentTime + duration); // stop 2 seconds after the current time
  osc.stop();
}

window.stopOutput = stopOutput;

newOsc();
updateValues();
