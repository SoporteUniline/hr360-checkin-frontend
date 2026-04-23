const mysql = require("mysql2");

if (!global._mysqlPool) {
  global._mysqlPool = mysql
    .createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "tu_base_de_datos",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
    .promise();
}

module.exports = global._mysqlPool;
