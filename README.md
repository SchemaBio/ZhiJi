# ZhiJi

**English** | [中文](./README.zh-CN.md)

Open-source web frontend for the ZhiJi oncology platform. Connect it to a self-hosted [Loligo](https://github.com/SchemaBio/Loligo) API to manage samples, monitor analysis tasks, and browse results.

Licensed under the [Apache License 2.0](./LICENSE).

## Scope

This repository is the open-source, self-hosted edition. Deployers choose the use case, workflows, data retention, and how results are used. They are responsible for authorization of input data, security, result validation, personnel qualifications, and applicable legal and regulatory requirements.

The software and its output do not automatically constitute a validated medical product or a diagnostic conclusion. If used in a regulated setting, the deployer completes the required validation and procedures. The Apache License does not replace those requirements, and this notice does not add use restrictions beyond the license.

## What it includes

- Dashboard, sample list, and pedigree management
- Data center for sequencing files
- Task center: create tasks, inspect runs, browse variants, QC, IGV, and reports
- Historical findings
- Pipeline center: pipelines, gene lists, BED files, CNV baselines, and report service
- Platform administration and permission settings (platform administrators)
- AI assistance for organizing evidence and screening research candidates

CNV baseline-correction tasks (`baseline_fix`) produce baseline resources, not interpretation reports. Their task-detail route returns 404.

## Requirements

- Node.js 22
- pnpm 9.15.9 (`packageManager` in `package.json`)
- A reachable Loligo API (default `http://localhost:8082/api`)

## Local development

```sh
cp .env.example .env.local
pnpm install
pnpm dev
```

The dev server listens on http://localhost:3002. `pnpm start` serves a production build on port 3002. The default development configuration connects directly to `http://localhost:8082/api` with backend `loligo`.

## Configuration

ZhiJi needs an API URL and a backend type. For this open-source edition, the backend is `loligo`.

```env
# Docker runtime
ZHIJI_API_URL=/api
ZHIJI_BACKEND=loligo

# Next.js local development
NEXT_PUBLIC_API_URL=http://localhost:8082/api
NEXT_PUBLIC_BACKEND=loligo
```

Task-detail routes verify the task on the server. Docker defaults to `http://loligo:8080/api`. For a custom network or port, set the server-only `ZHIJI_SERVER_API_URL`. Do not put a browser-side localhost address there.

Other runtime settings, with defaults from `.env.example` and `docker-entrypoint.sh`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `ZHIJI_DEFAULT_LOCALE` | `zh-CN` | Deployment default language |
| `ZHIJI_UPLOAD_ORIGINS` | empty | Extra allowed upload origins |
| `ZHIJI_PASSWORD_RESET_ENABLED` | `false` | Password reset |
| `NEXT_PUBLIC_PASSWORD_HASH_ENABLED` | `false` | Client-side password hashing. Baked in at image build time |
| `NEXT_PUBLIC_PRIVACY_CONSENT_REQUIRED` | `true` | Privacy consent. Baked in at image build time |
| `NEXT_PUBLIC_ASSESSMENT_OPTIMIZED` | `false` | Assessment cache/pipeline/index opt-in. Build argument; changing it requires rebuilding the image. Keep disabled pending acceptance |

`NEXT_PUBLIC_DEV_MOCK_AUTH=true` is rejected in production images.

## Docker

```sh
docker build -t zhiji .
docker run -p 3002:3000 \
  -e ZHIJI_API_URL=/api \
  -e ZHIJI_BACKEND=loligo \
  zhiji
```

The entrypoint writes `public/runtime-config.js` from the environment, so API URL, backend, upload origins, password reset, and default locale can change without rebuilding the image. The image listens on container port 3000 and runs as a non-root user. Publish host port 3002.

## Database prerequisite

This repository is the web frontend only. It does not create a database and it does not start Loligo, Onykia, or Rossia.

- Loligo, the open-source API, uses database name and user `loligo`. Its host port is **8082** and its container port is 8080. Local development uses `http://localhost:8082/api`.
- Onykia, the gateway, uses database name and user `onykia` and host port **8089**. Core analysis routes then use the prefix `/v1/loligo`.
- Rossia, the management console, uses host port **3003** and management database `rossia`.

Those services live in their own repositories. Login, sample, and task calls succeed only when the selected API is already running.

## Sepiida

Sepiida is shared and external. This repository does not copy, build, install, or start a Sepiida server, agent, database, key generator, signing secret, or token secret. A workflow that needs an agent must use an existing externally managed agent.

Standalone development leaves that integration disabled. Enabled mode needs the real `SEPIIDA_URL`, `SEPIIDA_QUERY_KEY`, and the existing task-token or agent configuration on the backend that already has them. Do not invent those values. Protocol names stay `SEPIIDA_*`.

## Ports

| Service | Host port | Container port |
| --- | --- | --- |
| ZhiJi (this frontend) | 3002 | 3000 |
| Rossia | 3003 | 3000 |
| Loligo | 8082 | 8080 |
| Onykia | 8089 | 8080 |

Inside Docker, ZhiJi listens on 3000. Publish `3002:3000`. Server-side task checks inside Docker use `http://loligo:8080/api` unless `ZHIJI_SERVER_API_URL` is set. Do not put a browser localhost address in `ZHIJI_SERVER_API_URL`.

## Cookies across product lines

API cookies remain `access_token`, `refresh_token`, and `csrf_token`. The language cookie is `zhiji-locale`. Those API cookie names are shared with the genetic product line. Run the two product lines on different hostnames so the cookies do not collide.

## Inherited-feature limitations

This is the ZhiJi oncology initial baseline. Samples, pedigrees, variant review, quality control, IGV, reports, and history still use the inherited germline workflows and schemas. Disease and inheritance wording on those screens stays as it is. Tumor-only somatic interpretation is outside this baseline. CNV baseline-correction tasks (`baseline_fix`) produce baseline resources rather than interpretation reports, and their task-detail route returns 404. AI assistance and task execution that depend on Sepiida stay disabled until real external Sepiida settings are present.

## Interface language

Supported locales: Simplified Chinese (`zh-CN`), generic Traditional Chinese (`zh-Hant`), English (`en`), and Latin American Spanish (`es-419`).

Choose a language under Settings → Personal settings → Interface language, then save. The preference is stored for one year in the current site’s `zhiji-locale` cookie. It survives sign-out and is not synced across devices.

The Docker default is `ZHIJI_DEFAULT_LOCALE` (`zh-CN` if unset). The same image supports all four defaults. After changing it, recreate the container; rebuilding the image is not required. An existing browser preference overrides the deployment default. The language is not chosen from the browser locale.

Local development uses `NEXT_PUBLIC_DEFAULT_LOCALE`.

Sample records, report body text, AI output, and original files stay in their source language.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm build
node scripts/check-i18n.cjs
```

Reverse proxy, TLS, and public access control are the deployer’s responsibility.

### Self-hosted business permissions

The platform administrator can assign nine independent business permissions in Platform Management. Administrators always have every permission. All ordinary accounts, including existing accounts and self-registered users, start read-only. Users can browse, query and download local business data shared across the instance; granted permissions allow managing resources created by other local users. Personal preferences and credentials remain private.

This applies only to the Loligo open-source edition. SaaS via Onykia keeps its existing single-user and tenant isolation behavior. Deploy the Loligo database/backend update before ZhiJi. Permission changes take effect on subsequent API requests without signing in again; the interface refreshes permissions on window focus and permission errors. Running tasks continue after revocation.

## VCF2Anno

支持 VCF 起始的 SNP/InDel 注释，hg19/hg38 共用工作流；SaaS 沿用 WES 计算时间计费，自部署不扣积分。输入、部署、配置及验证见 [VCF2Anno 接入说明](docs/VCF2ANNO.md)。
