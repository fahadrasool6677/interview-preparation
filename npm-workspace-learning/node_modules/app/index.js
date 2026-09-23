const { add, subtract, multiply } = require("@learning/math-utils");
const chalk = require("chalk");

console.log("=== app (calculator demo) ===");
console.log("Uses @learning/math-utils directly + chalk.");
console.log("");

console.log("--- math-utils ---");
console.log("Add:", add(10, 5));
console.log("Subtract:", subtract(10, 5));
console.log("Multiply:", multiply(10, 5));

console.log("");
console.log("--- chalk (external package) ---");
console.log(chalk.green("Success: workspace package loaded correctly!"));
console.log(chalk.blue("Tip: also try `npm run start:reporter` for the second app."));
