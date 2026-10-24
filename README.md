# 知几 ZhiJi

肿瘤体细胞突变分析平台。开源前端默认对接开源分析 API **Loligo**。闭源网关 **Onykia** 会把核心分析接口转发到 Loligo，对应关系与遗传分析产品里的 YiJian / Octopus / Squid 相同。公开资源路径参照 Octopus，运行时只使用 Loligo 和 Onykia 这两个名字。

## 功能特性

- 样本管理（组织、液体活检字段保留在表单中；公共字段走 Loligo）
- 数据中心与任务中心
- 体细胞变异结果浏览（SNV/InDel/CNV/Fusion/Hotspot）
- 肿瘤标志物、化疗、新抗原和报告页保留现有界面
- 流程中心：流程、基因列表、BED、基线、报告服务
- 平台管理与九项业务权限（Loligo）
- 费用中心入口（仅 Onykia，尚未接入账单）

## 技术栈

- Next.js 16
- React 19
- Tailwind CSS
- Vitest

## 环境要求

- Node.js 22
- pnpm 9.15.9

## 本地开发

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

开发服务器运行在 http://localhost:3002。默认 API 为 `http://localhost:8080/api`，后端类型为 `loligo`。

## 配置

```env
# 本地开发
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_BACKEND=loligo

# Docker
ZHIJI_API_URL=/api
ZHIJI_BACKEND=loligo
```

`ZHIJI_BACKEND` 只能是 `loligo` 或 `onykia`。Onykia 模式下核心接口前缀是 `/v1/loligo`。任务详情的服务端检查默认访问 `http://loligo:8080/api`，自定义地址使用 `ZHIJI_SERVER_API_URL`。

## 构建

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

## Docker 部署

```bash
docker build -t zhiji .
docker run -p 3000:3000 \
  -e ZHIJI_API_URL=/api \
  -e ZHIJI_BACKEND=loligo \
  zhiji
```

入口脚本会根据环境变量生成 `public/runtime-config.js`。镜像监听 3000 端口，以非 root 用户运行。

## 项目结构

```
src/
├── app/
│   ├── (main)/
│   │   ├── dashboard/      # 概览
│   │   ├── samples/        # 样本管理
│   │   ├── data/           # 数据中心
│   │   ├── tasks/          # 任务中心与肿瘤结果
│   │   ├── history/        # 历史检出（仅 Loligo）
│   │   ├── pipeline/       # 流程中心
│   │   ├── admin/          # 平台管理（仅 Loligo）
│   │   ├── billing/        # 费用中心空态（仅 Onykia）
│   │   └── settings/       # 个人设置
│   ├── login/
│   └── register/
├── components/
├── i18n/
└── lib/
```

## License

Apache License 2.0
