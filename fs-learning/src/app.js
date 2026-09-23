import fs from "node:fs/promises";

await fs.mkdir("data", { recursive: true }
//     , (err) => {
//     console.log(err);
// }
)


await fs.writeFile("data/users.json",JSON.stringify([]),(err)=>{
    console.log(err);
})
const data = await fs.readFile("data/users.json","utf-8");
console.log(data);
const users = JSON.parse(data);
users.push({id:1,name:"Fahad",email:"fahad@gmail.com"});

await fs.writeFile("data/users.json",JSON.stringify(users,null,2),"utf-8");
// fs.appendFile("data/users.json",JSON.stringify([{id:1,name:"Fahad",email:"fahad@gmail.com"}]),(err)=>{  console.log(err);
// });
const reReadData = await fs.readFile("data/users.json","utf-8");
console.log(reReadData);

await fs.rename("data/users.json","data/users.js",(err)=>{
    console.log(err);
})

const reReadData2 = await fs.readFile("data/users.js","utf-8");
console.log(reReadData2);

// fs.appendFile("data/users.js",JSON.stringify([{id:1,name:"Fahad",email:"fahad@gmail.com"}]),(err)=>{
//     console.log(err);
// });

await fs.rename("data/users.js","data/users.json",(err)=>{
    console.log(err);
})

// fs.writeFile("data/users.json",JSON.stringify([{id:1,name:"Fahad",email:"fahad@gmail.com"}]),(err)=>{
//     console.log(err);
// });


fs.stat("data/users.json",(err,stats)=>{
    console.log(stats);
});