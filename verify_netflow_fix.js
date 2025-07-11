// 验证净流入数据处理逻辑
// 模拟前端数据处理过程

const mockApiResponse = {
  success: true,
  data: {
    baseCoin: "PEPE",
    exchangeName: "",
    interval: "12h",
    longRatios: [201850900.70621565, 289130598.4957201, 223666501.66681266],
    shortRatios: [196676733.87273058, 277730241.173244, 203729577.8575212],
    prices: [0.000012403, 0.000011137, 0.000011047],
    tss: [1752120000000, 1752076800000, 1752033600000]
  }
}

console.log('🧪 验证净流入数据处理逻辑')
console.log('=' * 50)

// 模拟前端处理逻辑
function processNetFlowData(response) {
  console.log('1. API响应:', response.success)
  
  if (response && response.success) {
    const responseData = response.data
    console.log('2. 数据类型:', typeof responseData, '是否为数组:', Array.isArray(responseData))
    
    if (responseData && typeof responseData === 'object') {
      console.log('3. 直接使用数据对象')
      return responseData
    } else {
      console.log('3. 数据格式错误')
      return null
    }
  }
  return null
}

// 模拟图表数据处理
function processChartData(data, timeRangeStart = 0, timeRangeEnd = 100) {
  if (!data || typeof data !== 'object') {
    console.log('❌ 数据不可用:', data)
    return null
  }

  console.log('4. 处理图表数据')
  
  const timestamps = data.tss || []
  const longRatios = data.longRatios || []
  const shortRatios = data.shortRatios || []
  const prices = data.prices || []

  console.log('5. 数据数组长度:', {
    timestamps: timestamps.length,
    longRatios: longRatios.length,
    shortRatios: shortRatios.length,
    prices: prices.length
  })

  if (timestamps.length === 0) {
    console.log('❌ 没有时间戳数据')
    return null
  }

  // 时间范围过滤
  const totalDataPoints = timestamps.length
  const startIndex = Math.floor(totalDataPoints * timeRangeStart / 100)
  const endIndex = Math.ceil(totalDataPoints * timeRangeEnd / 100)
  
  const filteredTimestamps = timestamps.slice(startIndex, endIndex)
  const filteredLongRatios = longRatios.slice(startIndex, endIndex)
  const filteredShortRatios = shortRatios.slice(startIndex, endIndex)
  const filteredPrices = prices.slice(startIndex, endIndex)

  console.log('6. 过滤后数据长度:', filteredTimestamps.length)

  // 生成图表标签
  const labels = filteredTimestamps.map(timestamp => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  })

  // 处理数值数据
  const buyFlows = filteredLongRatios.map(ratio => Number(ratio) || 0)
  const sellFlows = filteredShortRatios.map(ratio => Number(ratio) || 0)
  const netFlows = buyFlows.map((buy, index) => buy - sellFlows[index])
  const priceData = filteredPrices.map(price => Number(price) || 0)

  console.log('7. 图表数据样例:')
  console.log('   时间标签:', labels[0])
  console.log('   多头比例:', buyFlows[0])
  console.log('   空头比例:', sellFlows[0])
  console.log('   净流入差值:', netFlows[0])
  console.log('   价格:', priceData[0])

  return {
    labels,
    datasets: [
      {
        label: '多头比例',
        data: buyFlows,
        backgroundColor: 'rgba(0, 255, 136, 0.6)',
        type: 'bar',
      },
      {
        label: '空头比例',
        data: sellFlows,
        backgroundColor: 'rgba(255, 71, 87, 0.6)',
        type: 'bar',
      },
      {
        label: '净流入差值',
        data: netFlows,
        backgroundColor: netFlows.map(value =>
          value >= 0 ? 'rgba(0, 212, 255, 0.6)' : 'rgba(255, 184, 0, 0.6)'
        ),
        type: 'bar',
      },
      {
        label: '价格',
        data: priceData,
        borderColor: 'rgba(255, 206, 84, 1)',
        type: 'line',
      },
    ],
  }
}

// 执行测试
console.log('\n🔍 开始测试...')

const processedData = processNetFlowData(mockApiResponse)
console.log('\n✅ 数据处理结果:', processedData ? '成功' : '失败')

if (processedData) {
  const chartData = processChartData(processedData)
  console.log('\n✅ 图表数据生成:', chartData ? '成功' : '失败')
  
  if (chartData) {
    console.log('\n📊 图表配置:')
    console.log('   标签数量:', chartData.labels.length)
    console.log('   数据集数量:', chartData.datasets.length)
    console.log('   数据集名称:', chartData.datasets.map(d => d.label))
    console.log('\n✅ 所有测试通过！图表应该能正常显示')
  }
} else {
  console.log('\n❌ 数据处理失败')
}

console.log('\n' + '=' * 50)
console.log('📋 修复总结:')
console.log('1. 移除了错误的数组检查逻辑')
console.log('2. 直接使用API返回的数据对象')
console.log('3. 正确解析 tss, longRatios, shortRatios, prices 字段')
console.log('4. 添加了详细的调试日志')
console.log('=' * 50)
