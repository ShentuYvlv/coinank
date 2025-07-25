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
import urllib.parse
import gzip
import io
from datetime import datetime


class CoinankAPI:
    """Coinank API核心类 - 使用urllib直连"""

    def __init__(self):
        """
        初始化API客户端 - 使用urllib直连
        """
        self.base_url = "https://api.coinank.com"
        self.main_url = "https://coinank.com"

        # 会话缓存
        self.session_established = False
        self.last_session_time = 0
        self.session_timeout = 300  # 5分钟会话超时

        # 配置urllib直连
        self.setup_urllib_direct()
        print("🔧 使用urllib直连模式")
    
    def setup_urllib_direct(self):
        """配置urllib直连"""
        try:
            # 创建无代理的opener
            proxy_handler = urllib.request.ProxyHandler({})
            self.opener = urllib.request.build_opener(proxy_handler)
            print("✅ urllib直连配置完成")
        except Exception as e:
            print(f"❌ urllib配置失败: {e}")
            # 使用默认opener
            self.opener = urllib.request.build_opener()
    
    def test_connection(self):
        """测试网络连接 - 使用urllib"""
        print("� 测试网络连接...")

        try:
            req = urllib.request.Request(
                self.main_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            )

            with self.opener.open(req, timeout=10) as response:
                if response.getcode() == 200:
                    print("✅ 网络连接正常")
                    return True
                else:
                    print(f"❌ 连接失败，状态码: {response.getcode()}")
                    return False

        except Exception as e:
            print(f"❌ 网络连接错误: {e}")
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        }

        try:
            req = urllib.request.Request(self.main_url, headers=main_headers)

            with self.opener.open(req, timeout=10) as response:
                if response.getcode() == 200:
                    print(f"✅ 主站响应: {response.getcode()}")
                    print("✅ urllib直连成功")

                    # 更新会话状态
                    self.session_established = True
                    self.last_session_time = current_time

                    return True
                else:
                    print(f"❌ 主站访问失败: {response.getcode()}")
                    self.session_established = False
                    return False

        except Exception as e:
            print(f"❌ 建立会话失败: {e}")
            self.session_established = False
            return False
    
    def get_api_headers(self):
        """获取API请求头 - 使用与fund.py相同的成功配置"""
        timestamp = int(time.time() * 10000000)
        uuid_part = "-b31e-c547-d299-b6d07b7631aba2c903cc"
        key_string = f"{uuid_part}|{timestamp}"
        
        api_key = base64.b64encode(key_string.encode()).decode()
        
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'client': 'web',
            'web-version': '101',
            'coinank-apikey': api_key,
            'Origin': 'https://coinank.com',
            'Connection': 'keep-alive',
            'Referer': 'https://coinank.com/',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'TE': 'trailers'
        }
    
    def fetch_data_with_retry(self, url, params, data_type, max_retries=2, allow_empty_response=False):
        """带重试的数据获取 - 使用urllib直连"""
        for attempt in range(max_retries):
            try:
                headers = self.get_api_headers()

                # 构建完整URL
                query_string = urllib.parse.urlencode(params)
                full_url = f"{url}?{query_string}"

                print(f"🔍 {data_type}请求: {full_url}")

                req = urllib.request.Request(full_url, headers=headers)

                with self.opener.open(req, timeout=10) as response:
                    print(f"📊 响应状态: {response.getcode()}")

                    if response.getcode() == 200:
                        # 检查响应内容类型
                        content_type = response.headers.get('content-type', '').lower()
                        if 'application/json' not in content_type:
                            print(f"⚠️ {data_type}响应不是JSON格式: {content_type}")
                            continue

                        try:
                            # 读取响应数据
                            response_data = response.read()

                            # 检查是否是gzip压缩
                            if response_data[:2] == b'\x1f\x8b':
                                # 解压gzip数据
                                response_data = gzip.decompress(response_data)

                            # 解码为字符串
                            response_text = response_data.decode('utf-8')
                            data = json.loads(response_text)

                            if data.get('success'):
                                data_count = len(data.get('data', []) if isinstance(data.get('data'), list)
                                               else data.get('data', {}).get('tss', []))
                                print(f"✅ {data_type}数据获取成功 ({data_count} 项)")
                                return data
                            else:
                                error_msg = data.get('msg', '未知错误')
                                print(f"❌ {data_type}数据API错误: {error_msg}")

                                # 对于某些特定错误，可以返回空响应而不是失败
                                if allow_empty_response and ('invalid params' in error_msg.lower() or 'not found' in error_msg.lower()):
                                    print(f"⚠️ {data_type}数据不可用，返回空响应")
                                    return {
                                        'success': True,
                                        'data': {},
                                        'msg': f'{data_type}数据暂不可用'
                                    }
                        except (ValueError, json.JSONDecodeError) as json_error:
                            print(f"❌ {data_type}JSON解析错误: {json_error}")
                    else:
                        print(f"❌ {data_type}数据HTTP错误: {response.getcode()}")

            except Exception as e:
                print(f"❌ {data_type}数据请求异常 (尝试{attempt+1}): {e}")

            if attempt < max_retries - 1:
                wait_time = 2
                print(f"⏳ 等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)

        print(f"❌ {data_type}数据获取失败，已尝试 {max_retries} 次")
        
        # 如果允许空响应，返回空数据而不是None
        if allow_empty_response:
            print(f"⚠️ 返回 {data_type} 空响应作为降级处理")
            return {
                'success': True,
                'data': {},
                'msg': f'{data_type}数据暂不可用'
            }
        
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
        """获取期货数据 - 使用urllib直连"""
        url = f"{self.base_url}/api/tickers"
        params = {'baseCoin': base_coin}

        # 构建完整URL
        query_string = urllib.parse.urlencode(params)
        full_url = f"{url}?{query_string}"

        print(f"🔍 获取期货数据: {full_url}")

        try:
            headers = self.get_api_headers()
            req = urllib.request.Request(full_url, headers=headers)

            with self.opener.open(req, timeout=10) as response:
                print(f"📊 响应状态: {response.getcode()}")

                if response.getcode() == 200:
                    # 检查响应内容类型
                    content_type = response.headers.get('content-type', '').lower()
                    if 'application/json' not in content_type:
                        print(f"⚠️ 期货数据响应不是JSON格式: {content_type}")
                        return None

                    try:
                        # 读取响应数据
                        response_data = response.read()

                        # 检查是否是gzip压缩
                        if response_data[:2] == b'\x1f\x8b':
                            # 解压gzip数据
                            response_data = gzip.decompress(response_data)

                        # 解码为字符串
                        response_text = response_data.decode('utf-8')
                        data = json.loads(response_text)
                        if data.get('success'):
                            data_count = len(data.get('data', []))
                            print(f"✅ 期货数据获取成功 ({data_count} 项)")
                            return data
                        else:
                            error_msg = data.get('msg', '未知错误')
                            print(f"❌ 期货数据API错误: {error_msg}")
                            return None
                    except (ValueError, json.JSONDecodeError) as json_error:
                        print(f"❌ 期货数据JSON解析错误: {json_error}")
                        return None
                else:
                    print(f"❌ 期货数据HTTP错误: {response.getcode()}")
                    return None

        except Exception as e:
            print(f"❌ 期货数据请求异常: {e}")
            return None

    def fetch_spot_data(self, base_coin="PEPE"):
        """获取现货数据 - 使用urllib直连"""
        url = f"{self.base_url}/api/tickers/getSpotTickers"
        params = {'baseCoin': base_coin}

        # 构建完整URL
        query_string = urllib.parse.urlencode(params)
        full_url = f"{url}?{query_string}"

        print(f"🔍 获取现货数据: {full_url}")

        try:
            headers = self.get_api_headers()
            req = urllib.request.Request(full_url, headers=headers)

            with self.opener.open(req, timeout=10) as response:
                print(f"📊 响应状态: {response.getcode()}")

                if response.getcode() == 200:
                    # 检查响应内容类型
                    content_type = response.headers.get('content-type', '').lower()
                    if 'application/json' not in content_type:
                        print(f"⚠️ 现货数据响应不是JSON格式: {content_type}")
                        return None

                    try:
                        # 读取响应数据
                        response_data = response.read()

                        # 检查是否是gzip压缩
                        if response_data[:2] == b'\x1f\x8b':
                            # 解压gzip数据
                            response_data = gzip.decompress(response_data)

                        # 解码为字符串
                        response_text = response_data.decode('utf-8')
                        data = json.loads(response_text)
                        if data.get('success'):
                            data_count = len(data.get('data', []))
                            print(f"✅ 现货数据获取成功 ({data_count} 项)")
                            return data
                        else:
                            error_msg = data.get('msg', '未知错误')
                            print(f"❌ 现货数据API错误: {error_msg}")
                            return None
                    except (ValueError, json.JSONDecodeError) as json_error:
                        print(f"❌ 现货数据JSON解析错误: {json_error}")
                        return None
                else:
                    print(f"❌ 现货数据HTTP错误: {response.getcode()}")
                    return None

        except Exception as e:
            print(f"❌ 现货数据请求异常: {e}")
            return None
    
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
    
    def fetch_funding_rate_chart(self, base_coin="PEPE", exchange_type="USDT", funding_type=1, interval="5m"):
        """获取资金费率图表数据 - 支持降级处理"""
        url = f"{self.base_url}/api/fundingRate/chartsV2"
        params = {
            'baseCoin': base_coin,
            'exchangeType': exchange_type,
            'fundingType': funding_type,
            'interval': interval
        }
        
        print(f"🔍 获取 {base_coin} 资金费率图表数据，参数: {params}")
        
        # 使用允许空响应的选项，避免某些代币不支持时导致API失败
        return self.fetch_data_with_retry(url, params, "资金费率图表", max_retries=2, allow_empty_response=True)
    
    def fetch_funding_rate_history(self, base_coin="PEPE", exchange_type="USDT"):
        """获取资金费率历史数据 - 支持降级处理"""
        url = f"{self.base_url}/api/fundingRate/hist"
        params = {
            'baseCoin': base_coin,
            'exchangeType': exchange_type
        }
        
        print(f"🔍 获取 {base_coin} 资金费率历史数据，参数: {params}")
        
        # 使用允许空响应的选项，避免某些代币不支持时导致API失败
        return self.fetch_data_with_retry(url, params, "资金费率历史", max_retries=2, allow_empty_response=True)
    
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
            ('net_flow_data', lambda: self.fetch_long_short_flow(token)),
            ('funding_rate_chart', lambda: self.fetch_funding_rate_chart(token)),
            ('funding_rate_history', lambda: self.fetch_funding_rate_history(token))
        ]

        results = {}
        success_count = 0

        # 并行执行所有请求
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
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

        print(f"📈 数据获取结果: {success_count}/8 成功")

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
            'funding_rate_chart': results.get('funding_rate_chart'),
            'funding_rate_history': results.get('funding_rate_history'),
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
            'funding_rate_chart': None,  # 稍后获取（基础版本不包含）
            'funding_rate_history': None,  # 稍后获取（基础版本不包含）
            'token': token,
            'fetch_time': datetime.now().isoformat(),
            'is_basic': True  # 标记为基础数据
        }


def create_api_client():
    """创建API客户端实例 - 使用urllib直连"""
    return CoinankAPI()


def quick_test():
    """快速测试API连接 - 使用urllib直连"""
    print("🧪 快速测试API连接...")

    api = create_api_client()
    if api.test_connection():
        print("✅ urllib直连成功")
        return api
    else:
        print("❌ urllib直连失败")
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