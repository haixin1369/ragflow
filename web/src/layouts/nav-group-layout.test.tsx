import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { NavGroupListFilterBar } from './components/nav-group-list-filter-bar';
import NavGroupLayout from './nav-group-layout';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderListPage(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route element={<NavGroupLayout />}>
          <Route path="/datasets" element={<NavGroupListFilterBar />} />
          <Route path="/memories" element={<NavGroupListFilterBar />} />
          <Route path="/chats" element={<NavGroupListFilterBar />} />
          <Route path="/searches" element={<NavGroupListFilterBar />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('NavGroupLayout list page header', () => {
  it.each([
    ['/datasets', 'sidebar.knowledgeBase'],
    ['/memories', 'sidebar.aiMemory'],
    ['/chats', 'sidebar.chat'],
    ['/searches', 'sidebar.search'],
  ])(
    'renders %s with the page title above the toolbar on the same row',
    (pathname, title) => {
      renderListPage(pathname);

      const heading = screen.getByRole('heading', { name: title });
      const toolbar = screen.getByRole('toolbar');

      expect(heading.compareDocumentPosition(toolbar)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(toolbar.parentElement).toHaveClass(
        'md:flex-row',
        'md:justify-between',
      );
      expect(heading.querySelector('svg')).not.toBeInTheDocument();
    },
  );
});
