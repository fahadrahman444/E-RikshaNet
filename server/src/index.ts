import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app.js";

const PORT = process.env.PORT || 5000;
const { server } = createApp();

server.listen(PORT, () => {
  console.log(`🚀 E-RikshaNet API server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready for tracking & dispatch events`);
});
