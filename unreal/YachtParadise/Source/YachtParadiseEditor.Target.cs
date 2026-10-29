using UnrealBuildTool;

public class YachtParadiseEditorTarget : TargetRules
{
	public YachtParadiseEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("YachtParadise");
	}
}
