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
  FormGroup,
  Tag,
} from '@blueprintjs/core'
import {
  IntervalRequester,
  SaveContainer,
  useQuery,
  useHardwareState,
  useInterfaceState,
} from '@electricui/components-core'
import { MessageDataSource } from '@electricui/core-timeseries'
import React, { useCallback, useState } from 'react'
import { RouteComponentProps } from '@reach/router'
import {
  Button,
  NumberInput,
  SaveButton,
  Slider,
} from '@electricui/components-desktop-blueprint'
import {
  addressAndCommandToMessageID,
  byteToHexString,
  COMMAND_NAME,
  COMMAND_NAMES,
} from 'protocol'
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
    props.setSelectedAddress(0xff) // reset it

    for (let address = 0x01; address < 0xfe; address++) {
      const cancellationToken = new CancellationToken().deadline(
        TIME_TO_WAIT_FOR_REPLY,
      )
      try {
        const fwVer = await query(
          addressAndCommandToMessageID(address, COMMAND_NAMES.CMD_RD_VERSION),
          cancellationToken,
        )

        // console.log(`found ${fwVer.payload} at address ${address} `)

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
        <MenuDivider />

        <MenuItem
          icon={IconNames.LIGHTBULB}
          text="0xff (broadcast)"
          active={0xff === props.selectedAddress}
          onClick={() => props.setSelectedAddress(0xff)}
        />

        {availableAddresses.map(address => (
          <MenuItem
            key={address}
            icon={IconNames.LIGHTBULB}
            text={`0x${byteToHexString(address)}`}
            active={address === props.selectedAddress}
            onClick={() => props.setSelectedAddress(address)}
          />
        ))}

        <MenuDivider />
      </Menu>
    </Card>
  )
}

/**
 * This builds a two stage writer which writes optimistically to the UI state,
 * so that interactions are fast, but also sets up a deferred read after the write.
 */
function optimisticWriterBuilder(
  state: Record<string, any>,
  address: number,
  writeCommand: COMMAND_NAME,
  readCommand: COMMAND_NAME,
  data: number,
) {
  // This is the actual write
  state[addressAndCommandToMessageID(address, writeCommand)] = data

  // This optimistically sets the read value, which will become a query
  // on send. It will be sent after the write, which will then update the UI's
  // hardware state tree
  state[addressAndCommandToMessageID(address, readCommand)] = data
}

function AddressPage(props: { address: number }) {
  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: '1em' }}>
        <b>
          Address 0x{byteToHexString(props.address)}{' '}
          {props.address === 0xff ? '(broadcast)' : ''}
        </b>
      </div>

      <SaveContainer>
        <FormGroup label="Pulse Intensity">
          <NumberInput
            accessor={addressAndCommandToMessageID(
              props.address,
              COMMAND_NAMES.CMD_PULSE_AMP_RD,
            )}
            writer={(state, value) => {
              optimisticWriterBuilder(
                state,
                props.address,
                COMMAND_NAMES.CMD_PULSE_AMP_SET,
                COMMAND_NAMES.CMD_PULSE_AMP_RD,
                value,
              )
            }}
            min={0}
            max={100}
            rightElement={<Tag>%</Tag>}
          />
        </FormGroup>

        <FormGroup label="Pulse Intensity Bottom IR">
          <NumberInput
            accessor={addressAndCommandToMessageID(
              props.address,
              COMMAND_NAMES.CMD_PULSE_AMP_B_RD,
            )}
            writer={(state, value) => {
              optimisticWriterBuilder(
                state,
                props.address,
                COMMAND_NAMES.CMD_PULSE_AMP_B_SET,
                COMMAND_NAMES.CMD_PULSE_AMP_B_RD,
                value,
              )
            }}
            min={0}
            max={100}
            rightElement={<Tag>%</Tag>}
          />
        </FormGroup>

        <FormGroup label="Pulse Intensity Top White">
          <NumberInput
            accessor={addressAndCommandToMessageID(
              props.address,
              COMMAND_NAMES.CMD_PULSE_AMP_T_RD,
            )}
            writer={(state, value) => {
              optimisticWriterBuilder(
                state,
                props.address,
                COMMAND_NAMES.CMD_PULSE_AMP_T_SET,
                COMMAND_NAMES.CMD_PULSE_AMP_T_RD,
                value,
              )
            }}
            min={0}
            max={100}
            rightElement={<Tag>%</Tag>}
          />
        </FormGroup>

<FormGroup label="Strobe Pulse Width">
  <Slider
    writer={(state, values) => {
      optimisticWriterBuilder(
        state,
        props.address,
        COMMAND_NAMES.CMD_STRB_PW_SET,
        COMMAND_NAMES.CMD_STRB_PW_RD,
        values.strobe_width,
      )
    }}
    min={100}
    max={500}
    labelRenderer={val => `${val.toFixed(0)}us`}
    stepSize={255 / 0xC8}
    labelStepSize={255 / 0xC8 * 50}
  >
    <Slider.Handle
      name="strobe_width"
      accessor={state => state[addressAndCommandToMessageID(
        props.address,
        COMMAND_NAMES.CMD_STRB_PW_RD,
      )] ?? 100}
    />
  </Slider>
</FormGroup>

<FormGroup label="Strobe Pulse Delay">
  <Slider
    writer={(state, values) => {
      optimisticWriterBuilder(
        state,
        props.address,
        COMMAND_NAMES.CMD_STRB_DELAY_SET,
        COMMAND_NAMES.CMD_STRB_DELAY_RD,
        values.strobe_delay,
      )
    }}
    min={0}
    max={65280}
    labelRenderer={val => `${val}us`}
    stepSize={255}
    labelStepSize={255 * 25}
  >
    <Slider.Handle
      name="strobe_delay"
      accessor={state => state[addressAndCommandToMessageID(
        props.address,
        COMMAND_NAMES.CMD_STRB_DELAY_RD,
      )] ?? 0}
    />
  </Slider>
</FormGroup>

        <SaveButton>Save</SaveButton>
      </SaveContainer>
    </Card>
  )
}

export const OverviewPage = (props: RouteComponentProps) => {
  const [selectedAddress, setSelectedAddress] = useState(0xff)

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
          <AddressPage key={selectedAddress} address={selectedAddress} />
        </div>
      </div>
    </React.Fragment>
  )
}
