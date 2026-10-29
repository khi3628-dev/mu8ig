#include "YPShapes.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/Actor.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"

namespace YPShapes
{
	static UStaticMesh* MeshFor(EShape Shape)
	{
		const TCHAR* Path = TEXT("/Engine/BasicShapes/Cube.Cube");
		switch (Shape)
		{
		case EShape::Cube: Path = TEXT("/Engine/BasicShapes/Cube.Cube"); break;
		case EShape::Sphere: Path = TEXT("/Engine/BasicShapes/Sphere.Sphere"); break;
		case EShape::Cylinder: Path = TEXT("/Engine/BasicShapes/Cylinder.Cylinder"); break;
		case EShape::Cone: Path = TEXT("/Engine/BasicShapes/Cone.Cone"); break;
		}
		return LoadObject<UStaticMesh>(nullptr, Path);
	}

	static UMaterialInterface* BaseMaterial()
	{
		// 기본 도형용 재질. "Color" 벡터 파라미터로 색을 바꿀 수 있다.
		return LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	}

	UStaticMeshComponent* Add(AActor* Owner, USceneComponent* Parent, EShape Shape, const FVector& SizeM,
		const FVector& OffsetM, const FLinearColor& Color, const FRotator& Rotation)
	{
		UStaticMeshComponent* Mesh = NewObject<UStaticMeshComponent>(Owner);
		Mesh->SetStaticMesh(MeshFor(Shape));
		Mesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		Mesh->SetGenerateOverlapEvents(false);
		Mesh->SetupAttachment(Parent);
		// 기본 도형은 1단위 = 1m(100uu)로 만들어져 있다
		Mesh->SetRelativeScale3D(SizeM);
		Mesh->SetRelativeLocation(OffsetM * 100.0);
		Mesh->SetRelativeRotation(Rotation);
		Mesh->RegisterComponent();
		Owner->AddInstanceComponent(Mesh);
		SetColor(Mesh, Color);
		return Mesh;
	}

	void SetColor(UStaticMeshComponent* Mesh, const FLinearColor& Color)
	{
		if (!Mesh)
		{
			return;
		}
		UMaterialInstanceDynamic* Mid = Cast<UMaterialInstanceDynamic>(Mesh->GetMaterial(0));
		if (!Mid)
		{
			Mid = UMaterialInstanceDynamic::Create(BaseMaterial(), Mesh);
			Mesh->SetMaterial(0, Mid);
		}
		Mid->SetVectorParameterValue(TEXT("Color"), Color);
	}

	FLinearColor Hex(uint32 Rgb)
	{
		return FLinearColor(FColor((Rgb >> 16) & 0xff, (Rgb >> 8) & 0xff, Rgb & 0xff));
	}
}
