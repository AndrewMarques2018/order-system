import fastify from "fastify";
import { register, isMetricsEnabled } from "./config/metrics";

const app = fastify();

if (isMetricsEnabled) {
  app.get("/metrics", async (request, reply) => {
    reply.header("Content-Type", register.contentType);
    return register.metrics();
  });
}

app.listen({ port: 3001, host: "0.0.0.0" }, () => {
  console.log("Metrics server running on 3001");
});