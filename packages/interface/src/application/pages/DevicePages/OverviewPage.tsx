import {
  ChartContainer,
  LineChart,
  RealTimeDomain,
  TimeAxis,
  VerticalAxis,
} from '@electricui/components-desktop-charts'

import {
  Card,
  Menu,
  MenuItem,
  MenuDivider,
  ProgressBar,
} from '@blueprintjs/core'
import { IntervalRequester, useQuery } from '@electricui/components-core'
import { LightBulb } from '../../components/LightBulb'
import { MessageDataSource } from '@electricui/core-timeseries'
import React, { useCallback, useState } from 'react'
import { RouteComponentProps } from '@reach/router'
import { Button } from '@electricui/components-desktop-blueprint'
import { addressAndCommandToMessageID, byteToHexString, COMMAND_NAMES } from 'protocol'
import { IconNames } from '@blueprintjs/icons'
import { CancellationToken } from '@electricui/async-utilities'

const TIME_TO_WAIT_FOR_REPLY = 20 // ms
const FINISHED = 0xff

function AddressPollAndSelect(props: {
  selectedAddress: number
  setSelectedAddress: (address: number) => void
}) {
  const [availableAddresses, setAvailableAddresses] = useState<number[]>([])
  const [progress, setProgress] = useState(FINISHED)

  const query = useQuery()

  const poll = useCallback(async () => {
    setProgress(0)
    setAvailableAddresses([])

    for (let address = 0x01; address < 0xfe; address++) {
      const cancellationToken = new CancellationToken().deadline(
        TIME_TO_WAIT_FOR_REPLY,
      )
      try {
        const fwVer: number = await query(
          addressAndCommandToMessageID(address, COMMAND_NAMES.CMD_RD_VERSION),
          cancellationToken,
        )

        console.log(`found ${fwVer} at address ${address} `)

        // Add it to the list
        setAvailableAddresses(addrs => [...addrs, address])
      } catch (err) {
        if (cancellationToken.caused(err)) {
          // move on
          continue
        } else {
          console.error(err)
        }
      } finally {
        setProgress(address)
      }
    }

    setProgress(FINISHED)
  }, [query, setAvailableAddresses, setProgress])

  return (
    <Card>
      <Menu>
        <MenuItem
          icon={IconNames.REFRESH}
          text="Poll Addresses"
          disabled={progress !== FINISHED}
          onClick={poll}
        />
        {progress !== FINISHED ? <ProgressBar value={progress / 255} /> : null}
        {availableAddresses.length > 0 ? <MenuDivider /> : null}

        {availableAddresses.map(address => (
          <MenuItem
            key={address}
            icon={IconNames.LIGHTBULB}
            text={`0x${byteToHexString(address)}`}
            active={address === props.selectedAddress}
            onClick={() => props.setSelectedAddress(address)}
          />
        ))}

        {availableAddresses.length > 0 ? <MenuDivider /> : null}
      </Menu>
    </Card>
  )
}

function AddressPage(props: { address: number }) {
  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: '1em' }}>
        <b>Address 0x{byteToHexString(props.address)}</b>
      </div>
      {/* <ChartContainer>
      <LineChart dataSource={ledStateDataSource} maxItems={10000} />
      <RealTimeDomain window={10000} />
      <TimeAxis />
      <VerticalAxis />
    </ChartContainer> */}

      <Button
        writer={{
          [addressAndCommandToMessageID(
            0x10,
            COMMAND_NAMES.CMD_PULSE_AMP_SET,
          )]: 0x00,
        }}
      >
        Set strobe to 0
      </Button>

      <Button
        writer={{
          [addressAndCommandToMessageID(
            0x10,
            COMMAND_NAMES.CMD_PULSE_AMP_SET,
          )]: 0x01,
        }}
      >
        Set strobe to 1
      </Button>

      <Button
        writer={{
          [addressAndCommandToMessageID(
            0x10,
            COMMAND_NAMES.CMD_PULSE_AMP_SET,
          )]: 0xff,
        }}
      >
        Set strobe to 0xff
      </Button>
    </Card>
  )
}

export const OverviewPage = (props: RouteComponentProps) => {
  const [selectedAddress, setSelectedAddress] = useState(0x00)

  return (
    <React.Fragment>
      <div
        style={{
          display: 'grid',
          gap: 10,
          gridTemplateColumns: '1fr 2fr',
        }}
      >
        <div>
          <AddressPollAndSelect
            selectedAddress={selectedAddress}
            setSelectedAddress={setSelectedAddress}
          />
        </div>

        <div>
          {selectedAddress !== 0x00 ? (
            <AddressPage key={selectedAddress} address={selectedAddress} />
          ) : (
            <Card>Please poll and select an address.</Card>
          )}
        </div>
      </div>
    </React.Fragment>
  )
}
