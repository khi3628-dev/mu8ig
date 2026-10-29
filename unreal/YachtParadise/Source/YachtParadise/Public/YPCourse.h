// 레이스 코스: 바다, 체크포인트 게이트, 경계 부표, 부스트 패드, 다음 게이트 빛기둥, 먼 섬·요트 풍경.
// 좌표는 레이스 코어(미터)를 그대로 쓴다 (1m = 100uu).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "YPCore.h"
#include "YPCourse.generated.h"

class UInstancedStaticMeshComponent;
class UStaticMeshComponent;

UCLASS()
class YACHTPARADISE_API AYPCourse : public AActor
{
	GENERATED_BODY()

public:
	AYPCourse();

	void Build(const yp::RaceState& State);

	// 다음에 지나야 할 게이트를 노란색으로, 그 위에 빛기둥을 세운다
	void HighlightGate(int32 Next);

	// 부표·패드가 파도를 따라 출렁인다
	void Animate(double Time);

private:
	UPROPERTY()
	TObjectPtr<USceneComponent> Root;

	UPROPERTY()
	TArray<TObjectPtr<UStaticMeshComponent>> GatePoles; // 게이트마다 2개

	UPROPERTY()
	TObjectPtr<UStaticMeshComponent> Beam;

	UPROPERTY()
	TObjectPtr<UInstancedStaticMeshComponent> RedBuoys;

	UPROPERTY()
	TObjectPtr<UInstancedStaticMeshComponent> WhiteBuoys;

	std::vector<yp::Vec2> Course;
	std::vector<yp::Vec2> BuoyPoints;
	int32 Highlighted = -1;
};
