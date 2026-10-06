-- ADAMIA / Evaluación de desempeño — propuesta para Cristian Cano
-- Diseño MySQL 8.0.16+ (CHECK efectivos). NO ejecutado contra una base real.
-- Confirmar versión, motor, tipos y FKs de empresas/usuarios/empleados con Luis.
-- El backend debe validar invariantes entre filas, permisos, snapshots y JSON.
-- Todas las escrituras de publicación/envío/inicio deben ser transaccionales.
-- FKs internas RESTRICT: no borrar el historial al dar de baja al empleado.
-- VARCHAR/CHAR IDs nuevos: UUID; tenant/user/employee BIGINT UNSIGNED son supuestos.
-- Inmutabilidad de versiones, respuestas enviadas, revisiones y auditoría:
-- imponer con permisos del servicio/roles SQL y operaciones específicas.

CREATE TABLE performance_settings (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  config JSON NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  updated_by BIGINT UNSIGNED NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_settings_tenant_id (tenant_id,id),
  UNIQUE KEY uq_settings_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_templates (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  target_area_id BIGINT UNSIGNED NULL,
  target_position_id BIGINT UNSIGNED NULL,
  current_version INT UNSIGNED NOT NULL DEFAULT 1,
  archived_at DATETIME(6) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_templates_tenant_id (tenant_id,id),
  KEY ix_templates_search (tenant_id,archived_at,name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_template_versions (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  template_id CHAR(36) NOT NULL,
  version INT UNSIGNED NOT NULL,
  definition JSON NOT NULL,
  definition_sha256 CHAR(64) NOT NULL,
  scale JSON NOT NULL,
  bands JSON NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_template_versions_tenant_id (tenant_id,id),
  UNIQUE KEY uq_template_version (tenant_id,template_id,version),
  CONSTRAINT fk_version_template FOREIGN KEY (tenant_id,template_id) REFERENCES performance_templates (tenant_id,id) ON DELETE RESTRICT,
  CHECK (version > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_categories (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  template_version_id CHAR(36) NOT NULL,
  competency_key VARCHAR(100) NOT NULL,
  name VARCHAR(160) NOT NULL,
  weight DECIMAL(7,4) NOT NULL,
  position INT UNSIGNED NOT NULL,
  question_weights ENUM('equal','custom') NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_tenant_id (tenant_id,id),
  UNIQUE KEY uq_category_order (tenant_id,template_version_id,position),
  UNIQUE KEY uq_category_version_id (tenant_id,template_version_id,id),
  CONSTRAINT fk_category_version FOREIGN KEY (tenant_id,template_version_id) REFERENCES performance_template_versions (tenant_id,id) ON DELETE RESTRICT,
  CHECK (weight >= 0 AND weight <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_questions (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  template_version_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  question_key VARCHAR(100) NOT NULL,
  prompt VARCHAR(500) NOT NULL,
  kind ENUM('scale','boolean','text','choice','number') NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  scored BOOLEAN NOT NULL DEFAULT TRUE,
  weight DECIMAL(7,4) NULL,
  position INT UNSIGNED NOT NULL,
  config JSON NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_questions_tenant_id (tenant_id,id),
  UNIQUE KEY uq_question_order (tenant_id,category_id,position),
  CONSTRAINT fk_question_category FOREIGN KEY (tenant_id,template_version_id,category_id) REFERENCES performance_categories (tenant_id,template_version_id,id) ON DELETE RESTRICT,
  CHECK (weight IS NULL OR (weight > 0 AND weight <= 100)),
  CHECK (kind <> 'text' OR scored = FALSE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_options (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  question_id CHAR(36) NOT NULL,
  option_key VARCHAR(100) NOT NULL,
  label VARCHAR(500) NOT NULL,
  score DECIMAL(7,4) NULL,
  position INT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_options_tenant_id (tenant_id,id),
  UNIQUE KEY uq_option_order (tenant_id,question_id,position),
  CONSTRAINT fk_option_question FOREIGN KEY (tenant_id,question_id) REFERENCES performance_questions (tenant_id,id) ON DELETE RESTRICT,
  CHECK (score IS NULL OR (score >= 1 AND score <= 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_campaigns (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  model VARCHAR(30) NOT NULL,
  primary_template_version_id CHAR(36) NULL,
  result_bands JSON NULL,
  status ENUM('draft','scheduled','active','closed') NOT NULL DEFAULT 'draft',
  period_start DATE NULL,
  period_end DATE NULL,
  opens_on DATE NULL,
  due_on DATE NULL,
  timezone VARCHAR(80) NOT NULL DEFAULT 'America/Mexico_City',
  settings_snapshot JSON NOT NULL,
  reminders JSON NOT NULL,
  recurrence ENUM('none','quarterly','semiannual','annual') NOT NULL DEFAULT 'none',
  recurrence_parent_id CHAR(36) NULL,
  next_recurrence_at DATETIME(6) NULL,
  launched_at DATETIME(6) NULL,
  closed_at DATETIME(6) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_campaigns_tenant_id (tenant_id,id),
  KEY ix_campaign_list (tenant_id,status,period_start,due_on),
  CONSTRAINT fk_campaign_primary_version FOREIGN KEY (tenant_id,primary_template_version_id) REFERENCES performance_template_versions (tenant_id,id) ON DELETE RESTRICT,
  CONSTRAINT fk_campaign_recurrence FOREIGN KEY (tenant_id,recurrence_parent_id) REFERENCES performance_campaigns (tenant_id,id) ON DELETE RESTRICT,
  CHECK (period_start <= period_end),
  CHECK (opens_on <= due_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_perspectives (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  campaign_id CHAR(36) NOT NULL,
  perspective ENUM('descending','ascending','peer','self','hr') NOT NULL,
  weight DECIMAL(7,4) NOT NULL,
  template_version_id CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_perspectives_tenant_id (tenant_id,id),
  UNIQUE KEY uq_perspective (tenant_id,campaign_id,perspective),
  UNIQUE KEY uq_perspective_campaign_id (tenant_id,campaign_id,id),
  CONSTRAINT fk_perspective_campaign FOREIGN KEY (tenant_id,campaign_id) REFERENCES performance_campaigns (tenant_id,id) ON DELETE RESTRICT,
  CONSTRAINT fk_perspective_version FOREIGN KEY (tenant_id,template_version_id) REFERENCES performance_template_versions (tenant_id,id) ON DELETE RESTRICT,
  CHECK (weight >= 0 AND weight <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_subjects (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  campaign_id CHAR(36) NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  organization_snapshot JSON NOT NULL,
  area_id BIGINT UNSIGNED NULL,
  position_id BIGINT UNSIGNED NULL,
  manager_employee_id BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_subjects_tenant_id (tenant_id,id),
  UNIQUE KEY uq_subject_employee (tenant_id,campaign_id,employee_id),
  UNIQUE KEY uq_subject_campaign_id (tenant_id,campaign_id,id),
  KEY ix_subject_filters (tenant_id,area_id,position_id,manager_employee_id),
  CONSTRAINT fk_subject_campaign FOREIGN KEY (tenant_id,campaign_id) REFERENCES performance_campaigns (tenant_id,id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_assignments (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  campaign_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NOT NULL,
  perspective_id CHAR(36) NOT NULL,
  evaluator_user_id BIGINT UNSIGNED NOT NULL,
  evaluator_employee_id BIGINT UNSIGNED NULL,
  relation_snapshot JSON NOT NULL,
  status ENUM('pending','draft','submitted') NOT NULL DEFAULT 'pending',
  submitted_at DATETIME(6) NULL,
  updated_at DATETIME(6) NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_assignments_tenant_id (tenant_id,id),
  UNIQUE KEY uq_assignment_relation (tenant_id,subject_id,perspective_id,evaluator_user_id),
  KEY ix_assignment_inbox (tenant_id,evaluator_user_id,status,campaign_id),
  CONSTRAINT fk_assignment_subject FOREIGN KEY (tenant_id,campaign_id,subject_id) REFERENCES performance_subjects (tenant_id,campaign_id,id) ON DELETE RESTRICT,
  CONSTRAINT fk_assignment_perspective FOREIGN KEY (tenant_id,campaign_id,perspective_id) REFERENCES performance_perspectives (tenant_id,campaign_id,id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_responses (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  assignment_id CHAR(36) NOT NULL,
  answers JSON NOT NULL,
  category_comments JSON NOT NULL,
  shared_comment TEXT NULL,
  private_rh_note TEXT NULL,
  payload_sha256 CHAR(64) NULL,
  submitted_at DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_responses_tenant_id (tenant_id,id),
  UNIQUE KEY uq_response_assignment (tenant_id,assignment_id),
  CONSTRAINT fk_response_assignment FOREIGN KEY (tenant_id,assignment_id) REFERENCES performance_assignments (tenant_id,id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_response_revisions (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  response_id CHAR(36) NOT NULL,
  revision INT UNSIGNED NOT NULL,
  payload JSON NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(500) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_response_revisions_tenant_id (tenant_id,id),
  UNIQUE KEY uq_response_revision (tenant_id,response_id,revision),
  CONSTRAINT fk_revision_response FOREIGN KEY (tenant_id,response_id) REFERENCES performance_responses (tenant_id,id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_publications (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  subject_id CHAR(36) NOT NULL,
  version INT UNSIGNED NOT NULL,
  result_snapshot JSON NOT NULL,
  visibility_snapshot JSON NOT NULL,
  snapshot_sha256 CHAR(64) NOT NULL,
  final_score DECIMAL(7,4) NOT NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME(6) NULL,
  published_by BIGINT UNSIGNED NULL,
  published_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_publications_tenant_id (tenant_id,id),
  UNIQUE KEY uq_publication_version (tenant_id,subject_id,version),
  KEY ix_publication_visibility (tenant_id,published_at,subject_id),
  CONSTRAINT fk_publication_subject FOREIGN KEY (tenant_id,subject_id) REFERENCES performance_subjects (tenant_id,id) ON DELETE RESTRICT,
  CHECK (final_score >= 1 AND final_score <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_plans (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  subject_id CHAR(36) NOT NULL,
  title VARCHAR(250) NOT NULL,
  success_measure TEXT NOT NULL,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  owner_employee_id BIGINT UNSIGNED NULL,
  due_on DATE NOT NULL,
  status ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  created_by BIGINT UNSIGNED NOT NULL,
  updated_at DATETIME(6) NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_plans_tenant_id (tenant_id,id),
  KEY ix_plan_due (tenant_id,owner_user_id,status,due_on),
  CONSTRAINT fk_plan_subject FOREIGN KEY (tenant_id,subject_id) REFERENCES performance_subjects (tenant_id,id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_plan_updates (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  plan_id CHAR(36) NOT NULL,
  status ENUM('pending','in_progress','completed') NOT NULL,
  note TEXT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_plan_updates_tenant_id (tenant_id,id),
  KEY ix_plan_history (tenant_id,plan_id,created_at),
  CONSTRAINT fk_plan_update FOREIGN KEY (tenant_id,plan_id) REFERENCES performance_plans (tenant_id,id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_evidence (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  plan_id CHAR(36) NOT NULL,
  title VARCHAR(250) NOT NULL,
  kind ENUM('private_file','link') NOT NULL,
  storage_key VARCHAR(500) NULL,
  external_url TEXT NULL,
  original_filename VARCHAR(255) NULL,
  mime_type VARCHAR(150) NULL,
  byte_size BIGINT UNSIGNED NULL,
  sha256 CHAR(64) NULL,
  scan_status ENUM('pending','clean','blocked','not_applicable') NOT NULL DEFAULT 'pending',
  created_by BIGINT UNSIGNED NOT NULL,
  revoked_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_evidence_tenant_id (tenant_id,id),
  CONSTRAINT fk_evidence_plan FOREIGN KEY (tenant_id,plan_id) REFERENCES performance_plans (tenant_id,id) ON DELETE RESTRICT,
  CHECK ((kind='private_file' AND storage_key IS NOT NULL AND external_url IS NULL) OR (kind='link' AND external_url IS NOT NULL AND storage_key IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_receipts (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  publication_id CHAR(36) NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  publication_sha256 CHAR(64) NOT NULL,
  typed_name VARCHAR(160) NOT NULL,
  receipt_text TEXT NOT NULL,
  observations TEXT NULL,
  identity_method VARCHAR(50) NOT NULL,
  identity_evidence JSON NOT NULL,
  signed_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_receipts_tenant_id (tenant_id,id),
  UNIQUE KEY uq_receipt_publication (tenant_id,publication_id,actor_user_id),
  CONSTRAINT fk_receipt_publication FOREIGN KEY (tenant_id,publication_id) REFERENCES performance_publications (tenant_id,id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_audit (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  request_id VARCHAR(100) NOT NULL,
  reason VARCHAR(500) NULL,
  changes_redacted JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_audit_tenant_id (tenant_id,id),
  KEY ix_audit_entity (tenant_id,entity_type,entity_id,created_at),
  KEY ix_audit_actor (tenant_id,actor_user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_outbox (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  dedupe_key VARCHAR(191) NOT NULL,
  payload JSON NOT NULL,
  scheduled_at DATETIME(6) NOT NULL,
  status ENUM('pending','processing','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_at DATETIME(6) NULL,
  locked_by VARCHAR(100) NULL,
  delivered_at DATETIME(6) NULL,
  last_error TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_outbox_tenant_id (tenant_id,id),
  UNIQUE KEY uq_outbox_dedupe (tenant_id,dedupe_key),
  KEY ix_outbox_worker (status,scheduled_at,locked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_idempotency (
  id CHAR(36) NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  operation VARCHAR(80) NOT NULL,
  idempotency_key VARCHAR(100) NOT NULL,
  request_sha256 CHAR(64) NOT NULL,
  response_status SMALLINT UNSIGNED NULL,
  response_json JSON NULL,
  expires_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_idempotency_tenant_id (tenant_id,id),
  UNIQUE KEY uq_idempotency_operation (tenant_id,actor_user_id,operation,idempotency_key),
  KEY ix_idempotency_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invariantes a imponer en servicio/transacción, no con CHECK entre tablas:
-- 1. Sumas 100% de categorías, preguntas personalizadas y perspectivas.
-- 2. Identidad/rol/empresa real y elegibilidad del organigrama.
-- 3. Preguntas/opciones pertenecen a la versión asignada; sin campos extra.
-- 4. Una categoría de peso positivo tiene respuesta calificable al enviar.
-- 5. La categoría/versión normalizada coincide con el snapshot y su hash.
-- 6. No editar plantillas versionadas ni respuestas enviadas/publicaciones.
-- 7. Umbral de confidencialidad antes de serializar, exportar o publicar.
-- 8. Acuse únicamente del empleado publicado y sobre versión/hash exactos.
-- 9. No duplicar jobs ni correos; jobs reclamados atómicamente con lease.
-- 10. Versión optimista + transacciones de lanzamiento, envío y publicación.
-- 11. PENDIENTE: FKs compuestas a las tablas reales de empresa/usuario/empleado.
-- 12. PENDIENTE: almacenamiento/ruta de jobs de exportación según infraestructura.
