/**
 * 异步请求队列 + 令牌桶算法
 * 用于控制API请求频率，避免触发服务器限流
 */

class TokenBucket {
  constructor(capacity = 10, refillRate = 2) {
    this.capacity = capacity        // 桶容量（最大令牌数）
    this.tokens = capacity         // 当前令牌数
    this.refillRate = refillRate   // 令牌补充速率（每秒补充数量）
    this.lastRefill = Date.now()   // 上次补充时间
  }

  // 补充令牌
  refill() {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000 // 转换为秒
    const tokensToAdd = Math.floor(timePassed * this.refillRate)
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
      this.lastRefill = now
    }
  }

  // 尝试消费一个令牌
  consume() {
    this.refill()
    if (this.tokens > 0) {
      this.tokens--
      return true
    }
    return false
  }

  // 获取下次可用时间（毫秒）
  getNextAvailableTime() {
    this.refill()
    if (this.tokens > 0) return 0
    
    // 计算需要等待多长时间才能获得下一个令牌
    return Math.ceil(1000 / this.refillRate)
  }
}

class RequestQueue {
  constructor() {
    this.queue = []
    this.processing = false
    this.tokenBucket = new TokenBucket(8, 1.5) // 桶容量8，每秒补充1.5个令牌
    this.concurrentLimit = 3 // 最大并发请求数
    this.activeRequests = 0
    this.requestHistory = [] // 请求历史记录
    this.maxHistorySize = 100
    this.activeRequestMap = new Map() // 活跃请求映射，用于去重
    this.pendingPromises = new Map() // 待处理的Promise，用于合并相同请求
  }

  // 生成请求的唯一键
  generateRequestKey(requestFn) {
    // 尝试从函数中提取URL和参数信息
    const fnString = requestFn.toString()
    const urlMatch = fnString.match(/['"`]([^'"`]*\/api\/[^'"`]*?)['"`]/)
    const url = urlMatch ? urlMatch[1] : fnString

    // 提取参数信息
    const paramsMatch = fnString.match(/params:\s*{([^}]*)}/)
    const params = paramsMatch ? paramsMatch[1] : ''

