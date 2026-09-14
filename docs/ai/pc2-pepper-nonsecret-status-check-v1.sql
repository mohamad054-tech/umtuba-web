-- PREPARED ONLY. Do not run unless a later GO says so.
-- Returns SET or UNSET only. Never select the raw GUC.
select
  case
    when current_setting('app.settings.comms_identity_pepper', true) is not null
     and btrim(current_setting('app.settings.comms_identity_pepper', true)) <> ''
    then 'SET'
    else 'UNSET'
  end as pepper_status;
