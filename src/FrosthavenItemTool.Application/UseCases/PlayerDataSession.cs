namespace FrosthavenItemTool.Application.UseCases;

using FrosthavenItemTool.Domain.Builds;

/// <summary>
/// Holds the player's builds for the current session in memory.
/// Both the unlock use case and the build use cases read the builds
/// from here so saves always contain the full picture.
/// </summary>
public sealed class PlayerDataSession
{
    private readonly List<ItemBuild> builds;

    public PlayerDataSession()
    {
        builds = new List<ItemBuild>();
    }

    public IReadOnlyList<ItemBuild> CurrentBuilds
    {
        get
        {
            return builds.ToList();
        }
    }

    public void ReplaceAllBuilds(IEnumerable<ItemBuild> newBuilds)
    {
        builds.Clear();
        builds.AddRange(newBuilds);
    }

    public void AddBuild(ItemBuild build)
    {
        builds.Add(build);
    }

    public void RemoveBuild(Guid buildId)
    {
        // Find by id instead of index so removing is safe even if the
        // list order changed in the user interface.
        ItemBuild? buildToRemove = builds.FirstOrDefault(build => build.Id == buildId);
        if (buildToRemove is not null)
        {
            builds.Remove(buildToRemove);
        }
    }
}
