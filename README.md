# 知几 ZhiJi

肿瘤体细胞突变分析平台，面向肿瘤精准医疗场景。

## 功能特性

- 样本管理（组织配对、液体活检）
- 体细胞变异分析（SNV/InDel/CNV/Fusion/Hotspot）
- 肿瘤标志物检测（MSI/TMB/HRD）
- 靶向药物推荐
- 化疗药物评估
- 免疫治疗评估（Neoantigen）
- AMP Tier 分级评估
- IGV 基因组浏览器集成

## 技术栈

- Next.js 14
- React 18
- Tailwind CSS
- Radix UI
- IGV.js

## 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## 本地开发

```bash
pnpm install
pnpm dev
```

开发服务器运行在 http://localhost:3002

## 构建

```bash
pnpm build      # 生产构建
pnpm start      # 启动生产服务
pnpm typecheck  # 类型检查
pnpm lint       # 代码检查
```

## Docker 部署

```bash
docker build -t zhiji .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://backend:8080 zhiji
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NEXT_PUBLIC_API_URL` | 后端 API 地址 | `http://localhost:8080` |
| `PORT` | 服务端口 | `3000` |

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/             # 主布局页面
│   │   ├── dashboard/      # 工作台
│   │   ├── analysis/       # 分析中心
│   │   ├── samples/        # 样本管理
│   │   ├── history/        # 历史检出
│   │   ├── pipeline/       # 流程中心
│   │   ├── settings/       # 系统设置
│   │   └── admin/          # 管理中心
│   ├── login/              # 登录
│   └── register/           # 注册
├── components/             # 组件
│   ├── assistant/          # AI 助手
│   ├── layout/             # 布局组件
│   └── providers/          # Context Provider
├── hooks/                  # 自定义 Hooks
├── config/                 # 配置
├── lib/                    # 工具库
├── types/                  # 类型定义
└── app/globals.css         # 全局样式
```

## 依赖

- [@schema/ui-kit](https://github.com/SchemaBio/ui-kit) — 共享 UI 组件库
- 后端 API：[Octopus](https://github.com/schemabio/Octopus)

## License

Apache License 2.0
