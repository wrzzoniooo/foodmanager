# Spiżarnia

Wspólna aplikacja (PWA) do zarządzania produktami w domu: lodówka, szafki, siatki z zakupów, lista zakupów z sugestiami i promocje Lidla.

## Etap 1 (obecny): szkielet z danymi przykładowymi

Działa bez backendu. Dane trzymane są lokalnie w przeglądarce (`localStorage`) i można je przywrócić przyciskiem na dole ekranu Lodówka.

- **Lodówka / Szafki:** kategorie, zmiana ilości, kolor terminu ważności, dodawanie z katalogu.
- **Siatki:** produkty z zakupów czekają na rozpakowanie (do lodówki lub szafki).
- **Lista zakupów:** wyszukiwarka katalogu, odhaczanie, "Zakończ zakupy" przenosi do siatek, sekcja "Może brakuje?" z sugestiami na bazie zużycia (z powodem przy każdej).
- **Promocje:** Dziś / Wkrótce / Z mojej listy, dopasowane do Waszej listy i często kupowanych produktów.

## Etap 2: dane z Lidla

`npm run import` pobiera publiczne strony ofert spożywczych lidl.pl (zgodnie z `robots.txt`, kilka zapytań, uczciwy User-Agent) i zapisuje `public/data/lidl.json`: katalog produktów (nazwa, marka, kategoria, oryginalne zdjęcie z Lidla) i bieżące promocje (cena, cena przed obniżką, daty ważności). Katalog narasta z każdym uruchomieniem, promocje są zawsze z bieżącej oferty. Aplikacja wczytuje ten plik i trzyma kopię w telefonie na wypadek braku sieci.

**Dodawanie produktów (plus w Lodówce i Szafkach):** wyszukiwarka katalogu, skaner kodu kreskowego na cały ekran (wbudowany BarcodeDetector albo biblioteka ZXing, działa też na iPhonie; aparat wymaga HTTPS: `npm run dev:phone` -> https://<IP>:5174), wpisanie kodu ręcznie (Open Food Facts, `api/v2/product/<kod>`) oraz własny produkt ze zdjęciem z aparatu (zmniejszane do miniatury i trzymane w telefonie). Produkty trafiają do katalogu na stałe (`off-<kod>`, `own-<id>`).

**Ograniczenie:** Lidl nie udostępnia pełnego asortymentu. Z publicznych stron wychodzi ok. 15 produktów spożywczych na uruchomienie (reszta listy ładuje się zapytaniami, których `robots.txt` zabrania). Gazetki spożywcze są obrazkami bez danych produktów. Pełniejszy katalog wymaga dodatkowych źródeł (patrz plan niżej).

## Uruchomienie

```bash
npm install
npm run dev
```

Na telefonie w tej samej sieci Wi-Fi otwórz adres z konsoli (np. `http://192.168.0.36:5173`).
Instalacja jako aplikacja wymaga HTTPS, więc pojawi się dopiero po wdrożeniu (etap 3).

```bash
npm run build     # sprawdzenie typów + build produkcyjny z service workerem
npm run icons     # regeneracja ikon PWA z public/icon.svg
```

## Etap 3a: hosting z HTTPS (GitHub Pages)

Wdrożenie robi `.github/workflows/deploy.yml`: po każdym wypchnięciu na gałąź `main` buduje aplikację i publikuje ją pod `https://<login>.github.io/<nazwa-repozytorium>/`. Podścieżkę ustawia zmienna `BASE_PATH` (lokalnie jest `/`). Jednorazowo w repozytorium: Settings → Pages → Source: **GitHub Actions**.

Lokalny test wersji produkcyjnej pod podścieżką (PowerShell): `$env:BASE_PATH='/spizarnia/'; npm run build; npx vite preview`.

## Plan dalszych etapów

2. Automatyczny import oferty Lidla (ceny, daty, oryginalne zdjęcia) i katalog z Open Food Facts.
3. Supabase: logowanie linkiem e-mail, wspólne gospodarstwo domowe, synchronizacja, hosting z HTTPS.
4. Sugestie na prawdziwych danych zużycia.
5. Offline, powiadomienia o terminach ważności, szlify.

## Styl

Jasny: krem (`#F1E8D6`) i szałwiowa zieleń. Kolor główny przycisków jest odrobinę ciemniejszy niż na makiecie (`#667A47`), żeby biały tekst spełniał kontrast WCAG AA.
