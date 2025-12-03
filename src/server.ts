import http from "http";
import app from "./app";
import connectDB from "./config/db";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

// http server create kar raha hai
const server = http.createServer(app);

// server start karte hi DB connect karega
server.listen(PORT, async () => {
  await connectDB();
  console.log(`Server running on port ${PORT}`);
});
