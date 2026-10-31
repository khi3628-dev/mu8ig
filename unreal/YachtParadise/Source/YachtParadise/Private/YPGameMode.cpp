#include "YPGameMode.h"

#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/SkyAtmosphereComponent.h"
#include "Components/SkyLightComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/ExponentialHeightFog.h"
#include "Engine/SkyLight.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "YPCourse.h"
#include "YPHUD.h"
#include "YPJetSki.h"
#include "YPParadise.h"
#include "YPPlayerController.h"
#include "YPRaceSynthComponent.h"
#include "YPSaveGame.h"
#include "YPShapes.h"

namespace YPGameModeDetail
{
	// 레이스 코스에서 떨어진 곳에 섬을 둔다 (코스는 원점 주변 ±250m)
	static const FVector ParadiseOrigin(0, -90000, 0);

	static double AngleDiff(double A, double B) { return std::atan2(std::sin(A - B), std::cos(A - B)); }

	static FString ToFString(const std::string& S) { return FString(UTF8_TO_TCHAR(S.c_str())); }
}

AYPGameMode::AYPGameMode()
{
	PrimaryActorTick.bCanEverTick = true;
	PlayerControllerClass = AYPPlayerController::StaticClass();
	HUDClass = AYPHUD::StaticClass();
	DefaultPawnClass = nullptr; // 카메라 액터로 보므로 폰이 필요 없다
}

void AYPGameMode::BeginPlay()
{
	Super::BeginPlay();
	using namespace YPGameModeDetail;
	Save = UYPSaveGame::Load();
	SpawnEnvironment();

	UWorld* Level = GetWorld();
	Paradise = Level->SpawnActor<AYPParadise>(ParadiseOrigin, FRotator::ZeroRotator);
	Paradise->Sync(Save);
	const FTransform Overview = Paradise->OverviewCamera();
	ParadiseCamera = Level->SpawnActor<ACameraActor>(Overview.GetLocation(), Overview.Rotator());
	ParadiseCamera->GetCameraComponent()->SetFieldOfView(55);
	RaceCamera = Level->SpawnActor<ACameraActor>(FVector(0, 0, 1000), FRotator::ZeroRotator);
	RaceCamera->GetCameraComponent()->SetFieldOfView(CamFov);

	// 소리는 레이스 카메라에 붙여 계속 재생한다 (레이스 밖에서는 엔진이 공회전 소리만 낸다)
	Audio = NewObject<UYPRaceSynthComponent>(RaceCamera);
	Audio->SetupAttachment(RaceCamera->GetRootComponent());
	Audio->RegisterComponent();
	Audio->SetMutedState(true); // 타이틀·파라다이스에선 조용히
	Audio->Start();

	ViewFrom(ParadiseCamera);
	Phase = EYPPhase::Title;
}

void AYPGameMode::SpawnEnvironment()
{
	UWorld* Level = GetWorld();
	if (ADirectionalLight* Sun = Level->SpawnActor<ADirectionalLight>(FVector::ZeroVector, FRotator(-38, 40, 0)))
	{
		ULightComponent* Light = Sun->GetLightComponent();
		Light->SetMobility(EComponentMobility::Movable);
		Light->SetIntensity(9.f);
		if (UDirectionalLightComponent* Dir = Cast<UDirectionalLightComponent>(Light))
		{
			Dir->SetAtmosphereSunLight(true);
		}
	}
	Level->SpawnActor<ASkyAtmosphere>();
	if (ASkyLight* Sky = Level->SpawnActor<ASkyLight>())
	{
		USkyLightComponent* SkyComp = Sky->GetLightComponent();
		SkyComp->SetMobility(EComponentMobility::Movable);
		SkyComp->bRealTimeCapture = true;
		SkyComp->RecaptureSky();
	}
	if (AExponentialHeightFog* Fog = Level->SpawnActor<AExponentialHeightFog>())
	{
		Fog->GetComponent()->SetFogDensity(0.0015f);
	}
}

void AYPGameMode::ViewFrom(ACameraActor* Camera)
{
	if (APlayerController* Pc = GetWorld()->GetFirstPlayerController())
	{
		Pc->SetViewTargetWithBlend(Camera, 0.4f);
	}
}

void AYPGameMode::ShowNotice(const FString& Text)
{
	Notice = Text;
	NoticeTimer = Text.IsEmpty() ? 0 : 2.5;
}

// ---------------------------------------------------------------- 입력

void AYPGameMode::SetRaceInput(double InThrottle, double InSteer)
{
	Throttle = InThrottle;
	Steer = InSteer;
}

void AYPGameMode::PressFish() { bFishPressed = true; }

