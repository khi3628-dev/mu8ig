// 진행 상황 저장 (UE SaveGame 슬롯). 내용은 코어 yp::Save와 1:1로 대응한다.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "YPCore.h"
#include "YPSaveGame.generated.h"

UCLASS()
class YACHTPARADISE_API UYPSaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	static const FString SlotName;

	UPROPERTY()
	int32 Version = 0;

	UPROPERTY()
	int32 Money = 0;

	UPROPERTY()
	TArray<int32> Upgrades;

	UPROPERTY()
	TArray<uint8> Terrain; // 0 바다, 1 모래

	UPROPERTY()
	TArray<int32> Items; // -1 없음, 그 외 yp::ItemId

	UPROPERTY()
	int32 Races = 0;

	UPROPERTY()
	int32 BestRank = -1;

	UPROPERTY()
	int32 FishCaught = 0;

	UPROPERTY()
	bool bHasBestRun = false;

	UPROPERTY()
	double BestTime = 0;

	UPROPERTY()
	double BestDt = 0;

	UPROPERTY()
	TArray<double> BestPoints;

	UPROPERTY()
	TArray<double> BestSplits;

	void FromCore(const yp::Save& Save);
	// 형식이 맞지 않으면 새 저장 데이터를 돌려준다
	yp::Save ToCore() const;

	// 슬롯에서 읽기 (없으면 새로 시작) / 슬롯에 쓰기
	static yp::Save Load();
	static void Store(const yp::Save& Save);
};
