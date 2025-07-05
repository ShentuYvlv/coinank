@echo off
echo 正在安装Windows版Coinank数据获取器...
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

echo Python已安装，版本信息:
python --version
echo.

REM 安装依赖
echo 正在安装依赖包...
pip install -r requirements_windows.txt

if errorlevel 1 (
    echo.
    echo 使用清华源重试安装...
    pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements_windows.txt
)

echo.
echo 安装完成！
echo.
echo 使用说明:
echo 1. 确保VPN已连接并配置SOCKS5代理到端口10808
echo 2. 运行命令: python coinank_windows_fetcher.py
echo.
pause