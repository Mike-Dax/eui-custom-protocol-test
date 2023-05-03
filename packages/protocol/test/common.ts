import { Sink } from '@electricui/core'

export class CallbackSink<T> extends Sink {
  callback: (chunk: T) => void
  constructor(callback: (chunk: T) => void) {
    super()
    this.callback = callback
  }

  async receive(chunk: T) {
    return this.callback(chunk)
  }
}
