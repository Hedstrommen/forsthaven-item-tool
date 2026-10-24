namespace FrosthavenItemTool.Domain.Builds;

/// <summary>
/// The outcome of trying to equip an item onto a build.
/// Carries a human-readable reason when the equip failed,
/// so the interface can explain the rule that was violated.
/// </summary>
public sealed class EquipResult
{
    // True when the item was equipped.
    public bool IsSuccess { get; }

    // The rule violation explained in plain words, or an empty string on success.
    public string FailureReason { get; }

    private EquipResult(bool isSuccess, string failureReason)
    {
        IsSuccess = isSuccess;
        FailureReason = failureReason;
    }

    public static EquipResult Succeeded()
    {
        return new EquipResult(true, "");
    }

    public static EquipResult Failed(string reason)
    {
        return new EquipResult(false, reason);
    }
}
