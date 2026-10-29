#include "YPParadise.h"

#include "Components/StaticMeshComponent.h"
#include "YPShapes.h"

using YPShapes::EShape;

namespace YPParadiseLook
{
	static const FLinearColor White = YPShapes::Hex(0xf7f8fa);
	static const FLinearColor Gold = YPShapes::Hex(0xd4a93a);
	static const FLinearColor Wood = YPShapes::Hex(0x9a6b3f);
	static const FLinearColor DarkWood = YPShapes::Hex(0x6e4d2a);
	static const FLinearColor Glass = YPShapes::Hex(0x1e3a5a);
	static const FLinearColor Leaf = YPShapes::Hex(0x2e9b4a);
	static const FLinearColor Trunk = YPShapes::Hex(0x8a6a45);
	static const FLinearColor Sand = YPShapes::Hex(0xffe7ac);
	static const FLinearColor Lagoon = YPShapes::Hex(0x35c6d6);

	// 시설 모델: 한 칸을 1×1로 보고 바닥 중심이 원점 (웹 버전 lib/boat3d/models.ts와 같은 구성)
	static void BuildItem(AActor* Owner, USceneComponent* P, yp::ItemId Id)
	{
		auto Add = [Owner, P](EShape S, const FVector& Size, const FVector& At, const FLinearColor& C, const FRotator& R = FRotator::ZeroRotator)
		{
			YPShapes::Add(Owner, P, S, Size, At, C, R);
		};
		switch (Id)
		{
		case yp::ItemId::Palm:
			Add(EShape::Cylinder, FVector(0.08, 0.08, 0.8), FVector(0.04, 0, 0.4), Trunk, FRotator(-6, 0, 0));
			for (int32 i = 0; i < 6; i++)
			{
				const FRotator R(0, i * 60.0, 0);
				Add(EShape::Sphere, FVector(0.6, 0.18, 0.05), FVector(0.08, 0, 0.8) + R.RotateVector(FVector(0.24, 0, -0.04)), Leaf, FRotator(-18, i * 60.0, 0));
			}
			break;
		case yp::ItemId::Sunbed:
			for (const double Y : {-0.2, 0.2})
			{
				Add(EShape::Cube, FVector(0.62, 0.2, 0.05), FVector(0, Y, 0.05), White);
				Add(EShape::Cube, FVector(0.3, 0.2, 0.052), FVector(-0.08, Y, 0.052), YPShapes::Hex(0x2fb7c9));
			}
			Add(EShape::Cylinder, FVector(0.03, 0.03, 0.6), FVector(0, 0, 0.3), White);
			Add(EShape::Cone, FVector(0.68, 0.68, 0.14), FVector(0, 0, 0.64), YPShapes::Hex(0xff6b5e));
			break;
		case yp::ItemId::Bar:
			Add(EShape::Cube, FVector(0.84, 0.84, 0.04), FVector(0, 0, 0.02), Wood);
			for (const double X : {-0.36, 0.36})
				for (const double Y : {-0.36, 0.36}) Add(EShape::Cylinder, FVector(0.05, 0.05, 0.5), FVector(X, Y, 0.28), Wood);
			Add(EShape::Cone, FVector(1.15, 1.15, 0.32), FVector(0, 0, 0.68), YPShapes::Hex(0xd9b867), FRotator(0, 45, 0));
			Add(EShape::Cube, FVector(0.6, 0.14, 0.14), FVector(0, -0.2, 0.11), Wood);
			Add(EShape::Cube, FVector(0.62, 0.16, 0.02), FVector(0, -0.2, 0.19), Gold);
			break;
		case yp::ItemId::Pool:
			Add(EShape::Cube, FVector(0.92, 0.92, 0.07), FVector(0, 0, 0.035), White);
			Add(EShape::Cube, FVector(0.74, 0.74, 0.02), FVector(0, 0, 0.075), YPShapes::Hex(0x2fd0e6));
			Add(EShape::Cube, FVector(0.96, 0.03, 0.02), FVector(0, 0.47, 0.075), Gold);
			Add(EShape::Cube, FVector(0.96, 0.03, 0.02), FVector(0, -0.47, 0.075), Gold);
			break;
		case yp::ItemId::Villa:
			Add(EShape::Cube, FVector(0.8, 0.62, 0.34), FVector(0, 0, 0.17), White);
			Add(EShape::Cube, FVector(0.56, 0.46, 0.26), FVector(-0.06, 0, 0.47), White);
			Add(EShape::Cube, FVector(0.86, 0.68, 0.035), FVector(0, 0, 0.352), Gold);
			Add(EShape::Cube, FVector(0.62, 0.52, 0.035), FVector(-0.06, 0, 0.612), Gold);
			Add(EShape::Cube, FVector(0.5, 0.02, 0.17), FVector(0, 0.315, 0.17), Glass);
			Add(EShape::Cube, FVector(0.36, 0.02, 0.14), FVector(-0.06, 0.235, 0.47), Glass);
			break;
		case yp::ItemId::Lighthouse:
			Add(EShape::Cylinder, FVector(0.42, 0.42, 0.06), FVector(0, 0, 0.03), YPShapes::Hex(0x8a8f98));
			Add(EShape::Cylinder, FVector(0.3, 0.3, 0.78), FVector(0, 0, 0.45), White);
			for (const double Z : {0.3, 0.58}) Add(EShape::Cylinder, FVector(0.31, 0.31, 0.07), FVector(0, 0, Z), Gold);
			Add(EShape::Cylinder, FVector(0.18, 0.18, 0.12), FVector(0, 0, 0.94), YPShapes::Hex(0xffd45a));
			Add(EShape::Cone, FVector(0.26, 0.26, 0.14), FVector(0, 0, 1.07), Gold);
			break;
		case yp::ItemId::Dock:
			Add(EShape::Cube, FVector(0.98, 0.98, 0.05), FVector(0, 0, 0.15), Wood);
			for (const double X : {-0.44, 0.44})
				for (const double Y : {-0.44, 0.44}) Add(EShape::Cylinder, FVector(0.08, 0.08, 0.45), FVector(X, Y, 0), DarkWood);
			break;
		case yp::ItemId::Yacht:
			Add(EShape::Cube, FVector(0.95, 0.38, 0.2), FVector(-0.05, 0, 0.1), White);
			Add(EShape::Cone, FVector(0.36, 0.38, 0.3), FVector(0.55, 0, 0.1), White, FRotator(-90, 0, 0));
			Add(EShape::Cube, FVector(0.95, 0.4, 0.025), FVector(-0.05, 0, 0.17), Gold);
			Add(EShape::Cylinder, FVector(0.025, 0.025, 1.0), FVector(0.05, 0, 0.7), YPShapes::Hex(0xd8dde3));
			Add(EShape::Cone, FVector(0.5, 0.02, 0.8), FVector(-0.15, 0, 0.62), White);
			break;
		case yp::ItemId::Superyacht:
			Add(EShape::Cube, FVector(1.0, 0.44, 0.24), FVector(-0.05, 0, 0.12), White);
			Add(EShape::Cone, FVector(0.42, 0.44, 0.3), FVector(0.6, 0, 0.12), White, FRotator(-90, 0, 0));
			Add(EShape::Cube, FVector(1.05, 0.46, 0.03), FVector(0, 0, 0.2), Gold);
			Add(EShape::Cube, FVector(0.8, 0.38, 0.12), FVector(-0.05, 0, 0.3), White);
			Add(EShape::Cube, FVector(0.7, 0.39, 0.035), FVector(-0.05, 0, 0.31), Glass);
			Add(EShape::Cube, FVector(0.5, 0.32, 0.12), FVector(-0.1, 0, 0.42), White);
			Add(EShape::Cube, FVector(0.42, 0.33, 0.035), FVector(-0.1, 0, 0.43), Glass);
			Add(EShape::Cube, FVector(0.26, 0.26, 0.1), FVector(-0.12, 0, 0.53), White);
			break;
		case yp::ItemId::Count:
			break;
		}
	}

