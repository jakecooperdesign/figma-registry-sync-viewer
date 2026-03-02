import { h } from 'preact'

import styles from '../styles/plugin.module.css'

interface Props {
  color: string | undefined
}

export function ColorSwatch({ color }: Props) {
  if (!color || !color.startsWith('#')) return null

  return (
    <span
      class={styles.swatch}
      style={{ backgroundColor: color }}
      title={color}
    />
  )
}
