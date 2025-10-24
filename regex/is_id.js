function is_js_id(str) {
    //_ and $ are as applicable as any other letter
    //0-9 cannot be the first character but can be at any other spot.
    //An empty string does not count
    //The string has to be ONLY the ID. If it includes anything after a legal ID, the string is not an ID.
    //Assumes 'str' is a single word. No spaces before or after.
    const re = /^[A-Za-z_$][0-9A-Za-z_$]*$/
    let result = re.test(str)
    return result;
}
module.exports = is_js_id;
