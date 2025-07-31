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
import os
from datetime import datetime
from proxy_config import get_proxy_config, get_best_proxy


class CoinankAPI:
    """Coinank API核心类 - 使用urllib直连"""

    def __init__(self, use_proxy=False):
        """
        初始化API客户端 - 默认使用直连模式
        """
        self.base_url = "https://api.coinank.com"
        self.main_url = "https://coinank.com"

        # 代理重试配置
        self.max_proxy_retries = 3
        self.proxy_retry_count = 0
        self.proxy_failed = False

        # 代理配置 - 默认禁用代理，使用直连
        self.use_proxy = use_proxy
        if use_proxy:
            # 获取代理配置
            self.proxy_config = get_best_proxy()
            print(f"🎯 使用代理配置: {self.proxy_config}")
        else:
            self.proxy_config = None
            print(f"🔗 使用直连模式，不使用代理")

        # 会话缓存
        self.session_established = False
        self.last_session_time = 0
        self.session_timeout = 300  # 5分钟会话超时

        # 请求限流控制 - 已禁用，恢复直接并发访问
        # self.last_request_time = 0
        # self.min_request_interval = 1.0  # 最小请求间隔(秒)
        # self.request_count = 0
        # self.max_requests_per_minute = 30  # 每分钟最大请求数
        # self.request_times = []  # 记录请求时间

        # 配置连接方式
        self.setup_connection_with_retry()
        print(f"🔧 使用{'代理' if self.use_proxy else '直连'}模式")
    
    def setup_connection_with_retry(self):
        """配置连接方式 - 优先使用直连模式"""
        if self.use_proxy and not self.proxy_failed:
            # 尝试代理连接，最多重试3次
            for attempt in range(self.max_proxy_retries):
                try:
                    print(f"🔄 尝试代理连接 (第 {attempt + 1}/{self.max_proxy_retries} 次)...")
                    if self.setup_proxy_connection():
                        print("✅ 代理连接配置成功")
                        self.proxy_retry_count = 0  # 重置重试计数
                        return
                    else:
                        self.proxy_retry_count += 1
                        if attempt < self.max_proxy_retries - 1:
                            # 注释：已禁用代理重试延迟
                            # wait_time = (attempt + 1) * 2  # 递增等待时间
                            # print(f"⏳ 代理连接失败，等待 {wait_time} 秒后重试...")
                            # time.sleep(wait_time)
                            print(f"🔄 代理连接失败，立即重试 (已禁用延迟)...")

                except Exception as e:
                    self.proxy_retry_count += 1
                    print(f"❌ 代理连接异常 (第 {attempt + 1} 次): {e}")
                    if attempt < self.max_proxy_retries - 1:
                        # 注释：已禁用代理异常重试延迟
                        # wait_time = (attempt + 1) * 2
                        # print(f"⏳ 等待 {wait_time} 秒后重试...")
                        # time.sleep(wait_time)
                        print(f"🔄 代理异常，立即重试 (已禁用延迟)...")

            # 代理重试失败，标记为失败并切换到直连
            print(f"❌ 代理连接重试 {self.max_proxy_retries} 次均失败，切换到直连模式")
            self.proxy_failed = True
            self.use_proxy = False

        # 使用直连（默认模式）
        try:
            print("🔗 配置直连模式...")
            self.setup_direct_connection()
            print("✅ 直连配置完成")
        except Exception as e:
            print(f"❌ 直连配置失败: {e}")
            # 使用默认opener作为最后的回退
            self.opener = urllib.request.build_opener()

    def setup_connection(self):
        """配置连接方式 - 兼容旧方法"""
        return self.setup_connection_with_retry()

    def setup_proxy_connection(self):
        """配置代理连接"""
        try:
            print(f"🔄 尝试配置代理: {self.proxy_config}")

            # 测试代理连接
            if not self.test_proxy():
                return False

            # 创建代理handler
            proxy_handler = urllib.request.ProxyHandler(self.proxy_config)
            self.opener = urllib.request.build_opener(proxy_handler)

            # 设置User-Agent等头部
            self.opener.addheaders = [
                ('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
                ('Accept', 'application/json, text/plain, */*'),
                ('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8'),
                ('Accept-Encoding', 'gzip, deflate, br'),
                ('Connection', 'keep-alive'),
                ('Cache-Control', 'no-cache'),
                ('Pragma', 'no-cache')
            ]

            return True

        except Exception as e:
            print(f"❌ 代理配置失败: {e}")
            return False

    def setup_direct_connection(self):
        """配置直连"""
        try:
            # 创建无代理的opener
            proxy_handler = urllib.request.ProxyHandler({})
            self.opener = urllib.request.build_opener(proxy_handler)

            # 设置User-Agent等头部
            self.opener.addheaders = [
                ('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
                ('Accept', 'application/json, text/plain, */*'),
                ('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8'),
                ('Accept-Encoding', 'gzip, deflate, br'),
                ('Connection', 'keep-alive'),
                ('Cache-Control', 'no-cache'),
                ('Pragma', 'no-cache')
            ]

        except Exception as e:
            print(f"❌ 直连配置失败: {e}")
            raise

    def test_proxy(self, timeout=10):
        """测试代理连接 - 增强版本"""
        try:
            print("🧪 测试代理连接...")

            # 创建临时的代理opener进行测试
            proxy_handler = urllib.request.ProxyHandler(self.proxy_config)
            test_opener = urllib.request.build_opener(proxy_handler)

            # 设置请求头
            test_opener.addheaders = [
                ('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
                ('Accept', 'application/json, text/plain, */*'),
                ('Connection', 'keep-alive')
            ]

            # 测试多个URL，提高成功率
            test_urls = [
                "http://httpbin.org/ip",
                "https://api.ipify.org?format=json",
                "http://ip-api.com/json"
            ]

            for test_url in test_urls:
                try:
                    req = urllib.request.Request(test_url)
                    with test_opener.open(req, timeout=timeout) as response:
                        if response.getcode() == 200:
                            content = response.read().decode('utf-8')
                            try:
                                result = json.loads(content)
                                ip = result.get('origin') or result.get('ip') or result.get('query', 'unknown')
                                print(f"✅ 代理测试成功，IP: {ip}")
                                return True
                            except json.JSONDecodeError:
                                # 如果不是JSON，但状态码是200，也认为成功
                                print(f"✅ 代理测试成功 (非JSON响应)")
                                return True
                except Exception as url_error:
                    print(f"⚠️ 测试URL {test_url} 失败: {url_error}")
                    continue

            print("❌ 所有测试URL均失败")
            return False

        except Exception as e:
            print(f"❌ 代理测试失败: {e}")
            return False

    def rate_limit_check(self):
        """检查请求限流 - 已禁用，直接返回"""
        # 注释：已禁用所有限流机制，恢复直接并发访问
        pass
        # current_time = time.time()

        # # 清理1分钟前的请求记录
        # self.request_times = [t for t in self.request_times if current_time - t < 60]

        # # 检查每分钟请求数限制
        # if len(self.request_times) >= self.max_requests_per_minute:
        #     wait_time = 60 - (current_time - self.request_times[0])
        #     if wait_time > 0:
        #         print(f"⏳ 请求限流，等待 {wait_time:.1f} 秒...")
        #         time.sleep(wait_time)

        # # 检查最小请求间隔
        # if current_time - self.last_request_time < self.min_request_interval:
        #     wait_time = self.min_request_interval - (current_time - self.last_request_time)
        #     time.sleep(wait_time)

        # # 记录请求时间
        # self.request_times.append(time.time())
        # self.last_request_time = time.time()

    def get_connection_status(self):
        """获取连接状态信息"""
        return {
            'use_proxy': self.use_proxy,
            'proxy_failed': self.proxy_failed,
            'proxy_retry_count': self.proxy_retry_count,
            'max_proxy_retries': self.max_proxy_retries,
            'proxy_config': self.proxy_config if self.use_proxy else None,
            'connection_type': '代理' if self.use_proxy else '直连',
            'status': '正常' if not self.proxy_failed else '代理失败-已切换直连'
        }

    def test_connection(self):
        """测试网络连接 - 支持代理"""
        connection_type = "代理" if self.use_proxy else "直连"
        print(f"🧪 测试网络连接 ({connection_type})...")

        try:
            # 应用请求限流 - 已禁用
            # self.rate_limit_check()

            req = urllib.request.Request(
                self.main_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            )

            with self.opener.open(req, timeout=10) as response:
                if response.getcode() == 200:
                    print(f"✅ 网络连接正常 ({connection_type})")
                    return True
                else:
                    print(f"❌ 连接失败，状态码: {response.getcode()}")
                    return False

        except Exception as e:
            print(f"❌ 网络连接错误 ({connection_type}): {e}")

            # 如果代理失败，尝试切换到直连
            if self.use_proxy:
                print("🔄 代理连接失败，尝试切换到直连...")
                self.use_proxy = False
                self.setup_direct_connection()
                return self.test_connection()

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
        """带重试的数据获取 - 支持代理和限流"""
        for attempt in range(max_retries):
            try:
                # 应用请求限流 - 已禁用
                # self.rate_limit_check()

                # 如果是代理失败导致的重试，尝试重新配置连接
                if attempt > 0 and self.use_proxy and self.proxy_retry_count > 0:
                    print(f"🔄 第 {attempt + 1} 次重试，检查代理连接...")
                    if not self.test_proxy(timeout=5):
                        print("⚠️ 代理连接异常，尝试重新配置...")
                        self.setup_connection_with_retry()

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
                # 注释：已禁用重试延迟，直接重试
                # wait_time = 2
                # print(f"⏳ 等待 {wait_time} 秒后重试...")
                # time.sleep(wait_time)
                print(f"🔄 立即重试 (已禁用延迟)...")

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

    def fetch_coin_detail(self, base_coin="PEPE"):
        """获取代币详细信息"""
        url = f"{self.base_url}/api/instruments/coinDetail"
        params = {
            'baseCoin': base_coin
        }

        print(f"🔍 获取 {base_coin} 代币详情，参数: {params}")

        return self.fetch_data_with_retry(url, params, "代币详情")

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

        # 并行执行所有请求 - 提高并发度
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
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

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
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


def create_api_client(use_proxy=False):
    """创建API客户端实例 - 默认使用直连"""
    return CoinankAPI(use_proxy=use_proxy)


def quick_test(use_proxy=False):
    """快速测试API连接 - 默认使用直连"""
    connection_type = "代理" if use_proxy else "直连"
    print(f"🧪 快速测试API连接 ({connection_type})...")

    api = create_api_client(use_proxy=use_proxy)
    if api.test_connection():
        print(f"✅ {connection_type}连接成功")
        return api
    else:
        print(f"❌ {connection_type}连接失败")
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