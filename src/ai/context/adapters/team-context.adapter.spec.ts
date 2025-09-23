import { TeamContextAdapter } from './team-context.adapter';

describe('TeamContextAdapter', () => {
  it('maps contributors to team members', async () => {
    const adapter = new TeamContextAdapter({
      getContributors: async () => [
        { userId: 'u1', user: { name: 'User 1' } },
        { userId: 'u2', user: { name: null } },
      ],
    } as any);
    const team = await adapter.getTeam('p1');
    expect(team).toEqual([
      { id: 'u1', displayName: 'User 1' },
      { id: 'u2', displayName: 'u2' },
    ]);
  });
});
