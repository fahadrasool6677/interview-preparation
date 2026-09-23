import fs from "fs";


fs.promises.mkdir("data",{recursive:true}).then(()=>{
    console.log("Directory created successfully");
    fs.promises.writeFile("data/products.json",JSON.stringify([])).then(()=>{
        console.log("File written successfully");

        fs.promises.readFile("data/products.json","utf-8").then((data)=>{
            console.log("File read successfully",data);
            const products = JSON.parse(data);
            console.log("products",products);
            
            products.push({
                id:90,
                name:"Jinoom",
                price:100
            })
            fs.promises.writeFile("data/products.json",JSON.stringify(products,null,2)).then(()=>{
                console.log("File written successfully");
                fs.promises.readFile("data/products.json","utf-8").then((data)=>{
                    console.log("File read successfully",data);
                })
            })
        });
    })
    
}).catch(()=>{
    console.log("Error creating directory");
})


