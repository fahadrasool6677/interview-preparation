const { add, multiply } = require("@learning/math-utils");

/**
 * Educational pricing helpers.
 * In a real project this might talk to a database or API.
 * Here it only shows services consuming a shared workspace package.
 */
function calculateSubtotal(unitPrice, quantity) {
  return multiply(unitPrice, quantity);
}

function applyDiscount(subtotal, discountAmount) {
  // subtract is used via add with a negative discount for clarity demo,
  // but we keep the math simple and explicit:
  return add(subtotal, -discountAmount);
}

function calculateTotal(unitPrice, quantity, discountAmount) {
  const subtotal = calculateSubtotal(unitPrice, quantity);
  return applyDiscount(subtotal, discountAmount);
}

module.exports = {
  calculateSubtotal,
  applyDiscount,
  calculateTotal
};
