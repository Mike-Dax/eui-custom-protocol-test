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
} from '@electricui/script-utilities'
import { LogMessageName } from 'src/LogMessageName'
import { deviceManagerFactory } from '../deviceManager/config'

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

  // Attempt connection
  await report.startTimerPromise(
    `Connecting to device...`,
    {
      wipeForgettableOnComplete: true,
      singleLineOnComplete: `Connected to device`,
    },
    async () => {
      const cancellationToken = new CancellationToken().deadline(1_000)
      await device.addUsageRequest(USAGE_REQUEST, cancellationToken)
    },
  )

  report.reportSuccess(LogMessageName.UNNAMED, `Tests complete`)
}
