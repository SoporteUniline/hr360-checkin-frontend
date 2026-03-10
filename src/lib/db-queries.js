import { pool } from "@/config/database";

export async function checkSubscriptionDirect(userId) {
  try {
    const query = `
      SELECT c.id
      FROM Contrataciones c
      WHERE c.usuario_id = ?
        AND (
          EXISTS (
            SELECT 1 FROM Suscripciones s
            WHERE s.contratacion_id = c.id
              AND s.estado IN ('Activa', 'Cortesia')
              AND s.fecha_vencimiento >= CURDATE()
          )
          OR (
            c.estado = 'Activo'
            AND (c.fecha_fin IS NULL OR c.fecha_fin >= CURDATE())
          )
        )
      LIMIT 1
    `;

    const [rows] = await pool.promise().query(query, [userId]);

    return rows.length > 0;
  } catch (error) {
    console.error("Error directo en DB:", error);
    return false;
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
