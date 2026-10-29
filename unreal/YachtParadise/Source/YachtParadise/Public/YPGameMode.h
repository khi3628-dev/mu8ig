// 게임 전체 흐름: 타이틀 → 파라다이스(건설) → 레이스 → 결과 → 파라다이스.
// 규칙은 모두 코어(yp::*)가 정하고, 이 클래스는 코어를 매 프레임 돌리며 액터·카메라·소리를 맞춘다.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "YPCore.h"
#include "YPGameMode.generated.h"

class ACameraActor;
class AYPCourse;
class AYPFish;
class AYPJetSki;
class AYPParadise;
class UYPRaceSynthComponent;

UENUM()
enum class EYPPhase : uint8
{
	Title,
	Paradise,
	Race,
	Result,
};

UCLASS()
class YACHTPARADISE_API AYPGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AYPGameMode();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	// 건설 도구: 0~8 시설(yp::ItemId 순서), 9 섬 확장, 10 팔기
	static constexpr int32 ToolReclaim = 9;
	static constexpr int32 ToolSell = 10;

	// ---- 입력 (AYPPlayerController가 호출)
	void SetRaceInput(double InThrottle, double InSteer);
	void PressFish();
	void ToggleGear();
	void ToggleMute();
	void Confirm(); // Enter: 시작 / 레이스 출전 / 결과 닫기
	void SelectTool(int32 InTool);
	void BuyUpgrade(int32 Upgrade);
	void PointAt(const FVector& Origin, const FVector& Direction, bool bClick);

	// ---- HUD가 읽는 상태
	EYPPhase GetPhase() const { return Phase; }
	const yp::Save& GetSave() const { return Save; }
	const yp::RaceState* GetRace() const { return Race.Get(); }
	const yp::RaceResult* GetResult() const { return Result.Get(); }
	int32 GetTool() const { return Tool; }
	bool IsReverse() const { return bReverse; }
	bool IsMuted() const { return bMuted; }
	bool CanFishNow() const { return bCanFish; }
	const FString& GetNotice() const { return Notice; }
	AYPJetSki* GetSki(int32 Index) const { return Skis.IsValidIndex(Index) ? Skis[Index].Get() : nullptr; }

private:
	void SpawnEnvironment();
	void EnterParadise();
	void StartRace();
	void TickRace(double Dt);
	void FinishRace();
	void ApplyBuild(int32 Index);
	void ShowNotice(const FString& Text);
	void ViewFrom(ACameraActor* Camera);

	EYPPhase Phase = EYPPhase::Title;
	yp::Save Save;
	TUniquePtr<yp::RaceState> Race;
	TUniquePtr<yp::RaceResult> Result;
	yp::SfxSnap SfxPrev;

	int32 Tool = 0;
	int32 HoverIndex = -1;
	bool bReverse = false;
	bool bMuted = false;
	bool bFishPressed = false;
	bool bCanFish = false;
	double Throttle = 0;
	double Steer = 0;
	double Clock = 0;
	double FinishDelay = -1;
	double CamHeading = 0;
	double CamFov = 90;
	double Shake = 0;
	int32 SeenContacts = 0;
	FString Notice;
	double NoticeTimer = 0;

	UPROPERTY()
	TObjectPtr<AYPCourse> Course;

	UPROPERTY()
	TObjectPtr<AYPParadise> Paradise;

	UPROPERTY()
	TArray<TObjectPtr<AYPJetSki>> Skis;

	UPROPERTY()
	TObjectPtr<AYPJetSki> GhostSki;

	UPROPERTY()
	TMap<int32, TObjectPtr<AYPFish>> FishActors;

	UPROPERTY()
	TObjectPtr<ACameraActor> RaceCamera;

	UPROPERTY()
	TObjectPtr<ACameraActor> ParadiseCamera;

	UPROPERTY()
	TObjectPtr<UYPRaceSynthComponent> Audio;
};
