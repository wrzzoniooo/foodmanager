# Wspólna baza (Supabase)

Dwa telefony łączą się kluczem z kodu QR, bez kont i e-maili. Dane leżą w jednej tabeli, a dostęp do niej jest tylko przez dwie funkcje (`sp_push`, `sp_pull`) i długi klucz gospodarstwa. Klucza nie przechowujemy, tylko jego skrót (sha256).

## Konfiguracja (jednorazowo)

1. Załóż konto na supabase.com i utwórz projekt (np. nazwa `spizarnia`, region najbliższy, np. Frankfurt).
2. W projekcie: **SQL Editor, New query**, wklej całą zawartość pliku `schema.sql` i kliknij **Run**. Powinno wyjść "Success".
3. W **Project Settings, API** skopiuj **Project URL** i klucz **anon public** (albo "publishable"). To klucze publiczne, nie hasła.
4. Wpisz je w `src/sync/config.ts` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) i wypchnij zmianę. Wtedy w Ustawieniach pojawia się sekcja **Połączenie**.

## Jak to działa

- Telefon wysyła tylko zmienione rzeczy (zapasy, lista, zdarzenia, własne produkty, nawyki) i co 5 sekund, gdy aplikacja jest na wierzchu, pyta o zmiany z drugiego telefonu.
- Przy jednoczesnej zmianie tego samego wiersza wygrywa nowszy.
- Klucz zmienia się przez rozłączenie i ponowne parowanie.
