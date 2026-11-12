/**
 * Adres i klucz publiczny (anon) projektu Supabase. To nie są sekrety: klucz anon jest przeznaczony do aplikacji,
 * a dostęp do danych chroni długi klucz gospodarstwa. Puste wartości wyłączają łączenie telefonów.
 */
export const SUPABASE_URL = 'https://edvwvntbbbpjdboboexa.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdnd2bnRiYmJwamRib2JvZXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0NDAzMjAsImV4cCI6MjExMDAxNjMyMH0.W4jtEq73NtM5NbeX1m3DZu7gQh--mldXhl7-yAeKUS8';

export const syncConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
