CREATE OR REPLACE FUNCTION prevent_financial_settlement_mutation()
RETURNS trigger AS $$
BEGIN
  IF current_setting('erp.allow_financial_settlement_mutation', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'FinancialSettlement is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "FinancialSettlement_immutable"
BEFORE UPDATE OR DELETE ON "FinancialSettlement"
FOR EACH ROW EXECUTE FUNCTION prevent_financial_settlement_mutation();