    const key = `${url}|${params}`.replace(/\s+/g, '')
    console.log(`🔑 生成请求键: ${key}`)
    return key
  }

  // 添加请求到队列（带去重）
  enqueue(requestFn, priority = 0) {
    const requestKey = this.generateRequestKey(requestFn)

    // 检查是否已有相同的请求在处理
    if (this.pendingPromises.has(requestKey)) {
      console.log(`🔄 请求去重，复用现有Promise: ${requestKey}`)
      return this.pendingPromises.get(requestKey)
    }

    // 检查队列中是否已有相同请求
    const existingRequest = this.queue.find(req =>
      this.generateRequestKey(req.requestFn) === requestKey
    )

    if (existingRequest) {
      console.log(`🔄 请求去重，等待队列中的请求: ${requestKey}`)
      return new Promise((resolve, reject) => {
        // 将新的resolve/reject添加到现有请求的回调列表
        if (!existingRequest.callbacks) {
          existingRequest.callbacks = []
        }
        existingRequest.callbacks.push({ resolve, reject })
      })
    }

    const promise = new Promise((resolve, reject) => {
      const request = {
        id: Date.now() + Math.random(),
        requestFn,
        priority,
        resolve,
        reject,
        timestamp: Date.now(),
        requestKey,
        callbacks: [] // 额外的回调列表，用于处理重复请求
      }

      // 按优先级插入队列
      const insertIndex = this.queue.findIndex(item => item.priority < priority)
      if (insertIndex === -1) {
        this.queue.push(request)
      } else {
        this.queue.splice(insertIndex, 0, request)
      }

      console.log(`📝 请求加入队列 [${request.id}], 队列长度: ${this.queue.length}`)
      this.processQueue()
    })

    // 将Promise存储起来，用于去重
    this.pendingPromises.set(requestKey, promise)

    // 请求完成后清理
    promise.finally(() => {
      this.pendingPromises.delete(requestKey)
    })

    return promise
  }

  // 处理队列
  async processQueue() {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0 && this.activeRequests < this.concurrentLimit) {
      // 检查令牌桶
      if (!this.tokenBucket.consume()) {
        const waitTime = this.tokenBucket.getNextAvailableTime()
        console.log(`⏳ 令牌桶限流，等待 ${waitTime}ms`)
        await this.sleep(waitTime)
        continue
      }

      const request = this.queue.shift()
      this.activeRequests++
      
      console.log(`🚀 开始处理请求 [${request.id}], 活跃请求数: ${this.activeRequests}`)
      
      // 异步处理请求
      this.executeRequest(request)
    }

    this.processing = false
  }

  // 执行单个请求
  async executeRequest(request) {
    const startTime = Date.now()

    try {
      // 添加随机延迟，避免规律性请求
      const randomDelay = Math.random() * 200 + 100 // 100-300ms随机延迟
      await this.sleep(randomDelay)

      const result = await request.requestFn()
      const duration = Date.now() - startTime

      console.log(`✅ 请求完成 [${request.id}], 耗时: ${duration}ms`)

      // 记录成功请求
      this.recordRequest(request.id, 'success', duration)

      // 处理主请求
      request.resolve(result)

      // 处理所有重复请求的回调
      if (request.callbacks && request.callbacks.length > 0) {
        console.log(`🔄 处理 ${request.callbacks.length} 个重复请求的回调`)
        request.callbacks.forEach(callback => {
          callback.resolve(result)
        })
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ 请求失败 [${request.id}], 耗时: ${duration}ms`, error)

      // 记录失败请求
      this.recordRequest(request.id, 'error', duration, error)

      // 如果是429或503错误，增加延迟
      if (error.response && (error.response.status === 429 || error.response.status === 503)) {
        console.log(`🔄 检测到限流错误，增加延迟...`)
        await this.sleep(2000) // 额外等待2秒
      }

      // 处理主请求
      request.reject(error)

      // 处理所有重复请求的回调
      if (request.callbacks && request.callbacks.length > 0) {
        console.log(`🔄 处理 ${request.callbacks.length} 个重复请求的错误回调`)
        request.callbacks.forEach(callback => {
          callback.reject(error)
        })
      }
    } finally {
      this.activeRequests--
      console.log(`📊 请求结束，活跃请求数: ${this.activeRequests}`)

      // 继续处理队列
      setTimeout(() => this.processQueue(), 50)
    }
  }

  // 记录请求历史
  recordRequest(id, status, duration, error = null) {
    this.requestHistory.push({
      id,
      status,
      duration,
      error: error ? error.message : null,
      timestamp: Date.now()
    })

    // 限制历史记录大小
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory.shift()
    }
  }

  // 获取队列状态
  getStatus() {
    const recentRequests = this.requestHistory.slice(-20)
    const successRate = recentRequests.length > 0 
      ? recentRequests.filter(r => r.status === 'success').length / recentRequests.length 
      : 0

    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      tokens: this.tokenBucket.tokens,
      successRate: (successRate * 100).toFixed(1) + '%',
      recentRequests: recentRequests.length
    }
  }

  // 工具方法：延迟
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 清空队列
  clear() {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'))
    })
    this.queue = []
    console.log('🧹 请求队列已清空')
  }
}

// 创建全局请求队列实例
const requestQueue = new RequestQueue()

// 导出队列实例和包装函数
export { requestQueue }

// 包装axios请求的便捷函数
export const queuedRequest = (requestFn, priority = 0) => {
  return requestQueue.enqueue(requestFn, priority)
}

// 获取队列状态的便捷函数
export const getQueueStatus = () => {
  return requestQueue.getStatus()
}

// 清空队列的便捷函数
export const clearQueue = () => {
  requestQueue.clear()
}
