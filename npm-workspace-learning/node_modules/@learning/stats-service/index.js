const { add, multiply } = require("@learning/math-utils");

/**
 * Educational stats helpers built on the shared math package.
 */
function sum(numbers) {
  return numbers.reduce((total, n) => add(total, n), 0);
}

function average(numbers) {
  if (numbers.length === 0) {
    return 0;
  }

  return multiply(sum(numbers), 1 / numbers.length);
}

function scale(numbers, factor) {
  return numbers.map((n) => multiply(n, factor));
}

module.exports = {
  sum,
  average,
  scale
};
