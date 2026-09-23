import fs from "fs";



fs.mkdir("data", { recursive: true }, (err) => {
    if (err) {
        console.log("Error creating directory", err);
    }

    fs.writeFile("data/products.json", JSON.stringify([]), (err) => {
        if (err) {
            console.log("Error writing file to directory", err);
        }
        fs.readFile("data/products.json", "utf-8", (err, data) => {
            if (err) {
                console.log("Error reading file from directory", err);
            }
            // console.log(data);
            const products = JSON.parse(data);
            products.push({ id: 1, name: "Product 1", price: 100 });
            fs.writeFile("data/products.json", JSON.stringify(products, null, 2), (err) => {
                if (err) {
                    console.log("Error writing file to directory", err);
                }
                fs.readFile("data/products.json", "utf-8", (err, data) => {
                    if (err) {
                        console.log("Error reading file from directory", err);
                    }
                    // console.log(data);
                    fs.rename("data/products.json", "data/products.js", (err) => {
                        if (err) {
                            console.log("Error renaming file", err);
                        }
                        // console.log("File renamed successfully");
                        fs.readFile("data/products.js", "utf-8", (err, data) => {
                            if (err) {
                                console.log("Error reading file from directory", err);
                            }
                            // console.log(data);
                            fs.rename("data/products.js", "data/products.json", (err) => {
                                if (err) {
                                    console.log("Error renaming file", err);
                                }
                                // console.log("File renamed successfully");
                                fs.readFile("data/products.json", "utf-8", (err, data) => {
                                    if (err) {
                                        console.log("Error reading file from directory", err);
                                    }
                                    // console.log(data);
                                    fs.stat("data/products.json", (err, stats) => {
                                        if (err) {
                                            console.log("Error statting file", err);
                                        }
                                        console.log(stats);
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    })
})