	// 요트는 정박한 부두와 나란히 놓는다
	static bool DockOnSide(const yp::Save& Save, int32 Index)
	{
		const int32 X = Index % yp::kGridW, Y = Index / yp::kGridW;
		for (const int32 Dx : {-1, 1})
		{
			const int32 Nx = X + Dx;
			if (Nx >= 0 && Nx < yp::kGridW && Save.cells[Y * yp::kGridW + Nx].item == yp::ItemId::Dock)
			{
				return true;
			}
		}
		return false;
	}
}

AYPParadise::AYPParadise()
{
	PrimaryActorTick.bCanEverTick = false;
	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;
}

FVector AYPParadise::CellCenter(int32 Index, double HeightM) const
{
	const int32 X = Index % yp::kGridW, Y = Index / yp::kGridW;
	return FVector((X + 0.5) * CellM, (Y + 0.5) * CellM, HeightM);
}

void AYPParadise::Sync(const yp::Save& Save)
{
	using namespace YPParadiseLook;
	for (USceneComponent* C : Built)
	{
		if (!C)
		{
			continue;
		}
		TArray<USceneComponent*> Children;
		C->GetChildrenComponents(true, Children);
		for (USceneComponent* Child : Children)
		{
			Child->DestroyComponent();
		}
		C->DestroyComponent();
	}
	Built.Reset();
	Boats.Reset();

	// 얕은 석호 바닥 (섬 아래로 비치는 밝은 물)
	USceneComponent* Base = NewObject<USceneComponent>(this);
	Base->SetupAttachment(Root);
	Base->RegisterComponent();
	AddInstanceComponent(Base);
	Built.Add(Base);
	YPShapes::Add(this, Base, EShape::Cube, FVector(yp::kGridW * CellM + 30, yp::kGridH * CellM + 30, 0.4),
		FVector(yp::kGridW * CellM / 2, yp::kGridH * CellM / 2, -0.25), Lagoon);

	for (int32 i = 0; i < static_cast<int32>(Save.cells.size()); i++)
	{
		const yp::Cell& Cell = Save.cells[i];
		const bool bSand = Cell.terrain == yp::Terrain::Sand;
		USceneComponent* Slot = NewObject<USceneComponent>(this);
		Slot->SetupAttachment(Root);
		Slot->SetRelativeLocation(CellCenter(i, bSand ? 0.6 : 0.0) * 100.0);
		Slot->SetRelativeScale3D(FVector(CellM));
		Slot->RegisterComponent();
		AddInstanceComponent(Slot);
		Built.Add(Slot);
		if (bSand)
		{
			// 모래 칸 (위면이 Slot 원점)
			YPShapes::Add(this, Slot, EShape::Cube, FVector(1.002, 1.002, 0.15), FVector(0, 0, -0.075), Sand);
		}
		if (Cell.item)
		{
			USceneComponent* Item = NewObject<USceneComponent>(this);
			Item->SetupAttachment(Slot);
			const bool bBoat = yp::itemDef(*Cell.item).needsDock;
			if (bBoat && DockOnSide(Save, i))
			{
				Item->SetRelativeRotation(FRotator(0, 90, 0));
			}
			Item->RegisterComponent();
			AddInstanceComponent(Item);
			BuildItem(this, Item, *Cell.item);
			if (bBoat)
			{
				Boats.Add(Item);
			}
		}
	}
}

