#include "YPCourse.h"

#include "Components/InstancedStaticMeshComponent.h"
#include "EngineUtils.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "WaterBodyOceanActor.h"
#include "WaterZoneActor.h"
#include "YPShapes.h"

using YPShapes::EShape;

namespace YPCourseLook
{
	static const FLinearColor Gate = YPShapes::Hex(0xf97316);
	static const FLinearColor NextGate = YPShapes::Hex(0xffd23a);
	static const FLinearColor Sea = YPShapes::Hex(0x0f6f99);
	static const FLinearColor Sand = YPShapes::Hex(0xf1dca0);
	static const FLinearColor Leaf = YPShapes::Hex(0x2e9b4a);
	static const FLinearColor Trunk = YPShapes::Hex(0x8a6a45);
	static const FLinearColor Pad = YPShapes::Hex(0x5eead4);

	// 결정적인 난수 (풍경 배치가 매번 같도록)
	static double Rand(uint32& Seed)
	{
		Seed = Seed * 1664525u + 1013904223u;
		return (Seed >> 8) / 16777216.0;
	}

	static UInstancedStaticMeshComponent* MakeBuoys(AActor* Owner, USceneComponent* Parent, const FLinearColor& Color)
	{
		UInstancedStaticMeshComponent* Ism = NewObject<UInstancedStaticMeshComponent>(Owner);
		Ism->SetStaticMesh(LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Sphere.Sphere")));
		Ism->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		Ism->SetupAttachment(Parent);
		Ism->RegisterComponent();
		Owner->AddInstanceComponent(Ism);
		YPShapes::SetColor(Ism, Color);
		return Ism;
	}
}

AYPCourse::AYPCourse()
{
	PrimaryActorTick.bCanEverTick = false;
	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;
}

bool AYPCourse::SpawnWaterOcean()
{
	UWorld* World = GetWorld();
	if (!World)
	{
		return false;
	}
	// 레벨에 이미 놓아 둔 바다가 있으면 그것을 쓴다
	for (TActorIterator<AWaterBodyOcean> It(World); It; ++It)
	{
		return true;
	}
	// 확인 필요: 실행 중 생성 시 Water Zone이 있어야 바다가 그려진다
	FActorSpawnParameters Params;
	Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	AWaterZone* Zone = World->SpawnActor<AWaterZone>(FVector(0, 0, -50), FRotator::ZeroRotator, Params);
	if (Zone)
	{
		Zone->SetZoneExtent(FVector2D(600000.0, 600000.0)); // 6km
	}
	AWaterBodyOcean* Ocean = World->SpawnActor<AWaterBodyOcean>(FVector(0, 0, -50), FRotator::ZeroRotator, Params);
	return Zone != nullptr && Ocean != nullptr;
}

void AYPCourse::Build(const yp::RaceState& State)
{
	using namespace YPCourseLook;
	Course = State.course;
	const int32 N = static_cast<int32>(Course.size());

	// 바다: Water 플러그인의 Ocean. 만들 수 없으면 예전처럼 평평한 면으로 대신한다.
	if (!SpawnWaterOcean())
	{
		YPShapes::Add(this, Root, EShape::Cube, FVector(6000, 6000, 1), FVector(0, 0, -0.55), Sea);
	}

	// 체크포인트 게이트: 코스 폭 양끝 기둥, 출발선은 흑백 배너
	for (int32 i = 0; i < N; i++)
	{
		const yp::Vec2 C = Course[i];
		const yp::Vec2 Prev = Course[(i - 1 + N) % N];
		const yp::Vec2 Next = Course[(i + 1) % N];
		const double Yaw = FMath::RadiansToDegrees(std::atan2(Next.y - Prev.y, Next.x - Prev.x));
		USceneComponent* GateRoot = NewObject<USceneComponent>(this);
		GateRoot->SetupAttachment(Root);
		GateRoot->SetRelativeLocationAndRotation(FVector(C.x, C.y, 0) * 100.0, FRotator(0, Yaw, 0));
		GateRoot->RegisterComponent();
		AddInstanceComponent(GateRoot);
		for (const double Side : {1.0, -1.0})
		{
			GatePoles.Add(YPShapes::Add(this, GateRoot, EShape::Cylinder, FVector(1.6, 1.6, 14), FVector(0, yp::kTrackHalf * Side, 6), Gate));
			YPShapes::Add(this, GateRoot, EShape::Sphere, FVector(2.4), FVector(0, yp::kTrackHalf * Side, 13.4), Gate);
		}
		if (i == 0)
		{
			for (int32 k = 0; k < 12; k++)
			{
				const double Y = -yp::kTrackHalf + (k + 0.5) * (2 * yp::kTrackHalf / 12);
				YPShapes::Add(this, GateRoot, EShape::Cube, FVector(0.3, 2 * yp::kTrackHalf / 12, 2), FVector(0, Y, 11),
					k % 2 ? FLinearColor::White : FLinearColor::Black);
				YPShapes::Add(this, GateRoot, EShape::Cube, FVector(0.3, 2 * yp::kTrackHalf / 12, 2), FVector(0, Y, 13),
					k % 2 ? FLinearColor::Black : FLinearColor::White);
			}
		}
	}
	Beam = YPShapes::Add(this, Root, EShape::Cylinder, FVector(1.2, 1.2, 120), FVector(0, 0, 60), NextGate);

	// 경계 부표 (빨강·흰색 번갈아)
	RedBuoys = MakeBuoys(this, Root, YPShapes::Hex(0xe23b3b));
	WhiteBuoys = MakeBuoys(this, Root, FLinearColor::White);
	BuoyPoints = yp::boundaryPoints(Course, yp::kTrackHalf);
	for (int32 i = 0; i < static_cast<int32>(BuoyPoints.size()); i++)
	{
		const FTransform T(FRotator::ZeroRotator, FVector(BuoyPoints[i].x, BuoyPoints[i].y, 0) * 100.0, FVector(1.8));
		(i % 2 ? WhiteBuoys : RedBuoys)->AddInstance(T);
	}

	// 부스트 패드
	for (const yp::Vec2& P : State.boostPads)
	{
		YPShapes::Add(this, Root, EShape::Cylinder, FVector(11, 11, 0.12), FVector(P.x, P.y, 0.06), Pad);
	}

	// 먼 섬과 슈퍼요트 (결정적 배치)
	uint32 Seed = 7;
	for (int32 k = 0; k < 9; k++)
	{
		const double A = (k / 9.0) * 2 * PI + Rand(Seed) * 0.4;
		const double S = 0.9 + Rand(Seed) * 0.9;
		const FVector Center(std::cos(A) * (380 + Rand(Seed) * 120), std::sin(A) * (300 + Rand(Seed) * 100), 0);
		YPShapes::Add(this, Root, EShape::Cylinder, FVector(90, 90, 6) * S, Center + FVector(0, 0, -1), Sand);
		YPShapes::Add(this, Root, EShape::Sphere, FVector(60, 60, 22) * S, Center + FVector(0, 0, 3), Leaf);
		for (int32 p = 0; p < 9; p++)
		{
			const double Pa = Rand(Seed) * 2 * PI, R = (6 + Rand(Seed) * 22) * S;
			const FVector Base = Center + FVector(std::cos(Pa) * R, std::sin(Pa) * R, 2);
			YPShapes::Add(this, Root, EShape::Cylinder, FVector(0.8, 0.8, 12), Base + FVector(0, 0, 6), Trunk, FRotator(Rand(Seed) * 10, 0, 0));
			YPShapes::Add(this, Root, EShape::Sphere, FVector(9, 9, 2.5), Base + FVector(0, 0, 12), Leaf);
		}
	}
	for (int32 k = 0; k < 4; k++)
	{
		const double A = Rand(Seed) * 2 * PI;
		const FVector C(std::cos(A) * 330, std::sin(A) * 250, 0);
		const FRotator R(0, Rand(Seed) * 360, 0);
		const FVector Fwd = R.Vector();
		YPShapes::Add(this, Root, EShape::Cube, FVector(55, 12, 7), C + FVector(0, 0, 2), FLinearColor::White, R);
		YPShapes::Add(this, Root, EShape::Cube, FVector(40, 10, 5), C + FVector(0, 0, 8) - Fwd * 3, FLinearColor::White, R);
		YPShapes::Add(this, Root, EShape::Cube, FVector(36, 10.2, 1.5), C + FVector(0, 0, 8) - Fwd * 3, YPShapes::Hex(0x13212f), R);
		YPShapes::Add(this, Root, EShape::Cube, FVector(22, 8, 4), C + FVector(0, 0, 12.5) - Fwd * 5, FLinearColor::White, R);
		YPShapes::Add(this, Root, EShape::Cube, FVector(56, 12.4, 0.8), C + FVector(0, 0, 4.5), YPShapes::Hex(0xd4a93a), R);
	}
}

void AYPCourse::HighlightGate(int32 Next)
{
	if (Next == Highlighted || Next < 0 || Next >= static_cast<int32>(Course.size()))
	{
		return;
	}
	if (Highlighted >= 0)
	{
		YPShapes::SetColor(GatePoles[Highlighted * 2], YPCourseLook::Gate);
		YPShapes::SetColor(GatePoles[Highlighted * 2 + 1], YPCourseLook::Gate);
	}
	Highlighted = Next;
	YPShapes::SetColor(GatePoles[Next * 2], YPCourseLook::NextGate);
	YPShapes::SetColor(GatePoles[Next * 2 + 1], YPCourseLook::NextGate);
	Beam->SetRelativeLocation(FVector(Course[Next].x, Course[Next].y, 60) * 100.0);
}

void AYPCourse::Animate(double Time)
{
	int32 Red = 0, White = 0;
	const int32 Total = static_cast<int32>(BuoyPoints.size());
	for (int32 i = 0; i < Total; i++)
	{
		const yp::Vec2& P = BuoyPoints[i];
		const FTransform T(FRotator::ZeroRotator, FVector(P.x, P.y, yp::waveHeight(P.x, P.y, Time) + 0.1) * 100.0, FVector(1.8));
		const bool bLastOfKind = i >= Total - 2;
		if (i % 2)
		{
			WhiteBuoys->UpdateInstanceTransform(White++, T, true, bLastOfKind, true);
		}
		else
		{
			RedBuoys->UpdateInstanceTransform(Red++, T, true, bLastOfKind, true);
		}
	}
}
