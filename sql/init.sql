CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    reorder_threshold INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact_email TEXT
);

CREATE TABLE product_suppliers (
    product_id INTEGER NOT NULL REFERENCES products(id),
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    unit_cost NUMERIC(10, 2) NOT NULL,
    PRIMARY KEY (product_id, supplier_id)
);

CREATE TABLE shipments (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    shipped_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO products (name, sku, quantity_on_hand, reorder_threshold) VALUES
    ('Steel Bolt M6', 'BLT-M6-001', 500, 100),
    ('Cardboard Box Medium', 'BOX-MED-002', 200, 50),
    ('Packing Tape Roll', 'TAPE-001', 30, 40);

INSERT INTO suppliers (name, contact_email) VALUES
    ('Acme Fasteners', 'sales@acmefasteners.com'),
    ('BoxCo Supplies', 'orders@boxco.com');

INSERT INTO product_suppliers (product_id, supplier_id, unit_cost) VALUES
    (1, 1, 0.05),
    (2, 2, 0.75),
    (3, 2, 3.20);

INSERT INTO shipments (product_id, quantity, direction, shipped_at) VALUES
    (1, 500, 'in', NOW() - INTERVAL '10 days'),
    (2, 200, 'in', NOW() - INTERVAL '8 days'),
    (3, 100, 'in', NOW() - INTERVAL '8 days'),
    (3, 70, 'out', NOW() - INTERVAL '2 days');