import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { ParamsDictionary, } from 'express-serve-static-core';
import morgan from 'morgan';


const app: Express = express();
app.use(express.json());
app.use(morgan('dev'));
app.use((req, res, next) => {
  console.log("Middleware executed");
 
  next();
});

app.all("/*splat", (req, res) => {
  res.status(404).json({
      message: "Route not found"
  });
});

app.get('/', (req: Request, res: Response) => {
  const method = req.method;


  res.send('Hello World!');
});




app.get("/users", (req: Request, res: Response) => {
  console.log(req.body);

  res.json(req.body);
});

app.get('/product/:id', (req: Request, res: Response) => {
  const params: ParamsDictionary = req.params;
  console.log(params);
  const queryParameters = req.query.price;
  console.log("Query Parameters:", queryParameters);
  res.send(`Product ${req.params.id}`);
})


app.get('/about', (req: Request, res: Response) => {
  res.send('<h1>About Page</h1><p>This is the about page</p>');
})


//app.METHOD(pah, handlerFunction)
// app.METHOD(path, [middleware1, middleware2, ...], handlerFunction)

app.post('/create/user', (req: Request, res: Response) => {
  const baseURL = req.baseUrl;
  const path = req.path;
  const url = req.url;
  const method = req.method;
  const hostname = req.hostname;
  const ip = req.ip;
  const ips = req.ips;
  const subdomains = req.subdomains;
  const originalUrl = req.originalUrl;
  console.log(`baseURL: ${baseURL}, path: ${path}, url: ${url}, method: ${method}, hostname: ${hostname}, ip: ${ip}, ips: ${ips}, subdomains: ${subdomains}, originalUrl: ${originalUrl}`);
  res.send(`User created successfully`)
})



app.get('/user/:id', (req: Request, res: Response, next: NextFunction) => {
  if (req.params.id === '0') {
    return next('route');
  }
  res.send(`User ${req.params.id}`);
});

app.get('/user/:id', (req: Request, res: Response) => {
  res.send('Special handler for user ID 0');
});

app.listen(3000, () => {
  console.log('ExpressJS Server is running on port 3000');
  console.log('http://localhost:3000');
});