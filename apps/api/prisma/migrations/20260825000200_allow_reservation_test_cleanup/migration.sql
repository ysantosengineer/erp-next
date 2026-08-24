CREATE OR REPLACE FUNCTION prevent_stock_reservation_delete() RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('erp.allow_stock_reservation_mutation', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Stock reservations are historical and cannot be deleted';
END;
$$ LANGUAGE plpgsql;
