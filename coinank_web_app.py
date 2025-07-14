#!/usr/bin/env python3
"""
Coinank Web应用 - 提供实时数据的现代化Web界面
支持多种代币的实时价格、持仓量和市场数据展示
"""

import os
import sys
import time
import json
import socket
import threading
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
import requests
import warnings
warnings.filterwarnings('ignore')

# 解决Windows命令行中的编码问题
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 导入数据获取器
from coin_api import CoinankAPI

# Flask应用配置
app = Flask(__name__)
app.config['SECRET_KEY'] = 'coinank-web-app-secret-key'

# 全局变量
api_client = None
supported_tokens = []  # 动态支持代币，不再限制
current_token = "PEPE"
data_cache = {}
last_update_time = {}
CACHE_DURATION = 300  # 缓存时间（秒）- 5分钟
update_timer = None

def check_port_available(port):
    """检查端口是否可用 - 通过尝试绑定端口"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(('localhost', port))
            return True
    except OSError as e:
        # 端口被占用或其他错误
        return False
    except Exception as e:
        return False

def find_available_port(start_port=5000, max_attempts=10):
    """查找可用端口 - 带调试信息"""
    print(f"🔍 正在查找从{start_port}开始的可用端口...")
    
    for i in range(max_attempts):
        port = start_port + i
        print(f"   检查端口 {port}...", end='')
        
        if check_port_available(port):
            print(f" ✅ 可用")
            return port
        else:
            print(f" ❌ 不可用")
    
    print(f"❌ 检查了 {max_attempts} 个端口，都不可用")
    return None

def initialize_api_client():
    """初始化API客户端"""
    global api_client
    try:
        print("🔧 正在初始化API客户端...")
        
        # 创建API客户端，自动处理代理配置
        api_client = CoinankAPI(use_proxy=True, proxy_host='127.0.0.1', proxy_port=10808)
        
        # 测试连接
        if api_client.test_connection():
            print("✅ API客户端初始化成功")
            return True
        else:
            print("⚠️ 网络连接测试失败，尝试直连模式...")
            api_client = CoinankAPI(use_proxy=False)
            if api_client.test_connection():
                print("✅ 直连模式初始化成功")
                return True
            else:
                print("❌ 所有连接方式都失败")
                return False
    except Exception as e:
        print(f"❌ 初始化API客户端失败: {e}")
        return False

def get_token_data(token):
    """获取代币数据（带缓存）"""
    cache_key = f"{token}_data"
    current_time = time.time()

    # 检查缓存
    if (cache_key in data_cache and
        cache_key in last_update_time and
        current_time - last_update_time[cache_key] < CACHE_DURATION):
        return data_cache[cache_key]

    # 获取新数据
    try:
        print(f"📊 正在获取 {token} 完整数据...")

        # 使用新的API客户端获取数据
        raw_data = api_client.get_complete_token_data(token)

        if not raw_data:
            print(f"❌ 获取 {token} 数据失败 - raw_data为None")
            return None

        print(f"[调试] 原始数据键: {list(raw_data.keys())}")

        # 检查每个数据字段
        for key, value in raw_data.items():
            if isinstance(value, dict):
                success = value.get('success', False)
                data_count = len(value.get('data', [])) if isinstance(value.get('data'), list) else 'N/A'
                print(f"[调试] {key}: success={success}, data_count={data_count}")
            else:
                print(f"[调试] {key}: {type(value)} - {value}")

        # 处理数据
        processed_data = process_data_for_web(
            raw_data.get('chart_data'),
            raw_data.get('ticker_data'),
            raw_data.get('spot_data'),
            raw_data.get('oi_chart_data'),
            raw_data.get('volume_chart_data'),
            raw_data.get('net_flow_data'),
            token
        )

        # 缓存数据
        data_cache[cache_key] = processed_data
        last_update_time[cache_key] = current_time

        return processed_data

    except Exception as e:
        print(f"❌ 获取 {token} 数据失败: {e}")
        import traceback
        print(f"❌ 详细错误信息: {traceback.format_exc()}")
        return None

def get_basic_token_data(token):
    """获取基础代币数据（快速版本）"""
    cache_key = f"{token}_basic_data"
    current_time = time.time()

    # 检查缓存（基础数据缓存时间更短）
    basic_cache_duration = 60  # 1分钟
    if (cache_key in data_cache and
        cache_key in last_update_time and
        current_time - last_update_time[cache_key] < basic_cache_duration):
        return data_cache[cache_key]

    # 获取新的基础数据
    try:
        print(f"⚡ 正在快速获取 {token} 基础数据...")

        # 使用基础数据API
        raw_data = api_client.get_basic_token_data(token)

        if not raw_data:
            print(f"❌ 获取 {token} 基础数据失败")
            return None

        # 处理基础数据 - 只处理已获取的核心数据
        processed_data = process_data_for_web(
            raw_data.get('chart_data'),
            raw_data.get('ticker_data'),
            raw_data.get('spot_data'),
            raw_data.get('oi_chart_data'),  # 复用价格图表数据
            None,  # volume_chart_data 稍后获取
            None,  # net_flow_data 稍后获取
            token
        )

        # 标记为基础数据
        processed_data['is_basic'] = True

        # 缓存基础数据
        data_cache[cache_key] = processed_data
        last_update_time[cache_key] = current_time

        return processed_data

    except Exception as e:
        print(f"❌ 获取 {token} 基础数据失败: {e}")
        return None

def process_data_for_web(chart_data, ticker_data, spot_data, oi_chart_data, volume_chart_data, net_flow_data, token):
    """处理数据用于Web展示"""
    try:
        print(f"[调试] 开始处理数据，输入参数:")
        print(f"[调试] - chart_data: {type(chart_data)} {'有数据' if chart_data else '无数据'}")
        print(f"[调试] - ticker_data: {type(ticker_data)} {'有数据' if ticker_data else '无数据'}")
        print(f"[调试] - spot_data: {type(spot_data)} {'有数据' if spot_data else '无数据'}")
        print(f"[调试] - oi_chart_data: {type(oi_chart_data)} {'有数据' if oi_chart_data else '无数据'}")
        print(f"[调试] - volume_chart_data: {type(volume_chart_data)} {'有数据' if volume_chart_data else '无数据'}")
        print(f"[调试] - net_flow_data: {type(net_flow_data)} {'有数据' if net_flow_data else '无数据'}")

        # 提取价格数据
        price_data = []
        if chart_data and chart_data.get('success'):
            data = chart_data.get('data', {})
            timestamps = data.get('tss', [])
            prices = data.get('prices', [])

            print(f"[调试] 价格数据: timestamps={len(timestamps)}, prices={len(prices)}")

            min_length = min(len(timestamps), len(prices))
            for i in range(min_length):
                if prices[i] and timestamps[i]:
                    price_data.append({
                        'time': timestamps[i],
                        'price': prices[i]
                    })

            print(f"[调试] 处理后价格数据点数: {len(price_data)}")

        # 提取持仓量数据 - 使用新的持仓量API数据
        print(f"[调试] 开始处理持仓量数据...")
        oi_data = []
        oi_time_series = []  # 用于在价格图表上显示的时序数据

        # 优先使用持仓量图表API数据
        if oi_chart_data and oi_chart_data.get('success'):
            print(f"[调试] 使用持仓量图表API数据")
            data = oi_chart_data.get('data', {})

            # 处理时序数据（用于价格图表）
            timestamps = data.get('tss', [])
            data_values = data.get('dataValues', {})

            print(f"[调试] 持仓量数据: timestamps={len(timestamps)}, dataValues_keys={list(data_values.keys()) if data_values else 'None'}")

            if timestamps and data_values and len(data_values) > 0:
                # 为每个时间点计算总持仓量
                for i, timestamp in enumerate(timestamps):
                    total_oi = 0
                    for exchange, values in data_values.items():
                        if i < len(values) and values[i] is not None:
                            total_oi += values[i]

                    if total_oi > 0:
                        oi_time_series.append({
                            'time': timestamp,
                            'value': total_oi
                        })

            # 处理分布数据（用于饼图）
            for exchange, values in data_values.items():
                if values:
                    total_value = sum(v for v in values if v is not None and v > 0)
                    if total_value > 0:
                        oi_data.append({
                            'exchange': exchange,
                            'value': total_value
                        })
                        print(f"[调试] 持仓量API - {exchange}: {total_value}")

        # 如果持仓量API数据为空，回退到期货数据
        if not oi_data and ticker_data:
            print(f"[调试] 持仓量API数据为空，使用期货数据...")
            ticker_list = ticker_data.get('data', [])
            for ticker in ticker_list:
                oi_usd = ticker.get('oiUSD', 0)
                exchange_name = ticker.get('exchangeName', '')
                if oi_usd and oi_usd > 0 and exchange_name:
                    oi_data.append({
                        'exchange': exchange_name,
                        'value': oi_usd
                    })
                    print(f"[调试] 期货持仓量 - {exchange_name}: {oi_usd}")

        print(f"[调试] 最终持仓量分布数据数量: {len(oi_data)}")
        print(f"[调试] 持仓量时序数据数量: {len(oi_time_series)}")

        # 处理净流入数据
        print(f"[调试] 开始处理净流入数据...")
        net_flow_time_series = []
        if net_flow_data and net_flow_data.get('success'):
            print(f"[调试] 使用净流入API数据")

            try:
                data = net_flow_data.get('data', {})
                long_ratios = data.get('longRatios', [])
                short_ratios = data.get('shortRatios', [])
                timestamps = data.get('tss', [])

                print(f"[调试] 多头数据数量: {len(long_ratios)}")
                print(f"[调试] 空头数据数量: {len(short_ratios)}")
                print(f"[调试] 时间戳数量: {len(timestamps)}")

                # 确保所有数组长度一致
                min_length = min(len(long_ratios), len(short_ratios), len(timestamps))
                print(f"[调试] 使用数据长度: {min_length}")

                for i in range(min_length):
                    timestamp = timestamps[i]
                    long_volume = long_ratios[i] if i < len(long_ratios) else 0
                    short_volume = short_ratios[i] if i < len(short_ratios) else 0
                    net_flow = long_volume - short_volume

                    net_flow_time_series.append({
                        'time': timestamp,
                        'value': net_flow,
                        'buy_volume': long_volume,
                        'sell_volume': short_volume
                    })

                    if i < 3:  # 只打印前3个数据点进行调试
                        print(f"[调试] 净流入数据点 {i}: 时间={timestamp}, 多头={long_volume}, 空头={short_volume}, 净流入={net_flow}")

            except Exception as e:
                print(f"[调试] 处理净流入数据时出错: {e}")
                import traceback
                print(f"[调试] 详细错误: {traceback.format_exc()}")
        else:
            print(f"[调试] 净流入数据为空或API调用失败")

        print(f"[调试] 净流入时序数据数量: {len(net_flow_time_series)}")

        # 处理24H成交额数据
        print(f"[调试] 开始处理24H成交额数据...")
        volume_time_series = []
        if volume_chart_data and volume_chart_data.get('success'):
            print(f"[调试] 使用24H成交额API数据")

            try:
                data = volume_chart_data.get('data', {})
                timestamps = data.get('tss', [])
                single_values = data.get('single', [])  # 使用single字段而不是dataValues

                print(f"[调试] 24H成交额时间戳数量: {len(timestamps)}")
                print(f"[调试] 24H成交额数据数量: {len(single_values)}")

                # 确保时间戳和数据数量一致
                min_length = min(len(timestamps), len(single_values))
                print(f"[调试] 使用数据长度: {min_length}")

                for i in range(min_length):
                    timestamp = timestamps[i]
                    volume_value = single_values[i]

                    # 跳过null值
                    if volume_value is not None and volume_value > 0:
                        volume_time_series.append({
                            'time': timestamp,
                            'value': volume_value
                        })

                        if i < 3:  # 只打印前3个数据点进行调试
                            print(f"[调试] 24H成交额数据点 {i}: 时间={timestamp}, 成交额={volume_value}")

            except Exception as e:
                print(f"[调试] 处理24H成交额数据时出错: {e}")
                import traceback
                print(f"[调试] 详细错误: {traceback.format_exc()}")
        else:
            print(f"[调试] 24H成交额数据为空或API调用失败")

        print(f"[调试] 24H成交额时序数据数量: {len(volume_time_series)}")

        # 提取价格数据用于统计
        prices = [item['price'] for item in price_data if item['price'] > 0]

        # 期货市场数据
        futures_data = []
        if ticker_data and ticker_data.get('success'):
            ticker_list = ticker_data.get('data', [])
            print(f"[调试] 原始期货数据数量: {len(ticker_list)}")

            for ticker in ticker_list:
                print(f"[调试] 期货数据: {ticker.get('exchangeName', 'Unknown')} - oiUSD: {ticker.get('oiUSD', 'None')} - price: {ticker.get('lastPrice', 'None')}")

                # 放宽过滤条件，只要有交易所名称就显示
                if ticker.get('exchangeName') and ticker.get('lastPrice', 0) > 0:
                    # 修复fundingRate为None的问题
                    funding_rate = ticker.get('fundingRate', 0)
                    if funding_rate is None:
                        funding_rate = 0

                    futures_data.append({
                        'exchange': ticker.get('exchangeName', ''),
                        'price': ticker.get('lastPrice', 0),
                        'oi_usd': ticker.get('oiUSD', 0),
                        'funding_rate': funding_rate,
                        'volume_24h': ticker.get('turnover24h', 0),
                        'price_change_24h': ticker.get('priceChange24h', 0)
                    })

            print(f"[调试] 过滤后期货数据数量: {len(futures_data)}")
    
        # 现货市场数据
        spot_data_list = []
        if spot_data and spot_data.get('success'):
            spot_list = spot_data.get('data', [])
            print(f"[调试] 原始现货数据数量: {len(spot_list)}")

            for spot in spot_list:
                print(f"[调试] 现货数据: {spot.get('exchangeName', 'Unknown')} - turnover24h: {spot.get('turnover24h', 'None')} - price: {spot.get('lastPrice', 'None')}")

                # 放宽过滤条件，只要有交易所名称就显示
                if spot.get('exchangeName') and spot.get('lastPrice', 0) > 0:
                    spot_data_list.append({
                        'exchange': spot.get('exchangeName', ''),
                        'price': spot.get('lastPrice', 0),
                        'volume_24h': spot.get('turnover24h', 0),
                        'price_change_24h': spot.get('priceChange24h', 0)
                    })

            print(f"[调试] 过滤后现货数据数量: {len(spot_data_list)}")

        # 统计信息
        stats = {
            'current_price': prices[-1] if prices else 0,
            'highest_price': max(prices) if prices else 0,
            'lowest_price': min(prices) if prices else 0,
            'total_oi': sum(item['oi_usd'] for item in futures_data),
            'total_volume': sum(item['volume_24h'] for item in spot_data_list),
            'exchanges_count': len(futures_data),
            'avg_funding_rate': sum(item['funding_rate'] for item in futures_data) / len(futures_data) if futures_data else 0
        }

        if len(prices) > 1:
            stats['price_change_percent'] = ((prices[-1] - prices[0]) / prices[0]) * 100
        else:
            stats['price_change_percent'] = 0

        # 为前端React组件准备数据结构
        # 将净流入时间序列数据转换为前端期望的格式
        net_flow_chart_data = []
        if net_flow_time_series:
            # 取最近的数据点用于图表显示
            recent_data = net_flow_time_series[-50:] if len(net_flow_time_series) > 50 else net_flow_time_series
            for item in recent_data:
                net_flow_chart_data.append({
                    'time': item['time'],
                    'buy_flow': item['buy_volume'],
                    'sell_flow': item['sell_volume'],
                    'net_flow': item['value'],
                    'exchange': 'All'  # 因为这是聚合数据
                })

        # 将24H成交额数据转换为前端期望的格式
        volume_chart_data = []
        if spot_data_list:
            # 按成交额排序，取前10名
            sorted_spot = sorted(spot_data_list, key=lambda x: x.get('volume_24h', 0), reverse=True)[:10]
            for item in sorted_spot:
                volume_chart_data.append({
                    'exchange': item['exchange'],
                    'volume': item['volume_24h']
                })

        # 将期货数据转换为前端期望的格式
        futures_markets = []
        for item in futures_data:
            futures_markets.append({
                'exchange': item['exchange'],
                'price': item['price'],
                'change_24h': item.get('price_change_24h', 0),  # 使用priceChange24h数据
                'open_interest': item.get('open_interest', item.get('oi_usd', 0)),  # 使用oi_usd作为备选
                'volume_24h': item.get('volume_24h', 0)  # 如果没有成交额数据，默认为0
            })

        # 将现货数据转换为前端期望的格式
        spot_markets = []
        for item in spot_data_list:
            spot_markets.append({
                'exchange': item['exchange'],
                'price': item['price'],
                'change_24h': item.get('price_change_24h', 0),  # 使用priceChange24h数据
                'volume_24h': item['volume_24h'],
                'depth': item.get('depth', 0)  # 如果没有深度数据，默认为0
            })

        return {
            'token': token,
            'price_data': price_data,
            'oi_data': oi_data,
            'oi_time_series': oi_time_series,
            'net_flow_time_series': net_flow_time_series,
            'volume_time_series': volume_time_series,
            'futures': futures_data,
            'spot': spot_data_list,
            'stats': stats,
            'update_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            # 为React前端添加的数据结构
            'net_flow': net_flow_chart_data,
            'volume_24h': volume_chart_data,
            'futures_markets': futures_markets,
            'spot_markets': spot_markets
        }

    except Exception as e:
        print(f"❌ 处理数据时出错: {e}")
        import traceback
        print(f"❌ 详细错误信息: {traceback.format_exc()}")

        # 返回基本的空数据结构，确保应用不会崩溃
        return {
            'token': token,
            'price_data': [],
            'oi_data': [],
            'oi_time_series': [],
            'net_flow_time_series': [],
            'volume_time_series': [],
            'futures': [],
            'spot': [],
            'stats': {
                'current_price': 0,
                'highest_price': 0,
                'lowest_price': 0,
                'total_oi': 0,
                'total_volume': 0,
                'exchanges_count': 0,
                'avg_funding_rate': 0,
                'price_change_percent': 0
            },
            'update_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

@app.route('/')
def index():
    """主页 - 返回简单的API状态页面"""
    return jsonify({
        'message': 'Coinank API Server',
        'status': 'running',
        'supported_tokens': supported_tokens,
        'current_token': current_token,
        'frontend_url': 'http://localhost:3000'
    })

@app.route('/api/tokens')
def get_tokens():
    """获取支持的代币列表"""
    return jsonify({
        'success': True,
        'data': supported_tokens
    })

@app.route('/api/token/<token>')
def get_token_api(token):
    """获取特定代币的数据"""
    # 移除代币限制，允许用户输入任意代币
    token = token.upper()  # 转换为大写

    # 检查是否请求基础数据
    basic_only = request.args.get('basic', 'false').lower() == 'true'

    try:
        if basic_only:
            # 获取基础数据
            data = get_basic_token_data(token)
        else:
            # 获取完整数据
            data = get_token_data(token)

        if data:
            # 如果成功获取数据，将代币添加到支持列表中（如果不存在）
            if token not in supported_tokens:
                supported_tokens.append(token)
                print(f"✅ 新增支持代币: {token}")

            return jsonify({
                'success': True,
                'data': data
            })
        else:
            return jsonify({
                'success': False,
                'error': f'输入代币有误：无法获取 {token} 的数据，请检查代币符号是否正确'
            }), 400
    except Exception as e:
        print(f"❌ 获取代币 {token} 数据时发生异常: {e}")
        return jsonify({
            'success': False,
            'error': f'输入代币有误：{token} 数据获取失败，请检查代币符号是否正确'
        }), 400

@app.route('/api/refresh/<token>')
def refresh_token_data(token):
    """刷新特定代币的数据"""
    token = token.upper()  # 转换为大写

    # 清除缓存
    cache_key = f"{token}_data"
    if cache_key in data_cache:
        del data_cache[cache_key]
    if cache_key in last_update_time:
        del last_update_time[cache_key]

    # 重新获取数据
    try:
        data = get_token_data(token)
        if data:
            return jsonify({
                'success': True,
                'data': data
            })
        else:
            return jsonify({
                'success': False,
                'error': f'输入代币有误：无法刷新 {token} 的数据'
            }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'输入代币有误：{token} 数据刷新失败'
        }), 400

@app.route('/api/volume24h/<token>')
def get_volume24h_data(token):
    """获取24H成交量数据"""
    token = token.upper()  # 转换为大写

    # 获取请求参数
    exchange_name = request.args.get('exchangeName', 'ALL')
    interval = request.args.get('interval', '1d')

    # 构建缓存键
    cache_key = f"{token}_volume24h_{exchange_name}_{interval}"
    current_time = time.time()

    # 检查缓存
    if (cache_key in data_cache and
        cache_key in last_update_time and
        current_time - last_update_time[cache_key] < CACHE_DURATION):
        print(f"📊 返回缓存的24H成交量数据: {token}")
        return jsonify({
            'success': True,
            'data': data_cache[cache_key]
        })

    # 获取新数据
    if api_client:
        try:
            volume_data = api_client.fetch_volume_chart(token, exchange_name, interval)
            if volume_data and volume_data.get('success'):
                # 缓存数据
                data_cache[cache_key] = volume_data
                last_update_time[cache_key] = current_time
                print(f"✅ 24H成交量数据获取成功: {token}")
                return jsonify({
                    'success': True,
                    'data': volume_data
                })
            else:
                print(f"❌ 24H成交量数据获取失败: {token}")
                return jsonify({
                    'success': False,
                    'error': 'Failed to fetch volume data'
                }), 500
        except Exception as e:
            print(f"❌ 24H成交量数据获取异常: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    else:
        return jsonify({
            'success': False,
            'error': 'API client not initialized'
        }), 500

@app.route('/api/netflow/<token>')
def get_netflow_data(token):
    """获取净流入数据"""
    token = token.upper()  # 转换为大写

    # 获取请求参数
    exchange_name = request.args.get('exchangeName', '')
    interval = request.args.get('interval', '12h')
    limit = request.args.get('limit', '500')

    # 构建缓存键
    cache_key = f"{token}_netflow_{exchange_name}_{interval}_{limit}"
    current_time = time.time()

    # 检查缓存
    if (cache_key in data_cache and
        cache_key in last_update_time and
        current_time - last_update_time[cache_key] < CACHE_DURATION):
        print(f"📊 返回缓存的净流入数据: {token}")
        cached_data = data_cache[cache_key]
        return jsonify({
            'success': True,
            'data': cached_data.get('data', []) if isinstance(cached_data, dict) else cached_data
        })

    # 获取新数据
    if api_client:
        try:
            netflow_data = api_client.fetch_long_short_flow(token, exchange_name, interval, limit)
            if netflow_data and netflow_data.get('success'):
                # 缓存数据
                data_cache[cache_key] = netflow_data
                last_update_time[cache_key] = current_time
                print(f"✅ 净流入数据获取成功: {token}")
                return jsonify({
                    'success': True,
                    'data': netflow_data.get('data', [])  # 直接返回数据数组
                })
            else:
                print(f"❌ 净流入数据获取失败: {token}")
                return jsonify({
                    'success': False,
                    'error': 'Failed to fetch net flow data'
                }), 500
        except Exception as e:
            print(f"❌ 净流入数据获取异常: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    else:
        return jsonify({
            'success': False,
            'error': 'API client not initialized'
        }), 500

@app.route('/api/openinterest/<token>')
def get_openinterest_data(token):
    """获取合约持仓量数据"""
    token = token.upper()  # 转换为大写

    # 获取请求参数
    interval = request.args.get('interval', '1h')
    data_type = request.args.get('type', 'USD')

    # 构建缓存键
    cache_key = f"{token}_openinterest_{interval}_{data_type}"
    current_time = time.time()

    # 检查缓存
    if (cache_key in data_cache and
        cache_key in last_update_time and
        current_time - last_update_time[cache_key] < CACHE_DURATION):
        print(f"📊 返回缓存的合约持仓量数据: {token}")
        cached_data = data_cache[cache_key]
        return jsonify({
            'success': True,
            'data': cached_data.get('data', {}) if isinstance(cached_data, dict) else cached_data
        })

    # 获取新数据
    if api_client:
        try:
            oi_data = api_client.fetch_chart_data(token, interval, data_type)
            if oi_data and oi_data.get('success'):
                # 缓存数据
                data_cache[cache_key] = oi_data
                last_update_time[cache_key] = current_time
                print(f"✅ 合约持仓量数据获取成功: {token}")
                return jsonify({
                    'success': True,
                    'data': oi_data.get('data', {})  # 直接返回数据对象
                })
            else:
                print(f"❌ 合约持仓量数据获取失败: {token}")
                return jsonify({
                    'success': False,
                    'error': 'Failed to fetch open interest data'
                }), 500
        except Exception as e:
            print(f"❌ 合约持仓量数据获取异常: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    else:
        return jsonify({
            'success': False,
            'error': 'API client not initialized'
        }), 500

def schedule_data_refresh():
    """定时刷新数据"""
    global update_timer

    def refresh_all_tokens():
        """刷新所有支持的代币数据"""
        try:
            for token in supported_tokens:
                print(f"🔄 定时刷新 {token} 数据...")
                # 清除缓存
                cache_keys_to_remove = [key for key in data_cache.keys() if key.startswith(f"{token}_")]
                for key in cache_keys_to_remove:
                    del data_cache[key]
                    if key in last_update_time:
                        del last_update_time[key]

                # 重新获取数据
                data = get_token_data(token)
                if data:
                    print(f"✅ {token} 数据刷新成功")
                else:
                    print(f"❌ {token} 数据刷新失败")
        except Exception as e:
            print(f"❌ 定时刷新数据时出错: {e}")

        # 安排下一次刷新
        schedule_data_refresh()

    # 5分钟后执行刷新
    update_timer = threading.Timer(300.0, refresh_all_tokens)  # 300秒 = 5分钟
    update_timer.daemon = True
    update_timer.start()
    print("⏰ 已安排5分钟后的数据刷新")

def start_background_tasks():
    """启动后台任务"""
    # 启动定时刷新
    schedule_data_refresh()
    print("🔄 后台数据刷新任务已启动")

def kill_process_on_port(port):
    """终止占用端口的进程"""
    try:
        import psutil
        for proc in psutil.process_iter(['pid', 'name', 'connections']):
            try:
                for conn in proc.info['connections']:
                    if conn.laddr.port == port:
                        print(f"发现占用端口{port}的进程: {proc.info['name']} (PID: {proc.info['pid']})")
                        proc.kill()
                        print(f"已终止进程 {proc.info['pid']}")
                        return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except ImportError:
        print("psutil库未安装，无法自动终止进程")
    except Exception as e:
        print(f"终止进程时出错: {e}")
    return False

if __name__ == '__main__':
    print("🚀 启动Coinank Web应用...")
    
    # 处理命令行参数
    import sys
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
            print(f"🔧 使用命令行指定端口: {port}")
        except ValueError:
            print(f"⚠️ 无效端口参数: {sys.argv[1]}，使用默认端口")
            port = find_available_port(5001, 10)
    else:
        # 查找可用端口
        port = find_available_port(5001, 10)
    
    # 初始化API客户端
    if not initialize_api_client():
        print("⚠️ 初始化失败，但将继续启动Web服务器...")

    # 初始化默认支持的代币
    if 'PEPE' not in supported_tokens:
        supported_tokens.append('PEPE')
        print("✅ 已添加默认代币: PEPE")

    if port is None:
        print("⚠️ 自动查找端口失败，尝试使用默认端口5001...")
        port = 5001

        # 再次检查5001端口
        if not check_port_available(5001):
            print("端口5001被占用，尝试终止占用的进程...")
            if kill_process_on_port(5001):
                print("已终止占用进程，使用端口5001")
            else:
                print("无法终止占用进程，强制使用端口5001（Flask会处理端口冲突）")
    
    if port != 5001:
        print(f"✅ 使用端口{port}")
    else:
        print(f"✅ 使用默认端口{port}")
    
    # 启动后台任务
    start_background_tasks()
    
    print("✅ Web应用启动成功!")
    print(f"🌐 访问地址: http://localhost:{port}")
    print(f"🪙 支持的代币: {', '.join(supported_tokens)}")
    
    try:
        # 启动Flask应用
        app.run(host='127.0.0.1', port=port, debug=False)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ 端口{port}被占用，尝试使用其他端口...")
            # 尝试使用端口5002-5010
            for backup_port in range(5002, 5011):
                if check_port_available(backup_port):
                    print(f"✅ 使用备用端口{backup_port}")
                    print(f"🌐 访问地址: http://localhost:{backup_port}")
                    app.run(host='127.0.0.1', port=backup_port, debug=False)
                    break
            else:
                print("❌ 无法找到可用端口，请手动终止占用端口的进程后重试")
                sys.exit(1)
        else:
            print(f"❌ 启动Web服务器失败: {e}")
            print("可能的解决方案:")
            print("1. 检查防火墙设置")
            print("2. 尝试以管理员权限运行")
            print("3. 检查网络配置")
            sys.exit(1)
    except Exception as e:
        print(f"❌ 启动Web服务器失败: {e}")
        print("可能的解决方案:")
        print("1. 检查端口是否被占用")
        print("2. 检查防火墙设置")
        print("3. 尝试以管理员权限运行")
        sys.exit(1)