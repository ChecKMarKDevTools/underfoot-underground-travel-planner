import { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  const user = userEvent.setup();
  return {
    user,
    ...rtlRender(ui, { wrapper: AllTheProviders, ...options }),
  };
};

export * from '@testing-library/react';
export { customRender as render };
