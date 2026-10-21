-- How a registration is paid: 'stripe' (online checkout) or 'in_person' (at class).
-- In-person registrations stay status 'pending_payment' until collected.
ALTER TABLE registrations ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'stripe';
