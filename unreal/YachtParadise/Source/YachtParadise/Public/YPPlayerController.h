// 키보드·마우스 입력을 읽어 게임 모드에 넘긴다 (입력 에셋 없이 키 상태를 직접 읽는다).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "YPPlayerController.generated.h"

UCLASS()
class YACHTPARADISE_API AYPPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	AYPPlayerController();

	virtual void BeginPlay() override;
	virtual void PlayerTick(float DeltaTime) override;
};
