import { h } from 'preact'

interface Props {
  name: IconName
  size?: number
  class?: string
}

export type IconName =
  | 'caret-right'
  | 'x'
  | 'copy'
  | 'check'
  | 'arrow-square-out'
  | 'arrow-counter-clockwise'

const PATHS: Record<IconName, string> = {
  'caret-right':
    'M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z',
  'x':
    'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z',
  'copy':
    'M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z',
  'check':
    'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z',
  'arrow-square-out':
    'M224,104a8,8,0,0,1-16,0V59.31l-66.34,66.35a8,8,0,0,1-11.32-11.32L196.69,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z',
  'arrow-counter-clockwise':
    'M224,128a96,96,0,0,1-96,96H80a8,8,0,0,1,0-16h48a80,80,0,1,0-80-80V184l27.31-27.32a8,8,0,0,1,11.32,11.32l-40,40a8,8,0,0,1-11.32,0l-40-40a8,8,0,0,1,11.32-11.32L34.63,184V128a96,96,0,0,1,96-96A96.11,96.11,0,0,1,224,128Z',
}

export function Icon({ name, size = 16, class: className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      class={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
