#include "YPJetSki.h"

#include "Components/SceneComponent.h"
#include "YPShapes.h"

using YPShapes::EShape;

// 유니티 빌드에서 다른 파일과 이름이 겹치지 않도록 고유한 네임스페이스에 둔다
namespace YPJetSkiColors
{
	static const FLinearColor Gold = YPShapes::Hex(0xd4a93a);
	static const FLinearColor Black = YPShapes::Hex(0x14161b);
	static const FLinearColor Cyan = YPShapes::Hex(0x35e6ff);
}

AYPJetSki::AYPJetSki()
{
	PrimaryActorTick.bCanEverTick = false;
	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;
	Lean = CreateDefaultSubobject<USceneComponent>(TEXT("Lean"));
	Lean->SetupAttachment(Root);
}

void AYPJetSki::Build(const FLinearColor& Deck, const FLinearColor& Suit, bool bPlayer)
{
	const FLinearColor Stripe = bPlayer ? YPJetSkiColors::Gold : FLinearColor::White;
	const FLinearColor Visor = bPlayer ? YPJetSkiColors::Gold : YPShapes::Hex(0x1b2430);
	// 선체: 검정 하부 → 시안 라인 → 금색 라인 → 상판, 앞은 뾰족한 원뿔 뱃머리 (+X가 앞)
	YPShapes::Add(this, Lean, EShape::Cube, FVector(3.0, 1.0, 0.25), FVector(-0.2, 0, 0.18), YPJetSkiColors::Black);
	YPShapes::Add(this, Lean, EShape::Cone, FVector(1.0, 0.9, 1.2), FVector(1.85, 0, 0.18), YPJetSkiColors::Black, FRotator(-90, 0, 0));
	YPShapes::Add(this, Lean, EShape::Cube, FVector(3.0, 1.02, 0.03), FVector(-0.2, 0, 0.32), YPJetSkiColors::Cyan);
	YPShapes::Add(this, Lean, EShape::Cube, FVector(3.0, 1.03, 0.04), FVector(-0.2, 0, 0.36), Stripe);
	YPShapes::Add(this, Lean, EShape::Cube, FVector(2.8, 0.92, 0.2), FVector(-0.25, 0, 0.48), Deck);
	YPShapes::Add(this, Lean, EShape::Cone, FVector(0.9, 0.85, 1.0), FVector(1.55, 0, 0.48), Deck, FRotator(-90, 0, 0));
	// 후미 노즐과 시안 링
	YPShapes::Add(this, Lean, EShape::Cylinder, FVector(0.4, 0.4, 0.3), FVector(-1.85, 0, 0.36), YPJetSkiColors::Black, FRotator(90, 0, 0));
	YPShapes::Add(this, Lean, EShape::Cylinder, FVector(0.48, 0.48, 0.05), FVector(-2.0, 0, 0.36), YPJetSkiColors::Cyan, FRotator(90, 0, 0));
	// 콘솔·핸들바·시트
	YPShapes::Add(this, Lean, EShape::Cube, FVector(0.5, 0.42, 0.18), FVector(0.3, 0, 0.68), YPJetSkiColors::Black);
	YPShapes::Add(this, Lean, EShape::Cylinder, FVector(0.07, 0.07, 0.9), FVector(0.3, 0, 0.86), YPJetSkiColors::Black, FRotator(0, 0, 90));
	YPShapes::Add(this, Lean, EShape::Cube, FVector(0.95, 0.38, 0.1), FVector(-0.55, 0, 0.65), YPJetSkiColors::Black);
	// 라이더: 몸통·다리·팔·헬멧·바이저
	YPShapes::Add(this, Lean, EShape::Cylinder, FVector(0.34, 0.34, 0.6), FVector(-0.28, 0, 1.0), Suit, FRotator(-25, 0, 0));
	for (const double Side : {1.0, -1.0})
	{
		YPShapes::Add(this, Lean, EShape::Cube, FVector(0.03, 0.03, 0.6), FVector(-0.28, 0.16 * Side, 1.0), Stripe, FRotator(-25, 0, 0));
		YPShapes::Add(this, Lean, EShape::Cylinder, FVector(0.18, 0.18, 0.5), FVector(-0.25, 0.25 * Side, 0.72), Suit, FRotator(-70, 0, 0));
		YPShapes::Add(this, Lean, EShape::Cylinder, FVector(0.12, 0.12, 0.5), FVector(0.12, 0.33 * Side, 1.08), Suit, FRotator(-55, 0, 0));
		YPShapes::Add(this, Lean, EShape::Sphere, FVector(0.15), FVector(0.3, 0.43 * Side, 0.86), FLinearColor::White);
	}
	YPShapes::Add(this, Lean, EShape::Sphere, FVector(0.44, 0.42, 0.42), FVector(0.08, 0, 1.44), bPlayer ? FLinearColor::White : Suit);
	YPShapes::Add(this, Lean, EShape::Sphere, FVector(0.2, 0.36, 0.2), FVector(0.24, 0, 1.44), Visor);
	SetActorScale3D(FVector(1.5));
}

void AYPJetSki::SetPose(double X, double Y, double HopZ, double HeadingRad, double PitchRad, double RollRad)
{
	// 코어 좌표: x 앞, y 오른쪽(방향각이 커지면 오른쪽으로 돈다) → UE: X 앞, Y 오른쪽, Yaw 증가 = 오른쪽
	SetActorLocationAndRotation(FVector(X, Y, HopZ) * 100.0,
		FRotator(FMath::RadiansToDegrees(PitchRad), FMath::RadiansToDegrees(HeadingRad), 0));
	Lean->SetRelativeRotation(FRotator(0, 0, FMath::RadiansToDegrees(RollRad)));
}

AYPFish::AYPFish()
{
	PrimaryActorTick.bCanEverTick = false;
	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;
}

void AYPFish::Build(int32 Species)
{
	static const uint32 Colors[] = {0xc7ced6, 0x3fa3a0, 0x1e4a8a, 0xffd34a};
	static const double Sizes[] = {1.1, 1.4, 2.2, 2.8};
	const int32 S = FMath::Clamp(Species, 0, 3);
	const FLinearColor Skin = YPShapes::Hex(Colors[S]);
	YPShapes::Add(this, Root, EShape::Sphere, FVector(1.5, 0.45, 0.5), FVector::ZeroVector, Skin);
	YPShapes::Add(this, Root, EShape::Cone, FVector(0.6, 0.15, 0.5), FVector(-0.85, 0, 0), Skin, FRotator(90, 0, 0));
	SetActorScale3D(FVector(Sizes[S]));
}
