const Util = {}

/**
 * Shuffles array in place. Fisher-Yates algo.
 * @param {Array} a An array containing the items.
 */
Util.shuffle = function (a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

// Only export module for server-side code, else it'll result in an error client-side
if (typeof window === 'undefined') {
    module.exports = Util;
}