void AYPGameMode::ToggleGear()
{
	if (Phase != EYPPhase::Race)
	{
		return;
	}
	bReverse = !bReverse;
	Audio->Trigger(yp::SfxEvent{yp::SfxType::Gear});
}

void AYPGameMode::ToggleMute()
{
	bMuted = !bMuted;
	Audio->SetMutedState(bMuted || Phase != EYPPhase::Race);
}

void AYPGameMode::Confirm()
{
	switch (Phase)
	{
	case EYPPhase::Title: EnterParadise(); break;
	case EYPPhase::Paradise: StartRace(); break;
	case EYPPhase::Result: EnterParadise(); break;
	case EYPPhase::Race: break;
	}
}

void AYPGameMode::SelectTool(int32 InTool)
{
	if (Phase == EYPPhase::Paradise && InTool >= 0 && InTool <= ToolSell)
	{
		Tool = InTool;
	}
}

void AYPGameMode::BuyUpgrade(int32 Upgrade)
{
	if (Phase != EYPPhase::Paradise || Upgrade < 0 || Upgrade >= yp::kUpgradeCount)
	{
		return;
	}
	const yp::Error Err = yp::buyUpgrade(Save, static_cast<yp::UpgradeId>(Upgrade));
	if (Err)
	{
		ShowNotice(YPGameModeDetail::ToFString(yp::englishError(*Err)));
		return;
	}
	UYPSaveGame::Store(Save);
	ShowNotice(FString::Printf(TEXT("%s UPGRADED"), UTF8_TO_TCHAR(yp::upgradeDef(static_cast<yp::UpgradeId>(Upgrade)).en)));
}

void AYPGameMode::PointAt(const FVector& Origin, const FVector& Direction, bool bClick)
{
	if (Phase != EYPPhase::Paradise)
	{
		return;
	}
	int32 Index = -1;
	if (!Paradise->TraceCell(Origin, Direction, Index))
	{
		Index = -1;
	}
	HoverIndex = Index;
	bool bValid = false;
	if (Index >= 0)
	{
		if (Tool == ToolSell) bValid = Save.cells[Index].item.has_value();
		else if (Tool == ToolReclaim) bValid = !yp::reclaimError(Save, Index);
		else bValid = !yp::placeError(Save, Index, static_cast<yp::ItemId>(Tool));
	}
	Paradise->SetHover(Index, bValid);
	if (bClick && Index >= 0)
	{
		ApplyBuild(Index);
	}
}

void AYPGameMode::ApplyBuild(int32 Index)
{
	yp::Error Err;
	if (Tool == ToolReclaim) Err = yp::reclaim(Save, Index);
	else if (Tool == ToolSell) Err = yp::sell(Save, Index);
	else Err = yp::place(Save, Index, static_cast<yp::ItemId>(Tool));
	if (Err)
	{
		ShowNotice(YPGameModeDetail::ToFString(yp::englishError(*Err)));
		return;
	}
	UYPSaveGame::Store(Save);
	Paradise->Sync(Save);
	ShowNotice(TEXT(""));
}

// ---------------------------------------------------------------- 단계 전환

void AYPGameMode::EnterParadise()
{
	Phase = EYPPhase::Paradise;
	Paradise->Sync(Save);
	Audio->SetMutedState(true);
	ViewFrom(ParadiseCamera);
	if (APlayerController* Pc = GetWorld()->GetFirstPlayerController())
	{
		Pc->SetShowMouseCursor(true);
	}
}

void AYPGameMode::StartRace()
{
	Race = MakeUnique<yp::RaceState>(
		yp::createRace([] { return static_cast<double>(FMath::FRand()); }, yp::playerStats(Save), yp::racePerks(Save), Save.bestRun));
	Result.Reset();
	UWorld* Level = GetWorld();
	if (!Course)
	{
		Course = Level->SpawnActor<AYPCourse>();
		Course->Build(*Race);
	}
	if (Skis.Num() == 0)
	{
		for (int32 i = 0; i < static_cast<int32>(Race->racers.size()); i++)
		{
			AYPJetSki* Ski = Level->SpawnActor<AYPJetSki>();
			const bool bPlayer = i == 0;
			const FLinearColor Color = YPShapes::Hex(Race->racers[i].color);
			Ski->Build(bPlayer ? FLinearColor::White : Color, bPlayer ? FLinearColor::White : Color, bPlayer);
			Skis.Add(Ski);
		}
		GhostSki = Level->SpawnActor<AYPJetSki>();
		GhostSki->Build(YPShapes::Hex(0x9be7ff), YPShapes::Hex(0x9be7ff), false);
		GhostSki->SetActorEnableCollision(false);
	}
	for (int32 i = 0; i < Skis.Num(); i++)
	{
		Skis[i]->Hop = yp::Hop{};
		Skis[i]->Roll = 0;
		Skis[i]->PrevHeading = Race->racers[i].heading;
	}
	GhostSki->SetActorHiddenInGame(!Race->ghost.has_value());
	for (auto& Pair : FishActors)
	{
		if (Pair.Value) Pair.Value->Destroy();
	}
	FishActors.Reset();

	Clock = 0;
	FinishDelay = -1;
	bReverse = false;
	bFishPressed = false;
	CamHeading = Race->racers[0].heading;
	SeenContacts = 0;
	Shake = 0;
	SfxPrev = yp::sfxSnapshot(*Race);
	SfxPrev.count = 0; // 첫 프레임에 "3" 비프가 나게
	Phase = EYPPhase::Race;
	Audio->SetMutedState(bMuted);
	ViewFrom(RaceCamera);
	if (APlayerController* Pc = Level->GetFirstPlayerController())
	{
		Pc->SetShowMouseCursor(false);
	}
}

