---
project: GoodGut
researched_at: 2026-06-21
recommended_platform: Railway
runner_up: Fly.io
context_type: mvp
tech_stack:
  language: Java 21
  framework: Spring Boot 4.0.6
  runtime: JVM
  package_manager: Maven
---

## Recommendation

**Deploy on Railway.**

Railway is the best MVP fit for the current Spring Boot service because it has an official Spring Boot guide, Java framework support, CLI commands for deployment and logs, PostgreSQL as a co-located managed service, and current agent-facing tooling including MCP. The interview weighted low cost heavily, so the decision is conditional on cost controls: Railway starts with a free trial and then low paid baseline, while Fly.io can be cheaper for a tiny always-on VM but requires more platform assembly.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| Cloudflare Workers + Pages | Pass | Pass | Pass | Pass | Pass | Dropped: no native JVM/Spring Boot target |
| Vercel | Pass | Pass | Pass | Pass | Pass | Dropped: no Java runtime found in current runtimes docs |
| Netlify | Pass | Pass | Partial | Pass | Pass | Dropped: serverless function model is JS/TS-oriented, not Spring Boot |
| Fly.io | Pass | Pass | Pass | Pass | Partial | 4.5 / 5 |
| Railway | Pass | Pass | Pass | Pass | Pass | 5 / 5 |
| Render | Pass | Pass | Pass | Pass | Pass | 4 / 5, because Java requires Docker |

Cloudflare, Vercel, and Netlify score well as agent-friendly platforms, but they do not match the hard JVM/Spring Boot constraint without rewriting the backend. Fly.io fits containers and has strong `flyctl` operations, including deploy, secrets, logs, status, and releases, with small shared-CPU machines priced from a few dollars per month. Render has mature platform features, CLI, API, MCP, Postgres, previews, and rollbacks, but its docs state Java/Kotlin/Scala should run through Docker rather than a native runtime. Railway supports Spring Boot directly, documents Java/Spring deployment, provides PostgreSQL, and exposes CLI commands for deploys, variables, logs, services, and MCP.

Sources checked: [Railway Spring Boot](https://docs.railway.com/guides/spring-boot), [Railway CLI](https://docs.railway.com/cli), [Railway pricing](https://railway.com/pricing), [Fly.io CLI](https://fly.io/docs/flyctl/), [Fly.io pricing](https://fly.io/docs/about/pricing/), [Render language support](https://render.com/docs/language-support), [Render CLI](https://render.com/docs/cli), [Render pricing](https://render.com/pricing), [Cloudflare Workers docs](https://developers.cloudflare.com/workers/platform/pricing/), [Vercel runtimes](https://vercel.com/docs/functions/runtimes), [Netlify Functions](https://docs.netlify.com/build/functions/overview/).

### Shortlisted Platforms

#### 1. Railway (Recommended)

Railway won because it matches the Maven/Spring Boot backend with the least setup, includes co-located PostgreSQL for later server-side data, and has strong terminal/agent operations. It also fits the project context: solo developer, small MVP, GitHub-oriented deploy flow, and no persistent connection requirement.

#### 2. Fly.io

Fly.io is the strongest runner-up for cost-sensitive JVM hosting. It gives low-cost machines, excellent CLI operations, and container portability, but it is less turnkey than Railway for managed service composition and first-time solo MVP deployment.

#### 3. Render

Render is operationally mature and agent-friendly, with CLI, REST API, MCP, web services, previews, Postgres, and rollbacks. The gap is Java support: this project would need Docker, adding one more artifact before the MVP is otherwise ready.

## Anti-Bias Cross-Check: Railway

### Devil's Advocate - Weaknesses

1. Railway auto-detection may not perfectly handle Java 21 plus Spring Boot 4.0.6; explicit build/start commands or Docker may still be needed.
2. Usage-based pricing can drift upward once a JVM service and database stay online.
3. The Spring Boot guide still describes generating a public URL through the dashboard, which weakens reproducible CLI-only setup.
4. Database convenience does not replace backup, restore, and migration discipline.
5. A later move from single-region MVP to broader geography may require app/database placement decisions.

### Pre-Mortem - How This Could Fail

Six months later, Railway could look like the wrong call if the team assumed one-click Java meant no deployment configuration would ever be needed. The app starts small, but Spring Boot memory use plus a PostgreSQL service pushes monthly cost beyond expectations. Because public networking and service setup were initially completed through the dashboard, the environment is not fully reproducible, and a fresh agent cannot recreate it confidently. Product data imports grow larger than expected, causing backup and restore questions that were deferred during MVP setup. A rollback restores application code quickly but does not undo a bad schema or imported dataset. The failure mode is not Railway itself; it is an under-specified MVP setup with no infrastructure-as-code, weak cost alerts, and no documented database recovery procedure.

### Unknown Unknowns

- Java 21 plus Spring Boot 4.0.6 should be verified against Railway's current build detection before relying on zero-config deploys.
- Native Windows setup may need npm or Scoop; Railway's agent-oriented CLI install text emphasizes macOS, Linux, and Windows via WSL.
- Initial generated domain setup may involve dashboard interaction unless scripted through API or config later.
- Database backup, point-in-time restore, and export behavior should be confirmed before storing meaningful product or user data.

## Operational Story

- **Preview deploys**: Use Railway GitHub integration for branch/PR deploys where available; protect non-production URLs if real product/user data appears.
- **Secrets**: Store service variables in Railway variables; use `railway variable` for agent-readable inspection and updates, and avoid committing secrets to `application.properties`.
- **Rollback**: Use Railway deployment history or `railway redeploy` to return to a previous app version; database migrations and imported product data require separate rollback plans.
- **Approval**: Agents may deploy from approved branches and read logs; humans approve production domain changes, paid-plan changes, primary secret rotation, and destructive database actions.
- **Logs**: Use `railway logs` for runtime logs and deployment output; use `railway status` and `railway deployment` for deployment state.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Java 21 / Spring Boot 4 build detection mismatch | Devil's advocate | M | M | Run a Railway test deploy before feature work; add explicit build and start commands if detection is wrong. |
| JVM plus database exceeds expected MVP cost | Pre-mortem | M | M | Set Railway cost controls, choose smallest viable service sizes, and review usage weekly during MVP. |
| First setup is not fully reproducible | Unknown unknowns | M | M | Record all dashboard actions in this file or move them into Railway config/API commands after first deploy. |
| Bad schema or import cannot be rolled back by app rollback | Pre-mortem | M | H | Add migration discipline and database backup/export steps before production data import. |
| Single-region assumption becomes wrong | Devil's advocate | L | M | Revisit platform choice if target users expand outside the first region or latency becomes a measured requirement. |

## Getting Started

1. Install and authenticate Railway CLI using the current Railway CLI docs.
2. From `services/api`, run `./mvnw test` or `.\mvnw.cmd test` to verify the Java 21/Spring Boot 4 scaffold before deploying.
3. Initialize/link the Railway project for the API service and configure Railway's service root directory as `services/api` before deploying with `railway up` or `railway deploy`.
4. Add required environment variables with `railway variable`; keep secrets out of `services/api/src/main/resources/application.properties`.
5. Add PostgreSQL only when the server actually persists data, then document backup/export and migration steps before importing product data.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
