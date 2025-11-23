var unitLength = 100; // milliseconds

function updateUnitLength() {
    unitLength = parseFloat(document.getElementById('unit-length').value);
    document.getElementById("unit-length-label").innerText = "Unit Length (" + unitLength + "ms, "+parseInt((60*1000/unitLength)/25)+"wpm):";
};

document.getElementById('unit-length').onmousemove = updateUnitLength;
document.getElementById('unit-length').onclick = updateUnitLength;
document.getElementById('unit-length').ontouchmove = updateUnitLength;
document.getElementById('unit-length').onchange = updateUnitLength;

const morse = "A . _ B _ . . . C _ . _ . D _ . . E . F . . _ . G _ _ . H . . . . I . . J . _ _ _ K _ . _ L . _ . . M _ _ N _ . O _ _ _ P . _ _ . Q _ _ . _ R . _ . S . . . T _ U . . _ V . . . _ W . _ _ X _ . . _ Y _ . _ _ Z _ _ . . 1 . _ _ _ 2 . . _ _ _ 3 . . . _ _ 4 . . . . _ _"
// loop over string
var morseCode = {};
var morseArray = morse.split(" ");
var code = "";
var currentLetter = null;
for (var i = 0; i < morseArray.length; i++) {
    var token = morseArray[i];
    if (/^[A-Za-z0-9]$/.test(token)) {
        if (currentLetter !== null && code !== "") {
            morseCode[currentLetter] = code;
        }
        currentLetter = token;
        code = "";
    } else if (token === "." || token === "_") {
        code += token;
    }
}
if (currentLetter !== null && code !== "") {
    morseCode[currentLetter] = code;
}

console.log(morseCode);

var word = "HELLO"
var state;
var playing = false;
changeControlsState("idle");

function g(id) {
    return document.getElementById(id);
}

function playMorseCode(word, mode, bounds=[0, word.length]) {
    if (settings["practice-mode"] === "write") {
        changeControlsState("playing");
        recursivePlay(word, word, 'audio', bounds);
    }
    if (state === "idle" || state === "refreshing") {
        g("text-output").innerText = "";
        changeControlsState("playing");
        g("info-character").innerText = "0/" + word.length;
        recursivePlay(word, word, mode, bounds);
    } else if (state.startsWith("paused")) {
        const remaining = state.slice(6);
        changeControlsState("playing");
        recursivePlay(word, remaining, mode, [0, remaining.length]);
    }
}

async function randomWord(length) {
    return fetch('https://random-word-api.herokuapp.com/word?length=' + length)
    .then(response => response.json())
    .then(data => {
        const word = data[0].toUpperCase();
        console.log(word)
        return word;
    })
    .catch(error => {
        console.error('Error fetching random word:', error);
    });
}

function calculateLength(code) {
    let length = 0;
    for (let i = 0; i < code.length; i++) {
        const symbol = code[i];
        if (symbol === ".") {
            length += unitLength;
        } else if (symbol === "_") {
            length += unitLength * 3;
        }
        length += unitLength; // space between symbols
    }
    length -= unitLength; // remove last space
    length += unitLength * 2; // space between letters
    return length;
}

