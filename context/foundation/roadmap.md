---
project: GoodGut
version: 1
status: draft
created: 2026-06-23
updated: 2026-08-17
prd_version: 1
main_goal: speed
top_blocker: external
---

# Roadmap: GoodGut

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

GoodGut pomaga osobie wymagającej specjalnej diety szybciej ocenić w sklepie, czy konkretny produkt pasuje do jej schorzenia. Sama ogólna ocena produktu nie wystarcza; użytkownik potrzebuje wyniku odniesionego do lokalnego profilu chorobowego, wraz z jasnym wyjaśnieniem i informacją, gdy danych brakuje. Zakres MVP jest Android-first, bez logowania, historii skanów i porad medycznych.

## North star

**S-03: użytkownik z profilem chorobowym widzi analizę zeskanowanego produktu z uzasadnieniem** — to najkrótszy przepływ, który sprawdza główną wartość GoodGut: ocenę produktu względem wybranego schorzenia, a nie tylko ogólny wynik.

> North star oznacza tutaj najmniejszy przepływ od początku do końca, którego udane działanie pokazuje, że produkt ma sens; dlatego jest ustawiony tak wcześnie, jak pozwalają zależności.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | minimal-product-data-contract | (foundation) minimalny kontrakt danych produktu i mały zestaw testowych produktów są ustalone | — | FR-004, FR-005, FR-008 | done |
| F-02 | analysis-rule-guardrails | (foundation) reguły analizy i komunikaty bezpieczeństwa są ograniczone do MVP | F-01 | FR-006, FR-007, FR-008, FR-009 | proposed |
| S-01 | local-health-profile | użytkownik może utworzyć lokalny profil z nazwą i opcjonalnym schorzeniem | — | FR-001, FR-002, FR-003 | ready |
| S-02 | scan-product-nutri-score | użytkownik bez schorzenia może zeskanować produkt i zobaczyć Nutri-Score albo brak danych | F-01 | FR-004, FR-005, FR-008 | proposed |
| S-03 | profile-based-product-analysis | użytkownik z profilem chorobowym może zeskanować produkt i zobaczyć analizę z uzasadnieniem | F-02, S-01, S-02 | US-01, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009 | proposed |
| S-04 | safety-and-missing-data-copy | użytkownik widzi jasne granice sugestii i stan braku wiarygodnej oceny w całym przepływie | S-03 | US-01, FR-008, FR-009 | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Dane i skan | `F-01` -> `S-02` -> `S-03` -> `S-04` | Najkrótsza ścieżka do wyniku skanowania, ograniczona przez ryzyko danych. |
| B | Profil lokalny | `S-01` | Równoległy lokalny przepływ, który dołącza do Stream A przy `S-03`. |
| C | Reguły analizy | `F-02` | Minimalne reguły i granice komunikacji potrzebne przed analizą chorobową. |

## Baseline

What's already in place in the codebase as of `2026-06-23` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — mobile client scaffold exists in `apps/mobile` with app metadata, scripts, routing shell, lint config, and starter UI.
- **Backend / API:** partial — API service exists in `services/api`; `/health` endpoint and tests are present, but product lookup and analysis endpoints are absent.
- **Data:** absent — no database driver, product dataset, schema, migrations, imported records, or external product-data adapter exists.
- **Auth:** absent — intentionally out of scope; PRD states one local user, no login, local profile on device.
- **Deploy / infra:** partial — Railway is selected and documented; no Railway config, CI workflow, container file, or deployed service config exists in repo.
- **Observability:** absent — no application health beyond `/health`, metrics, structured logging, error tracking, or dashboards.

## Foundations

### F-01: Minimalny kontrakt danych produktu

- **Outcome:** (foundation) minimalny kontrakt danych produktu, mały zestaw testowych produktów i decyzja "bez pełnego importu datasetu w MVP" są gotowe do użycia przez pierwszy skan.
- **Change ID:** minimal-product-data-contract
- **PRD refs:** FR-004, FR-005, FR-008
- **Unlocks:** S-02, S-03; redukuje pytanie o koszt pełnego importu danych produktu.
- **Prerequisites:** —
- **Parallel with:** S-01
- **Blockers:** zewnętrzne źródło danych produktu i jego ograniczenia użycia.
- **Unknowns:**
  - Jaki najmniejszy zestaw pól produktu wystarcza dla Nutri-Score, cukrzycy, celiakii i WZJG bez pełnego importu datasetu? — Owner: user. Block: no.
  - Czy MVP używa małego zestawu kontrolowanych produktów zamiast pełnej bazy na serwerze? — Owner: user. Block: no.
- **Risk:** Pełny dataset może być za drogi; mały kontrakt danych pozwala planować skan bez zakładania kosztownej infrastruktury.
- **Status:** done

### F-02: Minimalne reguły analizy i granice bezpieczeństwa

- **Outcome:** (foundation) reguły dla trzech schorzeń i format komunikatu "to sugestia, nie porada medyczna" są ograniczone do zakresu MVP.
- **Change ID:** analysis-rule-guardrails
- **PRD refs:** FR-006, FR-007, FR-008, FR-009
- **Unlocks:** S-03, S-04; daje weryfikowalną ścieżkę dla analizy chorobowej.
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jakie dokładnie progi lub warunki wystarczą do pierwszej wersji analizy dla cukrzycy, celiakii i WZJG? — Owner: user. Block: no.
- **Risk:** Zbyt szerokie reguły mogą zabrzmieć jak porada medyczna; etap zawęża analizę przed pokazaniem jej użytkownikowi.
- **Status:** proposed

## Slices

### S-01: Lokalny profil zdrowotny

