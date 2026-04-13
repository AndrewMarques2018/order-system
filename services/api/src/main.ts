import "dotenv/config";
import Fastify from "fastify";
import { orderRoutes } from "./modules/order/controller/order.controller";
import { db } from "./config/db";

const app = Fastify();

app.register(orderRoutes);

async function start() {
  try {
    await db.query("SELECT 1");
    console.log("Database connected");

    await app.listen({ port: 3000, host: "0.0.0.0" });
    console.log("API running");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();