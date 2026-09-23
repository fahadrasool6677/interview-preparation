const {
  calculateSubtotal,
  applyDiscount,
  calculateTotal
} = require("./index.js");

console.log("=== @learning/pricing-service ===");
console.log("Subtotal (20 x 3):", calculateSubtotal(20, 3));
console.log("After $10 discount:", applyDiscount(60, 10));
console.log("Total (20 x 3 - 10):", calculateTotal(20, 3, 10));
