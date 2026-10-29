#include "YPRaceSynthComponent.h"

UYPRaceSynthComponent::UYPRaceSynthComponent(const FObjectInitializer& ObjectInitializer)
	: Super(ObjectInitializer)
{
	// 화면 중앙(카메라)에서 듣는 소리라 공간 감쇠 없이 재생한다
	bAllowSpatialization = false;
}

bool UYPRaceSynthComponent::Init(int32& SampleRate)
{
	NumChannels = 1;
	Synth = MakeUnique<yp::RaceSynth>(static_cast<double>(SampleRate));
	Synth->setMuted(bMutedState);
	return true;
}

int32 UYPRaceSynthComponent::OnGenerateAudio(float* OutAudio, int32 NumSamples)
{
	if (Synth)
	{
		Synth->render(OutAudio, NumSamples);
	}
	else
	{
		FMemory::Memzero(OutAudio, sizeof(float) * NumSamples);
	}
	return NumSamples;
}

void UYPRaceSynthComponent::SetFrame(double SpeedFrac, bool bThrottle, bool bAirborne, bool bBoosting, double RivalProx,
	double RivalDoppler, double RivalSpeedFrac)
{
	if (Synth)
	{
		Synth->setFrame(SpeedFrac, bThrottle, bAirborne, bBoosting, RivalProx, RivalDoppler, RivalSpeedFrac);
	}
}

void UYPRaceSynthComponent::Trigger(const yp::SfxEvent& Event)
{
	if (Synth)
	{
		Synth->trigger(Event);
	}
}

void UYPRaceSynthComponent::Splash(double Impact)
{
	if (Synth)
	{
		Synth->splash(Impact);
	}
}

void UYPRaceSynthComponent::SetMutedState(bool bMuted)
{
	bMutedState = bMuted;
	if (Synth)
	{
		Synth->setMuted(bMuted);
	}
}
