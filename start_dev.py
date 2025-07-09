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

def run_backend():
    """Run the Python Flask backend"""
    print("🚀 Starting Python backend...")
    subprocess.run([sys.executable, "coinank_web_app.py"])

def run_frontend():
    """Run the React frontend with Vite"""
    print("⚡ Starting React frontend...")
    subprocess.run(["npm", "run", "dev"])

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
        subprocess.run(["npm", "install"])
        print("")
    
    # Start backend in a separate thread
    backend_thread = threading.Thread(target=run_backend)
    backend_thread.daemon = True
    backend_thread.start()
    
    # Give backend time to start
    time.sleep(2)
    
    # Run frontend in main thread
    run_frontend()