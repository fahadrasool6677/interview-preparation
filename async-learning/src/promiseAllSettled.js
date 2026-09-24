function promiseAllSettledMainFunction() {



    const promises = [
        Promise.resolve("User 1"),
        Promise.reject("User 2 failed"),
        Promise.resolve("User 3")
    ];

    Promise.all(promises)
        .then((results) => {
            console.log(results);
        })
        .catch((error) => {
            console.log("Error:", error);
        });


    Promise.allSettled(promises)
        .then((results) => {
            console.log(results);
        })
        .catch((error) => {
            console.log("Error:", error);
        });
}


export { promiseAllSettledMainFunction };