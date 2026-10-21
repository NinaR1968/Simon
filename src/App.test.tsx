import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App shell', () => {
  it('renders the home screen with board, stage and start button', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'סיימון' })).toBeInTheDocument();
    expect(screen.getByText(/שלב/)).toHaveTextContent('שלב 1 מתוך 10');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });

  it('renders the four quadrants in their spatial positions', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'ירוק' })).toHaveClass('quadrant-top-left');
    expect(screen.getByRole('button', { name: 'אדום' })).toHaveClass('quadrant-top-right');
    expect(screen.getByRole('button', { name: 'צהוב' })).toHaveClass('quadrant-bottom-left');
    expect(screen.getByRole('button', { name: 'כחול' })).toHaveClass('quadrant-bottom-right');
  });

  it('navigates between home and about without a third screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nav = screen.getByRole('navigation', { name: 'ניווט ראשי' });
    expect(nav.querySelectorAll('button')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'אודות' }));
    expect(screen.getByRole('heading', { name: 'על המשחק' })).toBeInTheDocument();
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ירוק' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'אודות' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: 'בית' }));
    expect(screen.getByRole('button', { name: 'ירוק' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'בית' })).toHaveAttribute('aria-current', 'page');
  });
});
