#include "YPSaveGame.h"

#include "Kismet/GameplayStatics.h"

const FString UYPSaveGame::SlotName = TEXT("YachtParadise");

void UYPSaveGame::FromCore(const yp::Save& Save)
{
	Version = Save.version;
	Money = Save.money;
	Upgrades.Reset();
	for (const int32 Lv : Save.upgrades)
	{
		Upgrades.Add(Lv);
	}
	Terrain.Reset();
	Items.Reset();
	for (const yp::Cell& C : Save.cells)
	{
		Terrain.Add(C.terrain == yp::Terrain::Sand ? 1 : 0);
		Items.Add(C.item ? static_cast<int32>(*C.item) : -1);
	}
	Races = Save.races;
	BestRank = Save.bestRank.value_or(-1);
	FishCaught = Save.fishCaught;
	bHasBestRun = Save.bestRun.has_value();
	BestPoints.Reset();
	BestSplits.Reset();
	if (Save.bestRun)
	{
		BestTime = Save.bestRun->time;
		BestDt = Save.bestRun->dt;
		BestPoints.Append(Save.bestRun->points.data(), static_cast<int32>(Save.bestRun->points.size()));
		BestSplits.Append(Save.bestRun->splits.data(), static_cast<int32>(Save.bestRun->splits.size()));
	}
}

yp::Save UYPSaveGame::ToCore() const
{
	yp::Save Save = yp::createSave();
	if (Version != yp::kSaveVersion || Terrain.Num() != yp::kGridW * yp::kGridH || Items.Num() != Terrain.Num() ||
		Upgrades.Num() != yp::kUpgradeCount)
	{
		return Save;
	}
	Save.money = Money;
	for (int32 i = 0; i < yp::kUpgradeCount; i++)
	{
		Save.upgrades[i] = Upgrades[i];
	}
	for (int32 i = 0; i < Terrain.Num(); i++)
	{
		Save.cells[i].terrain = Terrain[i] ? yp::Terrain::Sand : yp::Terrain::Water;
		if (Items[i] >= 0 && Items[i] < yp::kItemCount)
		{
			Save.cells[i].item = static_cast<yp::ItemId>(Items[i]);
		}
	}
	Save.races = Races;
	if (BestRank > 0)
	{
		Save.bestRank = BestRank;
	}
	Save.fishCaught = FishCaught;
	if (bHasBestRun)
	{
		yp::GhostRun Run;
		Run.time = BestTime;
		Run.dt = BestDt;
		Run.points.assign(BestPoints.GetData(), BestPoints.GetData() + BestPoints.Num());
		Run.splits.assign(BestSplits.GetData(), BestSplits.GetData() + BestSplits.Num());
		Save.bestRun = std::move(Run);
	}
	return Save;
}

yp::Save UYPSaveGame::Load()
{
	if (const UYPSaveGame* Slot = Cast<UYPSaveGame>(UGameplayStatics::LoadGameFromSlot(SlotName, 0)))
	{
		return Slot->ToCore();
	}
	return yp::createSave();
}

void UYPSaveGame::Store(const yp::Save& Save)
{
	UYPSaveGame* Slot = Cast<UYPSaveGame>(UGameplayStatics::CreateSaveGameObject(UYPSaveGame::StaticClass()));
	Slot->FromCore(Save);
	UGameplayStatics::SaveGameToSlot(Slot, SlotName, 0);
}
