import {
  CONNECTION_STATE,
  CancellationToken,
  Connection,
  DEVICE_EVENTS,
  Device,
  DeviceManager,
  Hint,
  MANAGER_EVENTS,
  Progress,
  Message,
  UsageRequest,
  DeviceID,
} from '@electricui/core'

import {
  countdownProgressBar,
  waitForConnectionToReachAcceptabilityState,
  waitForDeviceToReachConnectionState,
  Report,
  StreamReport,
  sleep,
  startDeviceSession,
} from '@electricui/script-utilities'
import { LogMessageName } from 'src/LogMessageName'
import { deviceManagerFactory } from '../deviceManager/config'

import {
  messageIDToAddressAndCommand,
  addressAndCommandToMessageID,
  COMMAND_NAMES,
  byteToHexString,
} from 'protocol'

const TIME_TO_WAIT_FOR_REPLY = 20 // ms

async function findDevice(
  deviceManager: DeviceManager,
  deadline: number,
  report: StreamReport,
) {
  let device!: Device

  const cancellationToken = new CancellationToken().deadline(deadline)

  const deadlineTime = Date.now() + deadline

  //   const progressReporter = Report.progressViaCounter(deadline)
  //   const streamProgress = report.reportProgress(progressReporter)

  await report.startTimerPromise(
    `Searching for device...`,
    { wipeForgettableOnComplete: true, singleLineOnComplete: `Found device` },
    async () => {
      const foundDevice: Device = await new Promise(async (resolve, reject) => {
        const getDevice = (deviceID: DeviceID) => {
          console.log(`found device called!`)
          const device = deviceManager.getDevice(deviceID)!
          resolve(device)
        }

        // If we get cancelled, bail
        cancellationToken.subscribe(() => {
          deviceManager.removeListener(MANAGER_EVENTS.FOUND_DEVICE, getDevice)
        })

        // If we get cancelled, reject the promise
        cancellationToken.subscribe(() => {
          reject(new Error(`Could not find device`))
        })

        deviceManager.once(MANAGER_EVENTS.FOUND_DEVICE, getDevice)

        await deviceManager.poll(cancellationToken)
      })

      // jump it up the closure
      device = foundDevice
    },
  )

  return device
}

const USAGE_REQUEST = 'ui' as UsageRequest

export const connectToAnything = async (report: StreamReport) => {
  const deviceManager = deviceManagerFactory()

  const device = await findDevice(deviceManager, 30_000, report)

  report.reportSuccess(LogMessageName.UNNAMED, `Found ${device.getDeviceID()}`)

  // We want metadata reporting
  device.setMaintainMetadataReporting(true)

  await startDeviceSession(device, async methods => {
    const { write, resetCancellationToken, connect, disconnect } = methods

    // Attempt connection
    await report.startTimerPromise(
      `Connecting to device...`,
      {
        wipeForgettableOnComplete: true,
        singleLineOnComplete: `Connected to device`,
      },
      async () => {
        await connect(new CancellationToken().deadline(1_000))
      },
    )

    const addresses: number[] = []

    // Turn the light on and off again
    await report.startTimerPromise(
      `Find addresses`,
      {
        wipeForgettableOnComplete: true,
        singleLineOnComplete: `Found addresses`,
      },
      async () => {
        // Poll each address

        for (let address = 0x01; address < 0xfe; address++) {
          const cancellationToken = new CancellationToken().deadline(
            TIME_TO_WAIT_FOR_REPLY,
          )
          try {
            const fwVer: number = await query(
              device,
              addressAndCommandToMessageID(
                address,
                COMMAND_NAMES.CMD_RD_VERSION,
              ),
              cancellationToken,
            )

            report.reportInfo(
              LogMessageName.UNNAMED,
              `Address ${byteToHexString(
                address,
              )} responded with version: ${byteToHexString(fwVer)}`,
            )

            // Add it to the list
            addresses.push(address)
          } catch (err) {
            if (cancellationToken.caused(err)) {
              // move on
              continue
            } else {
              console.error(err)
              throw new Error(
                `Failed to poll for available addresses due to above error`,
              )
            }
          }
        }
      },
    )

    // Turn the light on and off again
    await report.startTimerPromise(
      `Turning the light on and off again...`,
      {
        wipeForgettableOnComplete: true,
        singleLineOnComplete: `Toggled the light`,
      },
      async () => {
        // For every light
        for (const address of addresses) {
          const lightStateFirst: number = await query(
            device,
            addressAndCommandToMessageID(
              address,
              COMMAND_NAMES.CMD_PULSE_AMP_RD,
            ),
            new CancellationToken().deadline(TIME_TO_WAIT_FOR_REPLY),
          )
          report.reportInfo(
            LogMessageName.UNNAMED,
            `Light state for address ${byteToHexString(
              address,
            )} is currently: ${byteToHexString(
              lightStateFirst,
            )}, switching it on`,
          )

          // Turn the light on
          await write(
            addressAndCommandToMessageID(
              address,
              COMMAND_NAMES.CMD_PULSE_AMP_SET,
            ),
            0x01,
            new CancellationToken().deadline(TIME_TO_WAIT_FOR_REPLY),
          )

          // Wait a while
          await sleep(1000)

          // Read back the light state
          const lightStateSecond: number = await query(
            device,
            addressAndCommandToMessageID(
              address,
              COMMAND_NAMES.CMD_PULSE_AMP_RD,
            ),
            new CancellationToken().deadline(TIME_TO_WAIT_FOR_REPLY),
          )
          report.reportInfo(
            LogMessageName.UNNAMED,
            `Light state for address ${byteToHexString(
              address,
            )} is currently: ${byteToHexString(
              lightStateSecond,
            )}, switching it off`,
          )

          // Turn it off again
          await write(
            addressAndCommandToMessageID(
              address,
              COMMAND_NAMES.CMD_PULSE_AMP_SET,
            ),
            0x00,
            new CancellationToken().deadline(TIME_TO_WAIT_FOR_REPLY),
          )

          // Wait a while
          await sleep(1000)

        }
      },
    )

    // Disconnect from the device
    await disconnect()
  })

  report.reportSuccess(LogMessageName.UNNAMED, `Tests complete`)
}

async function query<T>(
  device: Device,
  messageID: string,
  cancellationToken: CancellationToken,
) {
  let response: T | null = null

  // Wait for a reply with the same messageID
  const waitForReply = device
    .waitForReply<T>(
      message => message.messageID === messageID,
      cancellationToken,
    )
    .then(res => {
      response = res.payload
    })
    .catch(err => {
      if (cancellationToken.caused(err)) {
        // no problem
      } else {
        throw err
      }
    })

  // Create the query
  const message = new Message(messageID as string, null)
  message.metadata.query = true

  // Write
  await device.write(message, cancellationToken).catch(err => {
    if (cancellationToken.caused(err)) {
      // no problem
    } else {
      throw err
    }
  })

  await waitForReply

  cancellationToken.haltIfCancelled()

  // Return the payload
  return response!
}
