alter table public.game_settings
  alter column questionspergame set default 8;

update public.game_settings
set questionspergame = 8;