void AYPGameMode::FinishRace()
{
	Result = MakeUnique<yp::RaceResult>(yp::raceResult(*Race));
	yp::applyRaceReward(Save, Result->rank, Result->prize, Result->fishCoins, static_cast<int>(Result->caught.size()));
	yp::applyBestRun(Save, Result->run);
	UYPSaveGame::Store(Save);
	Phase = EYPPhase::Result;
	Audio->SetFrame(0, false, false, false, 0, 1, 0);
}

// ---------------------------------------------------------------- 매 프레임

void AYPGameMode::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	const double Dt = FMath::Min(static_cast<double>(DeltaSeconds), 0.1);
	NoticeTimer = FMath::Max(0.0, NoticeTimer - Dt);
	if (NoticeTimer <= 0)
	{
		Notice.Reset();
	}
	if (Paradise)
	{
		Paradise->Animate(GetWorld()->GetTimeSeconds());
	}
	if (Phase == EYPPhase::Race && Race)
	{
		TickRace(Dt);
	}
}

void AYPGameMode::TickRace(double Dt)
{
	using namespace YPGameModeDetail;
	yp::RaceInput In;
	In.throttle = Throttle;
	In.steer = Steer;
	In.fish = bFishPressed;
	In.reverse = bReverse;
	bFishPressed = false;
	yp::updateRace(*Race, Dt, In, [] { return static_cast<double>(FMath::FRand()); });
	Clock += Dt;
	const double T = Clock;
	const yp::Racer& P0 = Race->racers[0];

	Course->Animate(T);
	Course->HighlightGate(P0.next);

	// 레이서: 파도 위 통통 튀기 + 코너링 기울기
	for (int32 i = 0; i < Skis.Num(); i++)
	{
		const yp::Racer& R = Race->racers[i];
		AYPJetSki* Ski = Skis[i];
		const double DirX = std::cos(R.heading), DirY = std::sin(R.heading);
		const double Ahead = Course->SurfaceHeight(R.x + DirX * 1.6, R.y + DirY * 1.6, T);
		const double Behind = Course->SurfaceHeight(R.x - DirX * 1.6, R.y - DirY * 1.6, T);
		const double SpeedFrac = FMath::Min(std::abs(R.speed) / 30, 1.3);
		const double Impact = yp::stepHop(Ski->Hop, Course->SurfaceHeight(R.x, R.y, T) + yp::chop(R.x, R.y, T) + 0.15, Dt, R.speed / 30);
		const double Pitch = std::atan2(Ahead - Behind, 3.2) + 0.07 * SpeedFrac + (Ski->Hop.airborne ? 0.1 : 0);
		const double YawRate = AngleDiff(R.heading, Ski->PrevHeading) / Dt;
		Ski->PrevHeading = R.heading;
		const double TargetRoll = FMath::Clamp(YawRate * 0.25, -0.55, 0.55) * FMath::Min(SpeedFrac, 1.0);
		Ski->Roll += (TargetRoll - Ski->Roll) * (1 - std::exp(-6 * Dt));
		Ski->SetPose(R.x, R.y, Ski->Hop.y, R.heading, Pitch, Ski->Roll);
		if (i == 0 && Impact > 0.8)
		{
			Audio->Splash(Impact);
		}
	}
	if (Race->ghost)
	{
		const yp::Pose G = yp::ghostPose(*Race->ghost, FMath::Max(0.0, Race->time));
		GhostSki->SetPose(G.x, G.y, Course->SurfaceHeight(G.x, G.y, T) + 0.15, G.heading, 0, 0);
	}

	// 뛰어오르는 물고기
	bCanFish = false;
	TSet<int32> Alive;
	for (const yp::JumpingFish& F : Race->fish)
	{
		Alive.Add(F.id);
		TObjectPtr<AYPFish>* Found = FishActors.Find(F.id);
		AYPFish* Fish = Found ? Found->Get() : nullptr;
		if (!Fish)
		{
			Fish = GetWorld()->SpawnActor<AYPFish>();
			Fish->Build(F.species);
			FishActors.Add(F.id, Fish);
		}
		const double Phase01 = 1 - F.life / F.maxLife;
		const double Lift = std::sin(Phase01 * PI) * 5;
		Fish->SetActorLocationAndRotation(FVector(F.x, F.y, Lift + 0.2) * 100.0,
			FRotator(FMath::RadiansToDegrees(std::cos(Phase01 * PI) * 0.9), F.id * 97.0, 0));
		if (std::hypot(F.x - P0.x, F.y - P0.y) <= Race->stats.catchRadius)
		{
			bCanFish = true;
		}
	}
	for (auto It = FishActors.CreateIterator(); It; ++It)
	{
		if (!Alive.Contains(It.Key()))
		{
			if (It.Value()) It.Value()->Destroy();
			It.RemoveCurrent();
		}
	}

	// 추적 카메라: 진행 방향을 부드럽게 따라가고, 출발 전엔 멀리서 다가오며, 충돌하면 흔들린다
	CamHeading += AngleDiff(P0.heading, CamHeading) * (1 - std::exp(-4 * Dt));
	if (Race->contacts > SeenContacts) Shake = 0.3;
	SeenContacts = Race->contacts;
	Shake = FMath::Max(0.0, Shake - Dt);
	const double Cx = std::cos(CamHeading), Cy = std::sin(CamHeading);
	const double Intro = FMath::Max(0.0, -Race->time) / 3;
	const double Back = 13 + Intro * 14;
	const FVector Jolt = FVector(FMath::FRandRange(-0.5, 0.5), FMath::FRandRange(-0.5, 0.5), FMath::FRandRange(-0.5, 0.5)) * Shake * 1.2;
	const FVector Eye = (FVector(P0.x - Cx * Back, P0.y - Cy * Back, 5.6 + Intro * 9) + Jolt) * 100.0;
	const FVector Look = FVector(P0.x + Cx * 9, P0.y + Cy * 9, 1.8) * 100.0;
	RaceCamera->SetActorLocationAndRotation(Eye, (Look - Eye).Rotation());
	const double TargetFov = 90 + FMath::Min(std::abs(P0.speed) / 30, 1.3) * 10 + (P0.boost > 0 ? 6 : 0);
	CamFov += (TargetFov - CamFov) * (1 - std::exp(-5 * Dt));
	RaceCamera->GetCameraComponent()->SetFieldOfView(CamFov);

	// 소리: 가장 가까운 라이벌의 거리·접근 속도로 도플러
	double NearD = 1e9;
	const yp::Racer* Near = nullptr;
	for (const yp::Racer& R : Race->racers)
	{
		const double D = std::hypot(R.x - P0.x, R.y - P0.y);
		if (!R.isPlayer && D < NearD)
		{
			NearD = D;
			Near = &R;
		}
	}
	double Prox = 0, Doppler = 1, RivalSpeed = 0;
	if (Near && NearD > 0.1)
	{
		const double Ux = (P0.x - Near->x) / NearD, Uy = (P0.y - Near->y) / NearD;
		const double Closing = (std::cos(Near->heading) * Near->speed - std::cos(P0.heading) * P0.speed) * Ux +
			(std::sin(Near->heading) * Near->speed - std::sin(P0.heading) * P0.speed) * Uy;
		Prox = FMath::Clamp(1 - NearD / 70, 0.0, 1.0);
		Doppler = FMath::Clamp(1 / (1 - Closing / 120), 0.75, 1.35);
		RivalSpeed = Near->speed / 30;
	}
	Audio->SetFrame(FMath::Min(std::abs(P0.speed) / 30, 1.3), Throttle > 0 && Race->time >= 0, Skis[0]->Hop.airborne, P0.boost > 0,
		Prox, Doppler, RivalSpeed);
	const yp::SfxSnap Snap = yp::sfxSnapshot(*Race);
	for (const yp::SfxEvent& E : yp::sfxEvents(SfxPrev, Snap))
	{
		Audio->Trigger(E);
	}
	SfxPrev = Snap;

	if (Race->done)
	{
		if (FinishDelay < 0) FinishDelay = 1.2;
		FinishDelay -= Dt;
		if (FinishDelay <= 0) FinishRace();
	}
}
