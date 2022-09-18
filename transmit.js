// How many Hz is the theoretical clock running at
const clockSpeedHz = 5;
// How long it takes for a full cycle of the theoretical clock
const cycleDuration = 1000 / clockSpeedHz;
// How long a bit should be held in the on state
const bitOnduration = cycleDuration * 0.8;

// The start of char codes that we can transmit
const startCharCode = 32;
const endCharCode = 126;
const availableCharCount = endCharCode - startCharCode;

const startFrequency = 100;
const frequencyRange = 12000;

const startSend = async () => {
  const sendInputEl = document.getElementById("sendInput");
  const data = sendInputEl.value;
  console.log("startSend:", data.length, data);

  let sendIndex = 0;

  window.newOsc();

  window.mainOscillatorNode.frequency.value = 440;
  window.mainGainNode.gain.value = 0;

  startOutput();

  while (sendIndex < data.length) {
    const char = data[sendIndex];
    const charCode = char.charCodeAt(0);
    console.log("> Sending char:", char, charCode);

    // Limit to only sending some of the available chars
    if (charCode < startCharCode || charCode > endCharCode) {
      throw new Error("char code too high");
    }

    // Enable output
    const newFrequency =
      startFrequency +
      (frequencyRange / availableCharCount) * (charCode - startCharCode);
    console.log("newFrequency=", newFrequency);
    window.mainOscillatorNode.frequency.value = newFrequency;
    window.mainGainNode.gain.value = 0.9;

    // Wait until bit is off
    await new Promise((resolve) => setTimeout(resolve, bitOnduration));

    // Disable output
    window.mainGainNode.gain.value = 0;

    sendIndex++;

    // Wait for next clock cycle
    await new Promise((resolve) =>
      setTimeout(resolve, cycleDuration - bitOnduration)
    );
  }

  stopOutput();

  // for (let char of data) {
  //   console.log('> Sending char:', char);

  //   await new Promise(resolve => setTimeout(resolve, 1000))
  // }
};

window.startSend = startSend;

window.transmitReceiveContext = null;

const startReceive = async () => {
  const receiveInputEl = document.getElementById("receiveInput");

  receiveInputEl.value = "";

  const callback = (stream) => {
    var ctx = new AudioContext();
    var mic = ctx.createMediaStreamSource(stream);
    var analyser = ctx.createAnalyser();
    // Default is 2048
    analyser.fftSize = 8192;

    window.transmitReceiveContext = ctx;

    mic.connect(analyser);

    var data = new Uint8Array(analyser.frequencyBinCount);

    let lastFrequencyBin = null;
    let lastFrequencyCounter = 0;
    let lastFrequencyCounterStartTime = 0;

    function play() {
      analyser.getByteFrequencyData(data);

      // get fullest bin
      var idx = 0;
      for (var j = 0; j < analyser.frequencyBinCount; j++) {
        if (data[j] > data[idx]) {
          idx = j;
        }
      }

      const now = Date.now();

      if (idx === lastFrequencyBin) {
        if (data[idx] > 150) {
          // The primary bucket should also have a large confidence
          lastFrequencyCounter++;
        }
      } else {
        // TODO: Can probably be more lenient, and track the most recent 3
        lastFrequencyBin = idx;
        lastFrequencyCounter = 0;
        lastFrequencyCounterStartTime = now;
      }

      if (lastFrequencyCounter > 7 && data[idx] > 150) {
        var frequency = (idx * ctx.sampleRate) / analyser.fftSize;
        console.log(
          "idx=",
          idx,
          "data[idx]=",
          data[idx],
          "frequency=",
          frequency,
          "lastFrequencyCounter=",
          lastFrequencyCounter
        );

        // Reset if still tracking after single clock cycle, this may indicate
        // repeating characters in the transmission
        if (now - lastFrequencyCounterStartTime >= cycleDuration) {
          // Commit the current input to final result
          // TODO: map the frequency to a character
          receiveInputEl.value += lastFrequencyBin + ", ";

          // Reset values
          lastFrequencyBin = idx;
          lastFrequencyCounter = 0;
          lastFrequencyCounterStartTime = now;
        }
      }

      if (window.transmitReceiveContext) {
        requestAnimationFrame(play);
      }
    }

    play();
  };

  navigator.getUserMedia({ video: false, audio: true }, callback, console.log);
};

window.startReceive = startReceive;

const stopReceive = async () => {
  if (window.transmitReceiveContext) {
    window.transmitReceiveContext.close();
    window.transmitReceiveContext = null;
  }
};

window.stopReceive = stopReceive;