var currentCharacter = 0;
function recursivePlay(word, remaining, mode, bounds, modeOverride=null) {
    var skip = bounds[0];
    var playfor = bounds[1];
    console.log(skip, playfor)
    if (skip > 0) {
        skip -= 1;
        setTimeout(() => {
            recursivePlay(word, remaining.slice(1), mode, [skip, playfor]);
        }, 0);
        return;
    }
    if (playfor <= 0) {
        playing = false;
        changeControlsState("idle");
        return;
    }
    playfor -= 1;
    console.log("Remaining:", remaining, state);
    if (remaining.length === 0) {
        playing = false;
        changeControlsState("idle");
        return;
    }
    if (state.startsWith("paused") || state === "pause" || state === "idle" || state === "refreshing") {
        playing = false;
        return;
    }
    if (state === "stop") {
        playing = false;
        changeControlsState("idle");
        return;
    }
    const letter = remaining[0].toUpperCase();
    const code = morseCode[letter];
    if (!code) {
        recursivePlay(word, remaining.slice(1), mode, [skip, playfor]);
        return;
    }
    let time = 0;
    currentCharacter = (word.length - remaining.length + 1);
    const spans = document.querySelectorAll("#answer-feedback > span");
    spans[currentCharacter - 1].classList.add("highlighted-letter");
    g("info-character").innerText = currentCharacter + "/" + word.length;
    setTimeout(() => {
        spans[currentCharacter - 1].classList.remove("highlighted-letter");
        if (state == "stop") {
            playing = false;
            changeControlsState("idle");
            return;
        };
        if (state == "pause" || state.startsWith("paused")) {
            playing = false;
            changeControlsState("paused " + remaining.slice(1));
            return;
        }
    }, calculateLength(code));
    for (let j = 0; j < code.length; j++) {
        const symbol = code[j];
        console.log(symbol);
        playing = true;
        setTimeout(() => {
            playMorseUnit(symbol, mode);
        }, time);
        if (symbol === ".") {
            time += unitLength;
        } else if (symbol === "_") {
            time += unitLength * 3;
        }
        
        time += unitLength; // space between symbols
    }
    time += unitLength * 2; // space between letters
    if (state == "pause") {
        return;
    } else if (state == "stop") {
        playing = false;
        changeControlsState("idle");
        return;
    }
    setTimeout(() => {
        if (settings["output-mode"] === "text" && settings["practice-mode"] === "read") {
            g("text-output").innerHTML += "&nbsp;";
        }
        recursivePlay(word, remaining.slice(1), mode, [skip, playfor]);
    }, time);
}

function changeControlsState(newState) {
    if (newState === "idle") {
        g("flashlight").classList.remove("active");
        g("info-character").innerText = "-";
        g("info-status").innerText = "Idle";
        g("play-button").classList.remove("disabled");
        g("pause-button").classList.add("disabled");
        g("reset-button").classList.add("disabled");
        g("regenerate-button").classList.remove("disabled");
    } else if (newState === "playing") {
        g("info-status").innerText = "Playing";
        g("play-button").classList.add("disabled");
        g("pause-button").classList.remove("disabled");
        g("reset-button").classList.remove("disabled");
    } else if (newState.startsWith("paused")) {
        g("info-status").innerText = "Paused";
        g("play-button").classList.remove("disabled");
        g("pause-button").classList.add("disabled");
        g("reset-button").classList.remove("disabled");
    } else if (newState === "pause" || newState === "stop") {
        g("info-status").innerText = "Pausing...";
        if (!playing) {
            changeControlsState("idle");
            return;
        }
        g("play-button").classList.add("disabled");
        g("pause-button").classList.add("disabled");
        g("reset-button").classList.add("disabled");
    } else if (newState === "refreshing") {
        g("info-status").innerText = "Refreshing...";
        g("play-button").classList.add("disabled");
        g("pause-button").classList.add("disabled");
        g("reset-button").classList.add("disabled");
        g("regenerate-button").classList.add("disabled");
    }
    state = newState;
}

g("answer-submit").onclick = checkAnswer;
g("answer-input").onkeypress = function(e) {
    console.log(e.key);
    if (e.key === 'Enter') {
        checkAnswer();
    }
    if (e.key === '`') {
        console.log("Command pressed");
        settings['practice-mode'] == 'read' ? playMorseCode(word, settings["practice-mode"] === "read" ? settings["output-mode"] : "audio") : 0;
        e.preventDefault();
    }
    if (settings["answer-mode"] !== "letter") return;
    setTimeout(checkAnswer, 0);
};
//auto refocus when any clicked
g("answer-input").onblur = function() {
    setTimeout(() => {
        g("answer-input").focus();
    }, 0);
};

