import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app name', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: 'spot-alert' }),
    ).toBeInTheDocument()
  })

  it('increments the counter on click', async () => {
    const user = userEvent.setup()
    render(<App />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('clicked 0 times')
    await user.click(button)
    expect(button).toHaveTextContent('clicked 1 time')
  })
})
