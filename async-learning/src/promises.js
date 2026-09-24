function getUser() {
    const userPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve({
                id: 1,
                name: "John Doe",
                email: "john.doe@example.com"
            })
        }, 2000)
    });

    return userPromise;
}


function getOrders(userId) {
    const orderPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve([
                {
                    id: 1,
                    userId: 1,
                    amount: 100
                },
                {
                    id: 2,
                    userId: 1,
                    amount: 100
                },
                {
                    id: 3,
                    userId: 1,
                    amount: 100
                },
            ])
        }, 2000)
    })
    return orderPromise;
}

function getOrderPayment(orderId) {
    const orderPaymentPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve({
                id: orderId,
                amount: 100
            })
        }, 2000)
    })
    return orderPaymentPromise;
}


function promisesMainFunctionWithNestedPromises() {
    getUser().then((user) => {
        console.log("User", user);
        getOrders(user.id).then((orders) => {
            console.log("Orders", orders);
            const ordersPayments = [];
            orders.forEach((order) => {
                getOrderPayment(order.id).then((payment) => {
                    ordersPayments.push(payment);
                    console.log("Payment", payment);
                }).catch((err) => {
                    console.error("Error", err);
                })
            })
            console.log("Orders payments", ordersPayments);
        }).catch((err) => {
            console.error("Error", err);
        })
    }).catch((err) => {
        console.error("Error", err);
    })
}

function promisesMainFunctionWithoutNestedPromises() {
    getUser()
        .then((user) => {
            console.log("User", user);
            const ordersPromise = getOrders(user?.id);
            return ordersPromise;
        })
        .then((orders) => {
            console.log("Orders", orders);
            const paymentPromises = orders.map((order) => {
                const orderPaymentPromise = getOrderPayment(order.id);
                return orderPaymentPromise;
            })
           const allPayments = Promise.all(paymentPromises);
            return allPayments
        })
        .then((payments)=>{
            console.log("Payments", payments);
        })
        .catch((err) => {
            console.error("Error", err);
        })
}

export {
    promisesMainFunctionWithNestedPromises,
    promisesMainFunctionWithoutNestedPromises
};