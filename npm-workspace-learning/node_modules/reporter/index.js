const {
  calculateSubtotal,
  calculateTotal
} = require("@learning/pricing-service");
const { sum, average } = require("@learning/stats-service");

console.log("=== reporter app ===");
console.log("This app consumes TWO workspace services.");
console.log("");

console.log("--- pricing-service ---");
console.log("Subtotal (15 x 4):", calculateSubtotal(15, 4));
console.log("Total (15 x 4 - 5):", calculateTotal(15, 4, 5));

console.log("");
console.log("--- stats-service ---");
const weeklySales = [60, 55, 70, 80];
console.log("Weekly sales:", weeklySales.join(", "));
console.log("Sum:", sum(weeklySales));
console.log("Average:", average(weeklySales));

console.log("");
console.log("Dependency chain:");
console.log("reporter -> pricing-service -> math-utils");
console.log("reporter -> stats-service   -> math-utils");
