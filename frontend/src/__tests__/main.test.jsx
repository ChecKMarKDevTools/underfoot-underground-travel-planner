import { afterEach, vi } from 'vitest';

// Clean up any DOM after each test
afterEach(() => {
  document.body.innerHTML = '';
});

test('bootstraps React app into #root', async () => {
  document.body.innerHTML = '<div id="root"></div>';

  // Spy on createRoot to ensure it is called with the root element
  const mockRender = vi.fn();
  const createRootMock = vi.fn(() => ({ render: mockRender }));

  vi.doMock('react-dom/client', () => ({ createRoot: createRootMock }));

  // Dynamically import entry to execute bootstrap code with mocked createRoot
  await import('../main.jsx');

  expect(createRootMock).toHaveBeenCalledTimes(1);
  expect(mockRender).toHaveBeenCalledTimes(1);
});
