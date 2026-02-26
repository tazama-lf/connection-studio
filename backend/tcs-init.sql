\connect configuration;

CREATE TABLE destination (
    destination_id SERIAL PRIMARY KEY,
    destination_name VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE destination_type (
    destination_type_id SERIAL PRIMARY KEY,
    collection_type VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    destination_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tenant_id VARCHAR(50),
    CONSTRAINT destination_type_destination_id_fkey 
        FOREIGN KEY (destination_id) REFERENCES destination(destination_id)
);

CREATE TABLE destination_type_fields (
    field_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    field_type VARCHAR(255),
    parent_id INTEGER,
    serial_no INTEGER,
    collection_id INTEGER,
    tenant_id VARCHAR(50),
    CONSTRAINT destination_type_fields_collection_id_fkey 
        FOREIGN KEY (collection_id) REFERENCES destination_type(destination_type_id),
    CONSTRAINT destination_type_fields_parent_id_fkey 
        FOREIGN KEY (parent_id) REFERENCES destination_type_fields(field_id)
);

INSERT INTO destination (destination_id, destination_name, created_at, updated_at) VALUES
(1, 'tazama_data_model', '2025-11-26 15:50:35.886911', '2025-11-26 15:50:35.886911'),
(2, 'tazama_redis_cache', '2025-11-26 15:50:35.886911', '2025-11-26 15:50:35.886911');

INSERT INTO destination_type (destination_type_id, collection_type, name, destination_id, created_at, updated_at, tenant_id) VALUES
(1, 'node', 'transactionDetails', 1, '2025-11-26 15:50:35.886911', '2025-11-26 15:50:35.886911', 'default'),
(2, 'node', 'redis', 2, '2025-11-26 15:50:35.886911', '2025-11-26 15:50:35.886911', 'default');

INSERT INTO destination_type_fields (field_id, name, field_type, parent_id, serial_no, collection_id, tenant_id) VALUES
(1, 'source', 'string', NULL, 1, 1, 'default'),
(2, 'destination', 'string', NULL, 2, 1, 'default'),
(3, 'TxTp', 'string', NULL, 3, 1, 'default'),
(4, 'TenantId', 'string', NULL, 4, 1, 'default'),
(5, 'MsgId', 'string', NULL, 5, 1, 'default'),
(6, 'CreDtTm', 'string', NULL, 6, 1, 'default'),
(7, 'Amt', 'number', NULL, 7, 1, 'default'),
(8, 'Ccy', 'string', NULL, 8, 1, 'default'),
(9, 'EndToEndId', 'string', NULL, 9, 1, 'default'),
(10, 'lat', 'string', NULL, 10, 1, 'default'),
(11, 'long', 'string', NULL, 11, 1, 'default'),
(12, 'TxSts', 'string', NULL, 12, 1, 'default'),
(13, 'dbtrId', 'string', NULL, 1, 2, 'default'),
(14, 'cdtrId', 'string', NULL, 2, 2, 'default'),
(15, 'dbtrAcctId', 'string', NULL, 3, 2, 'default'),
(16, 'cdtrAcctId', 'string', NULL, 4, 2, 'default'),
(17, 'evtId', 'string', NULL, 5, 2, 'default'),
(18, 'creDtTm', 'string', NULL, 6, 2, 'default'),
(19, 'instdAmt', 'object', NULL, 7, 2, 'default'),
(20, 'intrBkSttlmAmt', 'object', NULL, 8, 2, 'default'),
(21, 'xchgRate', 'number', NULL, 9, 2, 'default'),
(22, 'amt', 'number', 7, 10, 2, 'default'),
(23, 'ccy', 'string', 7, 11, 2, 'default'),
(24, 'amt', 'number', 8, 12, 2, 'default'),
(25, 'ccy', 'string', 8, 13, 2, 'default');

CREATE TABLE config (
    id SERIAL PRIMARY KEY,
    msg_fam VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(255) NOT NULL,
    endpoint_path VARCHAR(255) NOT NULL,
    version VARCHAR(255) NOT NULL DEFAULT 'v1',
    content_type VARCHAR(255) NOT NULL DEFAULT 'application/json',
    schema JSONB NOT NULL,
    mapping JSONB,
    tenant_id VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(255) NOT NULL DEFAULT 'inprogress',
    functions JSONB,
    publishing_status VARCHAR(8) DEFAULT 'active',
    comments TEXT
);

CREATE TABLE IF NOT EXISTS tcs_cron_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    tenant_id VARCHAR(100) NOT NULL, 
    name VARCHAR(255) NOT NULL, 
    cron VARCHAR(255) NOT NULL, 
    iterations INTEGER NOT NULL, 
    status VARCHAR(50) NOT NULL DEFAULT 'STATUS_01_IN_PROGRESS' CHECK (status IN ('STATUS_01_IN_PROGRESS','STATUS_02_ON_HOLD','STATUS_03_UNDER_REVIEW','STATUS_04_APPROVED','STATUS_05_REJECTED','STATUS_06_EXPORTED','STATUS_07_READY_FOR_DEPLOYMENT','STATUS_08_DEPLOYED')), 
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), 
    comments TEXT, 
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(), 
    CONSTRAINT cron_jobs_name_tenant_unique UNIQUE (name, tenant_id)
);