- **Outcome:** użytkownik może utworzyć lokalny profil z nazwą i wybrać jedno schorzenie albo zostawić profil bez schorzenia.
- **Change ID:** local-health-profile
- **PRD refs:** FR-001, FR-002, FR-003
- **Prerequisites:** —
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Profil jest konieczny dla analizy chorobowej, ale sam nie dowodzi wartości produktu; dlatego może iść równolegle z kontraktem danych.
- **Status:** ready

### S-02: Skan produktu z Nutri-Score

- **Outcome:** użytkownik bez schorzenia może zeskanować produkt i zobaczyć Nutri-Score albo jasny komunikat o braku danych.
- **Change ID:** scan-product-nutri-score
- **PRD refs:** FR-004, FR-005, FR-008
- **Prerequisites:** F-01
- **Parallel with:** F-02
- **Blockers:** zewnętrzne źródło danych produktu, jeśli nie da się użyć małego kontrolowanego zestawu produktów.
- **Unknowns:**
  - Czy skan MVP może działać na ograniczonym zestawie kodów kreskowych zamiast pełnej bazy? — Owner: user. Block: no.
- **Risk:** Ten przepływ sprawdza wejście przez skan bez jeszcze większego ryzyka analizy chorobowej.
- **Status:** proposed

### S-03: Analiza produktu względem profilu chorobowego

- **Outcome:** użytkownik z zapisanym schorzeniem może zeskanować produkt i zobaczyć Nutri-Score, analizę względem schorzenia oraz uzasadnienie.
- **Change ID:** profile-based-product-analysis
- **PRD refs:** US-01, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009
- **Prerequisites:** F-02, S-01, S-02
- **Parallel with:** —
- **Blockers:** jakość i dostępność danych produktu mogą ograniczyć wiarygodną analizę.
- **Unknowns:**
  - Czy dane dostępne dla testowych produktów pokrywają minimalne wejścia dla wszystkich trzech schorzeń? — Owner: user. Block: no.
- **Risk:** To główny przepływ MVP; wcześniejsze kroki ograniczają ryzyko danych i komunikacji, zanim analiza trafi do użytkownika.
- **Status:** proposed

### S-04: Komunikaty bezpieczeństwa i brak wiarygodnej oceny

- **Outcome:** użytkownik widzi spójne komunikaty, że analiza jest pomocniczą sugestią, oraz jednoznaczny stan braku wiarygodnej oceny.
- **Change ID:** safety-and-missing-data-copy
- **PRD refs:** US-01, FR-008, FR-009
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jak sformułować wynik, żeby nie brzmiał jak diagnoza ani indywidualna porada medyczna? — Owner: user. Block: no.
- **Risk:** Jeśli komunikaty będą zbyt pewne, produkt złamie własne guardraile; ten etap domyka wiarygodność przepływu.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | minimal-product-data-contract | Define minimal product data contract | yes | Run `/10x-plan minimal-product-data-contract` |
| F-02 | analysis-rule-guardrails | Define MVP analysis rules and safety guardrails | no | Depends on F-01 |
| S-01 | local-health-profile | Build local health profile flow | yes | Run `/10x-plan local-health-profile` |
| S-02 | scan-product-nutri-score | Build scan flow for Nutri-Score and missing data | no | Depends on F-01 |
| S-03 | profile-based-product-analysis | Build profile-based product analysis flow | no | Depends on F-02, S-01, S-02 |
| S-04 | safety-and-missing-data-copy | Harden safety and missing-data messaging | no | Depends on S-03 |

## Open Roadmap Questions

1. **Przy znacznie większej liczbie użytkowników aplikacja wymagałaby dostępu do danych produktów bez restrykcyjnych ograniczeń użycia; wybór i ograniczenia źródła danych nie są jeszcze rozstrzygnięte.** — Owner: user. Block: F-01, S-02, S-03.
2. **Czas uzyskania wyniku nie ma jeszcze ustalonego mierzalnego limitu.** — Owner: user. Block: S-03, S-04.
3. **Czy MVP świadomie rezygnuje z pełnego importu datasetu na serwerze i używa ograniczonego zestawu produktów lub źródła na żądanie?** — Owner: user. Block: F-01, S-02.

## Parked

- **Obsługa iOS** — Why parked: PRD §Non-Goals; MVP wymaga Androida.
- **Awatar i rozbudowana personalizacja profilu** — Why parked: PRD §Non-Goals; profil zawiera nazwę i opcjonalne schorzenie.
- **Indywidualna lista składników lub produktów szkodzących użytkownikowi** — Why parked: PRD §Non-Goals; analiza opiera się na wybranym profilu chorobowym.
- **Zapisywanie fazy WZJG w profilu** — Why parked: PRD §Non-Goals; wynik pokazuje osobno zaostrzenie i remisję.
- **Diagnozowanie, leczenie i indywidualna porada medyczna** — Why parked: PRD §Non-Goals; analiza ma być pomocniczą sugestią.
- **Historia skanów i zapisywanie wcześniejszych ocen** — Why parked: PRD §Non-Goals; MVP obejmuje bieżący wynik skanowania.
- **Pełny import datasetu produktów na serwerze** — Why parked: ryzyko kosztu i danych; najpierw minimalny kontrakt oraz mały zakres testowy.
- **Automatyzacja wdrożenia Railway jako osobny etap** — Why parked: Railway pozostaje finalną platformą, ale pierwsza roadmapa ogranicza ryzyko danych i przepływu MVP przed inwestycją w deploy.

## Done

- **F-01: (foundation) minimalny kontrakt danych produktu, mały zestaw testowych produktów i decyzja "bez pełnego importu datasetu w MVP" są gotowe do użycia przez pierwszy skan.** — Archived 2026-08-17 → `context/archive/2026-06-24-minimal-product-data-contract/`. Lesson: —.
