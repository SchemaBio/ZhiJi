# ZhiJi

[English](./README.md) | **中文**

知几肿瘤分析初始基线的开源 Web 前端。当前仍运行继承的胚系分析工作流，覆盖从 FASTQ 到质控、变异注释和结果浏览的路径。这些界面中的疾病与遗传表述保持原样。对接自部署的 [Loligo](https://github.com/SchemaBio/Loligo) API。

采用 [Apache License 2.0](./LICENSE)。

## 使用边界

本仓库是开源、可自部署的版本。部署者自行决定使用场景、工作流、数据保留和结果用途，并负责输入数据授权、安全保护、结果验证、人员资质以及适用的法律和监管要求。

软件及其输出不自动构成经过验证的医疗产品或诊断结论。若用于受监管场景，由部署者完成必要验证与手续。Apache 许可不替代这些要求，本说明也不在许可之外新增用途限制。

## 包含的功能

- 概览、样本列表、家系管理
- 测序文件数据中心
- 任务中心：创建任务、查看运行、浏览变异、质控、IGV 和报告
- 历史检出
- 流程中心：流程、基因列表、BED 文件、CNV 基线、报告服务
- 平台管理与权限设置（平台管理员）
- 用于整理证据、筛选研究候选的 AI 辅助

CNV 基线校正任务（`baseline_fix`）产出的是基线资源，不是解读报告。这类任务的详情路由返回 404。

## 环境要求

- Node.js 22
- pnpm 9.15.9（见 `package.json` 的 `packageManager`）
- 可访问的 Loligo API（默认 `http://localhost:8082/api`）

## 本地开发

```sh
cp .env.example .env.local
pnpm install
pnpm dev
```

开发服务器监听 http://localhost:3002。`pnpm start` 在 3002 端口提供生产构建。默认开发配置直连 `http://localhost:8082/api`，后端类型为 `loligo`。

## 配置

ZhiJi 需要 API 地址和后端类型。开源版的后端是 `loligo`。

```env
# Docker 运行时
ZHIJI_API_URL=/api
ZHIJI_BACKEND=loligo

# Next.js 本地开发
NEXT_PUBLIC_API_URL=http://localhost:8082/api
NEXT_PUBLIC_BACKEND=loligo
```

任务详情路由会在服务端核验任务。Docker 默认访问 `http://loligo:8080/api`。自定义网络或端口时，设置仅服务端使用的 `ZHIJI_SERVER_API_URL`，不要填写浏览器里的 localhost 地址。

其他运行时配置，默认值来自 `.env.example` 和 `docker-entrypoint.sh`：

| 变量 | 默认值 | 作用 |
| --- | --- | --- |
| `ZHIJI_DEFAULT_LOCALE` | `zh-CN` | 部署默认语言 |
| `ZHIJI_UPLOAD_ORIGINS` | 空 | 额外允许的上传来源 |
| `ZHIJI_PASSWORD_RESET_ENABLED` | `false` | 密码重置 |
| `NEXT_PUBLIC_PASSWORD_HASH_ENABLED` | `false` | 客户端密码哈希，构建镜像时写入 |
| `NEXT_PUBLIC_PRIVACY_CONSENT_REQUIRED` | `true` | 隐私同意，构建镜像时写入 |
| `NEXT_PUBLIC_ASSESSMENT_OPTIMIZED` | `false` | 初评缓存、流水线和索引优化开关；构建参数，修改后须重建镜像，验收前保持关闭 |

`NEXT_PUBLIC_DEV_MOCK_AUTH=true` 会被生产镜像拒绝。

## Docker

```sh
docker build -t zhiji .
docker run -p 3002:3000 \
  -e ZHIJI_API_URL=/api \
  -e ZHIJI_BACKEND=loligo \
  zhiji
```

入口脚本会根据环境变量生成 `public/runtime-config.js`，因此 API 地址、后端、上传来源、密码重置和默认语言都可以不重新构建镜像而修改。镜像在容器内监听 3000 端口，以非 root 用户运行。宿主机发布端口为 3002。

## 数据库前提

本仓库只有 Web 前端。它不创建数据库，也不启动 Loligo、Onykia 或 Rossia。

- 开源 API Loligo 使用数据库名和用户 `loligo`。宿主机端口是 **8082**，容器端口是 8080。本地开发使用 `http://localhost:8082/api`。
- 网关 Onykia 使用数据库名和用户 `onykia`，宿主机端口是 **8089**。此时核心分析路由使用前缀 `/v1/loligo`。
- 管理控制台 Rossia 使用宿主机端口 **3003** 和管理数据库 `rossia`。

这些服务在各自的仓库中运行。只有所选 API 已经启动，登录、样本和任务请求才会成功。

## Sepiida

Sepiida 是外部共享服务。本仓库不复制、构建、安装或启动 Sepiida 服务器、agent、数据库、密钥生成器、签名密钥或令牌密钥。需要 agent 的工作流必须使用已经在外部管理的 agent。

独立开发时保持该集成为关闭。启用时需要后端上已经存在的真实 `SEPIIDA_URL`、`SEPIIDA_QUERY_KEY`，以及现有的任务令牌或 agent 配置。不要编造这些值。协议名保持 `SEPIIDA_*`。

## 端口

| 服务 | 宿主机端口 | 容器端口 |
| --- | --- | --- |
| ZhiJi（本前端） | 3002 | 3000 |
| Rossia | 3003 | 3000 |
| Loligo | 8082 | 8080 |
| Onykia | 8089 | 8080 |

Docker 内 ZhiJi 监听 3000，宿主机映射为 `3002:3000`。容器内的服务端任务检查默认访问 `http://loligo:8080/api`，自定义地址使用 `ZHIJI_SERVER_API_URL`。不要在 `ZHIJI_SERVER_API_URL` 中填写浏览器里的 localhost 地址。

## 两条产品线同时运行时的 Cookie

API Cookie 仍是 `access_token`、`refresh_token` 和 `csrf_token`。界面语言 Cookie 是 `zhiji-locale`。这些 API Cookie 名称与遗传分析产品线相同。两条产品线请使用不同主机名，避免 Cookie 冲突。

## 继承功能的限制

这是知几肿瘤分析的初始基线。样本、家系、变异浏览、质控、IGV、报告和历史检出仍使用继承的胚系工作流和数据结构。这些界面里的疾病与遗传表述保持原样。本基线不包含旧的肿瘤专用解读组件。CNV 基线校正任务（`baseline_fix`）产出基线资源，不是解读报告，其任务详情路由返回 404。依赖 Sepiida 的 AI 辅助和任务执行在获得真实外部配置之前保持关闭。

## 界面语言

支持简体中文（`zh-CN`）、通用繁体中文（`zh-Hant`）、英语（`en`）和拉美西班牙语（`es-419`）。

在“设置 → 个人设置 → 界面语言”选择语言并保存。偏好通过当前网站的 `zhiji-locale` Cookie 保存一年，退出登录后保留，不跨设备同步。

Docker 默认语言由 `ZHIJI_DEFAULT_LOCALE` 设置，未设置时为 `zh-CN`。同一镜像支持四种默认语言；修改后重建容器即可，无需重建镜像。已有浏览器偏好优先于部署默认值，不根据浏览器语言自动选择。

本地开发使用 `NEXT_PUBLIC_DEFAULT_LOCALE`。

样本资料、报告正文、AI 输出及原始文件保持原文。

## 验证

```sh
pnpm test
pnpm typecheck
pnpm build
node scripts/check-i18n.cjs
```

反向代理、TLS 与公网访问控制由部署者负责。

## 自部署账户管理与隐私

平台管理员在“平台管理”中创建账户、分配平台管理员或普通用户角色，并启用、停用或删除账户。管理员创建的账户立即可登录；当前 Loligo 后端也允许自行注册普通账户。已有待审核账户仍可在管理页审核。个人资料、界面语言和密码在“个人设置”中修改；旧权限管理链接会跳转到平台管理。

隐私页说明本实例由部署者提供服务。部署者应补充自身主体信息、联系方式、数据存放区域、保留与删除规则及外部服务配置，不应把通用说明当作已经完整披露的实例政策。账户删除与隐私请求由本实例管理员处理。顶部 GitHub 按钮指向本仓库；请勿在公开问题区提交个人资料、样本或凭据。

### 自部署业务权限

平台管理员可在「平台管理」中逐项分配九项业务权限，管理员始终拥有全部权限。新建、自行注册及已有普通账户默认只读。所有用户均可浏览、查询和下载本实例共享的业务数据；获得对应权限后，可以管理其他本地用户创建的资源。个人偏好和账户凭据仍然独立。

此机制仅适用于 Loligo 开源版，Onykia SaaS 保持现有单用户流程和租户隔离。上线时先更新 Loligo 数据库及后端，再更新 ZhiJi。授权变更对后续接口请求立即生效，无需重新登录；窗口重新获得焦点或遇到权限拒绝时，界面会刷新授权。撤权不会停止已经运行的任务。