void AYPParadise::SetHover(int32 Index, bool bValid)
{
	if (!Hover)
	{
		Hover = YPShapes::Add(this, Root, EShape::Cube, FVector(CellM * 0.96, CellM * 0.96, 0.05), FVector::ZeroVector, FLinearColor::Green);
	}
	Hover->SetVisibility(Index >= 0);
	if (Index < 0)
	{
		return;
	}
	Hover->SetRelativeLocation(CellCenter(Index, 0.75) * 100.0);
	YPShapes::SetColor(Hover, bValid ? YPShapes::Hex(0x4ade80) : YPShapes::Hex(0xf87171));
}

bool AYPParadise::TraceCell(const FVector& Origin, const FVector& Direction, int32& OutIndex) const
{
	const FPlane Ground(GetActorLocation() + FVector(0, 0, 60), FVector::UpVector);
	if (FMath::Abs(FVector::DotProduct(Direction, FVector::UpVector)) < 1e-4)
	{
		return false;
	}
	const FVector Hit = FMath::RayPlaneIntersection(Origin, Direction, Ground);
	const FVector Local = (Hit - GetActorLocation()) / 100.0;
	const int32 X = FMath::FloorToInt32(Local.X / CellM), Y = FMath::FloorToInt32(Local.Y / CellM);
	if (X < 0 || X >= yp::kGridW || Y < 0 || Y >= yp::kGridH)
	{
		return false;
	}
	OutIndex = Y * yp::kGridW + X;
	return true;
}

FTransform AYPParadise::OverviewCamera() const
{
	const FVector Center = GetActorLocation() + FVector(yp::kGridW * CellM / 2, yp::kGridH * CellM / 2 + 4, 0) * 100.0;
	const FVector Eye = Center + FVector(-34, 0, 30) * 100.0;
	return FTransform((Center - Eye).Rotation(), Eye);
}

void AYPParadise::Animate(double Time)
{
	for (int32 i = 0; i < Boats.Num(); i++)
	{
		if (USceneComponent* B = Boats[i])
		{
			B->SetRelativeLocation(FVector(0, 0, std::sin(Time * 1.4 + i) * 0.015));
		}
	}
}
