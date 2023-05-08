import { Classes } from '@blueprintjs/core'
import { RouteComponentProps } from '@reach/router'

import { Connections } from '@electricui/components-desktop-blueprint'
import { Logo } from '../components/Logo'
import { navigate } from '@electricui/utility-electron'
import { useConnectionMetadata, useDeviceConnectionHashes, useDeviceMetadataKey } from '@electricui/components-core'
import React from 'react'

const CardInternals = () => {
  const connectionHashes = useDeviceConnectionHashes()
  const connectionMetadata = useConnectionMetadata(connectionHashes[0])

  if (!connectionMetadata?.comPath) {
    return <>Device Not Connected</>
  }

  return (
    <>
      Device on <pre>{connectionMetadata?.comPath ?? 'not connected yet'}</pre>
    </>
  )
}

export const ConnectionPage = (props: RouteComponentProps) => {
  return (
    <React.Fragment>
      <div style={{ height: '100vh' }}>
        <Logo />

        <Connections
          preConnect={deviceID => {}}
          postHandshake={deviceID => navigate(`/devices/${deviceID}`)}
          onFailure={(deviceID, err) => {
            console.log('Connections component got error', err, deviceID)
            navigate(`/`)
          }}
          style={{
            minHeight: '40vh',
            paddingTop: '10vh',
          }}
          internalCardComponent={<CardInternals />}
        />
      </div>
    </React.Fragment>
  )
}
