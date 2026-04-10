CREATE TABLE IF NOT EXISTS orders (
    order_id     UUID PRIMARY KEY,
    customer_id  VARCHAR(255) NOT NULL,
    order_date   TIMESTAMP NOT NULL,
    order_amount DECIMAL(12, 2) NOT NULL,
    status       VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date  ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);