SCHEMA_CONTEXT = """
You are querying a PostgreSQL inventory/warehouse database with these tables:

products
  - id (integer, primary key)
  - name (text)
  - sku (text, unique)
  - quantity_on_hand (integer)
  - reorder_threshold (integer)

suppliers
  - id (integer, primary key)
  - name (text)
  - contact_email (text)

product_suppliers (junction table linking products and suppliers)
  - product_id (integer, references products.id)
  - supplier_id (integer, references suppliers.id)
  - unit_cost (numeric)

shipments (tracks stock movement)
  - id (integer, primary key)
  - product_id (integer, references products.id)
  - quantity (integer)
  - direction (text, either 'in' or 'out')
  - shipped_at (timestamp)
"""