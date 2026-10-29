#include "YPPlayerController.h"

#include "Engine/World.h"
#include "InputCoreTypes.h"
#include "YPGameMode.h"

AYPPlayerController::AYPPlayerController()
{
	bShowMouseCursor = true;
	bAutoManageActiveCameraTarget = false; // 카메라는 게임 모드가 정한다
}

void AYPPlayerController::BeginPlay()
{
	Super::BeginPlay();
	FInputModeGameAndUI Mode;
	Mode.SetHideCursorDuringCapture(false);
	SetInputMode(Mode);
}

void AYPPlayerController::PlayerTick(float DeltaTime)
{
	Super::PlayerTick(DeltaTime);
	AYPGameMode* Game = GetWorld()->GetAuthGameMode<AYPGameMode>();
	if (!Game)
	{
		return;
	}
	auto Down = [this](const FKey& Key) { return IsInputKeyDown(Key); };
	auto Hit = [this](const FKey& Key) { return WasInputKeyJustPressed(Key); };

	// W/S 가속·감속, A/D 조향 (방향키도 가능)
	const double Throttle = (Down(EKeys::W) || Down(EKeys::Up) ? 1 : 0) - (Down(EKeys::S) || Down(EKeys::Down) ? 1 : 0);
	const double Steer = (Down(EKeys::D) || Down(EKeys::Right) ? 1 : 0) - (Down(EKeys::A) || Down(EKeys::Left) ? 1 : 0);
	Game->SetRaceInput(Throttle, Steer);

	if (Hit(EKeys::SpaceBar) || Hit(EKeys::F)) Game->PressFish();
	if (Hit(EKeys::Q)) Game->ToggleGear();
	if (Hit(EKeys::M)) Game->ToggleMute();
	if (Hit(EKeys::Enter)) Game->Confirm();

	// 파라다이스: 1~9 시설, R 섬 확장, X 팔기, U/I/O 업그레이드
	static const FKey Numbers[] = {EKeys::One, EKeys::Two, EKeys::Three, EKeys::Four, EKeys::Five,
		EKeys::Six, EKeys::Seven, EKeys::Eight, EKeys::Nine};
	for (int32 i = 0; i < 9; i++)
	{
		if (Hit(Numbers[i])) Game->SelectTool(i);
	}
	if (Hit(EKeys::R)) Game->SelectTool(AYPGameMode::ToolReclaim);
	if (Hit(EKeys::X)) Game->SelectTool(AYPGameMode::ToolSell);
	if (Hit(EKeys::U)) Game->BuyUpgrade(0);
	if (Hit(EKeys::I)) Game->BuyUpgrade(1);
	if (Hit(EKeys::O)) Game->BuyUpgrade(2);

	FVector Origin, Direction;
	if (DeprojectMousePositionToWorld(Origin, Direction))
	{
		Game->PointAt(Origin, Direction, Hit(EKeys::LeftMouseButton));
	}
}
