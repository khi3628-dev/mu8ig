// 요트 파라다이스 섬: 10×8 격자의 모래섬·바다 칸과 시설 모델. 레이스 코스에서 떨어진 곳에 놓인다.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "YPCore.h"
#include "YPParadise.generated.h"

class UStaticMeshComponent;

UCLASS()
class YACHTPARADISE_API AYPParadise : public AActor
{
	GENERATED_BODY()

public:
	AYPParadise();

	static constexpr double CellM = 4.0; // 한 칸 = 4m

	// 저장 데이터대로 섬과 시설을 다시 만든다
	void Sync(const yp::Save& Save);

	// 마우스가 가리키는 칸 (-1이면 없음)을 초록(지을 수 있음)/빨강(불가)으로 표시
	void SetHover(int32 Index, bool bValid);

	// 화면 광선이 섬 바닥면과 만나는 칸
	bool TraceCell(const FVector& Origin, const FVector& Direction, int32& OutIndex) const;

	// 섬 전체가 보이는 카메라 위치
	FTransform OverviewCamera() const;

	// 요트가 둥실거리게
	void Animate(double Time);

private:
	FVector CellCenter(int32 Index, double HeightM) const;

	UPROPERTY()
	TObjectPtr<USceneComponent> Root;

	UPROPERTY()
	TArray<TObjectPtr<USceneComponent>> Built; // Sync 때마다 지우고 다시 만드는 칸별 묶음

	UPROPERTY()
	TObjectPtr<UStaticMeshComponent> Hover;

	UPROPERTY()
	TArray<TObjectPtr<USceneComponent>> Boats;
};
