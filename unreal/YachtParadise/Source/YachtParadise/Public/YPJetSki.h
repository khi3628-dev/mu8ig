// 제트스키 + 라이더 (기본 도형 조립). 위치·방향은 레이스 코어가 정하고, 이 액터는 보여주기만 한다.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "YPCore.h"
#include "YPJetSki.generated.h"

UCLASS()
class YACHTPARADISE_API AYPJetSki : public AActor
{
	GENERATED_BODY()

public:
	AYPJetSki();

	// 선체·라이더 색을 정하고 모델을 만든다. bPlayer면 흰 슈트에 금색 라인.
	void Build(const FLinearColor& Deck, const FLinearColor& Suit, bool bPlayer);

	// 코어 좌표(미터)와 방향으로 놓는다. HopZ는 통통 튀기 높이(미터), Roll은 코너링 기울기(라디안).
	void SetPose(double X, double Y, double HopZ, double HeadingRad, double PitchRad, double RollRad);

	// 통통 튀기 상태 (화면 연출 전용)
	yp::Hop Hop;
	double Roll = 0;
	double PrevHeading = 0;
	double SprayAccumulator = 0;

private:
	UPROPERTY()
	TObjectPtr<USceneComponent> Root;

	UPROPERTY()
	TObjectPtr<USceneComponent> Lean;
};

// 뛰어오르는 물고기 (타원체)
UCLASS()
class YACHTPARADISE_API AYPFish : public AActor
{
	GENERATED_BODY()

public:
	AYPFish();
	void Build(int32 Species);

private:
	UPROPERTY()
	TObjectPtr<USceneComponent> Root;
};
