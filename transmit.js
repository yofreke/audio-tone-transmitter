// How many Hz is the theoretical clock running at
const clockSpeedHz = 8;
// How long it takes for a full cycle of the theoretical clock
const cycleDuration = 1000 / clockSpeedHz;
// How long a bit should be held in the on state
const bitOnduration = cycleDuration * 0.6;

// The start of char codes that we can transmit
const startCharCode = 32;
const endCharCode = 126;
const availableCharCount = endCharCode - startCharCode;

const startFrequency = 2000;
const frequencyRange = 15000;

const charCodeToFrequency = (charCode) => {
  return (
    startFrequency +
    (frequencyRange / availableCharCount) * (charCode - startCharCode)
  );
};

const frequencyToCharCode = (frequency) => {
  // Offset the bins to the left by a half bin
  // return startFrequency +
  //   (frequencyRange / availableCharCount) * (startCharCode - 0.5);
  const binSize = frequencyRange / availableCharCount;
  return (
    startCharCode +
    Math.floor((frequency - startFrequency + 0.5 * binSize) / binSize)
  );
};

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
    const newFrequency = charCodeToFrequency(charCode);
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
    // analyser.fftSize = 32768;

    window.transmitReceiveContext = ctx;

    mic.connect(analyser);

    var data = new Uint8Array(analyser.frequencyBinCount);

    let lastFrequencyBin = -1;
    let lastFrequencyCounter = 0;
    let lastFrequencyCounterStartTime = 0;
    let lastFrequencyCounterIncrementTime = 0;

    function resetCounters(idx) {
      console.log("> Resetting counters");
      // TODO: Can probably be more lenient, and track the most recent 3
      lastFrequencyBin = idx;
      lastFrequencyCounter = 0;
      lastFrequencyCounterStartTime = Date.now();
      lastFrequencyCounterIncrementTime = 0;
    }

    function checkCommitReading(idx) {
      const now = Date.now();

      var frequency = (idx * ctx.sampleRate) / analyser.fftSize;
      console.log(
        "idx=",
        idx,
        "data[idx]=",
        data[idx],
        "frequency=",
        frequency,
        "lastFrequencyCounter=",
        lastFrequencyCounter,
        "lfcStartTime=",
        lastFrequencyCounterStartTime,
        "lfcIncrementTime=",
        lastFrequencyCounterIncrementTime
      );

      // Reset if still tracking after single clock cycle, this may indicate
      // repeating characters in the transmission
      if (now - lastFrequencyCounterStartTime >= bitOnduration) {
        // receiveInputEl.value += lastFrequencyBin + ", ";
        const charCode = frequencyToCharCode(frequency);
        const char = String.fromCharCode(charCode);

        console.log(
          "Committing: frequency=",
          frequency,
          "charCode=",
          charCode,
          "char=",
          char
        );

        if (
          receiveInputEl.value.length > 3 &&
          char === "!" &&
          receiveInputEl.value[receiveInputEl.value.length - 1] === "!" &&
          receiveInputEl.value[receiveInputEl.value.length - 2] === "!"
        ) {
          console.log("Detected stop signal");
          stopReceive();
        }

        // Commit the current input to final output
        receiveInputEl.value += char;

        // Reset values
        resetCounters(idx);
      }
    }

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

      // TODO: Make this a normalized value
      // const frequencyBinAbsoluteMin = 150;
      const frequencyBinAbsoluteMin = 60;

      if (idx === lastFrequencyBin) {
        if (data[idx] > frequencyBinAbsoluteMin) {
          if (
            lastFrequencyCounterIncrementTime > 0 &&
            now - lastFrequencyCounterIncrementTime >=
              cycleDuration - bitOnduration
          ) {
            console.log("> detected cycle off");
            resetCounters();
          } else {
            // The primary bucket should also have a large confidence
            lastFrequencyCounter++;
            lastFrequencyCounterIncrementTime = now;
          }
        }
      } else {
        // TODO: This should probably be based on time, not ticks
        if (lastFrequencyCounter > 2) {
          checkCommitReading(lastFrequencyBin);
        }

        resetCounters(idx);
      }

      if (
        idx === lastFrequencyBin &&
        lastFrequencyCounter > 2 &&
        data[idx] > frequencyBinAbsoluteMin
      ) {
        checkCommitReading(idx);
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
