import express from "express";
import cors from "cors";
import path from "path";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  const allowedOrigin = env.clientUrl.endsWith("/")
    ? env.clientUrl.slice(0, -1)
    : env.clientUrl;

  app.use(
    cors({
      origin: allowedOrigin,
    }),
  );
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.use("/images", express.static(path.join("D:\\epix-images")));

  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
