// try {
//     setTimeout(() => {
//         throw new Error("Boom");
//     }, 1000);
// } catch (error) {
//     console.log("Caught");
// }


// Promise.reject(new Error("Something failed"))
//     .catch(error => {
//         console.log(error.message);
//     });
// console.log("Program continues...");
class NotFoundError extends Error {
    constructor(message) {
        super(message);

        this.name = "NotFoundError";
        this.statusCode = 404;
    }
}


throw new NotFoundError("User not found");