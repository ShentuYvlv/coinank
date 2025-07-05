"""
Configuration file for coinank replica
"""

# API Configuration
USE_SAMPLE_DATA = True  # Set to False to try live API calls
API_TIMEOUT = 30  # seconds

# Chart Configuration  
CHART_DPI = 300
CHART_WIDTH = 12
CHART_HEIGHT = 6

# Data Configuration
MAX_EXCHANGES_DISPLAY = 8  # Maximum exchanges to show on charts

# Output Configuration
CHARTS_DIR = "./charts"
DATA_DIR = "./data"

# API Headers (may need to be updated)
API_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'client': 'web',
    'token': '',
    'web-version': '101',
    'coinank-apikey': 'LWIzMWUtYzU0Ny1kMjk5LWI2ZDA3Yjc2MzFhYmEyYzkwM2NjfDI4NjI4MDA5NjAxNDAzNDc=',
    'Origin': 'https://coinank.com',
    'Connection': 'keep-alive',
    'Referer': 'https://coinank.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'Priority': 'u=0',
    'TE': 'trailers'
}