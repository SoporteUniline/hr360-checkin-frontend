import mysql from "mysql2/promise";
import { ActivosError } from "./validation.mjs";
export function activosPool() {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME)
    throw new ActivosError(
      "La conexión de inventario no está configurada en el servidor.",
      503,
    );
  if (!global._activosMysqlPool)
    global._activosMysqlPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 30,
      connectTimeout: 10000,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
      timezone: "Z",
    });
  return global._activosMysqlPool;
}
