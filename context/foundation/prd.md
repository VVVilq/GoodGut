---
project: "GoodGut"
version: 1
status: draft
created: 2026-05-25
context_type: greenfield
product_type: mobile
target_scale:
  users: small
  qps: null
  data_volume: null
timeline_budget:
  mvp_weeks: 5
  hard_deadline: 2026-06-28
  after_hours_only: true
---

## Vision & Problem Statement

Osoba wymagająca specjalnej diety nie potrafi szybko ocenić podczas zakupów, czy konkretny produkt pasuje do jej schorzenia. Przed zakupem musi mozolnie czytać etykiety, interpretować wartości odżywcze na podstawie własnej wiedzy i szukać dodatkowych danych, takich jak indeks glikemiczny, w internecie.

Ogólna ocena produktu, taka jak Nutri-Score, nie wystarcza tej osobie: potrzebuje oceny produktu odniesionej do swojego profilu chorobowego, aby szybciej podjąć decyzję zakupową i lepiej zrozumieć etykietę oraz wartości odżywcze.

## User & Persona

Głównym użytkownikiem MVP jest osoba z profilem chorobowym, która samodzielnie kupuje żywność i musi dopasowywać dietę do swojego schorzenia. Sięga po produkt w sklepie i potrzebuje ocenić go przed włożeniem do koszyka.

Początkowy zakres profili chorobowych obejmuje ograniczoną listę: cukrzycę, celiakię i wrzodziejące zapalenie jelita grubego.

## Success Criteria

### Primary

- Użytkownik z wybranym profilem chorobowym może zeskanować produkt i otrzymać analizę produktu odnoszącą się do tego profilu.
- Użytkownik bez wybranego profilu chorobowego może zeskanować produkt i otrzymać Nutri-Score.

### Secondary

- Użytkownik rozumie, dlaczego produkt został oceniony w określony sposób, dzięki wyjaśnieniu wyniku analizy.

### Guardrails

- Wynik analizy jest przedstawiany jako sugestia i pomoc w ocenie produktu, a nie jako diagnoza ani porada medyczna.
- W przypadku braku danych potrzebnych do analizy aplikacja jasno komunikuje, że nie może wiarygodnie ocenić produktu.

## User Stories

### US-01: Ocena zeskanowanego produktu względem profilu chorobowego

- **Given** użytkownik ma zapisany lokalny profil z wybranym jednym z obsługiwanych schorzeń
- **When** skanuje kod kreskowy produktu podczas zakupów
- **Then** widzi Nutri-Score produktu oraz analizę odnoszącą produkt do wybranego schorzenia wraz z uzasadnieniem wyniku

#### Acceptance Criteria

- Gdy produkt nie ma wystarczających danych do analizy, użytkownik otrzymuje jednoznaczną informację o braku możliwości wiarygodnej oceny.
- Wynik analizy jest opisany jako pomocnicza sugestia, a nie porada medyczna.
- Gdy profil nie zawiera schorzenia, wynik skanowania przedstawia Nutri-Score bez analizy chorobowej.

## Functional Requirements

- FR-001: Użytkownik może utworzyć lokalny profil z nazwą. Priority: must-have
  > Socrates: Kontrargument rozważony: nazwa nie wpływa na analizę i opóźnia pierwszy skan. Rozstrzygnięcie: zachowane; użytkownik chce rozpoznawalnego profilu w MVP.
- FR-002: Użytkownik może wybrać dla profilu jedno schorzenie z listy: cukrzyca, celiakia albo wrzodziejące zapalenie jelita grubego. Priority: must-have
  > Socrates: Kontrargument rozważony: trzy schorzenia wymagają większej liczby wiarygodnych reguł już w pierwszej wersji. Rozstrzygnięcie: zachowane; użytkownik zaakceptował szerszy zakres MVP.
- FR-003: Użytkownik może zapisać profil bez wybranego schorzenia. Priority: must-have
  > Socrates: Kontrargument rozważony: profil bez schorzenia nie realizuje głównej wartości analizy profilowej. Rozstrzygnięcie: zachowane; tryb samego Nutri-Score pozostaje częścią MVP.
- FR-004: Użytkownik może zeskanować kod kreskowy produktu telefonem. Priority: must-have
  > Socrates: Kontrargument rozważony: brak rozpoznanego produktu po kodzie może blokować cały przepływ. Rozstrzygnięcie: zachowane; skan jest wejściem do oceny podczas zakupów.
- FR-005: Użytkownik może zobaczyć Nutri-Score rozpoznanego produktu. Priority: must-have
  > Socrates: Kontrargument rozważony: ogólny Nutri-Score może mylić, gdy różni się od oceny dla schorzenia. Rozstrzygnięcie: zachowane; ma stanowić kontekst obok analizy profilowej.
