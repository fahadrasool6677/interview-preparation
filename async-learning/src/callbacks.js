function getUser(callback) {
    console.log("Fetching user...");
    setTimeout(() => {
        const user = {
            id: 1,
            name: "John Doe",
            email: "john.doe@example.com"
        } 
        callback(null,user)
    }, 2000)
}


function getOrders(userId, callback) {

    console.log("Fetching orders for user...", userId);
    const orders = [
        {
            id: 1,
            userId: 1,
            amount: 100
        },
        {
            id: 2,
            userId: 1,
            amount: 200
        },
        {
            id: 3,
            userId: 1,
            amount: 300
        }
    ]
    setTimeout(() => {
        callback(null,orders)
    }, 2000)
}


function getOrderPayment(orderId, callback) {
    console.log("Fetching order payment for order...", orderId);
    const payment = {
        id: 1,
        orderId: 1,
        amount: 100
    }
    setTimeout(() => {
        console.log("Order payment fetched successfully");
        callback(null,payment)
    }, 2000)
}



function callbacksMainFunction(callback) {
    getUser((user) => {
        console.log("User", user);
        getOrders(user.id, (orders) => {
            console.log("Orders", orders);
            const ordersPayments = [];
            let completed = 0;
            for (const order of orders) {
                getOrderPayment(order?.id, (payment) => {
                    ordersPayments.push(payment);
                    completed++;
                    if (completed === orders.length) {
                        console.log("Orders payments", ordersPayments);
                        callback(ordersPayments);
                    }
                });
            }
        });
    });
}



export { callbacksMainFunction };