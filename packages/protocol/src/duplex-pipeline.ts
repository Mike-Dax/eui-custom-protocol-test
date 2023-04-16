import { DuplexPipeline, TypeCache } from '@electricui/core'

import { ProtocolDecoderPipeline } from './decoder'
import { ProtocolEncoderPipeline} from './encoder'
import { ProtocolPipelineOptions } from './common'

/**
 * The protocol duplex pipeline
 */
export class ProtocolPipeline extends DuplexPipeline {
  readPipeline: ProtocolDecoderPipeline
  writePipeline: ProtocolEncoderPipeline
  constructor(options: ProtocolPipelineOptions = {}) {
    super()

    this.readPipeline = new ProtocolDecoderPipeline(options)
    this.writePipeline = new ProtocolEncoderPipeline(options)
  }
}
