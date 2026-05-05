import pool from "@/config/database";

export async function checkSubscriptionDirect(userId, idEmpresa) {
  try {
    const query = `
      SELECT c.id
      FROM Contrataciones c
      WHERE c.empresa = ?
      AND (
        c.usuario_id = ?
        OR EXISTS (
          SELECT 1 FROM usuarios_empresas ue
          WHERE ue.id_usuario = ? AND ue.id_empresa = c.empresa
        )
      )
      AND c.estado = 'Activo'
      AND (
        c.fecha_fin IS NULL
        OR CURDATE() < DATE_ADD(LAST_DAY(DATE_ADD(c.fecha_fin, INTERVAL 1 MONTH)), INTERVAL 1 DAY)
      )
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [idEmpresa, userId, userId]);
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

    const [rows] = await pool.query(query, [idEmpresa]);
    return rows.length > 0;
  } catch (error) {
    console.error("Error validando empresa en DB:", error);
    return false;
  }
}

export async function getEmpresaSlug(idEmpresa) {
  try {
    const [rows] = await pool.query(
      "SELECT slug FROM empresas WHERE id_empresa = ? LIMIT 1",
      [idEmpresa],
    );
    return rows[0]?.slug || null;
  } catch (error) {
    return null;
  }
}

export async function checkSlugSubscription(slug) {
  try {
    const query = `
      SELECT c.id 
      FROM Contrataciones c
      JOIN usuarios_empresas ue ON c.usuario_id = ue.id_usuario
      JOIN empresas e ON ue.id_empresa = e.id_empresa
      WHERE e.slug = ? AND c.estado = 'Activo'
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [slug]);
    return rows.length > 0;
  } catch (error) {
    console.error("Error validando slug en DB:", error);
    return false;
  }
}
