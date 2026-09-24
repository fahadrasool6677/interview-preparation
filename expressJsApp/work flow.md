Express.js roadmap
1. Express Fundamentals
What is Express.js?
Why Express?
Installing Express
Creating your first server
app.listen()
Routes
HTTP methods: GET, POST, PUT, PATCH, DELETE
Route parameters
Query parameters
Request body
Request/response objects
JSON responses
Status codes
res.json(), res.send(), res.status(), res.end()
2. Middleware
What is middleware?
Middleware execution flow
next()
Application-level middleware
Router-level middleware
Built-in middleware
express.json()
express.urlencoded()
Static files
Custom middleware
Multiple middleware
Middleware ordering
3. Routing
express.Router()
Route organization
Route parameters
Nested routers
Route middleware
Route handlers
router.param()
REST API structure
4. Error Handling
Synchronous errors
Asynchronous errors
try/catch
next(error)
Error-handling middleware
Custom error classes
Centralized error handling
Express 4 vs Express 5 async error handling
Operational vs programming errors
5. Building REST APIs

We'll build a proper API with:

POST   /api/products
GET    /api/products
GET    /api/products/:id
PATCH  /api/products/:id
DELETE /api/products/:id

Including:

Controllers
Services
Routes
Validation
Database integration
Pagination
Filtering
Sorting
Searching
Proper HTTP status codes
6. Request Validation
Why validation is needed
express-validator
Zod/Joi
Validation middleware
Request DTO concepts
Handling validation errors
7. Authentication & Authorization
Authentication vs authorization
Password hashing
JWT
Access tokens
Refresh tokens
Authentication middleware
Role-based authorization
Permissions
Protecting routes
8. Database Integration

Since you're already familiar with Prisma/PostgreSQL:

Express
   ↓
Controller
   ↓
Service
   ↓
Prisma
   ↓
PostgreSQL

We'll cover:

Prisma with Express
Transactions
Connection handling
Database errors
Repository/service patterns
9. Advanced Express
Async request handling
Request lifecycle
req/res internals
Custom middleware architecture
Dependency injection concepts
API versioning
File uploads
Streaming
Cookies
Sessions
CORS
Compression
Rate limiting
Security headers
Request IDs
Logging
10. Production Express
Environment configuration
Graceful shutdown
Health checks
Error logging
Structured logging
Performance
Memory considerations
Reverse proxy
Nginx
PM2
Docker
Kubernetes considerations
Horizontal scaling
Stateless architecture
11. Advanced Security
Helmet
CORS configuration
Rate limiting
Brute-force protection
Input sanitization
SQL injection prevention
XSS considerations
CSRF
Secure cookies
JWT security
Secrets management
12. Testing
Unit testing
Integration testing
API testing
Jest/Vitest
Supertest
Mocking
Testing middleware
Testing authentication
Testing error handling
13. Real Project

We'll eventually build something like:

Express REST API
│
├── Authentication
├── Users
├── Products
├── Orders
├── Roles & Permissions
├── PostgreSQL
├── Prisma
├── Validation
├── Error Handling
├── Logging
├── Rate Limiting
├── Testing
└── Docker