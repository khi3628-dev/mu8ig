using UnrealBuildTool;

public class YachtParadiseTarget : TargetRules
{
	public YachtParadiseTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("YachtParadise");
	}
}
