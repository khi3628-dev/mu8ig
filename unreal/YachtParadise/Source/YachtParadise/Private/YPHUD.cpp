#include "YPHUD.h"

#include <algorithm>

#include "Camera/PlayerCameraManager.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "YPCore.h"
#include "YPGameMode.h"
#include "YPJetSki.h"

namespace YPHudLook
{
	static const FLinearColor Gold(1.0f, 0.75f, 0.2f);
	static const FLinearColor Sky(0.55f, 0.8f, 1.0f);
	static const FLinearColor Dim(1, 1, 1, 0.55f);
	static const FLinearColor Green(0.2f, 0.85f, 0.5f);
	static const FLinearColor Red(0.95f, 0.3f, 0.35f);
	static const FLinearColor Orange(1.0f, 0.55f, 0.2f);

	struct FRow
	{
		const TCHAR* Key;
		FString Value;
	};

	static FString Time(double Sec) { return FString(UTF8_TO_TCHAR(yp::formatTime(Sec).c_str())); }
	static FString Credits(int32 N) { return FString::Printf(TEXT("%s CR"), *FString::FormatAsNumber(N)); }

	// 코어 메시지는 BOOST/LAP 2/FINISH/MISS 같은 영어거나, 물고기 이름(한글)이다
	static FString RaceMessage(const yp::RaceState& R)
	{
		if (R.messageTimer <= 0)
		{
			return FString();
		}
		const bool bAscii = std::all_of(R.message.begin(), R.message.end(), [](char C) { return static_cast<unsigned char>(C) < 128; });
		if (bAscii)
		{
			return FString(UTF8_TO_TCHAR(R.message.c_str()));
		}
		if (R.lastCatch)
		{
			return FString::Printf(TEXT("%s +%d"), UTF8_TO_TCHAR(yp::kFish[R.lastCatch->species].en), yp::fishValue(R, R.lastCatch->species));
		}
		return FString();
	}
}

UFont* AYPHUD::Font() const { return GEngine->GetLargeFont(); }

void AYPHUD::Panel(float X, float Y, float W, float H, float Alpha)
{
	DrawRect(FLinearColor(0.01f, 0.02f, 0.05f, Alpha), X, Y, W, H);
}

void AYPHUD::Label(const FString& Text, float X, float Y, float Scale, const FLinearColor& Color)
{
	DrawText(Text, Color, X, Y, Font(), Scale);
}

void AYPHUD::LabelRight(const FString& Text, float RightX, float Y, float Scale, const FLinearColor& Color)
{
	float W = 0, H = 0;
	GetTextSize(Text, W, H, Font(), Scale);
	DrawText(Text, Color, RightX - W, Y, Font(), Scale);
}

void AYPHUD::LabelCenter(const FString& Text, float CenterX, float Y, float Scale, const FLinearColor& Color)
{
	float W = 0, H = 0;
	GetTextSize(Text, W, H, Font(), Scale);
	DrawText(Text, Color, CenterX - W / 2, Y, Font(), Scale);
}

void AYPHUD::DrawHUD()
{
	Super::DrawHUD();
	const AYPGameMode* Game = GetWorld() ? GetWorld()->GetAuthGameMode<AYPGameMode>() : nullptr;
	if (!Game || !Canvas)
	{
		return;
	}
	switch (Game->GetPhase())
	{
	case EYPPhase::Title: DrawTitle(*Game); break;
	case EYPPhase::Paradise: DrawParadise(*Game); break;
	case EYPPhase::Race: DrawRace(*Game); break;
	case EYPPhase::Result:
		DrawRace(*Game);
		DrawResult(*Game);
		break;
	}
}

void AYPHUD::DrawTitle(const AYPGameMode& Game)
{
	using namespace YPHudLook;
	const float W = Canvas->ClipX, H = Canvas->ClipY;
	Panel(0, H * 0.58f, W, H * 0.42f, 0.55f);
	LabelCenter(TEXT("JET SKI RACING  ·  YACHT PARADISE"), W / 2, H * 0.62f, 1.2f, Gold);
	LabelCenter(TEXT("YACHT PARADISE RACING"), W / 2, H * 0.67f, 3.2f);
	LabelCenter(TEXT("3-minute races. Fish on the run. Build your own yacht island."), W / 2, H * 0.78f, 1.1f, Dim);
	LabelCenter(TEXT("PRESS ENTER TO START"), W / 2, H * 0.85f, 1.6f);
	const yp::Save& S = Game.GetSave();
	if (S.races > 0)
	{
		LabelCenter(FString::Printf(TEXT("CREDITS %s  ·  RACES %d  ·  BEST P%d"), *FString::FormatAsNumber(S.money), S.races, S.bestRank.value_or(0)),
			W / 2, H * 0.92f, 1.f, Sky);
	}
}

