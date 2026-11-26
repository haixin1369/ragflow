import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes as RouterRoutes } from 'react-router';
import { SideBar } from './index';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The sidebar pulls the KB member permission hook, whose hook module imports
// the real i18n config; stub it to keep the jest ESM-interop failure out.
jest.mock('@/locales/config', () => ({
  i18n: { language: 'en' },
  t: (key: string) => key,
}));

// The sidebar reads the KB member permission hook, which needs a provider
// context; grant the manager view so every menu item renders.
jest.mock('@/pages/dataset/hooks/use-kb-manage-permission', () => ({
  useKbManagePermission: () => ({
    currentUserId: 'u1',
    isSuperuser: true,
    isOwner: true,
    isEditor: true,
    canManage: true,
    canManageMembers: true,
    datasetId: 'dataset-1',
  }),
}));

jest.mock('@/components/truncated-text', () => ({
  TruncatedText: ({ children }: { children: React.ReactNode }) => children,
}));

const Dataset = { name: 'wiki-2333' } as never;

function renderSidebar(onMenuSelect: jest.Mock, onCollapse: jest.Mock) {
  return render(
    <MemoryRouter initialEntries={['/dataset/files/dataset-1']}>
      <RouterRoutes>
        <Route
          path="/dataset/:section/:id"
          element={
            <SideBar
              dataset={Dataset}
              onCollapse={onCollapse}
              onMenuSelect={onMenuSelect}
            />
          }
        />
      </RouterRoutes>
    </MemoryRouter>,
  );
}

describe('SideBar', () => {
  it.each([
    'knowledgeDetails.subbarFiles',
    'knowledgeDetails.testing',
    'knowledgeDetails.overview',
    'knowledgeDetails.configuration',
    'Artifacts',
  ])('notifies when the %s menu item is selected', (label) => {
    const onMenuSelect = jest.fn();
    const onCollapse = jest.fn();
    renderSidebar(onMenuSelect, onCollapse);

    fireEvent.click(screen.getByRole('link', { name: label }));

    expect(onMenuSelect).toHaveBeenCalledTimes(1);
    expect(onCollapse).not.toHaveBeenCalled();
  });
});