- FR-006: Użytkownik z wybranym schorzeniem może zobaczyć analizę produktu względem tego schorzenia. Priority: must-have
  > Socrates: Kontrargument rozważony: ocena dla trzech schorzeń jest ryzykowna bez jasno ograniczonych reguł. Rozstrzygnięcie: zachowane; jest główną wartością produktu.
- FR-007: Użytkownik może zobaczyć uzasadnienie wyniku analizy. Priority: must-have
  > Socrates: Kontrargument rozważony: uzasadnienie wymaga komunikowania niepewności danych i reguł. Rozstrzygnięcie: zachowane; użytkownik potrzebuje rozumieć wynik.
- FR-008: Użytkownik otrzymuje jasną informację, gdy danych produktu nie wystarcza do wiarygodnej analizy. Priority: must-have
  > Socrates: Kontrargument rozważony: częste braki danych mogą ograniczyć dowód wartości MVP. Rozstrzygnięcie: zachowane; komunikowanie braków jest konieczne dla wiarygodności.
- FR-009: Użytkownik widzi informację, że analiza ma charakter pomocniczy i nie stanowi porady medycznej. Priority: must-have
  > Socrates: Kontrargument rozważony: sam komunikat nie wystarczy, jeżeli prezentacja wyniku będzie brzmiała jak zalecenie zdrowotne. Rozstrzygnięcie: zachowane; jest wymaganą granicą MVP.

## Non-Functional Requirements

- Aplikacja jest używalna na urządzeniach z Androidem w zakresie przepływu MVP; obsługa iOS nie jest wymagana dla pierwszej wersji.
- Wynik jest przedstawiany jako sugestia pomocnicza, a nie diagnoza ani porada medyczna.
- Dla każdego obsługiwanego profilu chorobowego brak wystarczających danych produktu skutkuje jednoznacznym wynikiem `brak wiarygodnej oceny`, a nie oceną sugerującą przydatność produktu.
- Czas uzyskania wyniku nie ma jeszcze ustalonego mierzalnego limitu.

# TODO: mierzalny limit czasu uzyskania wyniku — see Open Questions

## Business Logic

Aplikacja ocenia zeskanowany produkt według wybranego profilu chorobowego: dla cukrzycy obniża ocenę `1-100` przy dużej ilości cukru albo wysokiej ilości węglowodanów i niskiej zawartości błonnika; dla celiakii oznacza jako `unikać` produkt zawierający gluten lub składnik wskazujący na jego obecność; dla WZJG pokazuje dwie oceny `1-100`, osobno dla zaostrzenia i remisji.

Dla profilu cukrzycowego wejściem do oceny są dostępne informacje o cukrze, węglowodanach i błonniku w produkcie. Wynikiem jest ocena w skali `1-100` wraz z wyjaśnieniem wpływu tych informacji na ocenę.

Dla profilu celiakii wejściem jest dostępna informacja o obecności glutenu albo składników wskazujących na jego obecność. Wynik jest kategoryczny; produkt spełniający ten warunek otrzymuje wynik `unikać`.

Dla profilu WZJG użytkownik nie zapisuje fazy choroby w profilu. Wynik przedstawia dwie odrębne oceny w skali `1-100`: dla zaostrzenia oraz dla remisji. Dla każdego profilu, jeżeli dostępne dane produktu nie wystarczają do wiarygodnej analizy, aplikacja pokazuje wynik `brak wiarygodnej oceny`.

## Access Control

Jeden użytkownik; brak logowania; profil chorobowy jest zapisany lokalnie na urządzeniu użytkownika. W MVP nie występują dodatkowe role ani zarządzanie cudzym profilem.

## Non-Goals

- Brak obsługi iOS w MVP; obowiązkowym zakresem urządzeń jest Android.
- Brak awatara i rozbudowanej personalizacji profilu; profil zawiera nazwę oraz opcjonalny wybór schorzenia.
- Brak indywidualnej listy składników lub produktów szkodzących użytkownikowi; analiza opiera się na wybranym profilu chorobowym.
- Brak zapisywania fazy WZJG w profilu; wynik przedstawia osobno ocenę dla zaostrzenia i remisji.
- Brak diagnozowania, leczenia oraz udzielania indywidualnej porady medycznej; analiza ma charakter pomocniczej sugestii.
- Brak historii skanów i zapisywania wcześniejszych ocen produktów; MVP obejmuje bieżący wynik skanowania.

## Open Questions

1. Przy znacznie większej liczbie użytkowników aplikacja wymagałaby dostępu do danych produktów bez restrykcyjnych ograniczeń użycia; wybór i ograniczenia źródła danych nie są jeszcze rozstrzygnięte.
2. Czas uzyskania wyniku nie ma jeszcze ustalonego mierzalnego limitu.
