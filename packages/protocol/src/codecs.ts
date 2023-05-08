import { Message, Pipeline, DuplexPipeline } from '@electricui/core'
import {
  COMMAND_CHANNEL,
  COMMAND_CHANNELS,
  messageIDToAddressAndChannel,
  MessageMetadata,
} from './common'
import { CancellationToken } from '@electricui/async-utilities'

function map(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  channel: COMMAND_CHANNEL,
) {
  if (x < inMin || x > inMax) {
    throw new Error(
      `Incorrect data for ${channel}, must be between ${inMin} and ${inMax}`,
    )
  }

  const mapped = ((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin

  // Return an integer
  return Math.round(mapped)
}

export function encodeData(channel: COMMAND_CHANNEL, data: number) {
  switch (channel) {
    case COMMAND_CHANNELS.LAMP_ADDRESS:
      return map(data, 1, 252, 0x01, 0xfc, channel)

    case COMMAND_CHANNELS.PULSE_INTENSITY_BOTTOM_IR:
      return map(data, 0, 100, 0x00, 0xff, channel)

    case COMMAND_CHANNELS.PULSE_INTENSITY_TOP_WHITE:
      // Note: this goes from 0x00 to 0x1f
      return map(data, 0, 100, 0x00, 0x1f, channel)

    case COMMAND_CHANNELS.STROBE_PULSE_WIDTH:
      return map(data, 100, 500, 0x32, 0xfa, channel)

    case COMMAND_CHANNELS.STROBE_PULSE_DELAY:
      return map(data, 0, 65280, 0x00, 0xff, channel)

    case COMMAND_CHANNELS.OPTIONS:
      // TODO: Bitfield this
      return map(data, 0x00, 0x26, 0x00, 0x26, channel)

    default:
      return map(data, 0x00, 0xff, 0x00, 0xff, channel)
  }
}

export function decodeData(channel: COMMAND_CHANNEL, data: number) {
  switch (channel) {
    case COMMAND_CHANNELS.PULSE_INTENSITY_BOTTOM_IR:
      return map(data, 0x00, 0xff, 0, 100, channel)

    case COMMAND_CHANNELS.PULSE_INTENSITY_TOP_WHITE:
      return map(data, 0x00, 0x1f, 0, 100, channel)

    case COMMAND_CHANNELS.STROBE_PULSE_WIDTH:
      return map(data, 0x32, 0xfa, 100, 500, channel)

    case COMMAND_CHANNELS.STROBE_PULSE_DELAY:
      return map(data, 0x00, 0xff, 0, 65280, channel)

    default:
      return map(data, 0x00, 0xff, 0x00, 0xff, channel)
  }
}

export class CodecEncoderPipeline extends Pipeline {
  receive(
    message: Message<number, MessageMetadata>,
    cancellationToken: CancellationToken,
  ) {
    if (message.metadata.query) {
      // Queries always have empty payloads
      message.payload = 0x00
    } else {
      const encoded = encodeData(
        message.metadata.channel,
        message.payload ?? 0x00,
      )

      // Mutate the payload
      message.payload = encoded
    }

    return this.push(message, cancellationToken)
  }
}

export class CodecDecoderPipeline extends Pipeline {
  receive(
    message: Message<number, MessageMetadata>,
    cancellationToken: CancellationToken,
  ) {
    const decoded = decodeData(
      message.metadata.channel,
      message.payload ?? 0x00,
    )
    message.payload = decoded

    return this.push(message, cancellationToken)
  }
}

export class CodecPipeline extends DuplexPipeline {
  readPipeline: CodecDecoderPipeline
  writePipeline: CodecEncoderPipeline
  constructor() {
    super()

    this.readPipeline = new CodecDecoderPipeline()
    this.writePipeline = new CodecEncoderPipeline()
  }
}
