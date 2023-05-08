import { CancellationToken } from '@electricui/async-utilities'
import { describe, expect, it } from '@jest/globals'

import { Message, PipelinePromise } from '@electricui/core'
import {
  addressAndChannelToMessageID,
  COMMAND_CHANNEL,
  COMMAND_CHANNELS,
  MessageMetadata,
} from '../src/common'

import { ReqResQueuePipeline } from '../src/reqres-pipeline'
import { CallbackSink } from './common'
import { commandChannelToReadCommand } from '../src/abstraction'

describe('Request Resolve pipeline', () => {
  it('can send write requests one after another', async () => {
    const cancellationToken = new CancellationToken().deadline(100)

    const { uiWrite, hardwareReply, hardwareReceived, uiReceived } =
      buildPipesAndSinks()

    let i = 0
    const sendIncrementingDataMessage = () => {
      const msg = new Message<number, MessageMetadata>(
        addressAndChannelToMessageID(0x53, COMMAND_CHANNELS.STROBE_PULSE_WIDTH),
        i++,
      )

      return uiWrite(msg, cancellationToken)
    }

    await sendIncrementingDataMessage()
    await sendIncrementingDataMessage()
    await sendIncrementingDataMessage()

    expect(hardwareReceived.length).toBe(3)
  })
  it('can send query requests one after another, and the replies are correctly accounted for', async () => {
    const cancellationToken = new CancellationToken().deadline(100)

    let i = 0

    const { uiWrite, hardwareReply, hardwareReceived, uiReceived } =
      buildPipesAndSinks((msg, reply) => {
        // The mock hardware

        // If it receives a request, reply to it
        reply(
          generateMessage(0x00, COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION, i++, false),
          cancellationToken,
        )
      })

    const sendIncrementingQuery = () => {
      const msg = generateMessage(
        0x01,
        COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION,
        0x00,
        true,
      )

      return uiWrite(msg, cancellationToken)
    }

    await sendIncrementingQuery()
    await sendIncrementingQuery()
    await sendIncrementingQuery()

    expect(hardwareReceived.length).toBe(3)
    expect(uiReceived.length).toBe(3)

    // Check payloads
    expect(uiReceived[0].payload).toBe(0)
    expect(uiReceived[1].payload).toBe(1)
    expect(uiReceived[2].payload).toBe(2)

    // Check UI side addresses have been annotated with where they're from
    expect(uiReceived[0].metadata.address).toBe(0x01)
    expect(uiReceived[1].metadata.address).toBe(0x01)
    expect(uiReceived[2].metadata.address).toBe(0x01)
  })
  it('sends queries in serial when the UI sends them concurrently', async () => {
    const cancellationToken = new CancellationToken().deadline(100)

    let i = 0

    const { uiWrite, hardwareReply, hardwareReceived, uiReceived } =
      buildPipesAndSinks((msg, reply) => {
        // The mock hardware

        // If it receives a request, reply to it
        reply(
          generateMessage(0x00, COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION, i++, false),
          cancellationToken,
        )
      })

    const sendIncrementingQuery = () => {
      const msg = generateMessage(
        0x01,
        COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION,
        0x00,
        true,
      )

      return uiWrite(msg, cancellationToken)
    }

    const p1 = sendIncrementingQuery()
    const p2 = sendIncrementingQuery()
    const p3 = sendIncrementingQuery()

    await Promise.all([p1, p2, p3])

    expect(hardwareReceived.length).toBe(3)
    expect(uiReceived.length).toBe(3)

    // Check payloads
    expect(uiReceived[0].payload).toBe(0)
    expect(uiReceived[1].payload).toBe(1)
    expect(uiReceived[2].payload).toBe(2)

    // Check UI side addresses have been annotated with where they're from
    expect(uiReceived[0].metadata.address).toBe(0x01)
    expect(uiReceived[1].metadata.address).toBe(0x01)
    expect(uiReceived[2].metadata.address).toBe(0x01)
  })
  it('handles timeouts gracefully', async () => {
    let cancellationToken = new CancellationToken()

    let i = 0

    let replying = false

    const { uiWrite, hardwareReply, hardwareReceived, uiReceived } =
      buildPipesAndSinks((msg, reply) => {
        // The mock hardware

        if (!replying) return

        // If it receives a request, reply to it
        return reply(
          generateMessage(0x00, COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION, i++, false),
          cancellationToken,
        )
      })

    const sendIncrementingQuery = () => {
      const msg = generateMessage(
        0x01,
        COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION,
        0x00,
        true,
      )

      return uiWrite(msg, cancellationToken)
    }

    // Hardware doesn't reply to this upcoming query
    replying = false

    const p1 = sendIncrementingQuery()

    // Wait for it to send
    await sleep(10)

    // time passes, UI deadline passes, cancel the token
    cancellationToken.cancel()

    try {
      await p1
    } catch (err) {
      expect(cancellationToken.caused(err)).toBe(true)
    }

    replying = true
    // new token
    cancellationToken = new CancellationToken()

    await sendIncrementingQuery()

    expect(hardwareReceived.length).toBe(2)
    expect(uiReceived.length).toBe(1)

    // Check UI side addresses have been annotated with where they're from
    expect(uiReceived[0].metadata.address).toBe(0x01)
  })
})

function sleep(duration: number) {
  return new Promise((resolve, reject) => setTimeout(resolve, duration))
}

function generateMessage(
  address: number,
  channel: COMMAND_CHANNEL,
  payload: number,
  query?: boolean,
) {
  const msg = new Message<number, MessageMetadata>(
    // Address is 0x01
    addressAndChannelToMessageID(address, channel),
    payload,
  )
  msg.metadata.address = address
  msg.metadata.channel = channel
  msg.metadata.commandName = commandChannelToReadCommand[channel as keyof typeof commandChannelToReadCommand]!

  // Need to set the query otherwise the pipeline won't detect it's a query
  msg.metadata.query = Boolean(query)

  return msg
}

function buildPipesAndSinks(
  onHardwareReceive?: (
    msgFromUI: Message<number, MessageMetadata>,
    hardwareReply: (
      msg: Message<number, MessageMetadata>,
      cancellationToken: CancellationToken,
    ) => PipelinePromise,
  ) => void,
) {
  const pipeline = new ReqResQueuePipeline()

  const uiWrite = (
    msg: Message<number, MessageMetadata>,
    cancellationToken: CancellationToken,
  ) => pipeline.writePipeline.receive(msg, cancellationToken)

  const hardwareReply = (
    msg: Message<number, MessageMetadata>,
    cancellationToken: CancellationToken,
  ) => pipeline.readPipeline.receive(msg, cancellationToken)

  const hardwareReceived: Message<number, MessageMetadata>[] = []
  const uiReceived: Message<number, MessageMetadata>[] = []

  const readSink = new CallbackSink<Message<number, MessageMetadata>>(msg => {
    uiReceived.push(msg)
  })
  const writeSink = new CallbackSink<Message<number, MessageMetadata>>(msg => {
    hardwareReceived.push(msg)

    // If the callback exists, call it
    if (onHardwareReceive) {
      onHardwareReceive(msg, hardwareReply)
    }
  })

  pipeline.readPipeline.pipe(readSink)
  pipeline.writePipeline.pipe(writeSink)

  return {
    uiWrite,
    hardwareReply,
    hardwareReceived,
    uiReceived,
  }
}