CREATE TABLE tcs_pull_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(100) NOT NULL,
    endpoint_name character varying(255) NOT NULL,
    schedule_id uuid NOT NULL,
    source_type character varying(50) NOT NULL,
    description text NOT NULL,
    connection jsonb NOT NULL,
    file jsonb,
    table_name character varying(255) NOT NULL,
    mode character varying(50) DEFAULT 'append'::character varying NOT NULL,
    version character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'STATUS_01_IN_PROGRESS'::character varying NOT NULL,
    publishing_status character varying(20) DEFAULT 'in-active'::character varying NOT NULL,
    comments text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT tcs_pull_jobs_pkey PRIMARY KEY (id),
    CONSTRAINT unique_tenant_endpoint_version UNIQUE (tenant_id, endpoint_name, version),
    CONSTRAINT tcs_pull_jobs_mode_check CHECK (mode IN ('append', 'replace')),
    CONSTRAINT tcs_pull_jobs_publishing_status_check CHECK (publishing_status IN ('active', 'in-active')),
    CONSTRAINT tcs_pull_jobs_source_type_check CHECK (source_type IN ('HTTP', 'SFTP')),
    CONSTRAINT tcs_pull_jobs_status_check CHECK (status IN ('STATUS_01_IN_PROGRESS', 'STATUS_02_ON_HOLD', 'STATUS_03_UNDER_REVIEW', 'STATUS_04_APPROVED', 'STATUS_05_REJECTED', 'STATUS_06_EXPORTED', 'STATUS_07_READY_FOR_DEPLOYMENT', 'STATUS_08_DEPLOYED')),
    CONSTRAINT tcs_pull_jobs_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.tcs_cron_jobs(id) ON DELETE CASCADE
);

CREATE TABLE tcs_push_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(100) NOT NULL,
    endpoint_name character varying(255) NOT NULL,
    path character varying(255) NOT NULL,
    mode character varying(50) NOT NULL,
    table_name character varying(255) NOT NULL,
    description text,
    version character varying(50) DEFAULT 'v1'::character varying NOT NULL,
    status character varying(50) DEFAULT 'STATUS_01_IN_PROGRESS'::character varying NOT NULL,
    publishing_status character varying(20) DEFAULT 'in-active'::character varying NOT NULL,
    comments text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT tcs_push_jobs_pkey PRIMARY KEY (id),
    CONSTRAINT unique_push_job_version UNIQUE (tenant_id, path, version),
    CONSTRAINT tcs_push_jobs_publishing_status_check CHECK (publishing_status IN ('active', 'in-active')),
    CONSTRAINT tcs_push_jobs_status_check CHECK (status IN ('STATUS_01_IN_PROGRESS', 'STATUS_02_ON_HOLD', 'STATUS_03_UNDER_REVIEW', 'STATUS_04_APPROVED', 'STATUS_05_REJECTED', 'STATUS_06_EXPORTED', 'STATUS_07_READY_FOR_DEPLOYMENT', 'STATUS_08_DEPLOYED'))
);

CREATE TABLE IF NOT EXISTS job_history ( 
    id SERIAL PRIMARY KEY, 
    tenant_id TEXT NOT NULL, 
    job_id UUID NOT NULL, 
    counts INTEGER, 
    processed_counts INTEGER, 
    exception TEXT, 
    job_type TEXT, 
    created_at TIMESTAMP DEFAULT NOW() 
);

CREATE OR REPLACE PROCEDURE rotate_table_with_data(
    original_table TEXT,
    rows_json JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    ts TEXT;
    new_table TEXT;
    backup_table TEXT;
BEGIN
    -- timestamp suffix: 20251127_183015
    ts := to_char(NOW(), 'YYYYMMDD_HH24MISS');

    new_table := original_table || '_' || ts;
    backup_table := original_table || '_backup_' || ts;

    EXECUTE format(
        'CREATE TABLE %I (LIKE %I INCLUDING ALL)', 
        new_table, original_table
    );

    EXECUTE format(
        'INSERT INTO %I (data, job_id, checksum)
         SELECT  data, job_id, checksum
         FROM jsonb_to_recordset($1) AS x(
             data JSONB,
             job_id TEXT,
             checksum TEXT,
			 created_at TIMESTAMP
         )',
        new_table
    ) USING rows_json;

    EXECUTE format('ALTER TABLE %I RENAME TO %I', original_table, backup_table);

    EXECUTE format('ALTER TABLE %I RENAME TO %I', new_table, original_table);
END;
$$;