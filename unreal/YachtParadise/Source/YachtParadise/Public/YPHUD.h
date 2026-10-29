// 화면 표시 (캔버스로 그려 UMG 에셋 없이 동작). 웹 버전의 레이싱 HUD 구성을 옮겼다.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "YPHUD.generated.h"

class AYPGameMode;
class UFont;

UCLASS()
class YACHTPARADISE_API AYPHUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void DrawHUD() override;

private:
	void DrawTitle(const AYPGameMode& Game);
	void DrawParadise(const AYPGameMode& Game);
	void DrawRace(const AYPGameMode& Game);
	void DrawResult(const AYPGameMode& Game);

	// 그리기 도우미 (좌표는 픽셀)
	void Panel(float X, float Y, float W, float H, float Alpha = 0.6f);
	void Label(const FString& Text, float X, float Y, float Scale = 1.f, const FLinearColor& Color = FLinearColor::White);
	void LabelRight(const FString& Text, float RightX, float Y, float Scale = 1.f, const FLinearColor& Color = FLinearColor::White);
	void LabelCenter(const FString& Text, float CenterX, float Y, float Scale = 1.f, const FLinearColor& Color = FLinearColor::White);
	UFont* Font() const;
};
