-- Migration von statischen Links aus dem Quellcode in die bestehende Spalte anmeldung_url:
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55355' WHERE kurs_nr = 'KOS.2638.166';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55356' WHERE kurs_nr = 'KOS.2639.169';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55357' WHERE kurs_nr = 'KOS.2645.172';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55358' WHERE kurs_nr = 'KOS.2646.175';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55361' WHERE kurs_nr = 'KOS.2648.178';

UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55362' WHERE kurs_nr = 'KOS.2637.164';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55363' WHERE kurs_nr = 'KOS.2637.165';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55364' WHERE kurs_nr = 'KOS.2638.167';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55365' WHERE kurs_nr = 'KOS.2639.168';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55367' WHERE kurs_nr = 'KOS.2644.170';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55368' WHERE kurs_nr = 'KOS.2644.171';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55370' WHERE kurs_nr = 'KOS.2645.173';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55371' WHERE kurs_nr = 'KOS.2646.174';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55372' WHERE kurs_nr = 'KOS.2647.176';
UPDATE public.training_events SET anmeldung_url = 'https://nlc.info/app/edb/event/55373' WHERE kurs_nr = 'KOS.2647.177';
