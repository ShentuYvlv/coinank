/**
 * Coinank Live - 交互式实时数据应用
 * 提供丝滑的用户体验和实时数据更新
 */

class CoinankApp {
    constructor() {
        this.currentToken = window.COINANK_CONFIG.currentToken;
        this.supportedTokens = window.COINANK_CONFIG.supportedTokens;
        this.wsUrl = window.COINANK_CONFIG.wsUrl;
        this.socket = null;
        this.charts = {};
        this.data = null;
        this.isLoading = false;
        this.timeRangePercent = 100; // 时间范围百分比
        this.showPrice = true;
        this.showOI = true;
        
        this.init();
    }

    async init() {
        console.log('🚀 Coinank应用初始化...');
        
        // 绑定事件
        this.bindEvents();
        
        // 连接WebSocket
        this.connectWebSocket();
        
        // 加载初始数据
        await this.loadTokenData(this.currentToken);
        
        console.log('✅ Coinank应用初始化完成');
    }

    bindEvents() {
        // 代币选择器
        document.querySelectorAll('.token-selector').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const token = e.target.dataset.token;
                this.switchToken(token);
            });
        });

        // 时间范围选择器
        document.querySelectorAll('[data-timeframe]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // 更新按钮状态
                document.querySelectorAll('[data-timeframe]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // 重新加载图表
                this.updatePriceChart();
            });
        });

        // 时间周期滑块
        const timeRangeSlider = document.getElementById('timeRangeSlider');
        if (timeRangeSlider) {
            timeRangeSlider.addEventListener('input', (e) => {
                this.timeRangePercent = parseInt(e.target.value);
                this.updateTimeRangeLabel();
                this.updatePriceChart();
            });
        }

        // 数据开关
        const showPriceSwitch = document.getElementById('showPriceSwitch');
        const showOISwitch = document.getElementById('showOISwitch');
        
        if (showPriceSwitch) {
            showPriceSwitch.addEventListener('change', (e) => {
                this.showPrice = e.target.checked;
                this.updatePriceChart();
            });
        }
        
        if (showOISwitch) {
            showOISwitch.addEventListener('change', (e) => {
                this.showOI = e.target.checked;
                this.updatePriceChart();
            });
        }

        // 重置缩放按钮
        const resetZoomBtn = document.getElementById('resetZoom');
        if (resetZoomBtn) {
            resetZoomBtn.addEventListener('click', () => {
                if (this.charts.priceChart) {
                    this.charts.priceChart.resetZoom();
                }
            });
        }

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📴 页面隐藏，暂停更新');
            } else {
                console.log('👀 页面显示，恢复更新');
                this.refreshCurrentToken();
            }
        });
    }

    updateTimeRangeLabel() {
        const label = document.getElementById('timeRangeLabel');
        if (label) {
            if (this.timeRangePercent === 100) {
                label.textContent = '显示全部';
            } else {
                label.textContent = `显示最近 ${this.timeRangePercent}% 数据`;
            }
        }
    }

    connectWebSocket() {
        console.log('🔌 连接WebSocket...');
        
        try {
            this.socket = io(this.wsUrl);
            
            this.socket.on('connect', () => {
                console.log('✅ WebSocket连接成功');
                this.updateConnectionStatus('已连接', 'success');
                
                // 订阅当前代币，但不重复加载数据
                this.socket.emit('subscribe_token', { token: this.currentToken });
            });
            
            this.socket.on('disconnect', () => {
                console.log('❌ WebSocket连接断开');
                this.updateConnectionStatus('连接断开', 'danger');
            });
            
            this.socket.on('data_update', (data) => {
                console.log('📊 收到数据更新:', data.token);
                if (data.token === this.currentToken) {
                    this.updateData(data.data);
                }
            });
            
            this.socket.on('token_data', (data) => {
                console.log('📈 收到代币数据:', data.token);
                if (data.token === this.currentToken && !this.isLoading) {
                    this.updateData(data.data);
                }
            });
            
        } catch (error) {
            console.error('❌ WebSocket连接失败:', error);
            this.updateConnectionStatus('连接失败', 'danger');
        }
    }

    async loadTokenData(token) {
        if (this.isLoading) {
            console.log('⚠️ 正在加载中，跳过重复请求');
            return;
        }
        
        this.isLoading = true;
        console.log(`🔄 开始加载 ${token} 数据...`);
        this.showLoading();
        
        try {
            console.log(`📡 发送API请求: /api/token/${token}`);
            
            const response = await fetch(`/api/token/${token}`);
            console.log('📡 API响应状态:', response.status);
            
            const result = await response.json();
            console.log('📡 API响应数据:', result);
            
            if (result.success) {
                console.log('✅ 数据加载成功，开始更新UI...');
                this.data = result.data;
                this.updateUI();
                this.updateConnectionStatus(`${token} 数据已更新`, 'info');
                console.log('✅ UI更新完成');
            } else {
                console.error('❌ API返回错误:', result.error);
                throw new Error(result.error || '数据加载失败');
            }
            
        } catch (error) {
            console.error('❌ 数据加载失败:', error);
            this.updateConnectionStatus('数据加载失败', 'danger');
            this.showError('数据加载失败，请稍后重试');
        } finally {
            console.log('🔄 加载流程结束，清理状态...');
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async switchToken(token) {
        if (token === this.currentToken || this.isLoading) return;
        
        console.log(`🔄 切换到 ${token}`);
        
        this.currentToken = token;
        document.getElementById('currentToken').textContent = token;
        
        // 通过WebSocket订阅新代币
        if (this.socket) {
            this.socket.emit('subscribe_token', { token: token });
        }
        
        // 加载新数据
        await this.loadTokenData(token);
    }

    updateData(data) {
        this.data = data;
        this.updateUI();
        // 确保隐藏加载状态
        this.hideLoading();
    }

    updateUI() {
        if (!this.data) {
            console.log('⚠️ 没有数据，跳过UI更新');
            return;
        }
        
        console.log('🎨 更新UI界面...');
        
        // 更新统计卡片
        this.updateStatsCards();
        
        // 更新图表
        this.updateCharts();
        
        // 更新数据表
        this.updateTables();
        
        // 显示图表容器
        const chartsContainer = document.getElementById('chartsContainer');
        if (chartsContainer) {
            chartsContainer.style.display = 'block';
            console.log('✅ 显示图表容器');
        }
        
        // 立即隐藏加载状态
        this.hideLoading();
        
        // 额外的保险措施：延迟再次隐藏加载状态
        setTimeout(() => {
            this.hideLoading();
            console.log('🔄 延迟隐藏加载状态（保险措施）');
        }, 100);
    }

    updateStatsCards() {
        const stats = this.data.stats;
        
        // 当前价格
        document.getElementById('currentPrice').textContent = this.formatPrice(stats.current_price);
        
        // 价格变化
        const priceChangeEl = document.getElementById('priceChange');
        const changePercent = stats.price_change_percent || 0;
        priceChangeEl.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
        priceChangeEl.className = changePercent >= 0 ? 'text-success' : 'text-danger';
        
        // 总持仓量
        document.getElementById('totalOI').textContent = this.formatCurrency(stats.total_oi);
        
        // 24h交易量
        document.getElementById('totalVolume').textContent = this.formatCurrency(stats.total_volume);
        
        // 交易所数量
        document.getElementById('exchangeCount').textContent = stats.exchanges_count;
    }

    updateCharts() {
        this.updatePriceChart();
        this.updateOIChart();
    }

    updatePriceChart() {
        const canvas = document.getElementById('priceChart');
        const ctx = canvas.getContext('2d');
        
        // 销毁现有图表
        if (this.charts.priceChart) {
            this.charts.priceChart.destroy();
        }
        
        const priceData = this.data.price_data || [];
        const oiData = this.data.oi_data || [];
        
        if (priceData.length === 0) {
            this.showEmptyChart(ctx, '暂无价格数据');
            return;
        }
        
        // 根据时间范围过滤数据，确保时间从旧到新排序
        const sortedPriceData = priceData.sort((a, b) => new Date(a.time) - new Date(b.time));
        const totalDataPoints = sortedPriceData.length;
        const startIndex = Math.max(0, totalDataPoints - Math.ceil(totalDataPoints * this.timeRangePercent / 100));
        const filteredPriceData = sortedPriceData.slice(startIndex);
        
        // 准备价格数据
        const labels = filteredPriceData.map(item => {
            const date = new Date(item.time);
            return date.toLocaleDateString('zh-CN', { 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        });
        
        const prices = filteredPriceData.map(item => item.price);
        
        // 准备持仓量数据（聚合所有交易所的持仓量）
        const oiValues = filteredPriceData.map(item => {
            const timestamp = new Date(item.time).getTime();
            // 找到对应时间的持仓量数据
            let totalOI = 0;
            oiData.forEach(exchange => {
                if (exchange.data) {
                    const oiItem = exchange.data.find(d => Math.abs(new Date(d.time).getTime() - timestamp) < 3600000); // 1小时内
                    if (oiItem) {
                        totalOI += oiItem.value || 0;
                    }
                }
            });
            return totalOI;
        });
        
        // 创建渐变效果
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(247, 147, 26, 0.3)');
        gradient.addColorStop(1, 'rgba(247, 147, 26, 0.05)');
        
        // 准备数据集
        const datasets = [];
        
        // 价格数据集
        if (this.showPrice) {
            datasets.push({
                type: 'line',
                label: `${this.currentToken} 价格`,
                data: prices,
                borderColor: '#F7931A',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#F7931A',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2,
                yAxisID: 'y'
            });
        }
        
        // 持仓量数据集
        if (this.showOI) {
            datasets.push({
                type: 'bar',
                label: '持仓量',
                data: oiValues,
                backgroundColor: 'rgba(54, 162, 235, 0.3)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                yAxisID: 'y1'
            });
        }
        
        // Chart.js配置，模拟coinank样式
        this.charts.priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            color: '#666'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(31, 31, 31, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#F7931A',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                const item = filteredPriceData[context[0].dataIndex];
                                const date = new Date(item.time);
                                return date.toLocaleString('zh-CN');
                            },
                            label: function(context) {
                                if (context.dataset.label.includes('价格')) {
                                    return `${context.dataset.label}: $${context.parsed.y.toFixed(8)}`;
                                } else {
                                    return `${context.dataset.label}: $${(context.parsed.y / 1e6).toFixed(2)}M`;
                                }
                            }
                        }
                    },
                    zoom: {
                        limits: {
                            x: {min: 0, max: 'original'},
                            y: {min: 0, max: 'original'}
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                            modifierKey: 'ctrl'
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.1
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x'
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#999',
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        type: 'linear',
                        display: this.showPrice,
                        position: 'left',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#999',
                            callback: function(value) {
                                return '$' + value.toFixed(8);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: this.showOI,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            color: '#999',
                            callback: function(value) {
                                return '$' + (value / 1e6).toFixed(1) + 'M';
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            },
            plugins: [{
                id: 'zoom'
            }]
        });
    }

    updateOIChart() {
        const canvas = document.getElementById('oiChart');
        const ctx = canvas.getContext('2d');
        
        // 销毁现有图表
        if (this.charts.oiChart) {
            this.charts.oiChart.destroy();
        }
        
        const oiData = this.data.oi_data || [];
        
        console.log('🔍 持仓量数据:', oiData);
        
        if (oiData.length === 0) {
            console.log('⚠️ 持仓量数据为空');
            this.showEmptyChart(ctx, '暂无持仓量数据');
            return;
        }
        
        // 准备数据 - 修复数据结构处理
        const exchangeOI = {};
        oiData.forEach(item => {
            const exchangeName = item.exchange;
            const totalValue = item.value || 0;
            console.log(`🔍 处理持仓量: ${exchangeName} = ${totalValue}`);
            if (exchangeName && totalValue > 0) {
                exchangeOI[exchangeName] = totalValue;
            }
        });
        
        console.log('🔍 处理后的持仓量数据:', exchangeOI);
        
        // 过滤并排序
        const sortedExchanges = Object.entries(exchangeOI)
            .filter(([_, value]) => value > 0)
            .sort(([_, a], [__, b]) => b - a)
            .slice(0, 8); // 只显示前8个交易所
        
        if (sortedExchanges.length === 0) {
            this.showEmptyChart(ctx, '暂无有效持仓量数据');
            return;
        }
        
        const labels = sortedExchanges.map(([exchange, _]) => exchange);
        const values = sortedExchanges.map(([_, value]) => value);
        
        // 动态颜色
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
        ];
        
        this.charts.oiChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            color: '#666'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(31, 31, 31, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#F7931A',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: $${(context.parsed / 1e6).toFixed(1)}M (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateTables() {
        this.updateFuturesTable();
        this.updateSpotTable();
    }

    updateFuturesTable() {
        const tbody = document.getElementById('futuresTable');
        const futuresData = this.data.futures || [];
        
        console.log('🔍 期货数据:', futuresData);
        
        if (futuresData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">暂无期货数据</td></tr>';
            return;
        }
        
        tbody.innerHTML = futuresData.slice(0, 10).map(item => {
            const priceChange = item.price_change_percent || 0;
            const changeClass = priceChange >= 0 ? 'text-success' : 'text-danger';
            const changeSymbol = priceChange >= 0 ? '+' : '';
            
            return `
                <tr>
                    <td><strong>${item.exchange || 'Unknown'}</strong></td>
                    <td>
                        ${this.formatPrice(item.price)}
                        <small class="${changeClass}">${changeSymbol}${priceChange.toFixed(2)}%</small>
                    </td>
                    <td>${this.formatCurrency(item.oi_usd)}</td>
                    <td class="${item.funding_rate && item.funding_rate > 0 ? 'text-success' : 'text-danger'}">
                        ${item.funding_rate ? (item.funding_rate * 100).toFixed(4) + '%' : 'N/A'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateSpotTable() {
        const tbody = document.getElementById('spotTable');
        const spotData = this.data.spot || [];
        
        console.log('🔍 现货数据:', spotData);
        
        if (spotData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">暂无现货数据</td></tr>';
            return;
        }
        
        const totalVolume = spotData.reduce((sum, item) => sum + (item.volume_24h || 0), 0);
        
        tbody.innerHTML = spotData.slice(0, 10).map(item => {
            const marketShare = totalVolume > 0 ? ((item.volume_24h || 0) / totalVolume * 100).toFixed(1) : '0.0';
            
            return `
                <tr>
                    <td><strong>${item.exchange || 'Unknown'}</strong></td>
                    <td>${this.formatPrice(item.price)}</td>
                    <td>${this.formatCurrency(item.volume_24h)}</td>
                    <td>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar bg-warning" style="width: ${marketShare}%"></div>
                        </div>
                        <small class="text-muted">${marketShare}%</small>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showEmptyChart(ctx, message) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
    }

    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            // 强制显示加载状态
            spinner.style.display = 'flex';
            spinner.style.visibility = 'visible';
            spinner.classList.remove('d-none');
            console.log('🔄 强制显示加载状态');
        } else {
            console.error('❌ 找不到loadingSpinner元素');
        }
    }

    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            // 强制隐藏，无论之前的状态如何
            spinner.style.display = 'none';
            spinner.style.visibility = 'hidden';
            spinner.classList.add('d-none');
            console.log('✅ 强制隐藏加载状态');
        } else {
            console.error('❌ 找不到loadingSpinner元素');
        }
    }

    showError(message) {
        console.error('Error:', message);
        // 这里可以添加更友好的错误显示
    }

    updateConnectionStatus(message, type) {
        const statusEl = document.getElementById('connectionStatus');
        const alertEl = document.getElementById('statusAlert');
        const updateEl = document.getElementById('lastUpdate');
        
        if (statusEl) {
            statusEl.textContent = message;
        }
        
        if (alertEl) {
            alertEl.className = `alert alert-${type} alert-dismissible fade show`;
        }
        
        if (updateEl) {
            updateEl.textContent = new Date().toLocaleTimeString('zh-CN');
        }
        
        // 自动隐藏成功消息
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (alertEl) {
                    alertEl.classList.remove('show');
                }
            }, 3000);
        }
    }

    formatPrice(price) {
        if (!price) return '$0.00';
        
        if (price < 0.001) {
            return '$' + price.toFixed(8);
        } else if (price < 1) {
            return '$' + price.toFixed(4);
        } else {
            return '$' + price.toFixed(2);
        }
    }

    formatCurrency(amount) {
        if (!amount) return '$0.00';
        
        if (amount >= 1e9) {
            return '$' + (amount / 1e9).toFixed(1) + 'B';
        } else if (amount >= 1e6) {
            return '$' + (amount / 1e6).toFixed(1) + 'M';
        } else if (amount >= 1e3) {
            return '$' + (amount / 1e3).toFixed(1) + 'K';
        } else {
            return '$' + amount.toFixed(2);
        }
    }

    formatNumber(num) {
        if (!num) return '0';
        return num.toLocaleString();
    }

    async refreshCurrentToken() {
        await this.loadTokenData(this.currentToken);
    }
}

// 全局变量
let coinankApp;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌟 页面加载完成，初始化Coinank应用...');
    
    // 立即检查并隐藏加载状态（防止卡住）
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        console.log('🔍 检查加载状态元素...');
        if (spinner.style.display !== 'none') {
            console.log('⚠️ 发现加载状态未隐藏，立即隐藏');
            spinner.style.display = 'none';
            spinner.style.visibility = 'hidden';
            spinner.classList.add('d-none');
        }
    }
    
    coinankApp = new CoinankApp();
    
    // 暴露全局刷新函数
    window.refreshData = function() {
        if (coinankApp) {
            coinankApp.refreshCurrentToken();
        }
    };
    
    // 暴露全局隐藏加载状态函数（调试用）
    window.hideLoading = function() {
        if (coinankApp) {
            coinankApp.hideLoading();
        }
    };
});

// 导出类以便其他脚本使用
window.CoinankApp = CoinankApp; 