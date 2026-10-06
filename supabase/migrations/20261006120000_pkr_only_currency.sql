-- ---------------------------------------------------------------------------
-- PKR only.
--
-- The store prices in Pakistani rupees and in nothing else. Until now the
-- currency was configurable (`site.currency.default`) and every product carried
-- whatever three-letter code it had been priced in, so the same catalogue could
-- hold USD, GBP and PKR prices side by side with no conversion anywhere and no
-- exchange rate to keep them comparable.
--
-- This migration removes the setting and makes the database itself refuse any
-- code but PKR, which is the layer that holds even if the application is
-- bypassed — a psql session, a future import script, a restored dump.
--
-- Order of operations matters, and the two reasons are different:
--
--   1. Dropping a stale setting is a plain delete.
--   2. Narrowing a CHECK constraint can fail on existing rows, so the rows are
--      examined first and the migration refuses to guess. Repricing a stored
--      amount by relabelling its currency is not a migration: PKR 4,500.00 and
--      USD 45.00 are the same characters with a ~280x difference in meaning, and
--      only the owner knows which was intended. A failure here is the correct
--      outcome — it names the rows and asks a human.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Retire the `site.currency` setting.
--
-- The document is deleted rather than set to PKR: defaults live in code (see
-- `src/lib/site-content.ts`), so removing the override IS the new value, and
-- there is no second copy to drift. Leaving a row behind would also leave a
-- settings screen with a currency picker that does nothing.
-- ---------------------------------------------------------------------------
delete from public.site_content where key = 'site.currency';

-- ---------------------------------------------------------------------------
-- 2. Refuse to narrow the constraints over data that cannot be reconciled.
--
-- Written as a guard rather than an UPDATE so nothing is silently rewritten.
-- `raise exception` aborts the transaction, which is what makes the CHECK
-- constraints below safe to add: the migration can never install them over rows
-- it has quietly relabelled.
--
-- `products` is checked too even though it is not order history: a price is a
-- price, and relabelling it in place is the same silent repricing.
-- ---------------------------------------------------------------------------
do $$
declare
  offenders text;
begin
  select string_agg(format, ', ' order by format)
    into offenders
  from (
    select format('products(%s: %s %s)', slug, currency, price_minor) as format
      from public.products
     where currency is not null and currency <> 'PKR'
    union all
    select format('orders(%s: %s)', order_token, currency)
      from public.orders
     where currency <> 'PKR'
    union all
    select format('order_items(%s: %s)', id, currency)
      from public.order_items
     where currency <> 'PKR'
  ) as rows;

  if offenders is not null then
    raise exception
      'Cannot restrict the currency to PKR: rows still hold another code: %. '
      'Convert or clear them deliberately, then re-run this migration. '
      'Nothing has been changed.',
      offenders;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Narrow the three CHECK constraints.
--
-- The old `*_currency_format` constraints only asserted the *shape* of a
-- currency code (`^[A-Z]{3}$`), which is why a `PKA` typo or a deliberate `USD`
-- could both be stored. They are replaced rather than supplemented: keeping a
-- weaker format check alongside a PKR check would be two rules for one column.
--
-- `orders` and `order_items` are NOT NULL, so their checks need no null arm.
-- `products.currency` is nullable because an unpriced set has no currency at
-- all, and `products_price_pair` already ties that null to a null price.
-- ---------------------------------------------------------------------------
alter table public.products
  drop constraint products_currency_format;
alter table public.products
  add constraint products_currency_pkr check (currency is null or currency = 'PKR');

alter table public.orders
  drop constraint orders_currency_format;
alter table public.orders
  add constraint orders_currency_pkr check (currency = 'PKR');

alter table public.order_items
  drop constraint order_items_currency_format;
alter table public.order_items
  add constraint order_items_currency_pkr check (currency = 'PKR');
