import { describe, expect, it } from 'vitest'
import { HOTKEYS } from '@/features/editor/hotkeys/hotkeys-registry'

describe('hotkeys registry', () => {
  it('contains unique ids', () => {
    const ids = HOTKEYS.map((hotkey) => hotkey.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('documents reset and vertical movement shortcuts', () => {
    expect(HOTKEYS.find((h) => h.id === 'viewport_reset_shift_c')?.keys).toBe('Shift + C')
    expect(HOTKEYS.find((h) => h.id === 'viewport_move_up')?.keys).toBe('Space')
    expect(HOTKEYS.find((h) => h.id === 'viewport_move_down')?.keys).toBe('Shift')
  })
})
