const id = require("./is_id.js");

function test_is_id(str, state) {
    test("'" + str + "' to be " + state, () => {
        expect(id(str)).toBe(state);
    });
}

const alphabet = [ "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "y", "x", "z"];
const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const special = ["`", "~", "!", "@", "#", "%", "^", "&", "*", "(", ")", "-", "+", "=", ",", "<", ".", ">", "?", "/", "|", "\"", "'", ";", ":", "[", "]", "{", "}", " "];


test_is_id("", false);
test_is_id(" ", false);
test_is_id("_", true);
test_is_id("$", true);
test_is_id("_$", true);
test_is_id("_$", true);
test_is_id("__", true);
test_is_id("$$", true);

alphabet.forEach((l) => {
    test_is_id(l, true);
});
alphabet.forEach((l) => {
    test_is_id(l.toUpperCase(), true);
});
alphabet.forEach((l, index) => {
    test_is_id(l.repeat(index % 4 + 1), true);
});
numbers.forEach((n, index) => {
    test_is_id(n, false);
    test_is_id(n.repeat(index % 4 + 1), false);
    test_is_id(n+alphabet[index*2], false);
    test_is_id(alphabet[index*2]+n, true);
    test_is_id(alphabet[index*2]+n+alphabet[index*2 + 1], true);
    test_is_id(n+"_", false);
    test_is_id(n+"$", false);
    test_is_id("_"+n, true);
    test_is_id("$"+n, true);
});
special.forEach((s, index) => {
    test_is_id(s, false);
    test_is_id(s.repeat(index % 4 + 1), false);
    test_is_id(s + alphabet[index%26], false);
    test_is_id(alphabet[index%26] + s, false);
    test_is_id(alphabet[index%26] + s + alphabet[index%26], false);
});

