import pool from "@/config/database";

export async function checkSubscriptionDirect(userId, idEmpresa) {
  try {
    const query = `
      SELECT e.id_empresa
      FROM empresas e
      WHERE e.id_empresa = ?
        AND e.estado = 'Activo'
        AND (
          e.id_usuario = ?
          OR EXISTS (
            SELECT 1
            FROM usuarios_empresas ue
            WHERE ue.id_usuario = ?
              AND ue.id_empresa = e.id_empresa
              AND ue.estado = 'Activo'
          )
        )
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [idEmpresa, userId, userId]);

    return rows.length > 0;
  } catch (error) {
    console.error("Error directo validando empresa:", error);
    return false;
  }
}

export async function checkEmpresaSubscription(idEmpresa) {
  try {
    const query = `
      SELECT id_empresa
      FROM empresas
      WHERE id_empresa = ?
        AND estado = 'Activo'
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [idEmpresa]);

    return rows.length > 0;
  } catch (error) {
    console.error("Error validando estado de empresa:", error);
    return false;
  }
}

export async function getEmpresaSlug(idEmpresa) {
  try {
    const [rows] = await pool.query(
      `
        SELECT slug
        FROM empresas
        WHERE id_empresa = ?
        LIMIT 1
      `,
      [idEmpresa],
    );

    return rows[0]?.slug || null;
  } catch (error) {
    console.error("Error obteniendo slug de empresa:", error);
    return null;
  }
}

export async function checkSlugSubscription(slug) {
  try {
    const query = `
      SELECT id_empresa
      FROM empresas
      WHERE slug = ?
        AND estado = 'Activo'
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [slug]);

    return rows.length > 0;
  } catch (error) {
    console.error("Error validando empresa por slug:", error);
    return false;
  }
}
