import ccxt
import pandas as pd
from datetime import datetime
import time

def get_bitcoin_prices():
    # 初始化交易所列表
    exchanges = {}
    
    # 配置币安
    binance_config = {
        'enableRateLimit': True,  # 启用请求频率限制
        'timeout': 30000,  # 增加超时时间到30秒
        'options': {
            'adjustForTimeDifference': True,  # 调整时间差
            'recvWindow': 60000  # 增加接收窗口
        },
        'proxies': {
            'http': 'http://127.0.0.1:10808',
            'https': 'http://127.0.0.1:10808'
        }
    }
    
    try:
        exchanges['binance'] = ccxt.binance(binance_config)
        # 设置请求头
        exchanges['binance'].headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
    except Exception as e:
        print(f"初始化币安时发生错误: {str(e)}")
    
    # 添加其他交易所
    try:
        exchanges['kraken'] = ccxt.kraken({'enableRateLimit': True})
    except Exception as e:
        print(f"初始化Kraken时发生错误: {str(e)}")
        
    try:
        exchanges['coinbase'] = ccxt.coinbase({'enableRateLimit': True})
    except Exception as e:
        print(f"初始化Coinbase时发生错误: {str(e)}")
    
    prices = {}
    
    # 从每个交易所获取BTC/USDT价格
    for exchange_name, exchange in exchanges.items():
        try:
            print(f"正在获取{exchange_name}的数据...")
            
            # 加载市场数据
            exchange.load_markets()
            
            # 获取交易对
            symbol = 'BTC/USDT'
            if symbol not in exchange.symbols:
                print(f"{exchange_name}不支持{symbol}交易对")
                continue
                
            # 获取ticker数据
            ticker = exchange.fetch_ticker(symbol)
            
            prices[exchange_name] = {
                'last': ticker['last'] if ticker['last'] else 0,
                'bid': ticker['bid'] if ticker['bid'] else 0,
                'ask': ticker['ask'] if ticker['ask'] else 0,
                'volume': ticker['baseVolume'] if ticker['baseVolume'] else 0,
                'timestamp': datetime.fromtimestamp(ticker['timestamp']/1000).strftime('%Y-%m-%d %H:%M:%S')
            }
            print(f"{exchange_name}数据获取成功")
            
        except ccxt.NetworkError as e:
            print(f"获取{exchange_name}数据时发生网络错误: {str(e)}")
        except ccxt.ExchangeError as e:
            print(f"获取{exchange_name}数据时发生交易所错误: {str(e)}")
        except Exception as e:
            print(f"获取{exchange_name}数据时发生未知错误: {str(e)}")
            print(f"错误类型: {type(e).__name__}")
        continue
    
    return prices

def display_prices(prices):
    if not prices:
        print("警告：没有获取到任何交易所的数据")
        return
        
    # 将数据转换为DataFrame以便更好地显示
    df = pd.DataFrame(prices).T
    
    # 清屏并显示最新数据
    print("\033[H\033[J")  # 清屏
    print(f"比特币价格监控 - 更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print(df)
    print("=" * 80)
    print("\n可用的交易所:", list(prices.keys()))

def main():
    print('CCXT 版本:', ccxt.__version__)
    
    # 1. 最基础的交易所实例化方式
    exchange = ccxt.binance({
        'enableRateLimit': True,
        'timeout': 30000,  # 超时时间设置为30秒
        'proxies': {
            'http': 'socks5://127.0.0.1:10808',
            'https': 'socks5://127.0.0.1:10808'
        },
        'options': {
            'defaultType': 'spot',  # 现货交易
            'adjustForTimeDifference': True,
            'recvWindow': 60000,
            'warnOnFetchOHLCVLimitArgument': False,
        },
        'headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    })
    
    while True:
        try:
            # 2. 加载市场数据
            markets = exchange.load_markets()
            print('\n支持的交易对数量:', len(exchange.symbols))
            
            # 3. 获取BTC/USDT交易对的ticker
            symbol = 'BTC/USDT'
            ticker = exchange.fetch_ticker(symbol)
            
            # 4. 打印结果
            print(f'\n{symbol} 当前市场数据:')
            print('上次价格:', ticker['last'])
            print('买一价:', ticker['bid'])
            print('卖一价:', ticker['ask'])
            print('24h成交量:', ticker['baseVolume'])
            print('时间:', datetime.fromtimestamp(ticker['timestamp']/1000).strftime('%Y-%m-%d %H:%M:%S'))
            
            # 5. 等待5秒后继续
            print('\n5秒后更新...')
            time.sleep(5)
            
        except ccxt.NetworkError as e:
            print('网络错误:', str(e))
            print('等待10秒后重试...')
            time.sleep(10)
        except ccxt.ExchangeError as e:
            print('交易所错误:', str(e))
            print('等待10秒后重试...')
            time.sleep(10)
        except Exception as e:
            print('其他错误:', str(e))
            print('等待10秒后重试...')
            time.sleep(10)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n程序已停止运行')
