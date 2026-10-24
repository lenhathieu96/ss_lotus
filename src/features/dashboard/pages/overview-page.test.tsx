import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OverviewPage from './overview-page';

describe('OverviewPage', () => {
  it('renders the overview page', () => {
    render(<OverviewPage />);

    expect(screen.getByRole('heading', { name: 'Không gian quản trị lễ' })).toBeVisible();
  });
});
