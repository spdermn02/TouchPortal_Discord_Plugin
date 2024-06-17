let alphaChars = "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z 1 2 3 4 5 6 7 8 9 0";
let germanAlphaChars = "Ä Ö Ü ß";
let spanishAlphaChars = "Á É Í Ó Ú Ñ";

let keyboard = {
  type: 0,
  keyMap: {
    SHIFT: 160,
    "RIGHT SHIFT": 161,
    CTRL: 162,
    "RIGHT CTRL": 163,
    ALT: 164,
    "RIGHT ALT": 165,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
    F13: 124,
    F14: 125,
    F15: 126,
    F16: 127,
    F17: 128,
    F18: 129,
    F19: 130,
    // Discord only supports up to F19 - leaving these here for documentation purposes
    /*'F20': 131,
        'F21': 132,
        'F22': 133,
        'F23': 134,
        'F24': 135,
        'F25': 136,
        'F26': 137,
        'F27': 138,
        'F28': 139,
        'F29': 140,
        'F30': 141,
        'F31': 142,
        'F32': 143,*/
    "NUMPAD 0": 96,
    "NUMPAD 1": 97,
    "NUMPAD 2": 98,
    "NUMPAD 3": 99,
    "NUMPAD 4": 100,
    "NUMPAD 5": 101,
    "NUMPAD 6": 102,
    "NUMPAD 7": 103,
    "NUMPAD 8": 104,
    "NUMPAD 9": 105,
    "NUMPAD *": 106,
    "NUMPAD +": 107,
    "NUMPAD -": 109,
    "NUMPAD /": 111,
    "NUMPAD .": 110,
    ENTER: 13,
    SPACE: 32,
    META: 91,
    "PAGE UP": 33,
    "PAGE DOWN": 34,
    HOME: 36,
    END: 35,
    DEL: 46,
    INSERT: 45,
    "-": 189,
    "`": 192,
    "[": 219,
    "]": 221,
    "\\": 220,
    ";": 186,
    "'": 222,
    ",": 188,
    ".": 190,
    "/": 191,
  },
};

alphaChars.split(" ").forEach((char) => {
  keyboard.keyMap[char] = char.charCodeAt(0);
});

germanAlphaChars.split(" ").forEach((char) => {
  keyboard.keyMap[char] = char.charCodeAt(0);
});

spanishAlphaChars.split(" ").forEach((char) => {
  keyboard.keyMap[char] = char.charCodeAt(0);
});

module.exports = {keyboard: keyboard};