void AYPHUD::DrawParadise(const AYPGameMode& Game)
{
	using namespace YPHudLook;
	const yp::Save& S = Game.GetSave();
	const float W = Canvas->ClipX, H = Canvas->ClipY;
	const yp::LevelInfo Lv = yp::level(S);
	const int32 Lux = yp::luxury(S);

	// 왼쪽 위: 섬 단계·크레딧·기록
	Panel(20, 20, 420, 150);
	Label(TEXT("MY YACHT PARADISE"), 36, 30, 0.9f, Sky);
	Label(UTF8_TO_TCHAR(Lv.current->en), 36, 52, 2.0f);
	Label(Lv.next ? FString::Printf(TEXT("LUXURY %d  ·  NEXT %s IN %d"), Lux, UTF8_TO_TCHAR(Lv.next->en), Lv.next->luxury - Lux)
				  : FString::Printf(TEXT("LUXURY %d  ·  MAX LEVEL"), Lux),
		36, 100, 0.9f, Dim);
	FString Record = FString::Printf(TEXT("RACES %d  ·  BEST %s  ·  FISH %d"), S.races,
		S.bestRank ? *FString::Printf(TEXT("P%d"), *S.bestRank) : TEXT("-"), S.fishCaught);
	if (S.bestRun)
	{
		Record += FString::Printf(TEXT("  ·  LAP REC %s"), *Time(S.bestRun->time));
	}
	Label(Record, 36, 124, 0.9f, Dim);
	Label(TEXT("CREDITS"), 36, 146, 0.8f, Sky);
	Label(*FString::FormatAsNumber(S.money), 130, 140, 1.4f, Gold);

	// 오른쪽: 레이스 효과 · 정비소 · 건설
	const float Px = W - 400, Pw = 380;
	float Y = 20;
	Panel(Px, Y, Pw, 120);
	Label(TEXT("RACE BONUS"), Px + 14, Y + 8, 0.85f, Sky);
	const yp::RacePerks P = yp::racePerks(S);
	const FRow Rows[] = {
		{TEXT("PRIZE"), FString::Printf(TEXT("+%d%%"), FMath::RoundToInt(P.prize * 100))},
		{TEXT("FISH COINS"), FString::Printf(TEXT("+%d%%"), FMath::RoundToInt(P.fish * 100))},
		{TEXT("START DASH"), FString::Printf(TEXT("+%dKM/H"), FMath::RoundToInt(P.startSpeed * 3.6))},
		{TEXT("WAVE BOOST"), FString::Printf(TEXT("+%d%%"), FMath::RoundToInt(P.boost * 100))},
	};
	for (int32 i = 0; i < 4; i++)
	{
		Label(Rows[i].Key, Px + 14, Y + 30 + i * 21, 0.9f);
		LabelRight(Rows[i].Value, Px + Pw - 14, Y + 30 + i * 21, 0.9f, Gold);
	}
	Y += 132;
	Panel(Px, Y, Pw, 100);
	Label(TEXT("GARAGE  (U / I / O)"), Px + 14, Y + 8, 0.85f, Sky);
	const TCHAR* Keys[] = {TEXT("U"), TEXT("I"), TEXT("O")};
	for (int32 i = 0; i < yp::kUpgradeCount; i++)
	{
		const auto Id = static_cast<yp::UpgradeId>(i);
		const int32 LvU = S.upgrades[i];
		const auto Cost = yp::upgradeCost(S, Id);
		FString Bars;
		for (int32 b = 0; b < 5; b++) Bars += b < LvU ? TEXT("|") : TEXT(".");
		Label(FString::Printf(TEXT("[%s] %s  %s"), Keys[i], UTF8_TO_TCHAR(yp::upgradeDef(Id).en), *Bars), Px + 14, Y + 30 + i * 21, 0.9f);
		LabelRight(Cost ? *FString::FormatAsNumber(*Cost) : TEXT("MAX"), Px + Pw - 14, Y + 30 + i * 21, 0.9f,
			Cost && S.money < *Cost ? Dim : Gold);
	}
	Y += 112;
	Panel(Px, Y, Pw, 270);
	Label(TEXT("BUILD  (1-9, R, X) · CLICK A CELL"), Px + 14, Y + 8, 0.85f, Sky);
	for (int32 i = 0; i <= AYPGameMode::ToolSell; i++)
	{
		FString Name, Right;
		if (i < yp::kItemCount)
		{
			const yp::ItemDef& D = yp::itemDef(static_cast<yp::ItemId>(i));
			Name = FString::Printf(TEXT("[%d] %s"), i + 1, UTF8_TO_TCHAR(D.en));
			Right = FString::FormatAsNumber(D.cost);
		}
		else if (i == AYPGameMode::ToolReclaim)
		{
			Name = TEXT("[R] RECLAIM SAND");
			Right = FString::FormatAsNumber(yp::kReclaimCost);
		}
		else
		{
			Name = TEXT("[X] SELL (50%)");
		}
		const bool bActive = Game.GetTool() == i;
		if (bActive)
		{
			DrawRect(FLinearColor(1, 1, 1, 0.85f), Px + 8, Y + 28 + i * 21, Pw - 16, 20);
		}
		const FLinearColor C = bActive ? FLinearColor::Black : FLinearColor::White;
		Label(Name, Px + 14, Y + 30 + i * 21, 0.9f, C);
		LabelRight(Right, Px + Pw - 14, Y + 30 + i * 21, 0.9f, C);
	}

	if (!Game.GetNotice().IsEmpty())
	{
		Panel(W / 2 - 260, H - 120, 520, 40, 0.75f);
		LabelCenter(Game.GetNotice(), W / 2, H - 112, 1.1f, Gold);
	}
	Panel(0, H - 46, W, 46, 0.5f);
	LabelCenter(TEXT("ENTER = RACE   ·   CLICK = BUILD   ·   M = SOUND"), W / 2, H - 38, 1.1f);
}

