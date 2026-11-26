import {
  getActiveNavItemKey,
  matchesPath,
  NavItemKey,
} from './navigation';

describe('matchesPath', () => {
  it('matches exact paths and path-segment boundaries', () => {
    expect(matchesPath('/datasets', '/datasets')).toBe(true);
    expect(matchesPath('/dataset/files/1', '/dataset')).toBe(true);
    expect(matchesPath('/chat/abc', '/chat')).toBe(true);
  });

  it('does not match loose substrings', () => {
    expect(matchesPath('/user-setting/chat-channel', '/chat')).toBe(false);
    expect(matchesPath('/searches', '/search')).toBe(false);
    expect(matchesPath('/datasets-extra', '/datasets')).toBe(false);
  });
});

describe('getActiveNavItemKey', () => {
  it('matches home only on the exact root path', () => {
    expect(getActiveNavItemKey('/')).toBe(NavItemKey.Home);
    expect(getActiveNavItemKey('/datasets')).not.toBe(NavItemKey.Home);
  });

  it.each([
    ['/datasets', NavItemKey.KnowledgeBase],
    ['/dataset/files/1', NavItemKey.KnowledgeBase],
    ['/dataset/retrieval/1', NavItemKey.KnowledgeBase],
    ['/chats', NavItemKey.Chat],
    ['/chat/1', NavItemKey.Chat],
    ['/searches', NavItemKey.Search],
    ['/search/1', NavItemKey.Search],
    ['/memories', NavItemKey.Memories],
    ['/memory/memory-message/1', NavItemKey.Memories],
    ['/agents', NavItemKey.Studio],
    ['/agent-templates', NavItemKey.Studio],
    ['/agent/1', NavItemKey.Studio],
    ['/pipeline/1', NavItemKey.Studio],
    ['/agent-log-page/1', NavItemKey.Studio],
    ['/compilation-templates/edit-next', NavItemKey.Studio],
    ['/compilation-templates/edit-next/1', NavItemKey.Studio],
    ['/files', NavItemKey.Library],
    ['/files/skills', NavItemKey.Library],
  ])('maps %s to %s', (pathname, expected) => {
    expect(getActiveNavItemKey(pathname)).toBe(expected);
  });

  it.each([
    ['/integrations/model', NavItemKey.ModelProviders],
    ['/integrations/data-source', NavItemKey.DataSources],
    ['/integrations/data-source/data-source-detail-page', NavItemKey.DataSources],
    ['/integrations/chat-channel', NavItemKey.ChatChannels],
    ['/integrations/mcp', NavItemKey.Mcp],
    ['/user-management', NavItemKey.UserManagement],
    ['/role-management', NavItemKey.RoleManagement],
  ])('maps %s to %s', (pathname, expected) => {
    expect(getActiveNavItemKey(pathname)).toBe(expected);
  });

  it('activates nothing for profile and api settings', () => {
    expect(getActiveNavItemKey('/user-setting/profile')).toBeUndefined();
    expect(getActiveNavItemKey('/user-setting/api')).toBeUndefined();
  });
});
