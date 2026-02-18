import { pool } from "@/config/database";

export async function checkSubscriptionDirect(userId) {
  try {
    const [rows] = await pool
      .promise()
      .query(
        "SELECT * FROM Contrataciones WHERE usuario_id = ? AND estado = 'Activo' LIMIT 1",
        [userId],
      );
    return rows.length > 0;
  } catch (error) {
    console.error("Error directo en DB:", error);
    return true;
  }
}

export async function checkEmpresaSubscription(idEmpresa) {
  try {
    const query = `
      SELECT c.id 
      FROM Contrataciones c
      JOIN usuarios_empresas ue ON c.usuario_id = ue.id_usuario
      WHERE ue.id_empresa = ? AND c.estado = 'Activo'
      LIMIT 1
    `;

    const [rows] = await pool.promise().query(query, [idEmpresa]);
    return rows.length > 0;
  } catch (error) {
    console.error("Error validando empresa en DB:", error);
    return false;
  }
}

export async function getEmpresaSlug(idEmpresa) {
  try {
    const [rows] = await pool
      .promise()
      .query("SELECT slug FROM empresas WHERE id_empresa = ? LIMIT 1", [
        idEmpresa,
      ]);
    return rows[0]?.slug || null;
  } catch (error) {
    return null;
  }
}

export async function checkSlugSubscription(slug) {
  const query = `
    SELECT c.id 
    FROM Contrataciones c
    JOIN usuarios_empresas ue ON c.usuario_id = ue.id_usuario
    JOIN empresas e ON ue.id_empresa = e.id_empresa
    WHERE e.slug = ? AND c.estado = 'Activo'
    LIMIT 1
  `;
  const [rows] = await pool.promise().query(query, [slug]);
  return rows.length > 0;
}
