import { Pool } from "pg";

export const db = new Pool({
  host: "postgres",
  port: 5432,
  user: "admin",
  password: "admin",
  database: "orders",
});