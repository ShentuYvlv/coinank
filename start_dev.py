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

def run_backend():
    """Run the Python Flask backend"""
    print("🚀 Starting Python backend...")
    subprocess.run([sys.executable, "coinank_web_app.py"])

def run_frontend():
    """Run the React frontend with Vite"""
    print("⚡ Starting React frontend...")
    run_npm_command(["npm", "run", "dev"])

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    print("\n\n🛑 Shutting down servers...")
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
    
    # Give backend time to start
    time.sleep(2)
    
    # Run frontend in main thread
    run_frontend()