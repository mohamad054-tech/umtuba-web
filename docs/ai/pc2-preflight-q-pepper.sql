select
  (current_setting('app.settings.comms_identity_pepper', true) is not null
   and btrim(current_setting('app.settings.comms_identity_pepper', true)) <> '') as pepper_is_set;
