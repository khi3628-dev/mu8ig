// 엔진 기본 도형(/Engine/BasicShapes)과 기본 재질만으로 모델을 조립하는 도우미.
// 별도 에셋 없이 바로 실행되게 하려는 것이다. 나중에 실제 메시로 바꿀 때는 이 호출부만 교체하면 된다.
#pragma once

#include "CoreMinimal.h"

class AActor;
class USceneComponent;
class UStaticMeshComponent;

namespace YPShapes
{
	enum class EShape : uint8
	{
		Cube,     // 1m 정육면체
		Sphere,   // 지름 1m
		Cylinder, // 지름 1m, 높이 1m
		Cone,     // 밑면 지름 1m, 높이 1m
	};

	// Parent 아래에 기본 도형을 붙인다. SizeM은 미터 단위 크기, OffsetM은 Parent 기준 위치(미터).
	UStaticMeshComponent* Add(AActor* Owner, USceneComponent* Parent, EShape Shape, const FVector& SizeM,
		const FVector& OffsetM, const FLinearColor& Color, const FRotator& Rotation = FRotator::ZeroRotator);

	// 이미 붙인 도형의 색을 바꾼다 (다음 게이트 강조 등)
	void SetColor(UStaticMeshComponent* Mesh, const FLinearColor& Color);

	// 0xRRGGBB → 선형 색
	FLinearColor Hex(uint32 Rgb);
}
