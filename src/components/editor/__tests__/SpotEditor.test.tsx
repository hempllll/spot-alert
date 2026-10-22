import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_LINEAR, SLIDER_SCALES } from '../../../editor/constants'
import { presetIdeal } from '../../../editor/range'
import type { Spot } from '../../../scoring'
import SpotEditor, { type SpotEditorProps } from '../SpotEditor'

// MapLibre needs WebGL, which jsdom lacks: stand in a button that "places" the pin.
vi.mock('../MapPicker', async () => {
  const { createElement } = await import('react')
  return {
    MapPicker: ({ onChange }: { onChange: (c: { lat: number; lon: number }) => void }) =>
      createElement('button', { type: 'button', onClick: () => onChange({ lat: 54.45, lon: 10.2 }) }, 'Place pin'),
  }
})

// The coast snapshot also needs WebGL: hand back a fake picture URL instead.
vi.mock('../coastSnapshot', () => ({
  renderCoastSnapshot: vi.fn(async () => 'blob:coast-picture'),
}))

function renderEditor(props: Partial<SpotEditorProps> = {}) {
  const onSave = vi.fn()
  const onDelete = vi.fn()
  render(
    <SpotEditor
      spot={null}
      center={null}
      searchPlaces={async () => [{ name: 'Laboe', lat: 54.41, lon: 10.22, country: 'Germany' }]}
      getPosition={async () => ({ lat: 54.3, lon: 10.1 })}
      onSave={onSave}
      onCancel={() => {}}
      {...props}
    />,
  )
  return { onSave, onDelete, user: userEvent.setup() }
}

describe('SpotEditor', () => {
  it('blocks saving until the spot is named and placed', async () => {
    const { onSave, user } = renderEditor()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Give the spot a name.')
    expect(screen.getByRole('alert')).toHaveTextContent('Place the spot on the map.')
    expect(onSave).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Name'), 'Heidkate')
    await user.click(screen.getByRole('button', { name: 'Place pin' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith({
      name: 'Heidkate',
      lat: 54.45,
      lon: 10.2,
      conditionSets: [{ name: 'Conditions 1', windSpeed: DEFAULT_LINEAR.windSpeed }],
    })
  })

  it('names an unnamed spot after a searched place', async () => {
    const { user } = renderEditor()
    await user.type(screen.getByLabelText('Search place'), 'Laboe')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(await screen.findByRole('button', { name: 'Laboe, Germany' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Laboe')
    expect(screen.getByText('54.410° N, 10.220° E')).toBeInTheDocument()
  })

  it('switches factors on and applies presets', async () => {
    const { user } = renderEditor()
    await user.click(screen.getByRole('checkbox', { name: /Wind direction/ }))
    expect(screen.getByRole('group', { name: 'Wind direction' })).toBeInTheDocument()

    // Expected values come from the tuning constants, so retuning defaults
    // doesn't break the test — as long as the preset actually changes something.
    const { usable, ideal: before } = DEFAULT_LINEAR.windSpeed
    const after = presetIdeal(usable, 'more', SLIDER_SCALES.windSpeed.step)
    expect(after).not.toEqual(before)

    const presets = screen.getByRole('group', { name: 'Wind speed presets' })
    await user.click(within(presets).getByRole('button', { name: 'More is better' }))
    expect(
      screen.getByText(`usable ${usable.min}–${usable.max} kn · ideal ${after.min}–${after.max} kn`),
    ).toBeInTheDocument()
  })

  it('shows the coast behind the direction dial once the spot is placed', async () => {
    const { user } = renderEditor()
    await user.click(screen.getByRole('checkbox', { name: /Wind direction/ }))
    expect(screen.getByText(/Place the spot on the map to see the coast here/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Place pin' }))
    const dial = screen.getByRole('group', { name: 'Wind direction' })
    await waitFor(() =>
      expect(dial.querySelector('image')).toHaveAttribute('href', 'blob:coast-picture'),
    )
    expect(
      screen.getByText('Arcs show where the wind comes from. The dot in the middle is the spot.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Place the spot on the map/)).not.toBeInTheDocument()
  })

  it('words the hint for waves on the wave direction dial', async () => {
    const { user } = renderEditor()
    await user.click(screen.getByRole('checkbox', { name: /Wave direction/ }))
    expect(screen.getByText(/Arcs show where the waves come from\./)).toBeInTheDocument()
  })

  it('asks where waves come from only once a wave factor is on', async () => {
    const { user } = renderEditor()
    expect(screen.queryByRole('group', { name: 'Waves from' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Wave height/ }))
    expect(screen.getByRole('group', { name: 'Waves from' })).toBeInTheDocument()
  })

  it('adds and deletes condition sets, always keeping one', async () => {
    const { user } = renderEditor()
    const deleteSet = screen.getByRole('button', { name: 'Delete this set' })
    expect(deleteSet).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '+ Add set' }))
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Conditions 1', 'Conditions 1 (copy)'])
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')

    await user.click(deleteSet)
    expect(screen.getAllByRole('tab')).toHaveLength(1)
    expect(deleteSet).toBeDisabled()
  })

  it('deletes an existing spot only after confirming', async () => {
    const spot: Spot = {
      id: 'laboe',
      name: 'Laboe',
      lat: 54.41,
      lon: 10.22,
      conditionSets: [{ windSpeed: { usable: { min: 12, max: 30 }, ideal: { min: 16, max: 24 } } }],
    }
    const onDelete = vi.fn()
    const { user } = renderEditor({ spot, onDelete })
    expect(screen.getByRole('heading', { name: 'Edit spot' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete spot' }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Delete “Laboe” for good?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalled()
  })
})
