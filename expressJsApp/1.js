import express from 'express';
const app = express();
app.use(express.json());

// Middleware that modifies both request and response
app.use((req, res, next) => {
    // --- Modify Request ---
    req.requestId = `req_${Math.random().toString(36).substring(2, 9)}`;

    // --- Modify Response Body ---
    const originalJson = res.json.bind(res);

    res.json = (body) => {
        // Wrap whatever the controller returns in a standardized envelope
        const standardizedResponse = {
            requestId: req.requestId,
            payload: body
        };

        return  originalJson(standardizedResponse);
    };

    next();
});

// Route handler
app.get('/user', (req, res) => {
    // Controller sends a plain object
    console.log(req.requestId);
    
    res.json({ name: "Alex", role: "Developer" });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});