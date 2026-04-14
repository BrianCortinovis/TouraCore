DROP TABLE IF EXISTS restaurant_order_items CASCADE;
DROP TABLE IF EXISTS restaurant_orders CASCADE;
DROP TABLE IF EXISTS restaurant_tables CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS restaurant_services CASCADE;
DROP FUNCTION IF EXISTS recalculate_restaurant_order_totals() CASCADE;
