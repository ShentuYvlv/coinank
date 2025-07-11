#!/usr/bin/env python3
"""
Development server starter script
Starts both the Python backend and React frontend
"""

import os
import subprocess
import threading
import time
import signal
import sys
import platform
import socket
import requests

def run_npm_command(command_args):
    """Run npm command with Windows compatibility"""
    is_windows = platform.system() == "Windows"

    if is_windows:
        # 在Windows下使用shell=True并指定完整的npm路径
        try:
            # 首先尝试直接使用npm
            result = subprocess.run(command_args, shell=True, check=True)
            return result
        except (subprocess.CalledProcessError, FileNotFoundError):
            # 如果失败，尝试使用npm.cmd
            npm_cmd = command_args[0] + ".cmd"
            modified_args = [npm_cmd] + command_args[1:]
            return subprocess.run(modified_args, shell=True, check=True)
    else:
        # 在非Windows系统下正常执行
        return subprocess.run(command_args, check=True)

def kill_process_on_port(port):
    """Kill process running on specified port"""
    is_windows = platform.system() == "Windows"

    try:
        if is_windows:
            # Windows: use netstat and taskkill
            result = subprocess.run(
                f'netstat -ano | findstr :{port}',
                shell=True, capture_output=True, text=True
            )

            if result.stdout:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if f':{port}' in line and 'LISTENING' in line:
                        parts = line.split()
                        if len(parts) >= 5:
                            pid = parts[-1]
                            subprocess.run(f'taskkill /F /PID {pid}', shell=True)
                            print(f"✅ 已终止端口 {port} 上的进程 {pid}")
                            return True
        else:
            # Unix: use lsof and kill
            result = subprocess.run(
                f'lsof -ti:{port}',
                shell=True, capture_output=True, text=True
            )

            if result.stdout:
                pid = result.stdout.strip()
                subprocess.run(f'kill -9 {pid}', shell=True)
                print(f"✅ 已终止端口 {port} 上的进程 {pid}")
                return True

    except Exception as e:
        print(f"⚠️ 无法终止端口 {port} 上的进程: {e}")

    return False

def check_port_available(port):
    """Check if port is available"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('127.0.0.1', port))
        sock.close()
        return result != 0
    except:
        return True

def check_backend_ready():
    """Check if backend is ready to accept connections"""
    try:
        response = requests.get('http://127.0.0.1:5000/', timeout=3)
        return response.status_code == 200
    except:
        return False

def run_backend():
    """Run the Python Flask backend"""
    print("🚀 Starting Python backend...")

    # 清理端口5000上的进程
    if not check_port_available(5000):
        print("🔄 端口5000被占用，正在清理...")
        kill_process_on_port(5000)
        time.sleep(2)

    subprocess.run([sys.executable, "coinank_web_app.py"])

def run_frontend():
    """Run the React frontend with Vite"""
    print("⚡ Starting React frontend...")

    # 清理端口3000上的进程
    if not check_port_available(3000):
        print("🔄 端口3000被占用，正在清理...")
        kill_process_on_port(3000)
        time.sleep(2)

    run_npm_command(["npm", "run", "dev"])

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    print("\n\n🛑 Shutting down servers...")

    # 清理端口上的进程
    print("🧹 清理端口...")
    kill_process_on_port(5000)
    kill_process_on_port(3000)

    sys.exit(0)

if __name__ == "__main__":
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    
    print("=== Coinank Development Server ===\n")
    
    # Check if npm dependencies are installed
    if not os.path.exists("node_modules"):
        print("📦 Installing npm dependencies...")
        try:
            run_npm_command(["npm", "install"])
            print("✅ Dependencies installed successfully!\n")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install dependencies: {e}")
            print("Please run 'npm install' manually and try again.")
            sys.exit(1)
    
    # Start backend in a separate thread
    backend_thread = threading.Thread(target=run_backend)
    backend_thread.daemon = True
    backend_thread.start()

    # Wait for backend to be ready
    print("⏳ 等待后端服务器启动...")

    max_wait_time = 60  # 最多等待60秒
    for i in range(max_wait_time):
        if check_backend_ready():
            print("✅ 后端服务器已就绪!")
            break

        if i % 5 == 0:  # 每5秒显示一次进度
            print(f"⏳ 等待后端启动... ({i+1}/{max_wait_time}秒)")

        time.sleep(1)
    else:
        print("❌ 后端服务器启动超时")
        print("💡 请尝试手动运行 'python coinank_web_app.py' 查看错误信息")
        sys.exit(1)

    # 额外等待2秒确保后端完全初始化
    print("🔧 等待后端完全初始化...")
    time.sleep(2)

    # Run frontend in main thread
    print("🌐 启动前端开发服务器...")
    run_frontend()