#!/usr/bin/env python3
"""
Coinank API模块 - 数据获取核心功能
提供清洁、专用的API访问接口
"""

import requests
import json
import time
import base64
import urllib.request
import urllib.error
from datetime import datetime


class CoinankAPI:
    """Coinank API核心类"""
    
    def __init__(self, use_proxy=True, proxy_host='127.0.0.1', proxy_port=10808):
        """
        初始化API客户端

        Args:
            use_proxy: 是否使用代理
            proxy_host: 代理主机地址
            proxy_port: 代理端口
        """
        self.session = requests.Session()
        self.base_url = "https://api.coinank.com"
        self.main_url = "https://coinank.com"
        self.proxy_configured = False

        # 会话缓存
        self.session_established = False
        self.last_session_time = 0
        self.session_timeout = 300  # 5分钟会话超时

        # 配置代理
        if use_proxy:
            self.proxy_configured = self.setup_proxy(proxy_host, proxy_port)
        else:
            print("🔧 代理已禁用，使用直连模式")
            self.clear_all_proxy_settings()
    
    def setup_proxy(self, host, port):
        """配置SOCKS5代理"""
        try:
            import socks
            import socket
            
            # 测试代理连接
            try:
                test_sock = socks.socksocket()
                test_sock.set_proxy(socks.SOCKS5, host, port)
                test_sock.settimeout(5)
                test_sock.connect(('www.google.com', 80))
                test_sock.close()
                
                # 设置全局代理
                socks.set_default_proxy(socks.SOCKS5, host, port)
                socket.socket = socks.socksocket
                
                print(f"✅ 已配置SOCKS5代理: {host}:{port}")
                return True
                
            except Exception as proxy_error:
                print(f"❌ SOCKS5代理连接失败: {proxy_error}")
                return self.try_http_proxy(host, port)
            
        except ImportError:
            print("⚠️ 未安装PySocks库，尝试HTTP代理...")
            return self.try_http_proxy(host, port)
            
        except Exception as e:
            print(f"❌ 代理配置失败: {e}")
            return False
    
    def try_http_proxy(self, host, port):
        """尝试HTTP代理"""
        try:
            test_session = requests.Session()
            test_session.proxies = {
                'http': f'http://{host}:{port}',
                'https': f'http://{host}:{port}'
            }
            
            test_response = test_session.get('http://httpbin.org/ip', timeout=5)
            if test_response.status_code == 200:
                print(f"✅ 检测到HTTP代理可用: {host}:{port}")
                self.session.proxies = {
                    'http': f'http://{host}:{port}',
                    'https': f'http://{host}:{port}'
                }
                return True
            else:
                print("❌ HTTP代理测试失败")
                
        except Exception as e:
            print(f"❌ HTTP代理测试异常: {e}")
        
        print("⚠️ 代理配置失败，将使用直连模式")
        return False
    
    def clear_all_proxy_settings(self):
        """清理所有代理设置"""
        try:
            self.session.proxies.clear()
            
            import os
            proxy_env_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
            for var in proxy_env_vars:
                if var in os.environ:
                    del os.environ[var]
            
            try:
                import socket
                import socks
                socket.socket = socket._socket.socket
                print("✅ 已清理所有代理设置")
            except:
                pass
                
        except Exception as e:
            print(f"⚠️ 清理代理设置时出现异常: {e}")
            self.session = requests.Session()
    
    def test_connection(self):
        """测试网络连接"""
        print("🔍 测试网络连接...")
        
        try:
            response = self.session.get(self.main_url, timeout=10)
            if response.status_code == 200:
                print("✅ 网络连接正常")
                return True
            else:
                print(f"❌ 连接失败，状态码: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ 网络连接错误: {e}")
            
            if "ProxyError" in str(e) or "proxy" in str(e).lower():
                print("🔄 检测到代理错误，尝试使用无代理连接...")
                return self.test_direct_connection()
            
            return False
    
    def test_direct_connection(self):
        """测试直连模式"""
        try:
            print("🔄 尝试使用urllib进行原始连接...")
            
            proxy_handler = urllib.request.ProxyHandler({})
            opener = urllib.request.build_opener(proxy_handler)
            
            req = urllib.request.Request(
                self.main_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            )
            
            with opener.open(req, timeout=10) as response:
                if response.getcode() == 200:
                    print("✅ urllib直连成功！创建新的requests会话...")
                    
                    direct_session = requests.Session()
                    direct_session.proxies = {}
                    direct_session.trust_env = False
                    
                    response = direct_session.get(self.main_url, timeout=10)
                    if response.status_code == 200:
                        print("✅ requests会话也成功，切换到无代理连接")
                        self.session = direct_session
                        return True
                    else:
                        print(f"❌ requests会话失败，状态码: {response.status_code}")
                        return False
                else:
                    print(f"❌ urllib连接失败，状态码: {response.getcode()}")
                    return False
                    
        except Exception as e:
            print(f"❌ 直连模式异常: {e}")
            return False
    
    def establish_session(self):
        """建立会话 - 带缓存优化"""
        current_time = time.time()

        # 检查会话是否仍然有效
        if (self.session_established and
            current_time - self.last_session_time < self.session_timeout):
            print("� 使用缓存的会话")
            return True

        print("�🔗 建立新的coinank会话...")

        main_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        }

        try:
            resp = self.session.get(self.main_url, headers=main_headers, timeout=10)

            if resp.status_code == 200:
                cookies_count = len(self.session.cookies)
                print(f"✅ 主站响应: {resp.status_code}")
                print(f"✅ 获取到 {cookies_count} 个Cookie")

                # 更新会话状态
                self.session_established = True
                self.last_session_time = current_time

                return True
            else:
                print(f"❌ 主站访问失败: {resp.status_code}")
                self.session_established = False
                return False

        except Exception as e:
            print(f"❌ 建立会话失败: {e}")
            self.session_established = False
            return False
    
    def get_api_headers(self):
        """获取API请求头"""
        timestamp = int(time.time() * 10000000)
        uuid_part = "-b31e-c547-d299-b6d07b7631aba2c903cc"
        key_string = f"{uuid_part}|{timestamp}"
        
        api_key = base64.b64encode(key_string.encode()).decode()
        
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'client': 'web',
            'token': '',
            'web-version': '101',
            'coinank-apikey': api_key,
            'Origin': 'https://coinank.com',
            'Connection': 'keep-alive',
            'Referer': 'https://coinank.com/',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        }
    
    def fetch_data_with_retry(self, url, params, data_type, max_retries=2):
        """带重试的数据获取 - 优化版本"""
        for attempt in range(max_retries):
            try:
                headers = self.get_api_headers()
                response = self.session.get(url, headers=headers, params=params, timeout=8)

                print(f"🔍 {data_type}请求: {url}")
                print(f"📊 响应状态: {response.status_code}")

                if response.status_code == 200:
                    # 检查响应内容类型
                    content_type = response.headers.get('content-type', '').lower()
                    if 'application/json' not in content_type:
                        print(f"⚠️ {data_type}响应不是JSON格式: {content_type}")
                        continue

                    try:
                        data = response.json()
                        if data.get('success'):
                            data_count = len(data.get('data', []) if isinstance(data.get('data'), list)
                                           else data.get('data', {}).get('tss', []))
                            print(f"✅ {data_type}数据获取成功 ({data_count} 项)")
                            return data
                        else:
                            print(f"❌ {data_type}数据API错误: {data.get('msg', '未知错误')}")
                    except ValueError as json_error:
                        print(f"❌ {data_type}JSON解析错误: {json_error}")
                else:
                    print(f"❌ {data_type}数据HTTP错误: {response.status_code}")

            except Exception as e:
                print(f"❌ {data_type}数据请求异常 (尝试{attempt+1}): {e}")

            if attempt < max_retries - 1:
                wait_time = 1  # 减少重试等待时间
                print(f"⏳ 等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)

        print(f"❌ {data_type}数据获取失败，已尝试 {max_retries} 次")
        return None
    
    def fetch_chart_data(self, base_coin="PEPE", interval="1d", data_type="USD"):
        """获取图表数据"""
        url = f"{self.base_url}/api/openInterest/chart"
        params = {
            'baseCoin': base_coin,
            'interval': interval,
            'type': data_type
        }
        return self.fetch_data_with_retry(url, params, "图表")
    
    def fetch_ticker_data(self, base_coin="PEPE"):
        """获取期货数据"""
        url = f"{self.base_url}/api/tickers"
        params = {'baseCoin': base_coin}
        return self.fetch_data_with_retry(url, params, "期货")
    
    def fetch_spot_data(self, base_coin="PEPE"):
        """获取现货数据"""
        url = f"{self.base_url}/api/tickers/getSpotTickers"
        params = {'baseCoin': base_coin}
        return self.fetch_data_with_retry(url, params, "现货")
    
    def fetch_volume_chart(self, base_coin="PEPE", exchange_name="ALL", interval="1d"):
        """获取24H成交额图表数据"""
        url = f"{self.base_url}/api/volume24h/chart"
        params = {
            "baseCoin": base_coin,
            "exchangeName": exchange_name,
            "interval": interval
        }
        return self.fetch_data_with_retry(url, params, "24H成交额")
    
    def fetch_open_interest_chart(self, base_coin="PEPE", interval="1d", data_type="USD"):
        """获取合约持仓量图表数据"""
        url = f"{self.base_url}/api/openInterest/chart"
        params = {
            "baseCoin": base_coin,
            "interval": interval,
            "type": data_type
        }
        return self.fetch_data_with_retry(url, params, "合约持仓量")
    
    def fetch_long_short_flow(self, base_coin="PEPE", exchange_name="", interval="5m", limit=500):
        """获取净流入数据"""
        url = f"{self.base_url}/api/longshort/buySell"
        params = {
            "exchangeName": exchange_name,
            "interval": interval,
            "baseCoin": base_coin,
            "limit": limit
        }
        return self.fetch_data_with_retry(url, params, "净流入")
    
    def get_complete_token_data(self, token="PEPE"):
        """获取完整的代币数据 - 优化版本：并行请求"""
        print(f"📊 正在获取 {token} 完整数据...")

        # 建立会话
        if not self.establish_session():
            print("❌ 建立会话失败")
            return None

        # 使用线程池并行获取数据
        import concurrent.futures
        import threading

        # 定义所有需要获取的数据
        data_tasks = [
            ('chart_data', lambda: self.fetch_chart_data(token)),
            ('ticker_data', lambda: self.fetch_ticker_data(token)),
            ('spot_data', lambda: self.fetch_spot_data(token)),
            ('oi_chart_data', lambda: self.fetch_open_interest_chart(token)),
            ('volume_chart_data', lambda: self.fetch_volume_chart(token)),
            ('net_flow_data', lambda: self.fetch_long_short_flow(token))
        ]

        results = {}
        success_count = 0

        # 并行执行所有请求
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            # 提交所有任务
            future_to_name = {
                executor.submit(task_func): name
                for name, task_func in data_tasks
            }

            # 收集结果
            for future in concurrent.futures.as_completed(future_to_name):
                name = future_to_name[future]
                try:
                    result = future.result(timeout=15)  # 15秒超时
                    results[name] = result
                    if result:
                        success_count += 1
                        print(f"✅ {name} 获取成功")
                    else:
                        print(f"❌ {name} 获取失败")
                except Exception as e:
                    print(f"❌ {name} 获取异常: {e}")
                    results[name] = None

        print(f"📈 数据获取结果: {success_count}/6 成功")

        if success_count == 0:
            print("❌ 未能获取到任何数据")
            return None

        return {
            'chart_data': results.get('chart_data'),
            'ticker_data': results.get('ticker_data'),
            'spot_data': results.get('spot_data'),
            'oi_chart_data': results.get('oi_chart_data'),
            'volume_chart_data': results.get('volume_chart_data'),
            'net_flow_data': results.get('net_flow_data'),
            'token': token,
            'fetch_time': datetime.now().isoformat()
        }

    def get_basic_token_data(self, token="PEPE"):
        """获取基础代币数据 - 快速版本，获取核心数据但确保图表能显示"""
        print(f"⚡ 快速获取 {token} 基础数据...")

        # 建立会话
        if not self.establish_session():
            print("❌ 建立会话失败")
            return None

        # 获取核心数据：价格图表、期货数据、现货数据（这3个是最重要的）
        import concurrent.futures

        basic_tasks = [
            ('chart_data', lambda: self.fetch_chart_data(token)),
            ('ticker_data', lambda: self.fetch_ticker_data(token)),
            ('spot_data', lambda: self.fetch_spot_data(token))
        ]

        results = {}
        success_count = 0

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            future_to_name = {
                executor.submit(task_func): name
                for name, task_func in basic_tasks
            }

            for future in concurrent.futures.as_completed(future_to_name):
                name = future_to_name[future]
                try:
                    result = future.result(timeout=8)
                    results[name] = result
                    if result:
                        success_count += 1
                        print(f"✅ {name} 获取成功")
                except Exception as e:
                    print(f"❌ {name} 获取异常: {e}")
                    results[name] = None

        if success_count == 0:
            return None

        return {
            'chart_data': results.get('chart_data'),
            'ticker_data': results.get('ticker_data'),
            'spot_data': results.get('spot_data'),
            'oi_chart_data': results.get('chart_data'),  # 复用价格图表数据
            'volume_chart_data': None,  # 稍后获取
            'net_flow_data': None,  # 稍后获取
            'token': token,
            'fetch_time': datetime.now().isoformat(),
            'is_basic': True  # 标记为基础数据
        }


def create_api_client(use_proxy=True, proxy_host='127.0.0.1', proxy_port=10808):
    """创建API客户端实例"""
    return CoinankAPI(use_proxy, proxy_host, proxy_port)


def quick_test():
    """快速测试API连接"""
    print("🧪 快速测试API连接...")
    
    # 尝试不同的代理配置
    configs = [
        (True, '127.0.0.1', 10808),  # SOCKS5代理
        (True, '127.0.0.1', 7890),   # 常用代理端口
        (False, None, None)          # 直连模式
    ]
    
    for use_proxy, host, port in configs:
        print(f"\n🔍 测试配置: 代理={use_proxy}, 主机={host}, 端口={port}")
        
        api = create_api_client(use_proxy, host, port)
        if api.test_connection():
            print("✅ 连接成功，可以使用此配置")
            return api
        else:
            print("❌ 连接失败，尝试下一个配置")
    
    print("❌ 所有配置都失败了")
    return None


if __name__ == "__main__":
    # 测试API
    api = quick_test()
    if api:
        # 测试数据获取
        data = api.get_complete_token_data("PEPE")
        if data:
            print(f"✅ 成功获取到 {data['token']} 数据")
        else:
            print("❌ 数据获取失败") 