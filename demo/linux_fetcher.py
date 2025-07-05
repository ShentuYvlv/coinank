#!/usr/bin/env python3
"""
linux环境下获取的。没有配置代理
"""

import requests
import json
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime
import numpy as np
import time

class CoinankLiveFetcher:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = "https://api.coinank.com"
        self.main_url = "https://coinank.com"
        
    def establish_session(self):
        """建立会话 - 这是关键步骤"""
        print("建立会话...")
        
        main_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        }
        
        try:
            resp = self.session.get(self.main_url, headers=main_headers, timeout=10)
            print(f"✓ 主站响应: {resp.status_code}")
            print(f"✓ 获取Cookies: {len(self.session.cookies)} 个")
            time.sleep(1)  # 模拟真实用户停留
            return True
        except Exception as e:
            print(f"✗ 建立会话失败: {e}")
            return False
    
    def get_api_headers(self):
        """获取API请求头"""
        timestamp = int(time.time() * 10000000)
        uuid_part = "-b31e-c547-d299-b6d07b7631aba2c903cc"
        key_string = f"{uuid_part}|{timestamp}"
        api_key = __import__('base64').b64encode(key_string.encode()).decode()
        
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
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
        }
    
    def fetch_chart_data(self, base_coin="PEPE", interval="1d", data_type="USD"):
        """获取图表数据"""
        url = f"{self.base_url}/api/openInterest/chart"
        params = {
            'baseCoin': base_coin,
            'interval': interval,
            'type': data_type
        }
        
        try:
            resp = self.session.get(url, headers=self.get_api_headers(), params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('success'):
                    print(f"✓ 图表数据获取成功 ({len(data.get('data', {}).get('tss', []))} 个数据点)")
                    return data
                else:
                    print(f"✗ 图表数据失败: {data.get('msg')}")
            else:
                print(f"✗ HTTP错误: {resp.status_code}")
        except Exception as e:
            print(f"✗ 图表数据请求异常: {e}")
        
        return None
    
    def fetch_ticker_data(self, base_coin="PEPE"):
        """获取期货数据"""
        url = f"{self.base_url}/api/tickers"
        params = {'baseCoin': base_coin}
        
        try:
            resp = self.session.get(url, headers=self.get_api_headers(), params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('success'):
                    print(f"✓ 期货数据获取成功 ({len(data.get('data', []))} 个交易所)")
                    return data
                else:
                    print(f"✗ 期货数据失败: {data.get('msg')}")
            else:
                print(f"✗ HTTP错误: {resp.status_code}")
        except Exception as e:
            print(f"✗ 期货数据请求异常: {e}")
        
        return None
    
    def fetch_spot_data(self, base_coin="PEPE"):
        """获取现货数据"""
        url = f"{self.base_url}/api/tickers/getSpotTickers"
        params = {'baseCoin': base_coin}
        
        try:
            resp = self.session.get(url, headers=self.get_api_headers(), params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('success'):
                    print(f"✓ 现货数据获取成功 ({len(data.get('data', []))} 个交易所)")
                    return data
                else:
                    print(f"✗ 现货数据失败: {data.get('msg')}")
            else:
                print(f"✗ HTTP错误: {resp.status_code}")
        except Exception as e:
            print(f"✗ 现货数据请求异常: {e}")
        
        return None
    
    def create_price_chart(self, chart_data, token):
        """创建价格图表"""
        data = chart_data.get('data', {})
        timestamps = data.get('tss', [])
        prices = data.get('prices', [])
        
        if not timestamps or not prices:
            return None
        
        # 处理数据长度不一致问题
        min_length = min(len(timestamps), len(prices))
        timestamps = timestamps[:min_length]
        prices = prices[:min_length]
        
        # 创建图表
        fig, ax = plt.subplots(figsize=(14, 8))
        
        # 转换时间戳
        dates = pd.to_datetime(timestamps, unit='ms')
        
        # 绘制价格线
        ax.plot(dates, prices, linewidth=2.5, color='#2E86AB', alpha=0.9)
        
        # 添加移动平均线
        if len(prices) > 20:
            ma20 = pd.Series(prices).rolling(window=20).mean()
            ax.plot(dates, ma20, linewidth=1.5, color='#F24236', alpha=0.8, label='MA20')
        
        if len(prices) > 50:
            ma50 = pd.Series(prices).rolling(window=50).mean()
            ax.plot(dates, ma50, linewidth=1.5, color='#F6AE2D', alpha=0.8, label='MA50')
        
        # 样式设置
        ax.set_title(f'{token} Real-time Price Chart', fontsize=18, fontweight='bold', pad=20)
        ax.set_xlabel('Date', fontsize=14)
        ax.set_ylabel('Price (USD)', fontsize=14)
        ax.grid(True, alpha=0.3, linestyle='--')
        ax.set_facecolor('#FAFAFA')
        
        # 格式化坐标轴
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:.8f}'))
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=15))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # 添加当前价格标注
        if prices:
            current_price = prices[-1]
            ax.annotate(f'Latest: ${current_price:.8f}', 
                       xy=(dates[-1], current_price),
                       xytext=(20, 20), textcoords='offset points',
                       bbox=dict(boxstyle='round,pad=0.5', fc='#FFE135', alpha=0.8),
                       arrowprops=dict(arrowstyle='->', color='red', lw=1.5))
        
        # 添加图例
        if len(prices) > 20:
            ax.legend(loc='upper left', frameon=True, fancybox=True, shadow=True)
        
        plt.tight_layout()
        return fig
    
    def create_oi_chart(self, chart_data, token):
        """创建持仓量图表"""
        data = chart_data.get('data', {})
        timestamps = data.get('tss', [])
        data_values = data.get('dataValues', {})
        
        if not timestamps or not data_values:
            return None
        
        # 找出有数据的交易所
        valid_exchanges = []
        for exchange, values in data_values.items():
            if values and any(v is not None for v in values):
                valid_exchanges.append(exchange)
        
        if not valid_exchanges:
            return None
        
        # 创建图表
        fig, ax = plt.subplots(figsize=(14, 8))
        
        # 颜色映射
        colors = plt.cm.Set1(np.linspace(0, 1, len(valid_exchanges)))
        
        # 转换时间戳
        dates = pd.to_datetime(timestamps, unit='ms')
        
        # 绘制每个交易所的数据
        for i, exchange in enumerate(valid_exchanges[:8]):  # 限制显示8个
            values = data_values[exchange]
            
            # 处理数据
            min_length = min(len(dates), len(values))
            exchange_dates = dates[:min_length]
            exchange_values = values[:min_length]
            
            # 过滤有效数据
            valid_data = []
            valid_dates = []
            for j, v in enumerate(exchange_values):
                if v is not None and v > 0:
                    valid_data.append(v)
                    valid_dates.append(exchange_dates[j])
            
            if valid_data:
                ax.plot(valid_dates, valid_data, label=exchange, 
                       linewidth=2, color=colors[i], alpha=0.8)
        
        # 样式设置
        ax.set_title(f'{token} Open Interest by Exchange', fontsize=18, fontweight='bold', pad=20)
        ax.set_xlabel('Date', fontsize=14)
        ax.set_ylabel('Open Interest (USD)', fontsize=14)
        ax.grid(True, alpha=0.3, linestyle='--')
        ax.set_facecolor('#FAFAFA')
        
        # 格式化坐标轴
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x/1e6:.1f}M'))
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=15))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # 添加图例
        ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left', frameon=True)
        
        plt.tight_layout()
        return fig
    
    def create_market_overview(self, ticker_data, spot_data, token):
        """创建市场概览"""
        ticker_list = ticker_data.get('data', [])
        spot_list = spot_data.get('data', [])
        
        if not ticker_list or not spot_list:
            return None
        
        # 创建图表
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle(f'{token} Live Market Overview', fontsize=20, fontweight='bold', y=0.98)
        
        # 1. 期货持仓量TOP10
        ticker_df = pd.DataFrame(ticker_list)
        if 'oiUSD' in ticker_df.columns:
            top_oi = ticker_df.nlargest(10, 'oiUSD')
            bars1 = ax1.barh(top_oi['exchangeName'], top_oi['oiUSD']/1e6, color='#2E86AB')
            ax1.set_title('Futures Open Interest (Top 10)', fontsize=14, fontweight='bold')
            ax1.set_xlabel('Open Interest (Million USD)', fontsize=12)
            
            # 添加数值标签
            for bar in bars1:
                width = bar.get_width()
                ax1.text(width + 0.5, bar.get_y() + bar.get_height()/2, 
                        f'{width:.1f}M', ha='left', va='center', fontsize=10)
        
        # 2. 现货交易量饼图
        spot_df = pd.DataFrame(spot_list)
        if 'turnover24h' in spot_df.columns:
            top_vol = spot_df.nlargest(8, 'turnover24h')
            colors2 = plt.cm.Set3(range(len(top_vol)))
            wedges, texts, autotexts = ax2.pie(top_vol['turnover24h'], labels=top_vol['exchangeName'], 
                   autopct=lambda pct: f'{pct:.1f}%' if pct > 5 else '', 
                   startangle=90, colors=colors2)
            ax2.set_title('Spot Volume Distribution (24h)', fontsize=14, fontweight='bold')
        
        # 3. 价格对比
        if 'lastPrice' in ticker_df.columns and 'lastPrice' in spot_df.columns:
            common_exchanges = list(set(ticker_df['exchangeName']) & set(spot_df['exchangeName']))[:8]
            
            if common_exchanges:
                futures_prices = []
                spot_prices = []
                
                for exchange in common_exchanges:
                    f_data = ticker_df[ticker_df['exchangeName'] == exchange]
                    s_data = spot_df[spot_df['exchangeName'] == exchange]
                    
                    f_price = f_data['lastPrice'].iloc[0] if len(f_data) > 0 else 0
                    s_price = s_data['lastPrice'].iloc[0] if len(s_data) > 0 else 0
                    
                    futures_prices.append(f_price)
                    spot_prices.append(s_price)
                
                x = np.arange(len(common_exchanges))
                width = 0.35
                
                ax3.bar(x - width/2, futures_prices, width, label='Futures', color='#F24236', alpha=0.8)
                ax3.bar(x + width/2, spot_prices, width, label='Spot', color='#F6AE2D', alpha=0.8)
                
                ax3.set_title('Price Comparison', fontsize=14, fontweight='bold')
                ax3.set_xlabel('Exchange', fontsize=12)
                ax3.set_ylabel('Price (USD)', fontsize=12)
                ax3.set_xticks(x)
                ax3.set_xticklabels(common_exchanges, rotation=45, ha='right')
                ax3.legend()
                ax3.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:.8f}'))
        
        # 4. 资金费率
        if 'fundingRate' in ticker_df.columns:
            funding_data = ticker_df[ticker_df['fundingRate'].notna()].copy()
            if not funding_data.empty:
                funding_data['fundingRate'] = funding_data['fundingRate'] * 100
                funding_data = funding_data.nlargest(10, 'fundingRate')
                
                colors4 = ['green' if x > 0 else 'red' for x in funding_data['fundingRate']]
                bars4 = ax4.barh(funding_data['exchangeName'], funding_data['fundingRate'], 
                               color=colors4, alpha=0.7)
                
                ax4.set_title('Funding Rates (%)', fontsize=14, fontweight='bold')
                ax4.set_xlabel('Funding Rate (%)', fontsize=12)
                ax4.axvline(x=0, color='black', linestyle='-', linewidth=1)
                
                # 添加数值标签
                for bar in bars4:
                    width = bar.get_width()
                    ax4.text(width + (0.001 if width > 0 else -0.001), 
                           bar.get_y() + bar.get_height()/2,
                           f'{width:.4f}%', ha='left' if width > 0 else 'right', 
                           va='center', fontsize=9)
        
        plt.tight_layout()
        return fig
    
    def save_charts(self, charts, token):
        """保存图表"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        saved_files = []
        
        for name, fig in charts.items():
            if fig:
                filename = f"{token}_{name}_{timestamp}.png"
                fig.savefig(filename, dpi=300, bbox_inches='tight', facecolor='white')
                saved_files.append(filename)
                print(f"✓ 已保存: {filename}")
                plt.close(fig)
        
        return saved_files
    
    def analyze_token(self, token="PEPE"):
        """完整分析一个代币"""
        print(f"\n=== 正在分析 {token} ===")
        
        # 1. 建立会话
        if not self.establish_session():
            return None
        
        # 2. 获取三种数据
        print(f"\n获取 {token} 数据...")
        chart_data = self.fetch_chart_data(token)
        time.sleep(0.5)
        
        ticker_data = self.fetch_ticker_data(token)
        time.sleep(0.5)
        
        spot_data = self.fetch_spot_data(token)
        
        # 3. 检查数据完整性
        success_count = sum([1 for data in [chart_data, ticker_data, spot_data] if data])
        print(f"\n数据获取完成: {success_count}/3 成功")
        
        if success_count == 0:
            print("❌ 未获取到任何数据")
            return None
        
        # 4. 生成图表
        charts = {}
        
        if chart_data:
            print("\n生成价格图表...")
            charts['price'] = self.create_price_chart(chart_data, token)
            charts['open_interest'] = self.create_oi_chart(chart_data, token)
        
        if ticker_data and spot_data:
            print("生成市场概览...")
            charts['market_overview'] = self.create_market_overview(ticker_data, spot_data, token)
        
        # 5. 保存图表
        if charts:
            print("\n保存图表...")
            saved_files = self.save_charts(charts, token)
            
            # 6. 显示统计信息
            self.display_stats(chart_data, ticker_data, spot_data, token)
            
            return saved_files
        
        return None
    
    def display_stats(self, chart_data, ticker_data, spot_data, token):
        """显示统计信息"""
        print(f"\n=== {token} 实时数据分析 ===")
        
        # 价格数据
        if chart_data:
            prices = chart_data.get('data', {}).get('prices', [])
            if prices:
                current_price = prices[-1]
                high_price = max(prices)
                low_price = min(prices)
                print(f"当前价格: ${current_price:.8f}")
                print(f"历史最高: ${high_price:.8f}")
                print(f"历史最低: ${low_price:.8f}")
                
                if len(prices) > 1:
                    change = ((prices[-1] - prices[0]) / prices[0]) * 100
                    print(f"总涨跌幅: {change:+.2f}%")
        
        # 期货数据
        if ticker_data:
            ticker_list = ticker_data.get('data', [])
            total_oi = sum(item.get('oiUSD', 0) for item in ticker_list if item.get('oiUSD'))
            print(f"期货交易所: {len(ticker_list)} 个")
            print(f"总持仓量: ${total_oi:,.2f}")
        
        # 现货数据
        if spot_data:
            spot_list = spot_data.get('data', [])
            total_volume = sum(item.get('turnover24h', 0) for item in spot_list if item.get('turnover24h'))
            print(f"现货交易所: {len(spot_list)} 个")
            print(f"24h总交易量: ${total_volume:,.2f}")


def main():
    print("=== Coinank 实时数据获取器 ===")
    
    fetcher = CoinankLiveFetcher()
    
    # 支持的代币列表
    tokens = ["PEPE", "BTC", "ETH", "DOGE", "SOL"]
    
    print("支持的代币:", ", ".join(tokens))
    
    # 分析PEPE
    result = fetcher.analyze_token("PEPE")
    
    if result:
        print(f"\n✅ 成功! 生成了 {len(result)} 个图表")
        print("图表文件:")
        for file in result:
            print(f"  - {file}")
    else:
        print("\n❌ 分析失败")


if __name__ == "__main__":
    main()