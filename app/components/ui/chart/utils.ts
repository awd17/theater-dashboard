import type { ChartConfig } from '.'
import { isClient } from '@vueuse/core'
import { useId } from 'reka-ui'
import { h, render, type Component } from 'vue'

const cache = new Map<string, string>()

function serializeKey(key: Record<string, unknown>): string {
  return JSON.stringify(key, Object.keys(key).sort())
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

export function componentToString<P extends Record<string, unknown>>(
  config: ChartConfig,
  component: Component,
  props?: P,
) {
  if (!isClient)
    return

  const id = useId()

  return (_data: unknown, x: number | Date) => {
    const envelope = asRecord(_data)
    const data = 'data' in envelope ? asRecord(envelope.data) : envelope
    const serializedKey = `${id}-${serializeKey(data)}`
    const cachedContent = cache.get(serializedKey)
    if (cachedContent)
      return cachedContent

    const vnode = h(component, { ...props, payload: data, config, x })
    const div = document.createElement('div')
    render(vnode, div)
    cache.set(serializedKey, div.innerHTML)
    return div.innerHTML
  }
}
