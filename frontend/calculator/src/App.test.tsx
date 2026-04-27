import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const binaryCases = [
  {
    name: 'addition',
    first: '12',
    operatorLabel: '+',
    operatorSymbol: '+',
    second: '7',
    result: '19',
  },
  {
    name: 'subtraction',
    first: '15',
    operatorLabel: '-',
    operatorSymbol: '-',
    second: '4',
    result: '11',
  },
  {
    name: 'multiplication',
    first: '6',
    operatorLabel: '*',
    operatorSymbol: '*',
    second: '7',
    result: '42',
  },
  {
    name: 'division',
    first: '8',
    operatorLabel: '/',
    operatorSymbol: '/',
    second: '2',
    result: '4',
  },
  {
    name: 'exponentiation',
    first: '2',
    operatorLabel: '^',
    operatorSymbol: '^',
    second: '8',
    result: '256',
  },
];

const fetchMock = vi.fn();

function mockResponse(body: Record<string, unknown>, ok = true) {
  fetchMock.mockResolvedValue({
    ok,
    json: async () => body,
  });
}

function mockResponseOnce(body: Record<string, unknown>, ok = true) {
  fetchMock.mockResolvedValueOnce({
    ok,
    json: async () => body,
  });
}

function getDisplay(container: HTMLElement) {
  return container.querySelector('[data-cy="display-value"]');
}

function getPending(container: HTMLElement) {
  return container.querySelector('[data-cy="pending-calculation"]');
}

async function clickDigits(user: ReturnType<typeof userEvent.setup>, value: string) {
  for (const character of value) {
    await user.click(screen.getByRole('button', { name: character }));
  }
}

function pendingText(container: HTMLElement) {
  return getPending(container)?.textContent?.replace(/\u00a0/g, '').trim();
}

describe('App', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  binaryCases.forEach(({ name, first, operatorLabel, operatorSymbol, second, result }) => {
    it(`handles ${name} and shows the mocked result`, async () => {
      mockResponseOnce({ result });

      const user = userEvent.setup();
      const { container } = render(<App />);

      await clickDigits(user, first);
      await user.click(screen.getByRole('button', { name: operatorLabel }));
      expect(pendingText(container)).toBe(`${first} ${operatorSymbol}`);
      expect(getDisplay(container)).toHaveTextContent('0');

      await clickDigits(user, second);
      await user.click(screen.getByRole('button', { name: '=' }));

      await waitFor(() => expect(getDisplay(container)).toHaveTextContent(result));
      expect(fetchMock).toHaveBeenCalledWith('/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operand1: first,
          operator: operatorSymbol,
          operand2: second,
        }),
      });
      expect(pendingText(container)).toBe('');
    });
  });

  it('supports unary operators without sending a second operand', async () => {
    mockResponse({ result: '3' });

    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: '9' }));
    await user.click(screen.getByRole('button', { name: '√' }));

    await waitFor(() => expect(getDisplay(container)).toHaveTextContent('3'));
    expect(fetchMock).toHaveBeenCalledWith('/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operand1: '9',
        operator: 'sqrt',
        operand2: undefined,
      }),
    });
  });

  it('shows the server result string exactly as returned', async () => {
    mockResponse({ result: '1.0000000000e+12' });

    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: '9' }));
    await user.click(screen.getByRole('button', { name: '^' }));
    expect(pendingText(container)).toBe('9 ^');

    await user.click(screen.getByRole('button', { name: '9' }));
    await user.click(screen.getByRole('button', { name: '=' }));

    await waitFor(() => expect(getDisplay(container)).toHaveTextContent('1.0000000000e+12'));
    expect(pendingText(container)).toBe('');
  });

  it('keeps the current operand and operator in pending calculation while waiting for the second operand', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await clickDigits(user, '123');
    await user.click(screen.getByRole('button', { name: '+' }));

    expect(pendingText(container)).toBe('123 +');
    expect(getDisplay(container)).toHaveTextContent('0');
  });

  it('supports unary operators with separate mocked responses', async () => {
    mockResponseOnce({ result: '3' });
    mockResponseOnce({ result: '0.25' });

    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: '9' }));
    await user.click(screen.getByRole('button', { name: '√' }));
    await waitFor(() => expect(getDisplay(container)).toHaveTextContent('3'));
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operand1: '9',
        operator: 'sqrt',
        operand2: undefined,
      }),
    });
    expect(pendingText(container)).toBe('');

    await user.click(screen.getByRole('button', { name: 'AC' }));
    await clickDigits(user, '25');
    await user.click(screen.getByRole('button', { name: '%' }));

    await waitFor(() => expect(getDisplay(container)).toHaveTextContent('0.25'));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operand1: '25',
        operator: '%',
        operand2: undefined,
      }),
    });
    expect(pendingText(container)).toBe('');
  });

  it('handles local entry editing controls', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '.' }));
    await user.click(screen.getByRole('button', { name: '.' }));
    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: '+/-' }));
    expect(getDisplay(container)).toHaveTextContent('-1.5');

    await user.click(screen.getByRole('button', { name: 'DEL' }));
    expect(getDisplay(container)).toHaveTextContent('-1.');

    await user.click(screen.getByRole('button', { name: 'DEL' }));
    expect(getDisplay(container)).toHaveTextContent('-1');

    await user.click(screen.getByRole('button', { name: 'AC' }));
    expect(getDisplay(container)).toHaveTextContent('0');

    await user.click(screen.getByRole('button', { name: '8' }));
    await user.click(screen.getByRole('button', { name: '*' }));
    await user.click(screen.getByRole('button', { name: '4' }));
    expect(pendingText(container)).toBe('8 *');

    await user.click(screen.getByRole('button', { name: 'AC' }));
    expect(getDisplay(container)).toHaveTextContent('0');
    expect(pendingText(container)).toBe('');
  });

  it('does not add equals to the pending calculation screen', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    expect(getDisplay(container)).toHaveTextContent('0');
    expect(pendingText(container)).toBe('');

    await user.click(screen.getByRole('button', { name: '=' }));

    expect(getDisplay(container)).toHaveTextContent('0');
    expect(pendingText(container)).toBe('');
  });

  it('shows API errors to the user', async () => {
    mockResponse({ error: 'Division by zero' }, false);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '8' }));
    await user.click(screen.getByRole('button', { name: '/' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '=' }));

    expect(await screen.findByText('Division by zero')).toBeInTheDocument();
  });
});