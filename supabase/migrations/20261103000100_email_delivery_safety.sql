begin;

create index notification_outbox_delivery_safety_idx
  on public.notification_outbox (lower(recipient_email), created_at, next_attempt_at, id)
  where status = 'pending' and recipient_email is not null;

create function public.claim_notification_jobs_for_delivery(
  p_limit integer default 10,
  p_lease_seconds integer default 90,
  p_allowed_recipient_emails text[] default null,
  p_created_at_not_before timestamptz default null
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed_recipient_emails text[];
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'notification_worker_required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception using errcode = '22023', message = 'invalid_notification_batch_limit';
  end if;

  if p_lease_seconds is null or p_lease_seconds < 15 or p_lease_seconds > 900 then
    raise exception using errcode = '22023', message = 'invalid_notification_lease';
  end if;

  if p_created_at_not_before is null then
    raise exception using errcode = '22023', message = 'email_delivery_cutoff_required';
  end if;

  if p_allowed_recipient_emails is null
    or cardinality(p_allowed_recipient_emails) < 1
    or cardinality(p_allowed_recipient_emails) > 100
    or exists (
      select 1
      from unnest(p_allowed_recipient_emails) as allowed(email)
      where nullif(trim(allowed.email), '') is null
        or length(trim(allowed.email)) > 320
        or position('@' in trim(allowed.email)) <= 1
    ) then
    raise exception using errcode = '22023', message = 'invalid_email_recipient_allowlist';
  end if;

  select array_agg(distinct lower(trim(allowed.email)))
  into v_allowed_recipient_emails
  from unnest(p_allowed_recipient_emails) as allowed(email);

  update public.notification_outbox
  set
    status = 'failed',
    processed_at = statement_timestamp(),
    last_error = 'lease_expired_after_max_attempts',
    lease_token = null,
    lease_expires_at = null,
    locked_at = null
  where status = 'processing'
    and lease_expires_at <= statement_timestamp()
    and attempts >= max_attempts
    and created_at >= p_created_at_not_before
    and lower(recipient_email) = any(v_allowed_recipient_emails);

  update public.notification_outbox as outbox
  set
    status = 'cancelled',
    processed_at = statement_timestamp(),
    last_error = 'event_no_longer_current',
    lease_token = null,
    lease_expires_at = null,
    locked_at = null
  where outbox.event_type = 'payment_overdue'
    and outbox.created_at >= p_created_at_not_before
    and lower(outbox.recipient_email) = any(v_allowed_recipient_emails)
    and (
      outbox.status = 'pending'
      or (
        outbox.status = 'processing'
        and outbox.lease_expires_at <= statement_timestamp()
      )
    )
    and not exists (
      select 1
      from public.applications as application
      where application.id = outbox.application_id
        and application.status = 'payment'
        and application.payment_due_at < statement_timestamp()
        and application.manager_id = outbox.recipient_user_id
    );

  return query
  with candidates as (
    select outbox.id
    from public.notification_outbox as outbox
    where outbox.recipient_email is not null
      and lower(outbox.recipient_email) = any(v_allowed_recipient_emails)
      and outbox.created_at >= p_created_at_not_before
      and outbox.attempts < outbox.max_attempts
      and (
        (
          outbox.status = 'pending'
          and outbox.next_attempt_at <= statement_timestamp()
        )
        or (
          outbox.status = 'processing'
          and outbox.lease_expires_at <= statement_timestamp()
        )
      )
    order by outbox.next_attempt_at, outbox.created_at, outbox.id
    for update skip locked
    limit p_limit
  )
  update public.notification_outbox as outbox
  set
    status = 'processing',
    attempts = outbox.attempts + 1,
    locked_at = statement_timestamp(),
    lease_expires_at = statement_timestamp() + make_interval(secs => p_lease_seconds),
    lease_token = gen_random_uuid(),
    last_attempt_at = statement_timestamp(),
    last_error = null
  from candidates
  where outbox.id = candidates.id
  returning outbox.*;
end;
$$;

comment on function public.claim_notification_jobs_for_delivery(
  integer, integer, text[], timestamptz
) is
  'Claims only explicitly allowlisted notification recipients created on or after the external-delivery cutoff.';

revoke execute on function public.claim_notification_jobs_for_delivery(
  integer, integer, text[], timestamptz
) from public, anon, authenticated;

grant execute on function public.claim_notification_jobs_for_delivery(
  integer, integer, text[], timestamptz
) to service_role;

commit;
