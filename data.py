#!/usr/bin/env python3
"""
数据获取脚本 - 从coinank API获取期货和现货数据
基于coin_api.py的连接方式实现
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


class DataFetcher:
    """数据获取类 - 使用urllib直连方式"""

    def __init__(self):
        """
        初始化数据获取客户端 - 使用urllib直连
        """
        self.base_url = "https://api.coinank.com"
        self.main_url = "https://coinank.com"

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

    def establish_session(self):
        """建立会话 - 使用urllib"""
        print("🔗 建立coinank会话...")

        try:
            req = urllib.request.Request(
                self.main_url,
                headers={
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
            )

            with self.opener.open(req, timeout=10) as response:
                if response.getcode() == 200:
                    print(f"✅ 主站响应: {response.getcode()}")
                    print("✅ urllib直连成功")
                    return True
                else:
                    print(f"❌ 主站访问失败: {response.getcode()}")
                    return False

        except Exception as e:
            print(f"❌ 建立会话失败: {e}")
            return False

    def get_api_headers(self):
        """获取API请求头"""
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

    def fetch_futures_data(self, base_coin="PEPE"):
        """获取期货数据 - 使用urllib"""
        url = f"{self.base_url}/api/tickers"
        params = {'baseCoin': base_coin}

        # 构建完整URL
        query_string = urllib.parse.urlencode(params)
        full_url = f"{url}?{query_string}"

        print(f"� 获取期货数据: {full_url}")

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
        """获取现货数据 - 使用urllib"""
        url = f"{self.base_url}/api/tickers/getSpotTickers"
        params = {'baseCoin': base_coin}

        # 构建完整URL
        query_string = urllib.parse.urlencode(params)
        full_url = f"{url}?{query_string}"

        print(f"� 获取现货数据: {full_url}")

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

    def print_data_summary(self, data, data_type):
        """打印数据摘要"""
        if not data or not data.get('success'):
            print(f"❌ {data_type}数据无效")
            return

        print(f"\n{'='*50}")
        print(f"📊 {data_type}数据摘要")
        print(f"{'='*50}")

        data_list = data.get('data', [])
        if not data_list:
            print(f"⚠️ {data_type}数据为空")
            return

        print(f"📈 数据条数: {len(data_list)}")

        # 打印前3条数据作为示例
        for i, item in enumerate(data_list[:3]):
            print(f"\n📋 第{i+1}条数据:")
            for key, value in item.items():
                print(f"  {key}: {value}")

        if len(data_list) > 3:
            print(f"\n... 还有 {len(data_list) - 3} 条数据")


def main():
    """主函数"""
    print("🚀 开始获取coinank数据...")
    print(f"⏰ 当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # 创建数据获取器 - 使用urllib直连
    fetcher = DataFetcher()

    # 建立会话
    if not fetcher.establish_session():
        print("❌ 建立会话失败，退出程序")
        return

    # 设置要查询的代币
    base_coin = "PEPE"
    print(f"\n🪙 查询代币: {base_coin}")

    # 获取期货数据
    print(f"\n{'='*60}")
    print("📈 获取期货数据")
    print(f"{'='*60}")
    futures_data = fetcher.fetch_futures_data(base_coin)
    if futures_data:
        fetcher.print_data_summary(futures_data, "期货")

    # 获取现货数据
    print(f"\n{'='*60}")
    print("💰 获取现货数据")
    print(f"{'='*60}")
    spot_data = fetcher.fetch_spot_data(base_coin)
    if spot_data:
        fetcher.print_data_summary(spot_data, "现货")

    # 总结
    print(f"\n{'='*60}")
    print("📊 数据获取总结")
    print(f"{'='*60}")
    print(f"期货数据: {'✅ 成功' if futures_data else '❌ 失败'}")
    print(f"现货数据: {'✅ 成功' if spot_data else '❌ 失败'}")
    print(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()