void AYPHUD::DrawRace(const AYPGameMode& Game)
{
	using namespace YPHudLook;
	const yp::RaceState* R = Game.GetRace();
	if (!R)
	{
		return;
	}
	const float W = Canvas->ClipX, H = Canvas->ClipY;
	const yp::Racer& P0 = R->racers[0];
	const std::vector<int> Order = yp::standings(*R);
	int32 Rank = 1;
	for (int32 i = 0; i < static_cast<int32>(Order.size()); i++)
	{
		if (Order[i] == 0) Rank = i + 1;
	}

	// 라이벌 이름표 (화면에 투영)
	const FVector CamLoc = PlayerOwner->PlayerCameraManager->GetCameraLocation();
	const FVector CamDir = PlayerOwner->PlayerCameraManager->GetCameraRotation().Vector();
	for (int32 i = 1; i < static_cast<int32>(R->racers.size()); i++)
	{
		const yp::Racer& Rv = R->racers[i];
		const FVector WorldPos = FVector(Rv.x, Rv.y, 4.2) * 100.0;
		if (FVector::DotProduct(WorldPos - CamLoc, CamDir) <= 0 || FVector::Dist(WorldPos, CamLoc) < 1500)
		{
			continue;
		}
		const FVector Screen = Project(WorldPos);
		LabelCenter(UTF8_TO_TCHAR(Rv.label.c_str()), Screen.X, Screen.Y, 0.9f);
	}

	// 순위·랩·기록
	Panel(20, 20, 260, 64);
	Label(FString::Printf(TEXT("P%d"), Rank), 34, 22, 3.0f);
	Label(TEXT("/6"), 130, 46, 1.4f, Dim);
	Panel(20, 90, 260, 104, 0.5f);
	const double Now = FMath::Max(0.0, R->time);
	const FRow Rows[] = {
		{TEXT("LAP"), FString::Printf(TEXT("%d/%d"), FMath::Min(P0.lap + 1, yp::kLaps), yp::kLaps)},
		{TEXT("TIME"), Time(Now)},
		{TEXT("BEST"), R->ghost ? Time(R->ghost->time) : FString(TEXT("-"))},
		{TEXT("FISH"), FString::Printf(TEXT("+%d"), yp::fishCoins(*R))},
	};
	for (int32 i = 0; i < 4; i++)
	{
		Label(Rows[i].Key, 34, 98 + i * 23, 0.8f, Dim);
		LabelRight(Rows[i].Value, 266, 96 + i * 23, 1.0f, i == 2 ? Sky : i == 3 ? Gold : FLinearColor::White);
	}

	// 남은 시간
	const double Remaining = FMath::Max(0.0, yp::kTimeLimit - Now);
	Panel(W / 2 - 90, 20, 180, 62);
	LabelCenter(TEXT("TIME LEFT"), W / 2, 26, 0.8f, Dim);
	LabelCenter(FString::Printf(TEXT("%d:%02d"), static_cast<int32>(Remaining) / 60, static_cast<int32>(Remaining) % 60), W / 2, 40, 2.0f,
		Remaining < 30 ? Red : FLinearColor::White);

	// 속도계
	const int32 Kmh = FMath::RoundToInt(std::abs(P0.speed) * 3.6);
	const float Sx = W - 250, Sy = H - 170;
	Panel(Sx, Sy, 230, 150);
	const float Frac = FMath::Min(Kmh / 160.f, 1.f);
	DrawRect(FLinearColor(1, 1, 1, 0.15f), Sx + 15, Sy + 120, 200, 10);
	DrawRect(P0.boost > 0 ? FLinearColor(0.13f, 0.83f, 0.93f) : Game.IsReverse() ? Orange : FLinearColor::White, Sx + 15, Sy + 120, 200 * Frac, 10);
	LabelCenter(FString::FromInt(Kmh), Sx + 115, Sy + 12, 3.4f);
	LabelCenter(TEXT("KM/H"), Sx + 115, Sy + 78, 0.8f, Dim);
	Label(TEXT("D"), Sx + 92, Sy + 96, 1.1f, Game.IsReverse() ? Dim : FLinearColor::White);
	Label(TEXT("R"), Sx + 128, Sy + 96, 1.1f, Game.IsReverse() ? Orange : Dim);

	// 출발 신호등: 1초마다 빨간 불 하나씩, 출발하면 모두 초록
	if (R->time < 1)
	{
		const float Lx = W / 2 - 110, Ly = H * 0.26f;
		Panel(Lx, Ly, 220, 80, 0.8f);
		const int32 Lit = R->time >= 0 ? 3 : 4 - FMath::CeilToInt(-R->time);
		for (int32 i = 0; i < 3; i++)
		{
			const FLinearColor C = R->time >= 0 ? Green : i < Lit ? Red : FLinearColor(0.2f, 0.2f, 0.2f);
			DrawRect(C, Lx + 20 + i * 66, Ly + 14, 52, 52);
		}
	}

	// 메시지·구간 비교·낚시 안내·황금 청새치
	const FString Msg = RaceMessage(*R);
	if (!Msg.IsEmpty())
	{
		Panel(W / 2 - 180, 100, 360, 44, 0.7f);
		LabelCenter(Msg, W / 2, 106, 1.6f);
	}
	if (const auto Split = yp::splitNow(*R))
	{
		const bool bAhead = *Split <= 0;
		DrawRect(bAhead ? Green : Red, W / 2 - 110, 154, 220, 40);
		LabelCenter(FString::Printf(TEXT("BEST %s%.2f"), bAhead ? TEXT("-") : TEXT("+"), std::abs(*Split)), W / 2, 160, 1.5f);
	}
	if (Game.CanFishNow() && R->time >= 0)
	{
		DrawRect(Gold, W / 2 - 130, H - 140, 260, 40);
		LabelCenter(TEXT("SPACE · CATCH"), W / 2, H - 134, 1.4f, FLinearColor::Black);
	}
	if (yp::legendCatchActive(*R))
	{
		Panel(W - 330, H * 0.3f, 300, 70, 0.8f);
		Label(TEXT("LEGENDARY"), W - 316, H * 0.3f + 8, 0.9f, Gold);
		Label(FString::Printf(TEXT("GOLDEN MARLIN +%d"), yp::fishValue(*R, yp::kLegendSpecies)), W - 316, H * 0.3f + 30, 1.4f, Gold);
	}
	Panel(20, H - 40, 560, 30, 0.45f);
	Label(TEXT("W/S THROTTLE  A/D STEER  Q GEAR  SPACE CATCH  M SOUND"), 30, H - 36, 0.9f);
}

