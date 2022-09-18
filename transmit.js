// How many Hz is the theoretical clock running at
const clockSpeedHz = 2;
// How long it takes for a full cycle of the theoretical clock
const cycleDuration = 1000 / clockSpeedHz;
// How long a bit should be held in the on state
const bitOnDuration = cycleDuration * 0.5;

// const allowedChars = "abcdefghijklmnopqrstuvwxyz1234567890!,. ?";
// b16 letter
const allowedChars = "0123456789abcdef";
// b4 letters
// const allowedChars = "0123";

const availableCharCount = allowedChars.length;

const startFrequency = 4000;
const frequencyRange = 10000;
const clockFrequency = 2750;

const binSize = frequencyRange / availableCharCount;

const charCodeToFrequency = (charCode) => {
  const index = allowedChars.indexOf(String.fromCharCode(charCode));
  return startFrequency + (frequencyRange / availableCharCount) * index;
};

const frequencyToCharCode = (frequency) => {
  // Offset the bins to the left by a half bin
  const index = Math.floor(
    (frequency - startFrequency + 0.5 * binSize) / binSize
  );
  if (index >= allowedChars.length || index < 0) {
    console.log(`index= ${index} allowedChars.length= ${allowedChars.length}`);
    return null;
  }
  return allowedChars[index].charCodeAt(0);
};

// See: https://stackoverflow.com/a/60435654
const stringToB16 = (s) => {
  return s
    .split("")
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
};

const b16ToString = (b16String) => {
  return b16String
    .split(/(\w\w)/g)
    .filter((p) => !!p)
    .map((c) => String.fromCharCode(parseInt(c, 16)))
    .join("");
};

const stringToB4 = (s) => {
  return s
    .split("")
    .map((c) => c.charCodeAt(0).toString(4).padStart(2, "0"))
    .join("");
};

const b4ToString = (b4String) => {
  return b4String
    .split(/(\w\w\w\w)/g)
    .filter((p) => !!p)
    .map((c) => String.fromCharCode(parseInt(c, 4)))
    .join("");
};

const startSend = async () => {
  const sendInputEl = document.getElementById("sendInput");
  // const data = sendInputEl.value;
  const data = stringToB16(sendInputEl.value);
  // const data = stringToB4(sendInputEl.value);
  console.log("startSend:", data.length, data);

  let sendIndex = 0;

  window.newOsc();

  window.mainOscillatorNode.frequency.value = 440;
  window.mainGainNode.gain.value = 0;

  window.startOutput();

  while (sendIndex < data.length) {
    const char = data[sendIndex];
    const charCode = char.charCodeAt(0);
    console.log("> Sending char:", char, charCode);

    // Limit to only sending some of the available chars
    const charIndex = allowedChars.indexOf(char);
    if (charIndex < 0) {
      throw new Error(`char '${char}' not in allowedChars "${allowedChars}"`);
    }

    // Disable output, or send clock tone
    window.mainOscillatorNode.frequency.value = clockFrequency;
    window.mainGainNode.gain.value = 0.9;

    // Wait for next clock cycle
    await new Promise((resolve) =>
      setTimeout(resolve, cycleDuration - bitOnDuration)
    );

    // Enable output
    const newFrequency = charCodeToFrequency(charCode);
    console.log("newFrequency=", newFrequency);
    window.mainOscillatorNode.frequency.value = newFrequency;
    window.mainGainNode.gain.value = 0.9;

    // Wait until bit is off
    await new Promise((resolve) => setTimeout(resolve, bitOnDuration));

    window.mainGainNode.gain.value = 0;

    sendIndex++;
  }

  window.stopOutput();

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
    let seenClockTone = false;

    function resetCounters(idx) {
      console.log("> Resetting counters");
      // TODO: Can probably be more lenient, and track the most recent 3
      lastFrequencyBin = idx;
      lastFrequencyCounter = 0;
      lastFrequencyCounterStartTime = Date.now();
      lastFrequencyCounterIncrementTime = 0;
    }

    const detectDurationThreshold = 0.4;
    const detectClockDuration =
      (cycleDuration - bitOnDuration) * detectDurationThreshold;
    console.log(
      "bitOnDuration=",
      bitOnDuration,
      "detectClockDuration=",
      detectClockDuration
    );

    function checkCommitReading(idx) {
      const now = Date.now();

      const lfcStartElapsed = now - lastFrequencyCounterStartTime;

      const frequency = (idx * ctx.sampleRate) / analyser.fftSize;

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
        lastFrequencyCounterIncrementTime,
        "lfcStartElapsed=",
        lfcStartElapsed,
        "seenClockTone",
        seenClockTone
      );

      // Check if this constitutes a clock signal
      if (
        data[idx] > 70 &&
        Math.abs(frequency - clockFrequency) < binSize * 0.5 &&
        lfcStartElapsed >= detectClockDuration
      ) {
        seenClockTone = true;
      }

      // Reset if still tracking after single clock cycle, this may indicate
      // repeating characters in the transmission
      if (
        lfcStartElapsed >= bitOnDuration * detectDurationThreshold &&
        seenClockTone
      ) {
        // receiveInputEl.value += lastFrequencyBin + ", ";
        const charCode = frequencyToCharCode(frequency);
        console.log("charCode=", charCode);

        if (charCode !== null) {
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

          seenClockTone = false;
        }

        // Reset values
        console.log("bit duration exceeded, will reset");
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
              cycleDuration - bitOnDuration
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
        if (lastFrequencyCounter > 4) {
          checkCommitReading(lastFrequencyBin);
        }

        console.log("idx not same as lastFrequencyBin", idx, lastFrequencyBin);
        resetCounters(idx);
      }

      if (
        idx === lastFrequencyBin &&
        lastFrequencyCounter > 4 &&
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

  const receiveInputEl = document.getElementById("receiveInput");
  // const result = receiveInputEl.value;
  const result = b16ToString(receiveInputEl.value);
  // const result = b4ToString(receiveInputEl.value);
  console.log("receive result=", result);
};

window.stopReceive = stopReceive;
