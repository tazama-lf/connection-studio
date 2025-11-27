-- PostgreSQL Schema for Tazama Data Model

-- Table to store destinations (1 - data_model, 2 - redis_cache, etc.)
CREATE TABLE destination (
    destination_id SERIAL PRIMARY KEY,
    destination_name VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store destination types/collections
CREATE TABLE destination_type (
    destination_type_id SERIAL PRIMARY KEY,
    collection_type VARCHAR(255) NOT NULL, -- 'node' or 'edge'
    name VARCHAR(255) NOT NULL, -- 'transactionDetails' or 'redis'
    description TEXT,
    destination_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (destination_id) REFERENCES destination(destination_id)
);

-- Table to store fields for each collection
CREATE TABLE destination_type_fields (
    field_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    field_type VARCHAR(255),
    parent_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    serial_no INTEGER,
    collection_id INTEGER,
    FOREIGN KEY (collection_id) REFERENCES destination_type(destination_type_id),
    FOREIGN KEY (parent_id) REFERENCES destination_type_fields(field_id)
);

-- Create indexes for better performance
CREATE INDEX idx_destination_tenant ON destination(tenant_id);
CREATE INDEX idx_destination_type_name ON destination_type(name);
CREATE INDEX idx_fields_collection ON destination_type_fields(collection_id);
CREATE INDEX idx_fields_parent ON destination_type_fields(parent_id);
CREATE INDEX idx_fields_active ON destination_type_fields(is_active);

-- ALTER TABLE to drop label column (for existing databases)
ALTER TABLE destination_type_fields DROP COLUMN IF EXISTS label;
ALTER TABLE destination_type DROP COLUMN IF EXISTS label_name;

-- INSERT STATEMENTS

-- Insert destinations
INSERT INTO destination (destination_name, tenant_id) VALUES 
('tazama_data_model', 'default'),
('tazama_redis_cache', 'default');

-- Insert destination types (collections)
INSERT INTO destination_type (collection_type, name, description, destination_id) VALUES 
('node', 'transactionDetails', 'Transaction details for the Tazama internal data model', 1),
('node', 'redis', 'Redis cache/store - Flat key-value mappings for fast lookup and caching', 2);

-- Insert fields for transactionDetails collection (destination_type_id = 1)
INSERT INTO destination_type_fields (name, field_type, serial_no, collection_id) VALUES 
('source', 'string', 1, 1),
('destination', 'string', 2, 1),
('TxTp', 'string', 3, 1),
('TenantId', 'string', 4, 1),
('MsgId', 'string', 5, 1),
('CreDtTm', 'string', 6, 1),
('Amt', 'string', 7, 1),
('Ccy', 'string', 8, 1),
('EndToEndId', 'string', 9, 1),
('lat', 'string', 10, 1),
('long', 'string', 11, 1),
('TxSts', 'string', 12, 1);

-- Insert fields for redis collection (destination_type_id = 2)
INSERT INTO destination_type_fields (name, field_type, serial_no, collection_id) VALUES 
('dbtrId', 'string', 1, 2),
('cdtrId', 'string', 2, 2),
('dbtrAcctId', 'string', 3, 2),
('cdtrAcctId', 'string', 4, 2),
('evtId', 'string', 5, 2),
('creDtTm', 'string', 6, 2),
('instdAmt', 'object', 7, 2),
('intrBkSttlmAmt', 'object', 8, 2),
('xchgRate', 'number', 9, 2);

-- Insert nested fields for object fields
-- For instdAmt (parent_id = 7, which is the serial_no of instdAmt)
INSERT INTO destination_type_fields (name, field_type, serial_no, parent_id, collection_id) VALUES 
('amt', 'number', 10, 7, 2),
('ccy', 'string', 11, 7, 2);

-- For intrBkSttlmAmt (parent_id = 8, which is the serial_no of intrBkSttlmAmt) 
INSERT INTO destination_type_fields (name, field_type, serial_no, parent_id, collection_id) VALUES 
('amt', 'number', 12, 8, 2),
('ccy', 'string', 13, 8, 2);