void AYPHUD::DrawResult(const AYPGameMode& Game)
{
	using namespace YPHudLook;
	const yp::RaceResult* Res = Game.GetResult();
	const yp::RaceState* R = Game.GetRace();
	if (!Res || !R)
	{
		return;
	}
	const float W = Canvas->ClipX, H = Canvas->ClipY;
	const float X = W / 2 - 260, Y = H / 2 - 260;
	DrawRect(FLinearColor(0, 0, 0, 0.4f), 0, 0, W, H);
	Panel(X, Y, 520, 520, 0.9f);
	Label(FString::Printf(TEXT("P%d"), Res->rank), X + 24, Y + 14, 4.0f);
	Label(Res->rank == 1 ? TEXT("WINNER") : Res->finished ? TEXT("FINISHED") : TEXT("TIME OVER · PRIZE 50%"), X + 150, Y + 50, 1.1f,
		Res->rank == 1 ? Gold : Dim);
	LabelRight(Time(Res->time), X + 496, Y + 40, 2.0f);

	// 베스트 기록 비교
	FString Record;
	FLinearColor RecordColor = Sky;
	if (Res->run)
	{
		if (!Res->bestBefore)
		{
			Record = TEXT("FIRST RECORD - YOUR GHOST RACES WITH YOU NEXT TIME");
		}
		else if (Res->run->time < *Res->bestBefore)
		{
			Record = FString::Printf(TEXT("NEW RECORD  %s -> %s"), *Time(*Res->bestBefore), *Time(Res->run->time));
			RecordColor = Green;
		}
		else
		{
			Record = FString::Printf(TEXT("BEST +%.1fs"), Res->run->time - *Res->bestBefore);
			RecordColor = Dim;
		}
		Label(Record, X + 24, Y + 104, 1.0f, RecordColor);
	}

	// 순위표: 1위는 기록, 나머지는 1위와의 차이, 미완주는 DNF
	const std::optional<double> WinnerTime = Res->standings.empty() ? std::nullopt : Res->standings[0].time;
	for (int32 i = 0; i < static_cast<int32>(Res->standings.size()); i++)
	{
		const yp::Standing& S = Res->standings[i];
		const float Ry = Y + 136 + i * 30;
		std::string Label8 = "YOU";
		for (const yp::Racer& Rc : R->racers)
		{
			if (Rc.name == S.name) Label8 = Rc.label;
		}
		FString Gap = TEXT("DNF");
		if (S.time)
		{
			Gap = i == 0 || !WinnerTime ? Time(*S.time) : FString::Printf(TEXT("+%.1f"), *S.time - *WinnerTime);
		}
		if (S.isPlayer)
		{
			DrawRect(Gold, X + 16, Ry - 2, 488, 28);
		}
		const FLinearColor C = S.isPlayer ? FLinearColor::Black : FLinearColor::White;
		Label(FString::Printf(TEXT("P%d"), i + 1), X + 28, Ry, 1.1f, C);
		Label(UTF8_TO_TCHAR(Label8.c_str()), X + 90, Ry, 1.1f, C);
		LabelRight(Gap, X + 492, Ry, 1.1f, C);
	}

	// 보상
	const float By = Y + 330;
	DrawRect(FLinearColor(1, 1, 1, 0.15f), X + 16, By, 488, 1);
	Label(R->perks.prize > 0 ? FString::Printf(TEXT("PRIZE  (ISLAND +%d%%)"), FMath::RoundToInt(R->perks.prize * 100)) : FString(TEXT("PRIZE")),
		X + 24, By + 12, 1.0f, Dim);
	LabelRight(Credits(Res->prize), X + 496, By + 12, 1.0f);
	Label(R->perks.fish > 0 ? FString::Printf(TEXT("FISH  (ISLAND +%d%%)"), FMath::RoundToInt(R->perks.fish * 100)) : FString(TEXT("FISH")),
		X + 24, By + 40, 1.0f, Dim);
	LabelRight(Credits(Res->fishCoins), X + 496, By + 40, 1.0f);
	Label(TEXT("TOTAL"), X + 24, By + 72, 1.6f);
	LabelRight(Credits(Res->prize + Res->fishCoins), X + 496, By + 72, 1.6f, Gold);
	DrawRect(FLinearColor::White, X + 24, Y + 466, 472, 40);
	LabelCenter(TEXT("ENTER = CONTINUE"), W / 2, Y + 474, 1.3f, FLinearColor::Black);
}
