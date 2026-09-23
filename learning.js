const path = require("path");
const fs = require("fs");
console.log("__filename",__filename);
console.log("__dirname",__dirname);
// fs.mkdir("data", (err) => {
//     if (err) {
//         console.error(err);
//     }
// });
// // console.log("Hello World");
// console.log(path.dirname,"hello",path.join("users", "fahad", "data.txt"));

// console.log(process.argv);
// console.log(process.argv[0]);



// function main() {
//     console.log("Main Started");

//     function setTimeOutCallback() {
//         console.log("Hello I am Set Timeout Callback");
//     }

//     // const timeoutId = setTimeout(setTimeOutCallback, 0);//callback,delay
//     // console.log("Main Ended");
//     // clearTimeout(timeoutId);




//     // function setIntervalCallback() {
//     //     console.log("Interval Callback");
//     // }

//     // const intervalId = setInterval(setIntervalCallback, 100);//ca;;nack,delay
//     // function timeoutCallback2() {

//     //     clearInterval(intervalId);
//     // }
//     // setTimeout(timeoutCallback2, 1000)//




//     const user = {
//         name: "Fahad",
    
//         greet() {
//             console.log(this.name);
//             const name111 = "Fssssahad";
//             function inner() {
//                 console.log(name111);
//             }
    
//             inner.call(this);
//         }
//     };
//     user.greet();
// }
// main();


// (

//     function displayName(...names){
//         console.log(names);
//         console.log(names.length);
//         console.log(names.join(", "));
//         console.log(names.join(" "));
//         console.log(names.join("-"));
//         console.log(names.join("|"));
//         console.log(names.join(" "));
//         console.log(names.join(" "));
//     }
// )("John", "Jane", "Jim", "Jill");