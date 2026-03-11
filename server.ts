import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";

import createRoom from "./api/createRoom.js";
import joinRoom from "./api/joinRoom.js";
import getState from "./api/getState.js";
import updateState from "./api/updateState.js";
import leaveRoom from "./api/leaveRoom.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.all("/api/createRoom", createRoom);
  app.all("/api/joinRoom", joinRoom);
  app.all("/api/getState", getState);
  app.all("/api/updateState", updateState);
  app.all("/api/leaveRoom", leaveRoom);

  app.get("/api/checkKV", (req, res) => {
    res.json({
      urlSet: !!process.env.KV_REST_API_URL,
      tokenSet: !!process.env.KV_REST_API_TOKEN
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
