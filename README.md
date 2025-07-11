
# Coinank 项目

## 项目概述

Coinank 是一个实时加密货币数据可视化平台，目前主要支持 PEPE 代币的数据展示。项目包括 Python 后端（使用 Flask 和 SocketIO）和 React 前端（使用 Vite、MUI 和各种图表库）。

### 主要功能
- 实时价格图表
- 持仓量 (OI) 分布和时序图
- 24H 成交量图
- 净流入/流出数据
- 期货和现货市场表格
- 统计卡片显示关键指标
- 通过 WebSocket 的实时更新

## 技术栈
- **后端**: Python, Flask, Flask-SocketIO, requests, pandas 等
- **前端**: React, Material-UI, Chart.js, Recharts, Zustand, Socket.io-client
- **构建工具**: Vite

## 安装

### 后端
1. 安装 Python 依赖：
   ```
   pip install -r requirements.txt
   ```

### 前端
1. 进入项目根目录：
   ```
   npm install
   ```

## 使用方式

### 启动开发模式
- 运行 `python start_dev.py` 来同时启动后端和前端开发服务器。

### 启动生产模式
- 后端: `python start_web_app.py`
- 前端: `npm run build` 然后服务 dist 目录。

### 核心参数
- **端口**: 默认 5000，可通过命令行参数指定。
- **代理**: 在 config.py 中配置代理设置。
- **支持代币**: 当前仅 PEPE，可在 coinank_web_app.py 中扩展。

## 开发
- 前端源代码在 `src/` 目录。
- 后端主要在 `coinank_web_app.py` 和 `coin_api.py`。 