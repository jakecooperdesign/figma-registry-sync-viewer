import { render, useWindowResize } from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import { h } from 'preact'

import './styles/global.css'
import { App } from './components/App'
import { ResizeWindowHandler } from './types'

function Plugin() {
  function onWindowResize(windowSize: { width: number; height: number }) {
    emit<ResizeWindowHandler>('RESIZE_WINDOW', windowSize)
  }
  useWindowResize(onWindowResize, {
    maxHeight: 800,
    maxWidth: 600,
    minHeight: 400,
    minWidth: 320,
    resizeBehaviorOnDoubleClick: 'minimize',
  })
  return <App />
}

export default render(Plugin)
