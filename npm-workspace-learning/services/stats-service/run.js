const { sum, average, scale } = require("./index.js");

const values = [10, 20, 30, 40];

console.log("=== @learning/stats-service ===");
console.log("Values:", values.join(", "));
console.log("Sum:", sum(values));
console.log("Average:", average(values));
console.log("Scaled x2:", scale(values, 2).join(", "));
