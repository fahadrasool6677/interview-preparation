const callback = () => {
    console.log("User fetched successfully");
}


function getUser(callback) {
    console.log("Fetching user...");
    const callBack = () => {
        console.log("User fetched successfully");
        callback();
    }
    setTimeout(callBack, 2000);

}


getUser(callback);


function getProducts() {

    const promise = new Promise((resolve, reject) => {
        console.log("Fetching products...");

        setTimeout(() => {
            resolve("Products fetched successfully");
            // reject("Error fetching products"); // only one of resolve/reject, and inside the timeout
        }, 2000)
    })

    return promise;

}

getProducts()
.then((data)=>{
console.log("Data",data);
})
.catch((err)=>{
console.error("Error",err);
});

