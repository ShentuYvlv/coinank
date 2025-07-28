import { useEffect, useRef } from 'react'

/**
 * 自定义Hook，用于处理React严格模式的双重渲染问题
 * 在严格模式下，useEffect会被调用两次，这个Hook确保副作用只执行一次
 */
export const useStrictModeEffect = (effect, deps) => {
  const hasRun = useRef(false)
  const cleanup = useRef(null)

  useEffect(() => {
    // 在严格模式下，第一次运行时设置标记
    if (!hasRun.current) {
      hasRun.current = true
      cleanup.current = effect()
      return cleanup.current
    }
    
    // 第二次运行时直接返回之前的清理函数
    return cleanup.current
  }, deps)

  // 组件卸载时重置标记
  useEffect(() => {
    return () => {
      hasRun.current = false
      cleanup.current = null
    }
  }, [])
}

/**
 * 防抖Hook，用于防止快速连续的API调用
 */
export const useDebouncedEffect = (effect, deps, delay = 300) => {
  const timeoutRef = useRef(null)

  useEffect(() => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      effect()
    }, delay)

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, deps)

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
}

/**
 * 单次执行Hook，确保某个副作用在组件生命周期内只执行一次
 */
export const useOnceEffect = (effect) => {
  const hasRun = useRef(false)

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true
      return effect()
    }
  }, [])
}
