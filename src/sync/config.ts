/**
 * Adres i klucz publiczny (anon) projektu Supabase. To nie są sekrety: klucz anon jest przeznaczony do aplikacji,
 * a dostęp do danych chroni długi klucz gospodarstwa. Puste wartości wyłączają łączenie telefonów.
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

export const syncConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
