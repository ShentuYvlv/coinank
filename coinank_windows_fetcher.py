#!/usr/bin/env python3
"""
Coinank Windows版数据获取器 - 支持SOCKS5代理
适用于Windows环境，支持VPN代理配置
"""

import requests
import json
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime
import numpy as np
import time
import os
import warnings
warnings.filterwarnings('ignore')

def check_dependencies():
    """检查并提示安装必要的依赖"""
    missing_deps = []
    
    # 检查PySocks
    try:
        import socks
    except ImportError:
        missing_deps.append("PySocks")
    
    if missing_deps:
        print("⚠️  检测到缺少以下依赖库:")
        for dep in missing_deps:
            print(f"   - {dep}")
        print("\n🔧 快速安装命令:")
        print("   pip install PySocks")
        print("   或者: pip install -r requirements.txt")
        print("\n💡 PySocks库用于支持SOCKS5代理，如果不需要代理可以忽略此警告")
        return False
    
    return True

# 设置中文字体支持（Windows）
plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False

class CoinankWindowsFetcher:
    def __init__(self, use_proxy=True, proxy_host='127.0.0.1', proxy_port=10808):
        """
        初始化Windows版获取器
        
        Args:
            use_proxy: 是否使用代理
            proxy_host: 代理主机地址
            proxy_port: 代理端口
        """
        self.session = requests.Session()
        self.base_url = "https://api.coinank.com"
        self.main_url = "https://coinank.com"
        self.proxy_configured = False
        
        # 配置代理
        if use_proxy:
            self.proxy_configured = self.setup_proxy(proxy_host, proxy_port)
        else:
            print("🔧 代理已禁用，使用直连模式")
            # 确保清理任何现有的代理设置
            self.clear_all_proxy_settings()
        
        # Windows路径配置
        self.output_dir = os.path.join(os.getcwd(), 'coinank_output')
        os.makedirs(self.output_dir, exist_ok=True)
        
    def setup_proxy(self, host, port):
        """配置SOCKS5代理"""
        # 首先检查是否有PySocks库
        try:
            import socks
            import socket
            
            # 设置SOCKS5代理
            socks.set_default_proxy(socks.SOCKS5, host, port)
            socket.socket = socks.socksocket
            
            print(f"✓ 已配置SOCKS5代理: {host}:{port}")
            return True
            
        except ImportError:
            print("⚠️  未安装PySocks库，无法使用SOCKS5代理")
            print("🔧 解决方案：")
            print("   1. 安装PySocks: pip install PySocks")
            print("   2. 或者禁用代理 (将main函数中的use_proxy改为False)")
            print("   3. 或者使用HTTP代理端口 (如果你的VPN支持HTTP代理)")
            
            # 询问用户是否要尝试HTTP代理
            try:
                # 尝试测试HTTP代理是否可用
                import requests
                test_session = requests.Session()
                test_session.proxies = {
                    'http': f'http://{host}:{port}',
                    'https': f'http://{host}:{port}'
                }
                
                # 快速测试代理连接
                test_response = test_session.get('http://httpbin.org/ip', timeout=5)
                if test_response.status_code == 200:
                    print(f"✓ 检测到HTTP代理可用，使用HTTP代理: {host}:{port}")
                    self.session.proxies = {
                        'http': f'http://{host}:{port}',
                        'https': f'http://{host}:{port}'
                    }
                    return True
                else:
                    print("✗ HTTP代理测试失败")
                    
            except Exception as e:
                print(f"✗ HTTP代理测试异常: {e}")
            
            print("🚨 代理配置失败，将使用直连模式")
            print("💡 如果需要代理访问，请检查以下设置：")
            print("   - VPN是否正常运行")
            print("   - 代理端口是否正确")
            print("   - 防火墙是否阻止连接")
            return False
            
        except Exception as e:
            print(f"⚠️  代理配置失败: {e}")
            print("将使用直连模式")
            return False
    
    def test_connection(self):
        """测试网络连接"""
        print("测试网络连接...")
        
        try:
            # 测试访问主站
            response = self.session.get(self.main_url, timeout=10)
            if response.status_code == 200:
                print("✓ 网络连接正常")
                return True
            else:
                print(f"✗ 连接失败，状态码: {response.status_code}")
                return False
        except Exception as e:
            print(f"✗ 网络连接错误: {e}")
            
            # 如果是代理错误，尝试使用完全独立的会话
            if "ProxyError" in str(e) or "proxy" in str(e).lower():
                print("🔧 检测到代理错误，尝试使用无代理连接...")
                return self.test_direct_connection()
            
            return False
    
    def test_direct_connection(self):
        """测试直连模式"""
        try:
            # 首先尝试使用urllib来避免系统级代理设置
            print("🔧 尝试使用urllib进行原始连接...")
            import urllib.request
            import urllib.error
            
            # 创建一个明确不使用代理的opener
            proxy_handler = urllib.request.ProxyHandler({})
            opener = urllib.request.build_opener(proxy_handler)
            
            # 设置请求头
            req = urllib.request.Request(
                self.main_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            )
            
            # 尝试连接
            with opener.open(req, timeout=10) as response:
                if response.getcode() == 200:
                    print("✓ urllib直连成功！创建新的requests会话...")
                    
                    # 现在创建一个新的requests会话
                    import requests
                    direct_session = requests.Session()
                    
                    # 明确禁用代理
                    direct_session.proxies = {}
                    direct_session.trust_env = False  # 忽略环境变量
                    
                    # 再次测试requests会话
                    response = direct_session.get(self.main_url, timeout=10)
                    if response.status_code == 200:
                        print("✓ requests会话也成功，切换到无代理连接")
                        self.session = direct_session
                        return True
                    else:
                        print(f"✗ requests会话失败，状态码: {response.status_code}")
                        return False
                else:
                    print(f"✗ urllib连接失败，状态码: {response.getcode()}")
                    return False
                    
        except urllib.error.URLError as e:
            print(f"✗ urllib连接错误: {e}")
        except Exception as e:
            print(f"✗ 直连模式异常: {e}")
            
        # 如果所有方法都失败，提供详细的系统诊断
        print("🚨 所有连接方法都失败，可能的系统级问题:")
        print("   1. 检查系统代理设置 (Windows设置 → 网络和Internet → 代理)")
        print("   2. 检查是否有全局代理软件在运行")
        print("   3. 检查防火墙是否阻止Python网络访问")
        print("   4. 尝试在命令行运行: curl -v https://coinank.com")
        return False
    
    def establish_session(self):
        """建立会话"""
        print("建立coinank会话...")
        
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
            resp = self.session.get(self.main_url, headers=main_headers, timeout=15)
            print(f"✓ 主站响应: {resp.status_code}")
            
            if resp.status_code == 200:
                cookies_count = len(self.session.cookies)
                print(f"✓ 获取到 {cookies_count} 个Cookie")
                time.sleep(1)  # 稍作等待
                return True
            else:
                print(f"✗ 主站访问失败: {resp.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ 建立会话失败: {e}")
            return False
    
    def get_api_headers(self):
        """获取API请求头"""
        # 生成动态API密钥
        timestamp = int(time.time() * 10000000)
        uuid_part = "-b31e-c547-d299-b6d07b7631aba2c903cc"
        key_string = f"{uuid_part}|{timestamp}"
        
        import base64
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
    
    def fetch_data_with_retry(self, url, params, data_type, max_retries=3):
        """带重试的数据获取"""
        for attempt in range(max_retries):
            try:
                headers = self.get_api_headers()
                response = self.session.get(url, headers=headers, params=params, timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        data_count = len(data.get('data', []) if isinstance(data.get('data'), list) 
                                       else data.get('data', {}).get('tss', []))
                        print(f"✓ {data_type}数据获取成功 ({data_count} 项)")
                        return data
                    else:
                        print(f"✗ {data_type}数据API错误: {data.get('msg', '未知错误')}")
                else:
                    print(f"✗ {data_type}数据HTTP错误: {response.status_code}")
                    
            except Exception as e:
                print(f"✗ {data_type}数据请求异常 (尝试{attempt+1}): {e}")
                
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2
                print(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
        
        print(f"✗ {data_type}数据获取失败，已尝试 {max_retries} 次")
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
    
    def create_price_chart(self, chart_data, token):
        """创建价格图表"""
        data = chart_data.get('data', {})
        timestamps = data.get('tss', [])
        prices = data.get('prices', [])
        
        if not timestamps or not prices:
            print("⚠️  价格数据为空")
            return None
        
        # 数据处理
        min_length = min(len(timestamps), len(prices))
        timestamps = timestamps[:min_length]
        prices = prices[:min_length]
        
        # 创建图表
        fig, ax = plt.subplots(figsize=(15, 8))
        
        # 转换时间戳
        dates = pd.to_datetime(timestamps, unit='ms')
        
        # 主价格线
        ax.plot(dates, prices, linewidth=2.5, color='#1f77b4', alpha=0.9, label=f'{token} Price')
        
        # 移动平均线
        if len(prices) > 20:
            ma20 = pd.Series(prices).rolling(window=20).mean()
            ax.plot(dates, ma20, linewidth=1.8, color='#ff7f0e', alpha=0.8, label='MA20')
        
        if len(prices) > 50:
            ma50 = pd.Series(prices).rolling(window=50).mean()
            ax.plot(dates, ma50, linewidth=1.8, color='#2ca02c', alpha=0.8, label='MA50')
        
        # 图表样式
        ax.set_title(f'{token} 实时价格走势图', fontsize=18, fontweight='bold', pad=20)
        ax.set_xlabel('日期', fontsize=14)
        ax.set_ylabel('价格 (USD)', fontsize=14)
        ax.grid(True, alpha=0.3, linestyle='--')
        ax.set_facecolor('#fafafa')
        
        # 格式化坐标轴
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:.8f}'))
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=15))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # 当前价格标注
        if prices:
            current_price = prices[-1]
            ax.annotate(f'当前价格: ${current_price:.8f}', 
                       xy=(dates[-1], current_price),
                       xytext=(20, 20), textcoords='offset points',
                       bbox=dict(boxstyle='round,pad=0.8', fc='yellow', alpha=0.8),
                       arrowprops=dict(arrowstyle='->', color='red', lw=2))
        
        # 图例
        ax.legend(loc='upper left', frameon=True, fancybox=True, shadow=True)
        
        plt.tight_layout()
        return fig
    
    def create_oi_chart(self, chart_data, token):
        """创建持仓量图表"""
        data = chart_data.get('data', {})
        timestamps = data.get('tss', [])
        data_values = data.get('dataValues', {})
        
        if not timestamps or not data_values:
            print("⚠️  持仓量数据为空")
            return None
        
        # 找出有效交易所
        valid_exchanges = []
        for exchange, values in data_values.items():
            if values and any(v is not None and v > 0 for v in values):
                valid_exchanges.append(exchange)
        
        if not valid_exchanges:
            print("⚠️  没有有效的持仓量数据")
            return None
        
        # 创建图表
        fig, ax = plt.subplots(figsize=(15, 9))
        
        # 颜色方案
        colors = plt.cm.tab10(np.linspace(0, 1, len(valid_exchanges)))
        
        # 转换时间戳
        dates = pd.to_datetime(timestamps, unit='ms')
        
        # 绘制每个交易所
        plotted_count = 0
        for i, exchange in enumerate(valid_exchanges[:8]):  # 限制8个交易所
            values = data_values[exchange]
            
            if len(values) > len(dates):
                values = values[:len(dates)]
            elif len(dates) > len(values):
                dates_truncated = dates[:len(values)]
            else:
                dates_truncated = dates
            
            # 过滤有效数据
            valid_data = []
            valid_dates = []
            for j, v in enumerate(values):
                if v is not None and v > 0 and j < len(dates_truncated):
                    valid_data.append(v)
                    valid_dates.append(dates_truncated[j])
            
            if len(valid_data) > 10:  # 至少要有10个数据点
                ax.plot(valid_dates, valid_data, label=exchange, 
                       linewidth=2.2, color=colors[i], alpha=0.8)
                plotted_count += 1
        
        if plotted_count == 0:
            print("⚠️  没有足够的数据绘制持仓量图表")
            plt.close(fig)
            return None
        
        # 图表样式
        ax.set_title(f'{token} 各交易所持仓量对比', fontsize=18, fontweight='bold', pad=20)
        ax.set_xlabel('日期', fontsize=14)
        ax.set_ylabel('持仓量 (USD)', fontsize=14)
        ax.grid(True, alpha=0.3, linestyle='--')
        ax.set_facecolor('#fafafa')
        
        # 格式化坐标轴
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x/1e6:.1f}M'))
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=15))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # 图例
        ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left', frameon=True)
        
        plt.tight_layout()
        return fig
    
    def create_market_dashboard(self, ticker_data, spot_data, token):
        """创建市场仪表板"""
        if not ticker_data or not spot_data:
            print("⚠️  缺少市场数据")
            return None
        
        ticker_list = ticker_data.get('data', [])
        spot_list = spot_data.get('data', [])
        
        if not ticker_list or not spot_list:
            print("⚠️  市场数据为空")
            return None
        
        # 创建子图
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(18, 12))
        fig.suptitle(f'{token} 实时市场仪表板', fontsize=20, fontweight='bold', y=0.98)
        
        # 1. 期货持仓量TOP10
        ticker_df = pd.DataFrame(ticker_list)
        if 'oiUSD' in ticker_df.columns and not ticker_df.empty:
            top_oi = ticker_df.nlargest(10, 'oiUSD')
            bars1 = ax1.barh(top_oi['exchangeName'], top_oi['oiUSD']/1e6, color='#2E86AB')
            ax1.set_title('期货持仓量排行 (TOP10)', fontsize=14, fontweight='bold')
            ax1.set_xlabel('持仓量 (百万美元)', fontsize=12)
            
            # 添加数值标签
            for bar in bars1:
                width = bar.get_width()
                ax1.text(width + max(top_oi['oiUSD'])/1e6*0.01, bar.get_y() + bar.get_height()/2, 
                        f'{width:.1f}M', ha='left', va='center', fontsize=10)
        
        # 2. 现货交易量分布
        spot_df = pd.DataFrame(spot_list)
        if 'turnover24h' in spot_df.columns and not spot_df.empty:
            top_vol = spot_df.nlargest(8, 'turnover24h')
            # 过滤掉交易量太小的
            top_vol = top_vol[top_vol['turnover24h'] > 0]
            
            if not top_vol.empty:
                colors2 = plt.cm.Set3(range(len(top_vol)))
                wedges, texts, autotexts = ax2.pie(
                    top_vol['turnover24h'], 
                    labels=top_vol['exchangeName'], 
                    autopct=lambda pct: f'{pct:.1f}%' if pct > 3 else '', 
                    startangle=90, 
                    colors=colors2
                )
                ax2.set_title('现货交易量分布 (24h)', fontsize=14, fontweight='bold')
        
        # 3. 价格对比（期货vs现货）
        if ('lastPrice' in ticker_df.columns and 'lastPrice' in spot_df.columns and 
            not ticker_df.empty and not spot_df.empty):
            
            # 找共同交易所
            common_exchanges = list(set(ticker_df['exchangeName']) & set(spot_df['exchangeName']))[:8]
            
            if common_exchanges:
                futures_prices = []
                spot_prices = []
                valid_exchanges = []
                
                for exchange in common_exchanges:
                    f_data = ticker_df[ticker_df['exchangeName'] == exchange]
                    s_data = spot_df[spot_df['exchangeName'] == exchange]
                    
                    if not f_data.empty and not s_data.empty:
                        f_price = f_data['lastPrice'].iloc[0]
                        s_price = s_data['lastPrice'].iloc[0]
                        
                        if f_price > 0 and s_price > 0:
                            futures_prices.append(f_price)
                            spot_prices.append(s_price)
                            valid_exchanges.append(exchange)
                
                if valid_exchanges:
                    x = np.arange(len(valid_exchanges))
                    width = 0.35
                    
                    ax3.bar(x - width/2, futures_prices, width, label='期货', color='#F24236', alpha=0.8)
                    ax3.bar(x + width/2, spot_prices, width, label='现货', color='#F6AE2D', alpha=0.8)
                    
                    ax3.set_title('价格对比 (期货 vs 现货)', fontsize=14, fontweight='bold')
                    ax3.set_xlabel('交易所', fontsize=12)
                    ax3.set_ylabel('价格 (USD)', fontsize=12)
                    ax3.set_xticks(x)
                    ax3.set_xticklabels(valid_exchanges, rotation=45, ha='right')
                    ax3.legend()
                    ax3.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:.8f}'))
        
        # 4. 资金费率
        if 'fundingRate' in ticker_df.columns and not ticker_df.empty:
            funding_data = ticker_df[ticker_df['fundingRate'].notna()].copy()
            
            if not funding_data.empty:
                funding_data['fundingRate'] = funding_data['fundingRate'] * 100  # 转为百分比
                funding_data = funding_data.sort_values('fundingRate', ascending=False).head(10)
                
                colors4 = ['green' if x > 0 else 'red' if x < 0 else 'gray' 
                          for x in funding_data['fundingRate']]
                
                bars4 = ax4.barh(funding_data['exchangeName'], funding_data['fundingRate'], 
                               color=colors4, alpha=0.7)
                
                ax4.set_title('资金费率排行 (%)', fontsize=14, fontweight='bold')
                ax4.set_xlabel('资金费率 (%)', fontsize=12)
                ax4.axvline(x=0, color='black', linestyle='-', linewidth=1)
                
                # 添加数值标签
                for bar in bars4:
                    width = bar.get_width()
                    ax4.text(width + (0.002 if width > 0 else -0.002), 
                           bar.get_y() + bar.get_height()/2,
                           f'{width:.4f}%', 
                           ha='left' if width > 0 else 'right', 
                           va='center', fontsize=9)
        
        plt.tight_layout()
        return fig
    
    def save_charts(self, charts, token):
        """保存图表到Windows路径"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        saved_files = []
        
        for name, fig in charts.items():
            if fig:
                filename = f"{token}_{name}_{timestamp}.png"
                filepath = os.path.join(self.output_dir, filename)
                
                try:
                    fig.savefig(filepath, dpi=300, bbox_inches='tight', 
                               facecolor='white', edgecolor='none')
                    saved_files.append(filepath)
                    print(f"✓ 图表已保存: {filepath}")
                except Exception as e:
                    print(f"✗ 保存图表失败 {filename}: {e}")
                finally:
                    plt.close(fig)
        
        return saved_files
    
    def display_stats(self, chart_data, ticker_data, spot_data, token):
        """显示统计信息"""
        print(f"\n{'='*50}")
        print(f"📊 {token} 实时数据分析报告")
        print(f"{'='*50}")
        
        # 价格统计
        if chart_data:
            prices = chart_data.get('data', {}).get('prices', [])
            if prices:
                current = prices[-1]
                highest = max(prices)
                lowest = min(prices)
                
                print(f"💰 价格信息:")
                print(f"   当前价格: ${current:.8f}")
                print(f"   历史最高: ${highest:.8f}")
                print(f"   历史最低: ${lowest:.8f}")
                
                if len(prices) > 1:
                    change = ((current - prices[0]) / prices[0]) * 100
                    trend = "📈" if change > 0 else "📉" if change < 0 else "➡️"
                    print(f"   涨跌幅度: {trend} {change:+.2f}%")
        
        # 期货市场统计
        if ticker_data:
            ticker_list = ticker_data.get('data', [])
            if ticker_list:
                total_oi = sum(item.get('oiUSD', 0) for item in ticker_list if item.get('oiUSD'))
                avg_funding = np.mean([item.get('fundingRate', 0) for item in ticker_list 
                                     if item.get('fundingRate') is not None])
                
                print(f"\n🔮 期货市场:")
                print(f"   交易所数量: {len(ticker_list)} 个")
                print(f"   总持仓量: ${total_oi:,.2f}")
                print(f"   平均资金费率: {avg_funding*100:.4f}%")
        
        # 现货市场统计
        if spot_data:
            spot_list = spot_data.get('data', [])
            if spot_list:
                total_volume = sum(item.get('turnover24h', 0) for item in spot_list 
                                 if item.get('turnover24h'))
                
                print(f"\n💎 现货市场:")
                print(f"   交易所数量: {len(spot_list)} 个")
                print(f"   24h总交易量: ${total_volume:,.2f}")
        
        print(f"\n📁 图表保存路径: {self.output_dir}")
    
    def analyze_token(self, token="PEPE"):
        """完整分析流程"""
        print(f"\n🚀 开始分析 {token.upper()}")
        print("=" * 60)
        
        # 1. 网络测试
        if not self.test_connection():
            return None
        
        # 2. 建立会话
        if not self.establish_session():
            return None
        
        # 3. 获取数据
        print(f"\n📡 正在获取 {token} 的实时数据...")
        
        chart_data = self.fetch_chart_data(token)
        time.sleep(1)
        
        ticker_data = self.fetch_ticker_data(token)
        time.sleep(1)
        
        spot_data = self.fetch_spot_data(token)
        
        # 4. 数据验证
        success_count = sum([1 for data in [chart_data, ticker_data, spot_data] if data])
        print(f"\n📊 数据获取结果: {success_count}/3 成功")
        
        if success_count == 0:
            print("❌ 未能获取到任何数据，请检查网络或代理设置")
            return None
        
        # 5. 生成图表
        print(f"\n🎨 正在生成图表...")
        charts = {}
        
        if chart_data:
            charts['price'] = self.create_price_chart(chart_data, token)
            charts['open_interest'] = self.create_oi_chart(chart_data, token)
        
        if ticker_data and spot_data:
            charts['dashboard'] = self.create_market_dashboard(ticker_data, spot_data, token)
        
        # 6. 保存图表
        valid_charts = {k: v for k, v in charts.items() if v is not None}
        
        if valid_charts:
            saved_files = self.save_charts(valid_charts, token)
            
            # 7. 显示统计
            self.display_stats(chart_data, ticker_data, spot_data, token)
            
            return saved_files
        else:
            print("❌ 未能生成任何图表")
            return None

    def clear_all_proxy_settings(self):
        """清理所有代理设置"""
        try:
            # 清理session代理
            self.session.proxies.clear()
            
            # 清理环境变量代理
            import os
            proxy_env_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
            for var in proxy_env_vars:
                if var in os.environ:
                    del os.environ[var]
            
            # 尝试恢复默认socket设置
            try:
                import socket
                import socks
                # 重置socket为默认设置
                socket.socket = socket._socket.socket
                print("✓ 已清理所有代理设置")
            except:
                # 如果没有socks模块或者设置失败，忽略
                pass
                
        except Exception as e:
            print(f"⚠️  清理代理设置时出现异常: {e}")
            # 创建新的session以确保清理
            self.session = requests.Session()


def main():
    """主函数"""
    print("🌟 Coinank Windows版数据获取器")
    print("💡 支持SOCKS5代理，适配Windows环境")
    print("=" * 60)
    
    # 检查依赖
    print("🔍 检查依赖库...")
    deps_ok = check_dependencies()
    if not deps_ok:
        print("\n" + "=" * 40)
    
    # 代理配置选项
    print("\n🔧 代理配置选项:")
    print("1. 启用SOCKS5代理 (推荐) - 需要安装PySocks")
    print("2. 启用HTTP代理 - 适用于部分VPN")
    print("3. 禁用代理 - 直连模式")
    print("4. 自动检测代理类型")
    
    # 常用代理端口
    common_ports = {
        'socks5': [1080, 10808, 7890],
        'http': [8080, 7890, 10809, 1087]
    }
    
    print(f"\n🌐 常用代理端口:")
    print(f"   SOCKS5: {', '.join(map(str, common_ports['socks5']))}")
    print(f"   HTTP: {', '.join(map(str, common_ports['http']))}")
    
    # 代理配置 - 用户可以修改这些设置
    use_proxy = True  # 是否使用代理
    proxy_host = '127.0.0.1'  # 代理地址
    proxy_port = 10808  # 代理端口
    
    print(f"\n📋 当前配置:")
    print(f"   代理状态: {'启用' if use_proxy else '禁用'}")
    if use_proxy:
        print(f"   代理地址: {proxy_host}:{proxy_port}")
        print(f"   说明: 如果连接失败，请尝试修改 proxy_port 为你的实际代理端口")
    
    # 创建获取器
    print(f"\n🚀 正在初始化获取器...")
    fetcher = CoinankWindowsFetcher(use_proxy, proxy_host, proxy_port)
    
    # 检查代理状态
    if use_proxy and not fetcher.proxy_configured:
        print("\n❌ 代理配置失败")
        print("🔧 解决方案:")
        print("   1. 安装PySocks库: pip install PySocks")
        print("   2. 检查VPN是否运行并确认代理端口")
        print("   3. 或者修改代码中的 use_proxy = False 使用直连模式")
        print("   4. 或者尝试不同的代理端口")
        print(f"   5. 常用端口: {', '.join(map(str, common_ports['socks5'] + common_ports['http']))}")
        
        # 询问是否继续
        print("\n⚠️  是否继续使用直连模式？这可能无法访问coinank.com")
        print("程序将在5秒后自动继续...")
        import time
        time.sleep(5)
    
    # 支持的代币
    supported_tokens = ["PEPE", "BTC", "ETH", "DOGE", "SOL", "SHIB", "WIF"]
    print(f"\n🪙 支持的代币: {', '.join(supported_tokens)}")
    
    # 分析代币
    token = "PEPE"
    print(f"\n🎯 开始分析 {token}")
    result = fetcher.analyze_token(token)
    
    if result:
        print(f"\n✅ 分析完成! 共生成 {len(result)} 个图表")
        print("📁 图表文件:")
        for file_path in result:
            print(f"   📈 {os.path.basename(file_path)}")
        
        # 打开文件夹
        import subprocess
        try:
            subprocess.run(['explorer', fetcher.output_dir], check=True)
            print(f"\n📂 已打开输出文件夹: {fetcher.output_dir}")
        except:
            print(f"\n📂 图表保存在: {fetcher.output_dir}")
    else:
        print(f"\n❌ 分析失败")
        print(f"\n🔧 完整故障排除指南:")
        print(f"   1. 【代理问题】")
        print(f"      - 安装PySocks: pip install PySocks")
        print(f"      - 检查VPN状态和代理端口")
        print(f"      - 常用端口: {', '.join(map(str, common_ports['socks5']))}")
        print(f"   2. 【网络问题】")
        print(f"      - 检查防火墙设置")
        print(f"      - 尝试更换VPN服务器")
        print(f"      - 检查DNS设置")
        print(f"   3. 【代码配置】")
        print(f"      - 修改 use_proxy = False 尝试直连")
        print(f"      - 修改 proxy_port 为你的实际端口")
        print(f"      - 检查代理类型是否匹配")
        print(f"   4. 【其他解决方案】")
        print(f"      - 重启网络连接")
        print(f"      - 使用移动热点测试")
        print(f"      - 检查系统代理设置")


if __name__ == "__main__":
    main()