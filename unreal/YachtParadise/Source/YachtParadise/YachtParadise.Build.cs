using System.IO;
using UnrealBuildTool;

public class YachtParadise : ModuleRules
{
	public YachtParadise(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core", "CoreUObject", "Engine", "InputCore",
			"AudioMixer", // USynthComponent: 소리 파일 없이 엔진음·효과음을 합성
		});

		// 엔진 독립 게임 규칙 코어 (Tests/run.sh로 언리얼 없이 테스트한다)
		PublicIncludePaths.Add(Path.Combine(ModuleDirectory, "Core"));

		// 코어는 예외를 쓰지 않는다 (UE 기본값과 같음)
		bEnableExceptions = false;
	}
}
