-- Add email_contact to suppliers table
alter table suppliers add column if not exists email_contact text;
create index if not exists idx_suppliers_email_contact on suppliers(email_contact);
