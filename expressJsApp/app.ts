import express, { type Express, type Request, type Response } from 'express';

const app: Express = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.get('/about', (req: Request, res: Response) => {
  res.send('<h1>About Page</h1><p>This is the about page</p>');
})

app.listen(3000, () => {
  console.log('ExpressJS Server is running on port 3000');
  console.log('http://localhost:3000');
});