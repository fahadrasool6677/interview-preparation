function getUser() {
    return new Promise((resolve,reject) => {
        setTimeout(() => {
            resolve({
                id: 1,
                name: "John Doe",
                email: "john.doe@example.com",
            });
        }, 2000);
    });
}

function getOrders(userId) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: 1, userId, amount: 100 },
                { id: 2, userId, amount: 100 },
                { id: 3, userId, amount: 100 },
            ]);
        }, 2000);
    });
}

function getOrderPayment(orderId) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                id: orderId,
                amount: 100,
            });
        }, 2000);
    });
}

async function asyncAwaitMainFunction() {
    try {
        const user = await getUser();
        console.log("User", user);

        const orders = await getOrders(user.id);
        console.log("Orders", orders);

        const payments = await Promise.all(
            orders.map((order) => getOrderPayment(order.id))
        );
        console.log("Payments", payments);
    } catch (err) {
        console.error("Error", err);
    }
}

export { asyncAwaitMainFunction };
