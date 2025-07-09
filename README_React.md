# Coinank Live - React改造完成

## 项目概述
Coinank Live已完全改造为React框架，使用Material-UI作为UI组件库，实现了完整的实时加密货币数据可视化平台。

## 已完成的改造

### 1. 组件结构
- **App.jsx** - 应用根组件，配置主题和全局Provider
- **MainLayout.jsx** - 主布局组件，组织整体页面结构
- **Navbar.jsx** - 导航栏组件
- **StatsCards.jsx** - 统计卡片组件
- **ChartsSection.jsx** - 图表区域容器
- **TablesSection.jsx** - 数据表格组件（期货/现货）
- **LoadingOverlay.jsx** - 加载状态覆盖层
- **ConnectionStatus.jsx** - WebSocket连接状态提示

### 2. 图表组件（使用Chart.js + react-chartjs-2）
- **PriceChart.jsx** - 价格和持仓量走势图（支持缩放、拖动）
- **OIDistributionChart.jsx** - 持仓量分布饼图
- **NetFlowChart.jsx** - 资金净流入柱状图
- **VolumeChart.jsx** - 24H成交额图表（支持柱状图/折线图切换）

### 3. 状态管理（使用Zustand）
- **useStore.js** - 全局状态管理
  - WebSocket连接管理
  - 数据缓存和更新
  - 图表交互状态
  - 页面可见性检测
  - 格式化工具函数

### 4. UI框架
- 使用Material-UI v5
- 深色主题定制
- 响应式布局
- 平滑动画过渡

## 运行项目

### 开发模式
```bash
# 方式1：使用开发启动脚本（推荐）
python start_dev.py

# 方式2：分别启动前后端
# 终端1 - 启动Python后端
python coinank_web_app.py

# 终端2 - 启动React前端
npm run dev
```

### 生产构建
```bash
# 构建React前端
npm run build

# 构建后的文件在dist目录
```

## 技术栈
- **前端框架**: React 18
- **UI组件库**: Material-UI v5
- **图表库**: Chart.js + react-chartjs-2
- **状态管理**: Zustand
- **实时通信**: Socket.io-client
- **构建工具**: Vite
- **样式方案**: Emotion (MUI内置)

## 项目特性
- ✅ 实时数据更新（WebSocket）
- ✅ 响应式设计
- ✅ 图表交互（缩放、拖动、切换）
- ✅ 页面可见性优化
- ✅ 加载状态管理
- ✅ 连接状态提示
- ✅ 数据格式化和本地化

## 文件结构
```
/ank/
├── src/
│   ├── App.jsx              # 应用根组件
│   ├── main.jsx             # 入口文件
│   ├── components/          # 组件目录
│   │   ├── MainLayout.jsx
│   │   ├── Navbar.jsx
│   │   ├── StatsCards.jsx
│   │   ├── ChartsSection.jsx
│   │   ├── TablesSection.jsx
│   │   ├── LoadingOverlay.jsx
│   │   ├── ConnectionStatus.jsx
│   │   └── charts/          # 图表组件
│   │       ├── PriceChart.jsx
│   │       ├── OIDistributionChart.jsx
│   │       ├── NetFlowChart.jsx
│   │       └── VolumeChart.jsx
│   └── store/               # 状态管理
│       └── useStore.js
├── package.json             # 项目依赖
├── vite.config.js          # Vite配置
├── start_dev.py            # 开发启动脚本
└── coinank_web_app.py      # Python后端
```

## 注意事项
1. 确保Python后端运行在5000端口
2. React前端默认运行在3000端口
3. Vite已配置代理，将/api和/socket.io请求转发到后端
4. 所有原有功能已完整迁移到React组件