function translateMorseToText(morse) {
    morse = morse.replace(/-/g, "_");
    const words = morse.trim().split("   "); // 3 spaces between words
    const translatedWords = words.map(word => {
        const letters = word.split(" "); // 1 space between letters
        const translatedLetters = letters.map(letter => {
            for (const [key, value] of Object.entries(morseCode)) {
                if (value === letter) {
                    return key;
                }
            }
            return ""; // return empty string if not found
        });
        return translatedLetters.join("");
    });
    return translatedWords.join(" ");
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(frequency, duration, volume = 0.5, type = 'sine') {
    // Create an OscillatorNode
    const oscillator = audioCtx.createOscillator();

    // Set the oscillator type (sine, square, sawtooth, triangle)
    oscillator.type = type;

    // Set the frequency in Hertz
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    // Connect the oscillator to the audio output (speakers)
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Start the oscillator
    oscillator.start();

    // Stop the oscillator after a specified duration
    // Using audioCtx.currentTime + duration for more precise timing
    oscillator.stop(audioCtx.currentTime + duration / 1000); // duration in ms, convert to seconds
}

function playMorseUnit(symbol, mode) {
    var duration;
    if (symbol === ".") {
        duration = unitLength;
    } else if (symbol === "_") {
        duration = unitLength * 3;
    }
    if (mode === "audio") {
        playTone(600, duration);
    }
    if (mode === "flashlight") {
        const flashlight = g("flashlight");
        flashlight.classList.add("active");
        setTimeout(() => {
            flashlight.classList.remove("active");
        }, duration);
    }
    if (mode === "text") {
        const flashlight = g("text-output");
        flashlight.innerText += symbol;
    }
}



const feedbackDuration = 1000; // milliseconds
function checkAnswer() {
    var input = g("answer-input").value.toUpperCase();
    if (settings["answer-mode"] === "interpret" || settings['practice-mode'] === 'write') {
        input = translateMorseToText(input);
    }
    if (settings["answer-mode"] === "static") {
        input = word;
    }
    feedbackResult = feedback(input, word);
    g("answer-feedback").innerHTML = feedbackResult[1];
    if (input === word) {
        g("answer-input").classList.add("correct");
        setTimeout(() => {
            g("answer-input").classList.remove("correct");
            g("answer-input").value = "";
        }, feedbackDuration);
        if (g("autoregen").checked) {
            refreshContent();
        }
    } else if (feedbackResult[0].every(v => v === false) ) {
        g("answer-input").classList.add("incorrect");
        setTimeout(() => {
            g("answer-input").classList.remove("incorrect");
        }, feedbackDuration);
    } else {
        g("answer-input").classList.add("partial");
        setTimeout(() => {
            g("answer-input").classList.remove("partial");
        }, feedbackDuration);
    }
}

function feedback(input, word) {
    // loop through letters and check for correct letters in correct position, putting y or n in each spot
    let result = "";
    let listResult = []
    for (let i = 0; i < word.length; i++) {
        const createdSpan = document.createElement("span");
        createdSpan.classList.add("feedback-letter");
        createdSpan.id = "feedback-letter-" + i;
        createdSpan.setAttribute("onclick", `console.log("${word[i]}"); playMorseCode("${word}", settings["output-mode"], [${i}, 1]); `);
        if (!input[i]) {
            createdSpan.innerText = "_";
            createdSpan.classList.add("missing-letter");
            result += createdSpan.outerHTML;
            listResult.push(false);
            continue;
        }
        createdSpan.innerText = input[i];
        if (input[i] === word[i]) {
            createdSpan.classList.add("correct-letter");
            listResult.push(true);
        } else if (word.includes(input[i])) {
            createdSpan.classList.add("misplaced-letter");
            listResult.push(true);
        } else {
            createdSpan.classList.add("incorrect-letter");
            listResult.push(false);
        }
        result += createdSpan.outerHTML;
    }
    return [listResult, result];
}
var feedbackResult = feedback("", "XXXXX");
g("answer-feedback").innerHTML = feedbackResult[1];

async function refreshContent() {
    changeControlsState("refreshing");
    var content;
    var mode = settings["content-mode"];
    if (mode === "word") {
        content = await randomWord(5);
    }
    if (mode === "letter") {
        const letters = Object.keys(morseCode);
        const randomIndex = Math.floor(Math.random() * letters.length);
        content = letters[randomIndex];
    }
    if (mode === "jumble") {
        const letters = Object.keys(morseCode);
        content = "";
        for (let i = 0; i < 5; i++) {
            const randomIndex = Math.floor(Math.random() * letters.length);
            content += letters[randomIndex];
        }
    }
    /*if (settings["answer-mode"] === "static") {
        //g("answer-input").value = content;
    } else {
              
    }
    setTimeout(() => {
        g("answer-input").value = "";
    }, feedbackDuration); */

    //feedbackResult = feedback("", content);
    //g("answer-feedback").innerHTML = feedbackResult[1];
    word = content;
    changeControlsState("idle");
    if (g("autoplay").checked && settings["practice-mode"] === "read") {
        setTimeout(() => {
            playMorseCode(word, settings["output-mode"]);
        }, feedbackDuration + 200);
    }
    if (settings["practice-mode"] === "write") {
        g("text-output").innerText = word;
    }
}

var settings = {
    "practice-mode": "read",
    "content-mode": "word",
    "output-mode": "flashlight",
    "answer-mode": "word"
}

const defaultSettings = {
    "read": {
        'practice-mode': 'read',
        'content-mode': 'word',
        'output-mode': 'flashlight',
        'answer-mode': 'word'
    },
    "write": {
        'practice-mode': 'write',
        'content-mode': 'word',
        'output-mode': 'text',
        'answer-mode': 'word'
    }
}

function updateOptions(updateElems = false) {
    document.querySelectorAll(".mode-input").forEach(elem => {
        if (updateElems) {
            elem.onchange = function() {
                if (this.name === "practice-mode") { 
                    settings["practice-mode"] = this.value; 
                    settings = defaultSettings[settings["practice-mode"]];
                }
                var mode = settings["practice-mode"];
                console.log(mode, this.checked, this.classList.contains(mode), this.classList, (!elem.classList.contains("read") && !elem.classList.contains("write")))
                if (this.checked && (this.classList.contains(mode) || (!elem.classList.contains("read") && !elem.classList.contains("write")))) {
                    settings[this.name] = this.value;
                    writeSettingsToCheckboxes();
                    console.log("Settings updated:", settings);
                }
                changeDisplay();
            };
        }
    });
    console.log(settings)
    changeDisplay();
}
updateOptions(true);

function changeDisplay() {
    var mode = settings["practice-mode"];
    document.querySelectorAll(".mode-input").forEach(elem => {
        if (elem.classList.contains(mode) || (!elem.classList.contains("read") && !elem.classList.contains("write"))) {
            elem.parentElement.style.display = "block";
        } else {
            elem.parentElement.style.display = "none";
        }
    });
    if (settings["output-mode"] === "text") {
        g("text-output").style.display = "block";
        g("flashlight").style.display = "none";
    } else {
        g("text-output").style.display = "none";
        g("flashlight").style.display = "block";
    }
    if (settings["practice-mode"] === "write") {
        g("flashlight").style.display = "none";
        g('text-output-desc').innerText = "Translate:";
    } else {
        g('text-output-desc').innerText = "Read:";
    }
}

function writeSettingsToCheckboxes() {
    document.querySelectorAll(".mode-input").forEach(elem => {
        if (!elem.classList.contains(settings["practice-mode"])) {
            if (!(!elem.classList.contains("read") && !elem.classList.contains("write"))) {
                elem.checked = false;
            }
            return;
        } 
        if (settings[elem.name] === elem.value) {
            elem.checked = true;
        }
    });
}
writeSettingsToCheckboxes();