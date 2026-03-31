import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'

const renderTopbar = (props = {}) =>
  render(
    <BrowserRouter>
      <Topbar title='מחשבון תכ"ם' showHomeLink={false} {...props} />
    </BrowserRouter>
  )

describe('Topbar', () => {
  it('renders the title', () => {
    renderTopbar()
    expect(screen.getByText(/מחשבון/)).toBeInTheDocument()
  })

  it('shows home link when showHomeLink is true', () => {
    renderTopbar({ showHomeLink: true })
    expect(screen.getByText('← דשבורד')).toBeInTheDocument()
  })

  it('hides home link when showHomeLink is false', () => {
    renderTopbar({ showHomeLink: false })
    expect(screen.queryByText('← דשבורד')).not.toBeInTheDocument()
  })

  it('renders user initial when userName is provided', () => {
    renderTopbar({ userName: 'תומר' })
    expect(screen.getByText('ת')).toBeInTheDocument()
  })
})
