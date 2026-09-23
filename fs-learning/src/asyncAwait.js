import fs from "fs";


const mkDirResponse =await fs.promises.mkdir("data",{recursive:true});
console.log("Directory created successfully",mkDirResponse);


const fileCreated =await fs.promises.writeFile("data/products.json",JSON.stringify([]));
console.log("File created successfully",fileCreated);

const fileRead =await fs.promises.readFile("data/products.json","utf-8");
console.log("File read successfully",fileRead);

const products = JSON.parse(fileRead);
console.log("Products",products);

products.push({
    id:90,
    name:"Jinoom",
    price:100
})

const fileWritten =await fs.promises.writeFile("data/products.json",JSON.stringify(products,null,2));
console.log("File written successfully",fileWritten);

const fileReadAgain =await fs.promises.readFile("data/products.json","utf-8");
console.log("File read successfully",fileReadAgain);

const productsAgain = JSON.parse(fileReadAgain);
console.log("Products",productsAgain);

const fileReadAgainAgain =await fs.promises.readFile("data/products.json","utf-8");
console.log("File read successfully",fileReadAgain);

const productsAgainAgain = JSON.parse(fileReadAgainAgain);
console.log("Products",productsAgainAgain);