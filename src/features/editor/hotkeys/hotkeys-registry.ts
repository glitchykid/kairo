export interface HotkeyDefinition {
  id: string
  keys: string
  descriptionKey: string
  context: 'viewport' | 'global'
}

export const HOTKEYS: HotkeyDefinition[] = [
  {
    id: 'viewport_orbit',
    keys: 'MMB Drag',
    descriptionKey: 'hotkeys.orbit',
    context: 'viewport',
  },
  {
    id: 'viewport_pan_shift_mmb',
    keys: 'Shift + MMB Drag',
    descriptionKey: 'hotkeys.panShiftMmb',
    context: 'viewport',
  },
  {
    id: 'viewport_pan_rmb',
    keys: 'RMB Drag',
    descriptionKey: 'hotkeys.panRmb',
    context: 'viewport',
  },
  {
    id: 'viewport_adjust_camera_speed',
    keys: 'Mouse Wheel',
    descriptionKey: 'hotkeys.adjustCameraSpeed',
    context: 'viewport',
  },
  {
    id: 'viewport_move_wasd',
    keys: 'W / A / S / D',
    descriptionKey: 'hotkeys.moveWasd',
    context: 'viewport',
  },
  {
    id: 'viewport_move_up',
    keys: 'Space',
    descriptionKey: 'hotkeys.moveUp',
    context: 'viewport',
  },
  {
    id: 'viewport_move_down',
    keys: 'Ctrl',
    descriptionKey: 'hotkeys.moveDown',
    context: 'viewport',
  },
  {
    id: 'viewport_reset_shift_c',
    keys: 'Shift + C',
    descriptionKey: 'hotkeys.resetShiftC',
    context: 'viewport',
  },
  {
    id: 'viewport_context_menu',
    keys: 'Right Click',
    descriptionKey: 'hotkeys.contextMenu',
    context: 'viewport',
  },
]
