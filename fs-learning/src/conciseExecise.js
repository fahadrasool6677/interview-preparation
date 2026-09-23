import fs from "node:fs/promises";

await fs.mkdir("data", { recursive: true });

await fs.writeFile(
    "data/users.json",
    JSON.stringify([]),
    "utf8"
);

const data = await fs.readFile(
    "data/users.json",
    "utf8"
);

// JSON → JavaScript
const users = JSON.parse(data);

// Add user
users.push({
    id: 1,
    name: "Fahad",
    email: "fahad@gmail.com"
});

// JavaScript → JSON
await fs.writeFile(
    "data/users.json",
    JSON.stringify(users, null, 2),
    "utf8"
);

// Read again
const updatedData = await fs.readFile(
    "data/users.json",
    "utf8"
);

console.log("Users:");
console.log(JSON.parse(updatedData));

// File information
const stats = await fs.stat("data/users.json");

console.log("File size:", stats.size, "bytes");