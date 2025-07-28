"""
代理配置文件
用于配置不同的代理设置
"""

import os

# 默认代理配置
DEFAULT_PROXY_CONFIG = {
    'http': 'http://127.0.0.1:10808',
    'https': 'http://127.0.0.1:10808'
}

# 常用代理配置
PROXY_CONFIGS = {
    'v2ray': {
        'http': 'http://127.0.0.1:10808',
        'https': 'http://127.0.0.1:10808'
    }
}

def get_proxy_config(proxy_type='v2ray'):
    """
    获取代理配置
    
    Args:
        proxy_type: 代理类型 ('clash', 'v2ray', 'shadowsocks', 'custom')
    
    Returns:
        dict: 代理配置字典
    """
    # 优先使用环境变量
    if os.getenv('HTTP_PROXY') or os.getenv('HTTPS_PROXY'):
        return {
            'http': os.getenv('HTTP_PROXY', DEFAULT_PROXY_CONFIG['http']),
            'https': os.getenv('HTTPS_PROXY', DEFAULT_PROXY_CONFIG['https'])
        }
    
    # 使用预设配置
    return PROXY_CONFIGS.get(proxy_type, DEFAULT_PROXY_CONFIG)

def test_proxy_connectivity(proxy_config):
    """
    测试代理连通性
    
    Args:
        proxy_config: 代理配置字典
    
    Returns:
        bool: 连通性测试结果
    """
    import urllib.request
    import urllib.error
    
    try:
        # 创建代理handler
        proxy_handler = urllib.request.ProxyHandler(proxy_config)
        opener = urllib.request.build_opener(proxy_handler)
        
        # 测试请求
        test_url = "http://httpbin.org/ip"
        req = urllib.request.Request(test_url)
        
        with opener.open(req, timeout=5) as response:
            if response.getcode() == 200:
                import json
                result = json.loads(response.read().decode('utf-8'))
                print(f"✅ 代理测试成功，IP: {result.get('origin', 'unknown')}")
                return True
                
    except Exception as e:
        print(f"❌ 代理测试失败: {e}")
        return False

def get_best_proxy():
    """
    获取最佳代理配置 - 简化版本，直接返回默认配置

    Returns:
        dict: 代理配置
    """
    # 优先使用环境变量
    if os.getenv('HTTP_PROXY') or os.getenv('HTTPS_PROXY'):
        env_config = get_proxy_config()
        print("🔍 使用环境变量代理配置...")
        return env_config

    # 使用默认配置
    print("🔍 使用默认代理配置...")
    return DEFAULT_PROXY_CONFIG

if __name__ == "__main__":
    print("🧪 代理配置测试")
    print("=" * 50)

    # 测试默认配置
    print("测试默认代理配置:")
    config = get_proxy_config()
    print(f"配置: {config}")
    test_proxy_connectivity(config)

    print("\n" + "=" * 50)
    print("🎯 获取最佳代理:")
    best_proxy = get_best_proxy()
    print(f"最佳代理配置: {best_proxy}")
