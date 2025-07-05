#!/usr/bin/env python3
"""
Coinank Web应用启动器
自动检查依赖、端口和启动Web应用
"""

import os
import sys
import time
import subprocess
import socket
import signal
import webbrowser
import importlib.util
import threading

# 解决Windows命令行中的编码问题
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def print_header():
    """打印标题"""
    print("=" * 60)
    print("[启动] Coinank Web应用启动器")
    print("=" * 60)

def check_dependencies():
    """检查依赖库"""
    print("[检查] 依赖库...")
    
    dependencies = {
        'flask': '用于Web服务器',
        'flask_socketio': '用于WebSocket支持',
        'requests': '用于HTTP请求',
    }
    
    missing = []
    
    for dep, desc in dependencies.items():
        try:
            importlib.import_module(dep)
            print(f"✓ {dep} - 已安装")
        except ImportError:
            missing.append(f"{dep} ({desc})")
            print(f"✗ {dep} - 未安装")
    
    # 检查自定义模块
    if os.path.exists('coin_api.py'):
        print("✓ 自定义API模块 - 已安装")
    else:
        missing.append("coin_api.py (自定义API模块)")
        print("✗ 自定义API模块 - 未安装")
    
    if missing:
        print("\n[错误] 缺少以下依赖:")
        for dep in missing:
            print(f"  - {dep}")
        print("\n请安装缺少的依赖:")
        print("  pip install flask flask-socketio requests")
        return False
        
    print("")
    return True

def check_files():
    """检查必要文件"""
    print("[检查] 必要文件...")
    
    required_files = [
        'coinank_web_app.py',
        'coin_api.py',
        'templates/index.html',
        'static/js/app.js',
        'static/css/style.css'
    ]
    
    missing = []
    
    for file in required_files:
        if os.path.exists(file):
            print(f"✓ {file} - 存在")
        else:
            missing.append(file)
            print(f"✗ {file} - 不存在")
    
    if missing:
        print("\n[错误] 缺少以下文件:")
        for file in missing:
            print(f"  - {file}")
        return False
        
    print("")
    return True

def check_port_available(port):
    """检查端口是否可用"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(('localhost', port))
            return True
    except:
        return False

def find_available_port():
    """查找可用端口"""
    print("[检查] 查找可用端口...")
    
    # 首选端口
    preferred_ports = [5000, 5001, 5002, 8000, 8080]
    
    for port in preferred_ports:
        if check_port_available(port):
            print(f"✓ 端口 {port} 可用")
            return port
        else:
            print(f"✗ 端口 {port} 已被占用")
    
    # 如果首选端口都不可用，尝试其他端口
    for port in range(8001, 8100):
        if check_port_available(port):
            print(f"✓ 端口 {port} 可用")
            return port
    
    print("[错误] 无法找到可用端口")
    return None

def start_web_app(port):
    """启动Web应用"""
    print("\n[启动] Web应用...")
    
    # 构建命令 - 添加无缓冲标志
    cmd = [sys.executable, '-u', 'coinank_web_app.py', str(port)]
    
    # 创建进程 - 使用实时输出
    try:
        # 使用无缓冲模式启动进程
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # 合并stderr到stdout
            text=True,
            encoding='utf-8',
            bufsize=1,  # 行缓冲
            universal_newlines=True
        )
        
        print(f"✓ Web应用进程已启动")
        print(f"  进程ID: {process.pid}")
        print("  正在启动，请稍候...")
        print("-" * 50)
        
        # 创建线程来读取实时输出
        def read_output():
            while True:
                line = process.stdout.readline()
                if line:
                    print(f"[应用] {line.rstrip()}")
                    sys.stdout.flush()
                elif process.poll() is not None:
                    break
        
        output_thread = threading.Thread(target=read_output, daemon=True)
        output_thread.start()
        
        # 等待应用启动
        time.sleep(3)
        
        # 检查进程状态
        if process.poll() is not None:
            print("✗ Web应用启动失败")
            return None
        
        print("-" * 50)
        print("✓ Web应用启动成功")
        return process
        
    except Exception as e:
        print(f"✗ 启动Web应用失败: {e}")
        return None

def open_browser(port):
    """打开浏览器"""
    url = f"http://localhost:{port}"
    print(f"[浏览] 打开Web应用: {url}")
    webbrowser.open(url)

def main():
    """主函数"""
    print_header()
    
    # 检查依赖
    if not check_dependencies():
        print("\n✗ 启动失败")
        return
    
    # 检查文件
    if not check_files():
        print("\n✗ 启动失败")
        return
    
    # 查找可用端口
    port = find_available_port()
    if not port:
        print("\n✗ 启动失败")
        return
    
    # 启动Web应用
    process = start_web_app(port)
    if not process:
        print("\n✗ 启动失败")
        return
    
    # 打开浏览器
    time.sleep(1)
    open_browser(port)
    
    print("\n[完成] Web应用已启动")
    print(f"  访问地址: http://localhost:{port}")
    print("  按Ctrl+C停止应用")
    
    try:
        # 等待用户中断
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[停止] 正在停止Web应用...")
        process.terminate()
        try:
            process.wait(timeout=5)
            print("  Web应用已停止")
        except subprocess.TimeoutExpired:
            process.kill()
            print("  Web应用已强制终止")

if __name__ == "__main__":
    main() 